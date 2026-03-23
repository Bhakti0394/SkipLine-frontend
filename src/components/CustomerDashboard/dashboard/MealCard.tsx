import { motion } from 'framer-motion';
import { Clock, Star, Plus, Heart, Zap } from 'lucide-react';
import { Meal, MealFeedback } from '../../../customer-types/dashboard';
import { MealComments } from './MealComments';
import '../overview-styles/Mealcard.scss';

interface MealCardProps {
  meal:               Meal;
  onOrder:            (meal: Meal) => void;
  delay?:             number;
  averageRating?:     number | null;
  comments?:          MealFeedback[];
  isFavorite?:        boolean;
  onToggleFavorite?:  (meal: Meal) => void;
  index?:             number;
}

export function MealCard({
  meal,
  onOrder,
  delay = 0,
  averageRating,
  comments = [],
  isFavorite = false,
  onToggleFavorite,
  index = 0,
}: MealCardProps) {
  const displayRating = averageRating ?? meal.rating;

  // Cards 0–5 (first two rows) are always above the fold — load immediately.
  // Cards 6+ are deferred until they approach the viewport.
  const loadingStrategy: 'eager' | 'lazy' = index < 6 ? 'eager' : 'lazy';

  // Spread trick: passing fetchpriority as a plain object bypasses TS JSX
  // attribute checking entirely — no @ts-ignore and no extra .d.ts file.
  // The attribute stays lowercase, which is what the browser requires.
  // React 18 silently drops the camelCase fetchPriority version, which was
  // causing the browser intervention and slow image loads.
  const imgPriority = { fetchpriority: index < 3 ? 'high' : 'auto' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="meal-card"
    >
      <div className="meal-card__image">
        <img
          src={meal.image}
          alt={meal.name}
          loading={loadingStrategy}
          {...imgPriority}
          width={400}
          height={300}
          decoding="async"
        />
        <div className="meal-card__overlay" />

        {meal.isExpress && (
          <motion.div
            className="meal-card__express-badge"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: delay + 0.2, type: 'spring', stiffness: 200 }}
          >
            <Zap className="meal-card__express-icon" />
            <span>EXPRESS</span>
          </motion.div>
        )}

        {onToggleFavorite && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(meal); }}
            className="meal-card__favorite"
          >
            <Heart className={`meal-card__heart ${isFavorite ? 'meal-card__heart--active' : ''}`} />
          </motion.button>
        )}

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => { e.stopPropagation(); onOrder(meal); }}
          className="meal-card__add-btn"
        >
          <Plus className="meal-card__add-icon" />
        </motion.button>

        <div className="meal-card__category"><span>{meal.category}</span></div>
      </div>

      <div className="meal-card__content" onClick={() => onOrder(meal)}>
        <div className="meal-card__header">
          <div className="meal-card__info">
            <h3 className="meal-card__title">{meal.name}</h3>
            <p className="meal-card__restaurant">{meal.restaurant}</p>
          </div>
          <span className="meal-card__price">&#8377;{meal.price}</span>
        </div>
        <div className="meal-card__meta">
          <div className="meal-card__meta-item">
            <Clock className="meal-card__icon" />
            <span>{meal.prepTime} min</span>
          </div>
          <div className="meal-card__meta-item">
            <Star className="meal-card__star" />
            <span>{displayRating.toFixed(1)}</span>
            {comments.length > 0 && (
              <span className="meal-card__comment-count">({comments.length})</span>
            )}
          </div>
        </div>
        {comments.length > 0 && (
          <div className="meal-card__comments">
            <MealComments mealName={meal.name} comments={comments} />
          </div>
        )}
      </div>
    </motion.div>
  );
}