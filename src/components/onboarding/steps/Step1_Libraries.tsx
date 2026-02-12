import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLibraries } from '@/hooks/useLibraries';
import { useLibrary } from '@/contexts/LibraryContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Library, Link2, Loader2, Check, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'react-router-dom';

interface Step1_LibrariesProps {
  onLibraryCreated: (libraryId: string) => void;
  onContinue: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  isInviteMode?: boolean;
}

type Choice = 'create' | 'join';

export function Step1_Libraries({
  onLibraryCreated,
  onContinue,
  isLoading,
  setIsLoading,
  isInviteMode = false,
}: Step1_LibrariesProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const { createLibrary } = useLibraries();
  const { setCurrentLibrary } = useLibrary();
  const [searchParams] = useSearchParams();

  const [choice, setChoice] = useState<Choice>('create');
  const [libraryName, setLibraryName] = useState('');
  const [libraryDesc, setLibraryDesc] = useState('');
  const [inviteCode, setInviteCode] = useState(searchParams.get('code') || '');
  const [inviterName, setInviterName] = useState<string | null>(null);
  const [inviteChecked, setInviteChecked] = useState(false);

  // Check invite code on mount if present
  useEffect(() => {
    const checkInvite = async () => {
      if (!inviteCode) return;

      try {
        const { data, error } = await supabase
          .from('invite_links')
          .select(`
            *,
            owner:profiles!owner_id(display_name)
          `)
          .eq('code', inviteCode)
          .eq('is_active', true)
          .single();

        if (error || !data) {
          setInviteChecked(true);
          return;
        }

        // Check if expired
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setInviteChecked(true);
          return;
        }

        // Check max uses
        if (data.max_uses && data.uses_count >= data.max_uses) {
          setInviteChecked(true);
          return;
        }

        setInviterName(data.owner?.display_name || null);
        setChoice('join');
        setInviteChecked(true);
      } catch (err) {
        console.error('Error checking invite:', err);
        setInviteChecked(true);
      }
    };

    checkInvite();
  }, [inviteCode]);

  const handleContinue = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      if (choice === 'create') {
        if (!libraryName.trim()) {
          toast({
            variant: 'destructive',
            title: t('libraries.name'),
            description: 'Library name is required',
          });
          setIsLoading(false);
          return;
        }

        const result = await createLibrary.mutateAsync({
          name: libraryName.trim(),
          description: libraryDesc.trim() || undefined,
        });

        if (result) {
          setCurrentLibrary(result);
          toast({
            title: t('onboarding.libraryCreated'),
          });
          onLibraryCreated(result.id);
          onContinue();
        }
      } else {
        if (!inviteCode.trim()) {
          toast({
            variant: 'destructive',
            title: t('onboarding.inviteCode'),
            description: 'Invite code is required',
          });
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.rpc('use_invite_link', {
          invite_code: inviteCode.trim(),
          joining_user_id: user.id,
        });

        if (error) throw error;

        const result = data?.[0];
        if (!result?.success) {
          toast({
            variant: 'destructive',
            title: t('onboarding.invalidCode'),
            description: result?.error_message || t('onboarding.invalidCodeDesc'),
          });
          setIsLoading(false);
          return;
        }

        toast({
          title: t('onboarding.libraryJoined'),
        });
        onLibraryCreated(result.library_id);
        onContinue();
      }
    } catch (error) {
      console.error('Error in step 1:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: 'An error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Invite mode: show simplified UI
  if (isInviteMode && choice === 'join' && inviterName) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">
            {language === 'pt' ? 'Juntar-te a uma Biblioteca' : 'Join a Library'}
          </h2>
          <p className="text-muted-foreground">
            {language === 'pt'
              ? `Vais juntar-te à biblioteca de ${inviterName}`
              : `You're about to join ${inviterName}'s library`}
          </p>
        </div>

        <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
          <div className="flex items-center gap-3">
            <UserPlus className="h-5 w-5 text-primary" />
            <p className="text-sm">
              {language === 'pt'
                ? `Depois de confirmar, vais poder ver os livros da biblioteca de ${inviterName} e partilhar os teus progressos de leitura.`
                : `After confirming, you'll be able to see ${inviterName}'s books and share your reading progress.`}
            </p>
          </div>
        </div>

        <Button onClick={handleContinue} disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {language === 'pt' ? 'A confirmar...' : 'Confirming...'}
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              {language === 'pt' ? 'Confirmar e Continuar' : 'Confirm and Continue'}
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">{t('onboarding.step1Title')}</h2>
        <p className="text-muted-foreground">{t('onboarding.howToStart')}</p>
      </div>

      <RadioGroup
        value={choice}
        onValueChange={(value) => setChoice(value as Choice)}
        className="space-y-4"
      >
        <div>
          <Label
            htmlFor="create"
            className={`flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
              choice === 'create' ? 'border-primary bg-muted/30' : 'border-border'
            }`}
          >
            <RadioGroupItem value="create" id="create" className="mt-1" />
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <Library className="h-5 w-5 text-primary" />
                <span className="font-medium">{t('onboarding.createLibrary')}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('onboarding.createLibraryDesc')}
              </p>
            </div>
          </Label>
        </div>

        <div>
          <Label
            htmlFor="join"
            className={`flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
              choice === 'join' ? 'border-primary bg-muted/30' : 'border-border'
            }`}
          >
            <RadioGroupItem value="join" id="join" className="mt-1" />
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary" />
                <span className="font-medium">{t('onboarding.joinLibrary')}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('onboarding.joinLibraryDesc')}
              </p>
            </div>
          </Label>
        </div>
      </RadioGroup>

      {choice === 'create' ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="space-y-2">
            <Label htmlFor="libraryName">{t('onboarding.libraryName')}</Label>
            <Input
              id="libraryName"
              placeholder={t('onboarding.libraryNamePlaceholder')}
              value={libraryName}
              onChange={(e) => setLibraryName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="libraryDesc">{t('onboarding.libraryDesc')}</Label>
            <Textarea
              id="libraryDesc"
              placeholder={t('onboarding.libraryDescPlaceholder')}
              value={libraryDesc}
              onChange={(e) => setLibraryDesc(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
          <Label htmlFor="inviteCode">{t('onboarding.inviteCode')}</Label>
          <Input
            id="inviteCode"
            placeholder={t('onboarding.inviteCodePlaceholder')}
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            className="font-mono tracking-wider"
          />
        </div>
      )}

      <Button onClick={handleContinue} disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {choice === 'create'
              ? t('onboarding.creatingLibrary')
              : t('onboarding.joiningLibrary')}
          </>
        ) : (
          t('onboarding.continue')
        )}
      </Button>
    </div>
  );
}
