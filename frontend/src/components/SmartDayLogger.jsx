import React, { useState } from 'react';
import { useFit } from '../context/FitContext';
import { X, ChevronRight, Check, Loader2, Zap, Footprints, Droplets, Dumbbell } from 'lucide-react';
import confetti from 'canvas-confetti';

const STEPS = [
  { id: 'nutrition', icon: Zap, label: 'Nutrition', color: '#FF5B04' },
  { id: 'steps', icon: Footprints, label: 'Steps', color: '#075056' },
  { id: 'water', icon: Droplets, label: 'Water', color: '#3B82F6' },
  { id: 'workout', icon: Dumbbell, label: 'Workout', color: '#8B5CF6' },
];

export default function SmartDayLogger({ open, onClose }) {
  const { logNutritionManual, addSteps, updateWater, addWorkout, selectedDate, profile } = useFit();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  // Nutrition state
  const [nutMode, setNutMode] = useState('total');
  const [calories, setCalories] = useState('');
  const [carbs, setCarbs] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');

  // Steps state
  const [stepsVal, setStepsVal] = useState('');

  // Water state
  const [waterVal, setWaterVal] = useState('');

  // Workout state
  const [workoutType, setWorkoutType] = useState('');
  const [workoutDuration, setWorkoutDuration] = useState('');
  const [workoutCalories, setWorkoutCalories] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === today;
  const dateLabel = isToday ? 'today' : selectedDate;

  const calcCalFromMacros = () => {
    const c = parseFloat(carbs) || 0, p = parseFloat(protein) || 0, f = parseFloat(fat) || 0;
    return Math.round(c * 4 + p * 4 + f * 9);
  };

  const handleNext = async () => {
    setSaving(true);
    try {
      const currentStep = STEPS[step].id;

      if (currentStep === 'nutrition' && (calories || carbs || protein || fat)) {
        await logNutritionManual({ mode: nutMode, calories, carbs, protein, fat });
      }
      if (currentStep === 'steps' && stepsVal) {
        await addSteps(parseInt(stepsVal), selectedDate);
      }
      if (currentStep === 'water' && waterVal) {
        await updateWater(parseInt(waterVal));
      }
      if (currentStep === 'workout' && workoutType && workoutDuration) {
        await addWorkout({
          type: workoutType,
          duration: parseInt(workoutDuration),
          calories: parseInt(workoutCalories) || 0,
          notes: ''
        });
      }

      if (step < STEPS.length - 1) {
        setStep(s => s + 1);
      } else {
        setDone(true);
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#FF5B04', '#075056', '#E4EEF0'] });
      }
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const handleSkip = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      setDone(true);
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: ['#FF5B04', '#075056'] });
    }
  };

  const reset = () => {
    setStep(0); setDone(false); setSaving(false);
    setCalories(''); setCarbs(''); setProtein(''); setFat('');
    setStepsVal(''); setWaterVal('');
    setWorkoutType(''); setWorkoutDuration(''); setWorkoutCalories('');
    setNutMode('total');
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      data-testid="smart-logger-overlay"
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 relative"
        style={{ background: '#16232A', border: '1px solid rgba(228,238,240,0.1)' }}
        data-testid="smart-logger-modal"
      >
        <button
          onClick={reset}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          style={{ color: 'rgba(228,238,240,0.4)' }}
          data-testid="smart-logger-close"
        >
          <X size={16} />
        </button>

        {done ? (
          <div className="text-center py-4" data-testid="smart-logger-done">
            <div className="text-5xl mb-4">🎯</div>
            <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif', color: '#FF5B04' }}>
              Day logged!
            </h2>
            <p className="text-sm mb-6" style={{ color: 'rgba(228,238,240,0.5)' }}>
              Great job tracking {dateLabel}. Your stats are updated.
            </p>
            <button
              onClick={reset}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white"
              style={{ background: '#FF5B04' }}
              data-testid="smart-logger-done-btn"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-5">
              <p className="text-xs mb-1" style={{ color: 'rgba(228,238,240,0.4)', fontFamily: 'Outfit, sans-serif' }}>
                QUICK LOG — {dateLabel.toUpperCase()}
              </p>
              <h2 className="text-lg font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {step === 0 && `What did you eat ${dateLabel}?`}
                {step === 1 && `How many steps did you take?`}
                {step === 2 && `How much water did you drink?`}
                {step === 3 && `Any workout ${dateLabel}?`}
              </h2>
            </div>

            {/* Progress dots */}
            <div className="flex gap-1.5 mb-5">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.id}
                    className="flex-1 h-1 rounded-full transition-all"
                    style={{ background: i <= step ? s.color : 'rgba(228,238,240,0.1)' }}
                  />
                );
              })}
            </div>

            {/* Step content */}
            <div className="space-y-3 mb-5">

              {/* Nutrition step */}
              {step === 0 && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {['total', 'macros'].map(m => (
                      <button key={m} onClick={() => setNutMode(m)} data-testid={`wizard-mode-${m}`}
                        className="flex-1 py-2 rounded-lg text-xs font-medium transition-all capitalize"
                        style={{ background: nutMode === m ? '#FF5B04' : 'rgba(228,238,240,0.06)', color: nutMode === m ? '#fff' : 'rgba(228,238,240,0.5)' }}>
                        {m === 'total' ? 'Quick (calories)' : 'By macros'}
                      </button>
                    ))}
                  </div>
                  {nutMode === 'total' ? (
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'rgba(228,238,240,0.5)' }}>Total Calories</label>
                      <input
                        type="number"
                        autoFocus
                        data-testid="wizard-calories-input"
                        className="input-dark w-full text-base"
                        placeholder={`e.g. ${profile?.calTarget || 1800}`}
                        value={calories}
                        onChange={e => setCalories(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {[['carbs', carbs, setCarbs, '×4 cal/g'], ['protein', protein, setProtein, '×4 cal/g'], ['fat', fat, setFat, '×9 cal/g']].map(([key, val, setter, hint]) => (
                        <div key={key} className="flex items-center gap-2">
                          <div className="flex-1">
                            <label className="text-xs mb-0.5 block capitalize" style={{ color: 'rgba(228,238,240,0.5)' }}>{key} (g)</label>
                            <input type="number" step="0.1" data-testid={`wizard-${key}-input`}
                              className="input-dark w-full text-sm" placeholder="0"
                              value={val} onChange={e => setter(e.target.value)} />
                          </div>
                          <span className="text-[10px] mt-4" style={{ color: 'rgba(228,238,240,0.3)' }}>{hint}</span>
                        </div>
                      ))}
                      {(carbs || protein || fat) && (
                        <p className="text-xs font-semibold" style={{ color: '#FF5B04' }}>= {calcCalFromMacros()} cal total</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Steps step */}
              {step === 1 && (
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'rgba(228,238,240,0.5)' }}>Steps taken</label>
                  <input
                    type="number"
                    autoFocus
                    data-testid="wizard-steps-input"
                    className="input-dark w-full text-base"
                    placeholder="e.g. 8000"
                    value={stepsVal}
                    onChange={e => setStepsVal(e.target.value)}
                  />
                  <p className="text-[10px] mt-2" style={{ color: 'rgba(228,238,240,0.3)' }}>
                    Calories auto-calculated from your height & MET walking formula
                  </p>
                </div>
              )}

              {/* Water step */}
              {step === 2 && (
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'rgba(228,238,240,0.5)' }}>Glasses of water (goal: 8)</label>
                  <input
                    type="number"
                    autoFocus
                    data-testid="wizard-water-input"
                    className="input-dark w-full text-base"
                    placeholder="e.g. 6"
                    min="0" max="20"
                    value={waterVal}
                    onChange={e => setWaterVal(e.target.value)}
                  />
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {[4, 6, 8, 10].map(n => (
                      <button key={n} onClick={() => setWaterVal(String(n))}
                        data-testid={`wizard-water-${n}`}
                        className="px-3 py-1 rounded-lg text-xs transition-colors"
                        style={{ background: waterVal === String(n) ? '#3B82F6' : 'rgba(228,238,240,0.06)', color: waterVal === String(n) ? '#fff' : 'rgba(228,238,240,0.5)' }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Workout step */}
              {step === 3 && (
                <div className="space-y-2">
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'rgba(228,238,240,0.5)' }}>Workout type</label>
                    <input
                      autoFocus
                      data-testid="wizard-workout-type"
                      className="input-dark w-full text-sm"
                      placeholder="e.g. Chest + Triceps"
                      value={workoutType}
                      onChange={e => setWorkoutType(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'rgba(228,238,240,0.5)' }}>Duration (min)</label>
                      <input type="number" data-testid="wizard-workout-duration"
                        className="input-dark w-full text-sm" placeholder="45"
                        value={workoutDuration} onChange={e => setWorkoutDuration(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'rgba(228,238,240,0.5)' }}>Calories (opt)</label>
                      <input type="number" data-testid="wizard-workout-calories"
                        className="input-dark w-full text-sm" placeholder="350"
                        value={workoutCalories} onChange={e => setWorkoutCalories(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleSkip}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ background: 'rgba(228,238,240,0.06)', color: 'rgba(228,238,240,0.5)' }}
                data-testid="wizard-skip-btn"
              >
                Skip
              </button>
              <button
                onClick={handleNext}
                disabled={saving}
                className="flex-[2] py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{ background: STEPS[step].color }}
                data-testid="wizard-next-btn"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    {step < STEPS.length - 1 ? 'Save & Next' : 'Save & Finish'}
                    {!saving && step < STEPS.length - 1 && <ChevronRight size={16} />}
                    {!saving && step === STEPS.length - 1 && <Check size={16} />}
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
