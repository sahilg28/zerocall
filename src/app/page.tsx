'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useApp } from '@/lib/store';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { CountdownTimer } from '@/components/CountdownTimer';
import { useEffect, useMemo, useState } from 'react';
import { getFlagUrl } from '@/lib/countries';

const PressStart = dynamic(() => import('@/components/PressStart'), { ssr: false });

const sideModes = [
  {
    title: 'AGENT ARENA',
    short: 'Watch six AI agents duel across every fixture.',
    href: '/agents',
    color: 'var(--neon-magenta)',
    icon: '🤖',
  },
  {
    title: 'PENALTY SHOOTOUT',
    short: 'Five shots vs an AI keeper that reads your tells. +10 0G PTS to win.',
    href: '/penalty',
    color: 'var(--neon-orange)',
    icon: '⚽',
  },
  {
    title: 'HEAD TO HEAD',
    short: 'Anyone vs anyone. Match-by-match scorecards.',
    href: '/compare',
    color: 'var(--neon-cyan)',
    icon: '⚔️',
  },
];

export default function LandingPage() {
  const { matches, picks, walletAddress } = useApp();
  const [introDone, setIntroDone] = useState(false);

  // Show the PRESS START gate once per browser session, not on every visit.
  useEffect(() => {
    if (sessionStorage.getItem('zerocall_intro_seen') === '1') setIntroDone(true);
  }, []);

  const finishIntro = () => {
    sessionStorage.setItem('zerocall_intro_seen', '1');
    setIntroDone(true);
  };

  const stats = useMemo(() => {
    const finished = matches.filter((m) => m.status === 'final').length;
    const upcoming = matches.filter((m) => m.status === 'upcoming').length;
    const totalGoals = matches
      .filter((m) => m.result)
      .reduce((sum, m) => sum + m.result!.home + m.result!.away, 0);
    const totalPicks = picks.length;
    return { finished, upcoming, totalGoals, totalPicks };
  }, [matches, picks]);

  const nextMatch = useMemo(() => {
    const upcoming = matches
      .filter((m) => m.status === 'upcoming')
      .sort((a, b) => new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime());
    return upcoming[0];
  }, [matches]);


  return (
    <>
      {!introDone && <PressStart onStart={finishIntro} />}
      <div className="relative flex flex-col items-center min-h-[calc(100vh-120px)] px-4 py-8">
        <div className="relative z-10 w-full max-w-6xl flex flex-col items-center">

          {/* Status pill */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--neon-green)]/40 bg-[var(--neon-green)]/10 mb-5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--neon-green)] animate-pulse" />
            <span className="font-pixel text-[8px] text-[var(--neon-green)] tracking-widest">
              TOURNAMENT ACTIVE · {stats.totalPicks} PICKS LOCKED
            </span>
          </motion.div>

          {/* Compact wordmark — start screen already established the brand */}
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-pixel text-2xl sm:text-3xl md:text-4xl text-[var(--neon-green)] mb-8 tracking-wider"
            style={{ textShadow: '0 0 8px rgba(0,255,136,0.3)' }}
          >
            ZEROCALL
          </motion.h1>

          {/* NEXT MATCH banner */}
          {nextMatch && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card-retro w-full max-w-2xl p-4 mb-6 border-[var(--neon-orange)]/30!"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-pixel text-[8px] text-[var(--neon-orange)] tracking-widest">▸ NEXT KICKOFF</span>
                <CountdownTimer kickoffTime={nextMatch.kickoffTime} />
              </div>
              <div className="flex items-center justify-center gap-4 sm:gap-8">
                <TeamMini name={nextMatch.homeTeam} />
                <div className="font-pixel text-[var(--text-muted)] text-base">VS</div>
                <TeamMini name={nextMatch.awayTeam} />
              </div>
              {nextMatch.group && (
                <p className="font-pixel text-[8px] text-[var(--text-muted)] tracking-widest text-center mt-3">
                  GROUP {nextMatch.group}
                </p>
              )}
            </motion.div>
          )}

          {/* Stats grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="card-retro p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 md:gap-12 justify-items-center mb-6 w-full max-w-2xl"
          >
            <AnimatedCounter value={stats.finished} label="PLAYED" color="var(--neon-green)" />
            <AnimatedCounter value={stats.totalGoals} label="GOALS" color="var(--neon-cyan)" />
            <AnimatedCounter value={stats.upcoming} label="UPCOMING" color="var(--neon-orange)" />
            <AnimatedCounter value={stats.totalPicks} label="PREDICTIONS" color="var(--neon-magenta)" />
          </motion.div>

          {/* GLOBAL ARENA hero card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="w-full mb-3"
          >
            <Link href="/global" className="block group">
              <div
                className="card-retro p-6 relative overflow-hidden cursor-pointer transition-all hover:border-[var(--neon-green)]!"
                style={{ borderColor: 'rgba(0,255,136,0.4)' }}
              >
                <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-[var(--neon-green)]/10 blur-2xl group-hover:bg-[var(--neon-green)]/20 transition-colors" />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-4xl">🏆</span>
                    <h2 className="font-pixel text-lg sm:text-xl text-[var(--neon-green)] tracking-wider">GLOBAL ARENA</h2>
                  </div>
                  <p className="font-retro text-base sm:text-lg text-[var(--text-muted)] mb-4 max-w-md">
                    Predict every World Cup match before kickoff. Out-call six AI agents on the board. Every pick locks on 0G.
                  </p>
                  <span className="inline-flex items-center gap-2 font-pixel text-[10px] text-[var(--neon-green)] group-hover:gap-3 transition-all">
                    PREDICT NOW <span>→</span>
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Side modes — 3 small */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mb-8">
            {sideModes.map((m, i) => (
              <motion.div
                key={m.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.08 }}
              >
                <Link href={m.href} className="block group h-full">
                  <div
                    className="card-retro p-4 h-full cursor-pointer transition-all"
                    style={{ borderColor: `${m.color}33` }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{m.icon}</span>
                      <h3 className="font-pixel text-[10px] tracking-wider" style={{ color: m.color }}>
                        {m.title}
                      </h3>
                    </div>
                    <p className="font-retro text-sm text-[var(--text-muted)] leading-snug">{m.short}</p>
                    <span className="inline-flex items-center gap-1 font-pixel text-[8px] mt-2 group-hover:gap-2 transition-all" style={{ color: m.color }}>
                      ENTER →
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: 1.2 }}
            className="font-pixel text-[8px] text-[var(--text-muted)] mt-4 tracking-widest"
          >
            BUILT ON 0G
          </motion.p>
        </div>
      </div>
    </>
  );
}

function TeamMini({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <img
        src={getFlagUrl(name)}
        alt={name}
        className="w-12 h-8 sm:w-14 sm:h-9 object-cover rounded-sm border border-white/15"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
      <span className="font-pixel text-[9px] sm:text-[10px] text-white tracking-wider">{name.toUpperCase()}</span>
    </div>
  );
}
