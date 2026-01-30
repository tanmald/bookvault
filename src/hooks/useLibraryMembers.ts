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

  // Fetch members of the current user's library using single RPC query
  const membersQuery = useQuery({
    queryKey: ['library-members', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .rpc('get_library_members_with_profiles', { p_library_owner_id: user.id });

      if (error) throw error;

      return (data ?? []).map((m) => ({
        id: m.member_id,
        library_owner_id: user.id,
        user_id: m.user_id,
        role: m.role as LibraryRole,
        created_at: m.joined_at,
        invited_by: null,
        display_name: m.display_name,
        avatar_url: m.avatar_url,
        is_owner: m.user_id === user.id,
      })) as LibraryMember[];
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
