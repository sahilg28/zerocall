// ISS-style 16-bit pixel art football players
// 14 × 20 "macro-pixels" at P=5 → 70×100 native canvas
// Key ISS look: black 1-px outline around EVERY color block

export type FootballFrame = 'idle' | 'run0' | 'run1' | 'dribble0' | 'dribble1' | 'shoot' | 'celebrate' | 'fall'

export interface PlayerColors {
  jersey: string
  shorts: string
  socks: string
  boots: string
  hair?: string
}

export const CANVAS_W = 70   // 14 cols × P=5
export const CANVAS_H = 100  // 20 rows × P=5
const P = 5

function hexRgb(hex: string): [number, number, number] | null {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return null
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)]
}
function adj(hex: string, n: number): string {
  const rgb = hexRgb(hex); if (!rgb) return hex
  const [r,g,b] = rgb.map(c => Math.max(0, Math.min(255, c + n)))
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
}

function px(
  ctx: CanvasRenderingContext2D,
  ox: number, oy: number,
  color: string,
  w = 1, h = 1,
) {
  ctx.fillStyle = '#060606'
  ctx.fillRect(ox * P - 1, oy * P - 1, w * P + 2, h * P + 2)
  ctx.fillStyle = color
  ctx.fillRect(ox * P, oy * P, w * P, h * P)
}

function f(ctx: CanvasRenderingContext2D, ox: number, oy: number, color: string, w = 1, h = 1) {
  ctx.fillStyle = color
  ctx.fillRect(ox * P, oy * P, w * P, h * P)
}

