import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { BookOpen, Link2, Loader2, Library } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function OnboardingChoice() {
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';
  
  const [libraryChoice, setLibraryChoice] = useState<'new' | 'join'>(initialCode ? 'join' : 'new');
  const [inviteCode, setInviteCode] = useState(initialCode);
  const [isLoading, setIsLoading] = useState(false);
  
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleContinue = async () => {
    if (libraryChoice === 'new') {
      toast({
        title: t('onboarding.welcomeToast'),
        description: t('onboarding.welcomeDesc'),
      });
      navigate('/');
      return;
    }

    // Join existing library
    if (!inviteCode.trim()) {
      toast({
        variant: 'destructive',
        title: t('onboarding.codeMissing'),
        description: t('onboarding.codeMissingDesc'),
      });
      return;
    }

    if (!user) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('onboarding.sessionError'),
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('[use_invite_link] Calling RPC with:', {
        invite_code: inviteCode.trim(),
        joining_user_id: user.id,
      });

      const { data, error } = await supabase.rpc('use_invite_link', {
        invite_code: inviteCode.trim(),
        joining_user_id: user.id,
      });

      console.log('[use_invite_link] RPC returned:', { data, error });

      if (error) {
        console.error('[use_invite_link] RPC Error:', error);
        throw error;
      }

      const result = data?.[0];
      console.log('[use_invite_link] Result:', result);

      if (!result?.success) {
        console.error('[use_invite_link] Failed:', result?.error_message);
        toast({
          variant: 'destructive',
          title: t('onboarding.invalidCode'),
          description: result?.error_message || t('onboarding.invalidCodeDesc'),
        });
        setIsLoading(false);
        return;
      }

      console.log('[use_invite_link] Success!');


      toast({
        title: t('onboarding.joinedLibrary'),
        description: t('onboarding.joinedLibraryDesc'),
      });
      navigate('/friends');
    } catch (error) {
      console.error('Error using invite:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('onboarding.error'),
      });
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex items-center gap-2">
            <BookOpen className="h-10 w-10 text-accent" />
            <span className="text-3xl font-semibold tracking-tight">BookVault</span>
          </div>
          <p className="text-muted-foreground">{t('onboarding.chooseOption')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('onboarding.chooseOptionTitle')}</CardTitle>
            <CardDescription>
              {t('onboarding.chooseOptionDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup
              value={libraryChoice}
              onValueChange={(value) => setLibraryChoice(value as 'new' | 'join')}
              className="space-y-3"
            >
              <div>
                <Label
                  htmlFor="new"
                  className={`flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
                    libraryChoice === 'new' ? 'border-primary bg-muted/30' : 'border-border'
                  }`}
                >
                  <RadioGroupItem value="new" id="new" className="mt-1" />
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
                    libraryChoice === 'join' ? 'border-primary bg-muted/30' : 'border-border'
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

            {libraryChoice === 'join' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <Label htmlFor="inviteCode">{t('onboarding.inviteCode')}</Label>
                <Input
                  id="inviteCode"
                  type="text"
                  placeholder={t('onboarding.inviteCodePlaceholder')}
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="font-mono tracking-wider"
                  style={{ textTransform: 'none' }}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  inputMode="text"
                  data-form-type="other"
                  data-lpignore="true"
                />
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={handleContinue} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('onboarding.joining')}
                  </>
                ) : (
                  t('onboarding.continue')
                )}
              </Button>
              <Button variant="ghost" onClick={handleSkip} disabled={isLoading} className="w-full">
                {t('onboarding.skip')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
