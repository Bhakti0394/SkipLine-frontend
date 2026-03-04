import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import PreplineLogo from "./PreplineLogo";
import "../../styles/Navbar.scss";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`navbar ${isScrolled ? 'navbar--scrolled' : ''}`}
    >
      <div className="navbar__container">
        <div className="navbar__wrapper">
          {/* Logo */}
          <Link to="/" className="navbar__logo">
            <PreplineLogo size="sm" />
            <span className="navbar__brand">Prepline</span>
          </Link>

          {/* Desktop menu */}
          <div className="navbar__menu">
            <a href="#problem" className="navbar__link">
              Problem
            </a>
            <a href="#how-it-works" className="navbar__link">
              How It Works
            </a>
            <a href="#features" className="navbar__link">
              Features
            </a>
            <a href="#why-different" className="navbar__link">
              Why Us
            </a>
          </div>

          {/* CTA */}
          <div className="navbar__cta">
            <Button variant="ghost" className="navbar__signin" asChild>
              <Link to="/auth?mode=login">Sign In</Link>
            </Button>
            <Button className="navbar__get-started" asChild>
              <Link to="/auth?mode=signup">Get Started</Link>
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="navbar__toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="navbar__toggle-icon" /> : <Menu className="navbar__toggle-icon" />}
          </button>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="navbar__mobile-menu"
          >
            <div className="navbar__mobile-content">
              <a
                href="#problem"
                className="navbar__mobile-link"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Problem
              </a>
              <a
                href="#how-it-works"
                className="navbar__mobile-link"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                How It Works
              </a>
              <a
                href="#features"
                className="navbar__mobile-link"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Features
              </a>
              <a
                href="#why-different"
                className="navbar__mobile-link"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Why Us
              </a>
              <div className="navbar__mobile-actions">
                <Button variant="ghost" className="navbar__mobile-signin" asChild>
                  <Link to="/auth?mode=login" onClick={() => setIsMobileMenuOpen(false)}>
                    Sign In
                  </Link>
                </Button>
                <Button className="navbar__mobile-get-started" asChild>
                  <Link to="/auth?mode=signup" onClick={() => setIsMobileMenuOpen(false)}>
                    Get Started
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
};

export default Navbar;