# Kanban Drag-and-Drop Implementation Plan

## Overview
Restore the drag-and-drop functionality for the BookKanban component from the main branch to the dev branch. This implementation uses @dnd-kit for mouse, touch, and keyboard support with optimistic updates.

---

## Dependencies

```bash
# Already installed (verify):
npm list @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Required packages:**
- `@dnd-kit/core` - Drag and drop primitives
- `@dnd-kit/sortable` - Sortable list integration
- `@dnd-kit/utilities` - CSS utilities for transforms

---

## Files to Create

### 1. src/components/books/SortableBookCard.tsx

**Purpose:** Wraps BookCard with drag functionality using useSortable hook.

```typescript
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
      />
    </div>
  );
}
```

**Key points:**
- `useSortable({ id: book.id })` - Makes the card sortable/draggable
- `attributes` and `listeners` - Applied to the wrapper to enable drag interaction
- `setNodeRef` - DOM reference for the sortable library
- `CSS.Transform.toString(transform)` - Handles visual movement during drag
- `touch-none` class - Prevents scroll conflicts on touch devices
- `opacity: 0.5` - Visual feedback when dragging

---

### 2. src/components/books/DroppableColumn.tsx

**Purpose:** Creates a drop zone for books with visual feedback when dragging over.

```typescript
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
```

**Key points:**
- `useDroppable({ id })` - Registers this element as a drop zone
- `SortableContext` - Required for the sortable items inside
- `id={column.status}` - Drop zone identifier (e.g., 'reading', 'read')
- `items` - Array of book IDs for the sortable context
- `isOver` - Prop to control visual highlight when dragging over
- `bg-accent/20 ring-2 ring-accent` - Visual feedback when over

---

## Files to Modify

### 3. src/components/books/BookCard.tsx

**Changes needed:** Add `isDragging` prop for visual feedback during drag.

**Current interface (lines 11-15):**
```typescript
interface BookCardProps {
  book: Book;
  progress?: ReadingProgress;
  compact?: boolean;
}
```

**New interface:**
```typescript
interface BookCardProps {
  book: Book;
  progress?: ReadingProgress;
  compact?: boolean;
  isDragging?: boolean;  // ADD THIS
}
```

**Current function signature (line 23):**
```typescript
export function BookCard({ book, progress, compact = false }: BookCardProps) {
```

**New function signature:**
```typescript
export function BookCard({ book, progress, compact = false, isDragging = false }: BookCardProps) {
```

**Add visual feedback to Card (line 38-41):**

**Current:**
```typescript
<Card className={cn(
  "group overflow-hidden transition-all hover:shadow-lg",
  compact && "hover:shadow-md"
)}>
```

**New:**
```typescript
<Card className={cn(
  "group overflow-hidden transition-all hover:shadow-lg",
  compact && "hover:shadow-md",
  isDragging && "ring-2 ring-accent shadow-lg rotate-1"
)}>
```

**Visual effects when dragging:**
- `ring-2 ring-accent` - Blue ring around the card
- `shadow-lg` - Elevated shadow
- `rotate-1` - Slight rotation for "picked up" effect

---

### 4. src/components/books/BookKanban.tsx (Complete Rewrite)

**Purpose:** Replace the simple grid layout with full DnD integration.

```typescript
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
  showNotPlanned?: boolean;
}

export function BookKanban({ books, progressMap, showNotPlanned = true }: BookKanbanProps) {
  const { t } = useLanguage();
  const { updateProgress } = useReadingProgress();

  // ==================== DRAG STATE ====================
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // ==================== SENSORS ====================
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts (prevents accidental drags)
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

  // ==================== COLUMN CONFIGURATION ====================
  const allColumns = useMemo(() => [
    {
      status: 'not_planned' as ReadingStatus,
      label: t('status.notPlanned'),
      icon: <CircleDashed className="h-4 w-4" />,
      color: 'border-muted-foreground/30'
    },
    {
      status: 'to_read' as ReadingStatus,
      label: t('status.toRead'),
      icon: <Clock className="h-4 w-4" />,
      color: 'border-muted-foreground/50'
    },
    {
      status: 'reading' as ReadingStatus,
      label: t('status.reading'),
      icon: <BookOpen className="h-4 w-4" />,
      color: 'border-accent'
    },
    {
      status: 'read' as ReadingStatus,
      label: t('status.read'),
      icon: <CheckCircle className="h-4 w-4" />,
      color: 'border-primary'
    },
  ], [t]);

  const columns = showNotPlanned 
    ? allColumns 
    : allColumns.filter(c => c.status !== 'not_planned');

  // ==================== BOOK GROUPING ====================
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

  // Get the actively dragged book for the drag overlay
  const activeBook = activeId ? books.find((b) => b.id === activeId) : null;

  // ==================== DRAG HANDLERS ====================
  
  /**
   * Called when drag starts - sets the active book ID
   */
  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  /**
   * Called when dragging over a drop zone - sets the over ID for visual feedback
   */
  function handleDragOver(event: DragOverEvent) {
    setOverId(event.over?.id as string | null);
  }

  /**
   * Called when drag ends - updates the book status if dropped on a different column
   */
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) {
      // Dropped outside any drop zone - cancel the drag
      setActiveId(null);
      setOverId(null);
      return;
    }

    const bookId = active.id as string;
    const newStatus = over.id as ReadingStatus;

    // Get current status to check if we actually need to update
    const currentProgress = progressMap.get(bookId);
    const currentStatus = currentProgress?.status ?? 'not_planned';

    // Only update if the status actually changed
    if (currentStatus !== newStatus) {
      // This triggers an optimistic update via React Query
      // The book will visually move immediately, then API call confirms
      updateProgress.mutate({ bookId, status: newStatus });
    }

    // Reset drag state
    setActiveId(null);
    setOverId(null);
  }

  /**
   * Called when drag is cancelled (e.g., Escape key pressed)
   */
  function handleDragCancel() {
    setActiveId(null);
    setOverId(null);
  }

  // ==================== EMPTY STATE ====================
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

  // ==================== RENDER ====================
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {/* Kanban Grid - 2 cols mobile, 3 or 4 cols desktop */}
      <div className={cn(
        "grid gap-3 md:gap-4",
        showNotPlanned
          ? "grid-cols-2 md:grid-cols-4"
          : "grid-cols-2 md:grid-cols-3"
      )}>
        {columns.map((column) => (
          <div key={column.status} className="flex flex-col min-w-0">
            {/* Column Header */}
            <div className={cn(
              "flex items-center gap-2 pb-3 mb-3 border-b-2",
              column.color
            )}>
              {column.icon}
              <h2 className="font-semibold truncate">{column.label}</h2>
              <span className="ml-auto text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {booksByStatus[column.status].length}
              </span>
            </div>

            {/* Droppable Column */}
            <DroppableColumn
              id={column.status}
              items={booksByStatus[column.status].map(b => b.id)}
              isOver={overId === column.status}
            >
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
                  />
                ))
              )}
            </DroppableColumn>
          </div>
        ))}
      </div>

      {/* Drag Overlay - follows cursor during drag */}
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
```

---

## Implementation Steps

### Step 1: Verify Dependencies
```bash
npm list @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```
If missing:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Step 2: Modify BookCard.tsx
1. Add `isDragging?: boolean` to BookCardProps interface
2. Add `isDragging = false` to destructured props
3. Add visual feedback classes to Card component when isDragging is true

### Step 3: Create SortableBookCard.tsx
1. Create new file at `src/components/books/SortableBookCard.tsx`
2. Copy the full code from this plan
3. Import and export as default/named export as appropriate

### Step 4: Create DroppableColumn.tsx
1. Create new file at `src/components/books/DroppableColumn.tsx`
2. Copy the full code from this plan

### Step 5: Rewrite BookKanban.tsx
1. Replace the entire file content with the complete implementation above
2. Keep the same file location: `src/components/books/BookKanban.tsx`
3. Ensure all imports are at the top

### Step 6: Test the Implementation

**Test Cases:**

1. **Mouse drag:**
   - Click and drag a book to another column
   - Verify book moves visually
   - Verify status updates in backend

2. **Touch drag (mobile):**
   - Long press (150ms) on a book
   - Drag to another column
   - Verify it works without scrolling the page

3. **Keyboard navigation:**
   - Tab to a book card
   - Press Space to pick up
   - Use Arrow keys to move
   - Press Space to drop

4. **showNotPlanned toggle:**
   - Toggle off showNotPlanned
   - Verify not_planned column disappears
   - Verify drag still works between remaining columns
   - Toggle on showNotPlanned
   - Verify column reappears and drag works

5. **Error handling:**
   - Drop book outside any column
   - Verify it snaps back
   - Press Escape during drag
   - Verify drag cancels

---

## Integration Details

### useReadingProgress Hook
The drag-and-drop uses `updateProgress.mutate()` from the `useReadingProgress` hook:

```typescript
const { updateProgress } = useReadingProgress();

