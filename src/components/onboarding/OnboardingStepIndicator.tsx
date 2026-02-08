import { cn } from '@/lib/utils';

interface OnboardingStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function OnboardingStepIndicator({
  currentStep,
  totalSteps,
}: OnboardingStepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
        <div
          key={step}
          className={cn(
            'h-2 w-2 rounded-full transition-all duration-300',
            step === currentStep
              ? 'w-8 bg-primary'
              : step < currentStep
              ? 'bg-primary/60'
              : 'bg-muted'
          )}
        />
      ))}
    </div>
  );
}
