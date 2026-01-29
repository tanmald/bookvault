import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
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
} from 'lucide-react';

const statusLabels: Record<ReadingStatus, string> = {
  to_read: 'Para Ler',
  reading: 'A Ler',
  read: 'Lido',
};

export default function BookDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { books, isLoading, deleteBook, deleteBookFile } = useBooks();
  const { progress, updateProgress } = useReadingProgress(id);

  const book = books.find((b) => b.id === id);
  const bookProgress = progress.find((p) => p.book_id === id);
  const currentStatus = bookProgress?.status ?? 'to_read';
  const currentProgress = bookProgress?.progress ?? 0;

  const isOwner = book?.owner_id === user?.id;

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
          <h2 className="text-xl font-semibold mb-2">Livro não encontrado</h2>
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar à biblioteca
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
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

          {isOwner && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full text-destructive hover:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar Livro
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tens a certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. O livro e todos os dados associados serão eliminados permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Eliminar
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
                {book.genre.name}
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
                {bookFiles.length} {bookFiles.length === 1 ? 'versão' : 'versões'}
              </Badge>
            )}
          </div>

          {/* Book Versions Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Versões Disponíveis</CardTitle>
              {isOwner && (
                <Link to={`/upload?bookId=${book.id}`}>
                  <Button size="sm" variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar
                  </Button>
                </Link>
              )}
            </CardHeader>
            <CardContent>
              <BookVersionsList
                files={bookFiles}
                isOwner={isOwner}
                onDeleteFile={handleDeleteFile}
                isDeleting={deleteBookFile.isPending}
              />
            </CardContent>
          </Card>

          {/* Reading Progress Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Progresso de Leitura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium w-16">Estado:</span>
                <Select value={currentStatus} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="to_read">Para Ler</SelectItem>
                    <SelectItem value="reading">A Ler</SelectItem>
                    <SelectItem value="read">Lido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {currentStatus === 'reading' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Progresso:</span>
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
                  <span>✓ Livro concluído</span>
                  {bookProgress?.finished_at && (
                    <span>
                      em {new Date(bookProgress.finished_at).toLocaleDateString('pt-PT')}
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
                <CardTitle className="text-lg">Descrição</CardTitle>
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
              <CardTitle className="text-lg">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Adicionado em:</span>
                <span>{new Date(book.created_at).toLocaleDateString('pt-PT')}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
