import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ReadingSession {
  id: string;
  user_id: string;
  book_id: string | null;
  duration_minutes: number;
  date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReadingSessionWithBook extends ReadingSession {
  book_title?: string;
  book_author?: string;
}

export function useReadingSessions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sessionsQuery = useQuery({
    queryKey: ['reading-sessions', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('reading_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as ReadingSession[];
    },
    enabled: !!user,
  });

  const todaySessionQuery = useQuery({
    queryKey: ['reading-sessions', user?.id, 'today'],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('reading_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as ReadingSession | null;
    },
    enabled: !!user,
  });

  const weeklyTotalQuery = useQuery({
    queryKey: ['reading-sessions', user?.id, 'weekly'],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('reading_sessions')
        .select('duration_minutes')
        .eq('user_id', user.id)
        .gte('date', weekAgo.toISOString().split('T')[0])
        .lte('date', today.toISOString().split('T')[0]);

      if (error) throw error;
      return (data ?? []).reduce((sum, s) => sum + s.duration_minutes, 0);
    },
    enabled: !!user,
  });

  const streakQuery = useQuery({
    queryKey: ['reading-sessions', user?.id, 'streak'],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data: sessions, error } = await supabase
        .from('reading_sessions')
        .select('date')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      if (!sessions || sessions.length === 0) return 0;

      const uniqueDates = [...new Set(sessions.map(s => s.date))].sort().reverse();
      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < uniqueDates.length; i++) {
        const sessionDate = new Date(uniqueDates[i]);
        sessionDate.setHours(0, 0, 0, 0);

        if (i === 0) {
          const daysDiff = Math.floor((today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff > 1) break;
        }

        const actualDiff = Math.floor((today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

        if (actualDiff === i) {
          streak++;
        } else {
          break;
        }
      }

      return streak;
    },
    enabled: !!user,
  });

  const addSession = useMutation({
    mutationFn: async ({
      durationMinutes,
      bookId,
      date,
      notes,
    }: {
      durationMinutes: number;
      bookId?: string;
      date?: string;
      notes?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('reading_sessions')
        .insert({
          user_id: user.id,
          book_id: bookId || null,
          duration_minutes: durationMinutes,
          date: date || new Date().toISOString().split('T')[0],
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ReadingSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-sessions'] });
      toast({ title: 'Sessão guardada', description: 'O teu tempo de leitura foi registado.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Erro ao guardar sessão', description: error.message });
    },
  });

  const updateSession = useMutation({
    mutationFn: async ({
      sessionId,
      durationMinutes,
      notes,
    }: {
      sessionId: string;
      durationMinutes?: number;
      notes?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const updates: Partial<ReadingSession> = {};
      if (durationMinutes !== undefined) updates.duration_minutes = durationMinutes;
      if (notes !== undefined) updates.notes = notes;

      const { data, error } = await supabase
        .from('reading_sessions')
        .update(updates)
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as ReadingSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-sessions'] });
      toast({ title: 'Sessão atualizada', description: 'A sessão de leitura foi atualizada.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Erro ao atualizar sessão', description: error.message });
    },
  });

  const deleteSession = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('reading_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-sessions'] });
      toast({ title: 'Sessão eliminada', description: 'A sessão de leitura foi eliminada.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Erro ao eliminar sessão', description: error.message });
    },
  });

  return {
    sessions: sessionsQuery.data ?? [],
    todaySession: todaySessionQuery.data ?? null,
    weeklyTotal: weeklyTotalQuery.data ?? 0,
    streak: streakQuery.data ?? 0,
    isLoading: sessionsQuery.isLoading,
    addSession,
    updateSession,
    deleteSession,
  };
}
