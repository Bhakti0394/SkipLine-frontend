import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion';
import {
  Search, Star, Zap, Clock, Sparkles, ArrowRight, Calendar,
  Package, Award, Users, ChefHat, WifiOff, RefreshCw,
} from 'lucide-react';
import { DashboardLayout } from '../../components/CustomerDashboard/layout/DashboardLayout';
import { MealCard }     from '../../components/CustomerDashboard/dashboard/MealCard';
import { OrderModal }   from '../../components/CustomerDashboard/dashboard/OrderModal';
import { CartButton }   from '../../components/CustomerDashboard/dashboard/CartButton';
import { Meal }         from '../../customer-types/dashboard';
import { Button }       from '../../components/ui/button';
import { Input }        from '../../components/ui/input';
import { useFeedback }  from '../../customer-hooks/useFeedback';
import { useFavorites } from '../../customer-hooks/useFavorites';
import {
  fetchCustomerMenuItems,
  fetchCustomerPlatformStats,
  CustomerPlatformStatsDto,
} from '../../kitchen-api/kitchenApi';
import '../../components/CustomerDashboard/styles/Browsemenu.scss';

// ── Local image imports ───────────────────────────────────────────────────────
import butterChicken    from '../../customer-assets/butter-chicken.jpg';
import masalaDosa       from '../../customer-assets/masala-dosa.jpg';
import hydrebadiBiryani from '../../customer-assets/hydrebadi-biryani.jpg';
import pizza            from '../../customer-assets/pizza.jpg';
import paneerTikka      from '../../customer-assets/paneer-tikka.jpg';
import choleBhature     from '../../customer-assets/chole-bhature.jpg';
import idliSambhar      from '../../customer-assets/idli-sambhar.jpg';
import vadaPav          from '../../customer-assets/vada-pav.jpg';
import dalMakhani       from '../../customer-assets/dal-makhani.jpg';
import gulabJamun       from '../../customer-assets/gulab-jamun.jpg';
import rajasthaniThali  from '../../customer-assets/rajasthani-thali.jpg';
import lucknowiBiryani  from '../../customer-assets/lucknowi-biryani.jpg';
import samosa           from '../../customer-assets/samosa.jpg';
import chocolateDonut   from '../../customer-assets/chocolate-donuts.jpg';
import poha             from '../../customer-assets/poha.jpg';
import kadaiPaneer      from '../../customer-assets/kadai-paneer.jpg';
import palakPaneer      from '../../customer-assets/palak-paneer.jpg';
import chickenKorma     from '../../customer-assets/chicken-korma.jpg';
import prawnMasala      from '../../customer-assets/prawn-masala.jpg';
import muttonRoganJosh  from '../../customer-assets/mutton-rogan-josh.jpg';
import butterGarlicNaan from '../../customer-assets/butter-garlic-naan.jpg';

const LOCAL_IMAGE_MAP: Record<string, string> = {
  'Butter Chicken': butterChicken, 'Masala Dosa': masalaDosa,
  'Hyderabadi Biryani': hydrebadiBiryani, 'Cheese Pizza': pizza, 'Pizza': pizza,
  'Paneer Tikka': paneerTikka, 'Chole Bhature': choleBhature,
  'Idli Sambar': idliSambhar, 'Idli Sambhar': idliSambhar,
  'Vada Pav': vadaPav, 'Dal Makhani': dalMakhani, 'Gulab Jamun': gulabJamun,
  'Rajasthani Thali': rajasthaniThali, 'Lucknowi Biryani': lucknowiBiryani,
  'Samosa (2 pcs)': samosa, 'Samosa': samosa,
  'Chocolate Donut': chocolateDonut, 'Chocolate Donuts': chocolateDonut,
  'Poha': poha, 'Kadai Paneer': kadaiPaneer, 'Palak Paneer': palakPaneer,
  'Chicken Korma': chickenKorma, 'Prawn Masala': prawnMasala,
  'Mutton Rogan Josh': muttonRoganJosh, 'Butter Garlic Naan': butterGarlicNaan,
};

