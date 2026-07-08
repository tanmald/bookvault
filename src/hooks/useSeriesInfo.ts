import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SeriesBook {
  title: string;
  author: string;
  coverUrl: string | null;
  isbn: string | null;
  year: string | null;
  position: number | null;
  source: 'openlibrary' | 'heuristic';
}

export interface SeriesInfo {
  seriesName: string | null;
  books: SeriesBook[];
}

// Auto-detects the series/saga a book belongs to via the find-series edge
// function (OpenLibrary series data, with a Google Books heuristic fallback).
// Results are cached for a day since series membership rarely changes.
export function useSeriesInfo(title: string | undefined, author: string | null | undefined) {
  return useQuery({
    queryKey: ['series-info', title, author],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<SeriesInfo>('find-series', {
        body: { title, author: author ?? undefined },
      });

      if (error) throw error;
      return data ?? { seriesName: null, books: [] };
    },
    enabled: !!title && title.trim().length >= 2,
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
  });
}
