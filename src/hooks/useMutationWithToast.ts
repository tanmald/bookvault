import { useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface ToastOptions {
  successTitle?: string;
  successDescription?: string;
  errorTitle?: string;
  /** If true, don't show toast on success (useful when handling success elsewhere) */
  skipSuccessToast?: boolean;
}

/**
 * A wrapper around useMutation that automatically shows toast notifications
 * for success and error states, reducing boilerplate in mutation hooks.
 */
export function useMutationWithToast<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: UseMutationOptions<TData, TError, TVariables, TContext> & {
    toast?: ToastOptions;
  }
): UseMutationResult<TData, TError, TVariables, TContext> {
  const { toast } = useToast();
  const { toast: toastOptions, onSuccess, onError, ...mutationOptions } = options;

  return useMutation({
    ...mutationOptions,
    onSuccess: (data, variables, context) => {
      if (!toastOptions?.skipSuccessToast && toastOptions?.successTitle) {
        toast({
          title: toastOptions.successTitle,
          description: toastOptions.successDescription,
        });
      }
      onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      toast({
        variant: 'destructive',
        title: toastOptions?.errorTitle ?? 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
      });
      onError?.(error, variables, context);
    },
  });
}
