import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Loader2, Check, X, Upload, X as XIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

export default function Register() {
  const [searchParams] = useSearchParams();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user, loading, signUp } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const validation = useMemo(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return {
      nameValid: displayName.trim().length >= 2,
      emailValid: emailRegex.test(email),
      passwordValid: password.length >= 8,
      passwordsMatch: password === confirmPassword && confirmPassword.length > 0,
    };
  }, [displayName, email, password, confirmPassword]);

  const isFormValid =
    validation.nameValid &&
    validation.emailValid &&
    validation.passwordValid &&
    validation.passwordsMatch;

  useEffect(() => {
    if (!loading && user) {
      const code = searchParams.get('code');
      navigate(code ? `/onboarding?code=${code}` : '/onboarding', { replace: true });
    }
  }, [user, loading, navigate, searchParams]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          variant: 'destructive',
          title: t('common.error'),
          description: t('auth.invalidImage'),
        });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: t('common.error'),
          description: t('auth.imageTooLarge'),
        });
        return;
      }
      setAvatarFile(file);
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
    }
  };

  const handleRemoveAvatar = () => {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadAvatar = async (userId: string, file: File): Promise<string | null> => {
    setIsUploadingAvatar(true);
    try {
      const reader = new FileReader();
      const blob = await new Promise<Blob>((resolve, reject) => {
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxSize = 512;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > maxSize) {
                height = Math.round((height * maxSize) / width);
                width = maxSize;
              }
            } else {
              if (height > maxSize) {
                width = Math.round((width * maxSize) / height);
                height = maxSize;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, 0, 0, width, height);
              canvas.toBlob((b) => {
                if (b) resolve(b);
                else reject(new Error('Failed to compress image'));
              }, 'image/jpeg', 0.85);
            } else {
              reject(new Error('Failed to get canvas context'));
            }
          };
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = reader.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      const compressedFile = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });

      const { data: existingFiles } = await supabase.storage.from('avatars').list(userId);
      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(f => `${userId}/${f.name}`);
        await supabase.storage.from('avatars').remove(filesToDelete);
      }

      const filePath = `${userId}/${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, compressedFile, { upsert: true, contentType: 'image/jpeg' });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      return publicUrlData.publicUrl;
    } catch (err) {
      console.error('Avatar upload error:', err);
      return null;
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('auth.passwordMismatch'),
      });
      return;
    }

    if (password.length < 8) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('auth.passwordTooShort'),
      });
      return;
    }

    setIsLoading(true);

    const { userId, error } = await signUp(email, password, displayName);

    if (error || !userId) {
      toast({
        variant: 'destructive',
        title: t('auth.registerError'),
        description: error?.message || 'Failed to create account',
      });
      setIsLoading(false);
      return;
    }

    let avatarUrl: string | null = null;

    if (avatarFile) {
      avatarUrl = await uploadAvatar(userId, avatarFile);
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      user_id: userId,
      display_name: displayName.trim(),
      avatar_url: avatarUrl,
    });

    if (profileError) {
      console.error('Failed to create profile:', profileError);
    }

    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    toast({
      title: t('auth.accountCreated'),
      description: t('auth.accountCreatedDesc'),
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex items-center gap-2">
            <BookOpen className="h-10 w-10 text-accent" />
            <span className="text-3xl font-semibold tracking-tight">BookVault</span>
          </div>
          <p className="text-muted-foreground">{t('auth.createDigitalLibrary')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('auth.registerTitle')}</CardTitle>
            <CardDescription>{t('auth.registerDesc')}</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  {avatarPreview ? (
                    <div className="relative">
                      <img
                        src={avatarPreview}
                        alt="Avatar preview"
                        className="h-24 w-24 rounded-full object-cover ring-2 ring-primary/20"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-white hover:bg-destructive/90 transition-colors"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarSelect}
                    accept="image/*"
                    className="hidden"
                    id="avatar-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || isUploadingAvatar}
                  >
                    {avatarPreview ? t('profile.changePhoto') : t('profile.addPhoto')}
                  </Button>
                  {avatarPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveAvatar}
                      disabled={isLoading || isUploadingAvatar}
                    >
                      {t('profile.removePhoto')}
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">{t('auth.name')}</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder={t('auth.namePlaceholder')}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <p className={`text-xs ${password.length >= 8 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                  {t('auth.passwordRequirements')} {password.length > 0 && `(${password.length}/8)`}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className={cn(
                      confirmPassword.length > 0 && (
                        validation.passwordsMatch
                          ? 'border-green-500 focus-visible:ring-green-500'
                          : 'border-destructive focus-visible:ring-destructive'
                      )
                    )}
                  />
                  {confirmPassword.length > 0 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {validation.passwordsMatch ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  )}
                </div>
                {confirmPassword.length > 0 && !validation.passwordsMatch && (
                  <p className="text-xs text-destructive">{t('auth.passwordMismatch')}</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isLoading || !isFormValid}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('auth.registering')}
                  </>
                ) : (
                  t('auth.createAccount')
                )}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                {t('auth.hasAccount')}{' '}
                <Link to="/login" className="font-medium text-primary hover:underline">
                  {t('auth.login')}
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
