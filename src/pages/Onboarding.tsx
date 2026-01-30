import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import OnboardingChoice from '@/components/auth/OnboardingChoice';

export default function Onboarding() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // If not authenticated and not loading, redirect to register
    if (!loading && !user) {
      const code = searchParams.get('code');
      navigate(code ? `/register?code=${code}` : '/register', { replace: true });
    }
  }, [user, loading, navigate, searchParams]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <OnboardingChoice />;
}
