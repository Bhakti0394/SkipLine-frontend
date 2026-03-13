import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, Github, Twitter, Linkedin, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import SkipLineLogo from "./SkipLineLogo";
import "../../styles/Cta.scss";

const CTA = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="cta-section">
      {/* Background Effects */}
      <div className="cta-section__background">
        <div className="cta-section__gradient-blob" />
      </div>

      {/* Animated grid pattern */}
      <div className="cta-section__grid-pattern" />

      <div className="cta-section__container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="cta-section__content"
        >
          {/* Main CTA */}
          <div className="cta-section__main">
            {/* Decorative element */}
            <motion.div
              initial={{ scale: 0 }}
              animate={isInView ? { scale: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="cta-section__logo-wrapper"
            >
              <SkipLineLogo size="xl" className="cta-section__logo" />
            </motion.div>

            <h2 className="cta-section__heading">
              Ready to Eliminate
              <br />
              <span className="cta-section__heading-gradient">Your Queue Problem?</span>
            </h2>
            
            <p className="cta-section__description">
              Join the revolution in food service operations. 
              Let's make waiting a thing of the past.
            </p>
            
            <div className="cta-section__buttons">
              <Button size="lg" className="cta-section__primary-button">
                <span className="cta-section__button-content">
                  Start Free Trial
                  <ArrowRight className="cta-section__button-icon" />
                </span>
                <div className="cta-section__button-gradient" />
              </Button>
              
              <Button size="lg" variant="outline" className="cta-section__secondary-button">
                Schedule Demo
                <Mail className="cta-section__button-icon-secondary" />
              </Button>
            </div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.5 }}
              className="cta-section__badges"
            >
              <span className="cta-section__badge">
                <div className="cta-section__badge-dot cta-section__badge-dot--accent" />
                No credit card required
              </span>
              <span className="cta-section__badge">
                <div className="cta-section__badge-dot cta-section__badge-dot--primary" />
                Free 14-day trial
              </span>
              <span className="cta-section__badge">
                <div className="cta-section__badge-dot cta-section__badge-dot--accent" />
                Setup in 5 minutes
              </span>
            </motion.div>
          </div>

          {/* Divider */}
          <div className="cta-section__divider" />

          {/* Footer */}
          <div className="cta-section__footer">
            {/* Top row - Logo and links */}
            <div className="cta-section__footer-content">
              <div className="cta-section__footer-brand">
                <SkipLineLogo size="sm" className="cta-section__footer-logo" />
                <div className="cta-section__footer-text">
                  <span className="cta-section__footer-title">SkipLine</span>
                  <span className="cta-section__footer-copyright">© 2024 All rights reserved</span>
                </div>
              </div>

              <div className="cta-section__footer-links">
                <a href="#" className="cta-section__footer-link">About</a>
                <a href="#" className="cta-section__footer-link">Documentation</a>
                <a href="#" className="cta-section__footer-link">Privacy</a>
                <a href="#" className="cta-section__footer-link">Contact</a>
              </div>

              <div className="cta-section__footer-socials">
                <a href="#" className="cta-section__social-link" aria-label="GitHub">
                  <Github className="cta-section__social-icon" />
                </a>
                <a href="#" className="cta-section__social-link" aria-label="Twitter">
                  <Twitter className="cta-section__social-icon" />
                </a>
                <a href="#" className="cta-section__social-link" aria-label="LinkedIn">
                  <Linkedin className="cta-section__social-icon" />
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;