function drawBall(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  const cx = (ox + 0.5) * P, cy = (oy + 0.5) * P, r = P * 1.1
  ctx.fillStyle = '#050505'
  ctx.beginPath(); ctx.arc(cx, cy, r + 1, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#f0f0f0'
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#1a1a1a'
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.33, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#333'; ctx.lineWidth = 0.7
  for (let i = 0; i < 5; i++) {
    const a = (i/5)*Math.PI*2
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(a)*r*0.33, cy + Math.sin(a)*r*0.33)
    ctx.lineTo(cx + Math.cos(a)*r*0.88, cy + Math.sin(a)*r*0.88)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(255,255,255,0.65)'
  ctx.beginPath(); ctx.arc(cx - r*0.28, cy - r*0.28, r*0.22, 0, Math.PI*2); ctx.fill()
}

export function drawFootballPlayer(
  ctx: CanvasRenderingContext2D,
  frame: FootballFrame,
  colors: PlayerColors,
  facingLeft = false,
  hasBall = false,
) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

  if (facingLeft) { ctx.save(); ctx.scale(-1,1); ctx.translate(-CANVAS_W, 0) }

  const sk  = '#F4C27A'
  const skD = '#D4944A'
  const skH = '#FFD9A0'
  const hr  = colors.hair ?? '#1A0A00'
  const hrH = adj(hr, 60)
  const J   = colors.jersey
  const JH  = adj(J, 75)
  const JD  = adj(J, -50)
  const S   = colors.shorts
  const SH  = adj(S, 45)
  const K   = colors.socks
  const KH  = adj(K, 55)
  const Bo  = colors.boots
  const BoH = adj(Bo, 65)

  if (frame === 'fall') {
    ctx.save(); ctx.translate(0, CANVAS_H/2); ctx.rotate(-Math.PI/2)
    ctx.translate(-CANVAS_H/2, -CANVAS_W/2)
    px(ctx, 0, 5, hr, 3, 3)
    px(ctx, 3, 4, sk, 4, 4)
    f(ctx, 3, 5, '#1a1a2e', 1, 1); f(ctx, 5, 5, '#1a1a2e', 1, 1)
    px(ctx, 7, 4, JH, 4, 2)
    px(ctx, 7, 6, J,  4, 3)
    px(ctx, 11, 4, S, 3, 3)
    px(ctx, 14, 5, K, 2, 2)
    px(ctx, 16, 4, Bo, 3, 3)
    ctx.restore()
    if (facingLeft) ctx.restore()
    return
  }

  ctx.fillStyle = 'rgba(0,0,0,0.22)'
  ctx.beginPath()
  ctx.ellipse(CANVAS_W/2, CANVAS_H - P*0.4, P*4, P*0.5, 0, 0, Math.PI*2)
  ctx.fill()

  px(ctx, 4, 0, hr, 6, 1)
  px(ctx, 3, 1, hr, 8, 2)
  f(ctx, 2, 1, adj(hr, -15), 2, 1)
  f(ctx, 10, 1, adj(hr, -15), 2, 1)
  f(ctx, 4, 2, hr, 6, 1)
  f(ctx, 4, 0, hrH, 4, 1)

  px(ctx, 2, 2, sk, 10, 5)
  f(ctx, 2, 2, skD, 10, 1)
  f(ctx, 11, 3, skH, 1, 3)
  f(ctx, 3, 3, '#5a2e0a', 4, 1)
  f(ctx, 8, 3, '#5a2e0a', 3, 1)
  px(ctx, 3, 4, '#0f0f20', 3, 2)
  px(ctx, 8, 4, '#0f0f20', 3, 2)
  f(ctx, 3, 4, '#dde0ff', 2, 1)
  f(ctx, 8, 4, '#dde0ff', 2, 1)
  f(ctx, 4, 4, '#111', 1, 1)
  f(ctx, 9, 4, '#111', 1, 1)
  f(ctx, 5, 4, 'rgba(255,255,255,0.5)', 1, 1)
  f(ctx, 10, 4, 'rgba(255,255,255,0.5)', 1, 1)
  f(ctx, 5, 5, skD, 1, 1)
  f(ctx, 8, 5, skD, 1, 1)
  f(ctx, 4, 6, '#5a1a0a', 6, 1)
  f(ctx, 5, 6, '#C06040', 4, 1)
  px(ctx, 1, 3, skD, 1, 3)
  px(ctx, 12, 3, skD, 1, 3)
  f(ctx, 4, 7, skD, 6, 1)

  px(ctx, 5, 7, sk, 4, 1)
  f(ctx, 5, 7, skD, 1, 1)

  px(ctx, 2, 8, JH, 10, 2)
  px(ctx, 2, 10, J, 10, 2)
  px(ctx, 2, 12, JD, 10, 1)
  f(ctx, 5, 8, '#fff', 4, 1)
  f(ctx, 5, 8, JD, 4, 1)
  f(ctx, 6, 9, JH, 2, 3)

  if (frame === 'celebrate') {
    px(ctx, 0, 4, J, 2, 4);  f(ctx, 0, 4, sk, 2, 2)
    px(ctx, 12, 4, J, 2, 4); f(ctx, 12, 4, sk, 2, 2)
  } else if (frame === 'shoot') {
    px(ctx, 0, 10, J, 2, 3); f(ctx, 0, 12, sk, 2, 1)
    px(ctx, 12, 9, J, 2, 3); f(ctx, 12, 11, sk, 2, 1)
  } else if (frame === 'run0') {
    px(ctx, 0, 11, J, 2, 2); f(ctx, 0, 12, sk, 2, 1)
    px(ctx, 12, 9, J, 2, 2); f(ctx, 12, 10, sk, 2, 1)
  } else if (frame === 'run1') {
    px(ctx, 0, 9, J, 2, 2);  f(ctx, 0, 10, sk, 2, 1)
    px(ctx, 12, 11, J, 2, 2); f(ctx, 12, 12, sk, 2, 1)
  } else {
    px(ctx, 0, 9, J, 2, 3);  f(ctx, 0, 11, sk, 2, 1)
    px(ctx, 12, 9, J, 2, 3); f(ctx, 12, 11, sk, 2, 1)
  }

  px(ctx, 3, 13, SH, 8, 1)
  px(ctx, 3, 14, S, 8, 1)
  f(ctx, 3, 13, JD, 1, 2); f(ctx, 10, 13, JD, 1, 2)

  switch (frame) {
    case 'idle':
      px(ctx, 3, 15, K, 2, 3); f(ctx, 3, 15, KH, 2, 1)
      px(ctx, 2, 18, Bo, 4, 2); f(ctx, 2, 18, BoH, 4, 1); f(ctx, 4, 18, '#fff', 1, 1)
      px(ctx, 9, 15, K, 2, 3); f(ctx, 9, 15, KH, 2, 1)
      px(ctx, 8, 18, Bo, 4, 2); f(ctx, 8, 18, BoH, 4, 1); f(ctx, 10, 18, '#fff', 1, 1)
      if (hasBall) drawBall(ctx, 6, 17)
      break

    case 'run0':
      px(ctx, 9, 14, K, 2, 2); f(ctx, 9, 14, KH, 2, 1)
      px(ctx, 10, 16, K, 2, 2)
      px(ctx, 10, 18, Bo, 4, 2); f(ctx, 10, 18, BoH, 4, 1)
      px(ctx, 3, 14, K, 2, 1)
      px(ctx, 2, 15, K, 2, 2)
      px(ctx, 1, 13, Bo, 3, 2); f(ctx, 1, 13, BoH, 3, 1)
      if (hasBall) drawBall(ctx, 9, 17)
      break

    case 'run1':
      px(ctx, 3, 14, K, 2, 2); f(ctx, 3, 14, KH, 2, 1)
      px(ctx, 2, 16, K, 2, 2)
      px(ctx, 2, 18, Bo, 4, 2); f(ctx, 2, 18, BoH, 4, 1)
      px(ctx, 9, 14, K, 2, 1)
      px(ctx, 10, 15, K, 2, 2)
      px(ctx, 10, 13, Bo, 3, 2); f(ctx, 10, 13, BoH, 3, 1)
      if (hasBall) drawBall(ctx, 3, 17)
      break

    case 'dribble0':
      px(ctx, 2, 15, K, 2, 3); f(ctx, 2, 15, KH, 2, 1)
      px(ctx, 10, 15, K, 2, 3); f(ctx, 10, 15, KH, 2, 1)
      px(ctx, 1, 18, Bo, 5, 2); f(ctx, 1, 18, BoH, 5, 1)
      px(ctx, 8, 18, Bo, 5, 2); f(ctx, 8, 18, BoH, 5, 1)
      if (hasBall) drawBall(ctx, 5, 17)
      break

    case 'dribble1':
      px(ctx, 3, 15, K, 2, 3); f(ctx, 3, 15, KH, 2, 1)
      px(ctx, 9, 15, K, 2, 3); f(ctx, 9, 15, KH, 2, 1)
      px(ctx, 2, 18, Bo, 5, 2); f(ctx, 2, 18, BoH, 5, 1)
      px(ctx, 7, 18, Bo, 5, 2); f(ctx, 7, 18, BoH, 5, 1)
      if (hasBall) drawBall(ctx, 6, 17)
      break

    case 'shoot':
      px(ctx, 3, 15, K, 2, 3); f(ctx, 3, 15, KH, 2, 1)
      px(ctx, 2, 18, Bo, 4, 2); f(ctx, 2, 18, BoH, 4, 1)
      px(ctx, 8, 14, K, 2, 2)
      px(ctx, 9, 12, K, 2, 2)
      px(ctx, 10, 10, K, 2, 2)
      px(ctx, 11, 8, Bo, 3, 2); f(ctx, 11, 8, BoH, 3, 1)
      break

    case 'celebrate':
      px(ctx, 2, 15, K, 2, 3); f(ctx, 2, 15, KH, 2, 1)
      px(ctx, 10, 15, K, 2, 3); f(ctx, 10, 15, KH, 2, 1)
      px(ctx, 1, 18, Bo, 4, 2); f(ctx, 1, 18, BoH, 4, 1)
      px(ctx, 9, 18, Bo, 4, 2); f(ctx, 9, 18, BoH, 4, 1)
      break
  }

  if (facingLeft) ctx.restore()
}

