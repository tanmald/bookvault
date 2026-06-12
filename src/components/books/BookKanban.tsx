import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { SwipeableBookCard } from './SwipeableBookCard';
import { SortableBookCard } from './SortableBookCard';
import { DroppableColumn } from './DroppableColumn';
import { BookCard } from './BookCard';
import { StartNextBookDialog } from './StartNextBookDialog';
import { LibraryEmptyState } from '@/components/library/LibraryEmptyState';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReadingProgress, ReadingStatus } from '@/hooks/useReadingProgress';
import type { Book } from '@/hooks/useBooks';
import type { ReadingProgress } from '@/hooks/useReadingProgress';
import { BookOpen, Clock, CheckCircle, CircleDashed } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BookKanbanProps {
  books: Book[];
  progressMap: Map<string, ReadingProgress>;
  showNotPlanned?: boolean;
  compact?: boolean;
}

const STATUS_VALUES: ReadingStatus[] = ['not_planned', 'to_read', 'reading', 'read'];

export function BookKanban({ books, progressMap, showNotPlanned = true, compact = false }: BookKanbanProps) {
  const { t } = useLanguage();
  const { updateProgress, updateRanks } = useReadingProgress();
  const isTouchDevice = 'ontouchstart' in window;

  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [overColumn, setOverColumn] = useState<ReadingStatus | null>(null);
  const [localOrder, setLocalOrder] = useState<Map<string, string[]>>(new Map());
  const [suppressTransitions, setSuppressTransitions] = useState(false);
  const [nextBookToSuggest, setNextBookToSuggest] = useState<Book | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

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

    const sortByTitleFallback = (a: { book: Book }, b: { book: Book }) => {
      const ra = progressMap.get(a.book.id)?.sort_order ?? null;
      const rb = progressMap.get(b.book.id)?.sort_order ?? null;
      if (ra !== null && rb !== null) return ra - rb;
      if (ra !== null) return -1;
      if (rb !== null) return 1;
      return sortByTitle(a, b);
    };

    const sortByFinishedAt = (a: { book: Book; finishedAt: string | null }, b: { book: Book; finishedAt: string | null }) => {
      if (!a.finishedAt && !b.finishedAt) return sortByTitle(a, b);
      if (!a.finishedAt) return 1;
      if (!b.finishedAt) return -1;
      return new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime();
    };

    grouped.not_planned.sort(sortByTitleFallback);
    grouped.to_read.sort(sortByTitleFallback);
    grouped.reading.sort(sortByTitleFallback);
    grouped.read.sort(sortByFinishedAt);

    const applyLocalOrder = (status: string, sorted: Book[]): Book[] => {
      const ids = localOrder.get(status);
      if (!ids) return sorted;
      const byId = new Map(sorted.map(b => [b.id, b]));
      return ids.map(id => byId.get(id)).filter(Boolean) as Book[];
    };

    return {
      not_planned: applyLocalOrder('not_planned', grouped.not_planned.map(g => g.book)),
      to_read: applyLocalOrder('to_read', grouped.to_read.map(g => g.book)),
      reading: applyLocalOrder('reading', grouped.reading.map(g => g.book)),
      read: grouped.read.map(g => g.book),
    };
  }, [books, progressMap, localOrder]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const book = books.find(b => b.id === event.active.id);
    if (book) setActiveBook(book);
  }, [books]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (!over) { setOverColumn(null); return; }
    if ((STATUS_VALUES as string[]).includes(over.id as string)) {
      setOverColumn(over.id as ReadingStatus);
    } else {
      const col = Object.entries(booksByStatus).find(([, bks]) =>
        bks.some(b => b.id === over.id)
      )?.[0] as ReadingStatus | undefined;
      setOverColumn(col ?? null);
    }
  }, [booksByStatus]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveBook(null);
    setOverColumn(null);
    const bookId = active.id as string;
    const currentStatus = (progressMap.get(bookId)?.status ?? 'to_read') as ReadingStatus;

    if (!over) {
      setLocalOrder(prev => { const n = new Map(prev); n.delete(currentStatus); return n; });
      return;
    }

    const targetStatus = (STATUS_VALUES as string[]).includes(over.id as string)
      ? (over.id as ReadingStatus)
      : (Object.entries(booksByStatus).find(([, bks]) =>
          bks.some(b => b.id === over.id)
        )?.[0] as ReadingStatus | undefined);

    if (!targetStatus) return;

    if (targetStatus !== currentStatus) {
      setLocalOrder(prev => { const n = new Map(prev); n.delete(currentStatus); return n; });
      updateProgress.mutate({ bookId, status: targetStatus });
      if (targetStatus === 'read') {
        const firstToRead = booksByStatus.to_read[0] ?? null;
        if (firstToRead) setNextBookToSuggest(firstToRead);
      }
      return;
    }

    // Within-column reorder — "read" is always chronological, not manually sortable
    if (currentStatus === 'read') return;

    const columnBooks = booksByStatus[currentStatus];
    const oldIndex = columnBooks.findIndex(b => b.id === bookId);
    const newIndex = columnBooks.findIndex(b => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    const reordered = arrayMove(columnBooks, oldIndex, newIndex);
    setSuppressTransitions(true);
    setLocalOrder(prev => new Map(prev).set(currentStatus, reordered.map(b => b.id)));
    setTimeout(() => setSuppressTransitions(false), 0);

    const rankUpdates = reordered.map((b, i) => ({ bookId: b.id, sortOrder: i }));
    updateRanks.mutate(rankUpdates, {
      onSettled: () => {
        setLocalOrder(prev => { const n = new Map(prev); n.delete(currentStatus); return n; });
      },
    });
  }, [booksByStatus, progressMap, updateProgress, updateRanks]);

  if (books.length === 0) {
    return <LibraryEmptyState />;
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className={cn(
        compact
          ? showNotPlanned ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-3"
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

            <DroppableColumn id={column.status} isOver={overColumn === column.status}>
              {booksByStatus[column.status].length === 0 ? (
                <div className="flex-1 flex items-center justify-center py-8 border-2 border-dashed rounded-lg">
                  <p className="text-sm text-muted-foreground">{t('kanban.noBooks')}</p>
                </div>
              ) : (
                <SortableContext
                  items={booksByStatus[column.status].map(b => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {booksByStatus[column.status].map((book) =>
                    isTouchDevice
                      ? <SwipeableBookCard key={book.id} book={book} progress={progressMap.get(book.id)} compact={true} mini={compact} onMovedToRead={() => { const firstToRead = booksByStatus.to_read[0] ?? null; if (firstToRead) setNextBookToSuggest(firstToRead); }} />
                      : <SortableBookCard key={book.id} book={book} progress={progressMap.get(book.id)} mini={compact} suppressTransitions={suppressTransitions} />
                  )}
                </SortableContext>
              )}
            </DroppableColumn>
          </div>
        ))}
      </div>

      <DragOverlay>
        {activeBook && (
          <BookCard
            book={activeBook}
            progress={progressMap.get(activeBook.id)}
            compact={true}
            mini={compact}
            isDragging={true}
          />
        )}
      </DragOverlay>

      <StartNextBookDialog
        open={!!nextBookToSuggest}
        book={nextBookToSuggest}
        onConfirm={() => {
          if (nextBookToSuggest) updateProgress.mutate({ bookId: nextBookToSuggest.id, status: 'reading' });
          setNextBookToSuggest(null);
        }}
        onDismiss={() => setNextBookToSuggest(null)}
      />
    </DndContext>
  );
}
