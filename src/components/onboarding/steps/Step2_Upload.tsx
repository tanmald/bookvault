import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Sparkles, Loader2, Check, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  createDemoBook,
  isLoading,
  setIsLoading,
}: Step2_UploadProps) {
  const { t, language } = useLanguage();
  const [demoViewed, setDemoViewed] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleViewDemo = () => {
    setDemoViewed(true);
    setShowSuccess(true);
    setTimeout(() => {
      onDemoBookCreated();
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">{t('onboarding.step2Title')}</h2>
        <p className="text-muted-foreground">{t('onboarding.addFirstBook')}</p>
      </div>

      <Card className={cn(
        "overflow-hidden transition-all duration-500",
        showSuccess && "border-green-500 bg-green-50/10"
      )}>
        <div className="aspect-[2/3] relative bg-muted">
          <img
            src="https://covers.openlibrary.org/b/id/8380863-M.jpg"
            alt="The Time Machine"
            className="w-full h-full object-cover"
          />
          {showSuccess && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 animate-in fade-in">
              <div className="bg-green-500 rounded-full p-4 animate-in zoom-in duration-300">
                <Check className="h-10 w-10 text-white" />
              </div>
            </div>
          )}
        </div>
        <CardContent className="p-4 space-y-4">
          <div>
            <h3 className="font-semibold text-lg">{t('onboarding.demoBookTitle')}</h3>
            <p className="text-sm text-muted-foreground">{t('onboarding.demoBookAuthor')}</p>
            <p className="text-sm mt-2">{t('onboarding.demoBookDesc')}</p>
          </div>

          {demoViewed && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <Sparkles className="h-4 w-4" />
                <span>{t('onboarding.demoBookAdded')}</span>
              </div>
              <div className="p-3 bg-primary/5 rounded-lg text-xs space-y-1">
                <p className="font-medium">✨ {language === 'pt' ? 'O BookVault extraiu automaticamente:' : 'BookVault automatically extracted:'}</p>
                <p>• {language === 'pt' ? 'Título: The Time Machine' : 'Title: The Time Machine'}</p>
                <p>• {language === 'pt' ? 'Autor: H.G. Wells' : 'Author: H.G. Wells'}</p>
                <p>• {language === 'pt' ? 'Género: Ficção Científica' : 'Genre: Science Fiction'}</p>
                <p>• {language === 'pt' ? 'Idioma: Inglês' : 'Language: English'}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg">
        <Sparkles className="h-5 w-5 text-primary mt-0.5" />
        <div>
          <p className="text-sm font-medium">{t('onboarding.aiExtraction')}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {language === 'pt'
              ? 'Quando carregares os teus próprios livros, vamos extrair automaticamente título, autor, género e capa.'
              : 'When you upload your own books, we will automatically extract title, author, genre, and cover.'}
          </p>
        </div>
      </div>

      {!demoViewed ? (
        <Button
          onClick={handleViewDemo}
          disabled={!libraryId || isLoading}
          className="w-full"
        >
          <Eye className="mr-2 h-4 w-4" />
          {language === 'pt' ? 'Ver Demonstração' : 'View Demo'}
        </Button>
      ) : (
        <div className="text-center py-2">
          <p className="text-green-600 dark:text-green-400 font-medium animate-in fade-in">
            {language === 'pt'
              ? 'Livro adicionado à tua biblioteca!'
              : 'Book added to your library!'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {language === 'pt' ? 'A continuar...' : 'Continuing...'}
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        {language === 'pt'
          ? '(Irás ver este livro na tua biblioteca quando terminares)'
          : "(You'll see this book in your library when you're done)"}
      </p>
    </div>
  );
}