export const PORTRAIT_W = 64
export const PORTRAIT_H = 64
const PP = 4

export function drawPortrait(ctx: CanvasRenderingContext2D, colors: PlayerColors): void {
  ctx.clearRect(0, 0, PORTRAIT_W, PORTRAIT_H)
  const fp = (x: number, y: number, color: string, w = 1, h = 1) => {
    ctx.fillStyle = '#060606'
    ctx.fillRect(x*PP-1, y*PP-1, w*PP+2, h*PP+2)
    ctx.fillStyle = color
    ctx.fillRect(x*PP, y*PP, w*PP, h*PP)
  }
  const ff = (x: number, y: number, color: string, w = 1, h = 1) => {
    ctx.fillStyle = color; ctx.fillRect(x*PP, y*PP, w*PP, h*PP)
  }
  const sk = '#F4C27A'; const skD = '#D4944A'
  const hr = colors.hair ?? '#1A0A00'; const hrH = adj(hr, 60)
  const J = colors.jersey; const JH = adj(J, 75); const JD = adj(J, -40)
  const rgb = hexRgb(J)
  ctx.fillStyle = rgb ? `rgb(${Math.round(rgb[0]*0.15)},${Math.round(rgb[1]*0.15)},${Math.round(rgb[2]*0.15)})` : '#080810'
  ctx.fillRect(0, 0, PORTRAIT_W, PORTRAIT_H)
  fp(2, 0, hr, 12, 1); fp(1, 1, hr, 14, 2); ff(2, 1, hrH, 5, 1)
  fp(1, 3, sk, 14, 9)
  ff(1, 3, skD, 14, 1); ff(1, 4, skD, 1, 7); ff(14, 4, skD, 1, 7)
  ff(3, 4, '#3a1e08', 4, 1); ff(9, 4, '#3a1e08', 4, 1)
  ff(3, 5, '#0f0f20', 3, 2); ff(3, 5, '#dde0ff', 2, 1); ff(4, 5, '#111', 1, 1)
  ff(10, 5, '#0f0f20', 3, 2); ff(10, 5, '#dde0ff', 2, 1); ff(11, 5, '#111', 1, 1)
  ff(7, 7, skD, 2, 1); ff(6, 9, skD, 1, 1); ff(9, 9, skD, 1, 1)
  ff(5, 10, '#7A2818', 6, 1); ff(6, 10, '#CC7755', 4, 1)
  ff(6, 12, sk, 4, 1)
  fp(0, 13, JH, 16, 1); fp(0, 14, J, 16, 1); fp(0, 15, JD, 16, 1)
  ff(5, 13, '#fff', 6, 1); ff(5, 13, J, 6, 1)
}

export function buildPlayerTexture(
  colors: PlayerColors,
  frame: FootballFrame,
  facingLeft = false,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_W; canvas.height = CANVAS_H
  drawFootballPlayer(canvas.getContext('2d')!, frame, colors, facingLeft)
  return canvas
}

export function hexToRgb(hex: string): [number, number, number] {
  const rgb = hexRgb(hex)
  return rgb || [200, 200, 200]
}
