import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useBooks } from '@/hooks/useBooks';
import { useReadingProgress, ReadingStatus } from '@/hooks/useReadingProgress';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getGenreTranslationKey } from '@/lib/i18n/translations';
import { BookVersionsList } from '@/components/books/BookVersionsList';
import { FriendsScoreboard } from '@/components/books/FriendsScoreboard';
import {
  ArrowLeft,
  Trash2,
  BookOpen,
  Calendar,
  User,
  Tag,
  Loader2,
  Plus,
  Globe,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAlternativeCovers } from '@/hooks/useAlternativeCovers';
import { useToast } from '@/hooks/use-toast';

export default function BookDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { books, isLoading, deleteBook, deleteBookFile } = useBooks();
  const { progress, updateProgress } = useReadingProgress(id);
  const { toast } = useToast();

  const book = books.find((b) => b.id === id);
  const bookProgress = progress.find((p) => p.book_id === id);
  const currentStatus = bookProgress?.status ?? 'to_read';
  const currentProgress = bookProgress?.progress ?? 0;

  const isOwner = book?.owner_id === user?.id;

  // Alternative covers functionality for admins/owners
  const alternativeCovers = useAlternativeCovers({
    title: book?.title,
    author: book?.author || undefined,
    isbn: book?.isbn || undefined,
  });
  const [previewCoverUrl, setPreviewCoverUrl] = useState<string | null>(null);
  const [isUpdatingCover, setIsUpdatingCover] = useState(false);

  // Check if current user is admin of the book owner's library
  const { data: isAdmin } = useQuery({
    queryKey: ['is-admin', book?.owner_id, user?.id],
    queryFn: async () => {
      // Check if user is the owner (owners are always admins)
      if (book?.owner_id === user?.id) return true;
      
      // Check library_members for admin role
      const { data, error } = await supabase
        .from('library_members')
        .select('role')
        .eq('library_owner_id', book!.owner_id)
        .eq('user_id', user!.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (error) return false;
      return !!data;
    },
    enabled: !!book?.owner_id && !!user?.id,
  });
  const { data: ownerProfile } = useQuery({
    queryKey: ['profile', book?.owner_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('user_id', book!.owner_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!book?.owner_id,
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-GB');
  };

  const handleStatusChange = (status: ReadingStatus) => {
    if (!id) return;
    updateProgress.mutate({ bookId: id, status });
  };

  const handleProgressChange = (value: number[]) => {
    if (!id) return;
    updateProgress.mutate({ bookId: id, progress: value[0] });
  };

  const handleDelete = async () => {
    if (!id) return;
    await deleteBook.mutateAsync(id);
    navigate('/');
  };

  const handleDeleteFile = async (fileId: string) => {
    await deleteBookFile.mutateAsync(fileId);
  };

  const handleFetchAlternativeCovers = async () => {
    if (!book?.title && !book?.isbn) {
      toast({
        variant: 'destructive',
        title: t('upload.missingInfo'),
        description: t('upload.needTitleOrIsbn'),
      });
      return;
    }

    const newCovers = await alternativeCovers.fetchCovers(0);
    if (newCovers && newCovers.length > 0) {
      setPreviewCoverUrl(newCovers[0].coverUrl);
      toast({
        title: t('upload.coversFound'),
        description: t('upload.coversFoundDesc').replace('{count}', String(newCovers.length)),
      });
    } else {
      toast({
        variant: 'default',
        title: t('upload.noCoversFound'),
        description: t('upload.noCoversFoundDesc'),
      });
    }
  };

  const handleNextCover = async () => {
    if (alternativeCovers.canGoNext) {
      // Navigate to next existing cover
      const nextCover = alternativeCovers.goToNext();
      if (nextCover) {
        setPreviewCoverUrl(nextCover.coverUrl);
      }
    } else if (alternativeCovers.canFetchMore) {
      // Need to fetch more covers explicitly
      const newCover = await alternativeCovers.fetchMore();
      if (newCover) {
        setPreviewCoverUrl(newCover.coverUrl);
      }
    }
  };

  const handlePreviousCover = () => {
    const prevCover = alternativeCovers.goToPrevious();
    if (prevCover) {
      setPreviewCoverUrl(prevCover.coverUrl);
    }
  };

  const handleUpdateCover = async () => {
    if (!previewCoverUrl || !book || !user) return;

    setIsUpdatingCover(true);
    try {
      // Download the cover image
      const coverResponse = await fetch(previewCoverUrl);
      const coverBlob = await coverResponse.blob();

      const ext = previewCoverUrl.includes('.jpg') || previewCoverUrl.includes('.jpeg') ? 'jpg' : 'png';
      const coverName = `${user.id}/${crypto.randomUUID()}.${ext}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('covers')
        .upload(coverName, coverBlob);

      if (uploadError) throw uploadError;

      const { data: coverData } = supabase.storage
        .from('covers')
        .getPublicUrl(coverName);

      // Update book with new cover
      const { error: updateError } = await supabase
        .from('books')
        .update({ cover_url: coverData.publicUrl })
        .eq('id', book.id);

      if (updateError) throw updateError;

      toast({
        title: t('book.coverUpdated'),
        description: t('book.coverUpdatedDesc'),
      });

      // Reset preview
      setPreviewCoverUrl(null);
      alternativeCovers.reset();

      // Invalidate books query to refresh
      // The useBooks hook should automatically refetch
    } catch (error) {
      console.error('Error updating cover:', error);
      toast({
        variant: 'destructive',
        title: t('book.coverUpdateError'),
        description: t('book.coverUpdateErrorDesc'),
      });
    } finally {
      setIsUpdatingCover(false);
    }
  };

  const handleCancelCoverUpdate = () => {
    setPreviewCoverUrl(null);
    alternativeCovers.reset();
  };

  // Get files from book_files relation, fallback to legacy file fields
  const bookFiles = book?.book_files && book.book_files.length > 0 
    ? book.book_files 
    : book?.file_url 
      ? [{ 
          id: 'legacy', 
          book_id: book.id, 
          language: 'pt', 
          file_url: book.file_url, 
          file_type: book.file_type, 
          file_size: book.file_size,
          created_at: book.created_at 
        }] 
      : [];

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!book) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-16">
          <h2 className="text-xl font-semibold mb-2">{t('book.notFound')}</h2>
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('book.backToLibrary')}
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('book.back')}
      </Button>

      <div className="grid md:grid-cols-[300px_1fr] gap-8">
        {/* Cover */}
        <div className="space-y-4">
          <div className="aspect-[2/3] overflow-hidden rounded-lg bg-muted relative">
            {previewCoverUrl ? (
              <img
                src={previewCoverUrl}
                alt={book.title}
                className="h-full w-full object-cover"
              />
            ) : book.cover_url ? (
              <img
                src={book.cover_url}
                alt={book.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-muted to-secondary p-6">
                <BookOpen className="h-16 w-16 text-muted-foreground" />
                <span className="text-center font-medium text-muted-foreground">
                  {book.title}
                </span>
              </div>
            )}
          </div>

          {/* Alternative Cover Controls for Admins */}
          {isAdmin && (
            <Card>
              <CardContent className="pt-4 space-y-3">
                {!previewCoverUrl ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleFetchAlternativeCovers}
                    disabled={alternativeCovers.isLoading || (!book.title && !book.isbn)}
                  >
                    {alternativeCovers.isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ImageIcon className="mr-2 h-4 w-4" />
                    )}
                    {t('book.changeCover')}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    {/* Cover Navigation */}
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handlePreviousCover}
                        disabled={!alternativeCovers.canGoPrevious || alternativeCovers.isLoading}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                        {t('upload.coverCounter')
                          .replace('{current}', String(alternativeCovers.currentIndex + 1))
                          .replace('{total}', String(alternativeCovers.totalCovers))}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleNextCover}
                        disabled={alternativeCovers.isLoading}
                        title={alternativeCovers.canFetchMore ? 'Fetch more covers' : 'Next cover'}
                      >
                        {alternativeCovers.isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : alternativeCovers.canFetchMore ? (
                          <ImageIcon className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {alternativeCovers.currentCover && (
                      <p className="text-xs text-muted-foreground text-center">
                        {alternativeCovers.currentCover.source}
                      </p>
                    )}

                    {/* Save/Cancel Buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={handleCancelCoverUpdate}
                        disabled={isUpdatingCover}
                      >
                        {t('book.cancelCover')}
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={handleUpdateCover}
                        disabled={isUpdatingCover}
                      >
                        {isUpdatingCover ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        {t('book.saveCover')}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Book Versions Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">{t('book.versionsAvailable')}</CardTitle>
              {isOwner && (
                <Link to={`/upload?bookId=${book.id}`}>
                  <Button size="sm" variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    {t('book.addVersion')}
                  </Button>
                </Link>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <BookVersionsList
                files={bookFiles}
                isOwner={isOwner}
                onDeleteFile={handleDeleteFile}
                isDeleting={deleteBookFile.isPending}
              />
            </CardContent>
          </Card>

          {isAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full text-destructive hover:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('book.delete')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('book.deleteConfirm')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('book.deleteWarning')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('book.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {t('book.confirm')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-semibold mb-2">{book.title}</h1>
            {book.author && (
              <p className="text-lg text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                {book.author}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {book.genre && (
              <Badge variant="secondary">
                <Tag className="mr-1 h-3 w-3" />
                {t(getGenreTranslationKey(book.genre.slug))}
              </Badge>
            )}
            {book.year && (
              <Badge variant="outline">
                <Calendar className="mr-1 h-3 w-3" />
                {book.year}
              </Badge>
            )}
            {bookFiles.length > 0 && (
              <Badge variant="outline">
                <Globe className="mr-1 h-3 w-3" />
                {bookFiles.length} {bookFiles.length === 1 ? t('book.version') : t('book.versionsCount')}
              </Badge>
            )}
          </div>

          {/* Reading Progress Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('book.readingProgress')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium w-16">{t('book.state')}</span>
                <Select value={currentStatus} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_planned">{t('status.notPlanned')}</SelectItem>
                    <SelectItem value="to_read">{t('status.toRead')}</SelectItem>
                    <SelectItem value="reading">{t('status.reading')}</SelectItem>
                    <SelectItem value="read">{t('status.read')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {currentStatus === 'reading' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t('book.progressLabel')}</span>
                    <span className="text-sm text-muted-foreground">{currentProgress}%</span>
                  </div>
                  <Slider
                    value={[currentProgress]}
                    onValueChange={handleProgressChange}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>
              )}

              {currentStatus === 'read' && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{t('book.finished')}</span>
                  {bookProgress?.finished_at && (
                    <span>
                      {t('book.finishedOn')} {formatDate(bookProgress.finished_at)}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Friends Scoreboard */}
          <FriendsScoreboard bookId={id!} />

          {/* Description */}
          {book.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('book.descriptionTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {book.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Book Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('book.infoTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t('book.addedBy')}</span>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={ownerProfile?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {ownerProfile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span>{ownerProfile?.display_name || t('friends.user')}</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('book.addedOn')}</span>
                <span>{formatDate(book.created_at)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
