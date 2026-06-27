'use client'

import { useRef, useEffect } from 'react'
import type { H2HPlayer, H2HTeam, BeatKind } from '@/lib/h2h-types'
import type { FootballFrame, PlayerColors } from '@/lib/pixel-football'
import { drawFootballPlayer, CANVAS_W, CANVAS_H, hexToRgb } from '@/lib/pixel-football'

// ── Sprite-sheet manifest ──────────────────────────────────────────
interface SpriteManifest {
  src: string
  frameW: number
  frameH: number
  cols: number
  frames: Record<string, number>
  scale?: number
  tint?: boolean
}

interface GkManifest {
  src: string
  frameW: number
  frameH: number
  cols: number
  frames: Record<string, number>
  scale?: number
}


// ── Animation controller ───────────────────────────────────────────
interface AnimState { prev: FootballFrame; target: FootballFrame; t0: number }

const TWEEN: Record<string, string[]> = {
  'idle→run0': ['run_t0', 'run0'],
  'run0→run1': ['run_t1', 'run1'],
  'run1→run0': ['run_t2', 'run0'],
  'run0→dribble0': ['drib_t0', 'dribble0'],
  'dribble0→dribble1': ['drib_t1', 'dribble1'],
  'dribble1→dribble0': ['drib_t0', 'dribble0'],
  'run1→shoot': ['shoot_t0', 'shoot'],
  'dribble1→shoot': ['shoot_t0', 'shoot'],
  'dribble0→shoot': ['shoot_t0', 'shoot'],
  'run0→shoot': ['shoot_t0', 'shoot'],
}

const RUN_CYCLE = ['run0', 'run_t1', 'run1', 'run_t2']

function agentFrame(st: AnimState, target: FootballFrame, t: number, hasSheet: boolean): string {
  if (st.target !== target) {
    st.prev = st.target; st.target = target; st.t0 = t
  }
  const dt = t - st.t0
  const key = `${st.prev}→${st.target}`
  const seq = TWEEN[key]
  if (seq && dt < 180) {
    const i = Math.min(Math.floor(dt / (180 / seq.length)), seq.length - 1)
    return seq[i]
  }
  if (target === 'run0' || target === 'run1') {
    if (!hasSheet) return Math.sin(t * 0.006) > 0 ? 'run0' : 'run1'
    return RUN_CYCLE[Math.floor(t * 0.004) % RUN_CYCLE.length]
  }
  return target
}

// ── GK key selection ───────────────────────────────────────────────
function gkKey(isA: boolean, phase: string, kind: BeatKind | undefined, concedeMs: number, _t: number): string {
  const myGoalPhase = isA ? 'goalB' : 'goalA'
  const theirGoalPhase = isA ? 'goalA' : 'goalB'
  if (phase === myGoalPhase) {
    if (concedeMs < 400) return 'dive_l'
    return 'concede'
  }
  if (phase === theirGoalPhase) return 'celebrate'
  const myDefense = isA ? 'attackB' : 'attackA'
  if (phase === myDefense) {
    if (kind === 'shot') return 'dive_l'
    if (kind === 'save') return 'save_l'
    return 'ready'
  }
  return 'idle'
}


// ── Sheet loading ──────────────────────────────────────────────────
let _sheet: { img: HTMLImageElement; m: SpriteManifest } | null = null
let _sheetLoading = false
function loadSpriteSheet(onDone: () => void) {
  if (_sheet || _sheetLoading) return
  _sheetLoading = true
  fetch('/assets/players.json')
    .then(r => r.json())
    .then((m: SpriteManifest) => {
      const img = new Image()
      img.onload = () => { _sheet = { img, m }; onDone() }
      img.src = m.src || '/assets/players.png'
    })
    .catch(() => { _sheetLoading = false })
}

let _gk: { img: HTMLImageElement; m: GkManifest } | null = null
function loadGkSheet() {
  if (_gk) return
  fetch('/assets/gk.json')
    .then(r => r.json())
    .then((m: GkManifest) => {
      const img = new Image()
      img.onload = () => { _gk = { img, m } }
      img.src = m.src || '/assets/gk.png'
    })
    .catch(() => {})
}


function drawGkSheet(ctx: CanvasRenderingContext2D, cx: number, cy: number, h: number, face: number, key: string) {
  if (!_gk) return
  const { img, m } = _gk
  const idx = m.frames[key] ?? m.frames.idle ?? 0
  const sx = (idx % m.cols) * m.frameW
  const sy = Math.floor(idx / m.cols) * m.frameH
  const w = h * (m.frameW / m.frameH)
  ctx.save()
  ctx.imageSmoothingEnabled = false
  if (face < 0) { ctx.translate(cx, 0); ctx.scale(-1, 1); ctx.translate(-cx, 0) }
  ctx.drawImage(img, sx, sy, m.frameW, m.frameH, cx - w / 2, cy - h, w, h)
  ctx.restore()
}


