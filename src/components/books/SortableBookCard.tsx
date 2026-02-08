import { useState, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BookCard } from './BookCard';
import type { Book } from '@/hooks/useBooks';
import type { ReadingProgress } from '@/hooks/useReadingProgress';
import { cn } from '@/lib/utils';

interface SortableBookCardProps {
  book: Book;
  progress?: ReadingProgress;
  isDragging?: boolean;
  isOver?: boolean;
}

export function SortableBookCard({ book, progress, isDragging, isOver }: SortableBookCardProps) {
  const [clicked, setClicked] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: book.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!isSortableDragging && !clicked) {
      window.location.href = `/book/${book.id}`;
    }
    setClicked(false);
  }, [book.id, isSortableDragging, clicked]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={cn("touch-none", isOver && "opacity-50")}
    >
      <BookCard
        book={book}
        progress={progress}
        compact={true}
        isDragging={isDragging || isSortableDragging}
      />
    </div>
  );
}
