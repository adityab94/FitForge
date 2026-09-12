import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Mic, MicOff, Loader2, Volume2, VolumeX, MessageCircle, Sparkles, RotateCcw } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

const SUGGESTIONS = [
  'How am I doing this week?',
  "Am I on track for my goal?",
  'Should I eat more protein?',
  "Why isn't my weight moving?",
];

export default function AskCoach({ variant = 'full' }) {
  const { token } = useAuth();
  const [phase, setPhase] = useState('idle'); // idle | listening | thinking | answered | error
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [answer, setAnswer] = useState('');
  const [summary, setSummary] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState('');
  const recogRef = useRef(null);
  const utteranceRef = useRef(null);

  const isVoiceSupported = typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  const isTTSSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const stopSpeaking = () => {
    if (isTTSSupported) window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const speak = (text) => {
    if (!isTTSSupported || !text) return;
    stopSpeaking();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.05;
    utter.pitch = 1;
    utter.volume = 1;
    // Prefer a warm English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => /en-US.*(Samantha|Karen|Aria|Jenny|Google US English)/i.test(v.name)) || voices.find(v => v.lang?.startsWith('en'));
    if (preferred) utter.voice = preferred;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    utteranceRef.current = utter;
    window.speechSynthesis.speak(utter);
  };

  const startListening = () => {
    if (!isVoiceSupported) { setError('Voice not supported here. Try Safari or Chrome.'); setPhase('error'); return; }
    stopSpeaking();
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = 'en-US';
    rec.continuous = false;
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
      const q = finalText.trim();
      if (q) askQuestion(q);
      else setPhase('idle');
    };

    recogRef.current = rec;
    setTranscript(''); setInterim(''); setAnswer(''); setSummary(''); setError('');
    setPhase('listening');
    rec.start();
  };

  const stopListening = () => {
    if (recogRef.current) { try { recogRef.current.stop(); } catch {} }
  };

  const askQuestion = async (question) => {
    setTranscript(question);
    setPhase('thinking');
    try {
      const { data } = await axios.post(`${API}/ai/voice-query`, { question }, { headers: { Authorization: `Bearer ${token}` } });
      setAnswer(data.answer || '');
      setSummary(data.one_line_summary || '');
      setPhase('answered');
      // Auto-speak the answer
      if (data.answer) speak(data.answer);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Coach unavailable. Try again.');
      setPhase('error');
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => { stopListening(); stopSpeaking(); }, []);

  // Compact variant - inline pill/button
  if (variant === 'compact') {
    return (
      <div className="glass-card p-3 flex items-center gap-3" data-testid="ask-coach-compact">
        <button
          onClick={phase === 'listening' ? stopListening : startListening}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
          style={{
            background: phase === 'listening' ? 'linear-gradient(135deg, #EF4444, #B91C1C)' : 'linear-gradient(135deg, #C7522A, #A0421F)',
            boxShadow: phase === 'listening' ? '0 0 0 6px rgba(239,68,68,0.15)' : '0 4px 16px rgba(199,82,42,0.3)',
            animation: phase === 'listening' ? 'pulseGlow 1.2s ease-in-out infinite' : 'none'
          }}
          data-testid="ask-mic-compact"
        >
          {phase === 'listening' ? <MicOff size={16} color="#fff" /> : phase === 'thinking' ? <Loader2 size={16} color="#fff" className="animate-spin" /> : <Mic size={16} color="#fff" />}
        </button>
        <div className="flex-1 min-w-0">
          {phase === 'idle' && <p className="text-sm font-semibold" style={{ color: '#3D1F0A' }}>Ask your coach anything</p>}
          {phase === 'listening' && <p className="text-sm truncate" style={{ color: '#3D1F0A' }}>{transcript || <span style={{ color: 'rgba(61,31,10,0.4)' }}>Listening...</span>}<span style={{ color: 'rgba(61,31,10,0.4)' }}> {interim}</span></p>}
          {phase === 'thinking' && <p className="text-sm" style={{ color: 'rgba(61,31,10,0.6)' }}>Thinking about "{transcript}"...</p>}
          {phase === 'answered' && <p className="text-sm truncate" style={{ color: '#3D1F0A' }}>{answer}</p>}
          {phase === 'error' && <p className="text-sm" style={{ color: '#EF4444' }}>{error}</p>}
        </div>
        {phase === 'answered' && (
          <button onClick={speaking ? stopSpeaking : () => speak(answer)} className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(199,82,42,0.12)', color: '#C7522A' }} data-testid="ask-replay-compact">
            {speaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className="glass-card p-5" data-testid="ask-coach-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg" style={{ background: 'rgba(199,82,42,0.12)' }}>
          <MessageCircle size={16} style={{ color: '#C7522A' }} strokeWidth={2.2} />
        </div>
        <h3 className="text-base font-bold" style={{ fontFamily: 'Outfit, sans-serif', color: '#3D1F0A' }}>Ask Your Coach</h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1" style={{ background: 'rgba(199,82,42,0.12)', color: '#C7522A' }}>
          <Sparkles size={9} /> Gemini
        </span>
      </div>

      {/* Idle */}
      {phase === 'idle' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={startListening}
              className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #C7522A 0%, #A0421F 100%)',
                boxShadow: '0 8px 24px rgba(199,82,42,0.35)'
              }}
              data-testid="ask-mic-full"
            >
              <Mic size={26} color="#fff" strokeWidth={2} />
            </button>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#3D1F0A' }}>Tap and speak your question</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(61,31,10,0.6)' }}>Your coach will answer aloud</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => askQuestion(s)}
                className="text-xs px-3 py-1.5 rounded-full transition-colors hover:opacity-80"
                style={{ background: 'rgba(199,82,42,0.1)', color: '#C7522A', border: '1px solid rgba(199,82,42,0.2)' }}
                data-testid={`ask-suggestion-${SUGGESTIONS.indexOf(s)}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Listening */}
      {phase === 'listening' && (
        <div className="text-center py-4">
          <button
            onClick={stopListening}
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse"
            style={{
              background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
              boxShadow: '0 0 0 8px rgba(239,68,68,0.15), 0 8px 24px rgba(239,68,68,0.35)'
            }}
            data-testid="ask-stop-full"
          >
            <MicOff size={26} color="#fff" strokeWidth={2} />
          </button>
          <p className="text-xs mb-2" style={{ color: '#EF4444' }}>Listening — tap to stop</p>
          <p className="text-sm" style={{ color: '#3D1F0A', minHeight: '1.2em' }}>
            {transcript}
            <span style={{ color: 'rgba(61,31,10,0.4)' }}> {interim}</span>
            {!transcript && !interim && <span style={{ color: 'rgba(61,31,10,0.4)' }}>Speak your question...</span>}
          </p>
        </div>
      )}

      {/* Thinking */}
      {phase === 'thinking' && (
        <div className="text-center py-6">
          <Loader2 size={26} className="animate-spin mx-auto mb-2" style={{ color: '#C7522A' }} />
          <p className="text-xs italic" style={{ color: 'rgba(61,31,10,0.6)' }}>"{transcript}"</p>
        </div>
      )}

      {/* Answered */}
      {phase === 'answered' && (
        <div>
          <div className="p-3 rounded-xl mb-3" style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(199,82,42,0.12)' }}>
            <p className="text-[10px] uppercase font-bold" style={{ color: 'rgba(61,31,10,0.5)' }}>You asked</p>
            <p className="text-xs italic mb-3" style={{ color: 'rgba(61,31,10,0.75)' }}>"{transcript}"</p>
            <p className="text-[10px] uppercase font-bold" style={{ color: '#C7522A' }}>Coach says</p>
            <p className="text-sm leading-relaxed mt-1" style={{ color: '#3D1F0A' }}>{answer}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={speaking ? stopSpeaking : () => speak(answer)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5"
              style={{ background: 'rgba(199,82,42,0.12)', color: '#C7522A' }}
              data-testid="ask-replay-full"
            >
              {speaking ? <><VolumeX size={13} /> Stop</> : <><Volume2 size={13} /> Replay</>}
            </button>
            <button
              onClick={startListening}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-1.5"
              style={{ background: '#C7522A' }}
              data-testid="ask-again"
            >
              <RotateCcw size={13} /> Ask again
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {phase === 'error' && (
        <div className="text-center py-4">
          <p className="text-sm mb-3" style={{ color: '#EF4444' }}>{error}</p>
          <button onClick={() => { setError(''); setPhase('idle'); }} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: '#C7522A' }} data-testid="ask-error-retry">
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
