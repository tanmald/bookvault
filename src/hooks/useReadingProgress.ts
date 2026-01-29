import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type ReadingStatus = 'to_read' | 'reading' | 'read';

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
      let query = supabase
        .from('reading_progress')
        .select('*');

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-progress'] });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar progresso',
        description: error.message,
      });
    },
  });

  return {
    progress: progressQuery.data ?? [],
    isLoading: progressQuery.isLoading,
    updateProgress,
  };
}
