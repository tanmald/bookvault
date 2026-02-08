import { useLanguage } from '@/contexts/LanguageContext';
import { getGenreTranslationKey } from '@/lib/i18n/translations';
import type { Book } from '@/hooks/useBooks';
import type { DuplicateMatch } from '@/hooks/useBooks';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DuplicateBookSelectorProps {
  matches: DuplicateMatch[];
  onSelect: (book: Book) => void;
  onCreateNew: () => void;
  isLoading?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DuplicateBookSelector({
  matches,
  onSelect,
  onCreateNew,
  isLoading = false,
  open,
  onOpenChange,
}: DuplicateBookSelectorProps) {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('upload.matchingBooks')}</DialogTitle>
          <DialogDescription>
            {t('upload.matchingBooksDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 max-h-[60vh] overflow-y-auto py-2">
          {matches.map((match) => (
            <Card
              key={match.book.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isLoading ? 'opacity-50 pointer-events-none' : 'hover:border-accent'
              }`}
              onClick={() => !isLoading && onSelect(match.book)}
            >
              <div className="flex">
                <div
                  className="w-16 h-24 flex-shrink-0 bg-muted relative overflow-hidden"
                >
                  {match.book.cover_url ? (
                    <img
                      src={match.book.cover_url}
                      alt={match.book.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted to-secondary p-2">
                      <BookOpen className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <CardContent className="p-3 flex-1">
                  <h4 className="font-medium leading-tight line-clamp-2 mb-1 text-sm">
                    {match.book.title}
                  </h4>
                  {match.book.author && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
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

        <DialogFooter className="sm:justify-between flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCreateNew}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {t('upload.noneOfThese')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
