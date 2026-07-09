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

// Every upstream fetch MUST go through this helper. Deno's fetch has no
// default timeout, so a single throttled connection would otherwise hang the
// whole handler (confirmed in production: the gateway accepted the request
// and never answered). The User-Agent is required by OpenLibrary's API
// policy — anonymous bulk clients get throttled/stalled, which is exactly
// the failure mode this function's fan-out triggered.
const FETCH_TIMEOUT_MS = 6000;
const USER_AGENT = "BookVault/1.0 (https://github.com/tanmald/bookvault)";

function olFetch(url: string): Promise<Response> {
  return fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { "User-Agent": USER_AGENT },
  });
}

// Runs fn over items with at most `limit` in flight, preserving order.
// Failed items resolve to null rather than rejecting the whole batch.
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<Array<R | null>> {
  const results: Array<R | null> = new Array(items.length).fill(null);
  for (let start = 0; start < items.length; start += limit) {
    const batch = items.slice(start, start + limit);
    const settled = await Promise.allSettled(batch.map(fn));
    settled.forEach((r, i) => {
      if (r.status === "fulfilled") results[start + i] = r.value;
    });
  }
  return results;
}

async function openLibrarySearch(params: Record<string, string>): Promise<OpenLibraryDoc[]> {
  const url = `https://openlibrary.org/search.json?${new URLSearchParams({
    ...params,
    fields: "key,title,author_name,series,first_publish_year,cover_i,isbn",
    limit: "20",
  })}`;

  try {
    const res = await olFetch(url);
    if (!res.ok) return [];

    const data = (await res.json()) as OpenLibrarySearchResponse;
    return data.docs ?? [];
  } catch {
    return [];
  }
}

