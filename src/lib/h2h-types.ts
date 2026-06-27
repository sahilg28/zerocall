export interface H2HPlayer {
  id: string
  name: string
  shortName: string
  position: 'FWD' | 'MID' | 'DEF'
  pace: number
  shooting: number
  dribbling: number
  passing: number
  physical: number
  overall: number
  isStar: boolean
  specialMove: string
  specialDesc: string
}

export interface H2HTeam {
  code: string
  name: string
  flag: string
  primaryColor: string
  secondaryColor: string
  socksColor: string
  bootColor: string
}

export type MatchAction = 'dribble' | 'shoot' | 'special' | 'through_ball'

export interface MatchPlay {
  playerId: string
  action: MatchAction
  success: boolean
  isGoal: boolean
  label: string
  isCrit: boolean
}

export interface MatchPossession {
  possession: number
  attackerId: string
  plays: MatchPlay[]
  scored: boolean
  narrative?: string
}

export type BeatKind =
  | 'receive'
  | 'carry'
  | 'dribble'
  | 'dribble_fail'
  | 'special_windup'
  | 'buildup'
  | 'shot'
  | 'goal'
  | 'miss'
  | 'save'

export interface MatchBeat {
  kind: BeatKind
  durationMs: number
  prog: number
  frame: import('./pixel-football').FootballFrame
  goalChance: number
  label: string
  defenderBeaten?: boolean
  shake?: boolean
}

export interface H2HMatchResult {
  id: string
  playerA: H2HPlayer
  playerB: H2HPlayer
  teamA: H2HTeam
  teamB: H2HTeam
  possessions: MatchPossession[]
  scoreA: number
  scoreB: number
  winnerId: string
  createdAt: number
}
