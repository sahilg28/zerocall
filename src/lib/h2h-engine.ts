import type { H2HPlayer, H2HTeam, MatchAction, MatchPlay, MatchPossession, H2HMatchResult, MatchBeat } from './h2h-types'

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function roll() {
  return Math.random() * 100
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

const DRIBBLE_LABELS = [
  'weaves past the defender',
  'dances through the pressure',
  'nutmegs the opposing player',
  'bursts past with a shoulder drop',
  'rides the challenge and drives forward',
]
const DRIBBLE_FAIL = [
  'loses the ball under pressure',
  'stumbles and the defense clears',
  'the tackle catches the boot',
  'slips and the chance is gone',
]
const SHOOT_LABELS = [
  'rifles a low drive to the corner',
  'curls it toward the far post',
  'drives it hard and low',
  'places it perfectly into the side-netting',
]
const SHOOT_MISS = [
  'blazes it over the bar',
  'hits the post — so close!',
  'fires wide under pressure',
  'drills it straight at the keeper',
]

function pickFrom<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function resolvePossession(
  attacker: H2HPlayer,
  possession: number,
  specialUsed: boolean,
  mod = 0,
): MatchPossession {
  const plays: MatchPlay[] = []
  let scored = false

  const useSpecial = !specialUsed && Math.random() < 0.25

  if (useSpecial) {
    const goalChance = clamp((attacker.shooting * 0.75 + attacker.dribbling * 0.25) / 99, 0, 1)
    const isGoal = roll() < clamp(goalChance * 90 + mod, 0, 96)

    plays.push({
      playerId: attacker.id,
      action: 'special',
      success: isGoal,
      isGoal,
      isCrit: isGoal,
      label: isGoal
        ? `${attacker.shortName} — ${attacker.specialMove}! ${attacker.specialDesc} GOAL!`
        : `${attacker.shortName} tries the ${attacker.specialMove} but the keeper stretches to save!`,
    })
    scored = isGoal
  } else {
    const goesDirect = Math.random() < 0.25

    if (!goesDirect) {
      const dribbleChance = clamp((attacker.dribbling * 0.6 + attacker.pace * 0.4) / 99, 0, 1)
      const dribbleSuccess = roll() < dribbleChance * 88

      plays.push({
        playerId: attacker.id,
        action: 'dribble',
        success: dribbleSuccess,
        isGoal: false,
        isCrit: false,
        label: dribbleSuccess
          ? `${attacker.shortName} ${pickFrom(DRIBBLE_LABELS)}`
          : `${attacker.shortName} ${pickFrom(DRIBBLE_FAIL)}`,
      })

      if (!dribbleSuccess) {
        return { possession, attackerId: attacker.id, plays, scored: false }
      }
    }

    const dribbleBonus = !goesDirect ? 12 : 0
    const paceBonus = (attacker.pace - 75) * 0.2
    const goalChancePct = clamp(
      attacker.shooting * 0.65 + dribbleBonus + paceBonus + mod,
      0,
      92
    )
    const isCrit = Math.random() < 0.12
    const isGoal = roll() < goalChancePct * (isCrit ? 1.35 : 1)

    plays.push({
      playerId: attacker.id,
      action: 'shoot',
      success: isGoal,
      isGoal,
      isCrit,
      label: isGoal
        ? `${attacker.shortName} ${pickFrom(SHOOT_LABELS)}${isCrit ? ' — WORLDIE!' : '!'}`
        : `${attacker.shortName} ${pickFrom(SHOOT_MISS)}`,
    })
    scored = isGoal
  }

  return { possession, attackerId: attacker.id, plays, scored }
}

export type Tactic = 'attack' | 'balanced' | 'defense'

function atkBonus(t?: Tactic) { return t === 'attack' ? 8 : t === 'defense' ? -5 : 0 }
function concede(t?: Tactic) { return t === 'attack' ? 6 : t === 'defense' ? -8 : 0 }

export interface MatchOpts { tacticA?: Tactic; tacticB?: Tactic }

export function runMatch(
  playerA: H2HPlayer, teamA: H2HTeam,
  playerB: H2HPlayer, teamB: H2HTeam,
  opts: MatchOpts = {},
): H2HMatchResult {
  const POSSESSIONS = 5

  const modA = atkBonus(opts.tacticA) + concede(opts.tacticB)
  const modB = atkBonus(opts.tacticB) + concede(opts.tacticA)

  const possessions: MatchPossession[] = []
  let scoreA = 0
  let scoreB = 0
  let specialUsedA = false
  let specialUsedB = false

  for (let i = 0; i < POSSESSIONS; i++) {
    const posA = resolvePossession(playerA, i * 2 + 1, specialUsedA, modA)
    if (posA.plays.find(p => p.action === 'special')) specialUsedA = true
    if (posA.scored) scoreA++
    possessions.push(posA)

    const posB = resolvePossession(playerB, i * 2 + 2, specialUsedB, modB)
    if (posB.plays.find(p => p.action === 'special')) specialUsedB = true
    if (posB.scored) scoreB++
    possessions.push(posB)
  }

  if (scoreA === scoreB) {
    let etRound = 0
    while (scoreA === scoreB && etRound < 5) {
      etRound++
      const etA = resolvePossession(playerA, 99, specialUsedA)
      if (etA.scored) { scoreA++; possessions.push(etA); break }
      possessions.push(etA)
      const etB = resolvePossession(playerB, 99, specialUsedB)
      if (etB.scored) { scoreB++; possessions.push(etB); break }
      possessions.push(etB)
    }
    if (scoreA === scoreB) {
      if (playerA.overall >= playerB.overall) scoreA++
      else scoreB++
    }
  }

  const winnerId = scoreA > scoreB ? playerA.id : playerB.id

  return {
    id: crypto.randomUUID(),
    playerA, playerB, teamA, teamB,
    possessions, scoreA, scoreB,
    winnerId,
    createdAt: Date.now(),
  }
}

const BUILDUP_LABELS = [
  'picks it up and drives forward',
  'carries it out of midfield',
  'surges into space',
  'pushes the tempo, eyes up the box',
]

export function buildAttackTimeline(
  possession: MatchPossession,
  attacker: H2HPlayer,
): MatchBeat[] {
  const beats: MatchBeat[] = []
  const name = attacker.shortName

  const dribblePlay = possession.plays.find(p => p.action === 'dribble')
  const specialPlay = possession.plays.find(p => p.action === 'special')
  const shotPlay = possession.plays.find(p => p.action === 'shoot' || p.action === 'special')
  const scored = possession.scored

  const finishing = (attacker.shooting * 0.7 + attacker.dribbling * 0.3)
  const startChance = clamp(finishing * 0.22, 6, 26)
  const peakChance = scored
    ? clamp(rand(60, 86) + (finishing - 80) * 0.4, 55, 94)
    : clamp(rand(26, 50) + (finishing - 80) * 0.3, 14, 58)

  beats.push({
    kind: 'receive', durationMs: 520, prog: 0.12, frame: 'run0',
    goalChance: startChance, label: `${name} ${pickFrom(BUILDUP_LABELS)}`,
  })

  beats.push({
    kind: 'carry', durationMs: 480, prog: 0.32, frame: 'run1',
    goalChance: startChance + 7, label: `${name} drives at the defense`,
  })

  if (specialPlay) {
    beats.push({
      kind: 'carry', durationMs: 440, prog: 0.5, frame: 'run0',
      goalChance: startChance + 16, label: `${name} finds a yard of space`,
    })
    beats.push({
      kind: 'special_windup', durationMs: 620, prog: 0.7, frame: 'dribble0',
      goalChance: Math.min(peakChance + 6, 96),
      label: `${name} winds up the ${attacker.specialMove}!`,
      defenderBeaten: true, shake: true,
    })
    beats.push({
      kind: 'shot', durationMs: 560, prog: 0.9, frame: 'shoot',
      goalChance: Math.min(peakChance + 6, 96),
      label: `${attacker.specialMove}! ${attacker.specialDesc}`, shake: true,
    })
  } else {
    beats.push({
      kind: 'carry', durationMs: 460, prog: 0.48, frame: 'run0',
      goalChance: startChance + 13, label: `${name} into the final third`,
    })

    if (dribblePlay && dribblePlay.success) {
      beats.push({
        kind: 'dribble', durationMs: 480, prog: 0.6, frame: 'dribble0',
        goalChance: startChance + 18, label: `${name} faces up the last man...`,
      })
      beats.push({
        kind: 'dribble', durationMs: 460, prog: 0.74, frame: 'dribble1',
        goalChance: peakChance - 10, label: dribblePlay.label,
        defenderBeaten: true, shake: true,
      })
    } else if (dribblePlay && !dribblePlay.success) {
      beats.push({
        kind: 'dribble', durationMs: 460, prog: 0.58, frame: 'dribble0',
        goalChance: startChance + 14, label: `${name} tries to beat his man...`,
      })
      beats.push({
        kind: 'dribble_fail', durationMs: 900, prog: 0.5, frame: 'idle',
        goalChance: 0, label: dribblePlay.label, shake: true,
      })
      return beats
    }

    beats.push({
      kind: 'buildup', durationMs: 440, prog: 0.85, frame: 'run1',
      goalChance: peakChance - 4, label: `${name} shapes to shoot`,
    })
    beats.push({
      kind: 'shot', durationMs: 540, prog: 0.93, frame: 'shoot',
      goalChance: peakChance, label: shotPlay?.label ?? `${name} shoots!`, shake: true,
    })
  }

  if (scored) {
    beats.push({
      kind: 'goal', durationMs: 1500, prog: 1, frame: 'celebrate',
      goalChance: 100, label: `GOAL! ${name} finds the net!`, shake: true,
    })
  } else {
    const saved = Math.random() < 0.5
    beats.push({
      kind: saved ? 'save' : 'miss', durationMs: 1000, prog: 0.98, frame: 'idle',
      goalChance: 0,
      label: saved ? `Saved! The keeper denies ${name}!` : `${name} can't convert — wide!`,
      shake: true,
    })
  }

  return beats
}

export function timelineDuration(beats: MatchBeat[]): number {
  return beats.reduce((s, b) => s + b.durationMs, 0)
}
