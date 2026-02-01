import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface Library {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_default: boolean;
  is_public: boolean;
  allow_member_uploads: boolean;
}

interface LibraryContextType {
  currentLibrary: Library | null;
  libraries: Library[];
  isLoading: boolean;
  setCurrentLibrary: (library: Library) => void;
  refetch: () => Promise<void>;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

const STORAGE_KEY = 'bookvault-current-library';

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [currentLibrary, setCurrentLibraryState] = useState<Library | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLibraries = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('libraries')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;

      setLibraries(data || []);

      // Set current library from localStorage or default to first library
      const storedId = localStorage.getItem(STORAGE_KEY);
      const stored = data?.find(lib => lib.id === storedId);
      const defaultLib = data?.find(lib => lib.is_default);

      setCurrentLibraryState(stored || defaultLib || data?.[0] || null);
    } catch (error) {
      console.error('Error fetching libraries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLibraries();
    } else {
      setLibraries([]);
      setCurrentLibraryState(null);
      setIsLoading(false);
    }
  }, [user]);

  const setCurrentLibrary = (library: Library) => {
    setCurrentLibraryState(library);
    localStorage.setItem(STORAGE_KEY, library.id);
  };

  return (
    <LibraryContext.Provider value={{
      currentLibrary,
      libraries,
      isLoading,
      setCurrentLibrary,
      refetch: fetchLibraries,
    }}>
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (context === undefined) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
}