const DISH_RATING_MAP: Record<string, number> = {
  'Butter Chicken': 4.9, 'Masala Dosa': 4.8, 'Hyderabadi Biryani': 4.9,
  'Cheese Pizza': 4.6, 'Pizza': 4.6, 'Paneer Tikka': 4.8, 'Chole Bhature': 4.6,
  'Idli Sambar': 4.7, 'Idli Sambhar': 4.7, 'Vada Pav': 4.5, 'Dal Makhani': 4.8,
  'Gulab Jamun': 4.9, 'Rajasthani Thali': 4.9, 'Lucknowi Biryani': 4.8,
  'Samosa (2 pcs)': 4.6, 'Samosa': 4.6, 'Chocolate Donut': 4.5,
  'Chocolate Donuts': 4.5, 'Poha': 4.5, 'Kadai Paneer': 4.7,
  'Palak Paneer': 4.7, 'Chicken Korma': 4.7, 'Prawn Masala': 4.7,
  'Mutton Rogan Josh': 4.7, 'Butter Garlic Naan': 4.8,
};

interface BackendMenuItem {
  id: string; name: string; prepTime?: number; prepTimeMinutes?: number;
  available: boolean; price: number | null; category: string | null;
  imageUrl: string | null; isExpress: boolean; express?: boolean;
}

function backendItemToMeal(item: BackendMenuItem): Meal {
  const raw = item as any;
  // MenuItemDto from backend uses prepTimeMinutes; BackendMenuItem interface
  // mistakenly typed it as prepTime. Read both so either shape works.
  const prepTime: number =
    raw.prepTimeMinutes ?? raw.prepTime ?? 0;
  const isExpress: boolean =
    raw.isExpress != null ? Boolean(raw.isExpress)
    : raw.express  != null ? Boolean(raw.express)
    : prepTime <= 15;
  const image = item.imageUrl ? item.imageUrl : (LOCAL_IMAGE_MAP[item.name] ?? butterChicken);
  return {
    id: item.id, name: item.name, restaurant: '', image,
    price: item.price ?? 0, prepTime,
    rating: DISH_RATING_MAP[item.name] ?? 4.7,
    category: item.category ?? 'Other', isExpress,
  };
}

const CATEGORIES = ['All', 'Express', 'North Indian', 'South Indian', 'Street Food', 'Biryani', 'Thali', 'Desserts'];

// ── Skeleton ──────────────────────────────────────────────────────────────────
const MealCardSkeleton = () => (
  <div className="browse__skeleton">
    <div className="browse__skeleton-img" />
    <div className="browse__skeleton-body">
      <div className="browse__skeleton-line browse__skeleton-line--lg" />
      <div className="browse__skeleton-line browse__skeleton-line--md" />
      <div className="browse__skeleton-line browse__skeleton-line--sm" />
    </div>
  </div>
);

const ErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <motion.div className="browse__error" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
    <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }}>
      <WifiOff className="browse__error-icon" />
    </motion.div>
    <p className="browse__error-title">Could not load menu</p>
    <p className="browse__error-sub">Check your connection and try again</p>
    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onRetry} className="browse__error-btn">
      <RefreshCw size={14} style={{ marginRight: 6 }} />Retry
    </motion.button>
  </motion.div>
);

// ── Animated stat — now driven by real backend data ───────────────────────────
const AnimatedStat = ({ value, label, icon: Icon, color }: {
  value: number | string; label: string; icon: any; color: string;
}) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      const end = typeof value === 'string' ? parseInt(value) : value;
      if (isNaN(end)) return;
      let start = 0;
      const inc = end / (1500 / 16);
      const t = setInterval(() => {
        start += inc;
        if (start >= end) { setCount(end); clearInterval(t); }
        else setCount(Math.floor(start));
      }, 16);
      return () => clearInterval(t);
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);
  return (
    <motion.div ref={ref} className="browse__animated-stat" whileHover={{ scale: 1.05, y: -3 }} transition={{ type: 'spring', stiffness: 300 }}>
      <div className="browse__animated-stat-icon" style={{ color }}><Icon /></div>
      <div className="browse__animated-stat-content">
        <motion.div className="browse__animated-stat-value" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {typeof value === 'string' ? value : count}
        </motion.div>
        <div className="browse__animated-stat-label">{label}</div>
      </div>
    </motion.div>
  );
};

