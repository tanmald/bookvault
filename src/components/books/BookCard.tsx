import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, FileText } from 'lucide-react';
import type { Book } from '@/hooks/useBooks';
import type { ReadingProgress } from '@/hooks/useReadingProgress';
import { cn } from '@/lib/utils';

interface BookCardProps {
  book: Book;
  progress?: ReadingProgress;
}

const statusLabels = {
  to_read: 'Para Ler',
  reading: 'A Ler',
  read: 'Lido',
};

const statusColors = {
  to_read: 'bg-muted text-muted-foreground',
  reading: 'bg-accent text-accent-foreground',
  read: 'bg-primary text-primary-foreground',
};

export function BookCard({ book, progress }: BookCardProps) {
  const status = progress?.status ?? 'to_read';

  return (
    <Link to={`/book/${book.id}`}>
      <Card className="group overflow-hidden transition-all hover:shadow-lg">
        <div className="relative aspect-[2/3] overflow-hidden bg-muted">
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

          {/* Status Badge */}
          <Badge
            className={cn(
              'absolute top-2 right-2 text-xs',
              statusColors[status]
            )}
          >
            {statusLabels[status]}
          </Badge>

          {/* Progress bar */}
          {status === 'reading' && progress && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
          )}
        </div>

        <CardContent className="p-3">
          <h3 className="font-medium leading-tight line-clamp-2 mb-1">{book.title}</h3>
          {book.author && (
            <p className="text-sm text-muted-foreground line-clamp-1">{book.author}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <FileText className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase">
              {book.file_type}
            </span>
            {book.genre && (
              <Badge variant="outline" className="text-xs">
                {book.genre.name}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
