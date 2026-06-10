import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import posthog from '@/lib/posthog';

export type ReadingStatus = 'to_read' | 'reading' | 'read' | 'not_planned';

export interface ReadingProgress {
  id: string;
  user_id: string;
  book_id: string;
  status: ReadingStatus;
  progress: number;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useReadingProgress(bookId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const progressQuery = useQuery({
    queryKey: ['reading-progress', user?.id, bookId],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('reading_progress')
        .select('*')
        .eq('user_id', user.id);

      if (bookId) {
        query = query.eq('book_id', bookId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ReadingProgress[];
    },
    enabled: !!user,
  });

  const updateProgress = useMutation({
    mutationFn: async ({
      bookId,
      status,
      progress,
    }: {
      bookId: string;
      status?: ReadingStatus;
      progress?: number;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const now = new Date().toISOString();
      const updates: Partial<ReadingProgress> = {};

      if (status) {
        updates.status = status;
        if (status === 'reading' && !progressQuery.data?.find(p => p.book_id === bookId)?.started_at) {
          updates.started_at = now;
        }
        if (status === 'read') {
          updates.finished_at = now;
          updates.progress = 100;
        }
      }

      if (progress !== undefined) {
        updates.progress = progress;
      }

      const { data, error } = await supabase
        .from('reading_progress')
        .upsert({
          user_id: user.id,
          book_id: bookId,
          ...updates,
        }, {
          onConflict: 'user_id,book_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data as ReadingProgress;
    },
    onMutate: async ({ bookId, status, progress: progressValue }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['reading-progress'] });

      // Snapshot previous values for both query keys (with and without bookId)
      const previousProgress = queryClient.getQueryData<ReadingProgress[]>(['reading-progress', user?.id, bookId]);
      const previousAllProgress = queryClient.getQueryData<ReadingProgress[]>(['reading-progress', user?.id, undefined]);

      const now = new Date().toISOString();
      const existingProgress = (previousProgress ?? previousAllProgress)?.find(p => p.book_id === bookId);

      // Build optimistic update
      const optimisticUpdate: Partial<ReadingProgress> = {
        book_id: bookId,
        user_id: user?.id,
        status: status ?? existingProgress?.status ?? 'to_read',
        progress: status === 'read' ? 100 : (progressValue ?? existingProgress?.progress ?? 0),
        updated_at: now,
      };

      if (status === 'reading' && !existingProgress?.started_at) {
        optimisticUpdate.started_at = now;
      }
      if (status === 'read') {
        optimisticUpdate.finished_at = now;
      }

      // Update cache optimistically
      const updateCache = (old: ReadingProgress[] | undefined) => {
        if (!old) return old;
        const existing = old.find(p => p.book_id === bookId);
        if (existing) {
          return old.map(p => p.book_id === bookId ? { ...p, ...optimisticUpdate } : p);
        }
        // Add new entry if it doesn't exist
        return [...old, { ...existingProgress, ...optimisticUpdate, id: 'optimistic-' + bookId, created_at: now } as ReadingProgress];
      };

      if (previousProgress) {
        queryClient.setQueryData<ReadingProgress[]>(['reading-progress', user?.id, bookId], updateCache);
      }
      if (previousAllProgress) {
        queryClient.setQueryData<ReadingProgress[]>(['reading-progress', user?.id, undefined], updateCache);
      }

      return { previousProgress, previousAllProgress };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reading-progress'] });
      queryClient.invalidateQueries({ queryKey: ['friends-book-progress'] });
      if (variables.status) {
        posthog.capture('reading status updated', {
          book_id: variables.bookId,
          status: variables.status,
          progress: variables.progress ?? data.progress,
        });
      }
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousProgress) {
        queryClient.setQueryData(['reading-progress', user?.id, bookId], context.previousProgress);
      }
      if (context?.previousAllProgress) {
        queryClient.setQueryData(['reading-progress', user?.id, undefined], context.previousAllProgress);
      }
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar progresso',
        description: error.message,
      });
    },
  });

  const updateFinishedDate = useMutation({
    mutationFn: async ({ bookId, finishedAt }: { bookId: string; finishedAt: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('reading_progress')
        .upsert({
          user_id: user.id,
          book_id: bookId,
          finished_at: finishedAt,
          status: 'read',
          progress: 100,
        }, {
          onConflict: 'user_id,book_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data as ReadingProgress;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-progress'] });
      queryClient.invalidateQueries({ queryKey: ['friends-book-progress'] });
      toast({
        title: 'Data atualizada',
        description: 'A data de conclusão foi atualizada com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar data',
        description: error.message,
      });
    },
  });

  return {
    progress: progressQuery.data ?? [],
    isLoading: progressQuery.isLoading,
    updateProgress,
    updateFinishedDate,
  };
}
