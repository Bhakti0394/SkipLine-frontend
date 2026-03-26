import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
// FIX [IMPORT-PATH]: was '@/types/dashboard' which resolves to src/types/dashboard —
// a path that does not exist. The type file lives at src/customer-types/dashboard.ts.
// Fixed to use the correct relative path.
import { MealFeedback } from '../../../customer-types/dashboard';
import { CommentsModal } from './CommentsModal';
import '../overview-styles/Mealcomments.scss';

interface MealCommentsProps {
  mealName: string;
  comments: MealFeedback[];
}

export function MealComments({ mealName, comments }: MealCommentsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (comments.length === 0) return null;

  const latestComment = comments[0];

  const handleViewAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="meal-comments" onClick={(e) => e.stopPropagation()}>
        {latestComment && (
          <p className="meal-comments__latest">
            "{latestComment.comment}"
          </p>
        )}

        {comments.length > 1 && (
          <button onClick={handleViewAll} className="meal-comments__btn">
            <MessageCircle className="meal-comments__icon" />
            View all {comments.length} reviews
          </button>
        )}
      </div>

      <CommentsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mealName={mealName}
        comments={comments}
      />
    </>
  );
}