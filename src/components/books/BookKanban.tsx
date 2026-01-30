import { useMemo } from 'react';
import { BookCard } from './BookCard';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Book } from '@/hooks/useBooks';
import type { ReadingProgress, ReadingStatus } from '@/hooks/useReadingProgress';
import { BookOpen, Clock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BookKanbanProps {
  books: Book[];
  progressMap: Map<string, ReadingProgress>;
}

export function BookKanban({ books, progressMap }: BookKanbanProps) {
  const { t } = useLanguage();

  const columns: { status: ReadingStatus; label: string; icon: React.ReactNode; color: string }[] = [
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

  const booksByStatus = useMemo(() => {
    const grouped: Record<ReadingStatus, Book[]> = {
      to_read: [],
      reading: [],
      read: [],
    };

    books.forEach((book) => {
      const progress = progressMap.get(book.id);
      const status = progress?.status ?? 'to_read';
      grouped[status].push(book);
    });

    return grouped;
  }, [books, progressMap]);

  const emptyMessage = t('library.empty');
  const emptyDesc = t('library.emptyDesc');
  const noBooksText = t('kanban.noBooks');

  if (books.length === 0) {
    return (
      <div className="text-center py-16">
        <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-1">{emptyMessage}</h3>
        <p className="text-muted-foreground">{emptyDesc}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {columns.map((column) => (
        <div key={column.status} className="flex flex-col">
          <div className={cn(
            "flex items-center gap-2 pb-3 mb-4 border-b-2",
            column.color
          )}>
            {column.icon}
            <h2 className="font-semibold">{column.label}</h2>
            <span className="ml-auto text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {booksByStatus[column.status].length}
            </span>
          </div>
          
          <div className="flex flex-col gap-4 flex-1">
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
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
