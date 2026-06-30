import React, { useEffect, useState } from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function SuccessPage({ onDone }) {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    // Launch celebratory confetti!
    const duration = 1.5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

    const randomInRange = (min, max) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      // Confetti from both sides
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    // Countdown timer for auto-reset
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          clearInterval(interval);
          onDone();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      clearInterval(interval);
    };
  }, [onDone]);

  return (
    <div className="max-w-md w-full mx-auto px-4 py-8 animate-slide-up">
      <div className="glass-panel rounded-3xl p-8 shadow-2xl relative overflow-hidden border border-slate-800 text-center flex flex-col items-center">
        {/* Glow decoration */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-emerald-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-teal-600/10 rounded-full blur-3xl"></div>

        {/* Large Animated Icon */}
        <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 shadow-inner mb-6 animate-bounce">
          <CheckCircle2 className="w-12 h-12" />
        </div>

        <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">
          Vote Cast Successfully!
        </h2>
        
        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          Thank you for participating! Your ballot has been recorded anonymously. You may now step away from the booth.
        </p>

        {/* Countdown Ring / Label */}
        <div className="text-sm font-semibold text-slate-500 flex items-center gap-2 mb-6">
          <span>Preparing kiosk for next voter...</span>
          <span className="w-6 h-6 rounded-full bg-slate-900 border border-slate-800 text-blue-400 flex items-center justify-center text-xs font-mono">
            {countdown}
          </span>
        </div>

        <button
          onClick={onDone}
          className="w-full bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-white font-semibold py-3 px-6 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all duration-200"
        >
          Done
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
