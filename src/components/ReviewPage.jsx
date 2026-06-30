import React, { useState } from 'react';
import { User, CheckCircle2, ArrowLeft, Send, AlertTriangle, RefreshCw } from 'lucide-react';

export default function ReviewPage({
  splSelection,
  asplSelection,
  onChangeSelection, // function to jump back to a step: (stepNumber) => void
  onCastVote,
  onBack,
  isSubmitting
}) {
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    try {
      await onCastVote();
    } catch (err) {
      setError(err.message || 'Failed to submit vote. Please contact the polling official.');
    }
  };

  return (
    <div className="max-w-4xl w-full mx-auto px-4 py-6 animate-slide-up flex flex-col min-h-[calc(100vh-100px)]">
      {/* Progress Bar Header */}
      <div className="mb-8 w-full max-w-xl mx-auto">
        <div className="flex justify-between items-center text-xs text-slate-400 mb-2 font-medium">
          <span>PIN Validated</span>
          <span>SPL Ballot</span>
          <span>ASPL Ballot</span>
          <span className="text-blue-400 font-bold">Review & Cast</span>
        </div>
        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: '100%' }}></div>
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-8">
        <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full text-xs font-semibold uppercase tracking-wider">
          Final Review
        </span>
        <h2 className="text-3xl font-extrabold text-white mt-3 tracking-tight">
          Review Your Selections
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Verify your choices below before submitting. Your vote remains completely anonymous.
        </p>
      </div>

      {/* Side-by-Side Review Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 items-stretch">
        {/* SPL Choice */}
        <div className="glass-panel rounded-3xl p-6 flex flex-col items-center justify-between border border-slate-800 relative">
          <div className="absolute top-4 left-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
            SPL Selection
          </div>
          
          <div className="flex flex-col items-center mt-6 flex-grow justify-center">
            <div className="w-32 h-32 rounded-2xl mb-4 flex items-center justify-center overflow-hidden border-2 border-slate-800 bg-slate-950/50 relative">
              {splSelection?.isNota ? (
                <div className="w-full h-full bg-slate-900/80 flex items-center justify-center text-slate-500 font-bold text-2xl font-mono">
                  ❌
                </div>
              ) : splSelection?.image_url ? (
                <img
                  src={splSelection.image_url}
                  alt={splSelection.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-slate-600" />
              )}
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight text-center">
              {splSelection?.name || 'No selection made'}
            </h3>
            {!splSelection?.isNota && splSelection && splSelection.party_name && (
              <p className="text-xl font-bold text-blue-600 text-center mt-1">🚩 {splSelection.party_name}</p>
            )}
            <p className="text-xs text-blue-400 font-semibold uppercase tracking-widest mt-2">
              {splSelection?.isNota ? 'Abstaining' : 'School Pupil Leader'}
            </p>
            {!splSelection?.isNota && splSelection && splSelection.class_section && (
              <p className="text-xs text-slate-500 font-semibold text-center mt-1">Class: {splSelection.class_section}</p>
            )}
          </div>

          <button
            onClick={() => onChangeSelection(1)}
            disabled={isSubmitting}
            className="w-full mt-6 py-2 px-4 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl text-sm font-semibold transition-all duration-200"
          >
            Change Choice
          </button>
        </div>

        {/* ASPL Choice */}
        <div className="glass-panel rounded-3xl p-6 flex flex-col items-center justify-between border border-slate-800 relative">
          <div className="absolute top-4 left-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
            ASPL Selection
          </div>

          <div className="flex flex-col items-center mt-6 flex-grow justify-center">
            <div className="w-32 h-32 rounded-2xl mb-4 flex items-center justify-center overflow-hidden border-2 border-slate-800 bg-slate-950/50 relative">
              {asplSelection?.isNota ? (
                <div className="w-full h-full bg-slate-900/80 flex items-center justify-center text-slate-500 font-bold text-2xl font-mono">
                  ❌
                </div>
              ) : asplSelection?.image_url ? (
                <img
                  src={asplSelection.image_url}
                  alt={asplSelection.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-slate-600" />
              )}
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight text-center">
              {asplSelection?.name || 'No selection made'}
            </h3>
            {!asplSelection?.isNota && asplSelection && asplSelection.party_name && (
              <p className="text-xl font-bold text-blue-600 text-center mt-1">🚩 {asplSelection.party_name}</p>
            )}
            <p className="text-xs text-blue-400 font-semibold uppercase tracking-widest mt-2">
              {asplSelection?.isNota ? 'Abstaining' : 'Assistant School Pupil Leader'}
            </p>
            {!asplSelection?.isNota && asplSelection && asplSelection.class_section && (
              <p className="text-xs text-slate-500 font-semibold text-center mt-1">Class: {asplSelection.class_section}</p>
            )}
          </div>

          <button
            onClick={() => onChangeSelection(2)}
            disabled={isSubmitting}
            className="w-full mt-6 py-2 px-4 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl text-sm font-semibold transition-all duration-200"
          >
            Change Choice
          </button>
        </div>
      </div>

      {error && (
        <div className="max-w-xl mx-auto w-full mb-6 bg-red-950/40 border border-red-500/30 text-red-400 rounded-2xl p-4 flex items-start gap-3 animate-fade-in">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm font-medium">{error}</div>
        </div>
      )}

      {/* Safety Notice */}
      <div className="max-w-xl mx-auto text-center text-xs text-slate-500 mb-8 leading-relaxed">
        🔒 By clicking "Submit Final Ballot", your votes will be encrypted and saved. The single-use PIN will be deactivated immediately, and you will not be able to vote again.
      </div>

      {/* Casting Buttons */}
      <div className="flex justify-between items-center gap-4 border-t border-slate-900 pt-6">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-6 py-3 border border-slate-800 rounded-xl text-slate-400 hover:text-white hover:border-slate-700 active:scale-95 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl active:scale-95 transition-all duration-300 font-bold shadow-lg shadow-emerald-500/20 text-lg border border-emerald-500/30 w-full md:w-auto text-center justify-center"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Recording Ballot...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Submit Final Ballot
            </>
          )}
        </button>
      </div>
    </div>
  );
}
