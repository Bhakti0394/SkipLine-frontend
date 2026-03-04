import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import '../overview-styles/Feedbackcard.scss';

interface FeedbackCardProps {
  mealName: string;
  onSubmit: (rating: number, comment: string) => void;
  onSkip: () => void;
}

export function FeedbackCard({ mealName, onSubmit, onSkip }: FeedbackCardProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    if (rating > 0) {
      onSubmit(rating, comment);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="feedback-card"
    >
      <div className="feedback-card__header">
        <h3 className="feedback-card__title">How was your order?</h3>
        <p className="feedback-card__subtitle">{mealName}</p>
      </div>

      {/* Star Rating */}
      <div className="feedback-card__stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="feedback-card__star-btn"
          >
            <Star
              className={`feedback-card__star ${
                star <= (hoveredRating || rating) ? 'feedback-card__star--filled' : ''
              }`}
            />
          </button>
        ))}
      </div>

      {/* Comment Input */}
      <Textarea
        placeholder="Share your experience (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="feedback-card__textarea"
        maxLength={200}
      />

      {/* Helper Text */}
      <p className="feedback-card__helper">
        Your feedback helps us improve pickup timing and food quality.
      </p>

      {/* Action Buttons */}
      <div className="feedback-card__actions">
        <Button
          variant="ghost"
          onClick={onSkip}
          className="feedback-card__btn feedback-card__btn--skip"
        >
          Skip
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={rating === 0}
          className="feedback-card__btn feedback-card__btn--submit"
        >
          Submit
        </Button>
      </div>
    </motion.div>
  );
}