import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  PointerSensor,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  defaultDropAnimationSideEffects,
  DropAnimation,
} from '@dnd-kit/core';
import { BookCard } from './BookCard';
import { SortableBookCard } from './SortableBookCard';
import { DroppableColumn } from './DroppableColumn';
import { EmptyState } from '@/components/ui/EmptyState';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReadingProgress } from '@/hooks/useReadingProgress';
import type { Book } from '@/hooks/useBooks';
import type { ReadingProgress, ReadingStatus } from '@/hooks/useReadingProgress';
import { BookOpen, Clock, CheckCircle, CircleDashed } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReviewDialog } from './ReviewDialog';

interface BookKanbanProps {
  books: Book[];
  progressMap: Map<string, ReadingProgress>;
  showNotPlanned?: boolean;
}

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};

export function BookKanban({ books, progressMap, showNotPlanned = true }: BookKanbanProps) {
  const { t } = useLanguage();
  const { updateProgress } = useReadingProgress();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [reviewBook, setReviewBook] = useState<Book | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
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

  const activeBook = activeId ? books.find((b) => b.id === activeId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event;
    
    if (over && typeof over.id === 'string' && ['not_planned', 'to_read', 'reading', 'read'].includes(over.id)) {
      setOverId(over.id as string);
      return;
    }
    
    setOverId(event.over?.id as string | null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      setOverId(null);
      return;
    }

    const bookId = active.id as string;
    const newStatus = over.id as ReadingStatus;
    const book = books.find(b => b.id === bookId);

    const currentProgress = progressMap.get(bookId);
    const currentStatus = currentProgress?.status ?? 'to_read';

    if (currentStatus !== newStatus) {
      if (newStatus === 'read' && book) {
        setReviewBook(book);
        setIsReviewDialogOpen(true);
      } else {
        updateProgress.mutate({ bookId, status: newStatus });
      }
    }

    setActiveId(null);
    setOverId(null);
  }

  function handleReviewSubmit() {
    if (reviewBook) {
      updateProgress.mutate({ bookId: reviewBook.id, status: 'read' });
    }
    setReviewBook(null);
    setIsReviewDialogOpen(false);
  }

  function handleReviewCancel() {
    setReviewBook(null);
    setIsReviewDialogOpen(false);
  }

  function handleDragCancel() {
    setActiveId(null);
    setOverId(null);
  }

  if (books.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title={t('library.empty')}
        description={t('library.emptyDesc')}
        size="lg"
      />
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
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

            <DroppableColumn
              id={column.status}
              isOver={overId === column.status}
            >
              <div className="flex flex-col gap-3 flex-1 min-h-[100px]">
                {booksByStatus[column.status].length === 0 ? (
                  <div className="flex-1 flex items-center justify-center py-8 border-2 border-dashed rounded-lg">
                    <p className="text-sm text-muted-foreground">{t('kanban.noBooks')}</p>
                  </div>
                ) : (
                  booksByStatus[column.status].map((book) => (
                    <SortableBookCard
                      key={book.id}
                      book={book}
                      progress={progressMap.get(book.id)}
                      isDragging={activeId === book.id}
                      isOver={overId === column.status}
                    />
                  ))
                )}
              </div>
            </DroppableColumn>
          </div>
        ))}
      </div>

      <DragOverlay dropAnimation={dropAnimation}>
        {activeBook ? (
          <div className="opacity-80 cursor-grabbing">
            <BookCard
              book={activeBook}
              progress={progressMap.get(activeBook.id)}
              compact={true}
              isDragging={true}
            />
          </div>
        ) : null}
      </DragOverlay>

      <ReviewDialog
        isOpen={isReviewDialogOpen}
        onClose={() => setIsReviewDialogOpen(false)}
        bookId={reviewBook?.id || ''}
        onSubmit={handleReviewSubmit}
        onCancel={handleReviewCancel}
      />
    </DndContext>
  );
}
