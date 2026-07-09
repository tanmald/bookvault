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
import type { Book } from '@/hooks/useBooks';
import { useReadingProgress, ReadingStatus } from '@/hooks/useReadingProgress';
import { useReviews } from '@/hooks/useReviews';
import { useSeriesInfo } from '@/hooks/useSeriesInfo';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLibrary } from '@/contexts/LibraryContext';
import { getGenreTranslationKey } from '@/lib/i18n/translations';
import { BookVersionsList } from '@/components/books/BookVersionsList';
import { FriendsScoreboard } from '@/components/books/FriendsScoreboard';
import { SeriesCard } from '@/components/books/SeriesCard';
import { CopyBookDialog } from '@/components/books/CopyBookDialog';
import { ChangeCoverDialog } from '@/components/books/ChangeCoverDialog';
import { EditBookMetadataDialog } from '@/components/books/EditBookMetadataDialog';
import { ReviewDialog } from '@/components/books/ReviewDialog';
import { StartNextBookDialog } from '@/components/books/StartNextBookDialog';
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
  Image,
  Star,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function BookDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { books, isLoading, deleteBook, deleteBookFile } = useBooks();
  const { progress: allProgress, updateProgress, updateFinishedDate } = useReadingProgress();
  const { myReview, bookReviews } = useReviews(id);
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [isChangeCoverDialogOpen, setIsChangeCoverDialogOpen] = useState(false);
  const [isEditMetadataDialogOpen, setIsEditMetadataDialogOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [coverVersion, setCoverVersion] = useState(0);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewIntent, setReviewIntent] = useState<'markRead' | 'editReview'>('markRead');
  const [nextBookToSuggest, setNextBookToSuggest] = useState<Book | null>(null);
  const { currentLibrary } = useLibrary();
  const { toast } = useToast();

  const book = books.find((b) => b.id === id);
  const { data: seriesInfo } = useSeriesInfo(book?.title, book?.author);
  const bookProgress = allProgress.find((p) => p.book_id === id);
  const currentStatus = bookProgress?.status ?? 'to_read';
  const currentProgress = bookProgress?.progress ?? 0;

  const firstToReadBook = (() => {
    const progressByBookId = new Map(allProgress.map(p => [p.book_id, p]));
    const toReadBooks = books.filter(b => b.id !== id && (progressByBookId.get(b.id)?.status ?? 'to_read') === 'to_read');
    toReadBooks.sort((a, b) => {
      const ra = progressByBookId.get(a.id)?.sort_order ?? null;
      const rb = progressByBookId.get(b.id)?.sort_order ?? null;
      if (ra !== null && rb !== null) return ra - rb;
      if (ra !== null) return -1;
      if (rb !== null) return 1;
      return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
    });
    return toReadBooks[0] ?? null;
  })();

  const isOwner = book?.owner_id === user?.id;

  // Check if current user is admin of the book's library
  const { data: isAdmin } = useQuery({
    queryKey: ['is-admin', book?.library_id, book?.owner_id, user?.id],
    queryFn: async () => {
      // Owners are always admins of their own book
      if (book?.owner_id === user?.id) return true;

      // Check library_members for an admin role in the book's library
      const { data, error } = await supabase
        .from('library_members')
        .select('role')
        .eq('library_id', book!.library_id)
        .eq('user_id', user!.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) return false;
      return !!data;
    },
    enabled: !!book?.library_id && !!user?.id,
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
      setReviewIntent('markRead');
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

  const handleEditReview = () => {
    setReviewIntent('editReview');
    setIsReviewDialogOpen(true);
  };

  const handleReviewSubmit = () => {
    if (!id) return;

    // Editing an existing review shouldn't touch reading status — the dialog
    // already saved the review, so just acknowledge and close.
    if (reviewIntent === 'editReview') {
      setIsReviewDialogOpen(false);
      toast({
        title: t('common.success'),
        description: t('book.reviewSaved'),
        variant: 'success',
      });
      return;
    }

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
          if (firstToReadBook) setNextBookToSuggest(firstToReadBook);
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

  // Average rating across the reviews visible to the current user (library members)
  const ratings = (bookReviews ?? []).map((r) => r.rating);
  const ratingsCount = ratings.length;
  const averageRating = ratingsCount > 0
    ? ratings.reduce((sum, r) => sum + r, 0) / ratingsCount
    : null;

  const renderStars = (value: number, sizeClass = 'h-4 w-4') => (
    <div className="flex gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClass} ${
            star <= Math.round(value) ? 'fill-accent text-accent' : 'text-muted-foreground'
          }`}
        />
      ))}
    </div>
  );

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
                key={`${book.id}-${book.cover_url}-${coverVersion}`}
                src={`${book.cover_url}?nocache=${coverVersion}`}
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

          {/* Change Cover Button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setIsChangeCoverDialogOpen(true)}
          >
            <Image className="mr-2 h-4 w-4" />
            {t('book.changeCover')}
          </Button>

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
            <div className="flex items-start justify-between gap-2 mb-2">
              <h1 className="text-3xl font-semibold">{book.title}</h1>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  aria-label={t('book.editDetails')}
                  onClick={() => setIsEditMetadataDialogOpen(true)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
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

          {/* My Review & Average Rating */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg">{t('book.myReviewTitle')}</CardTitle>
              <Button variant="outline" size="sm" onClick={handleEditReview}>
                <Star className="mr-2 h-4 w-4" />
                {myReview ? t('book.editReview') : t('book.addReview')}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Average rating summary */}
              <div className="flex items-center gap-2 text-sm">
                {averageRating !== null ? (
                  <>
                    {renderStars(averageRating)}
                    <span className="font-medium">{averageRating.toFixed(1)}</span>
                    <span className="text-muted-foreground">
                      · {ratingsCount}{' '}
                      {ratingsCount === 1 ? t('book.ratingSingular') : t('book.ratingPlural')}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">{t('book.noRatings')}</span>
                )}
              </div>

              {/* The user's own review */}
              {myReview && (
                <div className="rounded-md border border-border p-3 space-y-2">
                  {renderStars(myReview.rating)}
                  {myReview.content && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {myReview.content}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Series / Saga */}
          {seriesInfo && (
            <SeriesCard
              currentBook={{ title: book.title, author: book.author }}
              seriesInfo={seriesInfo}
              libraryBooks={books}
            />
          )}

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
              {book.isbn && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('book.isbn')}</span>
                  <span className="font-mono">{book.isbn}</span>
                </div>
              )}
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

        {book && (
        <ChangeCoverDialog
          isOpen={isChangeCoverDialogOpen}
          onClose={() => {
            setIsChangeCoverDialogOpen(false);
            setCoverVersion(v => v + 1);
          }}
          book={{
            id: book.id,
            title: book.title,
            author: book.author || '',
            cover_url: book.cover_url,
            isbn: book.isbn,
          }}
        />
      )}

      {book && (
        <EditBookMetadataDialog
          isOpen={isEditMetadataDialogOpen}
          onClose={() => setIsEditMetadataDialogOpen(false)}
          book={book}
        />
      )}

      <ReviewDialog
        isOpen={isReviewDialogOpen}
        onClose={() => setIsReviewDialogOpen(false)}
        bookId={id || ''}
        onSubmit={handleReviewSubmit}
      />

      <StartNextBookDialog
        open={!!nextBookToSuggest}
        book={nextBookToSuggest}
        onConfirm={() => {
          if (nextBookToSuggest) updateProgress.mutate({ bookId: nextBookToSuggest.id, status: 'reading' });
          setNextBookToSuggest(null);
        }}
        onDismiss={() => setNextBookToSuggest(null)}
      />
    </AppLayout>
  );
}
