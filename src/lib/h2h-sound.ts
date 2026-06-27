'use client'

import { isMuted as checkMuted } from './store'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let crowdGain: GainNode | null = null
let crowdSrc: AudioBufferSourceNode | null = null

function init() {
  if (typeof window === 'undefined') return null
  if (ctx) return ctx
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = checkMuted() ? 0 : 0.9
    master.connect(ctx.destination)
  } catch { ctx = null }
  return ctx
}

function syncMute() {
  const m = checkMuted()
  if (master) master.gain.value = m ? 0 : 0.9
  if (crowdGain) crowdGain.gain.value = m ? 0 : 0.05
}

function noiseBuffer(c: AudioContext, seconds: number) {
  const len = Math.floor(c.sampleRate * seconds)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  return buf
}

function tone(freq: number, t0: number, dur: number, type: OscillatorType, gain: number, freqEnd?: number) {
  if (!ctx || !master) return
  const o = ctx.createOscillator(); const g = ctx.createGain()
  o.type = type; o.frequency.setValueAtTime(freq, t0)
  if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.02)
}

export const h2hSound = {
  syncMute,

  resume() { const c = init(); if (c && c.state === 'suspended') c.resume().catch(() => {}) },

  whistle() {
    const c = init(); if (!c) return; syncMute()
    const t = c.currentTime
    tone(2100, t, 0.18, 'square', 0.12, 2300)
    tone(2100, t + 0.22, 0.12, 'square', 0.1, 2250)
  },

  kick() {
    const c = init(); if (!c || !master) return; syncMute()
    const t = c.currentTime
    tone(160, t, 0.13, 'sine', 0.35, 40)
    const src = c.createBufferSource(); const g = c.createGain(); const f = c.createBiquadFilter()
    src.buffer = noiseBuffer(c, 0.08); f.type = 'highpass'; f.frequency.value = 1200
    g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
    src.connect(f); f.connect(g); g.connect(master); src.start(t); src.stop(t + 0.09)
  },

  save() {
    const c = init(); if (!c) return; syncMute()
    tone(420, c.currentTime, 0.16, 'triangle', 0.18, 180)
  },

  miss() {
    const c = init(); if (!c) return; syncMute()
    tone(300, c.currentTime, 0.3, 'sawtooth', 0.1, 120)
  },

  goal() {
    const c = init(); if (!c || !master) return; syncMute()
    const t = c.currentTime
    const src = c.createBufferSource(); const g = c.createGain(); const f = c.createBiquadFilter()
    src.buffer = noiseBuffer(c, 1.6); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 0.6
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.25)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5)
    src.connect(f); f.connect(g); g.connect(master); src.start(t); src.stop(t + 1.6)
    ;[523, 659, 784, 1047].forEach((fr, i) => tone(fr, t + 0.1 + i * 0.1, 0.25, 'square', 0.12))
  },

  crowdStart() {
    const c = init(); if (!c || !master || crowdSrc) return; syncMute()
    const src = c.createBufferSource(); const g = c.createGain(); const f = c.createBiquadFilter()
    src.buffer = noiseBuffer(c, 2); src.loop = true
    f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.4
    g.gain.value = checkMuted() ? 0 : 0.05
    src.connect(f); f.connect(g); g.connect(master); src.start()
    crowdSrc = src; crowdGain = g
  },

  crowdStop() {
    if (crowdSrc) { try { crowdSrc.stop() } catch {} crowdSrc = null; crowdGain = null }
  },

  playIntro() {
    const c = init(); if (!c || !master) return; syncMute()
    if (c.state === 'suspended') { c.resume().catch(() => {}) }

    const BPM = 132
    const Q = 60 / BPM
    const E = Q / 2
    const H = Q * 2

    const F4=349.23, G4=392.00, A4=440.00, Bb4=466.16
    const C5=523.25, D5=587.33, E5=659.25, F5=698.46
    const G5=783.99, A5=880.00, Bb5=932.33, C6=1046.50
    const F3=174.61, C3=130.81, Bb2=116.54, A2=110.00, G3=196.00

    type N = [number, number]

    const MEL: N[] = [
      [F5,Q],[C5,Q],[A4,Q],[C5,Q],
      [D5,Q],[E5,Q],[F5,H],
      [G5,Q],[F5,Q],[E5,Q],[D5,Q],
      [C5,H],[C5,H],
      [A5,Q],[G5,Q],[F5,Q],[E5,Q],
      [D5,Q],[C5,Q],[D5,H],
      [E5,E],[F5,E],[G5,E],[A5,E],[Bb5,Q],[C6,Q],
      [F5,H],[C5,H],
    ]
    const BASS: N[] = [
      [F3,H],[C3,H],[Bb2,H],[C3,H],
      [F3,H],[C3,H],[A2,H],[C3,H],
      [F3,H],[C3,H],[Bb2,H],[F3,H],
      [G3,H],[C3,H],[F3,H],[F3,H],
    ]
    const LOOP_DUR = MEL.reduce((s,[,d])=>s+d,0)

    if ((window as any).__zcH2hIntroGain) {
      try { (window as any).__zcH2hIntroGain.gain.setValueAtTime(0, c.currentTime) } catch {}
    }
    const ig = c.createGain()
    ig.gain.value = checkMuted() ? 0 : 0.72
    ig.connect(master!);
    (window as any).__zcH2hIntroGain = ig;
    (window as any).__zcH2hIntroPlaying = true

    function scheduleLoop(startAt: number) {
      if (!(window as any).__zcH2hIntroPlaying) return

      function note(freq: number, t: number, dur: number, type: OscillatorType, gv: number) {
        if (!c || freq <= 0) return
        const o = c.createOscillator(); const g = c.createGain()
        o.type = type; o.frequency.value = freq
        g.gain.setValueAtTime(0.001, t)
        g.gain.linearRampToValueAtTime(gv, t + 0.015)
        g.gain.setValueAtTime(gv * 0.72, t + dur * 0.6)
        g.gain.linearRampToValueAtTime(0.001, t + dur * 0.94)
        o.connect(g); g.connect(ig); o.start(t); o.stop(t + dur + 0.05)
      }

      let tm = startAt
      for (const [f, d] of MEL) { note(f, tm, d * 0.92, 'square', 0.16); tm += d }
      tm = startAt
      for (const [f, d] of BASS) { note(f, tm, d * 0.85, 'triangle', 0.12); tm += d }

      for (let i = 0; i < 32; i++) {
        const bt = startAt + i * Q
        if (!c) break
        if (i % 4 === 0 || i % 4 === 2) {
          const ko = c.createOscillator(); const kg = c.createGain()
          ko.type = 'sine'; ko.frequency.setValueAtTime(100, bt)
          ko.frequency.exponentialRampToValueAtTime(28, bt + 0.12)
          kg.gain.setValueAtTime(0.28, bt); kg.gain.exponentialRampToValueAtTime(0.001, bt + 0.14)
          ko.connect(kg); kg.connect(ig); ko.start(bt); ko.stop(bt + 0.15)
        }
        if (i % 4 === 1 || i % 4 === 3) {
          const ns = c.createBufferSource(); const ng = c.createGain(); const nf = c.createBiquadFilter()
          ns.buffer = noiseBuffer(c, 0.10); nf.type = 'bandpass'; nf.frequency.value = 2000; nf.Q.value = 0.8
          ng.gain.setValueAtTime(0.14, bt); ng.gain.exponentialRampToValueAtTime(0.001, bt + 0.09)
          ns.connect(nf); nf.connect(ng); ng.connect(ig); ns.start(bt); ns.stop(bt + 0.11)
        }
        const ht = bt
        const hs = c.createBufferSource(); const hg = c.createGain(); const hf = c.createBiquadFilter()
        hs.buffer = noiseBuffer(c, 0.04); hf.type = 'highpass'; hf.frequency.value = 8000
        hg.gain.setValueAtTime(0.05, ht); hg.gain.exponentialRampToValueAtTime(0.001, ht + 0.035)
        hs.connect(hf); hf.connect(hg); hg.connect(ig); hs.start(ht); hs.stop(ht + 0.045)
      }

      const nextLoopAt = startAt + LOOP_DUR
      const msUntilNext = c ? (nextLoopAt - c.currentTime - 0.3) * 1000 : 14000
      ;(window as any).__zcH2hLoopTimer = setTimeout(() => scheduleLoop(nextLoopAt), Math.max(50, msUntilNext))
    }

    scheduleLoop(c.currentTime + 0.05)
  },

  stopIntro() {
    (window as any).__zcH2hIntroPlaying = false
    if ((window as any).__zcH2hLoopTimer) {
      clearTimeout((window as any).__zcH2hLoopTimer)
      ;(window as any).__zcH2hLoopTimer = null
    }
    if ((window as any).__zcH2hIntroGain && ctx) {
      try {
        const ig = (window as any).__zcH2hIntroGain as GainNode
        ig.gain.setValueAtTime(ig.gain.value, ctx.currentTime)
        ig.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4)
      } catch {}
      (window as any).__zcH2hIntroGain = null
    }
  },
}