// In handleDragEnd:
updateProgress.mutate({ bookId, status: newStatus });
```

**Expected behavior:**
- Optimistic update: Book moves immediately in UI
- API call: Updates reading_progress table in Supabase
- Rollback: If API fails, React Query reverts the change

### React Query Integration
The `updateProgress` mutation should be configured with:
- `onMutate` - Optimistic update
- `onError` - Rollback on failure
- `onSettled` - Refetch to ensure consistency

### Accessibility
- Keyboard users can use Space to pick up/drop
- Arrow keys navigate between columns
- Screen readers announce drag state changes
- Visual feedback for all interactions

---

## Code Changes Summary

| File | Action | Lines Changed |
|------|--------|---------------|
| BookCard.tsx | Add isDragging prop | +3 lines |
| SortableBookCard.tsx | Create new file | ~45 lines |
| DroppableColumn.tsx | Create new file | ~35 lines |
| BookKanban.tsx | Complete rewrite | ~200 lines |

**Total:** ~280 lines of new/modified code

---

## Notes

1. **Default status:** Changed from `'to_read'` to `'not_planned'` in booksByStatus grouping to match main branch behavior

2. **Icon consistency:** Changed `Ban` icon back to `CircleDashed` for not_planned column

3. **Border colors:** Adjusted border colors to match main branch:
   - not_planned: `border-muted-foreground/30`
   - to_read: `border-muted-foreground/50`
   - reading: `border-accent`
   - read: `border-primary`

4. **Responsive grid:** 
   - Mobile: Always 2 columns
   - Desktop: 3 columns (without not_planned) or 4 columns (with not_planned)

5. **Sensor configuration:**
   - Mouse: 8px distance prevents accidental drags on click
   - Touch: 150ms delay prevents scroll conflicts on mobile
   - Keyboard: Full accessibility support

---

## Migration Checklist

- [ ] Dependencies verified/installed
- [ ] BookCard.tsx - isDragging prop added
- [ ] SortableBookCard.tsx - created and tested
- [ ] DroppableColumn.tsx - created and tested
- [ ] BookKanban.tsx - rewritten with DnD
- [ ] Mouse drag tested
- [ ] Touch drag tested
- [ ] Keyboard navigation tested
- [ ] showNotPlanned toggle tested
- [ ] Error scenarios tested (drop outside, Escape)
- [ ] Build passes: `npm run build`
- [ ] No TypeScript errors: `npm run lint`
- [ ] Tests pass: `npm run test`
