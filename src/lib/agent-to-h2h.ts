import type { AgentStats } from './match-engine'
import type { H2HPlayer, H2HTeam } from './h2h-types'

interface AgentTheme {
  primaryColor: string
  secondaryColor: string
  socksColor: string
  bootColor: string
  specialMove: string
  specialDesc: string
}

const AGENT_THEMES: Record<string, AgentTheme> = {
  vega: {
    primaryColor: '#00e5ff',
    secondaryColor: '#001a33',
    socksColor: '#00b8d4',
    bootColor: '#222222',
    specialMove: 'Star Weave',
    specialDesc: 'Phases through the defense with quantum precision',
  },
  ronin: {
    primaryColor: '#ff1744',
    secondaryColor: '#1a1a1a',
    socksColor: '#d50000',
    bootColor: '#333333',
    specialMove: 'Wild Card',
    specialDesc: 'Unpredictable chaos — the keeper never knows',
  },
  sage: {
    primaryColor: '#2979ff',
    secondaryColor: '#0d47a1',
    socksColor: '#1565c0',
    bootColor: '#222222',
    specialMove: 'Pattern Lock',
    specialDesc: 'Calculated trajectory into the top corner',
  },
  halo: {
    primaryColor: '#ff9100',
    secondaryColor: '#e65100',
    socksColor: '#ff6d00',
    bootColor: '#1a1a1a',
    specialMove: 'Solar Flare',
    specialDesc: 'Blistering strike that leaves the net burning',
  },
  knox: {
    primaryColor: '#00c853',
    secondaryColor: '#1b5e20',
    socksColor: '#00e676',
    bootColor: '#222222',
    specialMove: 'Iron Wall Rush',
    specialDesc: 'Bulldozes forward — nothing stops the tank',
  },
  phoenix: {
    primaryColor: '#d500f9',
    secondaryColor: '#4a148c',
    socksColor: '#aa00ff',
    bootColor: '#1a1a1a',
    specialMove: 'Rising Blaze',
    specialDesc: 'Surges from nowhere with impossible speed',
  },
}

const DEFAULT_THEME: AgentTheme = {
  primaryColor: '#ffffff',
  secondaryColor: '#333333',
  socksColor: '#cccccc',
  bootColor: '#222222',
  specialMove: 'Power Shot',
  specialDesc: 'A devastating strike',
}

export function agentToPlayer(agent: AgentStats): H2HPlayer {
  const theme = AGENT_THEMES[agent.id] || DEFAULT_THEME
  const pace = agent.spd
  const shooting = agent.atk
  const dribbling = Math.round((agent.mid + agent.spd) / 2)
  const passing = agent.mid
  const physical = agent.def
  const overall = Math.round((pace + shooting + dribbling + passing + physical) / 5)

  return {
    id: agent.id,
    name: agent.name,
    shortName: agent.name.toUpperCase(),
    position: shooting >= 80 ? 'FWD' : passing >= 80 ? 'MID' : 'DEF',
    pace,
    shooting,
    dribbling,
    passing,
    physical,
    overall,
    isStar: overall >= 75,
    specialMove: theme.specialMove,
    specialDesc: theme.specialDesc,
  }
}

export function agentToTeam(agent: AgentStats): H2HTeam {
  const theme = AGENT_THEMES[agent.id] || DEFAULT_THEME
  return {
    code: agent.id.toUpperCase().slice(0, 3),
    name: agent.name.toUpperCase(),
    flag: agent.avatar,
    primaryColor: theme.primaryColor,
    secondaryColor: theme.secondaryColor,
    socksColor: theme.socksColor,
    bootColor: theme.bootColor,
  }
}
