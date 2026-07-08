import { Link } from 'react-router-dom';
import { Plus, BookOpen, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { calculateSimilarity, normalizeText } from '@/hooks/useBooks';
import type { Book } from '@/hooks/useBooks';
import type { SeriesBook, SeriesInfo } from '@/hooks/useSeriesInfo';

const MATCH_THRESHOLD = 0.82;

function findOwnedMatch(candidate: SeriesBook, libraryBooks: Book[]): Book | null {
  for (const book of libraryBooks) {
    const titleSimilarity = calculateSimilarity(
      normalizeText(book.title || ''),
      normalizeText(candidate.title)
    );
    if (titleSimilarity < MATCH_THRESHOLD) continue;

    if (book.author && candidate.author) {
      const authorSimilarity = calculateSimilarity(
        normalizeText(book.author),
        normalizeText(candidate.author)
      );
      if (authorSimilarity < 0.6) continue;
    }

    return book;
  }
  return null;
}

interface SeriesCardProps {
  currentBook: { title: string; author: string | null };
  seriesInfo: SeriesInfo;
  libraryBooks: Book[];
}

export function SeriesCard({ currentBook, seriesInfo, libraryBooks }: SeriesCardProps) {
  const { t } = useLanguage();

  const companions = seriesInfo.books.filter(
    (candidate) =>
      calculateSimilarity(normalizeText(candidate.title), normalizeText(currentBook.title)) <
      MATCH_THRESHOLD
  );

  if (companions.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Layers className="h-4 w-4" />
          {seriesInfo.seriesName
            ? t('series.title').replace('{name}', seriesInfo.seriesName)
            : t('series.titleGeneric')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {companions.map((candidate) => {
            const owned = findOwnedMatch(candidate, libraryBooks);
            const key = `${candidate.title}-${candidate.author}`;

            const thumbnail = (
              <div className="w-20 shrink-0 space-y-1.5">
                <div className="aspect-[2/3] overflow-hidden rounded-md bg-muted relative">
                  {candidate.coverUrl ? (
                    <img
                      src={candidate.coverUrl}
                      alt={candidate.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-secondary">
                      <BookOpen className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  {candidate.position !== null && (
                    <Badge
                      variant="secondary"
                      className="absolute top-1 left-1 h-5 min-w-5 px-1 text-[10px]"
                    >
                      {candidate.position}
                    </Badge>
                  )}
                </div>
                <p className="text-xs leading-tight line-clamp-2" title={candidate.title}>
                  {candidate.title}
                </p>
              </div>
            );

            if (owned) {
              return (
                <Link key={key} to={`/book/${owned.id}`} className="hover:opacity-80">
                  {thumbnail}
                </Link>
              );
            }

            const prefillParams = new URLSearchParams({
              prefillTitle: candidate.title,
              ...(candidate.author ? { prefillAuthor: candidate.author } : {}),
            });

            return (
              <div key={key} className="space-y-1.5">
                {thumbnail}
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="w-20 h-7 px-0 text-xs"
                >
                  <Link to={`/upload?${prefillParams.toString()}`}>
                    <Plus className="h-3 w-3 mr-1" />
                    {t('series.add')}
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