function docToResult(
  doc: OpenLibraryDoc,
  source: SeriesBookResult["source"],
  positionOverride?: number | null
): SeriesBookResult {
  return {
    title: doc.title,
    author: doc.author_name?.[0] ?? "",
    coverUrl: coverUrlFromId(doc.cover_i),
    isbn: doc.isbn?.[0] ?? null,
    year: doc.first_publish_year ? String(doc.first_publish_year) : null,
    position: positionOverride ?? extractPosition(doc.title),
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

  let data;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return [];
    data = await res.json();
  } catch {
    return [];
  }
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

// OpenLibrary's search.json response does NOT reliably carry per-doc series
// data (confirmed empirically: an author search for a well-known, heavily
// cataloged series author returned 20 docs, zero with a populated `series`
// field). The data does exist, but only on the individual Work record
// (`/works/{key}.json`), either as a structured `series` array or, more
// consistently, as a `[series:Some_Series]` tag inside `subjects`. So series
// membership has to be resolved with a follow-up fetch per candidate work.
//
// That per-candidate fan-out is also why every fetch here is bounded: an
// unbounded burst of parallel requests got throttled by OpenLibrary in
// production and, with no fetch timeouts, hung the handler indefinitely.
// See olFetch/mapWithConcurrency/MAX_CANDIDATES and the deadline in serve().
interface OpenLibraryWorkDetail {
  subjects?: string[];
  series?: Array<{ series?: { key?: string }; position?: string }>;
}

const SUBJECT_SERIES_TAG = /^\[series:(.+)\]$/;

function seriesTagFromSubjects(subjects: string[] | undefined): string | null {
  for (const subject of subjects ?? []) {
    const match = subject.match(SUBJECT_SERIES_TAG);
    if (match) return match[1].replace(/_/g, " ").trim();
  }
  return null;
}

async function fetchWorkDetail(key: string): Promise<OpenLibraryWorkDetail | null> {
  try {
    const res = await olFetch(`https://openlibrary.org${key}.json`);
    if (!res.ok) return null;
    return (await res.json()) as OpenLibraryWorkDetail;
  } catch {
    return null;
  }
}

function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// OpenLibrary groups editions of the same book (including translations)
// under one Work record, so a translated query title that the title+author
// search can't match may still show up as one of a candidate's own editions.
// Checking this directly identifies the queried book itself, independent of
// language, instead of falling back to a popularity guess.
//
// Confirmed live (2026-07-08): translated editions often put the series name
// in `title` and the actual translated book title in `subtitle` (e.g. the
// Portuguese edition of "Heir of Fire" has title "Trono de Vidro", subtitle
// "Herdeira do fogo (Vol. 3)") — so both fields need checking, and it's a
// substring match rather than exact equality since the subtitle carries a
// volume-number suffix the query title won't have.
async function editionTitlesInclude(key: string, queryTitle: string): Promise<boolean> {
  try {
    const res = await olFetch(`https://openlibrary.org${key}/editions.json?limit=50`);
    if (!res.ok) return false;
    const data = await res.json();
    const entries = (data.entries ?? []) as Array<{ title?: string; subtitle?: string }>;
    const target = normalizeTitle(queryTitle);
    if (!target) return false;
    return entries.some((e) => {
      const combined = normalizeTitle(`${e.title ?? ""} ${e.subtitle ?? ""}`);
      return combined.length > 0 && combined.includes(target);
    });
  } catch {
    return false;
  }
}

interface Candidate {
  doc: OpenLibraryDoc;
  seriesTag: string | null;
  position: number | null;
}

// Bounds how many Work-detail fetches a single findSeries() call can trigger.
// Kept small on purpose: the candidate pool can reach 40 docs after merging
// the two searches, and search results are relevance-ordered, so an author's
// principal works (the ones that carry series tags) sit at the top anyway.
const MAX_CANDIDATES = 12;
const FETCH_CONCURRENCY = 4;

async function loadCandidates(docs: OpenLibraryDoc[]): Promise<Candidate[]> {
  const loaded = await mapWithConcurrency(
    docs.slice(0, MAX_CANDIDATES),
    FETCH_CONCURRENCY,
    async (doc) => {
      const detail = await fetchWorkDetail(doc.key);
      const seriesTag = seriesTagFromSubjects(detail?.subjects);
      const structuredPosition = detail?.series?.[0]?.position
        ? parseFloat(detail.series[0].position)
        : NaN;
      const position = !Number.isNaN(structuredPosition)
        ? structuredPosition
        : extractPosition(doc.title);
      return { doc, seriesTag, position } as Candidate;
    }
  );
  return loaded.filter((c): c is Candidate => c !== null);
}

// Same "suppress rather than guess wrong" principle as the Google Books
// heuristic: only trust a dominant tag when it's unambiguous (>= 60% of the
// tagged candidates agree). Needed as a fallback for authors whose queried
// book itself doesn't turn up in the title+author search (e.g. very
// obscure/translated editions), where we have no direct anchor.
function dominantSeriesTag(candidates: Candidate[]): string | null {
  const counts = new Map<string, number>();
  let tagged = 0;
  for (const c of candidates) {
    if (!c.seriesTag) continue;
    tagged++;
    counts.set(c.seriesTag, (counts.get(c.seriesTag) ?? 0) + 1);
  }
  if (tagged === 0) return null;

  let best: string | null = null;
  let bestCount = 0;
  for (const [tag, count] of counts) {
    if (count > bestCount) {
      best = tag;
      bestCount = count;
    }
  }
  return best && bestCount / tagged >= 0.6 ? best : null;
}

function sortCompanions(a: SeriesBookResult, b: SeriesBookResult): number {
  if (a.position !== null && b.position !== null) return a.position - b.position;
  if (a.position !== null) return -1;
  if (b.position !== null) return 1;
  return (a.year ?? "9999").localeCompare(b.year ?? "9999");
}

async function findSeries(title: string, author: string): Promise<FindSeriesResponse> {
  const primaryDocs = await openLibrarySearch({
    title,
    ...(author ? { author } : {}),
  });
  const authorDocs = author ? await openLibrarySearch({ author }) : [];

  const seen = new Set<string>();
  const pool: OpenLibraryDoc[] = [];
  for (const doc of [...primaryDocs, ...authorDocs]) {
    if (seen.has(doc.key)) continue;
    seen.add(doc.key);
    pool.push(doc);
  }

  if (pool.length > 0) {
    const candidates = await loadCandidates(pool);

    // Prefer the series tag found on whichever candidate actually matches
    // the queried title+author — that's the book itself, not a popularity
    // guess, so it correctly disambiguates authors who write multiple
    // series regardless of what language the query title is in.
    const primaryKeys = new Set(primaryDocs.map((d) => d.key));
    const ownBook = candidates.find((c) => primaryKeys.has(c.doc.key) && c.seriesTag);
    let seriesTag = ownBook?.seriesTag ?? null;

    // The title+author search found nothing (typically a translated or
    // renamed edition), so there's no direct anchor yet. Before falling
    // back to a popularity guess — which is ambiguous for authors who write
    // several series of comparable size — check whether the queried title
    // shows up as one of each candidate's own editions. OpenLibrary groups
    // translations under the same Work record, so this identifies the
    // actual book even though its title never matched in search results.
    // Only tagged candidates are worth checking (an edition match on an
    // untagged one can't be accepted anyway), capped and batched so this
    // stage can't fan out into the request burst that OpenLibrary throttles.
    if (!seriesTag && primaryDocs.length === 0) {
      const tagged = candidates.filter((c) => c.seriesTag).slice(0, 8);
      for (let start = 0; start < tagged.length && !seriesTag; start += FETCH_CONCURRENCY) {
        const batch = tagged.slice(start, start + FETCH_CONCURRENCY);
        const matches = await mapWithConcurrency(batch, FETCH_CONCURRENCY, (c) =>
          editionTitlesInclude(c.doc.key, title)
        );
        const matched = batch.find((_, i) => matches[i] === true);
        seriesTag = matched?.seriesTag ?? null;
      }
    }

    if (!seriesTag) {
      seriesTag = dominantSeriesTag(candidates);
    }

    if (seriesTag) {
      const books = candidates
        .filter((c) => c.seriesTag === seriesTag)
        .map((c) => docToResult(c.doc, "openlibrary", c.position))
        .sort(sortCompanions);
      if (books.length > 0) {
        return { seriesName: seriesTag, books };
      }
    }
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

    // Hard deadline: the client must always get an answer. Per-fetch
    // timeouts bound each stage, but this caps the whole pipeline even if
    // every stage runs to its individual limit on a bad OpenLibrary day.
    const deadline = new Promise<FindSeriesResponse>((resolve) =>
      setTimeout(() => resolve({ seriesName: null, books: [] }), 20000)
    );
    const result = await Promise.race([
      findSeries(title.trim(), (author ?? "").trim()),
      deadline,
    ]);

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
