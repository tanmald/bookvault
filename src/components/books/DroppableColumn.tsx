import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import type { ReadingStatus } from '@/hooks/useReadingProgress';

interface DroppableColumnProps {
  id: ReadingStatus;
  children: React.ReactNode;
  isOver?: boolean;
}

export function DroppableColumn({ id, children, isOver }: DroppableColumnProps) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col gap-3 flex-1 min-h-[100px] transition-all rounded-lg p-2 border-2 border-transparent",
        isOver && "ring-2 ring-accent bg-accent/20"
      )}
    >
      {children}
    </div>
  );
}
