import React from 'react';
import { useFit } from '../context/FitContext';
import { Flame } from 'lucide-react';

export default function StreakFlame() {
  const { stats } = useFit();
  const streak = stats?.streak || 0;

  // Tier system
  const tier = streak >= 30 ? 'legendary' : streak >= 14 ? 'blazing' : streak >= 7 ? 'strong' : streak >= 3 ? 'warm' : streak >= 1 ? 'spark' : 'cold';

  const cfg = {
    cold:      { color: 'rgba(61,31,10,0.3)',  bg: 'rgba(199,82,42,0.05)', particles: 0, size: 24, label: 'Start today' },
    spark:     { color: '#F59E0B',              bg: 'rgba(245,158,11,0.10)', particles: 3, size: 26, label: 'Just lit' },
    warm:      { color: '#F97316',              bg: 'rgba(249,115,22,0.12)', particles: 5, size: 28, label: 'Warming up' },
    strong:    { color: '#EA580C',              bg: 'rgba(234,88,12,0.14)',  particles: 7, size: 30, label: 'On fire' },
    blazing:   { color: '#DC2626',              bg: 'rgba(220,38,38,0.16)',  particles: 10, size: 32, label: 'Blazing' },
    legendary: { color: '#C7522A',              bg: 'linear-gradient(135deg, rgba(199,82,42,0.18), rgba(220,38,38,0.18))', particles: 14, size: 36, label: 'Legendary' },
  };
  const c = cfg[tier];

  return (
    <div
      className="relative flex items-center gap-3 p-3 rounded-2xl overflow-hidden"
      style={{ background: c.bg, border: `1px solid ${c.color}30` }}
      data-testid="streak-flame"
    >
      {/* Flame with animation */}
      <div className="relative w-12 h-12 flex items-center justify-center flex-shrink-0">
        {streak > 0 ? (
          <>
            {/* Glow halo */}
            <div
              className="absolute inset-0 rounded-full anim-pulse"
              style={{
                background: `radial-gradient(circle, ${c.color}44 0%, transparent 70%)`,
                filter: 'blur(4px)',
              }}
            />
            {/* Animated flame */}
            <div className="relative">
              <Flame
                size={c.size}
                style={{ color: c.color, filter: `drop-shadow(0 0 6px ${c.color}80)` }}
                strokeWidth={2.2}
                className="flame-flicker"
                fill={c.color}
              />
            </div>
            {/* Particles */}
            {Array.from({ length: c.particles }).map((_, i) => (
              <span
                key={i}
                className="absolute rounded-full flame-particle"
                style={{
                  width: `${3 + (i % 3)}px`,
                  height: `${3 + (i % 3)}px`,
                  background: c.color,
                  bottom: `${45 + (i * 3) % 15}%`,
                  left: `${35 + (i * 11) % 30}%`,
                  animationDelay: `${(i * 0.15) % 2}s`,
                  animationDuration: `${1.5 + (i % 3) * 0.4}s`,
                  opacity: 0.7,
                }}
              />
            ))}
          </>
        ) : (
          <Flame size={c.size} style={{ color: c.color }} strokeWidth={2} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1">
          <span
            className="text-2xl md:text-3xl font-bold leading-none"
            style={{ fontFamily: 'Outfit, sans-serif', color: streak > 0 ? c.color : 'rgba(61,31,10,0.4)' }}
          >
            {streak}
          </span>
          <span className="text-xs font-semibold" style={{ color: 'rgba(61,31,10,0.55)' }}>
            day{streak === 1 ? '' : 's'}
          </span>
        </div>
        <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: c.color }}>
          {c.label}
        </p>
      </div>
    </div>
  );
}
