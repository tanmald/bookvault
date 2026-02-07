import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
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
import { Loader2, ExternalLink, Clock, QrCode, Copy } from 'lucide-react';

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

  const handleCopyUrl = () => {
    if (signedUrl) {
      navigator.clipboard.writeText(signedUrl);
      toast({ title: t('kobo.copied') });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {t('kobo.title')}
          </DialogTitle>
          <DialogDescription>{t('kobo.description').replace('{title}', bookTitle)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t('kobo.generating')}</p>
            </div>
          ) : signedUrl ? (
            <>
              {/* QR Code */}
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 bg-white rounded-lg border">
                  <QRCodeSVG value={signedUrl} size={200} level="M" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  {t('kobo.scanInstructions')}
                </p>
              </div>

              {/* Direct URL */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('kobo.directUrl')}</Label>
                <div className="flex gap-2">
                  <Input value={signedUrl} readOnly className="text-xs font-mono" />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleCopyUrl}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

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
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{t('kobo.expiryNotice')}</span>
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
