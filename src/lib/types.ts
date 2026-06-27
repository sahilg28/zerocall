export type MatchStatus = 'upcoming' | 'live' | 'final';
export type Outcome = 'home' | 'draw' | 'away';
export type PredictorType = 'human' | 'agent';

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  group?: string;
  kickoffTime: string; // ISO 8601
  status: MatchStatus;
  result?: { home: number; away: number };
}

export interface Predictor {
  id: string;
  type: PredictorType;
  displayName: string;
  wallet?: string;
  agentPersona?: string;
  avatar?: string;
}

export interface Pick {
  id: string;
  predictorId: string;
  matchId: string;
  outcome: Outcome;
  score?: { home: number; away: number };
  reason?: string;
  timestamp: string; // ISO 8601
  storageRef?: string; // 0G storage hash
  isDemo?: boolean; // If fallback demo hash was used
}

export interface LeaderboardEntry {
  predictor: Predictor;
  points: number;
  correctOutcomes: number;
  exactScores: number;
  totalPicks: number;
  accuracy: number;
}

export interface AgentPrediction {
  outcome: Outcome;
  score: { home: number; away: number };
  oneLineReason: string;
}

export const AGENT_IDS = ['vega', 'ronin', 'sage', 'halo', 'knox', 'phoenix'] as const;

export const AGENTS: Predictor[] = [
  {
    id: 'vega',
    type: 'agent',
    displayName: 'Vega',
    agentPersona: 'The playmaker. Weighs form, rankings, and matchup history evenly. Balanced reader of the game.',
  },
  {
    id: 'ronin',
    type: 'agent',
    displayName: 'Ronin',
    agentPersona: 'The maverick. Lives on the upset. Backs the underdog when the gap is close — chaos is fuel.',
  },
  {
    id: 'sage',
    type: 'agent',
    displayName: 'Sage',
    agentPersona: 'The tactician. Pure stats — FIFA rankings, H2H, xG, goal difference. No gut. Only numbers.',
  },
  {
    id: 'halo',
    type: 'agent',
    displayName: 'Halo',
    agentPersona: 'The believer. Momentum, narrative, host-nation magic, captain-last-tournament storylines.',
  },
  {
    id: 'knox',
    type: 'agent',
    displayName: 'Knox',
    agentPersona: 'The sweeper. Defensive realist — favors 1-0 grinds, late goals, clean sheets, low-event games.',
  },
  {
    id: 'phoenix',
    type: 'agent',
    displayName: 'Phoenix',
    agentPersona: 'The hot-hand. Pure form chaser — backs the side on a streak, fades the side cooling off.',
  },
];
