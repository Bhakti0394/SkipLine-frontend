import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import '../overview-styles/Headersearch.scss';

const indianMeals = [
  { id: '1', name: 'Butter Chicken', restaurant: 'Punjab Grill', price: 249, category: 'North Indian' },
  { id: '2', name: 'Masala Dosa', restaurant: 'Saravana Bhavan', price: 129, category: 'South Indian' },
  { id: '3', name: 'Hyderabadi Biryani', restaurant: 'Paradise Biryani', price: 299, category: 'Biryani' },
  { id: '4', name: 'Pani Puri', restaurant: 'Chaat Corner', price: 79, category: 'Street Food' },
  { id: '5', name: 'Paneer Tikka', restaurant: 'Barbeque Nation', price: 199, category: 'North Indian' },
  { id: '6', name: 'Chole Bhature', restaurant: "Haldiram's", price: 149, category: 'North Indian' },
  { id: '7', name: 'Idli Sambar', restaurant: 'Madras Café', price: 99, category: 'South Indian' },
  { id: '8', name: 'Vada Pav', restaurant: 'Mumbai Street', price: 49, category: 'Street Food' },
  { id: '9', name: 'Dal Makhani', restaurant: 'Moti Mahal', price: 179, category: 'North Indian' },
  { id: '10', name: 'Gulab Jamun', restaurant: "Haldiram's", price: 89, category: 'Desserts' },
  { id: '11', name: 'Rajasthani Thali', restaurant: 'Chokhi Dhani', price: 399, category: 'Thali' },
  { id: '12', name: 'Lucknowi Biryani', restaurant: 'Tunday Kababi', price: 329, category: 'Biryani' },
];

export function HeaderSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const filteredMeals = query.length > 0
    ? indianMeals.filter(meal =>
        meal.name.toLowerCase().includes(query.toLowerCase()) ||
        meal.restaurant.toLowerCase().includes(query.toLowerCase()) ||
        meal.category.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 6)
    : [];

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMealClick = (mealId: string) => {
    navigate(`/browse?meal=${mealId}`);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className={`header-search ${isOpen ? 'header-search--open' : ''}`}>

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="header-search__button"
        >
          <Search className="header-search__button-icon" />
          <span className="header-search__button-text">Search food...</span>
        </button>
      )}

      {isOpen && (
        <div className="header-search__input-wrapper">
          <Search className="header-search__input-icon" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="    Search meals..."
            className="header-search__input"
          />
          <button
            onClick={() => { setIsOpen(false); setQuery(''); }}
            className="header-search__close-btn"
          >
            <X className="header-search__close-icon" />
          </button>
        </div>
      )}

      <AnimatePresence>
        {isOpen && query.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="header-search__dropdown"
          >
            {filteredMeals.length > 0 ? (
              <div className="header-search__results">
                {filteredMeals.map((meal, index) => (
                  <motion.button
                    key={meal.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleMealClick(meal.id)}
                    className="header-search__result-item"
                  >
                    <div className="header-search__result-icon">
                      <span>🍽️</span>
                    </div>
                    <div className="header-search__result-info">
                      <p className="header-search__result-name">{meal.name}</p>
                      <p className="header-search__result-restaurant">{meal.restaurant}</p>
                    </div>
                    <div className="header-search__result-meta">
                      <p className="header-search__result-price">₹{meal.price}</p>
                      <div className="header-search__result-time">
                        <Clock className="header-search__result-time-icon" />
                        <span>10-15m</span>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="header-search__empty">
                <p className="header-search__empty-text">No meals found for "{query}"</p>
                <button
                  onClick={() => { navigate('/browse'); setIsOpen(false); setQuery(''); }}
                  className="header-search__empty-link"
                >
                  Browse all meals →
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}