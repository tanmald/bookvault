import { useState } from 'react';

const STORAGE_KEY = 'bookvault-kanban-size';

type KanbanSize = 'large' | 'small';

export function useKanbanSize() {
  const [kanbanSize, setKanbanSizeState] = useState<KanbanSize>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored === 'small' ? 'small' : 'large') as KanbanSize;
  });

  const setKanbanSize = (value: KanbanSize) => {
    setKanbanSizeState(value);
    localStorage.setItem(STORAGE_KEY, value);
  };

  return { kanbanSize, setKanbanSize };
}
