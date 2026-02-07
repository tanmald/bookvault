import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ShortenUrlResponse {
  status: string;
  short_url?: string;
  original_url?: string;
  error?: string;
}

interface UseShortUrlReturn {
  shortUrl: string | null;
  isLoading: boolean;
  error: string | null;
  shortenUrl: (longUrl: string) => Promise<void>;
  retry: () => void;
}

export function useShortUrl(): UseShortUrlReturn {
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const shortenUrl = useCallback(async (longUrl: string) => {
    setIsLoading(true);
    setError(null);
    setLastUrl(longUrl);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch('https://urllink.site/api/url.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: longUrl }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ShortenUrlResponse = await response.json();

      if (data.status === 'success' && data.short_url) {
        setShortUrl(data.short_url);
      } else {
        throw new Error(data.error || 'Failed to shorten URL');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Erro ao encurtar URL',
        description: 'A usar URL completo em vez disso.',
      });
      // Fall back to original URL
      setShortUrl(longUrl);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const retry = useCallback(() => {
    if (lastUrl) {
      setShortUrl(null);
      setError(null);
      shortenUrl(lastUrl);
    }
  }, [lastUrl, shortenUrl]);

  return {
    shortUrl,
    isLoading,
    error,
    shortenUrl,
    retry,
  };
}
