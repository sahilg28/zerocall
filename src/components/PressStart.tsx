'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

const DotField = dynamic(() => import('./DotField'), { ssr: false });

// ─── Tiny chiptune player (Web Audio, no asset) ─────────────────────────────
class ChipTune {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer = 0;
  playing = false;

  private ensure() {
    if (this.ctx) return;
    const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.12;
    this.master.connect(this.ctx.destination);
  }

  private blip(freq: number, start: number, dur: number, type: OscillatorType = 'square', vol = 0.25) {
    if (!this.ctx || !this.master) return;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(vol, start + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(this.master);
    o.start(start);
    o.stop(start + dur + 0.02);
  }

  private noise(start: number, dur: number, vol = 0.18) {
    if (!this.ctx || !this.master) return;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(g).connect(this.master);
    src.start(start);
  }

  // arcade-y A-minor pentatonic loop
  start() {
    this.ensure();
    if (!this.ctx || this.playing) return;
    this.playing = true;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const T = 0.14; // 8th-note in seconds (~107 bpm in 8ths)
    // melody: A4 C5 E5 G5 — pentatonic loop
    const lead: [number, number][] = [
      [440, 1], [523, 1], [659, 1], [523, 1],
      [880, 1], [659, 1], [523, 1], [659, 1],
      [440, 1], [523, 1], [784, 1], [659, 1],
      [523, 1], [440, 1], [392, 1], [440, 2],
    ];
    const bass: [number, number][] = [
      [110, 4], [165, 4], [196, 4], [110, 4],
    ];
    const beats = lead.reduce((s, [, b]) => s + b, 0);
    const loopDur = beats * T;

    const schedule = () => {
      if (!this.playing || !this.ctx) return;
      const base = this.ctx.currentTime + 0.05;
      let t = base;
      for (const [f, b] of lead) {
        this.blip(f, t, b * T * 0.85, 'square', 0.22);
        t += b * T;
      }
      let bt = base;
      for (const [f, b] of bass) {
        this.blip(f, bt, b * T * 0.9, 'triangle', 0.35);
        bt += b * T;
      }
      // kick on 1 & 3 each bar
      for (let bar = 0; bar < 4; bar++) {
        this.noise(base + bar * 4 * T, 0.06, 0.18);
        this.noise(base + bar * 4 * T + 2 * T, 0.05, 0.12);
      }
      this.timer = window.setTimeout(schedule, loopDur * 1000 - 80);
    };
    schedule();
  }

  stop() {
    this.playing = false;
    clearTimeout(this.timer);
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.08);
    }
  }

  coin() {
    this.ensure();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const t = this.ctx.currentTime;
    this.blip(988, t, 0.08, 'square', 0.3);
    this.blip(1319, t + 0.08, 0.16, 'square', 0.3);
  }
}

// ─── Component ──────────────────────────────────────────────────────────────
interface PressStartProps {
  onStart: () => void;
}

export default function PressStart({ onStart }: PressStartProps) {
  const [soundOn, setSoundOn] = useState(false);
  const [show, setShow] = useState(true);
  const tuneRef = useRef<ChipTune | null>(null);

  if (!tuneRef.current && typeof window !== 'undefined') tuneRef.current = new ChipTune();

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

  // cleanup tune on unmount
  useEffect(() => () => { tuneRef.current?.stop(); }, []);

  function toggleSound() {
    const t = tuneRef.current;
    if (!t) return;
    if (soundOn) {
      t.stop();
      setSoundOn(false);
      try { localStorage.setItem('zerocall_muted', '1'); } catch {}
    } else {
      try { localStorage.removeItem('zerocall_muted'); } catch {}
      t.start();
      setSoundOn(true);
    }
  }

  function handleStart() {
    tuneRef.current?.coin();
    setTimeout(() => {
      tuneRef.current?.stop();
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
                textShadow: '0 0 30px rgba(0,255,136,0.6), 0 0 60px rgba(0,255,136,0.3)',
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
            className="absolute bottom-4 right-4 md:bottom-8 md:right-8 z-[3] font-pixel text-[7px] md:text-[9px] text-[var(--text-muted)] tracking-widest"
          >
            POWERED BY 0G
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
