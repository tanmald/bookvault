import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLibrary } from '@/contexts/LibraryContext';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import posthog from '@/lib/posthog';

interface CreateLibraryInput {
  name: string;
  description?: string;
  is_public?: boolean;
  allow_member_uploads?: boolean;
}

export function useLibraries() {
  const { user } = useAuth();
  const { refetch } = useLibrary();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  const createLibrary = useMutation({
    mutationFn: async (input: CreateLibraryInput) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('libraries')
        .insert({
          name: input.name,
          description: input.description,
          created_by: user.id,
          is_public: input.is_public || false,
          allow_member_uploads: input.allow_member_uploads || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['libraries'] });
      posthog.capture('library created', {
        library_id: data.id,
        library_name: data.name,
        is_public: data.is_public,
        allow_member_uploads: data.allow_member_uploads,
      });
    },
  });

  const updateLibrary = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateLibraryInput> }) => {
      const { error } = await supabase
        .from('libraries')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      toast({
        title: t('toast.libraries.updated'),
        description: t('toast.libraries.updatedDesc'),
      });
    },
  });

  const deleteLibrary = useMutation({
    mutationFn: async (id: string) => {
      // Check for books first
      const { count } = await supabase
        .from('books')
        .select('id', { count: 'exact', head: true })
        .eq('library_id', id);

      if (count && count > 0) {
        throw new Error(t('toast.libraries.cannotDeleteWithBooks'));
      }

      const { error } = await supabase
        .from('libraries')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      toast({
        title: t('toast.libraries.deleted'),
        description: t('toast.libraries.deletedDesc'),
      });
    },
    onError: (error) => {
      toast({
        title: t('toast.common.error'),
        description: error instanceof Error ? error.message : t('toast.libraries.deleteErrorGeneric'),
        variant: 'destructive',
      });
    },
  });

  return {
    createLibrary,
    updateLibrary,
    deleteLibrary,
  };
}
