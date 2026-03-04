import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion';
import { Search, Star, Zap, Clock, Sparkles, ArrowRight, Calendar, Package, Award, Users, ChefHat, X, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { DashboardLayout } from '../../components/CustomerDashboard/layout/DashboardLayout';
import { MealCard } from '../../components/CustomerDashboard/dashboard/MealCard';
import { OrderModal } from '../../components/CustomerDashboard/dashboard/OrderModal';
import { CartButton } from '../../components/CustomerDashboard/dashboard/CartButton';
import { Meal } from '../../customer-types/dashboard';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useFeedback } from '../../customer-hooks/useFeedback';
import { useFavorites } from '../../customer-hooks/useFavorites';
import '../../components/CustomerDashboard/styles/Browsemenu.scss';
import butterChicken from '../../customer-assets/butter-chicken.jpg';
import masalaDosa from '../../customer-assets/masala-dosa.jpg';
import hydrebadiBiryani from '../../customer-assets/hydrebadi-biryani.jpg';
import pizza from '../../customer-assets/pizza.jpg';
import paneerTikka from '../../customer-assets/paneer-tikka.jpg';
import choleBhature from '../../customer-assets/chole-bhature.jpg';
import idliSambhar from '../../customer-assets/idli-sambhar.jpg';
import vadaPav from '../../customer-assets/vada-pav.jpg';
import dalMakhani from '../../customer-assets/dal-makhani.jpg';
import gulabJamun from '../../customer-assets/gulab-jamun.jpg';
import rajasthaniThali from '../../customer-assets/rajasthani-thali.jpg';
import lucknowiBiryani from '../../customer-assets/lucknowi-biryani.jpg';
import samosa from '../../customer-assets/samosa.jpg';
import chocolateDonut from '../../customer-assets/chocolate-donuts.jpg';
import poha from '../../customer-assets/poha.jpg';

const categories = ['All', 'Express', 'North Indian', 'South Indian', 'Street Food', 'Biryani', 'Thali', 'Desserts'];

const indianMeals: Meal[] = [
  { id: '1', name: 'Butter Chicken', restaurant: '', image: butterChicken, price: 249, prepTime: 15, rating: 4.9, category: 'North Indian' },
  { id: '2', name: 'Masala Dosa', restaurant: '', image: masalaDosa, price: 129, prepTime: 10, rating: 4.8, category: 'South Indian' },
  { id: '3', name: 'Hyderabadi Biryani', restaurant: '', image: hydrebadiBiryani, price: 299, prepTime: 20, rating: 4.9, category: 'Biryani' },
  { id: '4', name: 'Cheese Pizza', restaurant: '', image: pizza, price: 149, prepTime: 10, rating: 4.6, category: 'Pizza', isExpress: true },
  { id: '5', name: 'Paneer Tikka', restaurant: '', image: paneerTikka, price: 199, prepTime: 12, rating: 4.8, category: 'North Indian' },
  { id: '6', name: 'Chole Bhature', restaurant: '', image: choleBhature, price: 149, prepTime: 10, rating: 4.6, category: 'North Indian', isExpress: true },
  { id: '7', name: 'Idli Sambar', restaurant: '', image: idliSambhar, price: 99, prepTime: 8, rating: 4.7, category: 'South Indian', isExpress: true },
  { id: '8', name: 'Vada Pav', restaurant: '', image: vadaPav, price: 49, prepTime: 5, rating: 4.5, category: 'Street Food', isExpress: true },
  { id: '9', name: 'Dal Makhani', restaurant: '', image: dalMakhani, price: 179, prepTime: 15, rating: 4.8, category: 'North Indian' },
  { id: '10', name: 'Gulab Jamun', restaurant: '', image: gulabJamun, price: 89, prepTime: 5, rating: 4.9, category: 'Desserts', isExpress: true },
  { id: '11', name: 'Rajasthani Thali', restaurant: '', image: rajasthaniThali, price: 399, prepTime: 20, rating: 4.9, category: 'Thali' },
  { id: '12', name: 'Lucknowi Biryani', restaurant: '', image: lucknowiBiryani, price: 329, prepTime: 25, rating: 4.8, category: 'Biryani' },
  { id: '13', name: 'Samosa (2 pcs)', restaurant: '', image: samosa, price: 40, prepTime: 5, rating: 4.6, category: 'Street Food', isExpress: true },
  { id: '14', name: 'Chocolate Donut', restaurant: '', image: chocolateDonut, price: 45, prepTime: 3, rating: 4.5, category: 'Desserts', isExpress: true },
  { id: '15', name: 'Poha', restaurant: '', image: poha, price: 60, prepTime: 8, rating: 4.5, category: 'South Indian', isExpress: true },
];

