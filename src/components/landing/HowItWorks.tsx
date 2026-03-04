import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Smartphone, Server, LayoutDashboard, Bell, Package } from "lucide-react";
import "../../styles/Howitworks.scss";

const steps = [
  {
    icon: Smartphone,
    step: "01",
    title: "Pre-Order",
    description: "Users pre-order meals with flexible pickup slots",
    color: "primary",
  },
  {
    icon: Server,
    step: "02",
    title: "Smart Scheduling",
    description: "Backend prioritizes orders using capacity + time constraints",
    color: "accent",
  },
  {
    icon: LayoutDashboard,
    step: "03",
    title: "Kitchen Flow",
    description: "Kitchen receives a live Kanban flow of orders",
    color: "primary",
  },
  {
    icon: Bell,
    step: "04",
    title: "Real-Time Updates",
    description: "Users get real-time status updates on their orders",
    color: "accent",
  },
  {
    icon: Package,
    step: "05",
    title: "Fresh Pickup",
    description: "Food is picked up fresh — without queues",
    color: "primary",
  },
];

const HowItWorks = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="how-it-works">
      {/* Background accent */}
      <div className="how-it-works__background" />

      <div className="how-it-works__container">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="how-it-works__header"
        >
          <span className="how-it-works__badge">
            ⚡ How It Works
          </span>
          <h2 className="how-it-works__heading">
            From Order to Pickup
            <br />
            <span className="how-it-works__heading-muted">in 5 Simple Steps</span>
          </h2>
        </motion.div>

        {/* Steps timeline */}
        <div className="how-it-works__timeline">
          {/* Connection line */}
          <div className="how-it-works__connection-line" />

          <div className="how-it-works__steps">
            {steps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 * index }}
                className={`how-it-works__step ${
                  index % 2 === 0 
                    ? 'how-it-works__step--left' 
                    : 'how-it-works__step--right'
                }`}
              >
                {/* Content card */}
                <div className={`how-it-works__step-content ${
                  index % 2 === 0 
                    ? 'how-it-works__step-content--left' 
                    : 'how-it-works__step-content--right'
                }`}>
                  <div className={`how-it-works__card how-it-works__card--${step.color} ${
                    index % 2 === 0 
                      ? 'how-it-works__card--align-left' 
                      : 'how-it-works__card--align-right'
                  }`}>
                    <div className={`how-it-works__card-header ${
                      index % 2 === 0 
                        ? 'how-it-works__card-header--reverse' 
                        : ''
                    }`}>
                      <div className={`how-it-works__icon-wrapper how-it-works__icon-wrapper--${step.color}`}>
                        <step.icon className="how-it-works__icon" />
                      </div>
                      <div className={`how-it-works__step-info ${
                        index % 2 === 0 
                          ? 'how-it-works__step-info--right' 
                          : ''
                      }`}>
                        <span className={`how-it-works__step-number how-it-works__step-number--${step.color}`}>
                          Step {step.step}
                        </span>
                        <h3 className="how-it-works__step-title">{step.title}</h3>
                      </div>
                    </div>
                    <p className="how-it-works__step-description">{step.description}</p>
                  </div>
                </div>

                {/* Center dot */}
                <div className="how-it-works__center-dot">
                  <div className={`how-it-works__dot how-it-works__dot--${step.color}`} />
                </div>

                {/* Spacer for alternating layout */}
                <div className="how-it-works__spacer" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;