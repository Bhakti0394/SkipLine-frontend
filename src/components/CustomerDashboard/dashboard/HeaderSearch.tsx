// components/CustomerDashboard/dashboard/HeaderSearch.tsx
//
// FIX [HARDCODED-MEALS]: Removed static `indianMeals` array.
//
// BEFORE: Search results came from a 12-item hardcoded list with fake restaurant
//   names and wrong prices — never connected to real menu data. A dish could be
//   sold out on the backend but still appear in search results here.
//
// AFTER: MenuItemDto[] is fetched once from GET /api/customer/menu-items on
//   first open. Results are memoized so subsequent opens don't re-fetch.
//   Real name, price, prepTime, category, and availability come from backend.
//   Unavailable items are filtered out before matching.
//
// FIX [WRONG-PATH]: navigate('/browse') → navigate('/customer-dashboard/browse')

import { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X, Clock, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { fetchCustomerMenuItems, MenuItemDto } from '../../../kitchen-api/kitchenApi';
import '../overview-styles/Headersearch.scss';

export function HeaderSearch() {
  const [isOpen,    setIsOpen]    = useState(false);
  const [query,     setQuery]     = useState('');
  const [menuItems, setMenuItems] = useState<MenuItemDto[]>([]);
  const [loading,   setLoading]   = useState(false);
  // Track whether we've fetched already so we don't re-fetch on every open
  const fetchedRef   = useRef(false);
  const inputRef     = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate     = useNavigate();

  // Fetch menu items once on first open
const ensureMenuLoaded = useCallback(async () => {
    if (fetchedRef.current) return;
    setLoading(true);
    try {
      const items = await fetchCustomerMenuItems();
      setMenuItems(items.filter(i => i.available));
      // Only mark as fetched on success — failures are retried on next open
      fetchedRef.current = true;
    } catch {
      // Don't set fetchedRef — allows retry on next search open
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    ensureMenuLoaded();
  };

  // FIX: search against real backend menu items
  const filteredMeals = query.length > 0
    ? menuItems.filter(item =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        (item.category ?? '').toLowerCase().includes(query.toLowerCase())
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

  const handleMealClick = (itemId: string) => {
    // FIX: correct customer dashboard route
    navigate(`/customer-dashboard/browse?meal=${itemId}`);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className={`header-search ${isOpen ? 'header-search--open' : ''}`}>

      {!isOpen && (
        <button onClick={handleOpen} className="header-search__button">
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
          {loading && <Loader2 className="header-search__loading-icon" style={{ width: 16, height: 16, animation: 'spin 1s linear infinite', opacity: 0.5 }} />}
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
            {loading ? (
              <div className="header-search__empty">
                <p className="header-search__empty-text">Loading menu...</p>
              </div>
            ) : filteredMeals.length > 0 ? (
              <div className="header-search__results">
                {filteredMeals.map((item, index) => (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleMealClick(item.id)}
                    className="header-search__result-item"
                  >
                    <div className="header-search__result-icon">
                      <span>🍽️</span>
                    </div>
                    <div className="header-search__result-info">
                      {/* FIX: real name from backend */}
                      <p className="header-search__result-name">{item.name}</p>
                      {/* FIX: real category from backend, no fake restaurant name */}
                      <p className="header-search__result-restaurant">{item.category ?? 'Menu Item'}</p>
                    </div>
                    <div className="header-search__result-meta">
                      {/* FIX: real price from backend */}
                      <p className="header-search__result-price">
                        {item.price != null ? `₹${item.price}` : '—'}
                      </p>
                      <div className="header-search__result-time">
                        <Clock className="header-search__result-time-icon" />
                        {/* FIX: real prep time from backend */}
                        <span>{item.prepTimeMinutes} min</span>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="header-search__empty">
                <p className="header-search__empty-text">No meals found for "{query}"</p>
                <button
                  onClick={() => {
                    // FIX: correct path
                    navigate('/customer-dashboard/browse');
                    setIsOpen(false);
                    setQuery('');
                  }}
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