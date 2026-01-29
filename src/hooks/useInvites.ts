import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface InviteLink {
  id: string;
  owner_id: string;
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

export function useInvites() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const invitesQuery = useQuery({
    queryKey: ['invites', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invite_links')
        .select('*')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as InviteLink[];
    },
    enabled: !!user,
  });

  const createInvite = useMutation({
    mutationFn: async ({
      expiresInDays,
      maxUses,
    }: {
      expiresInDays?: number;
      maxUses?: number;
    }) => {
      const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { data, error } = await supabase
        .from('invite_links')
        .insert({
          owner_id: user!.id,
          code: generateCode(),
          expires_at: expiresAt,
          max_uses: maxUses || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as InviteLink;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites'] });
      toast({ title: 'Link de convite criado!' });
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
