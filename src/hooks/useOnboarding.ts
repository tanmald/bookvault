import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface OnboardingState {
  currentStep: number;
  totalSteps: number;
  hasCompletedOnboarding: boolean;
  canResume: boolean;
  isLoading: boolean;
  invitedLibraryId: string | null;
  invitedLibraryName: string | null;
  inviterName: string | null;
  isInviteMode: boolean;
}

export function useOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [state, setState] = useState<OnboardingState>({
    currentStep: 0,
    totalSteps: 4,
    hasCompletedOnboarding: true,
    canResume: false,
    isLoading: true,
    invitedLibraryId: null,
    invitedLibraryName: null,
    inviterName: null,
    isInviteMode: false,
  });

  useEffect(() => {
    if (!user) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const fetchOnboardingStatus = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('has_completed_onboarding, onboarding_step, demo_book_created')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.log('Profile not found, creating one...', error.message);
        
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            has_completed_onboarding: false,
            onboarding_step: 1,
            demo_book_created: false,
          })
          .select('has_completed_onboarding, onboarding_step, demo_book_created')
          .single();

        if (insertError) {
          console.error('Error creating profile:', insertError);
          setState({
            currentStep: 1,
            totalSteps: 4,
            hasCompletedOnboarding: false,
            canResume: false,
            isLoading: false,
            invitedLibraryId: null,
            invitedLibraryName: null,
            inviterName: null,
            isInviteMode: false,
          });
          return;
        }

        setState({
          currentStep: newProfile.onboarding_step || 1,
          totalSteps: 4,
          hasCompletedOnboarding: newProfile.has_completed_onboarding,
          canResume: false,
          isLoading: false,
          invitedLibraryId: null,
          invitedLibraryName: null,
          inviterName: null,
          isInviteMode: false,
        });
        return;
      }

      setState({
        currentStep: data.onboarding_step || 1,
        totalSteps: 4,
        hasCompletedOnboarding: data.has_completed_onboarding,
        canResume: !data.has_completed_onboarding && (data.onboarding_step || 0) > 0,
        isLoading: false,
        invitedLibraryId: null,
        invitedLibraryName: null,
        inviterName: null,
        isInviteMode: false,
      });
    };

    fetchOnboardingStatus();
  }, [user?.id]);

  const updateStep = useCallback(async (step: number) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ onboarding_step: step })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating onboarding step:', error);
    }

    setState(prev => ({ ...prev, currentStep: step }));
  }, [user?.id]);

  const completeOnboarding = useCallback(async () => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        has_completed_onboarding: true,
        onboarding_step: 0,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error completing onboarding:', error);
      toast({
        variant: 'destructive',
        title: t('toast.common.error'),
        description: t('toast.onboarding.completeError'),
      });
      return;
    }

    setState(prev => ({
      ...prev,
      hasCompletedOnboarding: true,
      currentStep: 0,
    }));

    navigate('/', { replace: true });
  }, [user, navigate, toast, t]);

  const skipOnboarding = useCallback(async () => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        has_completed_onboarding: true,
        onboarding_step: 0,
      })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error skipping onboarding:', error);
      return;
    }

    setState(prev => ({
      ...prev,
      hasCompletedOnboarding: true,
      currentStep: 0,
    }));

    navigate('/', { replace: true });
  }, [user, navigate]);

  const shouldRedirectToOnboarding = useCallback(() => {
    return !state.isLoading && !state.hasCompletedOnboarding && state.currentStep > 0;
  }, [state]);

  const joinLibrary = useCallback(async (inviteCode: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase.rpc('use_invite_link', {
        invite_code: inviteCode,
        joining_user_id: user.id,
      });

      if (error) throw error;

      const result = data?.[0];
      if (!result?.success) {
        throw new Error(result?.error_message || 'Failed to join library');
      }

      // Fetch library and inviter info
      const { data: inviteData } = await supabase
        .from('invite_links')
        .select(`
          *,
          library:libraries(name),
          owner:profiles!owner_id(display_name)
        `)
        .eq('code', inviteCode)
        .single();

      const libraryName = inviteData?.library?.name || null;
      const inviterName = inviteData?.owner?.display_name || null;

      setState(prev => ({
        ...prev,
        invitedLibraryId: result.library_id,
        invitedLibraryName: libraryName,
        inviterName: inviterName,
        isInviteMode: true,
      }));

      return result;
    } catch (error) {
      console.error('Error joining library:', error);
      toast({
        variant: 'destructive',
        title: t('toast.common.error'),
        description: t('toast.onboarding.joinError'),
      });
      return null;
    }
  }, [user, toast, t]);

  const createDemoBook = useCallback(async (libraryId: string) => {
    if (!user) return null;

    try {
      const { data: demoBook, error: demoError } = await supabase
        .from('demo_books')
        .select('*')
        .eq('is_active', true)
        .single();

      if (demoError || !demoBook) {
        throw new Error('Demo book not found');
      }

      const { data: book, error: bookError } = await supabase
        .from('books')
        .insert({
          owner_id: user.id,
          library_id: libraryId,
          title: demoBook.title,
          author: demoBook.author,
          description: demoBook.description,
          cover_url: demoBook.cover_url,
          file_url: demoBook.file_url,
          file_type: demoBook.file_type,
          file_size: demoBook.file_size,
        })
        .select()
        .single();

      if (bookError) throw bookError;

      const { error: fileError } = await supabase
        .from('book_files')
        .insert({
          book_id: book.id,
          language: demoBook.language,
          file_url: demoBook.file_url,
          file_type: demoBook.file_type,
          file_size: demoBook.file_size,
        });

      if (fileError) throw fileError;

      const { error: progressError } = await supabase
        .from('reading_progress')
        .insert({
          user_id: user.id,
          book_id: book.id,
          status: 'to_read',
          progress: 0,
        });

      if (progressError) throw progressError;

      await supabase
        .from('profiles')
        .update({ demo_book_created: true })
        .eq('user_id', user.id);

      return book;
    } catch (error) {
      console.error('Error creating demo book:', error);
      toast({
        variant: 'destructive',
        title: t('toast.common.error'),
        description: t('toast.onboarding.demoBookError'),
      });
      return null;
    }
  }, [user, toast, t]);

  return {
    ...state,
    updateStep,
    completeOnboarding,
    skipOnboarding,
    shouldRedirectToOnboarding,
    createDemoBook,
    joinLibrary,
  };
}
