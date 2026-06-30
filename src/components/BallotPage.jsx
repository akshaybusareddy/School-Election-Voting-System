import React from 'react';
import { User, Check, ArrowRight, ArrowLeft } from 'lucide-react';

export default function BallotPage({
  title,
  subtitle,
  position, // 'SPL' or 'ASPL'
  candidates,
  selectedCandidate,
  onSelectCandidate,
  onNext,
  onBack,
  stepNumber,
  totalSteps = 3
}) {
  // Add a NOTA (None of the Above) candidate to the selection options
  const notaCandidate = {
    id: -1, // Special NOTA ID
    name: 'None of the Above (NOTA)',
    position: position,
    image_url: null,
    isNota: true
  };

  const allChoices = [...candidates, notaCandidate];

  return (
    <div className="max-w-5xl w-full mx-auto px-4 py-6 animate-slide-up flex flex-col min-h-[calc(100vh-100px)]">
      {/* Progress Bar Header */}
      <div className="mb-8 w-full max-w-xl mx-auto">
        <div className="flex justify-between items-center text-xs text-slate-400 mb-2 font-medium">
          <span>PIN Validated</span>
          <span className={stepNumber >= 1 ? "text-blue-400 font-bold" : ""}>SPL Ballot</span>
          <span className={stepNumber >= 2 ? "text-blue-400 font-bold" : ""}>ASPL Ballot</span>
          <span className={stepNumber === 3 ? "text-blue-400 font-bold" : ""}>Review & Cast</span>
        </div>
        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div 
            className="h-full bg-blue-500 transition-all duration-500 ease-out" 
            style={{ width: `${(stepNumber / totalSteps) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Screen Title */}
      <div className="text-center mb-8">
        <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-semibold uppercase tracking-wider">
          Election Ballot
        </span>
        <h2 className="text-3xl font-extrabold text-white mt-3 tracking-tight">
          {title}
        </h2>
        <p className="text-slate-400 text-sm mt-1">{subtitle}</p>
      </div>

      {/* Candidates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 flex-grow items-stretch">
        {allChoices.map((candidate) => {
          const isSelected = selectedCandidate?.id === candidate.id;
          
          return (
            <div
              key={candidate.id}
              onClick={() => onSelectCandidate(candidate)}
              className={`glass-card rounded-2xl p-6 flex flex-col items-center justify-between cursor-pointer transition-all duration-300 relative select-none group ${
                isSelected 
                  ? 'selected-ring border-blue-500 bg-blue-950/20' 
                  : 'hover:-translate-y-1 hover:shadow-blue-500/5 hover:border-slate-700'
              }`}
            >
              {/* Selected Badge */}
              {isSelected && (
                <div className="absolute top-4 right-4 bg-blue-500 text-white rounded-full p-1 shadow-md shadow-blue-500/20 animate-fade-in">
                  <Check className="w-4 h-4" />
                </div>
              )}

              {/* Candidate Image/Avatar */}
              <div className="w-40 h-40 md:w-48 md:h-48 rounded-2xl mb-4 flex items-center justify-center overflow-hidden border-2 border-slate-800 bg-slate-950/50 group-hover:border-blue-500/30 transition-all duration-300 relative shadow-inner">
                {candidate.isNota ? (
                  <div className="w-full h-full bg-slate-900/80 flex items-center justify-center text-slate-500 font-bold text-3xl font-mono">
                    ❌
                  </div>
                ) : candidate.image_url ? (
                  <img
                    src={candidate.image_url}
                    alt={candidate.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <User className="w-16 h-16 text-slate-600" />
                )}
              </div>

              {/* Candidate Metadata */}
              <div className="text-center w-full mb-6">
                <h3 className="text-lg font-bold text-white tracking-tight leading-tight group-hover:text-blue-400 transition-colors duration-200">
                  {candidate.name}
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-widest">
                  {candidate.isNota ? 'Abstain' : `${position} Candidate`}
                </p>
              </div>

              {/* Selection Button */}
              <button
                type="button"
                className={`w-full py-2 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 group-hover:bg-slate-800 group-hover:text-white'
                }`}
              >
                {isSelected ? 'Selected' : 'Select'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Navigation Footer */}
      <div className="flex justify-between items-center gap-4 mt-12 border-t border-slate-900 pt-6">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-6 py-3 border border-slate-800 rounded-xl text-slate-400 hover:text-white hover:border-slate-700 active:scale-95 transition-all duration-200 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}
        <div className="flex-grow"></div>
        <button
          onClick={onNext}
          disabled={!selectedCandidate}
          className="flex items-center gap-2 px-8 py-3 bg-blue-600 disabled:bg-slate-900 disabled:text-slate-600 disabled:border-slate-950 disabled:cursor-not-allowed hover:bg-blue-500 text-white rounded-xl active:scale-95 transition-all duration-200 font-bold shadow-lg shadow-blue-500/10 ml-auto border border-blue-500/20"
        >
          Confirm & Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
