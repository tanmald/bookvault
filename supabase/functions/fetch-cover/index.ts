import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOW_HEADERS = "authorization, x-client-info, apikey, content-type";

// CORS origin is restricted to the comma-separated ALLOWED_ORIGINS env var when
// set; otherwise it falls back to "*" so unconfigured environments keep working.
function corsHeaders(req: Request): Record<string, string> {
  const configured = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const origin = req.headers.get("Origin") ?? "";
  const allowOrigin =
    configured.length === 0 ? "*" : configured.includes(origin) ? origin : configured[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": ALLOW_HEADERS,
    "Vary": "Origin",
  };
}

// SSRF guard: block requests to loopback / private / link-local addresses so a
// redirect from an external image host can't be used to reach internal services.
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, ""); // strip IPv6 brackets
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal") || h.endsWith(".local")) {
    return true;
  }
  if (h === "::1" || h === "::") return true; // IPv6 loopback / unspecified
  if (/^f[cd][0-9a-f]{2}:/i.test(h) || /^fe80:/i.test(h)) return true; // IPv6 ULA / link-local
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    if (a === 0 || a === 127 || a === 10) return true;
    if (a === 169 && b === 254) return true; // link-local
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  }
  return false;
}

function assertSafeUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") throw new Error(`Non-https URL blocked: ${rawUrl}`);
  if (isBlockedHost(url.hostname)) throw new Error(`Blocked host: ${url.hostname}`);
  return url.toString();
}

// fetch() with SSRF guards. The initial target is validated up front, and the
// final resolved URL is re-validated after redirects, so a redirect chain that
// lands on an internal/private/non-https host is rejected before we use it.
// (Deno's `redirect: "manual"` yields an opaque response, so we follow normally
// and check `response.url` rather than inspecting each hop.)
async function safeFetch(rawUrl: string, init: RequestInit = {}): Promise<Response> {
  const start = assertSafeUrl(rawUrl);
  const res = await fetch(start, { ...init, redirect: "follow" });
  if (res.url) assertSafeUrl(res.url);
  return res;
}

interface FetchCoverRequest {
  isbn?: string;
  title?: string;
  author?: string;
  offset?: number;
  limit?: number;
}

interface CoverResult {
  coverUrl: string;
  source: string;
}

interface FetchCoverResponse {
  covers: CoverResult[];
  totalFound: number;
  offset: number;
  error?: string;
}

// Helper function to validate if a URL returns a valid image (not a placeholder)
async function validateImageUrl(url: string, minSize: number = 1000): Promise<boolean> {
  try {
    const response = await safeFetch(url, { method: "HEAD" });

    if (!response.ok) return false;
    
    const contentLength = response.headers.get("content-length");
    const contentType = response.headers.get("content-type");
    
    // Check content type is an image
    if (!contentType || !contentType.startsWith("image/")) return false;
    
    // Check size is reasonable (not a 1x1 placeholder)
    if (contentLength && parseInt(contentLength) < minSize) return false;
    
    return true;
  } catch (error) {
    console.error(`Error validating image ${url}:`, error);
    return false;
  }
}

