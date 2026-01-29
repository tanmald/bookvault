import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { FileUpload } from '@/components/upload/FileUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useBooks } from '@/hooks/useBooks';
import { useGenres } from '@/hooks/useGenres';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ExtractedMetadata {
  title: string | null;
  author: string | null;
  description: string | null;
  year: number | null;
  coverBase64: string | null;
}

export default function UploadBook() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createBook } = useBooks();
  const { data: genres } = useGenres();
  const { toast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [extractedCoverBase64, setExtractedCoverBase64] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtractingMetadata, setIsExtractingMetadata] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: '',
    genre_id: '',
    year: '',
    isbn: '',
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

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-metadata`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: formDataPayload,
        }
      );

      if (!response.ok) {
        throw new Error('Failed to extract metadata');
      }

      const metadata: ExtractedMetadata = await response.json();

      // Always overwrite with new file's metadata (user can edit after)
      setFormData(prev => ({
        ...prev,
        title: metadata.title || '',
        author: metadata.author || '',
        description: metadata.description || '',
        year: metadata.year ? String(metadata.year) : '',
      }));

      // Always update cover with new file's extracted cover (unless user manually selected one)
      if (metadata.coverBase64) {
        setCoverFile(null); // Clear any manually selected cover
        setExtractedCoverBase64(metadata.coverBase64);
        setCoverPreview(metadata.coverBase64);
      } else {
        // New file has no cover - clear previous extracted cover
        setExtractedCoverBase64(null);
        setCoverPreview(null);
      }

      const hasMetadata = metadata.title || metadata.author || metadata.description || metadata.coverBase64;
      
      if (hasMetadata) {
        toast({
          title: 'Metadados extraídos',
          description: 'Os campos foram preenchidos automaticamente',
        });
      } else {
        toast({
          title: 'Sem metadados',
          description: 'Não foram encontrados metadados neste ficheiro',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Error extracting metadata:', error);
      // Silently fail - user can still fill in manually
    } finally {
      setIsExtractingMetadata(false);
    }
  }, [coverFile, coverPreview, toast]);

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    extractMetadata(selectedFile);
  }, [extractMetadata]);

  const handleCoverSelect = (coverFileSelected: File) => {
    setCoverFile(coverFileSelected);
    setExtractedCoverBase64(null); // Clear extracted cover when user selects one
    const reader = new FileReader();
    reader.onload = (e) => setCoverPreview(e.target?.result as string);
    reader.readAsDataURL(coverFileSelected);
  };

  const handleClearCover = () => {
    setCoverFile(null);
    setCoverPreview(null);
    setExtractedCoverBase64(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file || !user) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Por favor seleciona um ficheiro',
      });
      return;
    }

    if (!formData.title.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'O título é obrigatório',
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

      let coverUrl: string | undefined;

      // Upload cover if provided (either user-selected file or extracted from ebook)
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
        // Convert base64 to blob and upload
        const base64Data = extractedCoverBase64.split(',')[1];
        const mimeType = extractedCoverBase64.split(';')[0].split(':')[1] || 'image/jpeg';
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
      }

      // Create book record
      await createBook.mutateAsync({
        title: formData.title.trim(),
        author: formData.author.trim() || undefined,
        description: formData.description.trim() || undefined,
        genre_id: formData.genre_id || undefined,
        year: formData.year ? parseInt(formData.year) : undefined,
        isbn: formData.isbn.trim() || undefined,
        file_url: fileData.publicUrl,
        file_type: fileExt.toUpperCase(),
        file_size: file.size,
        cover_url: coverUrl,
      });

      navigate('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao fazer upload',
        description: error.message,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-1">Adicionar Livro</h1>
          <p className="text-muted-foreground">
            Faz upload de um novo livro para a tua biblioteca
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ficheiro do Livro</CardTitle>
              <CardDescription>
                Seleciona o ficheiro do ebook
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
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
                    <p className="text-sm font-medium">A extrair metadados...</p>
                    <Progress value={undefined} className="h-1 mt-1" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações do Livro</CardTitle>
              <CardDescription>
                Preenche os detalhes do livro
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Nome do livro"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="author">Autor</Label>
                <Input
                  id="author"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  placeholder="Nome do autor"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="genre">Género</Label>
                  <Select
                    value={formData.genre_id}
                    onValueChange={(v) => setFormData({ ...formData, genre_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {genres?.map((genre) => (
                        <SelectItem key={genre.id} value={genre.id}>
                          {genre.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year">Ano</Label>
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
                <Label htmlFor="isbn">ISBN</Label>
                <Input
                  id="isbn"
                  value={formData.isbn}
                  onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                  placeholder="978-3-16-148410-0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Sinopse ou descrição do livro..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Capa do Livro</CardTitle>
              <CardDescription>
                Opcional - adiciona uma imagem de capa
              </CardDescription>
            </CardHeader>
            <CardContent>
              {coverPreview ? (
                <div className="flex items-start gap-4">
                  <img
                    src={coverPreview}
                    alt="Pré-visualização da capa"
                    className="w-32 h-48 object-cover rounded-md"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClearCover}
                    disabled={isUploading}
                  >
                    Remover
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
                  label="Arrasta uma imagem de capa"
                  description="JPG, PNG ou WebP até 5MB"
                  isUploading={isUploading}
                />
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/')}
              disabled={isUploading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!file || isUploading} className="flex-1">
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A carregar...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Adicionar Livro
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
