import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CoverResult {
  coverUrl: string;
  source: string;
}

interface UseAlternativeCoversOptions {
  title?: string;
  author?: string;
  isbn?: string;
}

export function useAlternativeCovers({ title, author, isbn }: UseAlternativeCoversOptions) {
  const [availableCovers, setAvailableCovers] = useState<CoverResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [offset, setOffset] = useState(0);

  const fetchCovers = useCallback(async (newOffset: number = 0) => {
    if (!title && !isbn) return [];
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-cover', {
        body: {
          title,
          author,
          isbn,
          offset: newOffset,
          limit: 5
        }
      });

      if (error) {
        console.error('Error fetching covers:', error);
        return [];
      }

      if (data?.covers) {
        // Filter out duplicates
        const newCovers = data.covers.filter((cover: CoverResult) => 
          !availableCovers.some(existing => existing.coverUrl === cover.coverUrl)
        );
        
        setOffset(newOffset + 5);
        return newCovers;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching covers:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [title, author, isbn, availableCovers]);

  const addCover = useCallback((cover: CoverResult) => {
    setAvailableCovers(prev => {
      if (prev.some(c => c.coverUrl === cover.coverUrl)) return prev;
      return [...prev, cover];
    });
  }, []);

  const goToNext = useCallback(() => {
    const nextIndex = currentIndex + 1;
    
    // Only navigate to next existing cover, don't auto-fetch
    if (nextIndex < availableCovers.length) {
      setCurrentIndex(nextIndex);
      return availableCovers[nextIndex];
    }
    
    // At the end - don't auto-fetch, return null
    return null;
  }, [currentIndex, availableCovers]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      return availableCovers[currentIndex - 1];
    }
    return null;
  }, [currentIndex, availableCovers]);

  const reset = useCallback(() => {
    setAvailableCovers([]);
    setCurrentIndex(0);
    setOffset(0);
  }, []);

  // Explicitly fetch more covers - call this when user clicks "Fetch More"
  const fetchMore = useCallback(async () => {
    if (!title && !isbn) return null;
    
    const newCovers = await fetchCovers(offset);
    if (newCovers.length > 0) {
      setAvailableCovers(prev => [...prev, ...newCovers]);
      // Move to the first newly fetched cover
      const newIndex = availableCovers.length;
      setCurrentIndex(newIndex);
      return newCovers[0];
    }
    return null;
  }, [title, isbn, offset, fetchCovers, availableCovers.length]);

  const currentCover = availableCovers[currentIndex] || null;
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < availableCovers.length - 1;
  const canFetchMore = (!!title || !!isbn) && currentIndex >= availableCovers.length - 1;

  return {
    availableCovers,
    currentCover,
    currentIndex,
    isLoading,
    canGoPrevious,
    canGoNext,
    canFetchMore,
    addCover,
    goToNext,
    goToPrevious,
    reset,
    fetchCovers,
    fetchMore,
    totalCovers: availableCovers.length
  };
}
