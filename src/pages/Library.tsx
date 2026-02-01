import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { BookGrid } from '@/components/books/BookGrid';
import { BookKanban } from '@/components/books/BookKanban';
import { BookGridSkeleton, BookKanbanSkeleton } from '@/components/books/BookCardSkeleton';
import { BookFilters } from '@/components/books/BookFilters';
import { useBooks } from '@/hooks/useBooks';
import { useReadingProgress, ReadingStatus } from '@/hooks/useReadingProgress';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLibrary } from '@/contexts/LibraryContext';
import { Loader2, LayoutGrid, Columns3, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ViewMode = 'grid' | 'kanban';

const STORAGE_KEY = 'bookvault-library-view';

export default function Library() {
  const navigate = useNavigate();
  const { currentLibrary, isLoading: librariesLoading } = useLibrary();
  // Pass undefined if no library (shows all books as fallback)
  const { books, isLoading, hasMore, loadAllBooks, isLoadingAll } = useBooks(currentLibrary?.id);
  const { progress } = useReadingProgress();
  const { t } = useLanguage();

  console.log('Current library:', currentLibrary);
  console.log('Books count:', books.length);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReadingStatus | 'all'>('all');
  const [genreFilter, setGenreFilter] = useState<string | 'all'>('all');
  const [authorFilter, setAuthorFilter] = useState<string | 'all'>('all');
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'grid' || stored === 'kanban') {
      return stored;
    }
    return 'kanban';
  });

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  };

  const progressMap = useMemo(() => {
    const map = new Map();
    progress.forEach((p) => map.set(p.book_id, p));
    return map;
  }, [progress]);

  // Extract unique authors from books
  const uniqueAuthors = useMemo(() => {
    const authors = books
      .map((book) => book.author)
      .filter((author): author is string => !!author);
    return [...new Set(authors)].sort((a, b) => a.localeCompare(b));
  }, [books]);

  const filteredBooks = useMemo(() => {
    return books
      .filter((book) => {
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

        // Author filter
        if (authorFilter !== 'all') {
          if (book.author !== authorFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Case-insensitive alphabetical sort by title
        const titleA = a.title.toLowerCase();
        const titleB = b.title.toLowerCase();
        return titleA.localeCompare(titleB);
      });
  }, [books, search, statusFilter, genreFilter, authorFilter, progressMap, viewMode]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setGenreFilter('all');
    setAuthorFilter('all');
  };

  const booksLabel = books.length === 1 ? t('library.bookSingular') : t('library.bookPlural');
  const collectionText = t('library.inCollection');

  return (
    <>
      <AppLayout>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold mb-1">
              {currentLibrary?.name || t('library.title')}
            </h1>
            <p className="text-muted-foreground">
              {books.length} {booksLabel} in this library
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
              {t('library.viewKanban')}
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
              {t('library.viewGrid')}
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
          authorFilter={authorFilter}
          onAuthorChange={setAuthorFilter}
          authors={uniqueAuthors}
          onClearFilters={clearFilters}
          hideStatusFilter={viewMode === 'kanban'}
        />

        {isLoading ? (
          viewMode === 'kanban' ? <BookKanbanSkeleton /> : <BookGridSkeleton />
        ) : viewMode === 'kanban' ? (
          <BookKanban books={filteredBooks} progressMap={progressMap} />
        ) : (
          <BookGrid books={filteredBooks} progressMap={progressMap} />
        )}

        {hasMore && (
          <div className="flex justify-center py-8">
            <Button
              variant="outline"
              onClick={loadAllBooks}
              disabled={isLoadingAll}
            >
              {isLoadingAll ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('library.loadingAll')}
                </>
              ) : (
                t('library.loadAllBooks')
              )}
            </Button>
          </div>
        )}
      </AppLayout>

      {/* Floating Action Button for mobile - outside AppLayout for proper fixed positioning */}
      <Button
        onClick={() => navigate('/upload')}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg md:hidden"
        size="icon"
      >
        <Plus className="h-6 w-6" />
        <span className="sr-only">{t('nav.addBook')}</span>
      </Button>
    </>
  );
}
