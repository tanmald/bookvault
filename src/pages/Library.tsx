import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { BookGrid } from '@/components/books/BookGrid';
import { BookFilters } from '@/components/books/BookFilters';
import { useBooks } from '@/hooks/useBooks';
import { useReadingProgress, ReadingStatus } from '@/hooks/useReadingProgress';
import { Loader2 } from 'lucide-react';

export default function Library() {
  const { books, isLoading } = useBooks();
  const { progress } = useReadingProgress();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReadingStatus | 'all'>('all');
  const [genreFilter, setGenreFilter] = useState<string | 'all'>('all');

  const progressMap = useMemo(() => {
    const map = new Map();
    progress.forEach((p) => map.set(p.book_id, p));
    return map;
  }, [progress]);

  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const titleMatch = book.title.toLowerCase().includes(searchLower);
        const authorMatch = book.author?.toLowerCase().includes(searchLower);
        if (!titleMatch && !authorMatch) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        const bookProgress = progressMap.get(book.id);
        const bookStatus = bookProgress?.status ?? 'to_read';
        if (bookStatus !== statusFilter) return false;
      }

      // Genre filter
      if (genreFilter !== 'all') {
        if (book.genre_id !== genreFilter) return false;
      }

      return true;
    });
  }, [books, search, statusFilter, genreFilter, progressMap]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setGenreFilter('all');
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1">A Minha Biblioteca</h1>
        <p className="text-muted-foreground">
          {books.length} {books.length === 1 ? 'livro' : 'livros'} na tua coleção
        </p>
      </div>

      <BookFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        genreFilter={genreFilter}
        onGenreChange={setGenreFilter}
        onClearFilters={clearFilters}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <BookGrid books={filteredBooks} progressMap={progressMap} />
      )}
    </AppLayout>
  );
}
