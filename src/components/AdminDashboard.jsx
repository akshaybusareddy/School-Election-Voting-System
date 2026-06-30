import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { BarChart3, Ticket, UserPlus, Settings, Lock, Unlock, LogOut, Check, X, RefreshCw, Plus, Trash2, ShieldAlert, Download, Copy } from 'lucide-react';

export default function AdminDashboard({ onClose }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  
  const [activeTab, setActiveTab] = useState('results');
  const [candidates, setCandidates] = useState([]);
  const [votes, setVotes] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);

  // Candidate Form
  const [newCandName, setNewCandName] = useState('');
  const [newCandPos, setNewCandPos] = useState('SPL');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  // Token Generator Form
  const [numTokens, setNumTokens] = useState(50);
  const [genMessage, setGenMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Admin Access Password
  const ADMIN_PASS = 'Sree@1735';

  useEffect(() => {
    if (isAuthenticated) {
      fetchAdminData();
      
      // Set up real-time subscription simulation / interval check
      const interval = setInterval(() => {
        fetchAdminData();
      }, 5000); // refresh statistics every 5 seconds
      
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const fetchAdminData = async () => {
    try {
      // Fetch Candidates
      const { data: candData } = await supabase.from('candidates').select('*');
      setCandidates(candData || []);

      // Fetch Votes
      const { data: voteData } = await supabase.from('votes').select('*');
      setVotes(voteData || []);

      // Fetch Tokens
      const { data: tokenData } = await supabase.from('tokens').select('*').order('created_at', { ascending: false });
      setTokens(tokenData || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASS) {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Incorrect admin password.');
    }
  };

  // Generate unique alphanumeric 6-character PIN (excluding O, 0, I, 1 to prevent reading confusion)
  const generatePin = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pin = '';
    for (let i = 0; i < 6; i++) {
      pin += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // format as XXXX-XX
    return `${pin.slice(0, 4)}-${pin.slice(4)}`;
  };

  const handleGenerateTokens = async (e) => {
    e.preventDefault();
    if (numTokens <= 0 || numTokens > 500) {
      setGenMessage('Please generate between 1 and 500 PINs.');
      return;
    }

    setIsGenerating(true);
    setGenMessage('');

    try {
      const generated = [];
      const existingPins = tokens.map(t => t.pin_code);
      
      while (generated.length < numTokens) {
        const pin = generatePin();
        if (!existingPins.includes(pin) && !generated.some(g => g.pin_code === pin)) {
          generated.push({
            pin_code: pin,
            is_used: false,
            created_at: new Date().toISOString()
          });
        }
      }

      const { error } = await supabase.from('tokens').insert(generated);
      if (error) throw error;

      setGenMessage(`Successfully generated ${numTokens} new voting PINs!`);
      fetchAdminData();
    } catch (err) {
      console.error(err);
      setGenMessage('Error generating tokens. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearSelectedFile = () => {
    setImageFile(null);
    setImagePreview('');
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    if (!newCandName.trim()) return;

    setLoading(true);
    try {
      let finalImageUrl = '';

      if (imageFile) {
        if (supabase.isMock) {
          // Local Storage Mock Mode: Use base64 Data URL directly
          finalImageUrl = imagePreview;
        } else {
          // Supabase Production Mode: Upload to Storage Bucket 'candidate-images'
          const fileExt = imageFile.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
          const filePath = `${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('candidate-images')
            .upload(filePath, imageFile, {
              cacheControl: '3600',
              upsert: true
            });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('candidate-images')
            .getPublicUrl(filePath);

          finalImageUrl = urlData.publicUrl;
        }
      } else {
        // Fallback to random portrait seed avatar
        const seed = newCandName.toLowerCase().replace(/[^a-z]/g, '');
        finalImageUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed || 'random'}`;
      }

      const { error } = await supabase.from('candidates').insert({
        name: newCandName,
        position: newCandPos,
        image_url: finalImageUrl
      });

      if (error) throw error;
      
      setNewCandName('');
      setImageFile(null);
      setImagePreview('');
      fetchAdminData();
    } catch (err) {
      console.error(err);
      alert('Failed to register candidate: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCandidate = async (id) => {
    if (!confirm('Are you sure you want to delete this candidate? This will delete all their associated votes.')) return;

    try {
      const { error } = await supabase.from('candidates').delete().eq('id', id);
      if (error) throw error;
      fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetElection = async () => {
    if (!confirm('🚨 WARNING: THIS WILL PERMANENTLY ERASE ALL CAST VOTES AND RESET ALL PINs to unused. Are you absolutely sure?')) return;
    if (!confirm('Double verification: Are you 100% sure you want to wipe the results?')) return;

    setLoading(true);
    try {
      // Delete all votes
      if (supabase.isMock) {
        localStorage.setItem('election_votes', JSON.stringify([]));
        const resetTokens = tokens.map(t => ({ ...t, is_used: false, used_at: null }));
        localStorage.setItem('election_tokens', JSON.stringify(resetTokens));
      } else {
        // Delete all rows in votes
        const { error: vErr } = await supabase.from('votes').delete().neq('id', 0);
        if (vErr) throw vErr;

        // Reset all tokens is_used status
        const { error: tErr } = await supabase.from('tokens').update({ is_used: false, used_at: null }).neq('is_used', false);
        if (tErr) throw tErr;
      }
      
      alert('Election database has been reset successfully.');
      fetchAdminData();
    } catch (err) {
      console.error(err);
      alert('Reset failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportPinsAsCSV = () => {
    const unusedTokens = tokens.filter(t => !t.is_used);
    if (unusedTokens.length === 0) {
      alert('No unused PINs to export.');
      return;
    }
    const headers = 'PIN Code,Status,Created At\n';
    const rows = unusedTokens.map(t => `"${t.pin_code}","Unused","${t.created_at}"`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `unused_voting_pins_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyUnusedPins = () => {
    const pinsStr = tokens.filter(t => !t.is_used).map(t => t.pin_code).join('\n');
    if (!pinsStr) {
      alert('No unused PINs available.');
      return;
    }
    navigator.clipboard.writeText(pinsStr)
      .then(() => alert('Copied all unused PINs to clipboard!'))
      .catch(err => console.error('Could not copy text: ', err));
  };

  // Helper to calculate results
  const getResults = (position) => {
    const posCandidates = candidates.filter(c => c.position === position);
    
    // Calculate total votes cast for actual candidates in this position
    const candidatesWithVotes = posCandidates.map(c => {
      const count = votes.filter(v => parseInt(v.candidate_id) === parseInt(c.id)).length;
      return { ...c, votesCount: count };
    });

    const totalCandidateVotes = candidatesWithVotes.reduce((sum, c) => sum + c.votesCount, 0);
    
    // Total ballots cast is the number of used tokens
    const totalBallotsCast = tokens.filter(t => t.is_used).length;
    
    // NOTA votes is total ballots cast minus total votes cast for candidates in this position
    const notaVotes = Math.max(0, totalBallotsCast - totalCandidateVotes);

    // Add NOTA to results visualization
    const results = [
      ...candidatesWithVotes,
      { id: -1, name: 'NOTA (Abstain)', position, isNota: true, votesCount: notaVotes }
    ];

    // Sort by votes
    return results.sort((a, b) => b.votesCount - a.votesCount);
  };

  const getCandidateColorClass = (cand, index) => {
    if (cand.isNota) return 'bg-slate-400';
    const colors = [
      'bg-blue-500',
      'bg-emerald-500',
      'bg-amber-500',
      'bg-rose-500',
      'bg-violet-500',
      'bg-cyan-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-indigo-500'
    ];
    const identifier = cand.id !== undefined && cand.id !== null ? cand.id : index;
    const num = typeof identifier === 'number' ? identifier : (typeof identifier === 'string' ? identifier.charCodeAt(0) : index);
    return colors[Math.abs(num) % colors.length];
  };

  // Auth Screen
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-slate-950/95 flex items-center justify-center z-50 p-4 animate-fade-in backdrop-blur-md">
        <div className="glass-panel max-w-md w-full rounded-3xl p-8 border border-slate-800 shadow-2xl relative">
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-600/10 rounded-full blur-3xl"></div>

          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 mb-3 shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white">Admin Dashboard Access</h2>
            <p className="text-slate-400 text-xs text-center mt-1">Enter your password to unlock analytics and settings.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-center py-3 rounded-xl glass-input border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-lg font-mono"
                autoFocus
              />
            </div>

            {authError && (
              <p className="text-red-400 text-xs text-center font-medium animate-fade-in">{authError}</p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 py-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-sm font-semibold transition-all duration-200"
              >
                Back to Kiosk
              </button>
              <button
                type="submit"
                className="w-1/2 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-md shadow-blue-500/10"
              >
                Login
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard Main Screen
  const splResults = getResults('SPL');
  const asplResults = getResults('ASPL');
  const totalVotesCount = votes.length;
  const usedTokensCount = tokens.filter(t => t.is_used).length;
  const totalTokensCount = tokens.length;
  
  return (
    <div className="fixed inset-0 bg-slate-950 z-40 overflow-y-auto flex flex-col animate-fade-in select-text">
      {/* Header */}
      <header className="sticky top-0 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-6 py-4 flex items-center justify-between z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600/15 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
            <Unlock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">Election Management Console</h1>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
              Live Database Connected {supabase.isMock ? '(LocalStorage Mock Mode)' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsAuthenticated(false)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl text-sm font-semibold transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all duration-200 shadow-md shadow-blue-500/15"
          >
            Return to Voting
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-8 flex-grow">
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-1 flex flex-col gap-3">
          <button
            onClick={() => setActiveTab('results')}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold text-left transition-all duration-200 ${
              activeTab === 'results'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/15 border border-blue-500/30'
                : 'glass-panel text-slate-400 hover:text-white border-slate-800/80'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            Election Results
          </button>
          
          <button
            onClick={() => setActiveTab('tokens')}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold text-left transition-all duration-200 ${
              activeTab === 'tokens'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/15 border border-blue-500/30'
                : 'glass-panel text-slate-400 hover:text-white border-slate-800/80'
            }`}
          >
            <Ticket className="w-5 h-5" />
            Voter PINs ({tokens.filter(t => !t.is_used).length} Unused)
          </button>

          <button
            onClick={() => setActiveTab('candidates')}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold text-left transition-all duration-200 ${
              activeTab === 'candidates'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/15 border border-blue-500/30'
                : 'glass-panel text-slate-400 hover:text-white border-slate-800/80'
            }`}
          >
            <UserPlus className="w-5 h-5" />
            Manage Candidates
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold text-left transition-all duration-200 ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/15 border border-blue-500/30'
                : 'glass-panel text-slate-400 hover:text-white border-slate-800/80'
            }`}
          >
            <Settings className="w-5 h-5" />
            Dangerous Settings
          </button>

          {/* Quick Metrics */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 mt-6 space-y-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Live Voter Turnout</h4>
            
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-400 mb-1">
                <span>Participation Rate</span>
                <span>{totalTokensCount > 0 ? Math.round((usedTokensCount / totalTokensCount) * 100) : 0}%</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full border border-slate-850 overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                  style={{ width: `${totalTokensCount > 0 ? (usedTokensCount / totalTokensCount) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-850">
              <div>
                <div className="text-2xl font-extrabold text-white">{usedTokensCount}</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Voted Students</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-white">{totalTokensCount}</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total PINs Issued</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="lg:col-span-3">
          {/* TAB 1: RESULTS */}
          {activeTab === 'results' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-extrabold text-white tracking-tight">Live Vote Standings</h2>
                <button 
                  onClick={fetchAdminData} 
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-400 hover:text-white rounded-lg transition-all duration-200"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </button>
              </div>

              {/* SPL Results Grid */}
              <div className="glass-panel rounded-3xl p-6 border border-slate-800">
                <h3 className="text-lg font-bold text-white mb-6 border-b border-slate-800 pb-3 flex items-center justify-between">
                  <span>School Pupil Leader (SPL)</span>
                  <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">
                    {usedTokensCount} Total Ballots
                  </span>
                </h3>
                <div className="space-y-6">
                  {splResults.length <= 1 ? (
                    <p className="text-sm text-slate-500 text-center py-4">No candidates registered for SPL.</p>
                  ) : (
                    splResults.map((cand, idx) => {
                      const totalSplVotes = splResults.reduce((acc, curr) => acc + curr.votesCount, 0);
                      const percentage = totalSplVotes > 0 ? Math.round((cand.votesCount / totalSplVotes) * 100) : 0;
                      const colorClass = getCandidateColorClass(cand, idx);
                      
                      return (
                        <div key={cand.id} className="space-y-2">
                          <div className="flex justify-between items-center text-sm font-semibold">
                            <div className="flex items-center gap-2">
                              <span className={`w-3 h-3 rounded-full ${colorClass} shadow-sm`}></span>
                              <span className="text-slate-700 font-bold">{cand.name}</span>
                            </div>
                            <span className="text-slate-500 font-mono">
                              {cand.votesCount} votes ({percentage}%)
                            </span>
                          </div>
                          <div className="w-full h-4 bg-slate-200/50 rounded-lg border border-slate-300 overflow-hidden relative">
                            <div 
                              className={`h-full rounded-lg transition-all duration-500 ${colorClass}`} 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ASPL Results Grid */}
              <div className="glass-panel rounded-3xl p-6 border border-slate-800">
                <h3 className="text-lg font-bold text-white mb-6 border-b border-slate-800 pb-3 flex items-center justify-between">
                  <span>Assistant School Pupil Leader (ASPL)</span>
                  <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">
                    {usedTokensCount} Total Ballots
                  </span>
                </h3>
                <div className="space-y-6">
                  {asplResults.length <= 1 ? (
                    <p className="text-sm text-slate-500 text-center py-4">No candidates registered for ASPL.</p>
                  ) : (
                    asplResults.map((cand, idx) => {
                      const totalAsplVotes = asplResults.reduce((acc, curr) => acc + curr.votesCount, 0);
                      const percentage = totalAsplVotes > 0 ? Math.round((cand.votesCount / totalAsplVotes) * 100) : 0;
                      const colorClass = getCandidateColorClass(cand, idx);
                      
                      return (
                        <div key={cand.id} className="space-y-2">
                          <div className="flex justify-between items-center text-sm font-semibold">
                            <div className="flex items-center gap-2">
                              <span className={`w-3 h-3 rounded-full ${colorClass} shadow-sm`}></span>
                              <span className="text-slate-700 font-bold">{cand.name}</span>
                            </div>
                            <span className="text-slate-500 font-mono">
                              {cand.votesCount} votes ({percentage}%)
                            </span>
                          </div>
                          <div className="w-full h-4 bg-slate-200/50 rounded-lg border border-slate-300 overflow-hidden relative">
                            <div 
                              className={`h-full rounded-lg transition-all duration-500 ${colorClass}`} 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TOKENS */}
          {activeTab === 'tokens' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-2xl font-extrabold text-white tracking-tight mb-2">Voter PIN Token Administration</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* PIN generator panel */}
                <div className="glass-panel rounded-3xl p-6 border border-slate-800 md:col-span-1 h-fit">
                  <h3 className="text-base font-bold text-white mb-4">Generate PIN Slips</h3>
                  <form onSubmit={handleGenerateTokens} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Quantity to Generate</label>
                      <input
                        type="number"
                        min="1"
                        max="500"
                        value={numTokens}
                        onChange={(e) => setNumTokens(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2.5 rounded-xl glass-input border border-slate-800 text-center font-bold"
                      />
                    </div>
                    {genMessage && (
                      <p className="text-xs font-medium text-blue-400">{genMessage}</p>
                    )}
                    <button
                      type="submit"
                      disabled={isGenerating}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-sm font-semibold transition-all duration-200"
                    >
                      {isGenerating ? 'Generating...' : 'Create PINs'}
                    </button>
                  </form>
                </div>

                {/* PIN export and controls panel */}
                <div className="glass-panel rounded-3xl p-6 border border-slate-800 md:col-span-2 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white mb-2">Active PINs Inventory</h3>
                    <p className="text-slate-400 text-xs leading-relaxed mb-6">
                      Distribute printed 6-character alphanumeric PINs to authorized students. PINs are marked 'Used' dynamically in the database upon vote submission.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={copyUnusedPins}
                      className="flex items-center gap-2 px-5 py-3 border border-slate-800 hover:bg-slate-900 text-slate-300 hover:text-white rounded-xl text-sm font-semibold transition-all duration-200"
                    >
                      <Copy className="w-4 h-4" />
                      Copy Unused PINs
                    </button>
                    <button
                      onClick={exportPinsAsCSV}
                      className="flex items-center gap-2 px-5 py-3 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 rounded-xl text-sm font-semibold transition-all duration-200"
                    >
                      <Download className="w-4 h-4" />
                      Download Unused PINs CSV
                    </button>
                  </div>
                </div>
              </div>

              {/* PIN List Table */}
              <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                  <h3 className="font-bold text-white">Full PIN Token Logs</h3>
                  <span className="text-xs text-slate-500 font-medium">Showing {tokens.length} total generated tokens</span>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase text-[10px] tracking-wider bg-slate-950/20">
                        <th className="px-6 py-3">PIN Code</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Used Timestamp</th>
                        <th className="px-6 py-3">Generated At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {tokens.map((token) => (
                        <tr key={token.id} className="hover:bg-slate-900/25">
                          <td className="px-6 py-3 font-mono font-bold text-white text-base">{token.pin_code}</td>
                          <td className="px-6 py-3">
                            {token.is_used ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-950/40 text-red-400 border border-red-500/20">
                                <X className="w-3 h-3" /> Used
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
                                <Check className="w-3 h-3" /> Ready
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-slate-400 font-mono text-xs">
                            {token.used_at ? new Date(token.used_at).toLocaleString() : '-'}
                          </td>
                          <td className="px-6 py-3 text-slate-500 font-mono text-xs">
                            {new Date(token.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {tokens.length === 0 && (
                        <tr>
                          <td colSpan="4" className="text-center py-8 text-slate-500 font-medium">No voter tokens found. Generate some slips to get started!</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CANDIDATES */}
          {activeTab === 'candidates' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">Candidate Management</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                {/* Add candidate form */}
                <div className="glass-panel rounded-3xl p-6 border border-slate-800 md:col-span-1">
                  <h3 className="text-base font-bold text-white mb-4">Register Candidate</h3>
                  <form onSubmit={handleAddCandidate} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Candidate Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Rahul Verma"
                        value={newCandName}
                        onChange={(e) => setNewCandName(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl glass-input border border-slate-800"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Office Position</label>
                      <select
                        value={newCandPos}
                        onChange={(e) => setNewCandPos(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl glass-input border border-slate-800 bg-slate-950 font-bold"
                      >
                        <option value="SPL">School Pupil Leader (SPL)</option>
                        <option value="ASPL">Assistant School Pupil Leader (ASPL)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Candidate Photo (Device Upload)</label>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-blue-600/10 file:text-blue-400 hover:file:bg-blue-600/20 cursor-pointer glass-input rounded-xl p-2 border border-slate-800"
                        />
                      </div>
                      {imagePreview && (
                        <div className="mt-3 flex items-center gap-3 p-2 bg-slate-950/40 rounded-xl border border-slate-900 animate-fade-in">
                          <img 
                            src={imagePreview} 
                            alt="Preview" 
                            className="w-10 h-10 rounded-full border border-slate-800 object-cover bg-slate-900" 
                          />
                          <div className="flex-grow min-w-0">
                            <p className="text-[10px] text-slate-400 truncate font-semibold">{imageFile?.name}</p>
                            <p className="text-[9px] text-slate-500 font-medium">{(imageFile?.size / 1024).toFixed(1)} KB</p>
                          </div>
                          <button 
                            type="button" 
                            onClick={clearSelectedFile} 
                            className="text-[10px] text-red-400 hover:text-red-300 font-bold px-2 py-1 rounded hover:bg-red-500/5 transition-colors duration-150"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      Add Candidate
                    </button>
                  </form>
                </div>

                {/* Candidate list roster */}
                <div className="md:col-span-2 space-y-4">
                  <h3 className="text-base font-bold text-white">Registered Nominees ({candidates.length})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {candidates.map((cand) => (
                      <div key={cand.id} className="glass-panel rounded-2xl p-4 flex items-center justify-between border border-slate-800/80">
                        <div className="flex items-center gap-3">
                          <img 
                            src={cand.image_url} 
                            alt={cand.name} 
                            className="w-12 h-12 rounded-full border border-slate-800 object-cover bg-slate-900"
                          />
                          <div>
                            <h4 className="font-bold text-white text-sm">{cand.name}</h4>
                            <span className="inline-block px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-[10px] font-bold uppercase tracking-wider mt-1">
                              {cand.position}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteCandidate(cand.id)}
                          className="p-2 border border-slate-800 hover:border-red-500/30 hover:bg-red-950/20 text-slate-500 hover:text-red-400 rounded-xl transition-all duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {candidates.length === 0 && (
                      <p className="text-slate-500 text-sm py-4 col-span-2 text-center font-medium">No candidates registered. Please add them using the registrar panel.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SETTINGS / RESET */}
          {activeTab === 'settings' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-2xl font-extrabold text-white tracking-tight mb-2">Dangerous Operations</h2>
              
              <div className="glass-panel border-2 border-red-500/20 bg-red-950/5 rounded-3xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-500 flex-shrink-0">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">Wipe Election Data & Reset Roster</h3>
                      <p className="text-slate-400 text-sm mt-1 leading-relaxed">
                        This operation wipes all logs from the `votes` table and resets all `tokens` back to `is_used = false` (unused). This is useful when moving from testing/trial stage to the actual live election. You will not lose candidate information.
                      </p>
                    </div>

                    <button
                      onClick={handleResetElection}
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 text-white rounded-xl text-sm font-bold active:scale-95 transition-all duration-200 border border-red-500/20 shadow-lg shadow-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                      Reset Database
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
