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
            <p className="font-medium">✨ {language === 'pt' ? 'O BookVault extrai automaticamente:' : 'BookVault automatically extracts:'}</p>
            <p>• {language === 'pt' ? 'Título e Autor' : 'Title & Author'}</p>
            <p>• {language === 'pt' ? 'Género e Idioma' : 'Genre & Language'}</p>
            <p>• {language === 'pt' ? 'Capa do livro' : 'Book cover'}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg">
        <Sparkles className="h-5 w-5 text-primary mt-0.5" />
        <div>
          <p className="text-sm font-medium">{t('onboarding.aiExtraction')}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {language === 'pt'
              ? 'Quando carregares os teus próprios livros, vais ver como é fácil organizar a tua biblioteca.'
              : 'When you upload your own books, you will see how easy it is to organize your library.'}
          </p>
        </div>
      </div>

      <Button onClick={onDemoBookCreated} className="w-full">
        {t('onboarding.continue')}
      </Button>
    </div>
  );
}
