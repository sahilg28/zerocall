'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/lib/store';
import { AGENTS, Match, Pick } from '@/lib/types';
import { buildLeaderboard, getOutcomeFromResult, scorePick } from '@/lib/scoring';
import { Leaderboard } from '@/components/Leaderboard';
import { ProphetMoment } from '@/components/ProphetMoment';
import { getFlagUrl } from '@/lib/countries';

export default function AgentsPage() {
  const { matches, picks, predictors } = useApp();
  const [selectedAgent, setSelectedAgent] = useState(AGENTS[0].id);
  const [prophetData, setProphetData] = useState<string | null>(null);

  const agentPredictors = predictors.filter((p) => p.type === 'agent');

  const agentLeaderboard = useMemo(
    () => buildLeaderboard(agentPredictors, picks, matches),
    [agentPredictors, picks, matches]
  );

  const agentPicks = useMemo(
    () => picks.filter((p) => p.predictorId === selectedAgent),
    [picks, selectedAgent]
  );

  const agent = AGENTS.find((a) => a.id === selectedAgent)!;

  const prophetPick = prophetData ? picks.find((p) => p.id === prophetData) : null;
  const prophetMatch = prophetPick ? matches.find((m) => m.id === prophetPick.matchId) : null;
  const prophetPredictor = prophetPick ? predictors.find((p) => p.id === prophetPick.predictorId) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="font-pixel text-xl text-[var(--neon-magenta)] glow-magenta mb-2">
          AGENT ARENA
        </h1>
        <p className="font-retro text-lg text-[var(--text-muted)]">
          Six AI minds. One tournament. Who sees the future?
        </p>
      </motion.div>

      {/* Agent selector */}
      <div className="flex justify-center gap-3 mb-8 flex-wrap">
        {AGENTS.map((a) => (
          <motion.button
            key={a.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedAgent(a.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-sm border font-pixel text-[10px] transition-all ${
              selectedAgent === a.id
                ? 'border-[var(--neon-magenta)] bg-[var(--neon-magenta)]/10 text-[var(--neon-magenta)]'
                : 'border-white/20 text-[var(--text-muted)] hover:border-white/40'
            }`}
          >
            <span className="text-lg">{a.avatar}</span>
            {a.displayName.toUpperCase()}
          </motion.button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Agent detail + picks */}
        <div className="lg:col-span-2">
          {/* Agent card */}
          <motion.div
            key={selectedAgent}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card-retro p-6 mb-6 border-[var(--neon-magenta)]/30!"
          >
            <div className="flex items-start gap-4">
              <span className="text-5xl">{agent.avatar}</span>
              <div>
                <h2 className="font-pixel text-sm text-[var(--neon-magenta)] mb-1">
                  {agent.displayName.toUpperCase()}
                </h2>
                <p className="font-retro text-base text-[var(--text-muted)]">
                  {agent.agentPersona}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Agent picks by match */}
          <h3 className="font-pixel text-xs text-[var(--neon-cyan)] mb-4">
            {agent.displayName.toUpperCase()}&apos;S PICKS
          </h3>
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {matches.map((match, i) => {
                const pick = agentPicks.find((p) => p.matchId === match.id);
                if (!pick) return null;

                const isFinal = match.status === 'final' && match.result;
                const actualOutcome = isFinal ? getOutcomeFromResult(match.result!) : null;
                const isCorrect = actualOutcome ? pick.outcome === actualOutcome : null;
                const points = isFinal ? scorePick(pick, match) : null;

                return (
                  <motion.div
                    key={`${selectedAgent}-${match.id}`}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`card-retro p-3 grid grid-cols-[1fr_auto_1fr_auto] gap-3 items-center ${
                      isCorrect === true ? 'border-[var(--neon-green)]/40!' : ''
                    }`}
                  >
                    {/* Teams */}
                    <div className="flex items-center gap-2">
                      <img src={getFlagUrl(match.homeTeam)} alt="" className="w-6 h-4 rounded-sm" />
                      <span className="font-retro text-sm">{match.homeTeam}</span>
                      <span className="text-[var(--text-muted)]">vs</span>
                      <span className="font-retro text-sm">{match.awayTeam}</span>
                      <img src={getFlagUrl(match.awayTeam)} alt="" className="w-6 h-4 rounded-sm" />
                    </div>

                    {/* Pick */}
                    <span className={`outcome-badge outcome-${pick.outcome}`}>
                      {pick.outcome === 'home'
                        ? match.homeTeam
                        : pick.outcome === 'away'
                          ? match.awayTeam
                          : 'DRAW'}
                    </span>

                    {/* Score + reason */}
                    <div className="text-right">
                      {pick.score && (
                        <span className="font-pixel text-[10px] text-[var(--text-muted)]">
                          {pick.score.home}-{pick.score.away}
                        </span>
                      )}
                      {pick.reason && (
                        <p className="font-retro text-xs text-[var(--text-muted)] truncate max-w-[200px]">
                          {pick.reason}
                        </p>
                      )}
                    </div>

                    {/* Result */}
                    <div className="text-right min-w-[50px]">
                      {isFinal ? (
                        <div className="flex items-center gap-1 justify-end">
                          <span className={`font-pixel text-[10px] ${isCorrect ? 'text-[var(--neon-green)]' : 'text-red-400'}`}>
                            {isCorrect ? '✓' : '✗'}
                          </span>
                          {points !== null && points > 0 && (
                            <span className="font-pixel text-[10px] text-[var(--neon-green)]">
                              +{points}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="font-pixel text-[8px] text-[var(--text-muted)]">
                          PENDING
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Agent standings */}
        <div>
          <Leaderboard
            entries={agentLeaderboard}
            title="AGENT STANDINGS"
            highlightId={selectedAgent}
          />
        </div>
      </div>

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
