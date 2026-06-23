'use client';

import { motion } from 'framer-motion';
import { Pick, Match, Predictor } from '@/lib/types';
import { getFlagUrl } from '@/lib/countries';

interface ShareCardProps {
  pick: Pick;
  match: Match;
  predictor: Predictor;
  points: number;
}

export function ShareCard({ pick, match, predictor, points }: ShareCardProps) {
  return (
    <div
      id="share-card"
      className="w-[400px] p-6 rounded-lg relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0a0e1a 0%, #1a2236 50%, #0a0e1a 100%)',
        border: '2px solid rgba(0, 229, 255, 0.3)',
      }}
    >
      {/* Scanlines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 1px, transparent 1px, transparent 3px)',
        }}
      />

      {/* Header */}
      <div className="text-center mb-4 relative">
        <h3
          className="font-pixel text-lg text-[var(--neon-green)]"
          style={{ textShadow: '0 0 15px rgba(0,255,136,0.5)' }}
        >
          ZEROCALL
        </h3>
        <p className="font-pixel text-[7px] text-[var(--neon-cyan)] tracking-widest">
          PROOF OF PREDICTION
        </p>
      </div>

      {/* Match */}
      <div className="flex items-center justify-center gap-4 mb-4 relative">
        <div className="text-center">
          <img src={getFlagUrl(match.homeTeam)} alt="" className="w-10 h-7 mx-auto mb-1 rounded-sm" />
          <span className="font-pixel text-[8px] text-white">{match.homeTeam.toUpperCase()}</span>
        </div>
        {match.result ? (
          <span className="font-pixel text-xl text-[var(--neon-green)]">
            {match.result.home} - {match.result.away}
          </span>
        ) : (
          <span className="font-pixel text-lg text-[var(--text-muted)]">VS</span>
        )}
        <div className="text-center">
          <img src={getFlagUrl(match.awayTeam)} alt="" className="w-10 h-7 mx-auto mb-1 rounded-sm" />
          <span className="font-pixel text-[8px] text-white">{match.awayTeam.toUpperCase()}</span>
        </div>
      </div>

      {/* Prediction */}
      <div className="card-retro p-3 mb-3 relative text-center">
        <p className="font-pixel text-[8px] text-[var(--text-muted)] mb-1">
          {predictor.type === 'agent' ? `${predictor.avatar} ${predictor.displayName}` : predictor.displayName} PREDICTED
        </p>
        <div className="flex items-center justify-center gap-2">
          <span className={`outcome-badge outcome-${pick.outcome}`}>
            {pick.outcome === 'home' ? match.homeTeam : pick.outcome === 'away' ? match.awayTeam : 'DRAW'}
          </span>
          {pick.score && (
            <span className="font-pixel text-sm text-white">
              {pick.score.home}-{pick.score.away}
            </span>
          )}
        </div>
        {points > 0 && (
          <motion.p className="font-pixel text-xs text-[var(--neon-green)] mt-2">
            +{points} PTS
          </motion.p>
        )}
      </div>

      {/* Proof */}
      <div className="text-center relative">
        <p className="font-pixel text-[7px] text-[var(--text-muted)] mb-1">
          LOCKED: {new Date(pick.timestamp).toLocaleString()}
        </p>
        {pick.storageRef && (
          <p className="font-pixel text-[7px] text-[var(--neon-cyan)] break-all">
            0G: {pick.storageRef}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-white/10 text-center relative">
        <p className="font-pixel text-[6px] text-[var(--text-muted)] tracking-widest">
          POWERED BY 0G STORAGE · 0G AI · 0G CHAIN
        </p>
      </div>
    </div>
  );
}
