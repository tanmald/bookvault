import { Link } from 'react-router-dom';
import { Plus, BookOpen, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { calculateSimilarity, normalizeText } from '@/hooks/useBooks';
import type { BookIdentity } from '@/hooks/useBooks';
import type { SeriesBook, SeriesInfo } from '@/hooks/useSeriesInfo';

const MATCH_THRESHOLD = 0.82;

function findOwnedMatch(candidate: SeriesBook, libraryBooks: BookIdentity[]): BookIdentity | null {
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
  libraryBooks: BookIdentity[];
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

            const cover = (
              <div className="relative aspect-[2/3] overflow-hidden bg-muted">
                {candidate.coverUrl ? (
                  <img
                    src={candidate.coverUrl}
                    alt={candidate.title}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-muted to-secondary p-2">
                    <BookOpen className="h-6 w-6 text-muted-foreground" />
                    <span className="text-center text-[10px] font-medium leading-tight text-muted-foreground line-clamp-3">
                      {candidate.title}
                    </span>
                  </div>
                )}
                {candidate.position !== null && (
                  <Badge
                    variant="secondary"
                    className="absolute top-1.5 left-1.5 h-5 min-w-5 px-1 text-[10px]"
                  >
                    {candidate.position}
                  </Badge>
                )}
              </div>
            );

            const info = (
              <CardContent className="p-2">
                <p className="text-xs font-medium leading-tight line-clamp-2" title={candidate.title}>
                  {candidate.title}
                </p>
                {candidate.author && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">
                    {candidate.author}
                  </p>
                )}
              </CardContent>
            );

            if (owned) {
              return (
                <Link key={key} to={`/book/${owned.id}`} className="w-28 shrink-0">
                  <Card className="group overflow-hidden transition-all hover:shadow-md cursor-pointer">
                    {cover}
                    {info}
                  </Card>
                </Link>
              );
            }

            const prefillParams = new URLSearchParams({
              prefillTitle: candidate.title,
              ...(candidate.author ? { prefillAuthor: candidate.author } : {}),
            });

            return (
              <Card key={key} className="group w-28 shrink-0 overflow-hidden transition-all hover:shadow-md">
                {cover}
                {info}
                <CardContent className="p-2 pt-0">
                  <Button asChild size="sm" variant="outline" className="w-full h-7 px-0 text-xs">
                    <Link to={`/upload?${prefillParams.toString()}`}>
                      <Plus className="h-3 w-3 mr-1" />
                      {t('series.add')}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
