import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { useLibrary } from '@/contexts/LibraryContext';
import { getGenreTranslationKey } from '@/lib/i18n/translations';
import { BookVersionsList } from '@/components/books/BookVersionsList';
import { FriendsScoreboard } from '@/components/books/FriendsScoreboard';
import { CopyBookDialog } from '@/components/books/CopyBookDialog';
import { ReviewDialog } from '@/components/books/ReviewDialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  ArrowRight,
  Trash2,
  BookOpen,
  User,
  Tag,
  Loader2,
  Plus,
  Globe,
  Pencil,
  Calendar,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function BookDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { books, isLoading, deleteBook, deleteBookFile } = useBooks();
  const { progress, updateProgress, updateFinishedDate } = useReadingProgress(id);
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const { currentLibrary } = useLibrary();
  const { toast } = useToast();

  const book = books.find((b) => b.id === id);
  const bookProgress = progress.find((p) => p.book_id === id);
  const currentStatus = bookProgress?.status ?? 'to_read';
  const currentProgress = bookProgress?.progress ?? 0;

  const isOwner = book?.owner_id === user?.id;

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

    if (status === 'read') {
      setIsReviewDialogOpen(true);
    } else {
      updateProgress.mutate(
        { bookId: id, status },
        {
          onSuccess: () => {
            toast({
              title: t('common.success'),
              description: t('book.progressSaved'),
              variant: 'success',
            });
          },
        }
      );
    }
  };

  const handleReviewSubmit = () => {
    if (!id) return;
    updateProgress.mutate(
      { bookId: id, status: 'read' },
      {
        onSuccess: () => {
          setIsReviewDialogOpen(false);
          toast({
            title: t('common.success'),
            description: t('book.progressSaved'),
            variant: 'success',
          });
        },
      }
    );
  };

  const handleProgressChange = (value: number[]) => {
    if (!id) return;
    updateProgress.mutate(
      { bookId: id, progress: value[0] },
      {
        onSuccess: () => {
          toast({
            title: t('common.success'),
            description: t('book.progressSaved'),
            variant: 'success',
          });
        },
      }
    );
  };

  const handleDelete = async () => {
    if (!id) return;
    await deleteBook.mutateAsync(id);
    navigate('/');
  };

  const handleDeleteFile = async (fileId: string) => {
    await deleteBookFile.mutateAsync(fileId);
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
          <div className="aspect-[2/3] overflow-hidden rounded-lg bg-muted">
            {book.cover_url ? (
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

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setIsCopyDialogOpen(true)}
          >
            <ArrowRight className="mr-2 h-4 w-4" />
            {t('copyBook.title')}
          </Button>

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
                  <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        title={t('book.editFinishedDate')}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      {isDatePickerOpen && (
                        <CalendarComponent
                          mode="single"
                          selected={bookProgress?.finished_at ? new Date(bookProgress.finished_at) : undefined}
                          onSelect={(date) => {
                            if (date && id) {
                              const now = new Date();
                              now.setHours(0, 0, 0, 0);
                              if (date > now) {
                                toast({
                                  variant: 'destructive',
                                  title: t('common.error'),
                                  description: t('book.futureDateError'),
                                });
                                return;
                              }
                              updateFinishedDate.mutate(
                                {
                                  bookId: id,
                                  finishedAt: date.toISOString(),
                                },
                                {
                                  onSuccess: () => {
                                    toast({
                                      title: t('common.success'),
                                      description: t('book.progressSaved'),
                                      variant: 'success',
                                    });
                                  },
                                }
                              );
                              setIsDatePickerOpen(false);
                            }
                          }}
                          disabled={(date) => {
                            const now = new Date();
                            now.setHours(0, 0, 0, 0);
                            return date > now;
                          }}
                          initialFocus
                        />
                      )}
                    </PopoverContent>
                  </Popover>
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

      <CopyBookDialog
        isOpen={isCopyDialogOpen}
        onClose={() => setIsCopyDialogOpen(false)}
        bookId={book?.id || ''}
        bookTitle={book?.title || ''}
        currentLibraryId={currentLibrary?.id || ''}
        onSuccess={() => {
          if (currentLibrary) {
            navigate(`/?library=${currentLibrary.id}`);
          }
        }}
      />

      <ReviewDialog
        isOpen={isReviewDialogOpen}
        onClose={() => setIsReviewDialogOpen(false)}
        bookId={id || ''}
        onSubmit={handleReviewSubmit}
      />
    </AppLayout>
  );
}
