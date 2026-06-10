import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from 'next-themes';
import { useProfile } from '@/hooks/useProfile';
import { useKanbanSize } from '@/hooks/useKanbanSize';
import { useAvatarUpload } from '@/hooks/useAvatarUpload';
import { useBooks } from '@/hooks/useBooks';
import { useReadingProgress } from '@/hooks/useReadingProgress';
import { Loader2, Save, BookOpen, BookMarked, Check, Globe, Sun, Moon, Monitor, Camera, X, Columns3, LayoutList, Clock, Flame } from 'lucide-react';
import type { Language } from '@/lib/i18n/translations';
import { LibraryManagementCard } from '@/components/library/LibraryManagementCard';
import { ReadingGoalCard } from '@/components/goals/ReadingGoalCard';
import { ReadingSessionDialog } from '@/components/sessions/ReadingSessionDialog';
import { ReadingWrappedCard } from '@/components/wrapped/ReadingWrappedCard';
import { useReadingSessions } from '@/hooks/useReadingSessions';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function Profile() {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { kanbanSize, setKanbanSize } = useKanbanSize();
  const navigate = useNavigate();
  const { profile, isLoading, updateProfile } = useProfile();
  const { books } = useBooks();
  const { progress } = useReadingProgress();
  const { todaySession, weeklyTotal, streak } = useReadingSessions();
  const { uploadAvatar, isUploading: isUploadingAvatar } = useAvatarUpload();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
      });
    }
  }, [profile]);

  const handleSave = () => {
    updateProfile.mutate(
      { display_name: formData.display_name.trim() || null, bio: formData.bio.trim() || null },
      { onSuccess: () => navigate('/') }
    );
  };

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);

    const avatarUrl = await uploadAvatar(file);
    if (avatarUrl) {
      await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('user_id', user!.id);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } else {
      setAvatarPreview(null);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!profile?.avatar_url) return;

    await supabase.from('profiles').update({ avatar_url: null }).eq('user_id', user!.id);
    queryClient.invalidateQueries({ queryKey: ['profile'] });
    setAvatarPreview(null);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Stats
  const totalBooks = books.length;
  const booksReading = progress.filter((p) => p.status === 'reading').length;
  const booksRead = progress.filter((p) => p.status === 'read').length;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-1">{t('profile.title')}</h1>
          <p className="text-muted-foreground">
            {t('profile.subtitle')}
          </p>
        </div>

        <ReadingGoalCard />

        {/* Reading Sessions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              {t('sessions.title')}
            </CardTitle>
            <CardDescription>
              {t('sessions.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-semibold">
                  {todaySession ? `${todaySession.duration_minutes}` : '0'}
                </div>
                <div className="text-sm text-muted-foreground">{t('sessions.minToday')}</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-semibold">{weeklyTotal}</div>
                <div className="text-sm text-muted-foreground">{t('sessions.minWeek')}</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-semibold flex items-center justify-center gap-1">
                  <Flame className="h-5 w-5 text-orange-500" />
                  {streak}
                </div>
                <div className="text-sm text-muted-foreground">{t('sessions.daysStreak')}</div>
              </div>
            </div>
            <ReadingSessionDialog>
              <Button className="w-full">
                <Clock className="h-4 w-4 mr-2" />
                {t('sessions.logButton')}
              </Button>
            </ReadingSessionDialog>
          </CardContent>
        </Card>

        <ReadingWrappedCard />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <BookOpen className="h-8 w-8 text-accent mb-2" />
              <span className="text-2xl font-semibold">{totalBooks}</span>
              <span className="text-sm text-muted-foreground">{t('profile.books')}</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <BookMarked className="h-8 w-8 text-accent mb-2" />
              <span className="text-2xl font-semibold">{booksReading}</span>
              <span className="text-sm text-muted-foreground">{t('profile.reading')}</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <Check className="h-8 w-8 text-accent mb-2" />
              <span className="text-2xl font-semibold">{booksRead}</span>
              <span className="text-sm text-muted-foreground">{t('profile.readBooks')}</span>
            </CardContent>
          </Card>
        </div>

        {/* Library Management */}
        <LibraryManagementCard />

        {/* Settings Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t('settings.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Language */}
            <div className="space-y-3">
              <Label>{t('settings.language')}</Label>
              <p className="text-sm text-muted-foreground">{t('settings.languageDesc')}</p>
              <RadioGroup
                value={language}
                onValueChange={(value) => setLanguage(value as Language)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pt" id="lang-pt" />
                  <Label htmlFor="lang-pt" className="cursor-pointer font-normal">
                    Português
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="en" id="lang-en" />
                  <Label htmlFor="lang-en" className="cursor-pointer font-normal">
                    English
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Theme */}
            <div className="space-y-3">
              <Label>{t('settings.theme')}</Label>
              <p className="text-sm text-muted-foreground">{t('settings.themeDesc')}</p>
              <RadioGroup
                value={theme}
                onValueChange={setTheme}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="light" id="theme-light" />
                  <Label htmlFor="theme-light" className="cursor-pointer font-normal flex items-center gap-1">
                    <Sun className="h-4 w-4" />
                    {t('settings.themeLight')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="dark" id="theme-dark" />
                  <Label htmlFor="theme-dark" className="cursor-pointer font-normal flex items-center gap-1">
                    <Moon className="h-4 w-4" />
                    {t('settings.themeDark')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="system" id="theme-system" />
                  <Label htmlFor="theme-system" className="cursor-pointer font-normal flex items-center gap-1">
                    <Monitor className="h-4 w-4" />
                    {t('settings.themeSystem')}
                  </Label>
                </div>
              </RadioGroup>
            </div>


            {/* Kanban Size */}
            <div className="space-y-3">
              <Label>{t('settings.kanbanSize')}</Label>
              <p className="text-sm text-muted-foreground">{t('settings.kanbanSizeDesc')}</p>
              <RadioGroup
                value={kanbanSize}
                onValueChange={(value) => setKanbanSize(value as 'large' | 'small')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="large" id="kanban-large" />
                  <Label htmlFor="kanban-large" className="cursor-pointer font-normal flex items-center gap-1">
                    <Columns3 className="h-4 w-4" />
                    {t('settings.kanbanSizeLarge')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="small" id="kanban-small" />
                  <Label htmlFor="kanban-small" className="cursor-pointer font-normal flex items-center gap-1">
                    <LayoutList className="h-4 w-4" />
                    {t('settings.kanbanSizeSmall')}
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('profile.info')}</CardTitle>
            <CardDescription>
              {t('profile.infoDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Avatar className="h-20 w-20 mx-auto sm:mx-0">
                <AvatarImage src={avatarPreview || profile?.avatar_url || ''} />
                <AvatarFallback className="text-xl">
                  {formData.display_name?.substring(0, 2).toUpperCase() ||
                    user?.email?.substring(0, 2).toUpperCase() ||
                    'U'}
                </AvatarFallback>
              </Avatar>
              {isUploadingAvatar && (
                <div className="absolute left-1/2 top-10 -translate-x-1/2 sm:static sm:translate-x-0 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                </div>
              )}
              <div className="flex-1 text-center sm:text-left">
                <p className="font-medium break-all">{user?.email}</p>
                <p className="text-sm text-muted-foreground">
                  {t('profile.memberSince')}{' '}
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-US')
                    : '...'}
                </p>
              </div>
              <div className="flex flex-row sm:flex-col gap-2 items-center sm:items-end justify-center sm:justify-start">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={triggerFileInput}
                    disabled={isUploadingAvatar}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {profile?.avatar_url ? t('profile.changePhoto') : t('profile.addPhoto')}
                  </Button>
                  {profile?.avatar_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleRemoveAvatar}
                      disabled={isUploadingAvatar}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  JPG, PNG, WebP. Máx 5MB.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarSelect}
                className="hidden"
              />
            </div>
            <p className="text-xs text-muted-foreground sm:hidden text-center">
              JPG, PNG, WebP. Máx 5MB.
            </p>

            <div className="space-y-2">
              <Label htmlFor="display_name">{t('profile.name')}</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) =>
                  setFormData({ ...formData, display_name: e.target.value })
                }
                placeholder={t('profile.namePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">{t('profile.bio')}</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                placeholder={t('profile.bioPlaceholder')}
                rows={4}
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={updateProfile.isPending}
              className="w-full"
            >
              {updateProfile.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('profile.saving')}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t('profile.save')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
