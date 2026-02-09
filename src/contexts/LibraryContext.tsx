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
  removeLibrary: (libraryId: string) => void;
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
      // Use RPC function to get only libraries where user is owner or member
      // This explicitly filters to avoid RLS caching issues
      const { data, error } = await supabase
        .rpc('get_user_libraries');

      if (error) {
        console.error('Error fetching libraries:', error);
        throw error;
      }

      console.log('Fetched libraries:', data);

      // If no libraries exist, create a default one
      if (!data || data.length === 0) {
        console.log('No libraries found, creating default library...');
        const { data: newLibrary, error: createError } = await supabase
          .from('libraries')
          .insert({
            name: 'My Library',
            description: 'Your personal library',
            created_by: user.id,
            is_default: true,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating default library:', createError);
          throw createError;
        }

        console.log('Created default library:', newLibrary);

        // Migrate any existing books without library_id or with invalid library_id to this library
        const { error: updateError } = await supabase
          .from('books')
          .update({ library_id: newLibrary.id })
          .eq('owner_id', user.id);

        if (updateError) {
          console.error('Error migrating books to library:', updateError);
        } else {
          console.log('Migrated existing books to default library');
        }

        setLibraries([newLibrary]);
        setCurrentLibraryState(newLibrary);
        setIsLoading(false);
        return;
      }

      setLibraries(data || []);

      // Set current library from localStorage or default to first library
      const storedId = localStorage.getItem(STORAGE_KEY);
      const stored = data?.find(lib => lib.id === storedId);
      const defaultLib = data?.find(lib => lib.is_default);
      const selected = stored || defaultLib || data?.[0] || null;

      console.log('Selected library:', selected);
      setCurrentLibraryState(selected);
    } catch (error) {
      console.error('Error fetching libraries:', error);
      // Set empty state so app doesn't break
      setLibraries([]);
      setCurrentLibraryState(null);
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
  }, [user?.id]);

  const setCurrentLibrary = (library: Library) => {
    setCurrentLibraryState(library);
    localStorage.setItem(STORAGE_KEY, library.id);
  };

  const removeLibrary = (libraryId: string) => {
    // Remove library from state immediately (optimistic update)
    setLibraries(prev => prev.filter(lib => lib.id !== libraryId));

    // If the removed library is current, switch to a safe alternative
    if (currentLibrary?.id === libraryId) {
      const remaining = libraries.filter(lib => lib.id !== libraryId);

      // Find a safe library to switch to
      const defaultLib = remaining.find(lib => lib.is_default);
      const ownedLib = remaining.find(lib => lib.created_by === user?.id);
      const fallbackLib = remaining[0];

      const safeLibrary = defaultLib || ownedLib || fallbackLib || null;

      setCurrentLibraryState(safeLibrary);
      if (safeLibrary) {
        localStorage.setItem(STORAGE_KEY, safeLibrary.id);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  };

  return (
    <LibraryContext.Provider value={{
      currentLibrary,
      libraries,
      isLoading,
      setCurrentLibrary,
      removeLibrary,
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
