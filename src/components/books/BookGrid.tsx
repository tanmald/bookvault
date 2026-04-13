import { useNavigate } from 'react-router-dom';
import { BookCard } from './BookCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { LibraryEmptyState } from '@/components/library/LibraryEmptyState';
import { BookOpen, Plus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import type { Book } from '@/hooks/useBooks';
import type { ReadingProgress } from '@/hooks/useReadingProgress';

interface BookGridProps {
  books: Book[];
  progressMap?: Map<string, ReadingProgress>;
}

export function BookGrid({ books, progressMap }: BookGridProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  if (books.length === 0) {
    return <LibraryEmptyState />;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {books.map((book) => (
        <BookCard
          key={book.id}
          book={book}
          progress={progressMap?.get(book.id)}
        />
      ))}
    </div>
  );
}
