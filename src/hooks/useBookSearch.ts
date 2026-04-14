import { useState, useEffect } from 'react';

export interface BookSearchResult {
  title: string;
  author: string;
  description: string;
  year: string;
  isbn: string | null;
  coverUrl: string | null;
  genreSlug: string | null;
}

interface GoogleVolumeInfo {
  title?: string;
  authors?: string[];
  description?: string;
  publishedDate?: string;
  industryIdentifiers?: Array<{ type: string; identifier: string }>;
  categories?: string[];
  imageLinks?: { thumbnail?: string; smallThumbnail?: string };
}

interface GoogleBooksItem {
  volumeInfo: GoogleVolumeInfo;
}

interface GoogleBooksResponse {
  items?: GoogleBooksItem[];
}

function mapCategoryToGenreSlug(categories: string[] | undefined): string | null {
  if (!categories || categories.length === 0) return null;

  const combined = categories.join(' ').toLowerCase();

  if (/science fiction|sci-fi|scifi|space opera|cyberpunk/.test(combined)) return 'sci-fi';
  if (/fantasy|magic|sword|sorcery/.test(combined)) return 'fantasy';
  if (/mystery|detective|crime|thriller|suspense/.test(combined)) return 'mystery';
  if (/romance|love story|chick lit/.test(combined)) return 'romance';
  if (/horror|ghost|supernatural/.test(combined)) return 'horror';
  if (/history|historical/.test(combined)) return 'history';
  if (/biography|autobiography|memoir/.test(combined)) return 'biography';
  if (/self-help|personal development|motivation|productivity/.test(combined)) return 'self-help';
  if (/business|economics|finance|management|entrepreneurship/.test(combined)) return 'business';
  if (/science|physics|chemistry|biology|mathematics/.test(combined)) return 'science';
  if (/philosophy|ethics|logic/.test(combined)) return 'philosophy';
  if (/psychology|mental health|behavior/.test(combined)) return 'psychology';
  if (/fiction|novel|literary/.test(combined)) return 'fiction';

  return null;
}

function mapItem(item: GoogleBooksItem): BookSearchResult {
  const v = item.volumeInfo;

  const isbn =
    v.industryIdentifiers?.find(i => i.type === 'ISBN_13')?.identifier ??
    v.industryIdentifiers?.find(i => i.type === 'ISBN_10')?.identifier ??
    null;

  const year = v.publishedDate ? v.publishedDate.substring(0, 4) : '';

  // Google Books thumbnails come with http — upgrade to https
  const rawCover = v.imageLinks?.thumbnail ?? v.imageLinks?.smallThumbnail ?? null;
  const coverUrl = rawCover ? rawCover.replace(/^http:/, 'https:') : null;

  return {
    title: v.title ?? '',
    author: v.authors?.join(', ') ?? '',
    description: v.description ?? '',
    year,
    isbn,
    coverUrl,
    genreSlug: mapCategoryToGenreSlug(v.categories),
  };
}

export function useBookSearch(query: string) {
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const url = `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(trimmed)}&maxResults=5&printType=books`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Google Books API error');

        const data: GoogleBooksResponse = await res.json();
        setResults((data.items ?? []).map(mapItem));
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  return { results, isLoading };
}
