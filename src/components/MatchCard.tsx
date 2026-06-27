'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Match, Pick } from '@/lib/types';
import { CountdownTimer } from './CountdownTimer';
import { getFlagUrl } from '@/lib/countries';
import { getOutcomeFromResult } from '@/lib/scoring';
import { useApp, addPoints } from '@/lib/store';
import { completeQuest } from '@/lib/quests';
import { emitZeroGEvent } from '@/components/ZeroGFeed';

interface MatchCardProps {
  match: Match;
  onPick?: (match: Match) => void;
  userPick?: Pick;
  index: number;
}

export function MatchCard({ match, userPick, index }: MatchCardProps) {
  const { addPick, walletAddress } = useApp();
  
  const isLocked = match.status !== 'upcoming';
  const isFinal = match.status === 'final';
  const actualOutcome = isFinal && match.result ? getOutcomeFromResult(match.result) : null;
  const userCorrect = userPick && actualOutcome ? userPick.outcome === actualOutcome : null;

  // Inline prediction state
  const [isEditing, setIsEditing] = useState(false);
  const [homeScore, setHomeScore] = useState(userPick?.score?.home ?? 0);
  const [awayScore, setAwayScore] = useState(userPick?.score?.away ?? 0);
  const [isLocking, setIsLocking] = useState(false);

  // Sync state with incoming user picks
  useEffect(() => {
    if (userPick) {
      setHomeScore(userPick.score?.home ?? 0);
      setAwayScore(userPick.score?.away ?? 0);
      setIsEditing(false);
    } else {
      setHomeScore(0);
      setAwayScore(0);
      setIsEditing(false);
    }
  }, [userPick]);

  const incrementHome = () => setHomeScore((s) => s + 1);
  const decrementHome = () => setHomeScore((s) => Math.max(0, s - 1));
  const incrementAway = () => setAwayScore((s) => s + 1);
  const decrementAway = () => setAwayScore((s) => Math.max(0, s - 1));

  const showControls = !isLocked && (isEditing || !userPick);

  const handleLock = async () => {
    setIsLocking(true);
    const outcome = homeScore > awayScore ? 'home' : awayScore > homeScore ? 'away' : 'draw';
    const timestamp = new Date().toISOString();
    let storageRef = '';
    let isDemo = false;

    try {
      emitZeroGEvent({
        type: 'storage-upload',
        message: `Anchoring prediction for ${match.homeTeam} vs ${match.awayTeam}…`,
      });
      const res = await fetch('/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          predictorId: walletAddress || 'anon',
          matchId: match.id,
          match: `${match.homeTeam} vs ${match.awayTeam}`,
          outcome,
          score: { home: homeScore, away: awayScore },
          timestamp,
          lockedBeforeKickoff: true,
        }),
      });
      const data = await res.json();
      storageRef = data.rootHash || '';
      isDemo = !!data.demo;
      emitZeroGEvent({
        type: 'storage-success',
        message: 'Prediction secured on 0G Storage',
        hash: storageRef,
      });
    } catch {
      isDemo = true;
      emitZeroGEvent({
        type: 'storage-error',
        message: 'Storage fallback — demo hash utilized',
      });
    }

    const newPick: Pick = {
      id: `${walletAddress || 'anon'}-${match.id}-${Date.now()}`,
      predictorId: walletAddress || 'anon',
      matchId: match.id,
      outcome,
      score: { home: homeScore, away: awayScore },
      timestamp,
      storageRef: storageRef || undefined,
      isDemo,
    };

    addPick(newPick);
    
    // Points Connection
    let ptsToAdd = 10;
    const questReward = completeQuest('predict_match');
    if (questReward > 0) {
      ptsToAdd += questReward;
    }
    addPoints(ptsToAdd);

    setIsEditing(false);
    setIsLocking(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`card-retro p-3 sm:p-3.5 flex flex-col justify-between min-h-[170px] sm:min-h-[175px] transition-all duration-300 relative overflow-hidden group ${
        userCorrect === true
          ? 'border-[var(--neon-green)]/60 shadow-[0_0_22px_rgba(0,255,136,0.15),inset_0_0_30px_rgba(0,255,136,0.04)] border-t-4!'
          : userCorrect === false
            ? 'border-red-500/50 border-t-4!'
            : isFinal
              ? 'border-white/10 bg-white/[0.01]'
              : showControls
                ? 'border-[var(--neon-cyan)]/50 shadow-[0_0_15px_rgba(0,229,255,0.1)] border-t-4!'
                : 'border-white/10 hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.02)]'
      }`}
    >
      {/* Background cyber lines glow */}
      {showControls && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--neon-cyan)] to-transparent opacity-80" />
      )}
      {userCorrect === true && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--neon-green)] to-transparent opacity-80" />
      )}

      {/* Top Bar: Group & Countdown / Match Status */}
      <div>
        <div className="flex justify-between items-center pb-2 border-b border-white/5 mb-3">
          <span className="font-pixel text-[8px] sm:text-[9px] text-[var(--neon-cyan)] tracking-widest font-bold">
            {match.group ? `GROUP ${match.group}` : 'KNOCKOUT'}
          </span>
          {match.status === 'upcoming' ? (
            <CountdownTimer kickoffTime={match.kickoffTime} />
          ) : (
            <span
              className={`font-pixel text-[8px] sm:text-[9px] px-2.5 py-0.5 border font-bold ${
                isFinal 
                  ? 'text-[var(--text-muted)] bg-white/5 border-white/10' 
                  : 'text-[var(--neon-green)] bg-[var(--neon-green)]/15 border-[var(--neon-green)]/35 animate-pulse glow-green'
              }`}
            >
              {isFinal ? 'FT' : '● LIVE'}
            </span>
          )}
        </div>

        {/* Teams + Score adjusters */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 my-2">
          {/* Home side */}
          <div className="flex flex-col items-center min-w-0">
            <TeamBadge name={match.homeTeam} />
            {showControls && (
              <div className="flex items-center bg-black/60 px-2 py-0.5 border border-white/10 rounded mt-1.5 shadow-[0_0_6px_rgba(0,255,136,0.05)] w-full max-w-[85px] justify-between">
                <button 
                  onClick={decrementHome} 
                  disabled={isLocking} 
                  className="font-pixel text-xs text-[var(--text-muted)] hover:text-white w-4 h-5 flex items-center justify-center transition-colors"
                >
                  -
                </button>
                <span className="font-pixel text-xs text-[var(--neon-green)] glow-green font-bold w-4 text-center">
                  {homeScore}
                </span>
                <button 
                  onClick={incrementHome} 
                  disabled={isLocking} 
                  className="font-pixel text-xs text-[var(--text-muted)] hover:text-white w-4 h-5 flex items-center justify-center transition-colors"
                >
                  +
                </button>
              </div>
            )}
          </div>

          {/* Center Column: VS / PREDICT / FINAL SCORE */}
          <div className="flex flex-col items-center justify-center px-1">
            {isFinal && match.result ? (
              <div className="bg-black/45 border border-white/10 rounded px-2.5 py-1 font-pixel text-lg sm:text-xl text-[var(--neon-green)] glow-green font-bold tabular-nums">
                {match.result.home}-{match.result.away}
              </div>
            ) : showControls ? (
              <div className="bg-[var(--neon-cyan)]/10 border border-[var(--neon-cyan)]/30 rounded-sm px-2 py-0.5">
                <span className="font-pixel text-[8px] text-[var(--neon-cyan)] glow-cyan tracking-widest font-bold uppercase">
                  PREDICT
                </span>
              </div>
            ) : (
              <span className="font-pixel text-xs text-[var(--text-muted)] tracking-wider">VS</span>
            )}
          </div>

          {/* Away side */}
          <div className="flex flex-col items-center min-w-0">
            <TeamBadge name={match.awayTeam} />
            {showControls && (
              <div className="flex items-center bg-black/60 px-2 py-0.5 border border-white/10 rounded mt-1.5 shadow-[0_0_6px_rgba(255,0,255,0.05)] w-full max-w-[85px] justify-between">
                <button 
                  onClick={decrementAway} 
                  disabled={isLocking} 
                  className="font-pixel text-xs text-[var(--text-muted)] hover:text-white w-4 h-5 flex items-center justify-center transition-colors"
                >
                  -
                </button>
                <span className="font-pixel text-xs text-[var(--neon-magenta)] glow-magenta font-bold w-4 text-center">
                  {awayScore}
                </span>
                <button 
                  onClick={incrementAway} 
                  disabled={isLocking} 
                  className="font-pixel text-xs text-[var(--text-muted)] hover:text-white w-4 h-5 flex items-center justify-center transition-colors"
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Controls / Saved Results */}
      <div className="mt-2.5 pt-2.5 border-t border-white/5">
        {showControls ? (
          <div className="w-full">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLock}
              disabled={isLocking}
              className="w-full py-2 font-pixel text-[9px]! tracking-widest text-center border-2 border-[var(--neon-green)] text-[var(--neon-green)] bg-[var(--neon-green)]/10 hover:bg-[var(--neon-green)]/25 rounded shadow-[0_0_10px_rgba(0,255,136,0.2)] transition-all font-bold uppercase cursor-pointer"
            >
              {isLocking ? 'SECURING ON 0G...' : 'CALL YOUR PREDICTION'}
            </motion.button>
            {userPick && (
              <button
                onClick={() => {
                  setIsEditing(false);
                  setHomeScore(userPick.score?.home ?? 0);
                  setAwayScore(userPick.score?.away ?? 0);
                }}
                className="w-full text-center font-pixel text-[7px] sm:text-[8px] text-[var(--text-muted)] hover:text-white mt-2 transition-colors tracking-widest"
              >
                CANCEL EDIT
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            {userPick ? (
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span
                  className={`outcome-badge text-[8px]! font-pixel font-bold px-2 py-0.5 rounded-sm border uppercase ${
                    userCorrect === true
                      ? 'border-[var(--neon-green)]/40 text-[var(--neon-green)] bg-[var(--neon-green)]/10 shadow-[0_0_8px_rgba(0,255,136,0.1)]'
                      : userCorrect === false
                        ? 'border-red-500/40 text-red-400 bg-red-950/20'
                        : userPick.outcome === 'home'
                          ? 'border-[var(--neon-green)]/30 text-[var(--neon-green)] bg-[var(--neon-green)]/5'
                          : userPick.outcome === 'away'
                            ? 'border-[var(--neon-magenta)]/30 text-[var(--neon-magenta)] bg-[var(--neon-magenta)]/5'
                            : 'border-[var(--neon-cyan)]/30 text-[var(--neon-cyan)] bg-[var(--neon-cyan)]/5'
                  }`}
                >
                  {userPick.outcome === 'home'
                    ? match.homeTeam
                    : userPick.outcome === 'away'
                      ? match.awayTeam
                      : 'DRAW'}
                </span>
                
                {userPick.score && (
                  <span className="font-pixel text-[10px] text-white font-bold bg-white/5 px-2 py-0.5 border border-white/10 rounded-sm">
                    {userPick.score.home}-{userPick.score.away}
                  </span>
                )}

                {userPick.storageRef && (
                  userPick.isDemo ? (
                    <span 
                      className="font-pixel text-[7px] tracking-wider px-2 py-0.5 rounded-sm border border-[var(--neon-yellow)]/30 text-[var(--neon-yellow)] bg-[var(--neon-yellow)]/10"
                      title="Storage Emulator Active — Local proof hash shown"
                    >
                      ⚠️ Local Proof
                    </span>
                  ) : (
                    <a
                      href={`https://storagescan-galileo.0g.ai/tx/${userPick.storageRef}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-pixel text-[7px] tracking-wider px-2 py-0.5 rounded-sm border border-[var(--neon-green)]/40 text-[var(--neon-green)] bg-[var(--neon-green)]/10 hover:bg-[var(--neon-green)]/20 transition-all font-bold flex items-center gap-0.5"
                      title={`Secured on 0G · ${userPick.storageRef.slice(0, 10)}…`}
                    >
                      ⛓ 0G Scan
                    </a>
                  )
                )}
              </div>
            ) : (
              <span className="text-[var(--text-muted)] font-pixel text-[8px] tracking-wider">NO CALL YET</span>
            )}

            {!isLocked && userPick && (
              <button
                onClick={() => setIsEditing(true)}
                className="font-pixel text-[8px] text-[var(--neon-cyan)] hover:text-white transition-colors tracking-widest font-bold flex items-center gap-0.5"
              >
                CHANGE ⚙
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function TeamBadge({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 min-w-0 flex-1">
      <img
        src={getFlagUrl(name)}
        alt={name}
        className="w-10 h-7 object-cover rounded-sm border border-white/10 shadow-[0_0_8px_rgba(255,255,255,0.03)]"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      <span className="font-pixel text-[8px] sm:text-[9px] text-center leading-tight truncate max-w-full font-bold tracking-wider">{name.toUpperCase()}</span>
    </div>
  );
}
