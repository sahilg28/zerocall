'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/lib/store';
import { buildLeaderboard } from '@/lib/scoring';
import { MatchCard } from '@/components/MatchCard';
import { PickModal } from '@/components/PickModal';
import { Leaderboard } from '@/components/Leaderboard';
import { ProphetMoment } from '@/components/ProphetMoment';
import { Match } from '@/lib/types';
import { isProphetMoment } from '@/lib/scoring';

export default function GlobalPage() {
  const { matches, picks, predictors, walletAddress, getUserPick } = useApp();
  const [pickingMatch, setPickingMatch] = useState<Match | null>(null);
  const [prophetData, setProphetData] = useState<{ pickId: string } | null>(null);

  const upcomingMatches = useMemo(
    () => matches.filter((m) => m.status === 'upcoming'),
    [matches]
  );
  const finishedMatches = useMemo(
    () => matches.filter((m) => m.status === 'final'),
    [matches]
  );

  const leaderboard = useMemo(
    () => buildLeaderboard(predictors, picks, matches),
    [predictors, picks, matches]
  );

  const userId = walletAddress || 'anon';

  // Check for prophet moments in finished matches
  const prophetPick = prophetData
    ? picks.find((p) => p.id === prophetData.pickId)
    : null;
  const prophetMatch = prophetPick
    ? matches.find((m) => m.id === prophetPick.matchId)
    : null;
  const prophetPredictor = prophetPick
    ? predictors.find((p) => p.id === prophetPick.predictorId)
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="font-pixel text-xl text-[var(--neon-green)] glow-green mb-2">
          GLOBAL BOARD
        </h1>
        <p className="font-retro text-lg text-[var(--text-muted)]">
          Beat the Oracle. Prove your foresight on-chain.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Matches column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming */}
          {upcomingMatches.length > 0 && (
            <section>
              <h2 className="font-pixel text-xs text-[var(--neon-cyan)] mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-[var(--neon-cyan)] rounded-full animate-pulse" />
                UPCOMING MATCHES
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {upcomingMatches.map((match, i) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onPick={setPickingMatch}
                    userPick={getUserPick(match.id)}
                    index={i}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Finished */}
          {finishedMatches.length > 0 && (
            <section>
              <h2 className="font-pixel text-xs text-[var(--text-muted)] mb-4">
                RESULTS
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {finishedMatches.map((match, i) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onPick={setPickingMatch}
                    userPick={getUserPick(match.id)}
                    index={i}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Leaderboard column */}
        <div>
          <Leaderboard entries={leaderboard} highlightId={userId} />
        </div>
      </div>

      {/* Pick modal */}
      <PickModal match={pickingMatch} onClose={() => setPickingMatch(null)} />

      {/* Prophet moment overlay */}
      <ProphetMoment
        show={!!prophetData}
        pick={prophetPick || null}
        match={prophetMatch || null}
        predictor={prophetPredictor || null}
        onClose={() => setProphetData(null)}
      />
    </div>
  );
}