// ── Projection ─────────────────────────────────────────────────────
const HY = 0.13, BY = 0.88, FHW = 0.29, NHW = 0.43

function proj(px: number, pz: number, W: number, H: number) {
  const nx = (px + 1) / 2
  const nz = (pz + 1) / 2
  const y = (HY + nx * (BY - HY)) * H
  const t = (y - HY * H) / ((BY - HY) * H)
  const hw = (FHW + t * (NHW - FHW)) * W
  const cx = W / 2
  const x = cx + (nz - 0.5) * hw * 2
  const sc = 0.35 + t * 0.65
  return { x, y, sc }
}

// ── Props ──────────────────────────────────────────────────────────
interface Props {
  playerA: H2HPlayer
  playerB: H2HPlayer
  teamA: H2HTeam
  teamB: H2HTeam
  frameA: FootballFrame
  frameB: FootballFrame
  ballX: number
  phase: string
  kind?: BeatKind
}

// ── Stadium drawing ────────────────────────────────────────────────
function drawStadium(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const hy = HY * H

  // Sky gradient
  const sg = ctx.createLinearGradient(0, 0, 0, hy)
  sg.addColorStop(0, '#0a0e1a')
  sg.addColorStop(1, '#0d1420')
  ctx.fillStyle = sg
  ctx.fillRect(0, 0, W, hy)

  // Crowd tiers
  const tiers = [
    { y0: hy * 0.15, y1: hy * 0.55, colors: ['#2a1830', '#1e1228', '#261520'] },
    { y0: hy * 0.55, y1: hy * 0.85, colors: ['#1c1425', '#221630', '#1a1020'] },
    { y0: hy * 0.85, y1: hy, colors: ['#141020', '#1a1228', '#161025'] },
  ]

  for (const tier of tiers) {
    const tg = ctx.createLinearGradient(0, tier.y0, 0, tier.y1)
    tg.addColorStop(0, tier.colors[0])
    tg.addColorStop(0.5, tier.colors[1])
    tg.addColorStop(1, tier.colors[2])
    ctx.fillStyle = tg
    ctx.fillRect(0, tier.y0, W, tier.y1 - tier.y0)

    // Crowd dots with Mexican wave
    const rows = Math.floor((tier.y1 - tier.y0) / 6)
    for (let r = 0; r < rows; r++) {
      const ry = tier.y0 + r * 6 + 3
      const cols = Math.floor(W / 5)
      for (let c = 0; c < cols; c++) {
        const cx = c * 5 + 2.5
        const wave = Math.sin((cx / W) * 6 + t * 0.0018 + r * 0.3) * 0.5 + 0.5
        const bob = Math.sin(t * 0.003 + c * 0.7 + r * 1.3) * 1.5 * wave
        const hue = (c * 37 + r * 53) % 360
        const bright = 0.3 + wave * 0.3
        ctx.fillStyle = `hsla(${hue}, 50%, ${bright * 100}%, 0.7)`
        ctx.fillRect(cx - 1.5, ry - 2.5 + bob, 3, 5)
      }
    }
  }

  // Floodlight glow
  for (const fx of [W * 0.18, W * 0.82]) {
    const fg = ctx.createRadialGradient(fx, 0, 0, fx, 0, hy * 1.5)
    fg.addColorStop(0, 'rgba(255,240,200,0.08)')
    fg.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = fg
    ctx.fillRect(0, 0, W, hy)
  }
}

function drawOuterGrass(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const hy = HY * H

  ctx.fillStyle = '#1a4a1a'
  ctx.beginPath()
  ctx.moveTo(0, hy); ctx.lineTo(W, hy)
  ctx.lineTo(W, H); ctx.lineTo(0, H)
  ctx.closePath(); ctx.fill()
}

