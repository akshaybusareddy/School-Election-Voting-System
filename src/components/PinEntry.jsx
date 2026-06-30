import React, { useState, useEffect, useRef } from 'react';
import { Lock, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../supabase';

export default function PinEntry({ onPinSubmit }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    // Focus the input automatically on mount
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const formatPin = (value) => {
    // Remove non-alphanumeric characters, convert to uppercase, limit to 6 characters
    const clean = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
    // Add a hyphen in the middle: XXXX-XX or XXX-XXX? 
    // The user example is A7X9-B2 (4 chars, hyphen, 2 chars) or general 6 chars. 
    // Let's format it as XXXX-XX if it reaches 5 or more characters.
    if (clean.length > 4) {
      return `${clean.slice(0, 4)}-${clean.slice(4)}`;
    }
    return clean;
  };

  const handleChange = (e) => {
    setError('');
    setPin(formatPin(e.target.value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanPin = pin.replace('-', '');
    
    if (cleanPin.length !== 6) {
      setError('Please enter a valid 6-character PIN.');
      return;
    }

    setIsValidating(true);
    setError('');

    try {
      // Re-insert hyphen if formatted that way in DB, or check raw code
      // We will look up either: A7X9-B2 or A7X9B2 (we check both to be safe, or check the exact clean vs formatted)
      const pinToSearch = pin; // e.g. A7X9-B2
      
      const { data, error: fetchError } = await supabase
        .from('tokens')
        .select('*')
        .or(`pin_code.eq.${pinToSearch},pin_code.eq.${cleanPin}`)
        .single();

      if (fetchError || !data) {
        setError('Invalid PIN code. Please check and try again.');
      } else if (data.is_used) {
        setError('This PIN has already been used to vote.');
      } else {
        // Valid PIN! Pass the matching pin_code back
        onPinSubmit(data.pin_code);
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred. Please ask the supervisor for assistance.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto px-4 py-8 animate-slide-up">
      <div className="glass-panel rounded-3xl p-8 shadow-2xl relative overflow-hidden border border-slate-800">
        {/* Glow decoration */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-cyan-600/10 rounded-full blur-3xl"></div>

        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600/10 border border-blue-500/30 rounded-2xl flex items-center justify-center text-blue-500 shadow-inner mb-4 animate-pulse-slow">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white text-center">
            School Voting Kiosk
          </h2>
          <p className="text-slate-400 text-sm text-center mt-1">
            Please enter your single-use 6-character voting PIN.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={pin}
              onChange={handleChange}
              placeholder="e.g. A7X9-B2"
              disabled={isValidating}
              className="w-full text-center text-3xl font-mono tracking-widest uppercase py-4 rounded-2xl glass-input border-2 border-slate-800 focus:border-blue-500 transition-all duration-300 font-bold placeholder:text-slate-700 placeholder:text-xl"
              maxLength={7} // 6 letters + 1 hyphen
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
          </div>

          {error && (
            <div className="bg-red-950/40 border border-red-500/30 text-red-400 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isValidating || pin.replace('-', '').length !== 6}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800/80 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-lg font-semibold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all duration-200"
          >
            {isValidating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Validating PIN...
              </>
            ) : (
              <>
                Start Voting
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-800/50 pt-4">
          <p className="text-xs text-slate-500">
            For security, this device resets automatically after 60 seconds of inactivity.
          </p>
        </div>
      </div>
    </div>
  );
}
