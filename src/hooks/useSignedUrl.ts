import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SignedUrlParams {
  filePath: string;
  expiresIn?: number;
}

export function useSignedUrl() {
  return useMutation({
    mutationFn: async ({ filePath, expiresIn = 60 }: SignedUrlParams) => {
      // Extract the path from the full URL if a full URL is passed
      const url = new URL(filePath);
      const pathMatch = url.pathname.match(/\/books\/(.+)$/);
      const path = pathMatch ? pathMatch[1] : filePath;

      const { data, error } = await supabase.storage
        .from('books')
        .createSignedUrl(path, expiresIn);

      if (error) throw error;
      return data.signedUrl;
    },
  });
}
