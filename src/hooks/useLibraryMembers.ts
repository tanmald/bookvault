import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type LibraryRole = Database['public']['Enums']['library_role'];

export interface LibraryMember {
  user_id: string;
  role: LibraryRole;
  created_at: string;
  // Profile data
  display_name: string | null;
  avatar_url: string | null;
}

export function useLibraryMembers(libraryId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch members of the specified library using single RPC query
  const membersQuery = useQuery({
    queryKey: ['library-members', libraryId],
    queryFn: async () => {
      if (!libraryId) return [];

      const { data, error } = await supabase
        .rpc('get_library_members_with_profiles', { p_library_id: libraryId });

      if (error) throw error;

      return (data ?? []) as LibraryMember[];
    },
    enabled: !!user && !!libraryId,
  });

  // Check if current user is admin of the library
  const isAdmin = membersQuery.data?.some(
    (m) => m.user_id === user?.id && m.role === 'admin'
  ) ?? false;

  // Promote member to admin
  const promoteMember = useMutation({
    mutationFn: async (memberUserId: string) => {
      if (!libraryId) throw new Error('No library selected');

      const { error } = await supabase
        .from('library_members')
        .update({ role: 'admin' as LibraryRole })
        .eq('library_id', libraryId)
        .eq('user_id', memberUserId);

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
    mutationFn: async (memberUserId: string) => {
      if (!libraryId) throw new Error('No library selected');

      const { error } = await supabase
        .from('library_members')
        .update({ role: 'member' as LibraryRole })
        .eq('library_id', libraryId)
        .eq('user_id', memberUserId);

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

  // Remove member from library
  const removeMember = useMutation({
    mutationFn: async (memberUserId: string) => {
      if (!libraryId) throw new Error('No library selected');

      // Remove from library_members
      const { error } = await supabase
        .from('library_members')
        .delete()
        .eq('library_id', libraryId)
        .eq('user_id', memberUserId);

      if (error) throw error;
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

  // Leave library (remove yourself)
  const leaveLibrary = useMutation({
    mutationFn: async () => {
      if (!libraryId || !user) throw new Error('No library or user');

      const { error } = await supabase
        .from('library_members')
        .delete()
        .eq('library_id', libraryId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-members'] });
      queryClient.invalidateQueries({ queryKey: ['libraries'] });
      toast({ title: 'Saíste da biblioteca' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao sair da biblioteca',
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
    leaveLibrary,
  };
}