const FloatingParticles = () => {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 10 + Math.random() * 10,
    size: 2 + Math.random() * 4,
  }));

  return (
    <div className="browse__particles" aria-hidden="true">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="browse__particle"
          initial={{ x: `${particle.x}vw`, y: `${particle.y}vh`, opacity: 0, scale: 0 }}
          animate={{
            y: [`${particle.y}vh`, `${particle.y - 30}vh`, `${particle.y}vh`],
            x: [`${particle.x}vw`, `${particle.x + 10}vw`, `${particle.x}vw`],
            opacity: [0, 0.6, 0],
            scale: [0, 1, 0],
          }}
          transition={{ duration: particle.duration, delay: particle.delay, repeat: Infinity, ease: "easeInOut" }}
          style={{ width: particle.size, height: particle.size }}
        />
      ))}
    </div>
  );
};

const AnimatedStat = ({ value, label, icon: Icon, color }: any) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const end = typeof value === 'string' ? parseInt(value) : value;
          const duration = 2000;
          const increment = end / (duration / 16);

          const timer = setInterval(() => {
            start += increment;
            if (start >= end) {
              setCount(end);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 16);

          return () => clearInterval(timer);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);

  return (
    <motion.div ref={ref} className="browse__animated-stat" whileHover={{ scale: 1.05, y: -5 }} transition={{ type: "spring", stiffness: 300 }}>
      <div className="browse__animated-stat-icon" style={{ color }}>
        <Icon />
      </div>
      <div className="browse__animated-stat-content">
        <motion.div className="browse__animated-stat-value" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {typeof value === 'string' ? value : count}
        </motion.div>
        <div className="browse__animated-stat-label">{label}</div>
      </div>
    </motion.div>
  );
};

