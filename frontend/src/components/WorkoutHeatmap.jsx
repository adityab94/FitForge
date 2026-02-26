import React, { useState, useEffect } from 'react';
import { useFit } from '../context/FitContext';
import { CalendarDays } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../components/ui/tooltip';

export default function WorkoutHeatmap() {
  const { getWorkoutHeatmap } = useFit();
  const [grid, setGrid] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWorkoutHeatmap().then(data => {
      setGrid(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [getWorkoutHeatmap]);

  if (loading) return null;

  // Group into weeks (7 days per column)
  const weeks = [];
  for (let i = 0; i < grid.length; i += 7) {
    weeks.push(grid.slice(i, i + 7));
  }

  const getIntensity = (entry) => {
    if (!entry || entry.count === 0) return 0;
    if (entry.calories > 500) return 3;
    if (entry.calories > 250) return 2;
    return 1;
  };

  const intensityColors = {
    0: 'rgba(228,238,240,0.04)',
    1: 'rgba(255,91,4,0.25)',
    2: 'rgba(255,91,4,0.5)',
    3: '#FF5B04',
  };

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const totalWorkouts = grid.reduce((sum, d) => sum + d.count, 0);
  const totalCalories = grid.reduce((sum, d) => sum + d.calories, 0);
  const activeDays = grid.filter(d => d.count > 0).length;

  return (
    <section className="px-4 md:px-6 py-4 anim-slide-up delay-500" data-testid="workout-heatmap-section">
      <div className="max-w-5xl mx-auto">
        <div className="glass-card p-4 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{ background: 'rgba(255,91,4,0.1)' }}>
                <CalendarDays size={18} style={{ color: '#FF5B04' }} strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }} data-testid="heatmap-title">
                  Workout Activity
                </h2>
                <p className="text-xs" style={{ color: 'rgba(228,238,240,0.4)' }}>Last 12 weeks</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs" style={{ color: 'rgba(228,238,240,0.4)' }}>
              <span><strong style={{ color: '#E4EEF0' }}>{totalWorkouts}</strong> workouts</span>
              <span><strong style={{ color: '#FF5B04' }}>{totalCalories.toLocaleString()}</strong> cal</span>
              <span><strong style={{ color: '#075056' }}>{activeDays}</strong> active days</span>
            </div>
          </div>

          {/* Heatmap Grid */}
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-1" style={{ minWidth: 'fit-content' }}>
              {/* Day labels */}
              <div className="flex flex-col gap-1 pr-1">
                {dayLabels.map((d, i) => (
                  <div key={i} className="w-4 h-4 flex items-center justify-center text-[9px]" style={{ color: 'rgba(228,238,240,0.3)' }}>{d}</div>
                ))}
              </div>
              {/* Weeks */}
              <TooltipProvider delayDuration={100}>
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-1">
                    {week.map((day, di) => (
                      <Tooltip key={di}>
                        <TooltipTrigger asChild>
                          <div
                            className="w-4 h-4 rounded-[3px] cursor-pointer transition-all hover:scale-125"
                            style={{ background: intensityColors[getIntensity(day)] }}
                            data-testid={`heatmap-cell-${day.date}`}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-[11px]" style={{ background: '#1C2D35', color: '#E4EEF0', border: '1px solid rgba(228,238,240,0.1)' }}>
                          <p className="font-semibold">{day.date}</p>
                          {day.count > 0 ? (
                            <p>{day.count} workout{day.count > 1 ? 's' : ''} · {day.calories}cal · {day.duration}min</p>
                          ) : (
                            <p style={{ color: 'rgba(228,238,240,0.4)' }}>Rest day</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                ))}
              </TooltipProvider>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-2 mt-3">
            <span className="text-[10px]" style={{ color: 'rgba(228,238,240,0.3)' }}>Less</span>
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="w-3 h-3 rounded-[2px]" style={{ background: intensityColors[i] }} />
            ))}
            <span className="text-[10px]" style={{ color: 'rgba(228,238,240,0.3)' }}>More</span>
          </div>
        </div>
      </div>
    </section>
  );
}
