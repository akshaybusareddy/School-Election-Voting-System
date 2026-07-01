import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { useIdleTimeout } from './hooks/useIdleTimeout';
import PinEntry from './components/PinEntry';
import BallotPage from './components/BallotPage';
import ReviewPage from './components/ReviewPage';
import SuccessPage from './components/SuccessPage';
import AdminDashboard from './components/AdminDashboard';
import { Shield, AlertCircle } from 'lucide-react';
import './App.css';

export default function App() {
  const [candidates, setCandidates] = useState([]);
  const [pin, setPin] = useState('');
  
  // Navigation: 0 = PIN, 1 = SPL ballot, 2 = ASPL ballot, 3 = Review, 4 = Success
  const [step, setStep] = useState(0);
  
  const [splSelection, setSplSelection] = useState(null);
  const [asplSelection, setAsplSelection] = useState(null);
  
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setCandidates(data || []);
    } catch (err) {
      console.error('Error loading candidates:', err);
    }
  };

  const resetKiosk = () => {
    setPin('');
    setStep(0);
    setSplSelection(null);
    setAsplSelection(null);
    setIsSubmitting(false);
    // Reload candidates in case admin updated them
    loadCandidates();
  };

  // Idle timeout configuration: 60s total, warning at 15s remaining (45s idle)
  const { showWarning, timeLeft } = useIdleTimeout({
    onTimeout: resetKiosk,
    timeoutMs: 60000,
    warningMs: 15000,
    active: step > 0 && step < 4 // only count idle on ballot & review screens
  });

  const handlePinValidated = (validatedPin) => {
    setPin(validatedPin);
    setStep(1); // Proceed to SPL ballot
  };

  const handleCastVote = async () => {
    setIsSubmitting(true);
    try {
      // Cast ballot via secure RPC transaction
      const { data, error } = await supabase.rpc('cast_ballot', {
        input_pin: pin,
        spl_candidate_id: splSelection?.id === -1 ? null : splSelection?.id,
        aspl_candidate_id: asplSelection?.id === -1 ? null : asplSelection?.id
      });

      if (error) throw new Error(error.message);
      if (data && !data.success) throw new Error(data.error);

      // Success, route to success screen
      setStep(4);
    } catch (err) {
      console.error(err);
      throw new Error(err.message || 'Database error occurred. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const splCandidates = candidates.filter(c => c.position === 'SPL');
  const asplCandidates = candidates.filter(c => c.position === 'ASPL');

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Kiosk App Header */}
      <header className="py-5 px-6 border-b border-slate-900 bg-slate-950/40 backdrop-blur-sm flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/school-logo.png" alt="Little Angels Public School Logo" className="w-10 h-10 object-contain" />
          <div>
            <h1 className="text-sm font-extrabold text-slate-800 tracking-wide uppercase leading-tight">Little Angels Public School</h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-wider">Official Voting Terminal</p>
          </div>
        </div>
        
        {step > 0 && step < 4 && (
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-full shadow-sm">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Session Active</span>
          </div>
        )}
      </header>

      {/* Main Ballot View Switcher */}
      <main className="flex-grow flex items-center justify-center py-8">
        {step === 0 && (
          <PinEntry onPinSubmit={handlePinValidated} />
        )}

        {step === 1 && (
          <BallotPage
            title="School Pupil Leader"
            subtitle="Please select one candidate to lead the student body for this academic year."
            position="SPL"
            candidates={splCandidates}
            selectedCandidate={splSelection}
            onSelectCandidate={setSplSelection}
            onNext={() => setStep(2)}
            stepNumber={1}
            totalSteps={3}
          />
        )}

        {step === 2 && (
          <BallotPage
            title="Assistant School Pupil Leader"
            subtitle="Please select one assistant candidate to support the SPL."
            position="ASPL"
            candidates={asplCandidates}
            selectedCandidate={asplSelection}
            onSelectCandidate={setAsplSelection}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
            stepNumber={2}
            totalSteps={3}
          />
        )}

        {step === 3 && (
          <ReviewPage
            splSelection={splSelection}
            asplSelection={asplSelection}
            onChangeSelection={(targetStep) => setStep(targetStep)}
            onCastVote={handleCastVote}
            onBack={() => setStep(2)}
            isSubmitting={isSubmitting}
          />
        )}

        {step === 4 && (
          <SuccessPage onDone={resetKiosk} />
        )}
      </main>

      {/* App Footer & Admin Anchor */}
      <footer className="py-4 border-t border-slate-905 bg-slate-950/20 px-6 flex justify-between items-center">
        <p className="text-[10px] text-slate-600 font-semibold">
          © {new Date().getFullYear()} School Election Committee. All rights reserved.
        </p>
        <button
          onClick={() => setIsAdminOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-900 hover:border-slate-800 text-slate-700 hover:text-slate-400 transition-all duration-200 text-xs font-semibold"
        >
          <Shield className="w-3.5 h-3.5" />
          Admin Console
        </button>
      </footer>

      {/* Admin Panel Overlay */}
      {isAdminOpen && (
        <AdminDashboard onClose={() => {
          setIsAdminOpen(false);
          // Refresh candidate lists in case changed
          loadCandidates();
        }} />
      )}

      {/* Kiosk Idle Warning Banner */}
      {showWarning && (
        <div className="fixed bottom-6 right-6 max-w-sm w-full bg-slate-900 border-2 border-amber-500/30 rounded-2xl p-4 shadow-2xl shadow-amber-500/5 animate-slide-up z-50">
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl flex items-center justify-center flex-shrink-0 animate-pulse">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Are you still there?</h4>
              <p className="text-slate-400 text-xs mt-1 leading-normal">
                To protect privacy, this screen will reset in{' '}
                <span className="text-amber-400 font-extrabold font-mono text-sm">{timeLeft}</span>{' '}
                seconds. Touch anywhere to continue voting.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
