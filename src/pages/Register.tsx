import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Loader2, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function Register() {
  const [searchParams] = useSearchParams();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { user, loading, signUp } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Real-time validation
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

  // If already authenticated, redirect to onboarding or home
  useEffect(() => {
    if (!loading && user) {
      const code = searchParams.get('code');
      // Redirect to onboarding with any invite code
      navigate(code ? `/onboarding?code=${code}` : '/onboarding', { replace: true });
    }
  }, [user, loading, navigate, searchParams]);

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

    const { error } = await signUp(email, password, displayName);

    if (error) {
      toast({
        variant: 'destructive',
        title: t('auth.registerError'),
        description: error.message,
      });
      setIsLoading(false);
    } else {
      toast({
        title: t('auth.accountCreated'),
        description: t('auth.accountCreatedDesc'),
      });
      // Redirect is handled by useEffect (lines 26-32) once user state updates
      // This prevents race condition where we navigate before authentication completes
    }
  };

  // Show loading while checking auth
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
