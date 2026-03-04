import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Plus, Trash2, Clock, Star, Sparkles, ShoppingBag } from 'lucide-react';
import { DashboardLayout } from '../../components/CustomerDashboard/layout/DashboardLayout';
import { Button } from '../../components/ui/button';
import { Meal } from '../../customer-types/dashboard';
import { toast } from '../../customer-hooks/use-toast';
import { useFavorites } from '../../customer-hooks/useFavorites';
import { useNavigate } from 'react-router-dom';
import { OrderModal } from '../../components/CustomerDashboard/dashboard/OrderModal';
import '../../components/CustomerDashboard/styles/Favorites.scss';

// Floating particles for premium effect
const FloatingParticles = () => (
  <div className="favorites__particles">
    {[...Array(8)].map((_, i) => (
      <motion.div
        key={i}
        className="favorites__particle"
        initial={{ opacity: 0 }}
        animate={{
          x: [0, Math.random() * 100 - 50],
          y: [0, Math.random() * 100 - 50],
          opacity: [0, 0.6, 0],
          scale: [0, 1, 0],
        }}
        transition={{
          duration: 3 + Math.random() * 2,
          repeat: Infinity,
          delay: i * 0.3,
        }}
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          width: `${4 + Math.random() * 8}px`,
          height: `${4 + Math.random() * 8}px`,
        }}
      />
    ))}
  </div>
);

export default function Favorites() {
  const { favorites, removeFavorite } = useFavorites();
  const navigate = useNavigate();
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeFavorite(id);
    toast({
      title: "Removed from favorites",
      description: "The item has been removed from your favorites",
    });
  };

  const handleQuickOrder = (meal: Meal, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMeal(meal);
    setIsModalOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="favorites">
        <FloatingParticles />

        {/* Hero Section */}
        <div className="favorites__hero">
          <div className="favorites__hero-gradient">
            <motion.div
              className="favorites__hero-gradient-orb favorites__hero-gradient-orb--1"
              animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
              transition={{ duration: 20, repeat: Infinity }}
            />
            <motion.div
              className="favorites__hero-gradient-orb favorites__hero-gradient-orb--2"
              animate={{ scale: [1, 1.3, 1], rotate: [0, -90, 0] }}
              transition={{ duration: 25, repeat: Infinity }}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="favorites__header"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="favorites__title-badge"
            >
              <Heart className="favorites__title-badge-icon" fill="currentColor" />
              <span>Your Collection</span>
            </motion.div>

            <h1 className="favorites__title">
              Your <span className="favorites__title-grad">Favorites</span>
            </h1>
            <p className="favorites__subtitle">
              Quick access to your go-to meals • {favorites.length} saved
            </p>
          </motion.div>
        </div>

        {/* Meals Grid */}
        <div className="favorites__list">
          <AnimatePresence mode="popLayout">
            {favorites.map((meal, index) => (
              <motion.div
                key={meal.id}
                layout
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                transition={{
                  delay: index * 0.05,
                  layout: { duration: 0.3 },
                }}
                className="favorites__card"
              >
                <div className="favorites__card-glow" />

                {/* Image Section */}
                <div className="favorites__image-wrapper">
                  <img
                    src={meal.image}
                    alt={meal.name}
                    className="favorites__image"
                  />
                  <div className="favorites__hover-overlay" />

                  {/* Heart Badge */}
                  <div className="favorites__heart-badge">
                    <motion.div
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Heart className="favorites__heart-icon" fill="currentColor" />
                    </motion.div>
                  </div>

                  {/* Quick Actions */}
                  <div className="favorites__quick-actions">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => handleRemove(meal.id, e)}
                      className="favorites__action-btn favorites__action-btn--remove"
                    >
                      <Trash2 className="favorites__action-icon" />
                    </motion.button>
                  </div>

                  {/* Quick Order Button */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => handleQuickOrder(meal, e)}
                    className="favorites__order-btn"
                  >
                    <Plus className="favorites__order-icon" />
                  </motion.button>
                </div>

                {/* Content */}
                <div className="favorites__content">
                  <div className="favorites__info">
                    <div className="favorites__name-wrapper">
                      <h3 className="favorites__name">{meal.name}</h3>
                      <p className="favorites__restaurant">{meal.restaurant}</p>
                    </div>
                    <span className="favorites__price">₹{meal.price}</span>
                  </div>

                  <div className="favorites__meta">
                    <div className="favorites__meta-item">
                      <Clock className="favorites__meta-icon" />
                      <span>{meal.prepTime}m</span>
                    </div>
                    <div className="favorites__meta-item">
                      <Star className="favorites__meta-icon favorites__meta-icon--star" fill="currentColor" />
                      <span>{meal.rating}</span>
                    </div>
                    <div className="favorites__meta-item favorites__meta-item--category">
                      <span>{meal.category}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Empty State */}
          {favorites.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="favorites__empty"
            >
              <div className="favorites__empty-icon-wrapper">
                <Heart className="favorites__empty-icon" />
              </div>
              <h3 className="favorites__empty-title">No Favorites Yet</h3>
              <p className="favorites__empty-description">
                Start adding meals to your favorites for quick access
              </p>
              <Button
                onClick={() => navigate('/browse')}
                className="favorites__empty-btn"
              >
                <ShoppingBag className="favorites__empty-btn-icon" />
                Browse Menu
              </Button>
            </motion.div>
          )}
        </div>

        {/* Order Modal */}
        <OrderModal
          meal={selectedMeal}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedMeal(null);
          }}
        />
      </div>
    </DashboardLayout>
  );
}