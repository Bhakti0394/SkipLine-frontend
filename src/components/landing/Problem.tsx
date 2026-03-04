import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { AlertTriangle, Clock, Trash2, Users, TrendingDown } from "lucide-react";
import "../../styles/Problem.scss";

const problems = [
  {
    icon: Clock,
    title: "30-Minute Queues",
    description: "Students waste precious lunch breaks standing in line instead of eating.",
    stat: "30min",
    statLabel: "avg wait",
  },
  {
    icon: Users,
    title: "Kitchen Overload",
    description: "Peak hours create chaos. Staff can't keep up with sudden demand spikes.",
    stat: "3x",
    statLabel: "peak load",
  },
  {
    icon: AlertTriangle,
    title: "Impulsive Ordering",
    description: "Last-minute decisions lead to unpredictable workloads and delays.",
    stat: "70%",
    statLabel: "unplanned",
  },
  {
    icon: Trash2,
    title: "Food Waste",
    description: "Prepared meals go uncollected. Late pickups mean wasted resources.",
    stat: "25%",
    statLabel: "wasted",
  },
];

const Problem = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="problem">
      {/* Background accent */}
      <div className="problem__bg-accent" />

      <div className="problem__container">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="problem__header"
        >
          <span className="problem__badge">
            The Problem
          </span>
          <h2 className="problem__title">
            Built on Real Problems,
            <br />
            <span className="problem__title-muted">Not Assumptions</span>
          </h2>
          <p className="problem__description">
            We observed college canteens firsthand. The chaos is real—and fixable.
          </p>
        </motion.div>

        {/* Problem cards */}
        <div className="problem__cards">
          {problems.map((problem, index) => (
            <motion.div
              key={problem.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 * index }}
              className="problem__card"
            >
              {/* Background stat */}
              <div className="problem__card-bg-stat">
                {problem.stat}
              </div>

              <div className="problem__card-content">
                <div className="problem__icon-wrapper">
                  <problem.icon className="problem__icon" />
                </div>
                <div className="problem__card-text">
                  <div className="problem__card-header">
                    <h3 className="problem__card-title">{problem.title}</h3>
                    <span className="problem__card-stat">
                      {problem.stat} {problem.statLabel}
                    </span>
                  </div>
                  <p className="problem__card-description">{problem.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Transition statement */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="problem__transition"
        >
          <div className="problem__transition-box">
            <div className="problem__transition-header">
              <TrendingDown className="problem__transition-icon" />
              <span className="problem__transition-label">Our approach</span>
              <TrendingDown className="problem__transition-icon problem__transition-icon--flipped" />
            </div>
            <p className="problem__transition-text">
              This is not delivery.{" "}
              <span className="problem__transition-text-gradient">This is operational optimization.</span>
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Problem;