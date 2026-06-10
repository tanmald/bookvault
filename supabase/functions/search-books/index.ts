import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BookResult {
  title: string;
  author: string;
  description: string;
  year: string;
  isbn: string | null;
  coverUrl: string | null;
  genreSlug: string | null;
}

function mapCategoryToGenreSlug(categories: string[] | undefined): string | null {
  if (!categories || categories.length === 0) return null;
  const combined = categories.join(" ").toLowerCase();
  if (/science fiction|sci-fi|scifi|space opera|cyberpunk/.test(combined)) return "sci-fi";
  if (/fantasy|magic|sword|sorcery/.test(combined)) return "fantasy";
  if (/mystery|detective|crime|thriller|suspense/.test(combined)) return "mystery";
  if (/romance|love story|chick lit/.test(combined)) return "romance";
  if (/horror|ghost|supernatural/.test(combined)) return "horror";
  if (/history|historical/.test(combined)) return "history";
  if (/biography|autobiography|memoir/.test(combined)) return "biography";
  if (/self-help|personal development|motivation|productivity/.test(combined)) return "self-help";
  if (/business|economics|finance|management|entrepreneurship/.test(combined)) return "business";
  if (/science|physics|chemistry|biology|mathematics/.test(combined)) return "science";
  if (/philosophy|ethics|logic/.test(combined)) return "philosophy";
  if (/psychology|mental health|behavior/.test(combined)) return "psychology";
  if (/fiction|novel|literary/.test(combined)) return "fiction";
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query } = await req.json() as { query?: string };

    if (!query || query.trim().length < 2) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(query.trim())}&maxResults=5&printType=books`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Google Books API error: ${res.status}`);
    }

    const data = await res.json();
    const items: BookResult[] = (data.items ?? []).map((item: {
      volumeInfo: {
        title?: string;
        authors?: string[];
        description?: string;
        publishedDate?: string;
        industryIdentifiers?: Array<{ type: string; identifier: string }>;
        categories?: string[];
        imageLinks?: { thumbnail?: string; smallThumbnail?: string };
      };
    }) => {
      const v = item.volumeInfo;

      const isbn =
        v.industryIdentifiers?.find((i) => i.type === "ISBN_13")?.identifier ??
        v.industryIdentifiers?.find((i) => i.type === "ISBN_10")?.identifier ??
        null;

      const rawCover = v.imageLinks?.thumbnail ?? v.imageLinks?.smallThumbnail ?? null;
      const coverUrl = rawCover ? rawCover.replace(/^http:/, "https:") : null;

      return {
        title: v.title ?? "",
        author: v.authors?.join(", ") ?? "",
        description: v.description ?? "",
        year: v.publishedDate ? v.publishedDate.substring(0, 4) : "",
        isbn,
        coverUrl,
        genreSlug: mapCategoryToGenreSlug(v.categories),
      };
    });

    return new Response(JSON.stringify({ results: items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("search-books error:", error);
    return new Response(
      JSON.stringify({ results: [], error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