const FloatingParticles = () => {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    delay: Math.random() * 5, duration: 10 + Math.random() * 10, size: 2 + Math.random() * 3,
  }));
  return (
    <div className="browse__particles" aria-hidden="true">
      {particles.map(p => (
        <motion.div key={p.id} className="browse__particle"
          initial={{ x: `${p.x}vw`, y: `${p.y}vh`, opacity: 0, scale: 0 }}
          animate={{ y: [`${p.y}vh`, `${Math.max(0, p.y - 30)}vh`, `${p.y}vh`], opacity: [0, 0.5, 0], scale: [0, 1, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: p.size, height: p.size }} />
      ))}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
export default function BrowseMenu() {
  const [meals,            setMeals]            = useState<Meal[]>([]);
  const [loadState,        setLoadState]        = useState<'loading' | 'ok' | 'error'>('loading');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery,      setSearchQuery]      = useState('');
  const [selectedMeal,     setSelectedMeal]     = useState<Meal | null>(null);
  const [isModalOpen,      setIsModalOpen]      = useState(false);
  const [orderMode,        setOrderMode]        = useState<'now' | 'schedule'>('now');
  const [fetchKey,         setFetchKey]         = useState(0);

  // Real platform stats from backend — replaces hardcoded numbers
  const [platformStats, setPlatformStats] = useState<CustomerPlatformStatsDto>({
    totalOrdersDelivered: 0,
    totalCustomers:       0,
    totalMenuItems:       0,
    avgRating:            '4.8',
  });

  const { getFeedbackForMeal, getAverageRating } = useFeedback();
  const { isFavorite, toggleFavorite }           = useFavorites();
  const containerRef        = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const smoothProgress      = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  // Fetch menu items
  useEffect(() => {
    let cancelled = false;
    setLoadState('loading');
    fetchCustomerMenuItems()
      .then(items => {
        if (cancelled) return;
        const converted = items.filter(i => i.available).map(i => backendItemToMeal(i as any));
        if (converted.length > 0) { setMeals(converted); setLoadState('ok'); }
        else setLoadState('error');
      })
      .catch(() => { if (!cancelled) setLoadState('error'); });
    return () => { cancelled = true; };
  }, [fetchKey]);

  // Fetch real platform stats from backend
  useEffect(() => {
    let cancelled = false;
    fetchCustomerPlatformStats().then(stats => {
      if (!cancelled) setPlatformStats(stats);
    });
    return () => { cancelled = true; };
  }, []);

  const expressMeals     = meals.filter(m => m.isExpress === true);
  const isExpressContext = orderMode === 'now' && selectedCategory === 'Express';

  const filteredMeals = meals.filter(meal => {
    const cat    = selectedCategory === 'All' ? true : selectedCategory === 'Express' ? meal.isExpress === true : meal.category === selectedCategory;
    const search = meal.name.toLowerCase().includes(searchQuery.toLowerCase());
    const mode   = orderMode === 'schedule' ? !meal.isExpress : true;
    return cat && search && mode;
  });

  const handleOrderModeChange = (mode: 'now' | 'schedule') => {
    setOrderMode(mode);
    if (mode === 'schedule' && selectedCategory === 'Express') setSelectedCategory('All');
  };
  const clearAllFilters = () => { setSelectedCategory('All'); setSearchQuery(''); };
  const handleOrderMeal = (meal: Meal) => { setSelectedMeal(meal); setIsModalOpen(true); };
  const handleRetry     = () => setFetchKey(k => k + 1);

  return (
    <DashboardLayout>
      <div className="browse" ref={containerRef}>
        <FloatingParticles />

        {/* ── Hero ── */}
        <motion.div className="browse__hero" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
          <div className="browse__hero-gradient" aria-hidden="true">
            <motion.div className="browse__hero-gradient-orb browse__hero-gradient-orb--1"
              animate={{ x: [0, 80, 0], y: [0, -40, 0], scale: [1, 1.2, 1] }} transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }} />
            <motion.div className="browse__hero-gradient-orb browse__hero-gradient-orb--2"
              animate={{ x: [0, -60, 0], y: [0, 80, 0], scale: [1, 1.3, 1] }} transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }} />
            <motion.div className="browse__hero-gradient-orb browse__hero-gradient-orb--3"
              animate={{ x: [0, 40, 0], y: [0, 60, 0], scale: [1, 1.1, 1] }} transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }} />
          </div>
          <motion.div className="browse__header"
            style={{ x: useTransform(smoothProgress, [0, 0.2], [0, -30]), opacity: useTransform(smoothProgress, [0, 0.3], [1, 0]) }}>
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <motion.div className="browse__title-badge" initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}>
                <Award className="browse__title-badge-icon" /><span>Premium Menu</span>
              </motion.div>
              <h1 className="browse__title">
                <motion.span initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>Discover</motion.span>{' '}
                <span className="browse__title-grad">
                  <motion.span initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>Culinary Excellence</motion.span>
                </span>
              </h1>
              <motion.p className="browse__subtitle" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                Authentic Indian cuisine, crafted with passion, delivered with love
              </motion.p>

              {/* Real stats from backend */}
              <motion.div className="browse__stats-bar" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                <AnimatedStat
                  value={platformStats.totalOrdersDelivered}
                  label="Orders Delivered" icon={Package} color="#ff6b35"
                />
                <AnimatedStat
                  value={platformStats.avgRating}
                  label="Avg Rating" icon={Star} color="#fbbf24"
                />
                <AnimatedStat
                  value={platformStats.totalCustomers}
                  label="Happy Customers" icon={Users} color="#22d3ee"
                />
                <AnimatedStat
                  value={loadState === 'ok' ? meals.length : platformStats.totalMenuItems}
                  label="Dishes Available" icon={ChefHat} color="#a855f7"
                />
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* ── Order Mode ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="browse__order-mode">
          <motion.div className="browse__order-mode-glow" animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.95, 1.05, 0.95] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} aria-hidden="true" />
          <div className="browse__order-mode-label">
            <Calendar className="browse__order-mode-icon" />
            <span>You choose the time. We deliver the experience.</span>
          </div>
          <div className="browse__order-mode-toggle">
            {[
              { label: 'Full Menu', icon: Package,  onClick: () => { setOrderMode('now'); setSelectedCategory('All'); },     active: orderMode === 'now' && selectedCategory === 'All' },
              { label: 'Express',   icon: Zap,      onClick: () => { setOrderMode('now'); setSelectedCategory('Express'); }, active: isExpressContext },
              { label: 'Schedule',  icon: Calendar, onClick: () => handleOrderModeChange('schedule'),                        active: orderMode === 'schedule' },
            ].map(btn => (
              <motion.button key={btn.label} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={btn.onClick}
                className={`browse__order-mode-btn${btn.active ? ' browse__order-mode-btn--active' : ''}`}>
                <btn.icon className="browse__order-mode-btn-icon" />
                <span className="browse__order-mode-btn-text">{btn.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ── Banners ── */}
        <AnimatePresence mode="wait">
          {orderMode === 'now' && selectedCategory === 'All' && (
            <motion.div key="all" initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.97 }} transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              className="browse__all-meals-banner">
              <motion.div className="browse__all-meals-banner-glow" animate={{ rotate: [0, 360] }} transition={{ duration: 15, repeat: Infinity, ease: 'linear' }} aria-hidden="true" />
              <div className="browse__all-meals-banner-content">
                <div className="browse__all-meals-banner-left">
                  <motion.div className="browse__all-meals-banner-icon-wrapper" whileHover={{ scale: 1.1, rotate: 5 }}>
                    <div className="browse__all-meals-banner-icon"><Package className="browse__all-meals-banner-icon-svg" /></div>
                    <Sparkles className="browse__all-meals-sparkle browse__all-meals-sparkle--1" />
                    <Sparkles className="browse__all-meals-sparkle browse__all-meals-sparkle--2" />
                  </motion.div>
                  <div className="browse__all-meals-banner-text">
                    <div className="browse__all-meals-banner-header">
                      <h2 className="browse__all-meals-banner-title">Complete Collection</h2>
                      <motion.span className="browse__all-meals-banner-badge-main" whileHover={{ scale: 1.05 }}>
                        <Package className="browse__all-meals-badge-icon" /><span>{loadState === 'ok' ? meals.length : '…'} Items</span>
                      </motion.span>
                    </div>
                    <p className="browse__all-meals-banner-subtitle">Explore our entire menu of authentic Indian delicacies</p>
                    <div className="browse__all-meals-features">
                      {[{ icon: '🛕', text: 'All Cuisines' }, { icon: '⭐', text: 'Premium Quality' }, { icon: '🔥', text: 'Made Fresh' }].map((f, i) => (
                        <motion.div key={i} className="browse__all-meals-feature" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.8 + i * 0.1 }} whileHover={{ scale: 1.05, y: -2 }}>
                          <div className="browse__all-meals-feature-icon">{f.icon}</div><span>{f.text}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button onClick={() => document.querySelector('.browse__meals')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="browse__all-meals-banner-btn">
                    <span>Explore Menu</span><ArrowRight className="browse__all-meals-btn-icon" />
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}

          {isExpressContext && (
            <motion.div key="express" initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.97 }} transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              className="browse__express-banner">
              <motion.div className="browse__express-banner-glow" animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 3, repeat: Infinity }} />
              <div className="browse__express-banner-content">
                <div className="browse__express-banner-left">
                  <motion.div className="browse__express-banner-icon-wrapper" whileHover={{ scale: 1.1 }} animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                    <div className="browse__express-banner-icon"><Zap className="browse__express-banner-icon-svg" /></div>
                    <Sparkles className="browse__express-sparkle browse__express-sparkle--1" />
                    <Sparkles className="browse__express-sparkle browse__express-sparkle--2" />
                  </motion.div>
                  <div className="browse__express-banner-text">
                    <div className="browse__express-banner-header">
                      <h2 className="browse__express-banner-title">Lightning Fast</h2>
                      <span className="browse__express-banner-badge-main"><Clock className="browse__express-badge-icon" /><span>5–15 minutes</span></span>
                    </div>
                    <p className="browse__express-banner-subtitle">Tell us when you're arriving — food will be hot and ready</p>
                    <div className="browse__express-features">
                      {[{ icon: '🔥', text: 'Instant Prep' }, { icon: '⚡', text: 'Zero Wait' }, { icon: '✨', text: 'Always Ready' }].map((f, i) => (
                        <motion.div key={i} className="browse__express-feature" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.8 + i * 0.1 }} whileHover={{ scale: 1.05 }}>
                          <div className="browse__express-feature-icon">{f.icon}</div><span>{f.text}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button onClick={() => document.querySelector('.browse__meals')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="browse__express-banner-btn">
                    <span>View {expressMeals.length} Express Items</span><ArrowRight className="browse__express-btn-icon" />
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}

          {orderMode === 'schedule' && (
            <motion.div key="schedule" initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.97 }} transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              className="browse__schedule-banner">
              <motion.div className="browse__schedule-banner-glow" animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }} />
              <div className="browse__schedule-banner-content">
                <div className="browse__schedule-banner-main">
                  <div className="browse__schedule-banner-left">
                    <motion.div className="browse__schedule-banner-icon-wrapper" whileHover={{ scale: 1.1, rotate: -5 }}>
                      <div className="browse__schedule-banner-icon"><Calendar className="browse__schedule-banner-icon-svg" /></div>
                      <Sparkles className="browse__schedule-sparkle browse__schedule-sparkle--1" />
                      <Sparkles className="browse__schedule-sparkle browse__schedule-sparkle--2" />
                    </motion.div>
                    <div className="browse__schedule-banner-text">
                      <div className="browse__schedule-banner-header">
                        <h2 className="browse__schedule-banner-title">Plan Ahead</h2>
                        <span className="browse__schedule-banner-badge-main"><Calendar className="browse__schedule-badge-icon" /><span>Next Day</span></span>
                      </div>
                      <p className="browse__schedule-banner-subtitle">Choose your meal now, pick it up tomorrow at your preferred time</p>
                      <div className="browse__schedule-features">
                        {[{ icon: '📅', text: 'Your Schedule' }, { icon: '✅', text: 'Guaranteed Fresh' }, { icon: '🎯', text: 'No Stress' }].map((f, i) => (
                          <motion.div key={i} className="browse__schedule-feature" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.8 + i * 0.1 }} whileHover={{ scale: 1.05 }}>
                            <div className="browse__schedule-feature-icon">{f.icon}</div><span>{f.text}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button onClick={() => document.querySelector('.browse__meals')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="browse__schedule-banner-btn">
                      <span>Schedule Now</span><Calendar className="browse__schedule-btn-icon" />
                    </Button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Search & Categories ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="browse__search-box">
          <div className="browse__search-row">
            <motion.div className="browse__search-wrap">
              <Search className="browse__search-icon" />
              <Input placeholder="Search for culinary masterpieces..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)} className="browse__search-input" />
              {searchQuery && (
                <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} className="browse__search-clear" onClick={() => setSearchQuery('')}>&times;</motion.button>
              )}
            </motion.div>
          </div>
          <motion.div className="browse__categories" layout>
            {CATEGORIES.filter(cat => orderMode === 'schedule' ? cat !== 'Express' : true).map((category, index) => (
              <motion.button key={category} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 + index * 0.04 }} whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(category)}
                className={`browse__cat-btn${selectedCategory === category ? ' browse__cat-btn--active' : ''}`}>
                {category === 'Express' && <Zap className="browse__cat-btn-icon" />}
                {category === 'All'     && <ChefHat className="browse__cat-btn-icon" />}
                {category}
                {selectedCategory === category && (
                  <motion.div className="browse__cat-btn-glow" layoutId="category-glow" transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
                )}
              </motion.button>
            ))}
          </motion.div>
        </motion.div>

        {/* ── Meals Grid ── */}
        <motion.div className="browse__meals" layout>
          <motion.div className="browse__meals-header" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="browse__meals-header-left">
              <h2 className="browse__meals-title">
                {selectedCategory === 'All' ? 'Complete Menu' : selectedCategory === 'Express' ? 'Express Meals' : selectedCategory}
                {loadState === 'ok' && (
                  <motion.span className="browse__meals-count" key={filteredMeals.length} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                    {filteredMeals.length}
                  </motion.span>
                )}
              </h2>
              {orderMode === 'schedule' && (
                <motion.div className="browse__schedule-badge" initial={{ scale: 0, x: -20 }} animate={{ scale: 1, x: 0 }}>
                  <Calendar className="browse__schedule-badge-icon" /><span>For Tomorrow</span>
                </motion.div>
              )}
            </div>
          </motion.div>

          {loadState === 'loading' && (
            <div className="browse__meals-grid">
              {Array.from({ length: 8 }).map((_, i) => <MealCardSkeleton key={i} />)}
            </div>
          )}

          {loadState === 'error' && <ErrorState onRetry={handleRetry} />}

          {loadState === 'ok' && filteredMeals.length === 0 && (
            <motion.div className="browse__empty-state" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                <Search className="browse__empty-icon" />
              </motion.div>
              <p className="browse__empty-text">No dishes found</p>
              <p className="browse__empty-subtext">{searchQuery ? 'Try a different search term' : 'Try adjusting your filters'}</p>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={clearAllFilters} className="browse__empty-clear-btn">
                Clear All Filters
              </motion.button>
            </motion.div>
          )}

          {loadState === 'ok' && filteredMeals.length > 0 && (
            <motion.div className="browse__meals-grid" layout>
              {filteredMeals.map((meal, index) => (
                <MealCard key={meal.id} meal={meal} onOrder={handleOrderMeal}
                  index={index} delay={Math.min(index * 0.04, 0.3)}
                  averageRating={getAverageRating(meal.id)} comments={getFeedbackForMeal(meal.id)}
                  isFavorite={isFavorite(meal.id)} onToggleFavorite={toggleFavorite} />
              ))}
            </motion.div>
          )}
        </motion.div>

        <OrderModal meal={selectedMeal} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
          orderMode={orderMode} forceExpressMode={isExpressContext} />
        <CartButton />
      </div>
    </DashboardLayout>
  );
}