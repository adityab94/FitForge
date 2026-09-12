import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useFit } from '../context/FitContext';
import { useAuth } from '../context/AuthContext';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Moon, Scale, Info } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{ background: 'rgba(255,248,240,0.95)', border: '1px solid rgba(199,82,42,0.2)', borderRadius: 12, padding: '10px 14px', boxShadow: '0 8px 24px rgba(199,82,42,0.15)', backdropFilter: 'blur(8px)' }}>
      <p style={{ fontFamily: 'Outfit, sans-serif', color: '#3D1F0A', fontWeight: 700, fontSize: 12, marginBottom: 6 }}>{label}</p>
      {d.weight != null && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 11 }}>
          <span style={{ color: '#C7522A' }}>● Weight</span>
          <span style={{ color: '#3D1F0A', fontWeight: 600 }}>{d.weight}kg</span>
        </div>
      )}
      {d.sleep != null && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 11, marginTop: 3 }}>
          <span style={{ color: '#5A6BB8' }}>● Sleep</span>
          <span style={{ color: '#3D1F0A', fontWeight: 600 }}>{d.sleep.toFixed(1)}h</span>
        </div>
      )}
    </div>
  );
}

export default function SleepWeightChart() {
  const { weights } = useFit();
  const { token } = useAuth();
  const [sleepData, setSleepData] = useState([]);

  useEffect(() => {
    if (!token) return;
    axios.get(`${API}/health/recent?days=30`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setSleepData(r.data?.sleep || []))
      .catch(() => setSleepData([]));
  }, [token]);

  // Build merged 30-day dataset
  const chartData = (() => {
    const map = new Map();
    // Last 30 days
    const end = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(end); d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      map.set(dStr, { date: dStr, label: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }) });
    }
    (weights || []).forEach(w => {
      if (map.has(w.date)) map.get(w.date).weight = w.weight;
    });
    sleepData.forEach(s => {
      if (map.has(s.date)) map.get(s.date).sleep = s.hours;
    });
    // Forward-fill weight so line is continuous
    let lastW = null;
    const arr = Array.from(map.values());
    arr.forEach(row => {
      if (row.weight != null) lastW = row.weight;
      else if (lastW != null) row.weightSmooth = lastW;
      if (row.weight != null) row.weightSmooth = row.weight;
    });
    return arr;
  })();

  const hasSleep = chartData.some(d => d.sleep != null);
  const hasWeight = chartData.some(d => d.weight != null);
  const avgSleep = hasSleep ? chartData.filter(d => d.sleep != null).reduce((s, d) => s + d.sleep, 0) / chartData.filter(d => d.sleep != null).length : 0;

  // Correlation insight - compare weight change on poor sleep nights vs good ones
  const insight = (() => {
    if (!hasSleep || !hasWeight) return null;
    const paired = [];
    for (let i = 1; i < chartData.length; i++) {
      const yesterday = chartData[i - 1];
      const today = chartData[i];
      if (yesterday.sleep != null && today.weight != null && yesterday.weightSmooth != null) {
        paired.push({ sleep: yesterday.sleep, weightChange: today.weight - yesterday.weightSmooth });
      }
    }
    if (paired.length < 5) return null;
    const poor = paired.filter(p => p.sleep < 7);
    const good = paired.filter(p => p.sleep >= 7);
    if (poor.length < 2 || good.length < 2) return null;
    const poorAvg = poor.reduce((s, p) => s + p.weightChange, 0) / poor.length;
    const goodAvg = good.reduce((s, p) => s + p.weightChange, 0) / good.length;
    const diff = poorAvg - goodAvg;
    if (Math.abs(diff) < 0.05) return null;
    return diff > 0
      ? `Poor sleep nights (<7h) show ${(diff * 1000).toFixed(0)}g more weight the next day, on average.`
      : `You seem to weigh less after poor sleep nights — likely dehydration, not fat loss.`;
  })();

  return (
    <div className="px-4 md:px-6 pt-6" data-testid="sleep-weight-chart">
      <div className="max-w-5xl mx-auto">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg" style={{ background: 'rgba(90,107,184,0.14)' }}>
                <Moon size={14} style={{ color: '#5A6BB8' }} strokeWidth={2.2} />
              </div>
              <div className="p-1.5 rounded-lg" style={{ background: 'rgba(199,82,42,0.14)' }}>
                <Scale size={14} style={{ color: '#C7522A' }} strokeWidth={2.2} />
              </div>
              <h3 className="text-lg font-bold" style={{ fontFamily: 'Outfit, sans-serif', color: '#3D1F0A' }}>Sleep vs Weight</h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(199,82,42,0.12)', color: '#C7522A' }}>Last 30 days</span>
          </div>

          {!hasSleep ? (
            <div className="py-8 text-center">
              <p className="text-sm font-semibold" style={{ color: '#3D1F0A' }}>No sleep data yet</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(61,31,10,0.6)' }}>Set up iOS Shortcut in AI Coach → Apple Health</p>
            </div>
          ) : (
            <>
              <div style={{ width: '100%', height: 240 }}>
                <ResponsiveContainer>
                  <ComposedChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sleepBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#5A6BB8" stopOpacity={0.7} />
                        <stop offset="100%" stopColor="#5A6BB8" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(199,82,42,0.1)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: 'rgba(61,31,10,0.55)', fontSize: 10 }} interval={4} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="sleep" orientation="left" domain={[0, 12]} tick={{ fill: '#5A6BB8', fontSize: 10 }} width={26} axisLine={false} tickLine={false} label={{ value: 'hrs', angle: 0, position: 'insideLeft', style: { fill: '#5A6BB8', fontSize: 9 } }} />
                    <YAxis yAxisId="weight" orientation="right" domain={['auto', 'auto']} tick={{ fill: '#C7522A', fontSize: 10 }} width={32} axisLine={false} tickLine={false} label={{ value: 'kg', angle: 0, position: 'insideRight', style: { fill: '#C7522A', fontSize: 9 } }} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine yAxisId="sleep" y={7} stroke="#5A6BB8" strokeDasharray="4 4" strokeOpacity={0.4} />
                    <Bar yAxisId="sleep" dataKey="sleep" fill="url(#sleepBar)" radius={[3, 3, 0, 0]} maxBarSize={10} />
                    <Line yAxisId="weight" type="monotone" dataKey="weightSmooth" stroke="#C7522A" strokeWidth={2.5} dot={{ r: 3, fill: '#C7522A', stroke: '#FFF3E0', strokeWidth: 1.5 }} activeDot={{ r: 5 }} connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t" style={{ borderColor: 'rgba(199,82,42,0.12)' }}>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded" style={{ background: '#5A6BB8' }} />
                  <span className="text-xs font-medium" style={{ color: 'rgba(61,31,10,0.7)' }}>Sleep (hrs)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5" style={{ background: '#C7522A' }} />
                  <span className="text-xs font-medium" style={{ color: 'rgba(61,31,10,0.7)' }}>Weight (kg)</span>
                </div>
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-[10px] uppercase font-bold" style={{ color: 'rgba(61,31,10,0.5)' }}>Avg sleep:</span>
                  <span className="text-xs font-bold" style={{ color: '#5A6BB8' }}>{avgSleep.toFixed(1)}h</span>
                </div>
              </div>

              {insight && (
                <div className="mt-3 p-3 rounded-lg flex items-start gap-2" style={{ background: 'rgba(199,82,42,0.08)' }}>
                  <Info size={13} className="mt-0.5 flex-shrink-0" style={{ color: '#C7522A' }} strokeWidth={2.5} />
                  <p className="text-xs" style={{ color: '#3D1F0A' }}>{insight}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
