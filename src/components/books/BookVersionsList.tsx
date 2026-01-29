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
  const handleDownload = (fileUrl: string) => {
    window.open(fileUrl, '_blank');
  };

  if (files.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Nenhuma versão disponível
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{getLanguageName(file.language)}</span>
                <Badge variant="outline" className="text-xs">
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

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDownload(file.file_url)}
            >
              <Download className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Download</span>
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
                    <AlertDialogTitle>Remover esta versão?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação irá remover a versão em {getLanguageName(file.language)} ({file.file_type}).
                      Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDeleteFile(file.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Remover
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
