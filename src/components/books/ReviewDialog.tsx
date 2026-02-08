import React, { useState, useEffect } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReviews } from '@/hooks/useReviews';

interface ReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookId: string;
  onSubmit: () => void;
  onCancel?: () => void;
}

const MAX_COMMENT_LENGTH = 200;

export function ReviewDialog({
  isOpen,
  onClose,
  bookId,
  onSubmit,
  onCancel,
}: ReviewDialogProps) {
  const { t } = useLanguage();
  const { myReview, upsertReview } = useReviews(bookId);
  
  const [rating, setRating] = useState<number>(0);
  const [content, setContent] = useState<string>('');
  const [hoverRating, setHoverRating] = useState<number>(0);

  // Load existing review when dialog opens
  useEffect(() => {
    if (isOpen && myReview) {
      setRating(myReview.rating);
      setContent(myReview.content || '');
    } else if (isOpen) {
      setRating(0);
      setContent('');
    }
  }, [isOpen, myReview]);

  const handleSubmit = async () => {
    if (rating > 0) {
      await upsertReview.mutateAsync({
        bookId,
        rating,
        content: content.trim() || undefined,
      });
    }

    onSubmit();
    onClose();
  };

  const handleCancel = () => {
    onCancel?.();
    onClose();
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_COMMENT_LENGTH) {
      setContent(value);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            {t('review.title')}
          </DialogTitle>
          <DialogDescription>
            {t('review.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="space-y-2">
            <Label>{t('review.rating')}</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="p-1 hover:scale-110 transition-transform"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoverRating || rating)
                        ? 'fill-accent text-accent'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="review-content">
              {t('review.comment')}
              <span className="text-muted-foreground font-normal ml-1">
                ({t('review.optional')})
              </span>
            </Label>
            <Textarea
              id="review-content"
              placeholder={t('review.commentPlaceholder')}
              value={content}
              onChange={handleContentChange}
              rows={4}
              className="resize-none"
            />
            <div className="flex justify-end">
              <span
                className={`text-xs ${
                  content.length >= MAX_COMMENT_LENGTH
                    ? 'text-destructive'
                    : 'text-muted-foreground'
                }`}
              >
                {content.length}/{MAX_COMMENT_LENGTH}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {t('review.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={upsertReview.isPending}
          >
            {upsertReview.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('review.saving')}
              </>
            ) : (
              t('review.submit')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
