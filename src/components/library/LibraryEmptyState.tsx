import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/ui/EmptyState';
import { BookOpen, Plus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

export function LibraryEmptyState() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <EmptyState
      icon={BookOpen}
      title={t('library.empty')}
      description={t('library.emptyDesc')}
      size="lg"
      action={
        <Button onClick={() => navigate('/upload')}>
          <Plus className="h-4 w-4 mr-2" />
          {t('nav.addBook')}
        </Button>
      }
    />
  );
}
