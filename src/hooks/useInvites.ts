import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import posthog from '@/lib/posthog';

export interface InviteLink {
  id: string;
  owner_id: string;
  library_id: string;
  code: string;
  expires_at: string | null;
  max_uses: number | null;
  uses_count: number;
  is_active: boolean;
  created_at: string;
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function useInvites(libraryId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const invitesQuery = useQuery({
    queryKey: ['invites', libraryId],
    queryFn: async () => {
      if (!libraryId) return [];

      const { data, error } = await supabase
        .from('invite_links')
        .select('*')
        .eq('library_id', libraryId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as InviteLink[];
    },
    enabled: !!user && !!libraryId,
  });

  const createInvite = useMutation({
    mutationFn: async ({
      expiresInDays,
      maxUses,
    }: {
      expiresInDays?: number;
      maxUses?: number;
    }) => {
      if (!user || !user.id) {
        throw new Error('Você precisa estar autenticado para criar um convite');
      }

      if (!libraryId) throw new Error('No library selected');

      // Get the profile ID for the current user
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('Perfil do usuário não encontrado. Por favor, tente fazer login novamente.');
      }

      const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { data, error } = await supabase
        .from('invite_links')
        .insert({
          owner_id: profile.id,
          library_id: libraryId,
          code: generateCode(),
          expires_at: expiresAt,
          max_uses: maxUses || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as InviteLink;
    },
    onSuccess: (invite) => {
      queryClient.invalidateQueries({ queryKey: ['invites'] });
      toast({ title: 'Link de convite criado!' });
      posthog.capture('invite created', {
        invite_id: invite.id,
        library_id: invite.library_id,
        has_expiry: !!invite.expires_at,
        has_max_uses: !!invite.max_uses,
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar convite',
        description: error.message,
      });
    },
  });

  const deleteInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('invite_links')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites'] });
      toast({ title: 'Convite removido' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover convite',
        description: error.message,
      });
    },
  });

  return {
    invites: invitesQuery.data ?? [],
    isLoading: invitesQuery.isLoading,
    createInvite,
    deleteInvite,
  };
}