export default function BrowseMenu() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orderMode, setOrderMode] = useState<'now' | 'schedule'>('now');
  const [showFilters, setShowFilters] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  // Filter states
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 400]);
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [prepTimeRange, setPrepTimeRange] = useState<[number, number]>([0, 30]);
  const [expandedSections, setExpandedSections] = useState<string[]>(['price', 'rating', 'prepTime']);
  
  const { getFeedbackForMeal, getAverageRating } = useFeedback();
  const { isFavorite, toggleFavorite } = useFavorites();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const expressMeals = indianMeals.filter(meal => meal.isExpress && meal.prepTime <= 10);

  const handleOrderModeChange = (mode: 'now' | 'schedule') => {
    setOrderMode(mode);
    if (mode === 'schedule' && selectedCategory === 'Express') {
      setSelectedCategory('All');
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const toggleRating = (rating: number) => {
    setSelectedRatings(prev =>
      prev.includes(rating) ? prev.filter(r => r !== rating) : [...prev, rating]
    );
  };

  const clearAllFilters = () => {
    setPriceRange([0, 400]);
    setSelectedRatings([]);
    setPrepTimeRange([0, 30]);
    setSelectedCategory('All');
    setSearchQuery('');
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (priceRange[0] > 0 || priceRange[1] < 400) count++;
    if (selectedRatings.length > 0) count++;
    if (prepTimeRange[0] > 0 || prepTimeRange[1] < 30) count++;
    return count;
  };

  const filteredMeals = indianMeals.filter((meal) => {
    const matchesCategory = selectedCategory === 'All' 
      ? true 
      : selectedCategory === 'Express' 
        ? meal.isExpress 
        : meal.category === selectedCategory;
    const matchesSearch = meal.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPrice = meal.price >= priceRange[0] && meal.price <= priceRange[1];
    const matchesRating = selectedRatings.length === 0 || selectedRatings.some(r => meal.rating >= r && meal.rating < r + 1);
    const matchesPrepTime = meal.prepTime >= prepTimeRange[0] && meal.prepTime <= prepTimeRange[1];
    
    return matchesCategory && matchesSearch && matchesPrice && matchesRating && matchesPrepTime;
  });

  const handleOrderMeal = (meal: Meal) => {
    setSelectedMeal(meal);
    setIsModalOpen(true);
  };

  const totalOrders = 12847;
  const avgRating = 4.8;
  const activeUsers = 3421;

  return (
    <DashboardLayout>
      <div className="browse" ref={containerRef}>
        <FloatingParticles />

        {/* Hero Section */}
        <motion.div className="browse__hero" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
          <div className="browse__hero-gradient" aria-hidden="true">
            <motion.div 
              className="browse__hero-gradient-orb browse__hero-gradient-orb--1"
              animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div 
              className="browse__hero-gradient-orb browse__hero-gradient-orb--2"
              animate={{ x: [0, -80, 0], y: [0, 100, 0], scale: [1, 1.3, 1] }}
              transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div 
              className="browse__hero-gradient-orb browse__hero-gradient-orb--3"
              animate={{ x: [0, 50, 0], y: [0, 80, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          <motion.div 
            className="browse__header"
            style={{
              x: useTransform(smoothProgress, [0, 0.2], [0, -50]),
              opacity: useTransform(smoothProgress, [0, 0.2], [1, 0]),
            }}
          >
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <motion.div 
                className="browse__title-badge"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              >
                <Award className="browse__title-badge-icon" />
                <span>Premium Menu</span>
              </motion.div>
              
              <h1 className="browse__title">
                <motion.span initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                  Discover
                </motion.span>
                {' '}
                <span className="browse__title-grad">
                  <motion.span initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                    Culinary Excellence
                  </motion.span>
                </span>
              </h1>
              
              <motion.p 
                className="browse__subtitle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                Authentic Indian cuisine, crafted with passion, delivered with love
              </motion.p>

              <motion.div 
                className="browse__stats-bar"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <AnimatedStat value={totalOrders} label="Orders Delivered" icon={Package} color="#ff6b35" />
                <AnimatedStat value={avgRating.toFixed(1)} label="Avg Rating" icon={Star} color="#fbbf24" />
                <AnimatedStat value={activeUsers} label="Happy Customers" icon={Users} color="#22d3ee" />
                <AnimatedStat value={indianMeals.length} label="Dishes Available" icon={ChefHat} color="#a855f7" />
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Order Mode Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="browse__order-mode"
        >
          <motion.div 
            className="browse__order-mode-glow"
            animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.95, 1.05, 0.95] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
          />
          
          <div className="browse__order-mode-label">
            <motion.div transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
              <Calendar className="browse__order-mode-icon" />
            </motion.div>
            <span>You choose the time. We deliver the experience.</span>
          </div>
          
          <div className="browse__order-mode-toggle">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setOrderMode('now'); setSelectedCategory('All'); }}
              className={`browse__order-mode-btn ${orderMode === 'now' && selectedCategory === 'All' ? 'browse__order-mode-btn--active' : ''}`}
            >
              <Package className="browse__order-mode-btn-icon" />
              <span className="browse__order-mode-btn-text">Full Menu</span>
              {orderMode === 'now' && selectedCategory === 'All' && (
                <motion.div className="browse__order-mode-btn-shine" layoutId="order-mode-shine" transition={{ type: "spring", stiffness: 300, damping: 30 }} />
              )}
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setOrderMode('now'); setSelectedCategory('Express'); }}
              className={`browse__order-mode-btn ${orderMode === 'now' && selectedCategory === 'Express' ? 'browse__order-mode-btn--active' : ''}`}
            >
              <Zap className="browse__order-mode-btn-icon" />
              <span className="browse__order-mode-btn-text">Express</span>
              {orderMode === 'now' && selectedCategory === 'Express' && (
                <motion.div className="browse__order-mode-btn-shine" layoutId="order-mode-shine" transition={{ type: "spring", stiffness: 300, damping: 30 }} />
              )}
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleOrderModeChange('schedule')}
              className={`browse__order-mode-btn ${orderMode === 'schedule' ? 'browse__order-mode-btn--active' : ''}`}
            >
              <Calendar className="browse__order-mode-btn-icon" />
              <span className="browse__order-mode-btn-text">Schedule</span>
              {orderMode === 'schedule' && (
                <motion.div className="browse__order-mode-btn-shine" layoutId="order-mode-shine" transition={{ type: "spring", stiffness: 300, damping: 30 }} />
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* Dynamic Banners */}
        <AnimatePresence mode="wait">
          {orderMode === 'now' && selectedCategory === 'All' && (
            <motion.div
              key="all-meals-banner"
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -40, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="browse__all-meals-banner"
            >
              <motion.div 
                className="browse__all-meals-banner-glow" 
                animate={{ rotate: [0, 360], scale: [1, 1.2, 1] }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                aria-hidden="true" 
              />
              
              <div className="browse__all-meals-banner-content">
                <div className="browse__all-meals-banner-left">
                  <motion.div 
                    className="browse__all-meals-banner-icon-wrapper"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="browse__all-meals-banner-icon">
                      <Package className="browse__all-meals-banner-icon-svg" />
                    </div>
                    <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
                      <Sparkles className="browse__all-meals-sparkle browse__all-meals-sparkle--1" />
                    </motion.div>
                    <motion.div animate={{ rotate: [360, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
                      <Sparkles className="browse__all-meals-sparkle browse__all-meals-sparkle--2" />
                    </motion.div>
                  </motion.div>
                  
                  <div className="browse__all-meals-banner-text">
                    <div className="browse__all-meals-banner-header">
                      <h2 className="browse__all-meals-banner-title">Complete Collection</h2>
                      <motion.span className="browse__all-meals-banner-badge-main" whileHover={{ scale: 1.05 }}>
                        <Package className="browse__all-meals-badge-icon" />
                        <span>{indianMeals.length} Items</span>
                      </motion.span>
                    </div>
                    <p className="browse__all-meals-banner-subtitle">
                      Explore our entire menu of authentic Indian delicacies
                    </p>
                    <div className="browse__all-meals-features">
                      {[
                        { icon: '🍛', text: 'All Cuisines' },
                        { icon: '⭐', text: 'Premium Quality' },
                        { icon: '🔥', text: 'Made Fresh' },
                      ].map((feature, i) => (
                        <motion.div
                          key={i}
                          className="browse__all-meals-feature"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.8 + i * 0.1 }}
                          whileHover={{ scale: 1.05, y: -2 }}
                        >
                          <div className="browse__all-meals-feature-icon">{feature.icon}</div>
                          <span>{feature.text}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={() => {
                      const mealsSection = document.querySelector('.browse__meals');
                      mealsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="browse__all-meals-banner-btn"
                  >
                    <span>Explore Menu</span>
                    <ArrowRight className="browse__all-meals-btn-icon" />
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}

          {orderMode === 'now' && selectedCategory === 'Express' && (
            <motion.div
              key="express-banner"
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -40, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="browse__express-banner"
            >
              <motion.div 
                className="browse__express-banner-glow"
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              
              <div className="browse__express-banner-content">
                <div className="browse__express-banner-left">
                  <motion.div 
                    className="browse__express-banner-icon-wrapper"
                    whileHover={{ scale: 1.1 }}
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <div className="browse__express-banner-icon">
                      <Zap className="browse__express-banner-icon-svg" />
                    </div>
                    <Sparkles className="browse__express-sparkle browse__express-sparkle--1" />
                    <Sparkles className="browse__express-sparkle browse__express-sparkle--2" />
                  </motion.div>
                  
                  <div className="browse__express-banner-text">
                    <div className="browse__express-banner-header">
                      <h2 className="browse__express-banner-title">Lightning Fast</h2>
                      <span className="browse__express-banner-badge-main">
                        <Clock className="browse__express-badge-icon" />
                        <span>2-10 minutes</span>
                      </span>
                    </div>
                    <p className="browse__express-banner-subtitle">
                      Ultra-fast service when you're in a rush
                    </p>
                    <div className="browse__express-features">
                      {[
                        { icon: '🔥', text: 'Instant Prep' },
                        { icon: '⚡', text: 'Zero Wait' },
                        { icon: '✨', text: 'Always Ready' },
                      ].map((feature, i) => (
                        <motion.div
                          key={i}
                          className="browse__express-feature"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.8 + i * 0.1 }}
                          whileHover={{ scale: 1.05 }}
                        >
                          <div className="browse__express-feature-icon">{feature.icon}</div>
                          <span>{feature.text}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    onClick={() => {
                      const mealsSection = document.querySelector('.browse__meals');
                      mealsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="browse__express-banner-btn"
                  >
                    <span>View {expressMeals.length} Express Items</span>
                    <ArrowRight className="browse__express-btn-icon" />
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}

          {orderMode === 'schedule' && (
            <motion.div
              key="schedule-banner"
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -40, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="browse__schedule-banner"
            >
              <motion.div 
                className="browse__schedule-banner-glow"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              />
              
              <div className="browse__schedule-banner-content">
                <div className="browse__schedule-banner-main">
                  <div className="browse__schedule-banner-left">
                    <motion.div 
                      className="browse__schedule-banner-icon-wrapper"
                      whileHover={{ scale: 1.1, rotate: -5 }}
                    >
                      <div className="browse__schedule-banner-icon">
                        <Calendar className="browse__schedule-banner-icon-svg" />
                      </div>
                      <Sparkles className="browse__schedule-sparkle browse__schedule-sparkle--1" />
                      <Sparkles className="browse__schedule-sparkle browse__schedule-sparkle--2" />
                    </motion.div>
                    
                    <div className="browse__schedule-banner-text">
                      <div className="browse__schedule-banner-header">
                        <h2 className="browse__schedule-banner-title">Plan Ahead</h2>
                        <span className="browse__schedule-banner-badge-main">
                          <Calendar className="browse__schedule-badge-icon" />
                          <span>Next Day</span>
                        </span>
                      </div>
                      <p className="browse__schedule-banner-subtitle">
                        Schedule for tomorrow, perfect timing guaranteed
                      </p>
                      <div className="browse__schedule-features">
                        {[
                          { icon: '📅', text: 'Your Schedule' },
                          { icon: '✅', text: 'Guaranteed Fresh' },
                          { icon: '🎯', text: 'No Stress' },
                        ].map((feature, i) => (
                          <motion.div
                            key={i}
                            className="browse__schedule-feature"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.8 + i * 0.1 }}
                            whileHover={{ scale: 1.05 }}
                          >
                            <div className="browse__schedule-feature-icon">{feature.icon}</div>
                            <span>{feature.text}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      onClick={() => {
                        const mealsSection = document.querySelector('.browse__meals');
                        mealsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="browse__schedule-banner-btn"
                    >
                      <span>Schedule Now</span>
                      <Calendar className="browse__schedule-btn-icon" />
                    </Button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search & Filters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.9 }} 
          className="browse__search-box"
        >
          <div className="browse__search-row">
            <motion.div className="browse__search-wrap" whileFocus={{ scale: 1.02 }}>
              <Search className="browse__search-icon" />
              <Input
                placeholder="        Search for culinary masterpieces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="browse__search-input"
              />
              {searchQuery && (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="browse__search-clear"
                  onClick={() => setSearchQuery('')}
                >
                  ×
                </motion.button>
              )}
            </motion.div>

          
          </div>

          <motion.div className="browse__categories" layout>
            {categories
              .filter(category => orderMode === 'schedule' ? category !== 'Express' : true)
              .map((category, index) => (
                <motion.button
                  key={category}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 + index * 0.05 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedCategory(category)}
                  className={`browse__cat-btn ${selectedCategory === category ? 'browse__cat-btn--active' : ''}`}
                >
                  {category === 'Express' && <Zap className="browse__cat-btn-icon" />}
                  {category === 'All' && <ChefHat className="browse__cat-btn-icon" />}
                  {category}
                  {selectedCategory === category && (
                    <motion.div 
                      className="browse__cat-btn-glow"
                      layoutId="category-glow"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </motion.button>
              ))}
          </motion.div>
        </motion.div>

       

        {/* Meals Grid */}
        <motion.div className="browse__meals" layout>
          <motion.div className="browse__meals-header" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="browse__meals-header-left">
              <h2 className="browse__meals-title">
                {selectedCategory === 'All' ? 'Complete Menu' : 
                 selectedCategory === 'Express' ? 'Express Meals' : selectedCategory}
                <motion.span 
                  className="browse__meals-count"
                  key={filteredMeals.length}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring" }}
                >
                  {filteredMeals.length}
                </motion.span>
              </h2>
              {orderMode === 'schedule' && (
                <motion.div 
                  className="browse__schedule-badge"
                  initial={{ scale: 0, x: -20 }}
                  animate={{ scale: 1, x: 0 }}
                >
                  <Calendar className="browse__schedule-badge-icon" />
                  <span>For Tomorrow</span>
                </motion.div>
              )}
            </div>
          </motion.div>

          {filteredMeals.length === 0 ? (
            <motion.div 
              className="browse__empty-state"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <motion.div
                animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Search className="browse__empty-icon" />
              </motion.div>
              <p className="browse__empty-text">No dishes found</p>
              <p className="browse__empty-subtext">
                {searchQuery 
                  ? `Try a different search term`
                  : 'Try adjusting your filters'}
              </p>
              {getActiveFilterCount() > 0 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={clearAllFilters}
                  className="browse__empty-clear-btn"
                >
                  Clear All Filters
                </motion.button>
              )}
            </motion.div>
          ) : (
            <motion.div className="browse__meals-grid" layout>
              {filteredMeals.map((meal, index) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  onOrder={handleOrderMeal}
                  delay={index * 0.05}
                  averageRating={getAverageRating(meal.id)}
                  comments={getFeedbackForMeal(meal.id)}
                  isFavorite={isFavorite(meal.id)}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </motion.div>
          )}
        </motion.div>

        <OrderModal 
          meal={selectedMeal} 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)}
          orderMode={orderMode}
        />
        <CartButton />
      </div>
    </DashboardLayout>
  );
}