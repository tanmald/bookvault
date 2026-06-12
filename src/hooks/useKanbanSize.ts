import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile, Profile } from '@/hooks/useProfile';

type KanbanSize = 'large' | 'small';

export function useKanbanSize() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const kanbanSize: KanbanSize = profile?.kanban_size === 'large' ? 'large' : 'small';

  const setKanbanSize = async (value: KanbanSize) => {
    if (!user) return;

    queryClient.setQueryData<Profile>(['profile', user.id], (prev) =>
      prev ? { ...prev, kanban_size: value } : prev
    );

    await supabase
      .from('profiles')
      .update({ kanban_size: value })
      .eq('user_id', user.id);
  };

  return { kanbanSize, setKanbanSize };
}
