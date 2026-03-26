import { Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
// FIX [IMPORT-PATH]: was '@/types/dashboard' which resolves to src/types/dashboard —
// a path that does not exist. The type file lives at src/customer-types/dashboard.ts.
// Fixed to use the correct relative path.
import { MealFeedback } from '../../../customer-types/dashboard';
import '../overview-styles/Commentsmodal.scss';

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mealName: string;
  comments: MealFeedback[];
}

export function CommentsModal({ isOpen, onClose, mealName, comments }: CommentsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="comments-modal"
        onPointerDownOutside={(e) => e.stopPropagation()}
        onInteractOutside={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="comments-modal__title">
            Reviews for {mealName}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="comments-modal__scroll">
          <div className="comments-modal__list">
            {comments.length === 0 ? (
              <p className="comments-modal__empty">No reviews yet</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="comment-card">
                  <div className="comment-card__header">
                    <span className="comment-card__user">{comment.userName}</span>
                    <div className="comment-card__stars">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`comment-card__star ${
                            i < comment.rating ? 'comment-card__star--filled' : ''
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="comment-card__text">{comment.comment}</p>
                  <p className="comment-card__date">
                    {new Date(comment.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}