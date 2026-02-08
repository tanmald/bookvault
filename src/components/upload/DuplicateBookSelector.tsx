import { useLanguage } from '@/contexts/LanguageContext';
import { getGenreTranslationKey } from '@/lib/i18n/translations';
import type { Book } from '@/hooks/useBooks';
import type { DuplicateMatch } from '@/hooks/useBooks';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DuplicateBookSelectorProps {
  matches: DuplicateMatch[];
  onSelect: (book: Book) => void;
  onCreateNew: () => void;
  isLoading?: boolean;
}

export function DuplicateBookSelector({
  matches,
  onSelect,
  onCreateNew,
  isLoading = false,
}: DuplicateBookSelectorProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="font-semibold">{t('upload.matchingBooks')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('upload.matchingBooksDesc')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {matches.map((match) => (
          <Card
            key={match.book.id}
            className="cursor-pointer transition-all hover:shadow-md hover:border-accent"
            onClick={() => !isLoading && onSelect(match.book)}
          >
            <div className="flex">
              <div
                className="w-20 h-28 sm:w-24 sm:h-32 flex-shrink-0 bg-muted relative overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {match.book.cover_url ? (
                  <img
                    src={match.book.cover_url}
                    alt={match.book.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted to-secondary p-2">
                    <BookOpen className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>

              <CardContent className="p-3 flex-1">
                <h4 className="font-medium leading-tight line-clamp-2 mb-1 text-sm sm:text-base">
                  {match.book.title}
                </h4>
                {match.book.author && (
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 mb-2">
                    {match.book.author}
                  </p>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  {match.book.genre && (
                    <Badge variant="outline" className="text-xs">
                      {t(getGenreTranslationKey(match.book.genre.slug))}
                    </Badge>
                  )}
                  {match.book.year && (
                    <Badge variant="secondary" className="text-xs">
                      {match.book.year}
                    </Badge>
                  )}
                </div>

                <div className="mt-2">
                  <span className="text-xs text-accent font-medium">
                    {Math.round(match.similarity * 100)}% similar
                  </span>
                </div>
              </CardContent>
            </div>
          </Card>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onCreateNew}
        disabled={isLoading}
      >
        {t('upload.noneOfThese')}
      </Button>
    </div>
  );
}
