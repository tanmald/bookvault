import React from 'react';
import { Download, Trash2, Globe, Loader2, Tablet } from 'lucide-react';
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
import { SendToKoboDialog } from './SendToKoboDialog';
import type { BookFile } from '@/hooks/useBooks';
import { getLanguageName } from '@/lib/languages';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSignedUrl } from '@/hooks/useSignedUrl';

interface BookVersionsListProps {
  files: BookFile[];
  isOwner: boolean;
  onDeleteFile?: (fileId: string) => void;
  isDeleting?: boolean;
  bookTitle?: string;
}

export function BookVersionsList({
  files,
  isOwner,
  onDeleteFile,
  isDeleting,
  bookTitle = 'Book'
}: BookVersionsListProps) {
  const { t } = useLanguage();
  const signedUrl = useSignedUrl();
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);
  const [sendingToKoboId, setSendingToKoboId] = React.useState<string | null>(null);
  const [koboDialogOpen, setKoboDialogOpen] = React.useState(false);
  const [koboUrl, setKoboUrl] = React.useState<string | null>(null);

  const handleDownload = async (file: BookFile) => {
    try {
      setDownloadingId(file.id);
      const url = await signedUrl.mutateAsync({ filePath: file.file_url });

      // Create temporary anchor element to force download
      const link = document.createElement('a');
      link.href = url;
      link.download = file.file_url.split('/').pop() || `book.${file.file_type.toLowerCase()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSendToKobo = async (file: BookFile) => {
    try {
      setSendingToKoboId(file.id);
      setKoboDialogOpen(true);
      // Generate signed URL with 30 minutes expiry (1800 seconds)
      const url = await signedUrl.mutateAsync({ 
        filePath: file.file_url, 
        expiresIn: 1800 
      });
      setKoboUrl(url);
    } catch (error) {
      console.error('Failed to generate Kobo URL:', error);
    } finally {
      setSendingToKoboId(null);
    }
  };

  const handleCloseKoboDialog = () => {
    setKoboDialogOpen(false);
    setKoboUrl(null);
  };

  if (files.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        {t('book.noVersions')}
      </div>
    );
  }

  return (
    <>
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
              {/* Download button */}
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={() => handleDownload(file)}
                disabled={downloadingId === file.id}
                title={t('book.download')}
              >
                {downloadingId === file.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>

              {/* Send to Kobo button */}
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={() => handleSendToKobo(file)}
                disabled={sendingToKoboId === file.id}
                title={t('kobo.send')}
              >
                {sendingToKoboId === file.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Tablet className="h-4 w-4" />
                )}
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

      <SendToKoboDialog
        isOpen={koboDialogOpen}
        onClose={handleCloseKoboDialog}
        signedUrl={koboUrl}
        isLoading={signedUrl.isPending}
        bookTitle={bookTitle}
      />
    </>
  );
}
