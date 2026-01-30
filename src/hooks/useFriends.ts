import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Friend {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export function useFriends() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const friendsQuery = useQuery({
    queryKey: ['friends', user?.id],
    queryFn: async () => {
      // Single query using RPC function that joins friendships with profiles
      const { data, error } = await supabase
        .rpc('get_friends_with_profiles', { p_user_id: user!.id });

      if (error) throw error;

      return (data ?? []).map((f) => ({
        id: f.friendship_id,
        user_id: f.friend_user_id,
        display_name: f.display_name,
        avatar_url: f.avatar_url,
        created_at: f.friendship_created_at,
      })) as Friend[];
    },
    enabled: !!user,
  });

  const removeFriend = useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      toast({ title: 'Amizade removida' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover amizade',
        description: error.message,
      });
    },
  });

  return {
    friends: friendsQuery.data ?? [],
    isLoading: friendsQuery.isLoading,
    removeFriend,
  };
}
