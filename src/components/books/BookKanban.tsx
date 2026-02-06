import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
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

interface BookKanbanProps {
  books: Book[];
  progressMap: Map<string, ReadingProgress>;
}

export function BookKanban({ books, progressMap }: BookKanbanProps) {
  const { t } = useLanguage();
  const { updateProgress } = useReadingProgress();

  // Drag state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Configure sensors with activation constraints
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150, // 150ms press before drag (prevents scroll conflict)
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const columns: { status: ReadingStatus; label: string; icon: React.ReactNode; color: string }[] = [
    {
      status: 'not_planned',
      label: t('status.notPlanned'),
      icon: <CircleDashed className="h-4 w-4" />,
      color: 'border-muted-foreground/30'
    },
    {
      status: 'to_read',
      label: t('status.toRead'),
      icon: <Clock className="h-4 w-4" />,
      color: 'border-muted-foreground/50'
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
      not_planned: [],
      to_read: [],
      reading: [],
      read: [],
    };

    books.forEach((book) => {
      const progress = progressMap.get(book.id);
      const status = progress?.status ?? 'not_planned';
      grouped[status].push(book);
    });

    return grouped;
  }, [books, progressMap]);

  // Get the actively dragged book
  const activeBook = activeId ? books.find((b) => b.id === activeId) : null;

  // Drag handlers
  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragOver(event: DragOverEvent) {
    setOverId(event.over?.id as string | null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) {
      // Dropped outside any drop zone - cancel
      setActiveId(null);
      setOverId(null);
      return;
    }

    const bookId = active.id as string;
    const newStatus = over.id as ReadingStatus;

    // Only update if status changed
    const currentProgress = progressMap.get(bookId);
    const currentStatus = currentProgress?.status ?? 'not_planned';

    if (currentStatus !== newStatus) {
      // This will trigger optimistic update and API call
      updateProgress.mutate({ bookId, status: newStatus });
    }

    setActiveId(null);
    setOverId(null);
  }

  function handleDragCancel() {
    setActiveId(null);
    setOverId(null);
  }

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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
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
              items={booksByStatus[column.status].map(b => b.id)}
              isOver={overId === column.status}
            >
              {booksByStatus[column.status].length === 0 ? (
                <div className="flex-1 flex items-center justify-center py-8 border-2 border-dashed rounded-lg">
                  <p className="text-sm text-muted-foreground">{noBooksText}</p>
                </div>
              ) : (
                booksByStatus[column.status].map((book) => (
                  <SortableBookCard
                    key={book.id}
                    book={book}
                    progress={progressMap.get(book.id)}
                    isDragging={activeId === book.id}
                  />
                ))
              )}
            </DroppableColumn>
          </div>
        ))}
      </div>

      {/* Drag overlay - follows cursor during drag */}
      <DragOverlay>
        {activeBook ? (
          <BookCard
            book={activeBook}
            progress={progressMap.get(activeBook.id)}
            compact={true}
            isDragging={true}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
