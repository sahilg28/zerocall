'use client';

import { useApp } from '@/lib/store';
import { getFlagUrl } from '@/lib/countries';

export function MatchTicker() {
  const { matches } = useApp();
  const finishedMatches = matches.filter((m) => m.status === 'final' && m.result);
  const upcomingCount = matches.filter((m) => m.status === 'upcoming').length;

  if (finishedMatches.length === 0) return null;

  return (
    <div className="bg-[var(--bg-secondary)] border-b border-[var(--neon-green)]/10 overflow-hidden">
      <div className="flex items-center">
        {/* Label */}
        <div className="shrink-0 bg-[var(--neon-green)]/10 border-r border-[var(--neon-green)]/20 px-3 py-1.5">
          <span className="font-pixel text-[7px] text-[var(--neon-green)]">RESULTS</span>
        </div>

        {/* Scrolling results */}
        <div className="overflow-hidden flex-1">
          <div className="flex animate-[scroll-left_40s_linear_infinite] whitespace-nowrap py-1.5">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex items-center gap-5 px-4 shrink-0">
                {finishedMatches.map((m) => (
                  <div key={`${copy}-${m.id}`} className="flex items-center gap-1.5 shrink-0">
                    <span className="font-pixel text-[6px] text-[var(--text-muted)]/50">FT</span>
                    <img src={getFlagUrl(m.homeTeam)} alt="" className="w-4 h-3 rounded-sm" />
                    <span className="font-pixel text-[7px] text-[var(--text-muted)]">
                      {m.homeTeam.slice(0, 3).toUpperCase()}
                    </span>
                    <span className="font-pixel text-[8px] text-[var(--neon-green)] font-bold">
                      {m.result!.home}
                    </span>
                    <span className="font-pixel text-[7px] text-[var(--text-muted)]">-</span>
                    <span className="font-pixel text-[8px] text-[var(--neon-green)] font-bold">
                      {m.result!.away}
                    </span>
                    <span className="font-pixel text-[7px] text-[var(--text-muted)]">
                      {m.awayTeam.slice(0, 3).toUpperCase()}
                    </span>
                    <img src={getFlagUrl(m.awayTeam)} alt="" className="w-4 h-3 rounded-sm" />
                  </div>
                ))}
                <div className="flex items-center gap-1 shrink-0 ml-4">
                  <span className="font-pixel text-[7px] text-[var(--neon-cyan)]">
                    {upcomingCount} UPCOMING
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
