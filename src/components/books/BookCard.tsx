import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getGenreTranslationKey } from '@/lib/i18n/translations';
import type { Book } from '@/hooks/useBooks';
import type { ReadingProgress } from '@/hooks/useReadingProgress';
import { cn } from '@/lib/utils';

interface BookCardProps {
  book: Book;
  progress?: ReadingProgress;
  compact?: boolean;
  isDragging?: boolean;
  disableLink?: boolean;
  onBookClick?: () => void;
}

const statusColors = {
  to_read: 'bg-muted text-muted-foreground',
  reading: 'bg-accent text-accent-foreground',
  read: 'bg-primary text-primary-foreground',
};

export function BookCard({ book, progress, compact = false, isDragging = false, disableLink = false, onBookClick }: BookCardProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const status = progress?.status ?? 'to_read';
  
  const statusLabels = {
    to_read: t('status.toRead'),
    reading: t('status.reading'),
    read: t('status.read'),
  };
  
  const languageCount = book.book_files?.length ?? (book.file_url ? 1 : 0);

  const handleClick = () => {
    if (!disableLink) {
      navigate(`/book/${book.id}`);
    } else if (onBookClick) {
      onBookClick();
    }
  };

  const card = (
    <Card className={cn(
      "group overflow-hidden transition-all hover:shadow-lg cursor-pointer",
      compact && "hover:shadow-md",
      isDragging && "ring-2 ring-accent shadow-lg rotate-1"
    )}>
      <div className={cn(
        "relative overflow-hidden bg-muted",
        compact ? "aspect-[3/4]" : "aspect-[2/3]"
      )}>
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-muted to-secondary p-4">
            <BookOpen className="h-12 w-12 text-muted-foreground" />
            <span className="text-center text-sm font-medium text-muted-foreground line-clamp-3">
              {book.title}
            </span>
          </div>
        )}

        <Badge
          className={cn(
            'absolute top-2 right-2 text-xs',
            statusColors[status as keyof typeof statusColors]
          )}
        >
          {statusLabels[status]}
        </Badge>

        {languageCount > 1 && (
          <Badge
            variant="secondary"
            className="absolute top-2 left-2 text-xs"
          >
            <Globe className="mr-1 h-3 w-3" />
            {languageCount}
          </Badge>
        )}

        {status === 'reading' && progress && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        )}
      </div>

      <CardContent className={cn(compact ? "p-2" : "p-3")}>
        <h3 className={cn(
          "font-medium leading-tight line-clamp-2 mb-1",
          compact && "text-sm"
        )}>{book.title}</h3>
        {book.author && (
          <p className={cn(
            "text-muted-foreground line-clamp-1",
            compact ? "text-xs" : "text-sm"
          )}>{book.author}</p>
        )}
        <div className="mt-2 flex items-center gap-2">
          {book.genre && (
            <Badge variant="outline" className="text-xs">
              {t(getGenreTranslationKey(book.genre.slug))}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (disableLink) {
    return <div onClick={handleClick}>{card}</div>;
  }

  return <Link to={`/book/${book.id}`}>{card}</Link>;
}
