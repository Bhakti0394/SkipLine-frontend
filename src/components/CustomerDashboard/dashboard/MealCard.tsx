import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Star, Plus, Heart, Zap, ImageOff, MessageCircle, X } from 'lucide-react';
import { Meal, MealFeedback } from '../../../customer-types/dashboard';
import { MealComments } from './MealComments';
import { MenuItemReviewDto, submitMenuItemReview, fetchMenuItemReviews } from '../../../kitchen-api/kitchenApi';
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
  reviews?:           MenuItemReviewDto[];
  onReviewsUpdated?:  (menuItemId: string, avg: number, total: number) => void;
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
  reviews = [],
  onReviewsUpdated,
}: MealCardProps) {
  const displayRating = averageRating ?? meal.rating;
  const [imgState,       setImgState]       = useState<'loading' | 'loaded' | 'error'>('loading');
  const [showReviews,    setShowReviews]    = useState(false);
const [localReviews, setLocalReviews] = useState<MenuItemReviewDto[]>(reviews);

  // Sync when parent finishes fetching reviews from backend
  useEffect(() => {
    if (reviews.length > 0) setLocalReviews(reviews);
  }, [reviews]);
  const [userRating,     setUserRating]     = useState(0);
  const [hoverRating,    setHoverRating]    = useState(0);
  const [userComment,    setUserComment]    = useState('');
  const [submitting,     setSubmitting]     = useState(false);
  const [submitted,      setSubmitted]      = useState(false);
  const [localAvgRating, setLocalAvgRating] = useState<number | null>(averageRating ?? null);

  // Sync avg rating when parent finishes fetching
  useEffect(() => {
    if (averageRating != null) setLocalAvgRating(averageRating);
  }, [averageRating]);
  const isLoggedIn = !!localStorage.getItem('auth_token');
  const currentAvg = localAvgRating ?? meal.rating;
  const totalReviews = localReviews.length;

  async function handleSubmitReview() {
    if (userRating === 0 || submitting) return;
    setSubmitting(true);
    const result = await submitMenuItemReview(meal.id, userRating, userComment);
    if (result) {
      const fresh = await fetchMenuItemReviews(meal.id);
      setLocalReviews(fresh);
      setLocalAvgRating(result.avgRating);
      setSubmitted(true);
      setUserComment('');
      onReviewsUpdated?.(meal.id, result.avgRating, result.totalReviews);
    }
    setSubmitting(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="meal-card"
    >
      <div className="meal-card__image">

        {imgState === 'loading' && (
          <div className="meal-card__skeleton" aria-hidden="true" />
        )}

        {imgState === 'error' && (
          <div className="meal-card__img-error" aria-label="Image unavailable">
            <ImageOff size={32} />
          </div>
        )}

        {/*
          CRITICAL: Do NOT add loading="lazy" or loading="eager".
          Edge browser intercepts the loading attribute and replaces ALL images
          with blank placeholders regardless of the value set.
          Omitting it entirely forces the browser default (eager) and bypasses
          the Edge intervention completely.
        */}
        <img
          src={meal.image}
          alt={meal.name}
          decoding="async"
          width={400}
          height={300}
          style={{
            opacity: imgState === 'loaded' ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
          onLoad={() => setImgState('loaded')}
          onError={() => setImgState('error')}
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
         <button
            className="meal-card__meta-item meal-card__meta-item--clickable"
            onClick={e => { e.stopPropagation(); setShowReviews(true); }}
          >
            <Star className="meal-card__star meal-card__star--filled" />
            <span>{currentAvg.toFixed(1)}</span>
            <span className="meal-card__comment-count">
              ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 8 }}>
              <MessageCircle size={15} style={{ opacity: 0.8 }} />
            </span>
          </button>
        </div>

      </div>

      {/* Reviews Portal — renders on document.body, escapes overflow:hidden */}
      {createPortal(
        <AnimatePresence>
          {showReviews && (
            <motion.div
              className="meal-card__reviews-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReviews(false)}
            >
              <motion.div
                className="meal-card__reviews-panel"
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="meal-card__reviews-header">
                  <div>
                    <h4 className="meal-card__reviews-title">{meal.name}</h4>
                    <div className="meal-card__reviews-summary">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={14}
                          fill={s <= Math.round(currentAvg) ? '#FF6B2C' : 'none'}
                          stroke={s <= Math.round(currentAvg) ? '#FF6B2C' : '#666'}
                        />
                      ))}
                      <span style={{ marginLeft: 6, fontSize: '0.8rem', opacity: 0.8 }}>
                        {currentAvg.toFixed(1)} · {totalReviews} reviews
                      </span>
                    </div>
                  </div>
                  <button className="meal-card__reviews-close"
                    onClick={() => setShowReviews(false)}>
                    <X size={18} />
                  </button>
                </div>

                {/* Write review — only for logged in users */}
                {isLoggedIn && !submitted && (
                  <div className="meal-card__write-review">
                    <p className="meal-card__write-review-label">Your Rating</p>
                    <div className="meal-card__write-stars">
                      {[1,2,3,4,5].map(s => (
                        <button key={s}
                          onMouseEnter={() => setHoverRating(s)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setUserRating(s)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>
                          <Star size={22}
                            fill={(hoverRating || userRating) >= s ? '#FF6B2C' : 'none'}
                            stroke={(hoverRating || userRating) >= s ? '#FF6B2C' : '#666'}
                          />
                        </button>
                      ))}
                    </div>
                    <textarea
                      className="meal-card__write-comment"
                      placeholder="Share your experience (optional)..."
                      value={userComment}
                      onChange={e => setUserComment(e.target.value)}
                      rows={2}
                      maxLength={200}
                    />
                    <button
                      className="meal-card__submit-review"
                      disabled={userRating === 0 || submitting}
                      onClick={handleSubmitReview}
                    >
                      {submitting ? 'Posting...' : 'Post Review'}
                    </button>
                  </div>
                )}

                {submitted && (
                  <div className="meal-card__review-thanks">
                    ✅ Thanks for your review!
                  </div>
                )}

                {!isLoggedIn && (
                  <div className="meal-card__review-login-hint">
                    Login to leave a review
                  </div>
                )}

                {/* Reviews list */}
                <div className="meal-card__reviews-list">
                  {localReviews.length === 0 ? (
                    <p className="meal-card__reviews-empty">
                      No reviews yet — be the first!
                    </p>
                  ) : (
                    localReviews.map(r => (
                      <div key={r.id} className="meal-card__review-item">
                        <div className="meal-card__review-item-header">
                          <span className="meal-card__review-author">
                            {r.customerName}
                          </span>
                          <div style={{ display: 'flex', gap: 2 }}>
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} size={11}
                                fill={s <= r.rating ? '#FF6B2C' : 'none'}
                                stroke={s <= r.rating ? '#FF6B2C' : '#666'}
                              />
                            ))}
                          </div>
                          <span className="meal-card__review-date">
                            {new Date(r.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short'
                            })}
                          </span>
                        </div>
                        {r.comment && (
                          <p className="meal-card__review-comment">{r.comment}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
}



