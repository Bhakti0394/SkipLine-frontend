import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { 
  BarChart3, 
  Flame, 
  Bell, 
  MessageSquare, 
  Scale, 
  Recycle,
  Clock,
  Shield,
  Sparkles,
  Zap
} from "lucide-react";
import "../../styles/Features.scss";

const features = [
  {
    icon: BarChart3,
    title: "Real-Time Dashboards",
    description: "Live operational views for both kitchen staff and management.",
    highlight: true,
    color: "primary",
  },
  {
    icon: Flame,
    title: "Streak-Based Habits",
    description: "Gamified ordering to build consistent pre-ordering behavior.",
    highlight: false,
    color: "accent",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description: "Context-aware alerts for order status and pickup reminders.",
    highlight: false,
    color: "primary",
  },
  {
    icon: MessageSquare,
    title: "User Feedback Loops",
    description: "Continuous improvement through real-time user input.",
    highlight: false,
    color: "accent",
  },
  {
    icon: Scale,
    title: "Workload Balancing",
    description: "Automatic distribution of orders across time slots.",
    highlight: true,
    color: "accent",
  },
  {
    icon: Recycle,
    title: "Waste-Aware Cooking",
    description: "Demand-driven preparation minimizes overproduction.",
    highlight: false,
    color: "primary",
  },
  {
    icon: Clock,
    title: "Slot Capacity Caps",
    description: "Prevent overload with intelligent slot management.",
    highlight: false,
    color: "accent",
  },
  {
    icon: Shield,
    title: "Late Pickup Handling",
    description: "Smart reassignment and notification for missed pickups.",
    highlight: false,
    color: "primary",
  },
];

const Features = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="features-section">
      {/* Background effects */}
      <div className="features-section__bg-left" />
      <div className="features-section__bg-right" />

      <div className="features-section__container">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="features-section__header"
        >
          <span className="features-section__badge">
            <Zap className="features-section__badge-icon" />
            More Than an App
          </span>
          <h2 className="features-section__heading">
            A Complete System
            <br />
            <span className="features-section__heading-muted">for Operational Excellence</span>
          </h2>
          <p className="features-section__description">
            Every feature is designed to optimize operations, not just place orders.
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="features-section__grid">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.05 * index }}
              className={`features-section__card ${
                feature.highlight ? 'features-section__card--highlight' : ''
              } ${
                feature.color === 'primary' 
                  ? 'features-section__card--primary' 
                  : 'features-section__card--accent'
              }`}
            >
              {/* Hover glow */}
              <div className="features-section__card-glow" />

              {feature.highlight && (
                <div className="features-section__card-sparkle">
                  <Sparkles className="features-section__sparkle-icon" />
                </div>
              )}

              <div className="features-section__card-content">
                <div className="features-section__icon-wrapper">
                  <feature.icon className="features-section__icon" />
                </div>
                <h3 className="features-section__card-title">{feature.title}</h3>
                <p className="features-section__card-text">{feature.description}</p>
              </div>

              {/* Bottom accent line on hover */}
              <div className="features-section__card-accent-line" />
            </motion.div>
          ))}
        </div>

        {/* Efficiency callout */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="features-section__callout"
        >
          <div className="features-section__callout-content">
            <div className="features-section__pulse-dots">
              {[...Array(3)].map((_, i) => (
                <div 
                  key={i} 
                  className="features-section__pulse-dot" 
                  style={{ animationDelay: `${i * 0.2}s` }} 
                />
              ))}
            </div>
            <p className="features-section__callout-text">
              <span className="features-section__callout-gradient">Every interaction is optimized.</span>
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Features;