import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface FetchCoverRequest {
  isbn?: string;
  title?: string;
  author?: string;
}

interface FetchCoverResponse {
  coverUrl: string | null;
  source: "google-books" | "open-library" | null;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { isbn, title, author }: FetchCoverRequest = await req.json();

    // Priority 1: Try Google Books API with ISBN
    if (isbn) {
      try {
        const googleUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;
        const googleRes = await fetch(googleUrl);

        if (googleRes.ok) {
          const googleData = await googleRes.json();

          if (googleData.items && googleData.items[0]?.volumeInfo?.imageLinks) {
            const imageLinks = googleData.items[0].volumeInfo.imageLinks;
            // Prefer larger images: extraLarge > large > medium > thumbnail
            const coverUrl =
              imageLinks.extraLarge ||
              imageLinks.large ||
              imageLinks.medium ||
              imageLinks.thumbnail;

            if (coverUrl) {
              // Upgrade to HTTPS if needed
              const secureCoverUrl = coverUrl.replace('http://', 'https://');

              return new Response(
                JSON.stringify({
                  coverUrl: secureCoverUrl,
                  source: "google-books"
                } as FetchCoverResponse),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }
        }
      } catch (error) {
        console.error("Google Books API error:", error);
        // Continue to next method
      }
    }

    // Priority 2: Try Open Library with ISBN
    if (isbn) {
      try {
        const openLibUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
        const openLibRes = await fetch(openLibUrl, { method: "HEAD" });

        // Open Library returns a 1x1 pixel image if not found
        const contentLength = openLibRes.headers.get("content-length");
        if (openLibRes.ok && contentLength && parseInt(contentLength) > 1000) {
          return new Response(
            JSON.stringify({
              coverUrl: openLibUrl,
              source: "open-library"
            } as FetchCoverResponse),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (error) {
        console.error("Open Library API error:", error);
        // Continue to next method
      }
    }

    // Priority 3: Try Google Books with title+author
    if (title) {
      try {
        const query = `intitle:${encodeURIComponent(title)}${
          author ? `+inauthor:${encodeURIComponent(author)}` : ""
        }`;
        const googleUrl = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;
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
              const secureCoverUrl = coverUrl.replace('http://', 'https://');

              return new Response(
                JSON.stringify({
                  coverUrl: secureCoverUrl,
                  source: "google-books"
                } as FetchCoverResponse),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }
        }
      } catch (error) {
        console.error("Google Books API error (title search):", error);
        // Continue to return null
      }
    }

    // No cover found from any source
    return new Response(
      JSON.stringify({
        coverUrl: null,
        source: null
      } as FetchCoverResponse),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in fetch-cover function:", error);
    return new Response(
      JSON.stringify({
        coverUrl: null,
        source: null,
        error: error instanceof Error ? error.message : "Unknown error",
      } as FetchCoverResponse),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
