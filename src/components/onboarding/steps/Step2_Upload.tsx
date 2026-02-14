import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

interface Step2_UploadProps {
  libraryId: string | null;
  onDemoBookCreated: () => void;
  createDemoBook?: (libraryId: string) => Promise<any>;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function Step2_Upload({
  libraryId,
  onDemoBookCreated,
  isLoading,
  setIsLoading,
}: Step2_UploadProps) {
  const { t, language } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">{t('onboarding.step2Title')}</h2>
        <p className="text-muted-foreground">{t('onboarding.addFirstBook')}</p>
      </div>

      <Card className="max-w-xs mx-auto">
        <div className="aspect-[2/3] relative bg-muted">
          <img
            src="https://covers.openlibrary.org/b/id/8380863-M.jpg"
            alt="The Time Machine"
            className="w-full h-full object-cover"
          />
        </div>
        <CardContent className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold">{t('onboarding.demoBookTitle')}</h3>
            <p className="text-sm text-muted-foreground">{t('onboarding.demoBookAuthor')}</p>
          </div>
          <div className="p-3 bg-primary/5 rounded-lg text-xs space-y-1">
            <p className="font-medium">📚 {language === 'pt' ? 'Partilha com amigos:' : 'Share with friends:'}</p>
            <p>• {language === 'pt' ? 'Vê o progresso de leitura' : 'See reading progress'}</p>
            <p>• {language === 'pt' ? 'Compete no scoreboard' : 'Compete on the scoreboard'}</p>
            <p>• {language === 'pt' ? 'Lê em conjunto' : 'Read together'}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg">
        <Sparkles className="h-5 w-5 text-primary mt-0.5" />
        <div>
          <p className="text-sm font-medium">{t('onboarding.aiExtraction')}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {language === 'pt'
              ? 'O BookVault identifica automaticamente o livro para que possas partilhar o teu progresso com amigos.'
              : 'BookVault automatically identifies the book so you can share your progress with friends.'}
          </p>
        </div>
      </div>

      <Button onClick={onDemoBookCreated} className="w-full">
        {t('onboarding.continue')}
      </Button>
    </div>
  );
}
