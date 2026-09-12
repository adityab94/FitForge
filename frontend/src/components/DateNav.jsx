import React from 'react';
import { useFit } from '../context/FitContext';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

export default function DateNav() {
  const { selectedDate, changeDate } = useFit();

  const today = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === today;

  const label = () => {
    if (selectedDate === today) return 'Today';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (selectedDate === yesterday.toISOString().split('T')[0]) return 'Yesterday';
    return new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  const shift = (days) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + days);
    const newDate = d.toISOString().split('T')[0];
    if (newDate <= today) changeDate(newDate);
  };

  return (
    <div className="flex items-center justify-center gap-2 py-3 px-4" data-testid="date-nav">
      <button
        data-testid="date-prev-btn"
        onClick={() => shift(-1)}
        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        style={{ color: 'rgba(61,31,10,0.6)' }}
      >
        <ChevronLeft size={16} />
      </button>

      <div
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg"
        style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,91,4,0.12)' }}
      >
        <Calendar size={12} style={{ color: 'rgba(61,31,10,0.55)' }} />
        <span
          className="text-sm font-medium"
          style={{ color: isToday ? '#FF5B04' : '#3D1F0A', fontFamily: 'Outfit, sans-serif' }}
        >
          {label()}
        </span>
      </div>

      <button
        data-testid="date-next-btn"
        onClick={() => shift(1)}
        disabled={isToday}
        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-30"
        style={{ color: 'rgba(61,31,10,0.6)' }}
      >
        <ChevronRight size={16} />
      </button>

      {!isToday && (
        <button
          data-testid="date-today-btn"
          onClick={() => changeDate(today)}
          className="ml-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
          style={{ background: 'rgba(255,91,4,0.15)', color: '#FF5B04', border: '1px solid rgba(255,91,4,0.3)' }}
        >
          Today
        </button>
      )}
    </div>
  );
}
