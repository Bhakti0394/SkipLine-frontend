import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Check, X, Trophy } from "lucide-react";
import "../../styles/Whydifferent.scss";

const comparisons = [
  {
    others: "Solve delivery logistics",
    SkipLine: "Solve on-site congestion",
  },
  {
    others: "Focus on order volume",
    SkipLine: "Focus on kitchen productivity",
  },
  {
    others: "Generic user experience",
    SkipLine: "Behavioral UX design",
  },
  {
    others: "Ignore food waste",
    SkipLine: "Sustainability-first approach",
  },
  {
    others: "Theoretical optimizations",
    SkipLine: "Real-world constraints",
  },
];

const focuses = [
  { label: "Queue Elimination", emoji: "⏱️" },
  { label: "Kitchen Productivity", emoji: "👨‍🍳" },
  { label: "Behavioral UX", emoji: "🧠" },
  { label: "Sustainability", emoji: "♻️" },
  { label: "Real Constraints", emoji: "🎯" },
];

const WhyDifferent = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="why-different">
      {/* Background gradient */}
      <div className="why-different__bg-gradient" />

      <div className="why-different__container">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="why-different__header"
        >
          <span className="why-different__badge">
            <Trophy className="why-different__badge-icon" />
            Why SkipLine
          </span>
          <h2 className="why-different__title">
            Most Food Apps Solve Delivery.
            <br />
            <span className="why-different__title-gradient">We Solve Congestion.</span>
          </h2>
        </motion.div>

        {/* Comparison table */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="why-different__comparison"
        >
          {/* Headers */}
          <div className="why-different__headers">
            <div className="why-different__header-others">
              <span>Other Food Apps</span>
            </div>
            <div className="why-different__header-SkipLine">
              <span>SkipLine</span>
            </div>
          </div>

          {/* Comparison rows */}
          <div className="why-different__rows">
            {comparisons.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.1 * index }}
                className="why-different__row"
              >
                {/* Others */}
                <div className="why-different__item why-different__item--others">
                  <div className="why-different__icon-wrapper why-different__icon-wrapper--others">
                    <X className="why-different__icon" />
                  </div>
                  <span className="why-different__text why-different__text--others">{item.others}</span>
                </div>

                {/* SkipLine */}
                <div className="why-different__item why-different__item--SkipLine">
                  <div className="why-different__icon-wrapper why-different__icon-wrapper--SkipLine">
                    <Check className="why-different__icon" />
                  </div>
                  <span className="why-different__text why-different__text--SkipLine">{item.SkipLine}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Key focuses */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="why-different__focuses"
        >
          <p className="why-different__focuses-label">Our core focus areas:</p>
          <div className="why-different__focuses-list">
            {focuses.map((focus, index) => (
              <motion.span
                key={focus.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.3, delay: 0.7 + index * 0.1 }}
                className="why-different__focus-item"
              >
                <span className="why-different__focus-emoji">{focus.emoji}</span>
                {focus.label}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default WhyDifferent;