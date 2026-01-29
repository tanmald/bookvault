import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { BookGrid } from '@/components/books/BookGrid';
import { BookKanban } from '@/components/books/BookKanban';
import { BookFilters } from '@/components/books/BookFilters';
import { useBooks } from '@/hooks/useBooks';
import { useReadingProgress, ReadingStatus } from '@/hooks/useReadingProgress';
import { Loader2, LayoutGrid, Columns3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ViewMode = 'grid' | 'kanban';

export default function Library() {
  const { books, isLoading } = useBooks();
  const { progress } = useReadingProgress();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReadingStatus | 'all'>('all');
  const [genreFilter, setGenreFilter] = useState<string | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');

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

      // Status filter (only in grid view, kanban shows all statuses)
      if (statusFilter !== 'all' && viewMode === 'grid') {
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
  }, [books, search, statusFilter, genreFilter, progressMap, viewMode]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setGenreFilter('all');
  };

  return (
    <AppLayout>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold mb-1">A Minha Biblioteca</h1>
          <p className="text-muted-foreground">
            {books.length} {books.length === 1 ? 'livro' : 'livros'} na tua coleção
          </p>
        </div>
        
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('kanban')}
            className={cn(
              "h-8 px-3",
              viewMode === 'kanban' && "bg-background shadow-sm"
            )}
          >
            <Columns3 className="h-4 w-4 mr-1.5" />
            Kanban
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('grid')}
            className={cn(
              "h-8 px-3",
              viewMode === 'grid' && "bg-background shadow-sm"
            )}
          >
            <LayoutGrid className="h-4 w-4 mr-1.5" />
            Grelha
          </Button>
        </div>
      </div>

      <BookFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        genreFilter={genreFilter}
        onGenreChange={setGenreFilter}
        onClearFilters={clearFilters}
        hideStatusFilter={viewMode === 'kanban'}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : viewMode === 'kanban' ? (
        <BookKanban books={filteredBooks} progressMap={progressMap} />
      ) : (
        <BookGrid books={filteredBooks} progressMap={progressMap} />
      )}
    </AppLayout>
  );
}
