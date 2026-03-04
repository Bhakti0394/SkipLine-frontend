import { motion } from "framer-motion";
import { Clock, CheckCircle2, ChefHat, Package, User } from "lucide-react";
import "../../styles/Heromockup.scss";

const orders = [
  { id: "#2847", item: "Chicken Biryani", status: "ready", time: "12:30", user: "Arjun" },
  { id: "#2848", item: "Paneer Wrap", status: "cooking", time: "12:35", user: "Priya" },
  { id: "#2849", item: "Veg Thali", status: "queued", time: "12:40", user: "Rahul" },
];

const statusConfig = {
  queued: { color: "muted-foreground", bg: "muted", icon: Clock, label: "Queued" },
  cooking: { color: "primary", bg: "primary", icon: ChefHat, label: "Cooking" },
  ready: { color: "accent", bg: "accent", icon: CheckCircle2, label: "Ready" },
};

const HeroMockup = () => {
  return (
    <div className="hero-mockup">
      {/* Glow effect behind */}
      <div className="hero-mockup__glow" />
      
      {/* Main dashboard card */}
      <motion.div
        initial={{ opacity: 0, y: 40, rotateX: 10 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="hero-mockup__dashboard"
      >
        {/* Dashboard header */}
        <div className="hero-mockup__header">
          <div className="hero-mockup__dots">
            <div className="hero-mockup__dot hero-mockup__dot--destructive" />
            <div className="hero-mockup__dot hero-mockup__dot--warning" />
            <div className="hero-mockup__dot hero-mockup__dot--accent" />
          </div>
          <span className="hero-mockup__title">Kitchen Dashboard</span>
          <div className="hero-mockup__live">
            <span className="hero-mockup__live-pulse-wrapper">
              <span className="hero-mockup__live-pulse"></span>
              <span className="hero-mockup__live-dot"></span>
            </span>
            <span className="hero-mockup__live-text">Live</span>
          </div>
        </div>

        {/* Stats bar */}
        <div className="hero-mockup__stats">
          <div className="hero-mockup__stat">
            <p className="hero-mockup__stat-value hero-mockup__stat-value--primary">24</p>
            <p className="hero-mockup__stat-label">Active</p>
          </div>
          <div className="hero-mockup__stat-divider" />
          <div className="hero-mockup__stat">
            <p className="hero-mockup__stat-value hero-mockup__stat-value--accent">156</p>
            <p className="hero-mockup__stat-label">Today</p>
          </div>
          <div className="hero-mockup__stat-divider" />
          <div className="hero-mockup__stat">
            <p className="hero-mockup__stat-value">0</p>
            <p className="hero-mockup__stat-label">Queue</p>
          </div>
        </div>

        {/* Orders list */}
        <div className="hero-mockup__orders">
          {orders.map((order, index) => {
            const config = statusConfig[order.status as keyof typeof statusConfig];
            const StatusIcon = config.icon;
            
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.8 + index * 0.15 }}
                className="hero-mockup__order"
              >
                <div className={`hero-mockup__order-icon hero-mockup__order-icon--${config.bg}`}>
                  <StatusIcon className={`hero-mockup__order-status-icon hero-mockup__order-status-icon--${config.color}`} />
                </div>
                <div className="hero-mockup__order-content">
                  <div className="hero-mockup__order-header">
                    <span className="hero-mockup__order-id">{order.id}</span>
                    <span className="hero-mockup__order-item">{order.item}</span>
                  </div>
                  <div className="hero-mockup__order-user">
                    <User className="hero-mockup__order-user-icon" />
                    <span className="hero-mockup__order-user-name">{order.user}</span>
                  </div>
                </div>
                <div className="hero-mockup__order-info">
                  <span className={`hero-mockup__order-status hero-mockup__order-status--${config.color}`}>{config.label}</span>
                  <p className="hero-mockup__order-time">{order.time}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom action */}
        <div className="hero-mockup__footer">
          <div className="hero-mockup__capacity">
            <span className="hero-mockup__capacity-label">Next slot capacity:</span>
            <div className="hero-mockup__capacity-bar">
              <div className="hero-mockup__capacity-track">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "75%" }}
                  transition={{ duration: 1.5, delay: 1.2 }}
                  className="hero-mockup__capacity-fill"
                />
              </div>
              <span className="hero-mockup__capacity-value">75%</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Floating notification card - hidden on small mobile */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, x: -20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 1.5 }}
        className="hero-mockup__notification"
      >
        <div className="hero-mockup__notification-content">
          <div className="hero-mockup__notification-icon">
            <Package className="hero-mockup__notification-icon-svg" />
          </div>
          <div>
            <p className="hero-mockup__notification-title">Order Ready!</p>
            <p className="hero-mockup__notification-subtitle">#2847 at Counter 2</p>
          </div>
        </div>
      </motion.div>

      {/* Floating time slot card - hidden on small mobile */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, x: 20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 1.8 }}
        className="hero-mockup__timeslot"
      >
        <div className="hero-mockup__timeslot-content">
          <div className="hero-mockup__timeslot-icon">
            <Clock className="hero-mockup__timeslot-icon-svg" />
          </div>
          <div>
            <p className="hero-mockup__timeslot-title">12:45 Slot</p>
            <p className="hero-mockup__timeslot-subtitle">5 spots left</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default HeroMockup;