import { motion } from "framer-motion";
import { ArrowRight, Clock, Zap, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import HeroMockup from "./HeroMockup";
import SkipLineLogo from "./SkipLineLogo";
import "../../styles/Hero.scss";

const Hero = () => {
  return (
    <section className="hero">
      {/* Background Effects */}
      <div className="hero__background">
        {/* Gradient orbs - scaled for mobile */}
        <div className="hero__orb hero__orb--primary-top" />
        <div className="hero__orb hero__orb--accent-bottom" />
        <div className="hero__orb hero__orb--primary-center" />
        
        {/* Grid pattern */}
        <div className="hero__grid-pattern" />

        {/* Animated lines */}
        <svg className="hero__animated-lines" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0" />
              <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="1" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.line
            x1="0" y1="30%" x2="100%" y2="30%"
            stroke="url(#line-gradient)"
            strokeWidth="1"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.3 }}
            transition={{ duration: 3, repeat: Infinity, repeatType: "loop" }}
          />
        </svg>
      </div>

      <div className="hero__container">
        <div className="hero__grid">
          {/* Left: Content */}
          <div className="hero__content">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="hero__badge"
            >
              <span className="hero__badge-pulse-wrapper">
                <span className="hero__badge-pulse"></span>
                <span className="hero__badge-dot"></span>
              </span>
              <span className="hero__badge-text">Built for high-rush environments</span>
            </motion.div>

            {/* Main heading */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="hero__heading"
            >
              <span className="hero__heading-logo">
                <SkipLineLogo size="lg" className="hero__logo-icon" />
                <span>SkipLine</span>
              </span>
              <span className="hero__heading-tagline">
                Smart Pre-Ordering.{" "}
                <span className="hero__heading-gradient">Zero Queues.</span>
              </span>
            </motion.h1>

            {/* Subheading */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="hero__subheading"
            >
              Real-time food pre-ordering and kitchen orchestration. 
              Slot-based pickup, capacity-aware scheduling, and live tracking 
              to eliminate waiting time.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="hero__cta"
            >
              <Button size="lg" className="hero__cta-primary" asChild>
                <Link to="/auth?mode=signup">
                  Get Started
                  <ArrowRight className="hero__cta-icon" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="hero__cta-secondary">
                See How It Works
              </Button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="hero__stats"
            >
              <StatCard
                icon={<Clock className="hero__stat-icon hero__stat-icon--primary" />}
                value="30min→0"
                label="Queue eliminated"
              />
              <StatCard
                icon={<Zap className="hero__stat-icon hero__stat-icon--accent" />}
                value="3x"
                label="Faster throughput"
              />
              <StatCard
                icon={<TrendingUp className="hero__stat-icon hero__stat-icon--primary" />}
                value="40%"
                label="Less waste"
              />
            </motion.div>
          </div>

          {/* Right: Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="hero__mockup"
          >
            <HeroMockup />
          </motion.div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="hero__bottom-fade" />
    </section>
  );
};

const StatCard = ({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) => (
  <div className="hero__stat-card">
    <div className="hero__stat-header">
      {icon}
      <span className="hero__stat-value">{value}</span>
    </div>
    <span className="hero__stat-label">{label}</span>
  </div>
);

export default Hero;