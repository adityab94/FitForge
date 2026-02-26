import React, { useState } from 'react';
import { useFit } from '../context/FitContext';
import { Scale, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Footer() {
  const { profile, addWeightLog, stats } = useFit();
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = parseFloat(weight);
    if (!val || val < 20 || val > 300) return;
    setLoading(true);
    try {
      await addWeightLog(val);
      // Milestone check
      if (stats?.goal_kg && val <= stats.goal_kg) {
        confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors: ['#FF5B04', '#FF5B04', '#FF5B04', '#FF5B04'] });
      }
      setWeight('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-30 weighin-bar" data-testid="footer-weighin">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-3">
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-slate-500">
            <Scale size={16} strokeWidth={1.5} />
            <span className="text-xs hidden sm:inline">Quick weigh-in</span>
          </div>
          
          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs text-slate-600 hidden sm:inline">
              {profile?.weight ? `${profile.weight}kg` : '---'}
            </span>
            <ArrowRight size={12} className="text-slate-600 hidden sm:inline" />
            <input
              type="number"
              step="0.1"
              min="20"
              max="300"
              placeholder="New weight (kg)"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="input-dark flex-1 text-sm py-2"
              data-testid="weighin-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !weight}
            className="btn-glow px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#FF5B04' }}
            data-testid="weighin-submit"
          >
            {loading ? 'Saving...' : 'Update'}
          </button>
        </form>
      </div>
    </footer>
  );
}
