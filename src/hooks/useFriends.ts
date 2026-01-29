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
      // Get friendships where current user is either user_id or friend_id
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select('id, user_id, friend_id, created_at')
        .or(`user_id.eq.${user!.id},friend_id.eq.${user!.id}`);

      if (error) throw error;

      // Get the friend IDs (the one that's not the current user)
      const friendIds = friendships.map((f) =>
        f.user_id === user!.id ? f.friend_id : f.user_id
      );

      if (friendIds.length === 0) return [];

      // Get friend profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', friendIds);

      if (profilesError) throw profilesError;

      // Combine data
      return friendships.map((f) => {
        const friendId = f.user_id === user!.id ? f.friend_id : f.user_id;
        const profile = profiles.find((p) => p.user_id === friendId);
        return {
          id: f.id,
          user_id: friendId,
          display_name: profile?.display_name || null,
          avatar_url: profile?.avatar_url || null,
          created_at: f.created_at,
        };
      }) as Friend[];
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
