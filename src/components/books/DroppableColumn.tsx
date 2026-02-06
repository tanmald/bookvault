import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import type { ReadingStatus } from '@/hooks/useReadingProgress';

interface DroppableColumnProps {
  id: ReadingStatus;
  items: string[];
  children: React.ReactNode;
  isOver?: boolean;
}

export function DroppableColumn({ id, items, children, isOver }: DroppableColumnProps) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <SortableContext
      id={id}
      items={items}
      strategy={verticalListSortingStrategy}
    >
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col gap-3 flex-1 transition-colors rounded-lg p-2",
          isOver && "bg-accent/20 ring-2 ring-accent"
        )}
      >
        {children}
      </div>
    </SortableContext>
  );
}
