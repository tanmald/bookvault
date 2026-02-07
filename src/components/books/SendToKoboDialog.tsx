import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useShortUrl } from '@/hooks/useShortUrl';
import { Loader2, ExternalLink, Clock, Copy, RotateCcw, Link2 } from 'lucide-react';

interface SendToKoboDialogProps {
  isOpen: boolean;
  onClose: () => void;
  signedUrl: string | null;
  isLoading: boolean;
  bookTitle: string;
}

export function SendToKoboDialog({
  isOpen,
  onClose,
  signedUrl,
  isLoading,
  bookTitle,
}: SendToKoboDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { shortUrl, isLoading: isShortening, error, shortenUrl, retry } = useShortUrl();

  // Shorten URL when dialog opens and signedUrl is available
  useEffect(() => {
    if (isOpen && signedUrl && !shortUrl && !isShortening) {
      shortenUrl(signedUrl);
    }
  }, [isOpen, signedUrl, shortUrl, isShortening, shortenUrl]);

  // Reset when dialog closes
  useEffect(() => {
    if (!isOpen) {
      // The hook will reset on next open
    }
  }, [isOpen]);

  const handleCopyUrl = () => {
    const urlToCopy = shortUrl || signedUrl;
    if (urlToCopy) {
      navigator.clipboard.writeText(urlToCopy);
      toast({ title: t('kobo.copied') });
    }
  };

  const displayUrl = shortUrl || signedUrl;
  const isShortened = shortUrl && shortUrl !== signedUrl;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            {t('kobo.title')}
          </DialogTitle>
          <DialogDescription>{t('kobo.description').replace('{title}', bookTitle)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {isLoading || isShortening ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {isShortening ? t('kobo.shortening') : t('kobo.generating')}
              </p>
            </div>
          ) : displayUrl ? (
            <>
              {/* Short URL */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('kobo.directUrl')}</Label>
                <div className="flex gap-2">
                  <Input 
                    value={displayUrl} 
                    readOnly 
                    className={`text-xs font-mono ${isShortened ? 'text-green-600 dark:text-green-400' : ''}`}
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleCopyUrl}
                    title={t('kobo.copy')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {isShortened && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {t('kobo.shortened')}
                  </p>
                )}
              </div>

              {/* Retry button if there was an error */}
              {error && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-destructive">
                    {t('kobo.shortenError')}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={retry}
                    className="w-fit"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {t('kobo.retry')}
                  </Button>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  {t('kobo.instructionsTitle')}
                </h4>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>{t('kobo.step1')}</li>
                  <li>{t('kobo.step2')}</li>
                  <li>{t('kobo.step3')}</li>
                </ol>
              </div>

              {/* Expiry notice */}
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{t('kobo.expiryNotice')}</span>
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
