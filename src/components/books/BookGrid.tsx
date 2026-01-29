import { BookCard } from './BookCard';
import type { Book } from '@/hooks/useBooks';
import type { ReadingProgress } from '@/hooks/useReadingProgress';

interface BookGridProps {
  books: Book[];
  progressMap?: Map<string, ReadingProgress>;
}

export function BookGrid({ books, progressMap }: BookGridProps) {
  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-6xl mb-4">📚</div>
        <h3 className="text-lg font-medium mb-2">Nenhum livro encontrado</h3>
        <p className="text-muted-foreground">
          Adiciona o teu primeiro livro à biblioteca!
        </p>
      </div>
    );
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
