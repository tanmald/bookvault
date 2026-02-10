import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Scale, Heart } from 'lucide-react';

export function Footer() {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background py-6 mt-auto sticky bottom-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>&copy; {currentYear} BookVault</span>
          <span className="hidden md:inline">•</span>
          <span className="hidden md:flex items-center gap-1">
            {t('common.madeWith')} <Heart className="h-3 w-3 text-destructive fill-destructive" /> {t('common.forBookLovers')}
          </span>
        </div>
        
        <div className="flex items-center gap-6 text-sm">
          <Link 
            to="/terms" 
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Scale className="h-4 w-4" />
            {t('legal.termsTitle')}
          </Link>
        </div>
      </div>
    </footer>
  );
}
