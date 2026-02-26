import React, { useState, useEffect } from 'react';
import { Quote } from 'lucide-react';

const QUOTES = [
  { text: "The only bad workout is the one that didn't happen.", author: "Unknown" },
  { text: "Your body can stand almost anything. It's your mind that you have to convince.", author: "Unknown" },
  { text: "Fitness is not about being better than someone else. It's about being better than you used to be.", author: "Khloe Kardashian" },
  { text: "The pain you feel today will be the strength you feel tomorrow.", author: "Arnold Schwarzenegger" },
  { text: "Success isn't always about greatness. It's about consistency.", author: "Dwayne Johnson" },
  { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
  { text: "The difference between try and triumph is a little umph.", author: "Marvin Phillips" },
  { text: "Strive for progress, not perfection.", author: "Unknown" },
  { text: "The body achieves what the mind believes.", author: "Napoleon Hill" },
  { text: "Don't wish for it. Work for it.", author: "Unknown" },
  { text: "The hard days are the best because that's when champions are made.", author: "Gabby Douglas" },
  { text: "What seems impossible today will one day become your warm-up.", author: "Unknown" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "A one hour workout is 4% of your day. No excuses.", author: "Unknown" },
];

export default function MotivationalQuote() {
  const [quote, setQuote] = useState(null);

  useEffect(() => {
    // Pick a quote based on the day of the year for consistency
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    setQuote(QUOTES[dayOfYear % QUOTES.length]);
  }, []);

  if (!quote) return null;

  return (
    <section className="px-4 md:px-6 py-3 anim-fade-in delay-700" data-testid="motivational-quote">
      <div className="max-w-5xl mx-auto">
        <div className="glass-card-static p-4 md:p-5 flex items-start gap-3" style={{ borderLeft: '2px solid rgba(255,91,4,0.3)' }}>
          <Quote size={18} style={{ color: '#FF5B04', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p className="text-sm md:text-base italic leading-relaxed" style={{ color: '#E4EEF0' }}>
              "{quote.text}"
            </p>
            <p className="text-xs mt-2" style={{ color: 'rgba(228,238,240,0.35)' }}>
              — {quote.author}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
