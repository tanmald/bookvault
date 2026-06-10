import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BookSearchResult {
  title: string;
  author: string;
  description: string;
  year: string;
  isbn: string | null;
  coverUrl: string | null;
  genreSlug: string | null;
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
        const { data, error } = await supabase.functions.invoke<{ results: BookSearchResult[] }>(
          'search-books',
          { body: { query: trimmed } }
        );

        if (error) throw error;
        setResults(data?.results ?? []);
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
