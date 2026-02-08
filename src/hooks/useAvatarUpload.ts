import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

interface AvatarUploadResult {
  uploadAvatar: (file: File) => Promise<string | null>;
  isUploading: boolean;
  progress: number;
  error: string | null;
}

export function useAvatarUpload(options: CompressionOptions = {}): AvatarUploadResult {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const compressImage = (file: File, opts: CompressionOptions): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const { maxWidth = 512, maxHeight = 512, quality = 0.85 } = opts;

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            'image/jpeg',
            quality
          );
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = event.target?.result as string;
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const uploadAvatar = async (file: File): Promise<string | null> => {
    if (!user) {
      setError('Utilizador não autenticado');
      return null;
    }

    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('O ficheiro deve ser uma imagem');
      }

      setProgress(25);
      const compressedBlob = await compressImage(file, options);
      
      const compressedFile = new File([compressedBlob], `${user.id}/avatar.jpg`, {
        type: 'image/jpeg',
      });

      setProgress(50);

      const { data: existingFiles } = await supabase
        .storage
        .from('avatars')
        .list(user.id);

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(f => `${user.id}/${f.name}`);
        await supabase.storage.from('avatars').remove(filesToDelete);
      }

      setProgress(75);

      const filePath = `${user.id}/${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase
        .storage
        .from('avatars')
        .upload(filePath, compressedFile, {
          upsert: true,
          contentType: 'image/jpeg',
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase
        .storage
        .from('avatars')
        .getPublicUrl(filePath);

      setProgress(100);
      return publicUrlData.publicUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao fazer upload da imagem';
      setError(errorMessage);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadAvatar, isUploading, progress, error };
}

export default useAvatarUpload;
