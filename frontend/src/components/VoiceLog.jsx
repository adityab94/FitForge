import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useFit } from '../context/FitContext';
import { X, Mic, MicOff, Loader2, CheckCircle2, Dumbbell, Flame, Scale, Droplets, Footprints, AlertCircle } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

const TYPE_META = {
  workout:   { icon: Dumbbell,   color: '#8B5CF6', label: 'Workout',   fmt: (a) => `${a.type} - ${a.duration}min${a.calories ? `, ${a.calories} cal` : ''}` },
  nutrition: { icon: Flame,      color: '#C7522A', label: 'Nutrition', fmt: (a) => `${a.calories} cal${a.protein ? ` · ${a.protein}g P` : ''}${a.carbs ? ` · ${a.carbs}g C` : ''}${a.fat ? ` · ${a.fat}g F` : ''}` },
  weight:    { icon: Scale,      color: '#0F766E', label: 'Weight',    fmt: (a) => `${a.weight} kg` },
  water:     { icon: Droplets,   color: '#3B82F6', label: 'Water',     fmt: (a) => `${a.glasses} glasses` },
  steps:     { icon: Footprints, color: '#075056', label: 'Steps',     fmt: (a) => `${a.steps.toLocaleString()} steps` },
};

export default function VoiceLog({ open, onClose }) {
  const { token } = useAuth();
  const { addWorkout, logNutritionManual, addWeightLog, updateWater, addSteps, fetchAll } = useFit();
  const [phase, setPhase] = useState('idle'); // idle | listening | parsing | preview | logging | done | error
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [actions, setActions] = useState([]);
  const [understood, setUnderstood] = useState('');
  const [error, setError] = useState('');
  const recogRef = useRef(null);

  const isSupported = typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  const startListening = () => {
    if (!isSupported) { setError('Voice not supported on this browser. Use Safari on iPhone or Chrome.'); setPhase('error'); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;

    let finalText = '';
    rec.onresult = (e) => {
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + ' ';
        else interimText += t;
      }
      setTranscript(finalText.trim());
      setInterim(interimText.trim());
    };
    rec.onerror = (e) => {
      setError(e.error === 'not-allowed' ? 'Microphone permission denied' : `Error: ${e.error}`);
      setPhase('error');
    };
    rec.onend = () => {
      if (phase === 'listening') {
        const finalTranscript = finalText.trim();
        if (finalTranscript) parseTranscript(finalTranscript);
        else { setPhase('idle'); }
      }
    };

    recogRef.current = rec;
    setTranscript('');
    setInterim('');
    setError('');
    setActions([]);
    setUnderstood('');
    setPhase('listening');
    rec.start();
  };

  const stopListening = () => {
    if (recogRef.current) {
      try { recogRef.current.stop(); } catch {}
    }
  };

  const parseTranscript = async (text) => {
    setPhase('parsing');
    try {
      const { data } = await axios.post(`${API}/ai/voice-parse`, { transcript: text }, { headers: { Authorization: `Bearer ${token}` } });
      setActions(data.actions || []);
      setUnderstood(data.understood || '');
      setPhase('preview');
    } catch (e) {
      setError(e?.response?.data?.detail || 'Could not parse. Try again.');
      setPhase('error');
    }
  };

  const executeActions = async () => {
    setPhase('logging');
    try {
      for (const a of actions) {
        if (a.type === 'workout' && a.type !== undefined) {
          await addWorkout({ type: a.type || 'Workout', duration: parseInt(a.duration) || 0, calories: parseInt(a.calories) || 0, notes: 'Voice logged' });
        } else if (a.type === 'nutrition') {
          await logNutritionManual({ mode: 'macros', calories: a.calories || 0, carbs: a.carbs || 0, protein: a.protein || 0, fat: a.fat || 0 });
        } else if (a.type === 'weight') {
          if (addWeightLog) await addWeightLog(parseFloat(a.weight));
        } else if (a.type === 'water') {
          await updateWater(parseInt(a.glasses) || 0);
        } else if (a.type === 'steps') {
          await addSteps(parseInt(a.steps) || 0);
        }
      }
      if (fetchAll) await fetchAll();
      setPhase('done');
      setTimeout(() => { onClose(); }, 1500);
    } catch (e) {
      setError('Failed to log one or more items. Try again.');
      setPhase('error');
    }
  };

  useEffect(() => {
    if (!open) {
      stopListening();
      setPhase('idle');
      setTranscript('');
      setInterim('');
      setActions([]);
      setUnderstood('');
      setError('');
    }
    // eslint-disable-next-line
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} data-testid="voice-modal">
      <div className="w-full max-w-sm rounded-2xl p-5 relative" style={{ background: 'linear-gradient(160deg, #FFF8F0 0%, #FFE0C0 100%)', border: '1px solid rgba(199,82,42,0.15)' }}>
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/40 transition-colors" style={{ color: 'rgba(61,31,10,0.55)' }} data-testid="voice-close">
          <X size={16} />
        </button>

        <div className="flex items-center gap-2 mb-5">
          <div className="p-1.5 rounded-lg" style={{ background: 'rgba(199,82,42,0.12)' }}>
            <Mic size={16} style={{ color: '#C7522A' }} strokeWidth={2.2} />
          </div>
          <h2 className="text-base font-bold" style={{ fontFamily: 'Outfit, sans-serif', color: '#3D1F0A' }}>Voice Log</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(199,82,42,0.12)', color: '#C7522A' }}>Gemini</span>
        </div>

        {/* Idle - big mic button */}
        {phase === 'idle' && (
          <div className="py-6 text-center">
            <button
              onClick={startListening}
              className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 transition-all hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #C7522A 0%, #A0421F 100%)',
                boxShadow: '0 8px 32px rgba(199,82,42,0.4)'
              }}
              data-testid="voice-start"
            >
              <Mic size={38} color="#fff" strokeWidth={2} />
            </button>
            <p className="text-sm font-semibold" style={{ color: '#3D1F0A' }}>Tap to speak</p>
            <p className="text-xs mt-2 px-4 leading-relaxed" style={{ color: 'rgba(61,31,10,0.6)' }}>
              Try: "logged 30 minutes of bench press and 400 calorie chicken bowl"
            </p>
          </div>
        )}

        {/* Listening */}
        {phase === 'listening' && (
          <div className="py-6 text-center">
            <button
              onClick={stopListening}
              className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 relative animate-pulse"
              style={{
                background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
                boxShadow: '0 0 0 8px rgba(239,68,68,0.15), 0 8px 32px rgba(239,68,68,0.4)'
              }}
              data-testid="voice-stop"
            >
              <MicOff size={38} color="#fff" strokeWidth={2} />
            </button>
            <p className="text-sm font-semibold mb-3" style={{ color: '#EF4444' }}>Listening... tap to stop</p>
            <div className="p-3 rounded-xl min-h-[64px] text-left" style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(199,82,42,0.12)' }}>
              <p className="text-sm" style={{ color: '#3D1F0A' }}>
                {transcript}
                <span style={{ color: 'rgba(61,31,10,0.4)' }}> {interim}</span>
                {!transcript && !interim && <span style={{ color: 'rgba(61,31,10,0.4)' }}>Waiting for your voice...</span>}
              </p>
            </div>
          </div>
        )}

        {/* Parsing */}
        {phase === 'parsing' && (
          <div className="py-10 text-center">
            <Loader2 size={32} className="animate-spin mx-auto mb-3" style={{ color: '#C7522A' }} />
            <p className="text-sm" style={{ color: 'rgba(61,31,10,0.7)' }}>Understanding what you said...</p>
            <p className="text-xs mt-2 italic" style={{ color: 'rgba(61,31,10,0.5)' }}>"{transcript}"</p>
          </div>
        )}

        {/* Preview */}
        {phase === 'preview' && (
          <div>
            <div className="p-3 rounded-xl mb-3" style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(199,82,42,0.12)' }}>
              <p className="text-[10px] uppercase font-bold" style={{ color: 'rgba(61,31,10,0.5)' }}>You said</p>
              <p className="text-xs italic" style={{ color: '#3D1F0A' }}>"{transcript}"</p>
            </div>

            {actions.length === 0 ? (
              <div className="p-4 rounded-xl mb-3 text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertCircle size={20} className="mx-auto mb-1" style={{ color: '#EF4444' }} />
                <p className="text-sm font-semibold" style={{ color: '#3D1F0A' }}>Couldn't extract anything</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(61,31,10,0.6)' }}>Try being more specific: "30 min bench" or "400 cal lunch"</p>
              </div>
            ) : (
              <div className="space-y-2 mb-3">
                <p className="text-[10px] uppercase font-bold" style={{ color: 'rgba(61,31,10,0.5)' }}>Will log ({actions.length})</p>
                {actions.map((a, i) => {
                  const meta = TYPE_META[a.type];
                  if (!meta) return null;
                  const Icon = meta.icon;
                  return (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.5)', border: `1px solid ${meta.color}25` }} data-testid={`voice-action-${i}`}>
                      <div className="p-1.5 rounded-lg" style={{ background: `${meta.color}18` }}>
                        <Icon size={13} style={{ color: meta.color }} strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase font-bold" style={{ color: meta.color }}>{meta.label}</p>
                        <p className="text-sm font-semibold truncate" style={{ color: '#3D1F0A' }}>{meta.fmt(a)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={startListening} className="px-3 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'rgba(199,82,42,0.12)', color: '#C7522A' }} data-testid="voice-retry">
                Retry
              </button>
              {actions.length > 0 && (
                <button onClick={executeActions} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#C7522A' }} data-testid="voice-confirm">
                  Log all {actions.length}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Logging */}
        {phase === 'logging' && (
          <div className="py-10 text-center">
            <Loader2 size={32} className="animate-spin mx-auto mb-3" style={{ color: '#C7522A' }} />
            <p className="text-sm" style={{ color: 'rgba(61,31,10,0.7)' }}>Logging your day...</p>
          </div>
        )}

        {/* Done */}
        {phase === 'done' && (
          <div className="py-8 text-center">
            <CheckCircle2 size={40} className="mx-auto mb-2" style={{ color: '#0F766E' }} />
            <p className="text-lg font-bold" style={{ fontFamily: 'Outfit, sans-serif', color: '#3D1F0A' }}>Logged!</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(61,31,10,0.6)' }}>{actions.length} item{actions.length === 1 ? '' : 's'} saved to today</p>
          </div>
        )}

        {/* Error */}
        {phase === 'error' && (
          <div className="py-6 text-center">
            <AlertCircle size={32} className="mx-auto mb-2" style={{ color: '#EF4444' }} />
            <p className="text-sm font-semibold mb-1" style={{ color: '#3D1F0A' }}>{error}</p>
            <button onClick={() => { setError(''); setPhase('idle'); }} className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: '#C7522A' }} data-testid="voice-error-retry">
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
