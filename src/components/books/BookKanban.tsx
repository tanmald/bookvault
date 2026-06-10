import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookCard } from './BookCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { LibraryEmptyState } from '@/components/library/LibraryEmptyState';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Book } from '@/hooks/useBooks';
import type { ReadingProgress, ReadingStatus } from '@/hooks/useReadingProgress';
import { BookOpen, Clock, CheckCircle, CircleDashed, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface BookKanbanProps {
  books: Book[];
  progressMap: Map<string, ReadingProgress>;
  showNotPlanned?: boolean;
  compact?: boolean;
}

export function BookKanban({ books, progressMap, showNotPlanned = true, compact = false }: BookKanbanProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const allColumns: { status: ReadingStatus; label: string; icon: React.ReactNode; color: string }[] = [
    {
      status: 'not_planned',
      label: t('status.notPlanned'),
      icon: <CircleDashed className="h-4 w-4" />,
      color: 'border-destructive/30'
    },
    {
      status: 'to_read',
      label: t('status.toRead'),
      icon: <Clock className="h-4 w-4" />,
      color: 'border-muted-foreground/30'
    },
    {
      status: 'reading',
      label: t('status.reading'),
      icon: <BookOpen className="h-4 w-4" />,
      color: 'border-accent'
    },
    {
      status: 'read',
      label: t('status.read'),
      icon: <CheckCircle className="h-4 w-4" />,
      color: 'border-primary'
    },
  ];

  const columns = showNotPlanned ? allColumns : allColumns.filter(c => c.status !== 'not_planned');

  const booksByStatus = useMemo(() => {
    const grouped: Record<string, { book: Book; finishedAt: string | null }[]> = {
      not_planned: [],
      to_read: [],
      reading: [],
      read: [],
    };

    books.forEach((book) => {
      const progress = progressMap.get(book.id);
      const status = (progress?.status ?? 'to_read') as string;
      grouped[status]?.push({ book, finishedAt: progress?.finished_at ?? null });
    });

    const sortByTitle = (a: { book: Book }, b: { book: Book }) =>
      a.book.title.toLowerCase().localeCompare(b.book.title.toLowerCase());

    grouped.not_planned.sort(sortByTitle);
    grouped.to_read.sort(sortByTitle);
    grouped.reading.sort(sortByTitle);
    grouped.read.sort((a, b) => {
      if (!a.finishedAt && !b.finishedAt) return sortByTitle(a, b);
      if (!a.finishedAt) return 1;
      if (!b.finishedAt) return -1;
      return new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime();
    });

    return {
      not_planned: grouped.not_planned.map(g => g.book),
      to_read: grouped.to_read.map(g => g.book),
      reading: grouped.reading.map(g => g.book),
      read: grouped.read.map(g => g.book),
    };
  }, [books, progressMap]);

  if (books.length === 0) {
    return <LibraryEmptyState />;
  }

  return (
    <div className={cn(
      compact
        ? showNotPlanned ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3"
        : "grid-cols-2 md:grid-cols-3",
      "grid gap-3 md:gap-4"
    )}>
      {columns.map((column) => (
        <div key={column.status} className="flex flex-col">
          <div className={cn(
            "flex items-center gap-2 pb-3 mb-3 border-b-2",
            column.color
          )}>
            {column.icon}
            <h2 className="font-semibold">{column.label}</h2>
            <span className="ml-auto text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {booksByStatus[column.status].length}
            </span>
          </div>

          <div className="flex flex-col gap-3 flex-1 min-h-[100px]">
            {booksByStatus[column.status].length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-8 border-2 border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground">{t('kanban.noBooks')}</p>
              </div>
            ) : (
              booksByStatus[column.status].map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  progress={progressMap.get(book.id)}
                  compact={true}
                  mini={compact}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
