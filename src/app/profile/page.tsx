'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useApp, getPoints } from '@/lib/store';
import { scorePick, getOutcomeFromResult, buildLeaderboard } from '@/lib/scoring';
import { getAllPredictors } from '@/lib/store';
import { DAILY_QUESTS, getTodayProgress, type DailyProgress } from '@/lib/quests';

export default function ProfilePage() {
  const { matches, picks, walletAddress } = useApp();
  const [pts, setPts] = useState(0);
  const [questProgress, setQuestProgress] = useState<DailyProgress>({});

  useEffect(() => {
    setPts(getPoints());
    setQuestProgress(getTodayProgress());
  }, []);

  const isGuest = walletAddress?.startsWith('guest:');
  const displayName = isGuest
    ? walletAddress!.slice('guest:'.length)
    : walletAddress
      ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
      : 'Anonymous';

  const userPicks = useMemo(
    () => picks.filter((p) => p.predictorId === (walletAddress || 'anon')),
    [picks, walletAddress]
  );

  const matchMap = useMemo(() => new Map(matches.map((m) => [m.id, m])), [matches]);

  const stats = useMemo(() => {
    let correctOutcomes = 0;
    let exactScores = 0;
    let totalScored = 0;
    let totalPoints = 0;

    for (const pick of userPicks) {
      const match = matchMap.get(pick.matchId);
      if (!match || match.status !== 'final' || !match.result) continue;
      totalScored++;
      const pts = scorePick(pick, match);
      totalPoints += pts;
      if (pts > 0) {
        correctOutcomes++;
        if (pts >= 25) exactScores++;
      }
    }

    const accuracy = totalScored > 0 ? Math.round((correctOutcomes / totalScored) * 100) : 0;

    return { correctOutcomes, exactScores, totalScored, totalPoints, accuracy };
  }, [userPicks, matchMap]);

  const leaderboard = useMemo(
    () => buildLeaderboard(getAllPredictors(walletAddress), picks, matches),
    [walletAddress, picks, matches]
  );

  const userRank = useMemo(() => {
    const idx = leaderboard.findIndex((e) => e.predictor.id === (walletAddress || 'anon'));
    return idx >= 0 ? idx + 1 : leaderboard.length + 1;
  }, [leaderboard, walletAddress]);

  const pickHistory = useMemo(() => {
    return userPicks
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);
  }, [userPicks]);

  return (
    <div className="min-h-[calc(100vh-120px)] px-3 sm:px-4 py-6 sm:py-10 max-w-3xl mx-auto">
      {/* Identity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-retro p-5 sm:p-6 mb-4 border-t-3! border-t-[var(--neon-green)]/50!"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-pixel text-[8px] text-[var(--text-muted)] tracking-widest mb-1">
              {isGuest ? 'GUEST' : walletAddress ? 'WALLET' : 'ANONYMOUS'}
            </div>
            <h1 className="font-pixel text-lg sm:text-xl text-[var(--neon-green)]">
              {displayName.toUpperCase()}
            </h1>
          </div>
          <div className="text-right">
            <div className="font-pixel text-[8px] text-[var(--text-muted)] tracking-widest mb-1">0G PTS</div>
            <div className="font-pixel text-2xl text-[var(--neon-cyan)]">{pts}</div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-5 gap-1 sm:gap-2">
          {[
            { label: 'RANK', value: `#${userRank}`, color: 'var(--neon-yellow)' },
            { label: 'PICKS', value: userPicks.length, color: 'var(--neon-cyan)' },
            { label: 'ACC', value: `${stats.accuracy}%`, color: 'var(--neon-green)' },
            { label: 'CORRECT', value: stats.correctOutcomes, color: 'var(--neon-green)' },
            { label: 'EXACT', value: stats.exactScores, color: 'var(--neon-yellow)' },
          ].map((s) => (
            <div key={s.label} className="card-retro flex flex-col items-center justify-center py-2 px-0.5 text-center min-w-0">
              <span className="font-pixel text-xs sm:text-sm truncate max-w-full" style={{ color: s.color }}>{s.value}</span>
              <span className="font-pixel text-[6px] sm:text-[8px] text-[var(--text-muted)] tracking-wider mt-0.5 truncate max-w-full">{s.label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Daily Challenges */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-retro p-5 sm:p-6 mb-4 border-t-3! border-t-[var(--neon-orange)]/50!"
      >
        <h2 className="font-pixel text-xs text-[var(--neon-orange)] mb-4 flex items-center gap-2">
          <span className="text-base">📋</span> DAILY CHALLENGES
        </h2>
        <div className="space-y-3">
          {DAILY_QUESTS.map((quest) => {
            const progress = questProgress[quest.id];
            const completed = progress?.completed ?? false;

            return (
              <div
                key={quest.id}
                className={`flex items-center justify-between p-3 rounded-sm border ${
                  completed
                    ? 'border-[var(--neon-green)]/30 bg-[var(--neon-green)]/5'
                    : 'border-white/10 bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{quest.icon}</span>
                  <div>
                    <div className="font-pixel text-[9px] text-white">{quest.title}</div>
                    <div className="font-retro text-sm text-[var(--text-muted)]">{quest.description}</div>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  {completed ? (
                    <span className="font-pixel text-[9px] text-[var(--neon-green)]">DONE +{quest.reward}</span>
                  ) : (
                    <span className="font-pixel text-[8px] text-[var(--text-muted)]">+{quest.reward} PTS</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Prediction History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card-retro p-5 sm:p-6 border-t-3! border-t-[var(--neon-cyan)]/50!"
      >
        <h2 className="font-pixel text-xs text-[var(--neon-cyan)] mb-4 flex items-center gap-2">
          <span className="text-base">📜</span> PREDICTION HISTORY
        </h2>
        {pickHistory.length === 0 ? (
          <p className="font-retro text-sm text-[var(--text-muted)] text-center py-6">
            No predictions yet. Head to PREDICT to make your first call.
          </p>
        ) : (
          <div className="space-y-2">
            {pickHistory.map((pick) => {
              const match = matchMap.get(pick.matchId);
              const pts = match ? scorePick(pick, match) : 0;
              const isFinal = match?.status === 'final';

              return (
                <div
                  key={pick.id}
                  className="flex items-center justify-between p-2.5 rounded-sm border border-white/10 bg-white/[0.02]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-pixel text-[9px] text-white truncate">
                      {match ? `${match.homeTeam} vs ${match.awayTeam}` : pick.matchId}
                    </div>
                    <div className="font-retro text-sm text-[var(--text-muted)]">
                      {pick.outcome.toUpperCase()}
                      {pick.score ? ` · ${pick.score.home}-${pick.score.away}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {isFinal && (
                      <span className={`font-pixel text-[10px] ${pts > 0 ? 'text-[var(--neon-green)]' : 'text-red-400'}`}>
                        {pts > 0 ? `+${pts}` : '0'}
                      </span>
                    )}
                    {!isFinal && (
                      <span className="font-pixel text-[8px] text-[var(--neon-yellow)]">PENDING</span>
                    )}
                    {pick.storageRef && (
                      pick.isDemo ? (
                        <span 
                          className="font-pixel text-[8px] text-[var(--neon-yellow)]" 
                          title="Storage Emulator Active — Local proof hash shown"
                        >
                          Local Proof
                        </span>
                      ) : (
                        <a
                          href={`https://storagescan-galileo.0g.ai/tx/${pick.storageRef}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-pixel text-[8px] text-[var(--neon-cyan)] hover:underline"
                          title="View on 0G Explorer"
                        >
                          0G
                        </a>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
