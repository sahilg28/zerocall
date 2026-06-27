'use client';

import { useState, useEffect } from 'react';

export function CountdownTimer({ kickoffTime }: { kickoffTime: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = new Date(kickoffTime).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('LIVE');
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      if (d > 0) setTimeLeft(`${d}d ${h}h ${m}m`);
      else if (h > 0) setTimeLeft(`${h}h ${m}m ${s}s`);
      else setTimeLeft(`${m}m ${s}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [kickoffTime]);

  const isUrgent = new Date(kickoffTime).getTime() - Date.now() < 3600000;

  return (
    <span
      className={`font-pixel text-[8px] sm:text-[9px] px-2 py-0.5 border rounded-sm tracking-wider select-none inline-flex items-center gap-1 font-bold ${
        timeLeft === 'LIVE'
          ? 'text-[var(--neon-green)] bg-[var(--neon-green)]/10 border-[var(--neon-green)]/35 glow-green'
          : isUrgent
            ? 'text-[var(--neon-magenta)] bg-[var(--neon-magenta)]/15 border-[var(--neon-magenta)]/35 glow-magenta'
            : 'text-[var(--neon-cyan)] bg-[var(--neon-cyan)]/5 border-[var(--neon-cyan)]/25 glow-cyan shadow-[0_0_8px_rgba(0,229,255,0.08)]'
      }`}
    >
      {timeLeft === 'LIVE' ? (
        <>
          <span className="w-1.5 h-1.5 bg-[var(--neon-green)] rounded-full animate-ping mr-0.5 shrink-0" />
          LIVE
        </>
      ) : (
        <>
          <svg className="w-2.5 h-2.5 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="tracking-widest">{timeLeft.toUpperCase()}</span>
        </>
      )}
    </span>
  );
}
