import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { FileUpload } from '@/components/upload/FileUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useBooks, checkDuplicateByIsbn, checkDuplicateByTitleAuthor, type DuplicateMatch } from '@/hooks/useBooks';
import { SUPPORTED_LANGUAGES, getLanguageName } from '@/lib/languages';
import { useGenres } from '@/hooks/useGenres';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLibrary } from '@/contexts/LibraryContext';
import { getGenreTranslationKey } from '@/lib/i18n/translations';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Sparkles, Plus, BookCopy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { DuplicateBookSelector } from '@/components/upload/DuplicateBookSelector';
import type { Book } from '@/hooks/useBooks';

interface ExtractedMetadata {
  title: string | null;
  author: string | null;
  description: string | null;
  year: number | null;
  coverBase64: string | null;
  genreSlug: string | null;
  detectedLanguage: string | null;
  isbn: string | null;
}

export default function UploadBook() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { currentLibrary } = useLibrary();
  const { books, createBook, addBookFile } = useBooks(currentLibrary?.id);
  const { data: genres } = useGenres();
  const { toast } = useToast();

  // Check if we're adding to an existing book from URL params
  const bookIdFromUrl = searchParams.get('bookId');

  const [file, setFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [extractedCoverBase64, setExtractedCoverBase64] = useState<string | null>(null);
  const [extractedIsbn, setExtractedIsbn] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtractingMetadata, setIsExtractingMetadata] = useState(false);
  const [isFetchingCover, setIsFetchingCover] = useState(false);

  // Duplicate detection state
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [forcedExistingMode, setForcedExistingMode] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  // Mode: 'new' for new book, 'existing' for adding to existing book
  const [mode, setMode] = useState<'new' | 'existing'>(bookIdFromUrl ? 'existing' : 'new');
  const [selectedBookId, setSelectedBookId] = useState<string>(bookIdFromUrl || '');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('pt');

  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: '',
    genre_id: '',
    year: '',
  });

  const extractMetadata = useCallback(async (selectedFile: File) => {
    const fileName = selectedFile.name.toLowerCase();
    const supportedFormats = ['.epub', '.pdf'];
    const isSupported = supportedFormats.some(ext => fileName.endsWith(ext));
    
    if (!isSupported) {
      return;
    }

    setIsExtractingMetadata(true);
    
    try {
      const formDataPayload = new FormData();
      formDataPayload.append('file', selectedFile);

      // Let Supabase client handle auth automatically (includes token refresh)
      const { data: metadata, error: invokeError } = await supabase.functions.invoke<ExtractedMetadata>(
        'extract-metadata',
        {
          body: formDataPayload,
        }
      );

      if (invokeError) {
        console.error('Edge function error:', invokeError);
        throw new Error(invokeError.message || 'Failed to extract metadata');
      }

      if (!metadata) {
        throw new Error('No metadata returned');
      }

      // Find genre_id from the detected slug
      let detectedGenreId = '';
      if (metadata.genreSlug && genres) {
        const matchedGenre = genres.find(g => g.slug === metadata.genreSlug);
        if (matchedGenre) {
          detectedGenreId = matchedGenre.id;
        }
      }

      // Set detected language
      if (metadata.detectedLanguage) {
        setSelectedLanguage(metadata.detectedLanguage);
      }

      // Store extracted ISBN
      if (metadata.isbn) {
        setExtractedIsbn(metadata.isbn);
      }

      // Only update form data if we're creating a new book
      if (mode === 'new') {
        setFormData(prev => ({
          ...prev,
          title: metadata.title || '',
          author: metadata.author || '',
          description: metadata.description || '',
          year: metadata.year ? String(metadata.year) : '',
          genre_id: detectedGenreId,
        }));

        // Update cover with new file's extracted cover
        if (metadata.coverBase64) {
          setCoverFile(null);
          setExtractedCoverBase64(metadata.coverBase64);
          setCoverPreview(metadata.coverBase64);
        } else {
          setExtractedCoverBase64(null);
          setCoverPreview(null);
        }
      }

      const hasMetadata = metadata.title || metadata.author || metadata.description || metadata.coverBase64 || metadata.genreSlug || metadata.detectedLanguage;
      
      if (hasMetadata) {
        const detectedInfo = [];
        if (metadata.detectedLanguage) {
          detectedInfo.push(`${t('upload.fileLanguage')}: ${getLanguageName(metadata.detectedLanguage)}`);
        }
        if (metadata.genreSlug) {
          const genre = genres?.find(g => g.slug === metadata.genreSlug);
          if (genre) detectedInfo.push(`${t('upload.genre')}: ${t(getGenreTranslationKey(genre.slug))}`);
        }
        
        toast({
          title: t('upload.metadataExtracted'),
          description: detectedInfo.length > 0 
            ? detectedInfo.join(' • ') 
            : undefined,
        });
      } else {
        toast({
          title: t('upload.noMetadata'),
          description: t('upload.noMetadataDesc'),
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Error extracting metadata:', error);
    } finally {
      setIsExtractingMetadata(false);
    }
  }, [genres, toast, mode, t]);

  // Check for duplicates when metadata is extracted
  useEffect(() => {
    const checkDuplicates = async () => {
      if (!formData.title || !currentLibrary?.id || mode === 'existing' || isExtractingMetadata) {
        return;
      }

      setIsCheckingDuplicates(true);

      try {
        let foundBook: Book | null = null;
        let matches: DuplicateMatch[] = [];

        if (extractedIsbn) {
          foundBook = await checkDuplicateByIsbn(extractedIsbn, currentLibrary.id);
        }

        if (!foundBook && formData.title) {
          matches = await checkDuplicateByTitleAuthor(formData.title, formData.author, currentLibrary.id, 0.85);
        }

        if (foundBook) {
          setDuplicateMatches([{ book: foundBook, similarity: 1, matchType: 'title' }]);
          setSelectedBookId(foundBook.id);
          setMode('existing');
          setForcedExistingMode(true);
          setShowDuplicateModal(true);
        } else if (matches.length > 0) {
          setDuplicateMatches(matches);
          setMode('existing');
          setForcedExistingMode(true);
          setShowDuplicateModal(true);
        } else {
          setDuplicateMatches([]);
          setForcedExistingMode(false);
          if (!bookIdFromUrl) {
            setMode('new');
          }
        }
      } catch (error) {
        console.error('Error checking for duplicates:', error);
      } finally {
        setIsCheckingDuplicates(false);
      }
    };

    const timeoutId = setTimeout(checkDuplicates, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.title, formData.author, extractedIsbn, currentLibrary, mode, bookIdFromUrl, isExtractingMetadata, toast, t]);

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    extractMetadata(selectedFile);
  }, [extractMetadata]);

  const handleCoverSelect = (coverFileSelected: File) => {
    setCoverFile(coverFileSelected);
    setExtractedCoverBase64(null);
    const reader = new FileReader();
    reader.onload = (e) => setCoverPreview(e.target?.result as string);
    reader.readAsDataURL(coverFileSelected);
  };

  const handleClearCover = () => {
    setCoverFile(null);
    setCoverPreview(null);
    setExtractedCoverBase64(null);
  };

  const handleModeChange = (isExisting: boolean) => {
    if (forcedExistingMode && !isExisting) {
      return;
    }
    setMode(isExisting ? 'existing' : 'new');
    if (isExisting) {
      setFormData({ title: '', author: '', description: '', genre_id: '', year: '' });
      setCoverFile(null);
      setCoverPreview(null);
      setExtractedCoverBase64(null);
    }
  };

  const handleSelectDuplicateBook = (book: Book) => {
    setSelectedBookId(book.id);
    setMode('existing');
    setShowDuplicateModal(false);
  };

  const handleCreateNewDespiteDuplicates = () => {
    setDuplicateMatches([]);
    setForcedExistingMode(false);
    setMode('new');
    setSelectedBookId('');
    setShowDuplicateModal(false);
  };

  const handleCloseDuplicateModal = () => {
    setShowDuplicateModal(false);
  };

  const fetchCoverAutomatically = async (
    isbn: string | null,
    title: string,
    author?: string
  ): Promise<string | null> => {
    if (!isbn && !title) return null;

    try {
      const { data, error } = await supabase.functions.invoke('fetch-cover', {
        body: { isbn, title, author },
      });

      if (error) {
        console.error('Error fetching cover:', error);
        return null;
      }

      if (data?.coverUrl) {
        console.log(`Cover found via ${data.source}:`, data.coverUrl);
        return data.coverUrl;
      }

      return null;
    } catch (error) {
      console.error('Error fetching cover:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file || !user || !currentLibrary) {
      toast({
        variant: 'destructive',
        title: t('upload.error'),
        description: !currentLibrary ? 'No library selected' : t('upload.selectFile'),
      });
      return;
    }

    if (mode === 'new' && !formData.title.trim()) {
      toast({
        variant: 'destructive',
        title: t('upload.error'),
        description: t('upload.titleRequiredError'),
      });
      return;
    }

    if (mode === 'existing' && !selectedBookId) {
      toast({
        variant: 'destructive',
        title: t('upload.error'),
        description: t('upload.selectExistingBook'),
      });
      return;
    }

    setIsUploading(true);

    try {
      // Upload book file
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('books')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: fileData } = supabase.storage
        .from('books')
        .getPublicUrl(fileName);

      if (mode === 'existing') {
        // Add file to existing book
        await addBookFile.mutateAsync({
          book_id: selectedBookId,
          language: selectedLanguage,
          file_url: fileData.publicUrl,
          file_type: fileExt.toUpperCase(),
          file_size: file.size,
        });
      } else {
        // Create new book
        let coverUrl: string | undefined;

        if (coverFile) {
          const coverExt = coverFile.name.split('.').pop()?.toLowerCase() || 'jpg';
          const coverName = `${user.id}/${crypto.randomUUID()}.${coverExt}`;

          const { error: coverError } = await supabase.storage
            .from('covers')
            .upload(coverName, coverFile);

          if (coverError) throw coverError;

          const { data: coverData } = supabase.storage
            .from('covers')
            .getPublicUrl(coverName);

          coverUrl = coverData.publicUrl;
        } else if (extractedCoverBase64) {
          // Validate and parse base64 data URL format: data:image/type;base64,DATA
          try {
            if (!extractedCoverBase64.includes(',') || !extractedCoverBase64.includes(':')) {
              throw new Error('Invalid base64 format');
            }

            const base64Data = extractedCoverBase64.split(',')[1];
            const mimeMatch = extractedCoverBase64.match(/data:([^;]+);/);
            const mimeType = mimeMatch?.[1] || 'image/jpeg';

            if (!base64Data) {
              throw new Error('No base64 data found');
            }

            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: mimeType });

            const ext = mimeType.split('/')[1] || 'jpg';
            const coverName = `${user.id}/${crypto.randomUUID()}.${ext}`;

            const { error: coverError } = await supabase.storage
              .from('covers')
              .upload(coverName, blob);

            if (coverError) throw coverError;

            const { data: coverData } = supabase.storage
              .from('covers')
              .getPublicUrl(coverName);

            coverUrl = coverData.publicUrl;
          } catch (base64Error) {
            console.error('Error processing extracted cover:', base64Error);
            toast({
              variant: 'destructive',
              title: t('upload.coverWarning'),
              description: t('upload.coverWarningDesc'),
            });
            // Continue without cover - don't fail the entire upload
          }
        }

        // If no cover was provided, try to fetch one automatically
        if (!coverUrl) {
          setIsFetchingCover(true);
          try {
            const fetchedCoverUrl = await fetchCoverAutomatically(
              extractedIsbn,
              formData.title.trim(),
              formData.author.trim() || undefined
            );

            if (fetchedCoverUrl) {
              // Download and store the cover in our bucket
              try {
                const coverResponse = await fetch(fetchedCoverUrl);
                const coverBlob = await coverResponse.blob();

                const ext = fetchedCoverUrl.includes('.jpg') || fetchedCoverUrl.includes('.jpeg') ? 'jpg' : 'png';
                const coverName = `${user.id}/${crypto.randomUUID()}.${ext}`;

                const { error: uploadError } = await supabase.storage
                  .from('covers')
                  .upload(coverName, coverBlob);

                if (!uploadError) {
                  const { data: coverData } = supabase.storage
                    .from('covers')
                    .getPublicUrl(coverName);

                  coverUrl = coverData.publicUrl;
                  console.log('Auto-fetched cover uploaded successfully');
                }
              } catch (fetchError) {
                console.error('Error downloading/uploading auto-fetched cover:', fetchError);
                // Continue without cover - don't fail the upload
              }
            }
          } catch (error) {
            console.error('Error in auto-fetch cover:', error);
          } finally {
            setIsFetchingCover(false);
          }
        }

        await createBook.mutateAsync({
          title: formData.title.trim(),
          author: formData.author.trim() || undefined,
          description: formData.description.trim() || undefined,
          genre_id: formData.genre_id || undefined,
          year: formData.year ? parseInt(formData.year) : undefined,
          isbn: extractedIsbn || undefined,
          file_url: fileData.publicUrl,
          file_type: fileExt.toUpperCase(),
          file_size: file.size,
          cover_url: coverUrl,
          language: selectedLanguage,
          library_id: currentLibrary.id,
        });
      }

      // Navigate to library after successful upload
      navigate('/');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        variant: 'destructive',
        title: t('upload.uploadError'),
        description: errorMessage,
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Filter books that belong to the current user
  const userBooks = books.filter(b => b.owner_id === user?.id);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-1">{t('upload.title')}</h1>
          <p className="text-muted-foreground">
            {t('upload.subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('upload.bookFile')}</CardTitle>
              <CardDescription>
                {t('upload.bookFileDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileUpload
                onFileSelect={handleFileSelect}
                selectedFile={file}
                onClear={() => setFile(null)}
                isUploading={isUploading || isExtractingMetadata}
              />
              
              {isExtractingMetadata && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t('upload.extractingMetadata')}</p>
                    <Progress value={undefined} className="h-1 mt-1" />
                  </div>
                </div>
              )}

              {/* Language Selection */}
              <div className="space-y-2">
                <Label>{t('upload.fileLanguage')}</Label>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('upload.selectLanguage')} />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('upload.languageAutoDetect')}
                </p>
              </div>
            </CardContent>
          </Card>

          {mode === 'new' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('upload.bookInfo')}</CardTitle>
                  <CardDescription>
                    {t('upload.bookInfoDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">{t('upload.titleRequired')}</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder={t('upload.titlePlaceholder')}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="author">{t('upload.author')}</Label>
                    <Input
                      id="author"
                      value={formData.author}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      placeholder={t('upload.authorPlaceholder')}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="genre">{t('upload.genre')}</Label>
                      <Select
                        value={formData.genre_id}
                        onValueChange={(v) => setFormData({ ...formData, genre_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('upload.selectGenre')} />
                        </SelectTrigger>
                        <SelectContent>
                          {genres?.map((genre) => (
                            <SelectItem key={genre.id} value={genre.id}>
                              {t(getGenreTranslationKey(genre.slug))}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="year">{t('upload.year')}</Label>
                      <Input
                        id="year"
                        type="number"
                        min="1000"
                        max={new Date().getFullYear()}
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                        placeholder="2024"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">{t('upload.description')}</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder={t('upload.descriptionPlaceholder')}
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('upload.bookCover')}</CardTitle>
                  <CardDescription>
                    {t('upload.bookCoverDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {coverPreview ? (
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      <img
                        src={coverPreview}
                        alt={t('upload.coverPreview')}
                        className="w-32 h-48 object-cover rounded-md"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleClearCover}
                        disabled={isUploading}
                      >
                        {t('upload.removeCover')}
                      </Button>
                    </div>
                  ) : (
                    <FileUpload
                      onFileSelect={handleCoverSelect}
                      accept={{
                        'image/jpeg': ['.jpg', '.jpeg'],
                        'image/png': ['.png'],
                        'image/webp': ['.webp'],
                      }}
                      maxSize={5 * 1024 * 1024}
                      label={t('upload.dragCover')}
                      description={t('upload.coverFormats')}
                      isUploading={isUploading}
                    />
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {isFetchingCover && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <div className="flex-1">
                <p className="text-sm font-medium">{t('upload.fetchingCover')}</p>
                <Progress value={undefined} className="h-1 mt-1" />
              </div>
            </div>
          )}

          {/* Mode Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('upload.uploadType')}</CardTitle>
              <CardDescription>
                {forcedExistingMode ? t('upload.addingToExisting') : t('upload.uploadTypeDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Show selected book info when forced by duplicate detection */}
              {forcedExistingMode && duplicateMatches.length === 1 && duplicateMatches[0] && (
                <div className="mb-4 p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center gap-3">
                    {duplicateMatches[0].book.cover_url ? (
                      <img
                        src={duplicateMatches[0].book.cover_url}
                        alt=""
                        className="w-12 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-16 bg-muted rounded flex items-center justify-center">
                        <BookCopy className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{duplicateMatches[0].book.title}</p>
                      {duplicateMatches[0].book.author && (
                        <p className="text-sm text-muted-foreground truncate">
                          {duplicateMatches[0].book.author}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Normal mode switch */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="mode"
                    checked={mode === 'existing'}
                    onCheckedChange={handleModeChange}
                    disabled={forcedExistingMode}
                  />
                  <Label 
                    htmlFor="mode" 
                    className={forcedExistingMode ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                  >
                    {t('upload.addToExisting')}
                  </Label>
                </div>
              </div>

              {mode === 'existing' && (
                <div className="mt-4 space-y-2">
                  <Label>{t('upload.selectBook')}</Label>
                  <Select value={selectedBookId} onValueChange={setSelectedBookId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('upload.chooseBook')} />
                    </SelectTrigger>
                    <SelectContent>
                      {userBooks.map((book) => (
                        <SelectItem key={book.id} value={book.id}>
                          <div className="flex items-center gap-2">
                            <BookCopy className="h-4 w-4 text-muted-foreground" />
                            <span>{book.title}</span>
                            {book.author && (
                              <span className="text-muted-foreground">— {book.author}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {userBooks.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      {t('upload.noBooks')}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Duplicate Book Modal */}
          <DuplicateBookSelector
            matches={duplicateMatches}
            onSelect={handleSelectDuplicateBook}
            onCreateNew={handleCreateNewDespiteDuplicates}
            isLoading={isCheckingDuplicates}
            open={showDuplicateModal}
            onOpenChange={setShowDuplicateModal}
          />

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/')}
              disabled={isUploading || isFetchingCover}
              className="flex-1"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={!file || isUploading || isFetchingCover || (mode === 'existing' && !selectedBookId)}
              className="flex-1"
            >
              {isUploading || isFetchingCover ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isFetchingCover ? t('upload.fetchingCover') : t('upload.uploading')}
                </>
              ) : mode === 'existing' ? (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('upload.addVersion')}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {t('upload.submit')}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
