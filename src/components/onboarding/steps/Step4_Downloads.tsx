import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, ExternalLink, Copy, BookCopy, PartyPopper, Loader2 } from 'lucide-react';

interface Step4_DownloadsProps {
  onFinish: () => void;
  isLoading: boolean;
}

export function Step4_Downloads({ onFinish, isLoading }: Step4_DownloadsProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">{t('onboarding.step4Title')}</h2>
        <p className="text-muted-foreground">{t('onboarding.downloadsDesc')}</p>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Download className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="font-medium">{t('onboarding.kindleDownload')}</p>
                <p className="text-xs text-muted-foreground">Direct EPUB/MOBI download</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Demo
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ExternalLink className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">{t('onboarding.koboUrl')}</p>
                <p className="text-xs text-muted-foreground">Generate short URL for Kobo browser</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <BookCopy className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">{t('onboarding.copyToLibrary')}</p>
                <p className="text-xs text-muted-foreground">{t('onboarding.copyToLibraryDesc')}</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="pt-4 border-t">
        <div className="text-center space-y-2 mb-6">
          <PartyPopper className="h-12 w-12 mx-auto text-yellow-500" />
          <h3 className="text-lg font-semibold">{t('onboarding.setupComplete')}</h3>
          <p className="text-muted-foreground">{t('onboarding.setupCompleteDesc')}</p>
        </div>

        <Button onClick={onFinish} disabled={isLoading} className="w-full" size="lg">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('onboarding.finish')}
            </>
          ) : (
            <>
              {t('onboarding.finish')}
              <Download className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
