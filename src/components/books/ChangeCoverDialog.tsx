import React, { useState, useEffect } from 'react';
import { Loader2, ChevronLeft, ChevronRight, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBooks } from '@/hooks/useBooks';
import { useAlternativeCovers } from '@/hooks/useAlternativeCovers';
import { FileUpload } from '@/components/upload/FileUpload';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ChangeCoverDialogProps {
  isOpen: boolean;
  onClose: () => void;
  book: {
    id: string;
    title: string;
    author: string;
    cover_url: string | null;
    isbn?: string | null;
  };
}

export function ChangeCoverDialog({ isOpen, onClose, book }: ChangeCoverDialogProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  // This dialog only ever edits an already-known book (passed in via
  // props), so it doesn't need useBooks()'s list query -- just the mutation.
  const { updateBook } = useBooks(undefined, { enabled: false });

  // Upload mode state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Browse mode state
  const {
    availableCovers,
    currentCover,
    isLoading: isLoadingCovers,
    canGoPrevious,
    canGoNext,
    canFetchMore,
    goToNext,
    goToPrevious,
    reset: resetCovers,
    fetchMore,
  } = useAlternativeCovers({
    title: book.title,
    author: book.author,
    isbn: book.isbn || undefined,
  });

  // Dialog state
  const [activeTab, setActiveTab] = useState<'upload' | 'browse'>('upload');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCoverUrl, setSelectedCoverUrl] = useState<string | null>(null);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setUploadError(null);
      setSelectedCoverUrl(null);
      setActiveTab('upload');
      resetCovers();
    }
  }, [isOpen, resetCovers]);

  const handleFileSelect = (file: File) => {
    setUploadError(null);
    setSelectedFile(file);
    setSelectedCoverUrl(null);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setUploadError(null);
    setSelectedCoverUrl(null);
  };

  const deleteOldCover = async (coverUrl: string | null) => {
    if (!coverUrl || !user) return;

    // Only delete if it's a Supabase storage URL
    const storagePattern = /\/storage\/v1\/object\/public\/covers\/(.+)$/;
    const match = coverUrl.match(storagePattern);

    if (!match) return; // External URL, don't delete

    const path = match[1];

    // Verify path belongs to current user
    if (!path.startsWith(`${user.id}/`)) return;

    try {
      await supabase.storage.from('covers').remove([path]);
    } catch (error) {
      // Non-critical, just log
      console.error('Failed to delete old cover:', error);
    }
  };

  const uploadCover = async (file: File): Promise<string | null> => {
    if (!user) return null;

    try {
      const coverExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      // Use timestamp in filename for uniqueness (prevents browser cache issues)
      const timestamp = Date.now();
      const coverName = `${user.id}/${timestamp}_${crypto.randomUUID()}.${coverExt}`;

      const { error: uploadError } = await supabase.storage
        .from('covers')
        .upload(coverName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        setUploadError(t('book.coverUpdateError'));
        return null;
      }

      const { data } = supabase.storage.from('covers').getPublicUrl(coverName);
      return data.publicUrl; // Clean URL, no cache buster needed
    } catch (error) {
      console.error('Error uploading cover:', error);
      setUploadError(t('book.coverUpdateError'));
      return null;
    }
  };

  const handleSubmit = async () => {
    const coverUrl = activeTab === 'upload' ? null : selectedCoverUrl;

    if (activeTab === 'upload' && !selectedFile) {
      setUploadError(t('book.noCoverSelected'));
      return;
    }

    if (activeTab === 'browse' && !selectedCoverUrl) {
      setUploadError(t('book.noCoverSelected'));
      return;
    }

    setIsSubmitting(true);
    try {
      // STEP 1: Delete old cover first (if it exists)
      if (book.cover_url) {
        await deleteOldCover(book.cover_url);
      }

      let newCoverUrl: string | null = null;

      // STEP 2: Upload or select new cover
      // Upload file if in upload mode
      if (activeTab === 'upload' && selectedFile) {
        newCoverUrl = await uploadCover(selectedFile);
        if (!newCoverUrl) {
          setIsSubmitting(false);
          return;
        }
      }
      // Use selected online cover if in browse mode
      else if (activeTab === 'browse' && selectedCoverUrl) {
        newCoverUrl = selectedCoverUrl;
      }

      // STEP 3: Update book with clean URL (no cache buster)
      await updateBook.mutateAsync({
        id: book.id,
        cover_url: newCoverUrl,
      });

      // Show success message
      toast.success(t('book.coverUpdated'));

      // Close dialog - React Query will update the UI automatically
      onClose();
    } catch (error) {
      console.error('Error updating cover:', error);
      toast.error(t('book.coverUpdateError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = isSubmitting || updateBook.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            {t('book.changeCover')}
          </DialogTitle>
          <DialogDescription>
            {t('book.changeCoverDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Unified Cover Preview - shows current OR selected */}
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {selectedFile || selectedCoverUrl
                ? t('book.selectedCover')
                : t('book.currentCover')}
            </p>
            <div className="aspect-[2/3] overflow-hidden rounded-lg bg-muted max-w-xs">
              {selectedFile ? (
                <img
                  src={URL.createObjectURL(selectedFile)}
                  alt="Selected cover"
                  className="h-full w-full object-cover"
                />
              ) : selectedCoverUrl ? (
                <img
                  src={selectedCoverUrl}
                  alt="Selected cover"
                  className="h-full w-full object-cover"
                />
              ) : book.cover_url ? (
                <img
                  src={book.cover_url}
                  alt={book.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted to-secondary p-4">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  <span className="text-center text-xs font-medium text-muted-foreground">
                    {book.title}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tabs for Upload / Browse */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'upload' | 'browse')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">{t('book.uploadNewCover')}</TabsTrigger>
              <TabsTrigger value="browse">{t('book.browseCoverOptions')}</TabsTrigger>
            </TabsList>

            {/* Upload Tab */}
            <TabsContent value="upload" className="space-y-4">
              <FileUpload
                accept={{
                  'image/jpeg': ['.jpg', '.jpeg'],
                  'image/png': ['.png'],
                  'image/webp': ['.webp'],
                }}
                maxSize={5 * 1024 * 1024} // 5MB
                onFileSelect={handleFileSelect}
                selectedFile={selectedFile}
                onClear={handleClearFile}
                isUploading={isSubmitting}
                label={t('upload.dragDrop')}
                description="JPG, PNG or WEBP up to 5MB"
              />
              {uploadError && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <p>{uploadError}</p>
                </div>
              )}
            </TabsContent>

            {/* Browse Tab */}
            <TabsContent value="browse" className="space-y-4">
              {availableCovers.length === 0 && !isLoadingCovers && (
                <div className="rounded-lg bg-muted/50 p-6 text-center">
                  <ImageIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{t('book.noAlternativeCovers')}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => fetchMore()}
                    disabled={isLoadingCovers}
                  >
                    {isLoadingCovers && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('upload.fetchAnotherCover')}
                  </Button>
                </div>
              )}

              {availableCovers.length > 0 && currentCover && (
                <>
                  {/* Navigation Controls */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPrevious}
                      disabled={!canGoPrevious || isLoadingCovers}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNext}
                      disabled={!canGoNext || isLoadingCovers}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    {canFetchMore && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchMore()}
                        disabled={isLoadingCovers}
                        className="ml-auto"
                      >
                        {isLoadingCovers && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('upload.fetchAnotherCover')}
                      </Button>
                    )}
                  </div>

                  {isLoadingCovers && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('book.fetchingCovers')}
                    </div>
                  )}

                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => setSelectedCoverUrl(currentCover.coverUrl)}
                    disabled={selectedCoverUrl === currentCover.coverUrl}
                  >
                    {selectedCoverUrl === currentCover.coverUrl
                      ? t('common.selected')
                      : t('book.selectThisCover')}
                  </Button>
                </>
              )}

              {isLoadingCovers && availableCovers.length === 0 && (
                <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('book.searchingForCovers')}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDisabled}>
            {t('book.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isDisabled}>
            {isDisabled && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting || isLoadingCovers ? t('book.updatingCover') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
