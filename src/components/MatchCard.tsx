'use client';

import { motion } from 'framer-motion';
import { Match, Pick } from '@/lib/types';
import { CountdownTimer } from './CountdownTimer';
import { getFlagUrl } from '@/lib/countries';
import { getOutcomeFromResult } from '@/lib/scoring';
import { useApp } from '@/lib/store';

interface MatchCardProps {
  match: Match;
  onPick: (match: Match) => void;
  userPick?: Pick;
  index: number;
}

export function MatchCard({ match, onPick, userPick, index }: MatchCardProps) {
  const isLocked = match.status !== 'upcoming';
  const isFinal = match.status === 'final';
  const actualOutcome = isFinal && match.result ? getOutcomeFromResult(match.result) : null;
  const userCorrect = userPick && actualOutcome ? userPick.outcome === actualOutcome : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`card-retro p-4 ${
        userCorrect === true
          ? 'border-[var(--neon-green)]! shadow-[0_0_15px_rgba(0,255,136,0.2)]'
          : userCorrect === false
            ? 'border-red-500/50!'
            : ''
      }`}
    >
      {/* Status + Group */}
      <div className="flex justify-between items-center mb-3">
        <span className="font-pixel text-[9px] text-[var(--neon-cyan)]">
          {match.group ? `GROUP ${match.group}` : 'KNOCKOUT'}
        </span>
        {match.status === 'upcoming' ? (
          <CountdownTimer kickoffTime={match.kickoffTime} />
        ) : (
          <span
            className={`font-pixel text-[9px] ${
              isFinal ? 'text-[var(--text-muted)]' : 'text-[var(--neon-green)] glow-green'
            }`}
          >
            {isFinal ? 'FINAL' : '● LIVE'}
          </span>
        )}
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between gap-3">
        <TeamBadge name={match.homeTeam} />
        <div className="text-center">
          {isFinal && match.result ? (
            <div className="font-pixel text-2xl text-[var(--neon-green)]">
              {match.result.home} - {match.result.away}
            </div>
          ) : (
            <span className="font-pixel text-xl text-[var(--text-muted)]">VS</span>
          )}
        </div>
        <TeamBadge name={match.awayTeam} />
      </div>

      {/* User pick status */}
      <div className="mt-3 flex items-center justify-between">
        {userPick ? (
          <div className="flex items-center gap-2">
            <span
              className={`outcome-badge ${
                userCorrect === true
                  ? 'outcome-correct'
                  : userCorrect === false
                    ? 'outcome-wrong'
                    : `outcome-${userPick.outcome}`
              }`}
            >
              {userPick.outcome === 'home'
                ? match.homeTeam
                : userPick.outcome === 'away'
                  ? match.awayTeam
                  : 'DRAW'}
            </span>
            {userPick.score && (
              <span className="font-retro text-sm text-[var(--text-muted)]">
                ({userPick.score.home}-{userPick.score.away})
              </span>
            )}
            {userPick.storageRef && (
              <a
                href={`https://storagescan-galileo.0g.ai/tx/${userPick.storageRef}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-pixel text-[7px] tracking-widest px-1.5 py-0.5 rounded-sm border border-[var(--neon-green)]/40 text-[var(--neon-green)] bg-[var(--neon-green)]/10 hover:bg-[var(--neon-green)]/20 transition-colors"
                title={`Locked on 0G · ${userPick.storageRef.slice(0, 10)}…`}
              >
                🔒 0G
              </a>
            )}
          </div>
        ) : (
          <span className="text-[var(--text-muted)] text-sm">No pick yet</span>
        )}

        {!isLocked && !userPick && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onPick(match)}
            className="btn-neon btn-lock text-[9px]! px-3! py-1.5!"
          >
            CALL IT
          </motion.button>
        )}
        {!isLocked && userPick && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onPick(match)}
            className="font-pixel text-[9px] text-[var(--text-muted)] hover:text-[var(--neon-cyan)] transition-colors"
          >
            CHANGE
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

function TeamBadge({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-[80px]">
      <img
        src={getFlagUrl(name)}
        alt={name}
        className="w-10 h-7 object-cover rounded-sm border border-white/10"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      <span className="font-pixel text-[9px] text-center leading-tight">{name.toUpperCase()}</span>
    </div>
  );
}
