import { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { OnboardingStepIndicator } from './OnboardingStepIndicator';
import { Step1_Libraries } from './steps/Step1_Libraries';
import { Step2_Upload } from './steps/Step2_Upload';
import { Step3_Friends } from './steps/Step3_Friends';
import { Step4_Downloads } from './steps/Step4_Downloads';
import { useSearchParams } from 'react-router-dom';

export function OnboardingWizard() {
  const { t, language } = useLanguage();
  const {
    currentStep,
    updateStep,
    completeOnboarding,
    skipOnboarding,
    isLoading,
    createDemoBook,
    joinLibrary,
    invitedLibraryId,
  } = useOnboarding();
  const [searchParams] = useSearchParams();

  const [libraryId, setLibraryId] = useState<string | null>(null);
  const [isStepLoading, setIsStepLoading] = useState(false);
  const inviteCode = searchParams.get('code');

  // Determine if we're in invite mode
  const isInviteMode = !!inviteCode && !!invitedLibraryId;
  
  // Total steps: 4 normally, 3 if skipping upload demo in invite mode
  const totalSteps = isInviteMode ? 3 : 4;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stepIndicator = language === 'pt'
    ? `Passo ${currentStep} de ${totalSteps}`
    : `Step ${currentStep} of ${totalSteps}`;

  const handleNext = async () => {
    const nextStep = currentStep + 1;
    // In invite mode, skip step 2 (upload demo)
    if (isInviteMode && nextStep === 2) {
      await updateStep(3); // Skip to step 3
    } else {
      await updateStep(nextStep);
    }
  };

  const handleBack = async () => {
    const prevStep = currentStep - 1;
    // In invite mode, going back from step 3 should go to step 1 (skipping 2)
    if (isInviteMode && prevStep === 2) {
      await updateStep(1);
    } else {
      await updateStep(prevStep);
    }
  };

  const handleFinish = async () => {
    setIsStepLoading(true);
    await completeOnboarding();
    setIsStepLoading(false);
  };

  const renderStep = () => {
    // In invite mode, step 2 is skipped, so we need to map:
    // UI Step 1 → Data Step 1 (Join/Create)
    // UI Step 2 → Data Step 3 (Friends)
    // UI Step 3 → Data Step 4 (Downloads)
    
    if (isInviteMode) {
      switch (currentStep) {
        case 1:
          return (
            <Step1_Libraries
              onLibraryCreated={setLibraryId}
              onContinue={handleNext}
              isLoading={isStepLoading}
              setIsLoading={setIsStepLoading}
              isInviteMode={true}
            />
          );
        case 2:
          return <Step3_Friends onContinue={handleNext} isInviteMode={true} />;
        case 3:
          return (
            <Step4_Downloads
              onFinish={handleFinish}
              isLoading={isStepLoading}
            />
          );
        default:
          return null;
      }
    }

    // Normal mode
    switch (currentStep) {
      case 1:
        return (
          <Step1_Libraries
            onLibraryCreated={setLibraryId}
            onContinue={handleNext}
            isLoading={isStepLoading}
            setIsLoading={setIsStepLoading}
            isInviteMode={false}
          />
        );
      case 2:
        return (
          <Step2_Upload
            libraryId={libraryId}
            onDemoBookCreated={handleNext}
            createDemoBook={createDemoBook}
            isLoading={isStepLoading}
            setIsLoading={setIsStepLoading}
          />
        );
      case 3:
        return <Step3_Friends onContinue={handleNext} isInviteMode={false} />;
      case 4:
        return (
          <Step4_Downloads
            onFinish={handleFinish}
            isLoading={isStepLoading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center w-full">
      <div className="w-full max-w-2xl space-y-8">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="flex items-center gap-2">
            <BookOpen className="h-10 w-10 text-accent" />
            <span className="text-3xl font-semibold tracking-tight">BookVault</span>
          </div>
          <h1 className="text-2xl font-bold">{t('onboarding.welcome')}</h1>
          <p className="text-muted-foreground">
            {stepIndicator}
          </p>
        </div>

        <OnboardingStepIndicator
          currentStep={currentStep}
          totalSteps={totalSteps}
        />

        <Card>
          <CardContent className="pt-6">
            {renderStep()}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 1 || isStepLoading}
          >
            {currentStep === 1 ? '' : t('onboarding.back')}
          </Button>

          {currentStep < totalSteps && (
            <Button variant="ghost" onClick={skipOnboarding}>
              {t('onboarding.skip')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
