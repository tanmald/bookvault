import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ReadingGoal {
  id: string;
  user_id: string;
  year: number;
  target: number;
  created_at: string;
  updated_at: string;
}

export function useReadingGoal(year?: number) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const targetYear = year ?? new Date().getFullYear();

  const goalQuery = useQuery({
    queryKey: ['reading-goal', user?.id, targetYear],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('reading_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('year', targetYear)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as ReadingGoal | null;
    },
    enabled: !!user,
  });

  const progressQuery = useQuery({
    queryKey: ['reading-goal-progress', user?.id, targetYear],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const startOfYear = new Date(targetYear, 0, 1).toISOString();
      const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59).toISOString();

      const { data, error } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'read');

      if (error) throw error;

      const booksReadThisYear = (data ?? []).filter((book) => {
        if (!book.finished_at) return false;
        const finishedDate = new Date(book.finished_at);
        return finishedDate >= new Date(startOfYear) && finishedDate <= new Date(endOfYear);
      });

      return booksReadThisYear.length;
    },
    enabled: !!user,
  });

  const upsertGoal = useMutation({
    mutationFn: async ({ year, target }: { year: number; target: number }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('reading_goals')
        .upsert(
          { user_id: user.id, year, target },
          { onConflict: 'user_id,year' }
        )
        .select()
        .single();

      if (error) throw error;
      return data as ReadingGoal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-goal'] });
      toast({ title: 'Meta guardada', description: 'A tua meta de leitura foi atualizada.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Erro ao guardar meta', description: error.message });
    },
  });

  const deleteGoal = useMutation({
    mutationFn: async (goalId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('reading_goals')
        .delete()
        .eq('id', goalId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-goal'] });
      toast({ title: 'Meta eliminada', description: 'A tua meta de leitura foi eliminada.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Erro ao eliminar meta', description: error.message });
    },
  });

  return {
    goal: goalQuery.data ?? null,
    booksRead: progressQuery.data ?? 0,
    isLoading: goalQuery.isLoading || progressQuery.isLoading,
    upsertGoal,
    deleteGoal,
  };
}
