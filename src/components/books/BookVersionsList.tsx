import { Download, Trash2, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { BookFile } from '@/hooks/useBooks';
import { getLanguageName } from '@/lib/languages';
import { useLanguage } from '@/contexts/LanguageContext';

interface BookVersionsListProps {
  files: BookFile[];
  isOwner: boolean;
  onDeleteFile?: (fileId: string) => void;
  isDeleting?: boolean;
}

export function BookVersionsList({ 
  files, 
  isOwner, 
  onDeleteFile,
  isDeleting 
}: BookVersionsListProps) {
  const { t } = useLanguage();

  const handleDownload = (fileUrl: string) => {
    window.open(fileUrl, '_blank');
  };

  if (files.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        {t('book.noVersions')}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center justify-between gap-2 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 shrink-0">
              <Globe className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="font-medium text-sm truncate">{getLanguageName(file.language)}</span>
                <Badge variant="outline" className="text-xs shrink-0">
                  {file.file_type}
                </Badge>
              </div>
              {file.file_size && (
                <p className="text-xs text-muted-foreground">
                  {(file.file_size / (1024 * 1024)).toFixed(1)} MB
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8"
              onClick={() => handleDownload(file.file_url)}
              title={t('book.download')}
            >
              <Download className="h-4 w-4" />
            </Button>

            {isOwner && onDeleteFile && files.length > 1 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('book.removeVersion')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('book.removeVersionDesc')
                        .replace('{language}', getLanguageName(file.language))
                        .replace('{type}', file.file_type)}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDeleteFile(file.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t('book.remove')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