serve(async (req) => {
  const cors = corsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    const { isbn, title, author, offset = 0, limit = 5 }: FetchCoverRequest = await req.json();
    const covers: CoverResult[] = [];

    // Priority 1: Try Google Books API with ISBN
    if (isbn) {
      try {
        const googleUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;
        const googleRes = await fetch(googleUrl);

        if (googleRes.ok) {
          const googleData = await googleRes.json();

          if (googleData.items && googleData.items[0]?.volumeInfo?.imageLinks) {
            const imageLinks = googleData.items[0].volumeInfo.imageLinks;
            const coverUrl =
              imageLinks.extraLarge ||
              imageLinks.large ||
              imageLinks.medium ||
              imageLinks.thumbnail;

            if (coverUrl) {
              const secureUrl = coverUrl.replace('http://', 'https://');
              // Validate the image URL
              if (await validateImageUrl(secureUrl)) {
                covers.push({
                  coverUrl: secureUrl,
                  source: "Google Books (ISBN)"
                });
              }
            }
          }
        }
      } catch (error) {
        console.error("Google Books API error:", error);
      }
    }

    // Priority 2: Try Open Library with ISBN (with better validation)
    if (isbn) {
      try {
        // Try multiple sizes, prefer larger ones
        const sizes = ['L', 'M'];
        for (const size of sizes) {
          const openLibUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-${size}.jpg`;
          
          // Actually fetch the image to validate it's not a placeholder
          const response = await safeFetch(openLibUrl);

          if (response.ok) {
            const blob = await response.blob();
            // Open Library returns a 1x1 pixel GIF for missing covers (~100 bytes)
            // Valid covers are usually > 2KB even for small ones
            if (blob.size > 2000) {
              covers.push({
                coverUrl: openLibUrl,
                source: `Open Library (${size === 'L' ? 'Large' : 'Medium'})`
              });
              break; // Found a valid cover, stop trying smaller sizes
            }
          }
        }
      } catch (error) {
        console.error("Open Library API error:", error);
      }
    }

    // Priority 3: Try Better World Books
    if (isbn) {
      try {
        // Better World Books format: https://images.betterworldbooks.com/{isbn}.jpg
        const bwbUrl = `https://images.betterworldbooks.com/${isbn}.jpg`;
        if (await validateImageUrl(bwbUrl, 2000)) {
          covers.push({
            coverUrl: bwbUrl,
            source: "Better World Books"
          });
        }
      } catch (error) {
        console.error("Better World Books API error:", error);
      }
    }

    // Priority 4: Try Archive.org
    if (isbn) {
      try {
        // Search Archive.org for the book by ISBN
        const searchUrl = `https://archive.org/advancedsearch.php?q=isbn:${isbn}&fl[]=identifier&sort[]=&sort[]=&sort[]=&rows=5&page=1&output=json&save=yes`;
        const searchRes = await fetch(searchUrl);
        
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          
          if (searchData.response?.docs && searchData.response.docs.length > 0) {
            // Try each result until we find a valid cover
            for (const doc of searchData.response.docs.slice(0, 3)) {
              const identifier = doc.identifier;
              // Archive.org cover service
              const archiveUrl = `https://archive.org/services/img/${identifier}`;
              
              if (await validateImageUrl(archiveUrl, 2000)) {
                covers.push({
                  coverUrl: archiveUrl,
                  source: "Archive.org"
                });
                break;
              }
            }
          }
        }
      } catch (error) {
        console.error("Archive.org API error:", error);
      }
    }

    // Priority 5: Try Google Books with title+author search
    if (title) {
      try {
        // First try with author if available
        let query = `intitle:${encodeURIComponent(title)}`;
        if (author) {
          query += `+inauthor:${encodeURIComponent(author)}`;
        }
        
        const googleUrl = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=${limit}&startIndex=${offset}`;
        const googleRes = await fetch(googleUrl);

        if (googleRes.ok) {
          const googleData = await googleRes.json();

          if (googleData.items) {
            interface GoogleBookItem {
              volumeInfo?: {
                imageLinks?: {
                  extraLarge?: string;
                  large?: string;
                  medium?: string;
                  thumbnail?: string;
                };
              };
            }
            
            for (const item of googleData.items as GoogleBookItem[]) {
              if (item.volumeInfo?.imageLinks) {
                const imageLinks = item.volumeInfo.imageLinks;
                const coverUrl =
                  imageLinks.extraLarge ||
                  imageLinks.large ||
                  imageLinks.medium ||
                  imageLinks.thumbnail;

                if (coverUrl) {
                  const secureUrl = coverUrl.replace('http://', 'https://');
                  // Validate the image
                  if (await validateImageUrl(secureUrl)) {
                    covers.push({
                      coverUrl: secureUrl,
                      source: author 
                        ? `Google Books (Title + Author Search)` 
                        : `Google Books (Title Search)`
                    });
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Google Books API error (title search):", error);
      }
    }

    // Priority 6: Try Open Library with title search (as last resort)
    if (title && covers.length === 0) {
      try {
        // Search Open Library by title
        const searchUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(title)}&limit=${limit}&offset=${offset}`;
        const searchRes = await fetch(searchUrl);
        
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          
          if (searchData.docs) {
            for (const doc of searchData.docs.slice(0, limit)) {
              if (doc.cover_i) {
                // Open Library cover ID found
                const coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
                if (await validateImageUrl(coverUrl, 2000)) {
                  covers.push({
                    coverUrl: coverUrl,
                    source: "Open Library (Title Search)"
                  });
                }
              } else if (doc.isbn && doc.isbn.length > 0) {
                // Try with ISBN from search results
                const isbnFromSearch = doc.isbn[0];
                const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbnFromSearch}-L.jpg`;
                if (await validateImageUrl(coverUrl, 2000)) {
                  covers.push({
                    coverUrl: coverUrl,
                    source: "Open Library (ISBN from Title Search)"
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Open Library title search error:", error);
      }
    }

    // Remove duplicates based on URL
    const uniqueCovers = covers.filter((cover, index, self) =>
      index === self.findIndex((c) => c.coverUrl === cover.coverUrl)
    );

    return new Response(
      JSON.stringify({
        covers: uniqueCovers,
        totalFound: uniqueCovers.length,
        offset: offset
      } as FetchCoverResponse),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in fetch-cover function:", error);
    return new Response(
      JSON.stringify({
        covers: [],
        totalFound: 0,
        offset: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      } as FetchCoverResponse),
      {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" }
      }
    );
  }
});
