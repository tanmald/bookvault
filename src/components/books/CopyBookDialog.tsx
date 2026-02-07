import React, { useState } from 'react';
import { ArrowRight, Loader2, Plus, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLibrary } from '@/contexts/LibraryContext';
import { useCopyBookToLibrary } from '@/hooks/useCopyBookToLibrary';
import { useLibraries } from '@/hooks/useLibraries';
import { CreateLibraryDialog } from '@/components/library/CreateLibraryDialog';

interface CopyBookDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookId: string;
  bookTitle: string;
  currentLibraryId: string;
  onSuccess?: () => void;
}

export function CopyBookDialog({
  isOpen,
  onClose,
  bookId,
  bookTitle,
  currentLibraryId,
  onSuccess,
}: CopyBookDialogProps) {
  const { t } = useLanguage();
  const { libraries } = useLibrary();
  const { createLibrary } = useLibraries();
  const copyBook = useCopyBookToLibrary();
  
  const [selectedLibraryId, setSelectedLibraryId] = useState<string>('');
  const [copyProgress, setCopyProgress] = useState(true);
  const [showCreateLibrary, setShowCreateLibrary] = useState(false);

  // Filter out current library
  const availableLibraries = libraries.filter(lib => lib.id !== currentLibraryId);

  const handleCopy = async () => {
    if (!selectedLibraryId) return;

    await copyBook.mutateAsync({
      sourceBookId: bookId,
      targetLibraryId: selectedLibraryId,
      copyProgress,
    });

    onClose();
    onSuccess?.();
  };

  const handleCreateLibrarySuccess = (newLibrary: { id: string }) => {
    setShowCreateLibrary(false);
    setSelectedLibraryId(newLibrary.id);
  };

  return (
    <>
      <Dialog open={isOpen && !showCreateLibrary} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              Copiar para Biblioteca
            </DialogTitle>
            <DialogDescription>
              Seleciona a biblioteca de destino para "{bookTitle}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {availableLibraries.length === 0 ? (
              <div className="text-center py-8 space-y-4">
                <Library className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">Não estás em nenhuma outra biblioteca</p>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateLibrary(true)}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Criar nova biblioteca
                </Button>
              </div>
            ) : (
              <>
                {/* Library Selection */}
                <div className="space-y-3">
                  <Label>Selecionar biblioteca</Label>
                  <RadioGroup
                    value={selectedLibraryId}
                    onValueChange={setSelectedLibraryId}
                    className="space-y-2"
                  >
                    {availableLibraries.map((library) => (
                      <div
                        key={library.id}
                        className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                        onClick={() => setSelectedLibraryId(library.id)}
                      >
                        <RadioGroupItem value={library.id} id={library.id} />
                        <Label
                          htmlFor={library.id}
                          className="flex-1 cursor-pointer font-normal"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{library.name}</span>
                            {library.description && (
                              <span className="text-sm text-muted-foreground truncate">
                                {library.description}
                              </span>
                            )}
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Create New Library Option */}
                <Button
                  variant="outline"
                  onClick={() => setShowCreateLibrary(true)}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Criar nova biblioteca
                </Button>

                {/* Copy Progress Checkbox */}
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="copyProgress"
                    checked={copyProgress}
                    onCheckedChange={(checked) => setCopyProgress(checked as boolean)}
                  />
                  <Label
                    htmlFor="copyProgress"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Copiar progresso atual de leitura
                  </Label>
                </div>

                {/* Copy Button */}
                <Button
                  onClick={handleCopy}
                  disabled={!selectedLibraryId || copyBook.isPending}
                  className="w-full"
                >
                  {copyBook.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      A copiar...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Copiar Livro
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Library Dialog */}
      <CreateLibraryDialog
        open={showCreateLibrary}
        onOpenChange={(open) => {
          setShowCreateLibrary(open);
          if (!open && !selectedLibraryId) {
            // If closing without creating, stay on copy dialog
          }
        }}
      />
    </>
  );
}