function drawGrass(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const hy = HY * H, by = BY * H
  const lf = W * (0.5 - FHW), rf = W * (0.5 + FHW)
  const ln = W * (0.5 - NHW), rn = W * (0.5 + NHW)
  const N = 10

  for (let s = 0; s < N; s++) {
    const x0 = s / N, x1 = (s + 1) / N
    const fl = lf + x0 * (rf - lf), fr2 = lf + x1 * (rf - lf)
    const nl = ln + x0 * (rn - ln), nr2 = ln + x1 * (rn - ln)
    ctx.fillStyle = s % 2 === 0 ? '#226d22' : '#1e5e1e'
    ctx.beginPath()
    ctx.moveTo(fl, hy); ctx.lineTo(fr2, hy)
    ctx.lineTo(nr2, by); ctx.lineTo(nl, by)
    ctx.closePath(); ctx.fill()
  }

  // Stripe borders
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'
  ctx.lineWidth = 1
  for (let s = 0; s <= N; s++) {
    const x0 = s / N
    const fx = lf + x0 * (rf - lf)
    const nx = ln + x0 * (rn - ln)
    ctx.beginPath(); ctx.moveTo(fx, hy); ctx.lineTo(nx, by); ctx.stroke()
  }

  // Depth gradient
  const vg = ctx.createLinearGradient(0, hy, 0, by)
  vg.addColorStop(0, 'rgba(0,0,0,0.38)')
  vg.addColorStop(0.25, 'rgba(0,0,0,0.10)')
  vg.addColorStop(0.7, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(0,20,0,0.06)')
  ctx.fillStyle = vg
  ctx.beginPath()
  ctx.moveTo(lf, hy); ctx.lineTo(rf, hy); ctx.lineTo(rn, by); ctx.lineTo(ln, by)
  ctx.closePath(); ctx.fill()

  // Side vignette
  const eg = ctx.createLinearGradient(0, 0, W, 0)
  eg.addColorStop(0, 'rgba(0,0,0,0.45)')
  eg.addColorStop(0.06, 'rgba(0,0,0,0)')
  eg.addColorStop(0.94, 'rgba(0,0,0,0)')
  eg.addColorStop(1, 'rgba(0,0,0,0.45)')
  ctx.fillStyle = eg
  ctx.fillRect(0, hy, W, H - hy)
}

// ── Pitch lines ────────────────────────────────────────────────────
function pl(ctx: CanvasRenderingContext2D, W: number, H: number,
  x1: number, z1: number, x2: number, z2: number) {
  const a = proj(x1, z1, W, H), b = proj(x2, z2, W, H)
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
}

function drawLines(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.strokeStyle = 'rgba(255,255,255,0.88)'
  ctx.lineWidth = Math.max(1.5, W / 300)
  pl(ctx, W, H, -1,-1, 1,-1)
  pl(ctx, W, H, -1, 1, 1, 1)
  pl(ctx, W, H, -1,-1, -1, 1)
  pl(ctx, W, H, 1,-1, 1, 1)
  pl(ctx, W, H, 0,-1, 0, 1)
  pl(ctx, W, H, -1,-.46, -.64,-.46)
  pl(ctx, W, H, -1, .46, -.64, .46)
  pl(ctx, W, H, -.64,-.46, -.64, .46)
  pl(ctx, W, H, 1,-.46, .64,-.46)
  pl(ctx, W, H, 1, .46, .64, .46)
  pl(ctx, W, H, .64,-.46, .64, .46)
  pl(ctx, W, H, -1,-.20, -.86,-.20)
  pl(ctx, W, H, -1, .20, -.86, .20)
  pl(ctx, W, H, -.86,-.20, -.86, .20)
  pl(ctx, W, H, 1,-.20, .86,-.20)
  pl(ctx, W, H, 1, .20, .86, .20)
  pl(ctx, W, H, .86,-.20, .86, .20)
  // Center circle
  ctx.beginPath()
  for (let i = 0; i <= 56; i++) {
    const a = (i / 56) * Math.PI * 2
    const p = proj(Math.cos(a) * 0.155, Math.sin(a) * 0.30, W, H)
    i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
  }
  ctx.stroke()
  const cs = proj(0, 0, W, H)
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.beginPath(); ctx.arc(cs.x, cs.y, 2.5 * cs.sc, 0, Math.PI * 2); ctx.fill()
  const psL = proj(-0.80, 0, W, H)
  const psR = proj(0.80, 0, W, H)
  ctx.beginPath(); ctx.arc(psL.x, psL.y, 2 * psL.sc, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(psR.x, psR.y, 2 * psR.sc, 0, Math.PI * 2); ctx.fill()
}

// ── Goals ──────────────────────────────────────────────────────────
function drawGoals(ctx: CanvasRenderingContext2D, W: number, H: number, litLeft: boolean, litRight: boolean) {
  const GZ = 0.155, GD = 0.08

  for (const side of [-1, 1] as const) {
    const lit = side < 0 ? litLeft : litRight
    const ox = side, bx = side * (1 + GD)
    const fL = proj(ox, -GZ, W, H), fR = proj(ox, GZ, W, H)
    const bL = proj(bx, -GZ, W, H), bR = proj(bx, GZ, W, H)
    const scF = (fL.sc + fR.sc) / 2, scB = (bL.sc + bR.sc) / 2
    const GH = CANVAS_H * scF * 0.65, GHB = CANVAS_H * scB * 0.65
    const fLt = { x: fL.x, y: fL.y - GH }, fRt = { x: fR.x, y: fR.y - GH }
    const bLt = { x: bL.x, y: bL.y - GHB }, bRt = { x: bR.x, y: bR.y - GHB }

    const netFill = lit ? 'rgba(60,255,140,0.18)' : 'rgba(200,215,255,0.07)'
    const netStroke = lit ? 'rgba(100,255,170,0.30)' : 'rgba(200,200,220,0.18)'

    ctx.fillStyle = netFill
    // Back face
    ctx.beginPath(); ctx.moveTo(bLt.x, bLt.y); ctx.lineTo(bRt.x, bRt.y); ctx.lineTo(bR.x, bR.y); ctx.lineTo(bL.x, bL.y); ctx.closePath(); ctx.fill()
    // Left side
    ctx.beginPath(); ctx.moveTo(fLt.x, fLt.y); ctx.lineTo(bLt.x, bLt.y); ctx.lineTo(bL.x, bL.y); ctx.lineTo(fL.x, fL.y); ctx.closePath(); ctx.fill()
    // Right side
    ctx.beginPath(); ctx.moveTo(fRt.x, fRt.y); ctx.lineTo(bRt.x, bRt.y); ctx.lineTo(bR.x, bR.y); ctx.lineTo(fR.x, fR.y); ctx.closePath(); ctx.fill()
    // Top
    ctx.beginPath(); ctx.moveTo(fLt.x, fLt.y); ctx.lineTo(fRt.x, fRt.y); ctx.lineTo(bRt.x, bRt.y); ctx.lineTo(bLt.x, bLt.y); ctx.closePath(); ctx.fill()
    // Ground
    ctx.fillStyle = lit ? 'rgba(40,200,110,0.12)' : 'rgba(180,200,240,0.05)'
    ctx.beginPath(); ctx.moveTo(fL.x, fL.y); ctx.lineTo(fR.x, fR.y); ctx.lineTo(bR.x, bR.y); ctx.lineTo(bL.x, bL.y); ctx.closePath(); ctx.fill()

    // Net lines
    ctx.strokeStyle = netStroke; ctx.lineWidth = 0.8
    for (let n = 1; n < 3; n++) {
      const f = n / 3
      const mx = bL.x + (bR.x - bL.x) * f
      const myt = bLt.y + (bRt.y - bLt.y) * f
      const myb = bL.y + (bR.y - bL.y) * f
      ctx.beginPath(); ctx.moveTo(mx, myt); ctx.lineTo(mx, myb); ctx.stroke()
    }
    const hbLy = bL.y + (bLt.y - bL.y) * 0.5
    const hbRy = bR.y + (bRt.y - bR.y) * 0.5
    ctx.beginPath(); ctx.moveTo(bL.x, hbLy); ctx.lineTo(bR.x, hbRy); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(fLt.x, fLt.y); ctx.lineTo(bL.x, bL.y); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(fL.x, fL.y); ctx.lineTo(bLt.x, bLt.y); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(fRt.x, fRt.y); ctx.lineTo(bR.x, bR.y); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(fR.x, fR.y); ctx.lineTo(bRt.x, bRt.y); ctx.stroke()

    // Posts
    const postCol = lit ? '#90ffc0' : '#ffffff'
    ctx.lineCap = 'round'
    ctx.strokeStyle = postCol; ctx.lineWidth = Math.max(2.5, 3.5 * scF)
    ctx.beginPath(); ctx.moveTo(fL.x, fL.y); ctx.lineTo(fLt.x, fLt.y); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(fR.x, fR.y); ctx.lineTo(fRt.x, fRt.y); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(fLt.x, fLt.y); ctx.lineTo(fRt.x, fRt.y); ctx.stroke()

    // Back posts
    ctx.strokeStyle = lit ? 'rgba(120,255,180,0.65)' : 'rgba(200,210,240,0.55)'
    ctx.lineWidth = Math.max(1.5, 2 * scB)
    ctx.beginPath(); ctx.moveTo(bL.x, bL.y); ctx.lineTo(bLt.x, bLt.y); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(bR.x, bR.y); ctx.lineTo(bRt.x, bRt.y); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(bLt.x, bLt.y); ctx.lineTo(bRt.x, bRt.y); ctx.stroke()

    ctx.strokeStyle = lit ? 'rgba(100,255,165,0.60)' : 'rgba(200,205,235,0.50)'
    ctx.lineWidth = Math.max(1.5, 2 * scF)
    ctx.beginPath(); ctx.moveTo(fLt.x, fLt.y); ctx.lineTo(bLt.x, bLt.y); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(fRt.x, fRt.y); ctx.lineTo(bRt.x, bRt.y); ctx.stroke()

    ctx.strokeStyle = 'rgba(255,255,255,0.88)'; ctx.lineWidth = Math.max(1.5, W / 300)
    ctx.beginPath(); ctx.moveTo(fL.x, fL.y); ctx.lineTo(fR.x, fR.y); ctx.stroke()

    if (lit) {
      const cx = (fL.x + fR.x) / 2, cy = (fLt.y + fRt.y) / 2, r = GH * 2.2
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
      rg.addColorStop(0, 'rgba(60,255,140,0.38)')
      rg.addColorStop(0.5, 'rgba(30,200,100,0.14)')
      rg.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = rg
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
    }
  }
}

// ── Ball ───────────────────────────────────────────────────────────
function drawBallAt(ctx: CanvasRenderingContext2D, W: number, H: number,
  bx: number, bz: number, t: number, kind?: string) {
  const { x, y, sc } = proj(bx, bz, W, H)
  const spd = kind === 'shot' ? 0.018 : 0.008
  const bounce = Math.abs(Math.sin(t * spd)) * 10 * sc
  const r = 7.5 * sc

  ctx.fillStyle = 'rgba(0,0,0,0.32)'
  ctx.beginPath(); ctx.ellipse(x, y + 2, r * 1.4, r * 0.3, 0, 0, Math.PI * 2); ctx.fill()

  const by = y - bounce
  const bg = ctx.createRadialGradient(x - r * 0.3, by - r * 0.35, r * 0.05, x, by, r)
  bg.addColorStop(0, '#ffffff')
  bg.addColorStop(0.55, '#e4e4e4')
  bg.addColorStop(1, '#aaaaaa')
  ctx.fillStyle = bg
  ctx.beginPath(); ctx.arc(x, by, r, 0, Math.PI * 2); ctx.fill()

  ctx.fillStyle = '#1e1e1e'
  ctx.beginPath(); ctx.arc(x, by, r * 0.30, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 0.8
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + t * 0.004
    ctx.beginPath()
    ctx.moveTo(x + Math.cos(a) * r * 0.30, by + Math.sin(a) * r * 0.30)
    ctx.lineTo(x + Math.cos(a) * r * 0.85, by + Math.sin(a) * r * 0.85)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(255,255,255,0.60)'
  ctx.beginPath(); ctx.arc(x - r * 0.28, by - r * 0.30, r * 0.22, 0, Math.PI * 2); ctx.fill()
}

// ── Formation ──────────────────────────────────────────────────────
type Slot = [number, number]
function formation(isA: boolean, phase: string, bpx: number): Slot[] {
  const own = isA ? -1 : 1
  const gk: Slot = [own * 0.84, 0]
  const atk = isA ? (phase === 'attackA' || phase === 'goalA') : (phase === 'attackB' || phase === 'goalB')
  const def = isA ? (phase === 'attackB' || phase === 'goalB') : (phase === 'attackA' || phase === 'goalA')
  const dir = isA ? 1 : -1

  if (atk) {
    return [[bpx - dir * 0.06, 0.12], gk, [dir * 0.05, -0.62], [dir * 0.05, 0.64], [bpx - dir * 0.36, -0.30]]
  }
  if (def) {
    const px = isA
      ? Math.max(Math.min(bpx + 0.14, -0.22), -0.90)
      : Math.min(Math.max(bpx - 0.14, 0.22), 0.90)
    return [[own * 0.50, 0.10], gk, [px, -0.28], [own * 0.58, 0.52], [own * 0.40, -0.56]]
  }
  return [[own * 0.28, 0.10], gk, [own * 0.62, -0.56], [own * 0.62, 0.56], [own * 0.42, -0.10]]
}

const HAIR = ['#1A0A00', '#3e1a0c', '#8a6410', '#0e0520', '#2a1008']

// ── Wander (NPCs) ─────────────────────────────────────────────────
interface Wander { dx: number; dz: number; vx: number; vz: number; ph: number; spd: number }

// ── Component ─────────────────────────────────────────────────────
export default function PitchTopDown({
  playerA, playerB, teamA, teamB, frameA, frameB, ballX, phase, kind,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const stateRef = useRef({ ballX, frameA, frameB, phase, kind })
  const cacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map())
  const gkPhaseRef = useRef({ ph: '', t0: 0 })
  const animRef = useRef<{ A: AnimState; B: AnimState }>({
    A: { prev: 'idle', target: 'idle', t0: 0 },
    B: { prev: 'idle', target: 'idle', t0: 0 },
  })
  const wanderRef = useRef<Wander[]>(
    Array.from({ length: 9 }, () => ({
      dx: (Math.random() - 0.5) * 0.04,
      dz: (Math.random() - 0.5) * 0.04,
      vx: (Math.random() - 0.5) * 0.0004,
      vz: (Math.random() - 0.5) * 0.0004,
      ph: Math.random() * Math.PI * 2,
      spd: 0.7 + Math.random() * 0.7,
    }))
  )
  stateRef.current = { ballX, frameA, frameB, phase, kind }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const c = canvas
    let dpr = 1
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      const cssW = Math.round(c.offsetWidth) || 900
      const cssH = Math.round(c.offsetHeight) || 460
      c.width = cssW * dpr
      c.height = cssH * dpr
    }
    resize()
    const ro = new ResizeObserver(resize); ro.observe(c)

    loadSpriteSheet(() => cacheRef.current.clear())

    loadGkSheet()

    function sheetSprite(colors: PlayerColors, frame: string, fl: boolean): HTMLCanvasElement {
      const { img, m } = _sheet!
      const idx = m.frames[frame] ?? m.frames.idle ?? 0
      const sx = (idx % m.cols) * m.frameW
      const sy = Math.floor(idx / m.cols) * m.frameH
      const cv = document.createElement('canvas')
      cv.width = m.frameW; cv.height = m.frameH
      const cx = cv.getContext('2d')!
      cx.imageSmoothingEnabled = false
      cx.save()
      if (fl) { cx.translate(m.frameW, 0); cx.scale(-1, 1) }
      cx.drawImage(img, sx, sy, m.frameW, m.frameH, 0, 0, m.frameW, m.frameH)
      cx.restore()
      const tc = m.tint ? hexToRgb(colors.jersey) : null
      if (tc) {
        const id = cx.getImageData(0, 0, m.frameW, m.frameH)
        const d = id.data
        for (let p = 0; p < d.length; p += 4) {
          if (d[p + 3] < 8) continue
          const r = d[p], g = d[p + 1], b = d[p + 2]
          const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
          if (mx > 110 && mx - mn < 46) {
            const f = mx / 255
            d[p] = Math.round(tc[0] * f)
            d[p + 1] = Math.round(tc[1] * f)
            d[p + 2] = Math.round(tc[2] * f)
          }
        }
        cx.putImageData(id, 0, 0)
      }
      return cv
    }

    function sprite(colors: PlayerColors, frame: string, fl: boolean, hasBall: boolean): HTMLCanvasElement {
      const usingSheet = !!_sheet
      const key = `${usingSheet ? 'S' : 'P'}|${colors.jersey}|${colors.shorts}|${colors.hair ?? ''}|${frame}|${fl ? 1 : 0}|${hasBall ? 1 : 0}`
      if (!cacheRef.current.has(key)) {
        if (usingSheet) {
          cacheRef.current.set(key, sheetSprite(colors, frame, fl))
        } else {
          const sc = document.createElement('canvas')
          sc.width = CANVAS_W; sc.height = CANVAS_H
          const base = (frame.includes('fall') ? 'fall'
            : frame.includes('celebrate') ? 'celebrate'
            : frame.includes('shoot') ? 'shoot'
            : frame.startsWith('run') || frame.startsWith('dribble') ? 'run0'
            : 'idle') as FootballFrame
          drawFootballPlayer(sc.getContext('2d')!, base, colors, fl, hasBall)
          cacheRef.current.set(key, sc)
        }
      }
      return cacheRef.current.get(key)!
    }

    const colA: PlayerColors = { jersey: teamA.primaryColor, shorts: teamA.secondaryColor, socks: teamA.socksColor, boots: teamA.bootColor }
    const colB: PlayerColors = { jersey: teamB.primaryColor, shorts: teamB.secondaryColor, socks: teamB.socksColor, boots: teamB.bootColor }

    function npcColors(base: PlayerColors, slotIdx: number): PlayerColors {
      return { ...base, hair: HAIR[slotIdx % HAIR.length] }
    }

    function updateWander(w: Wander) {
      w.vx += (Math.random() - 0.5) * 0.00010
      w.vz += (Math.random() - 0.5) * 0.00010
      w.vx *= 0.994; w.vz *= 0.994
      const spd = Math.hypot(w.vx, w.vz)
      if (spd > 0.0009) { w.vx *= 0.0009 / spd; w.vz *= 0.0009 / spd }
      w.dx += w.vx; w.dz += w.vz
      if (Math.abs(w.dx) > 0.08) w.vx *= -1
      if (Math.abs(w.dz) > 0.06) w.vz *= -1
      w.ph += 0.045 * w.spd
    }

    function npcFrame(w: Wander, t: number): string {
      if (Math.hypot(w.vx, w.vz) < 0.0001) return 'idle'
      if (!_sheet) return Math.sin(w.ph) > 0 ? 'run0' : 'run1'
      return RUN_CYCLE[Math.floor(t * 0.0035 + w.ph * 2) % RUN_CYCLE.length]
    }

    function drawSprite(
      ctx: CanvasRenderingContext2D, W: number, H: number,
      colors: PlayerColors, frame: string, fl: boolean,
      px: number, pz: number,
      isAgent: boolean, hasBall: boolean, teamCol: string, t: number,
    ) {
      const { x, y, sc } = proj(px, pz, W, H)
      const sp = sprite(colors, frame, fl, hasBall)
      const mScale = _sheet?.m.scale ?? 1
      const sh = Math.max(CANVAS_H * 0.52, CANVAS_H * sc * 0.82) * mScale
      const sw = sh * (sp.width / sp.height)

      const ph = px * 7.3 + pz * 5.1
      let bob = 0
      const isRunM = frame.startsWith('run') || frame.startsWith('dribble')
      if (isRunM) {
        bob = Math.abs(Math.sin(t * 0.0065 + ph)) * sh * 0.045
      } else if (frame === 'idle') {
        bob = (Math.sin(t * 0.003 + ph) * 0.5 + 0.5) * sh * 0.010
      } else if (frame.includes('celebrate')) {
        bob = Math.abs(Math.sin(t * 0.007 + ph)) * sh * 0.085
      }
      const dw = sw, dh = sh

      const shadowK = 1 - (bob / sh) * 0.6
      ctx.fillStyle = `rgba(0,0,0,${0.30 * shadowK})`
      ctx.beginPath(); ctx.ellipse(x, y, sw * 0.36 * shadowK, sh * 0.055 * shadowK, 0, 0, Math.PI * 2); ctx.fill()

      ctx.imageSmoothingEnabled = false
      ctx.drawImage(sp, x - dw / 2, y - dh - bob, dw, dh)

      if (isAgent) {
        const ty = y - dh - bob - 10 * sc + Math.sin(t * 0.0052) * 4.5 * sc
        const ts = 9 * sc
        ctx.fillStyle = teamCol
        ctx.beginPath(); ctx.moveTo(x, ty + ts); ctx.lineTo(x - ts, ty); ctx.lineTo(x + ts, ty); ctx.closePath(); ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.80)'; ctx.lineWidth = 1.2; ctx.stroke()
      }
    }

    const refColors: PlayerColors = { jersey: '#111111', shorts: '#111111', socks: '#111111', boots: '#FFD700', hair: '#1a0800' }

    function render(t: number) {
      const ctx = c.getContext('2d'); if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const W = c.width / dpr, H = c.height / dpr
      const { ballX: bx, frameA: fA, frameB: fB, phase: ph, kind: kd } = stateRef.current

      if (gkPhaseRef.current.ph !== ph) { gkPhaseRef.current.ph = ph; gkPhaseRef.current.t0 = t }
      const concedeMs = t - gkPhaseRef.current.t0

      drawStadium(ctx, W, H, t)
      drawOuterGrass(ctx, W, H)
      drawGrass(ctx, W, H)
      drawLines(ctx, W, H)

      drawGoals(ctx, W, H, ph === 'goalB', ph === 'goalA')

      const slotsA = formation(true, ph, bx)
      const slotsB = formation(false, ph, bx)

      for (let i = 0; i < 9; i++) updateWander(wanderRef.current[i])

      type D = { pz: number; fn: () => void }
      const draws: D[] = []

      const agentAAtk = ph === 'attackA' || ph === 'goalA'
      const agentBAtk = ph === 'attackB' || ph === 'goalB'

      const gkScale = _sheet?.m.scale ?? 1
      slotsA.forEach((s, i) => {
        const isAg = i === 0, isGk = i === 1
        const w = isAg ? null : wanderRef.current[i - 1]
        const wk = isGk ? 0.25 : 1
        const spx = s[0] + (w ? w.dx * wk : 0)
        const spz = s[1] + (w ? w.dz * wk : 0)
        if (isGk && _gk) {
          const key = gkKey(true, ph, kd, concedeMs, t)
          draws.push({ pz: spz, fn: () => {
            const p = proj(spx, spz, W, H)
            const idleH = Math.max(CANVAS_H * 0.52, CANVAS_H * p.sc * 0.82) * gkScale
            drawGkSheet(ctx, p.x, p.y, idleH, 1, key)
          } })
          return
        }
        const fr = isAg ? agentFrame(animRef.current.A, fA, t, !!_sheet) : (w ? npcFrame(w, t) : 'idle')
        const hasBall = isAg && agentAAtk
        const col = isAg ? { ...colA } : npcColors(colA, i)
        draws.push({ pz: spz, fn: () => drawSprite(ctx, W, H, col, fr, false, spx, spz, isAg && agentAAtk, hasBall, teamA.primaryColor, t) })
      })

      slotsB.forEach((s, i) => {
        const isAg = i === 0, isGk = i === 1
        const w = isAg ? null : wanderRef.current[4 + i - 1]
        const wk = isGk ? 0.25 : 1
        const spx = s[0] + (w ? w.dx * wk : 0)
        const spz = s[1] + (w ? w.dz * wk : 0)
        if (isGk && _gk) {
          const key = gkKey(false, ph, kd, concedeMs, t)
          draws.push({ pz: spz, fn: () => {
            const p = proj(spx, spz, W, H)
            const idleH = Math.max(CANVAS_H * 0.52, CANVAS_H * p.sc * 0.82) * gkScale
            drawGkSheet(ctx, p.x, p.y, idleH, -1, key)
          } })
          return
        }
        const fr = isAg ? agentFrame(animRef.current.B, fB, t, !!_sheet) : (w ? npcFrame(w, t) : 'idle')
        const hasBall = isAg && agentBAtk
        const col = isAg ? { ...colB } : npcColors(colB, i)
        draws.push({ pz: spz, fn: () => drawSprite(ctx, W, H, col, fr, true, spx, spz, isAg && agentBAtk, hasBall, teamB.primaryColor, t) })
      })

      // Referee
      const rw = wanderRef.current[8]
      const refPX = bx * 0.28 + rw.dx + Math.sin(t * 0.0009) * 0.06
      const refPZ = 0.22 + rw.dz + Math.sin(t * 0.0007) * 0.04
      const refFr = npcFrame(rw, t)
      draws.push({ pz: refPZ, fn: () => drawSprite(ctx, W, H, refColors, refFr, bx < 0, refPX, refPZ, false, false, '#FFD700', t) })

      const bz = Math.sin(t * 0.0013) * 0.08 + 0.12
      draws.push({ pz: bz, fn: () => drawBallAt(ctx, W, H, bx, bz, t, kd) })

      draws.sort((a, b) => a.pz - b.pz)
      draws.forEach(d => d.fn())

      // Shot / Goal VFX
      if (kd === 'shot' || ph === 'goalA' || ph === 'goalB') {
        const goalSide = ph === 'goalA' ? -1 : ph === 'goalB' ? 1 : (bx > 0 ? 1 : -1)
        const { x: gx, y: gy } = proj(goalSide, 0, W, H)
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.025)
        const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, W * 0.28)
        const isGoal = ph === 'goalA' || ph === 'goalB'
        glow.addColorStop(0, isGoal ? `rgba(255,215,0,${0.22 + pulse * 0.12})` : 'rgba(255,140,0,0.14)')
        glow.addColorStop(0.5, isGoal ? `rgba(255,180,0,${0.07 + pulse * 0.05})` : 'rgba(255,100,0,0.04)')
        glow.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H)

        if (kd === 'shot') {
          const { x: bsx, y: bsy } = proj(bx, bz, W, H)
          const trailLen = 5
          for (let i = trailLen; i >= 1; i--) {
            const tx = bsx + (gx - bsx) * (i / (trailLen * 4))
            const ty = bsy + (gy - bsy) * (i / (trailLen * 4))
            ctx.fillStyle = `rgba(255,255,255,${0.06 * (trailLen - i + 1)})`
            ctx.beginPath(); ctx.arc(tx, ty, 5 * (1 - i / (trailLen + 1)), 0, Math.PI * 2); ctx.fill()
          }
        }

        if (isGoal) {
          const edge = ctx.createRadialGradient(W/2, H/2, H * 0.3, W/2, H/2, W * 0.8)
          edge.addColorStop(0, 'rgba(0,0,0,0)')
          edge.addColorStop(1, `rgba(255,215,0,${0.18 * pulse})`)
          ctx.fillStyle = edge; ctx.fillRect(0, 0, W, H)
        }
      }

      rafRef.current = requestAnimationFrame(render)
    }

    rafRef.current = requestAnimationFrame(render)
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect() }
  }, [playerA.id, playerB.id, teamA.code, teamB.code])

  return (
    <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
  )
}
