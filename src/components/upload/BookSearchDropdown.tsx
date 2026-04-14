import { useEffect, useRef } from 'react';
import { Loader2, BookOpen } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { BookSearchResult } from '@/hooks/useBookSearch';

interface BookSearchDropdownProps {
  results: BookSearchResult[];
  isLoading: boolean;
  query: string;
  onSelect: (result: BookSearchResult) => void;
  onClose: () => void;
}

export function BookSearchDropdown({
  results,
  isLoading,
  query,
  onSelect,
  onClose,
}: BookSearchDropdownProps) {
  const { t } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [onClose]);

  const showEmpty = !isLoading && query.trim().length >= 2 && results.length === 0;

  return (
    <div
      ref={ref}
      className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border bg-popover shadow-md"
    >
      {isLoading && (
        <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('upload.searchingBooks')}
        </div>
      )}

      {showEmpty && (
        <div className="px-3 py-3 text-sm text-muted-foreground">
          {t('upload.noBookResults')}
        </div>
      )}

      {!isLoading && results.map((result, i) => (
        <button
          key={i}
          type="button"
          className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent focus:bg-accent focus:outline-none"
          onClick={() => onSelect(result)}
        >
          {result.coverUrl ? (
            <img
              src={result.coverUrl}
              alt=""
              className="h-12 w-8 flex-shrink-0 rounded object-cover"
            />
          ) : (
            <div className="flex h-12 w-8 flex-shrink-0 items-center justify-center rounded bg-muted">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{result.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {result.author}
              {result.year ? ` · ${result.year}` : ''}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
