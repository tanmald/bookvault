import { useCallback, useState } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Upload, File, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  label?: string;
  description?: string;
  selectedFile?: File | null;
  onClear?: () => void;
  isUploading?: boolean;
}

const defaultAccept = {
  'application/pdf': ['.pdf'],
  'application/epub+zip': ['.epub'],
  'application/x-mobipocket-ebook': ['.mobi'],
  'application/vnd.amazon.ebook': ['.azw', '.azw3'],
};

export function FileUpload({
  onFileSelect,
  accept = defaultAccept,
  maxSize = 50 * 1024 * 1024, // 50MB
  label,
  description,
  selectedFile,
  onClear,
  isUploading,
}: FileUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  const displayLabel = label || t('upload.dragDrop');
  const displayDescription = description || t('upload.formats');

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setError(null);

      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors[0]?.code === 'file-too-large') {
          setError(t('upload.fileTooLarge'));
        } else if (rejection.errors[0]?.code === 'file-invalid-type') {
          setError(t('upload.invalidType'));
        } else {
          setError(t('upload.uploadFileError'));
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect, t]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
    disabled: isUploading,
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (selectedFile) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-4">
        <File className="h-8 w-8 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{selectedFile.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatFileSize(selectedFile.size)}
          </p>
        </div>
        {isUploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          onClear && (
            <Button variant="ghost" size="icon" onClick={onClear}>
              <X className="h-4 w-4" />
            </Button>
          )
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer',
          isDragActive ? 'border-accent bg-accent/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          isUploading && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        <Upload className={cn('h-10 w-10 mb-3', isDragActive ? 'text-accent' : 'text-muted-foreground')} />
        <p className="text-center font-medium">{displayLabel}</p>
        <p className="text-center text-sm text-muted-foreground mt-1">{displayDescription}</p>
      </div>
      {error && <p className="text-sm text-destructive mt-2">{error}</p>}
    </div>
  );
}
