'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { getChiptune } from '@/lib/chiptune';
import { isMuted, setMuted } from '@/lib/store';

const DotField = dynamic(() => import('./DotField'), { ssr: false });

// ─── Component ──────────────────────────────────────────────────────────────
interface PressStartProps {
  onStart: () => void;
}

export default function PressStart({ onStart }: PressStartProps) {
  const [soundOn, setSoundOn] = useState(false);
  const [show, setShow] = useState(true);

  useEffect(() => {
    setSoundOn(!isMuted());
    const onMuteChange = (e: Event) => setSoundOn(!(e as CustomEvent<boolean>).detail);
    window.addEventListener('zerocall-mute', onMuteChange);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('zerocall-mute', onMuteChange);
      document.body.style.overflow = '';
    };
  }, []);

  // keyboard: SPACE / ENTER triggers start
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!show) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleStart();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  function toggleSound() {
    const t = getChiptune();
    if (soundOn) {
      t.stop();
      setSoundOn(false);
      setMuted(true);
    } else {
      t.start();
      setSoundOn(true);
      setMuted(false);
    }
  }

  function handleStart() {
    const t = getChiptune();
    // If sound is on, start the background loop now (this click is the
    // gesture browsers require) — it then keeps playing across every page,
    // since the chiptune instance is a module-level singleton, not tied to
    // this component's lifecycle.
    if (!isMuted()) {
      t.coin();
      t.start();
    }
    setTimeout(() => {
      setShow(false);
      setTimeout(onStart, 450);
    }, 280);
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="press-start"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05, filter: 'blur(8px)' }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--bg-primary)] overflow-hidden"
        >
          {/* Dot field bg */}
          <div className="absolute inset-0 z-0">
            <DotField
              dotRadius={1.4}
              dotSpacing={18}
              bulgeStrength={80}
              glowRadius={220}
              sparkle
              gradientFrom="rgba(0, 255, 136, 0.55)"
              gradientTo="rgba(0, 229, 255, 0.30)"
              glowColor="rgba(0, 255, 136, 0.25)"
            />
          </div>

          {/* Scanline + vignette */}
          <div className="pointer-events-none absolute inset-0 z-[1]" style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)',
          }} />

          {/* Content */}
          <div className="relative z-[2] flex flex-col items-center text-center px-6">
            {/* Tiny header */}
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 0.8, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-pixel text-[8px] md:text-[10px] tracking-[0.4em] text-[var(--neon-cyan)] mb-6"
            >
              WORLD CUP 2026 · AI PREDICTION ARENA
            </motion.p>

            {/* Glitch wordmark */}
            <motion.h1
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35, type: 'spring', stiffness: 120 }}
              className="font-pixel text-4xl md:text-7xl text-white mb-4 select-none glitch"
              data-text="ZEROCALL"
              style={{
                textShadow: '0 0 10px rgba(0,255,136,0.4), 0 0 20px rgba(0,255,136,0.15)',
                letterSpacing: '0.05em',
              }}
            >
              ZEROCALL
            </motion.h1>

            {/* Subline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="font-retro text-lg md:text-2xl text-[var(--text-muted)] mb-3 max-w-2xl"
            >
              Predict every match before kickoff. Beat our <span className="text-[var(--neon-magenta)]">AI agents</span>. Lock every call <span className="text-[var(--neon-green)]">on 0G</span>.
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              transition={{ delay: 0.9 }}
              className="font-pixel text-[8px] md:text-[10px] tracking-widest text-[var(--neon-cyan)] mb-10 md:mb-14"
            >
              PREDICT · LOCK · WIN
            </motion.p>

            {/* PRESS START button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleStart}
              className="press-start-btn font-pixel text-sm md:text-xl text-[var(--neon-green)] border-2 border-[var(--neon-green)] px-8 py-4 md:px-14 md:py-6 bg-transparent cursor-pointer"
            >
              ▶ PRESS START
            </motion.button>
          </div>

          {/* Sound toggle */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 }}
            onClick={toggleSound}
            className="absolute bottom-4 left-4 md:bottom-8 md:left-8 z-[3] font-pixel text-[8px] md:text-[10px] border border-[var(--neon-cyan)] text-[var(--neon-cyan)] px-3 py-2 md:px-4 md:py-3 bg-black/40 backdrop-blur cursor-pointer hover:bg-[var(--neon-cyan)] hover:text-[var(--bg-primary)] transition-colors tracking-widest"
          >
            {soundOn ? '🔊 SOUND ON' : '🔇 SOUND OFF'}
          </motion.button>

          {/* Credits */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-4 right-4 md:bottom-8 md:right-8 z-[3] font-pixel text-[8px] md:text-[9px] text-[var(--text-muted)] tracking-widest"
          >
            POWERED BY 0G
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
