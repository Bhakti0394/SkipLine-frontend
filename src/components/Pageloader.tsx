import { useEffect, useState, useRef } from "react";

interface PageLoaderProps {
  onComplete: () => void;
  minDuration?: number; // ms — default 3200
}

const TAGLINES = [
  "Zero waste. Zero wait.",
  "Firing up the kitchen…",
  "Smart meals. Smarter ops.",
];

const PARTICLES = [
  { emoji: "🍱", delay: 0,    dur: 3.2, r: 110, startAngle: 0   },
  { emoji: "🥘", delay: 0.4,  dur: 2.8, r: 140, startAngle: 72  },
  { emoji: "🌿", delay: 0.8,  dur: 3.6, r: 95,  startAngle: 144 },
  { emoji: "⚡", delay: 0.2,  dur: 2.5, r: 155, startAngle: 216 },
  { emoji: "🍽️", delay: 1.0,  dur: 3.0, r: 120, startAngle: 288 },
  { emoji: "🔥", delay: 0.6,  dur: 2.9, r: 80,  startAngle: 36  },
];

export function PageLoader({ onComplete, minDuration = 6200 }: PageLoaderProps) {
  const [progress, setProgress]     = useState(0);
  const [tagline, setTagline]        = useState("");
  const [taglineIdx, setTaglineIdx]  = useState(0);
  const [exiting, setExiting]        = useState(false);
  const [dots, setDots]              = useState(0);
  const startRef                     = useRef(Date.now());
  const doneRef                      = useRef(false);

  // ── Progress bar — fills over minDuration ────────────────────────────────
  useEffect(() => {
    const total  = minDuration;
    const tick   = 30;
    let elapsed  = 0;

    const id = setInterval(() => {
      elapsed += tick;
      const p = Math.min(100, Math.round((elapsed / total) * 100));
      setProgress(p);

      if (p >= 100 && !doneRef.current) {
        doneRef.current = true;
        clearInterval(id);
        // small pause then exit
        setTimeout(() => {
          setExiting(true);
          setTimeout(onComplete, 700);
        }, 200);
      }
    }, tick);

    return () => clearInterval(id);
  }, [minDuration, onComplete]);

  // ── Typewriter tagline ───────────────────────────────────────────────────
  useEffect(() => {
    const full = TAGLINES[taglineIdx];
    let i = 0;
    setTagline("");

    const type = setInterval(() => {
      i++;
      setTagline(full.slice(0, i));
      if (i >= full.length) {
        clearInterval(type);
        // hold then erase
        setTimeout(() => {
          const erase = setInterval(() => {
            i--;
            setTagline(full.slice(0, i));
            if (i <= 0) {
              clearInterval(erase);
              setTaglineIdx(idx => (idx + 1) % TAGLINES.length);
            }
          }, 28);
        }, 900);
      }
    }, 48);

    return () => clearInterval(type);
  }, [taglineIdx]);

  // ── Blinking dots ────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setDots(d => (d + 1) % 4), 900);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;600&display=swap');

        .pl-root {
          position: fixed;
          inset: 0;
          z-index: 99999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: #080706;
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .pl-root.pl-exit {
          opacity: 0;
          transform: scale(1.04);
          pointer-events: none;
        }

        /* ── Radial ambient glow ── */
        .pl-glow {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 60% 40% at 50% 50%, rgba(249,115,22,0.13) 0%, transparent 70%),
            radial-gradient(ellipse 30% 60% at 20% 80%, rgba(234,88,12,0.07) 0%, transparent 60%),
            radial-gradient(ellipse 40% 30% at 80% 20%, rgba(251,146,60,0.06) 0%, transparent 60%);
          pointer-events: none;
        }

        /* ── Grid ── */
        .pl-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(249,115,22,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(249,115,22,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
        }

        /* ── Scanlines ── */
        .pl-scan {
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.08) 2px,
            rgba(0,0,0,0.08) 4px
          );
          pointer-events: none;
          mix-blend-mode: multiply;
        }

        /* ── Orbit stage ── */
        .pl-stage {
          position: relative;
          width: 320px;
          height: 320px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ── Orbit rings ── */
        .pl-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(249,115,22,0.12);
          animation: pl-ring-pulse 3s ease-in-out infinite;
        }
        .pl-ring-1 { width: 190px; height: 190px; animation-delay: 0s;   }
        .pl-ring-2 { width: 250px; height: 250px; animation-delay: 0.6s; border-style: dashed; opacity: 0.5; }
        .pl-ring-3 { width: 310px; height: 310px; animation-delay: 1.2s; opacity: 0.25; }

        @keyframes pl-ring-pulse {
          0%,100% { opacity: 0.15; transform: scale(1);    }
          50%      { opacity: 0.35; transform: scale(1.02); }
        }

        /* ── Particle orbit ── */
        .pl-particle {
          position: absolute;
          font-size: 1.35rem;
          filter: drop-shadow(0 0 8px rgba(249,115,22,0.6));
          animation: pl-orbit linear infinite;
          transform-origin: 0 0;
          will-change: transform;
        }

        @keyframes pl-orbit {
          from { transform: rotate(var(--start)) translateX(var(--r)) rotate(calc(-1 * var(--start))); }
          to   { transform: rotate(calc(var(--start) + 360deg)) translateX(var(--r)) rotate(calc(-1 * (var(--start) + 360deg))); }
        }

        /* ── Logo mark ── */
        .pl-logo {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .pl-logo-box {
          width: 72px;
          height: 72px;
          border-radius: 20px;
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Syne', sans-serif;
          font-size: 2rem;
          font-weight: 800;
          color: #fff;
          box-shadow:
            0 0 0 1px rgba(249,115,22,0.3),
            0 0 40px rgba(249,115,22,0.5),
            0 0 80px rgba(249,115,22,0.2);
          animation: pl-logo-breathe 2s ease-in-out infinite;
        }

        @keyframes pl-logo-breathe {
          0%,100% { box-shadow: 0 0 0 1px rgba(249,115,22,0.3), 0 0 40px rgba(249,115,22,0.5), 0 0 80px rgba(249,115,22,0.2); }
          50%      { box-shadow: 0 0 0 1px rgba(249,115,22,0.5), 0 0 60px rgba(249,115,22,0.7), 0 0 120px rgba(249,115,22,0.3); }
        }

        .pl-brand {
          font-family: 'Syne', sans-serif;
          font-size: 1.75rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          background: linear-gradient(90deg, #fb923c, #f97316, #fdba74);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* ── Tagline ── */
        .pl-tagline-wrap {
          margin-top: 2rem;
          height: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pl-tagline {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.8rem;
          font-weight: 400;
          color: rgba(249,115,22,0.75);
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .pl-cursor {
          display: inline-block;
          width: 2px;
          height: 0.85em;
          background: #f97316;
          margin-left: 2px;
          vertical-align: middle;
          animation: pl-blink 0.8s step-end infinite;
        }

        @keyframes pl-blink {
          0%,100% { opacity: 1; }
          50%      { opacity: 0; }
        }

        /* ── Progress bar ── */
        .pl-progress-wrap {
          margin-top: 2.5rem;
          width: 280px;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .pl-progress-track {
          width: 100%;
          height: 3px;
          background: rgba(249,115,22,0.1);
          border-radius: 99px;
          overflow: hidden;
          position: relative;
        }

        .pl-progress-fill {
          height: 100%;
          border-radius: 99px;
          background: linear-gradient(90deg, #ea580c, #f97316, #fb923c);
          transition: width 0.06s linear;
          position: relative;
          box-shadow: 0 0 10px rgba(249,115,22,0.8);
        }

        /* Shimmer on progress bar */
        .pl-progress-fill::after {
          content: '';
          position: absolute;
          top: 0; right: 0;
          width: 40px;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          animation: pl-shimmer 1s ease-in-out infinite;
        }

        @keyframes pl-shimmer {
          from { transform: translateX(-40px); opacity: 0; }
          50%  { opacity: 1; }
          to   { transform: translateX(10px); opacity: 0; }
        }

        .pl-progress-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .pl-status {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.65rem;
          color: rgba(148,163,184,0.5);
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .pl-pct {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.7rem;
          font-weight: 600;
          color: #f97316;
          letter-spacing: 0.04em;
        }

        /* ── Corner accents ── */
        .pl-corner {
          position: absolute;
          width: 32px;
          height: 32px;
        }
        .pl-corner--tl { top: 24px; left: 24px; border-top: 2px solid rgba(249,115,22,0.4); border-left: 2px solid rgba(249,115,22,0.4); border-radius: 2px 0 0 0; }
        .pl-corner--tr { top: 24px; right: 24px; border-top: 2px solid rgba(249,115,22,0.4); border-right: 2px solid rgba(249,115,22,0.4); border-radius: 0 2px 0 0; }
        .pl-corner--bl { bottom: 24px; left: 24px; border-bottom: 2px solid rgba(249,115,22,0.4); border-left: 2px solid rgba(249,115,22,0.4); border-radius: 0 0 0 2px; }
        .pl-corner--br { bottom: 24px; right: 24px; border-bottom: 2px solid rgba(249,115,22,0.4); border-right: 2px solid rgba(249,115,22,0.4); border-radius: 0 0 2px 0; }

        /* ── Status steps ── */
        .pl-steps {
          margin-top: 1.25rem;
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .pl-step {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.6rem;
          color: rgba(100,116,139,0.6);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          transition: color 0.3s ease;
        }

        .pl-step.pl-step--done {
          color: rgba(249,115,22,0.8);
        }

        .pl-step-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: currentColor;
          flex-shrink: 0;
        }
      `}</style>

      <div className={`pl-root${exiting ? " pl-exit" : ""}`}>
        {/* Atmosphere */}
        <div className="pl-glow" />
        <div className="pl-grid" />
        <div className="pl-scan" />

        {/* Corner brackets */}
        <div className="pl-corner pl-corner--tl" />
        <div className="pl-corner pl-corner--tr" />
        <div className="pl-corner pl-corner--bl" />
        <div className="pl-corner pl-corner--br" />

        {/* Orbit stage */}
        <div className="pl-stage">
          {/* Rings */}
          <div className="pl-ring pl-ring-1" />
          <div className="pl-ring pl-ring-2" />
          <div className="pl-ring pl-ring-3" />

          {/* Orbiting particles */}
          {PARTICLES.map((p, i) => (
            <div
              key={i}
              className="pl-particle"
              style={{
                "--start": `${p.startAngle}deg`,
                "--r": `${p.r}px`,
                animationDuration: `${p.dur}s`,
                animationDelay: `${p.delay}s`,
              } as React.CSSProperties}
            >
              {p.emoji}
            </div>
          ))}

          {/* Logo */}
          <div className="pl-logo">
            <div className="pl-logo-box">P</div>
            <div className="pl-brand">Prepline</div>
          </div>
        </div>

        {/* Typewriter tagline */}
        <div className="pl-tagline-wrap">
          <span className="pl-tagline">
            {tagline}
            <span className="pl-cursor" />
          </span>
        </div>

        {/* Progress */}
        <div className="pl-progress-wrap">
          <div className="pl-progress-track">
            <div className="pl-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="pl-progress-meta">
            <span className="pl-status">
              {progress < 30 ? "Initializing" : progress < 60 ? "Loading menu" : progress < 90 ? "Syncing orders" : "Ready"}
              {"...".slice(0, dots)}
            </span>
            <span className="pl-pct">{progress}%</span>
          </div>
        </div>

        {/* Status steps */}
        <div className="pl-steps">
          {[
            { label: "Auth",    threshold: 20  },
            { label: "Menu",    threshold: 50  },
            { label: "Kitchen", threshold: 75  },
            { label: "Live",    threshold: 95  },
          ].map(s => (
            <div key={s.label} className={`pl-step${progress >= s.threshold ? " pl-step--done" : ""}`}>
              <div className="pl-step-dot" />
              {s.label}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}