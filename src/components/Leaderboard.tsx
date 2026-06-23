'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { LeaderboardEntry } from '@/lib/types';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  title?: string;
  highlightId?: string;
}

const RANK_STYLES = [
  'text-[var(--gold)]',
  'text-[var(--silver)]',
  'text-[var(--bronze)]',
];

export function Leaderboard({ entries, title = 'LEADERBOARD', highlightId }: LeaderboardProps) {
  return (
    <div className="card-retro p-4">
      <h3 className="font-pixel text-xs text-[var(--neon-cyan)] mb-4 glow-cyan">{title}</h3>

      <div className="space-y-1">
        {/* Header */}
        <div className="grid grid-cols-[30px_1fr_70px_50px_50px] gap-2 px-2 pb-2 border-b border-white/10">
          <span className="font-pixel text-[8px] text-[var(--text-muted)]">#</span>
          <span className="font-pixel text-[8px] text-[var(--text-muted)]">PLAYER</span>
          <span className="font-pixel text-[8px] text-[var(--text-muted)] text-right">0G PTS</span>
          <span className="font-pixel text-[8px] text-[var(--text-muted)] text-right">✓</span>
          <span className="font-pixel text-[8px] text-[var(--text-muted)] text-right">⭐</span>
        </div>

        <AnimatePresence mode="popLayout">
          {entries.map((entry, i) => (
            <motion.div
              key={entry.predictor.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 200 }}
              className={`grid grid-cols-[30px_1fr_70px_50px_50px] gap-2 px-2 py-2 rounded-sm ${
                entry.predictor.id === highlightId
                  ? 'bg-[var(--neon-cyan)]/10 border border-[var(--neon-cyan)]/30'
                  : 'hover:bg-white/5'
              }`}
            >
              <span className={`font-pixel text-sm ${RANK_STYLES[i] || 'text-[var(--text-muted)]'}`}>
                {i + 1}
              </span>
              <div className="flex items-center gap-2 min-w-0">
                {entry.predictor.type === 'agent' && (
                  <span className="text-base flex-shrink-0">{entry.predictor.avatar}</span>
                )}
                <span
                  className={`font-retro text-base truncate ${
                    entry.predictor.type === 'agent'
                      ? 'text-[var(--neon-magenta)]'
                      : 'text-[var(--neon-green)]'
                  }`}
                >
                  {entry.predictor.displayName}
                </span>
                <span
                  className={`font-pixel text-[7px] tracking-widest px-1.5 py-0.5 rounded-sm flex-shrink-0 ${
                    entry.predictor.type === 'agent'
                      ? 'bg-[var(--neon-magenta)]/15 text-[var(--neon-magenta)]'
                      : 'bg-[var(--neon-green)]/15 text-[var(--neon-green)]'
                  }`}
                >
                  {entry.predictor.type === 'agent' ? 'AGENT' : 'HUMAN'}
                </span>
              </div>
              <motion.span
                key={entry.points}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                className="font-pixel text-sm text-right text-[var(--neon-green)]"
              >
                {entry.points}
              </motion.span>
              <span className="font-retro text-sm text-right text-[var(--text-muted)]">
                {entry.correctOutcomes}
              </span>
              <span className="font-retro text-sm text-right text-[var(--neon-yellow)]">
                {entry.exactScores}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-3 pt-2 border-t border-white/10 flex flex-wrap gap-x-4 gap-y-1 text-[var(--text-muted)]">
        <span className="font-pixel text-[7px]">0G PTS = +3 OUTCOME · +2 EXACT</span>
        <span className="font-pixel text-[7px]">✓ = CORRECT</span>
        <span className="font-pixel text-[7px]">⭐ = EXACT SCORE</span>
      </div>
    </div>
  );
}
