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

interface SeriesBookResult {
  title: string;
  author: string;
  coverUrl: string | null;
  isbn: string | null;
  year: string | null;
  position: number | null;
  source: "openlibrary" | "heuristic";
}

interface FindSeriesResponse {
  seriesName: string | null;
  books: SeriesBookResult[];
}

interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  series?: string[];
  first_publish_year?: number;
  cover_i?: number;
  isbn?: string[];
}

interface OpenLibrarySearchResponse {
  docs?: OpenLibraryDoc[];
}

// Recovers a series position from a title/subtitle when OpenLibrary doesn't
// have one on the edition itself. Publishers/contributors encode ordinals
// inconsistently, so this only catches the common patterns.
const POSITION_PATTERNS = [
  /#\s*(\d+(?:\.\d+)?)/,
  /\bbook\s+(\d+(?:\.\d+)?)/i,
  /\bvol(?:ume)?\.?\s+(\d+(?:\.\d+)?)/i,
  /\bpart\s+(\d+(?:\.\d+)?)/i,
];

function extractPosition(title: string): number | null {
  for (const pattern of POSITION_PATTERNS) {
    const match = title.match(pattern);
    if (match) {
      const n = parseFloat(match[1]);
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

function coverUrlFromId(coverId: number | undefined): string | null {
  return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null;
}

async function openLibrarySearch(params: Record<string, string>): Promise<OpenLibraryDoc[]> {
  const url = `https://openlibrary.org/search.json?${new URLSearchParams({
    ...params,
    fields: "key,title,author_name,series,first_publish_year,cover_i,isbn",
    limit: "20",
  })}`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = (await res.json()) as OpenLibrarySearchResponse;
  return data.docs ?? [];
}

function docToResult(doc: OpenLibraryDoc, source: SeriesBookResult["source"]): SeriesBookResult {
  return {
    title: doc.title,
    author: doc.author_name?.[0] ?? "",
    coverUrl: coverUrlFromId(doc.cover_i),
    isbn: doc.isbn?.[0] ?? null,
    year: doc.first_publish_year ? String(doc.first_publish_year) : null,
    position: extractPosition(doc.title),
    source,
  };
}

// Best-effort fallback when OpenLibrary has no series data for this title:
// search Google Books by the same author and keep only results that share a
// long common run of words with the query title (same series entries usually
// repeat a distinctive phrase, e.g. "A Court of ..."). Low-confidence by
// design — callers should treat `source: "heuristic"` results cautiously.
function sharedWordRun(a: string, b: string): number {
  const wordsA = a.toLowerCase().split(/\s+/).filter(Boolean);
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  let run = 0;
  let best = 0;
  for (const w of wordsA) {
    if (wordsB.has(w) && w.length > 2) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  return best;
}

async function googleBooksHeuristic(title: string, author: string): Promise<SeriesBookResult[]> {
  if (!author) return [];

  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
    `inauthor:${author}`
  )}&maxResults=20`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  interface GoogleItem {
    volumeInfo?: {
      title?: string;
      subtitle?: string;
      authors?: string[];
      publishedDate?: string;
      imageLinks?: { thumbnail?: string };
      industryIdentifiers?: Array<{ type: string; identifier: string }>;
    };
  }

  const items = (data.items ?? []) as GoogleItem[];
  const results: SeriesBookResult[] = [];
  const seenTitles = new Set<string>();

  for (const item of items) {
    const v = item.volumeInfo;
    if (!v?.title) continue;
    const fullTitle = v.subtitle ? `${v.title}: ${v.subtitle}` : v.title;

    // Require a meaningful shared phrase with the queried title (at least two
    // consecutive shared words), and skip near-duplicates of the query itself.
    if (sharedWordRun(fullTitle, title) < 2) continue;
    if (fullTitle.toLowerCase() === title.toLowerCase()) continue;
    if (seenTitles.has(fullTitle.toLowerCase())) continue;
    seenTitles.add(fullTitle.toLowerCase());

    const isbn =
      v.industryIdentifiers?.find((i) => i.type === "ISBN_13")?.identifier ??
      v.industryIdentifiers?.find((i) => i.type === "ISBN_10")?.identifier ??
      null;

    results.push({
      title: fullTitle,
      author: v.authors?.[0] ?? author,
      coverUrl: v.imageLinks?.thumbnail?.replace(/^http:/, "https:") ?? null,
      isbn,
      year: v.publishedDate ? v.publishedDate.substring(0, 4) : null,
      position: extractPosition(fullTitle),
      source: "heuristic",
    });
  }

  // Suppress low-confidence results outright rather than showing a shaky
  // guess: need at least 2 plausible companions to be worth surfacing.
  return results.length >= 2 ? results : [];
}

async function findSeries(title: string, author: string): Promise<FindSeriesResponse> {
  const primaryMatches = await openLibrarySearch({
    title,
    ...(author ? { author } : {}),
  });

  const withSeries = primaryMatches.find((d) => d.series && d.series.length > 0);

  if (withSeries?.series?.[0]) {
    const seriesName = withSeries.series[0];
    const companions = await openLibrarySearch({ series: seriesName });

    const books = companions
      .map((doc) => docToResult(doc, "openlibrary"))
      .sort((a, b) => {
        if (a.position !== null && b.position !== null) return a.position - b.position;
        if (a.position !== null) return -1;
        if (b.position !== null) return 1;
        return (a.year ?? "9999").localeCompare(b.year ?? "9999");
      });

    return { seriesName, books };
  }

  // No OpenLibrary series data — fall back to the Google Books heuristic.
  const heuristicBooks = await googleBooksHeuristic(title, author);
  if (heuristicBooks.length === 0) {
    return { seriesName: null, books: [] };
  }

  return {
    seriesName: null, // no confirmed series name from a heuristic match
    books: heuristicBooks.sort((a, b) => (a.year ?? "9999").localeCompare(b.year ?? "9999")),
  };
}

serve(async (req) => {
  const cors = corsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    const { title, author } = (await req.json()) as { title?: string; author?: string };

    if (!title || title.trim().length < 2) {
      return new Response(JSON.stringify({ seriesName: null, books: [] } as FindSeriesResponse), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const result = await findSeries(title.trim(), (author ?? "").trim());

    return new Response(JSON.stringify(result), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("find-series error:", error);
    return new Response(
      JSON.stringify({ seriesName: null, books: [], error: (error as Error).message }),
      {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  }
});
