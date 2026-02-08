import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BookCard } from './BookCard';
import type { Book } from '@/hooks/useBooks';
import type { ReadingProgress } from '@/hooks/useReadingProgress';

interface SortableBookCardProps {
  book: Book;
  progress?: ReadingProgress;
  isDragging?: boolean;
}

export function SortableBookCard({ book, progress, isDragging }: SortableBookCardProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="touch-none"
    >
      <BookCard
        book={book}
        progress={progress}
        compact={true}
        isDragging={isDragging || isSortableDragging}
        disableLink={true}
      />
    </div>
  );
}
