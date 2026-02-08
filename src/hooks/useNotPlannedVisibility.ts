import { useState } from 'react';

const STORAGE_KEY = 'bookvault-show-not-planned';

export function useNotPlannedVisibility() {
  const [showNotPlanned, setShowNotPlannedState] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true'; // Default to true (shown)
  });

  const setShowNotPlanned = (value: boolean) => {
    setShowNotPlannedState(value);
    localStorage.setItem(STORAGE_KEY, String(value));
  };

  return { showNotPlanned, setShowNotPlanned };
}
