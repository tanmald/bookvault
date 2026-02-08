import { useMemo } from 'react';
import { BookCard } from './BookCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Book } from '@/hooks/useBooks';
import type { ReadingProgress, ReadingStatus } from '@/hooks/useReadingProgress';
import { BookOpen, Clock, CheckCircle, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BookKanbanProps {
  books: Book[];
  progressMap: Map<string, ReadingProgress>;
  showNotPlanned?: boolean;
}

export function BookKanban({ books, progressMap, showNotPlanned = true }: BookKanbanProps) {
  const { t } = useLanguage();

  const allColumns: { status: ReadingStatus; label: string; icon: React.ReactNode; color: string }[] = [
    {
      status: 'not_planned',
      label: t('status.notPlanned'),
      icon: <Ban className="h-4 w-4" />,
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
    const grouped: Record<string, Book[]> = {
      not_planned: [],
      to_read: [],
      reading: [],
      read: [],
    };

    books.forEach((book) => {
      const progress = progressMap.get(book.id);
      const status = (progress?.status ?? 'to_read') as string;
      grouped[status]?.push(book);
    });

    return grouped;
  }, [books, progressMap]);

  const emptyMessage = t('library.empty');
  const emptyDesc = t('library.emptyDesc');
  const noBooksText = t('kanban.noBooks');

  if (books.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title={emptyMessage}
        description={emptyDesc}
        size="lg"
      />
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
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

          <div className="flex flex-col gap-3 flex-1 min-h-full">
            {booksByStatus[column.status].length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-8 border-2 border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground">{noBooksText}</p>
              </div>
            ) : (
              booksByStatus[column.status].map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  progress={progressMap.get(book.id)}
                  compact={true}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
