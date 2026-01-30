import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type LibraryRole = Database['public']['Enums']['library_role'];

export interface LibraryMember {
  id: string;
  library_owner_id: string;
  user_id: string;
  role: LibraryRole;
  created_at: string;
  invited_by: string | null;
  // Profile data
  display_name: string | null;
  avatar_url: string | null;
  is_owner: boolean;
}

export function useLibraryMembers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch members of the current user's library
  const membersQuery = useQuery({
    queryKey: ['library-members', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get all members where the current user is the library owner
      const { data: members, error } = await supabase
        .from('library_members')
        .select('*')
        .eq('library_owner_id', user.id);

      if (error) throw error;

      if (!members || members.length === 0) return [];

      // Get all user IDs to fetch profiles
      const userIds = members.map((m) => m.user_id);

      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Combine data
      return members.map((m) => {
        const profile = profiles?.find((p) => p.user_id === m.user_id);
        return {
          ...m,
          display_name: profile?.display_name || null,
          avatar_url: profile?.avatar_url || null,
          is_owner: m.user_id === m.library_owner_id,
        };
      }) as LibraryMember[];
    },
    enabled: !!user,
  });

  // Check if current user is admin of their own library
  const isAdmin = membersQuery.data?.some(
    (m) => m.user_id === user?.id && (m.role === 'admin' || m.is_owner)
  ) ?? false;

  // Promote member to admin
  const promoteMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('library_members')
        .update({ role: 'admin' as LibraryRole })
        .eq('id', memberId)
        .eq('library_owner_id', user!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-members'] });
      toast({ title: 'Membro promovido a admin' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao promover membro',
        description: error.message,
      });
    },
  });

  // Demote admin to member
  const demoteMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('library_members')
        .update({ role: 'member' as LibraryRole })
        .eq('id', memberId)
        .eq('library_owner_id', user!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-members'] });
      toast({ title: 'Membro despromovido' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao despromover membro',
        description: error.message,
      });
    },
  });

  // Remove member from library (also removes friendship)
  const removeMember = useMutation({
    mutationFn: async ({ memberId, memberUserId }: { memberId: string; memberUserId: string }) => {
      // Remove from library_members
      const { error: memberError } = await supabase
        .from('library_members')
        .delete()
        .eq('id', memberId)
        .eq('library_owner_id', user!.id);

      if (memberError) throw memberError;

      // Also remove the friendship
      const { error: friendshipError } = await supabase
        .from('friendships')
        .delete()
        .or(`and(user_id.eq.${user!.id},friend_id.eq.${memberUserId}),and(user_id.eq.${memberUserId},friend_id.eq.${user!.id})`);

      if (friendshipError) throw friendshipError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-members'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      toast({ title: 'Membro removido da biblioteca' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover membro',
        description: error.message,
      });
    },
  });

  return {
    members: membersQuery.data ?? [],
    isLoading: membersQuery.isLoading,
    isAdmin,
    promoteMember,
    demoteMember,
    removeMember,
  };
}
