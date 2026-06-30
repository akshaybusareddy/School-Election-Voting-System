import { useEffect, useState, useRef } from 'react';

export const useIdleTimeout = ({ onTimeout, timeoutMs = 60000, warningMs = 15000, active = false }) => {
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(Math.round(warningMs / 1000));
  
  const timerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  useEffect(() => {
    const clearAllTimers = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };

    if (!active) {
      clearAllTimers();
      setShowWarning(false);
      return;
    }

    const resetTimer = () => {
      clearAllTimers();
      setShowWarning(false);
      
      // Timer for showing warning
      timerRef.current = setTimeout(() => {
        setShowWarning(true);
        startCountdown();
      }, timeoutMs - warningMs);
    };

    const startCountdown = () => {
      let secondsLeft = Math.round(warningMs / 1000);
      setTimeLeft(secondsLeft);
      
      countdownIntervalRef.current = setInterval(() => {
        secondsLeft -= 1;
        setTimeLeft(secondsLeft);
        if (secondsLeft <= 0) {
          clearAllTimers();
          onTimeout();
        }
      }, 1000);
    };

    // Activity event listeners
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      // If warning is showing, any interaction resets it
      resetTimer();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Initial trigger
    resetTimer();

    return () => {
      clearAllTimers();
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [active, onTimeout, timeoutMs, warningMs]);

  return { showWarning, timeLeft };
};
