import { motion } from 'framer-motion';
import { Clock, Star, Plus, Heart, Zap } from 'lucide-react';
import { Meal, MealFeedback } from '@/types/dashboard';
import { MealComments } from './MealComments';
import '../overview-styles/Mealcard.scss';

interface MealCardProps {
  meal: Meal;
  onOrder: (meal: Meal) => void;
  delay?: number;
  averageRating?: number | null;
  comments?: MealFeedback[];
  isFavorite?: boolean;
  onToggleFavorite?: (meal: Meal) => void;
}

export function MealCard({ 
  meal, 
  onOrder, 
  delay = 0, 
  averageRating, 
  comments = [],
  isFavorite = false,
  onToggleFavorite
}: MealCardProps) {
  const displayRating = averageRating ?? meal.rating;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="meal-card"
    >
      <div className="meal-card__image">
        <img src={meal.image} alt={meal.name} loading="lazy" />
        <div className="meal-card__overlay" />
        
        {/* Express Badge */}
        {meal.isExpress && (
          <motion.div 
            className="meal-card__express-badge"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              delay: delay + 0.2,
              type: "spring",
              stiffness: 200 
            }}
          >
            <Zap className="meal-card__express-icon" />
            <span>EXPRESS</span>
          </motion.div>
        )}
        
        {onToggleFavorite && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(meal);
            }}
            className="meal-card__favorite"
          >
            <Heart className={`meal-card__heart ${isFavorite ? 'meal-card__heart--active' : ''}`} />
          </motion.button>
        )}
        
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            e.stopPropagation();
            onOrder(meal);
          }}
          className="meal-card__add-btn"
        >
          <Plus className="meal-card__add-icon" />
        </motion.button>

        <div className="meal-card__category">
          <span>{meal.category}</span>
        </div>
      </div>

      <div className="meal-card__content" onClick={() => onOrder(meal)}>
        <div className="meal-card__header">
          <div className="meal-card__info">
            <h3 className="meal-card__title">{meal.name}</h3>
            <p className="meal-card__restaurant">{meal.restaurant}</p>
          </div>
          <span className="meal-card__price">₹{meal.price}</span>
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