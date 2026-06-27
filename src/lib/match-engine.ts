export type Tactic = 'attack' | 'balanced' | 'defense';

export interface AgentStats {
  id: string;
  name: string;
  avatar: string;
  atk: number;
  def: number;
  mid: number;
  spd: number;
  luck: number;
}

export interface PossessionEvent {
  team: 'home' | 'away';
  possession: number;
  dribbleSuccess: boolean;
  shotOnTarget: boolean;
  goal: boolean;
  narrative: string;
}

export interface MatchResult {
  homeGoals: number;
  awayGoals: number;
  events: PossessionEvent[];
  homeShots: number;
  awayShots: number;
  homePossession: number;
  awayPossession: number;
}

export const AGENT_STATS: AgentStats[] = [
  { id: 'vega', name: 'Vega', avatar: 'VG', atk: 75, def: 75, mid: 80, spd: 70, luck: 65 },
  { id: 'ronin', name: 'Ronin', avatar: 'RN', atk: 85, def: 50, mid: 60, spd: 90, luck: 80 },
  { id: 'sage', name: 'Sage', avatar: 'SG', atk: 70, def: 80, mid: 85, spd: 60, luck: 50 },
  { id: 'halo', name: 'Halo', avatar: 'HL', atk: 80, def: 60, mid: 70, spd: 75, luck: 85 },
  { id: 'knox', name: 'Knox', avatar: 'KX', atk: 55, def: 90, mid: 75, spd: 55, luck: 60 },
  { id: 'phoenix', name: 'Phoenix', avatar: 'PX', atk: 90, def: 55, mid: 65, spd: 85, luck: 70 },
];

const TACTIC_MOD: Record<Tactic, { atkBonus: number; defBonus: number }> = {
  attack: { atkBonus: 8, defBonus: -5 },
  balanced: { atkBonus: 0, defBonus: 0 },
  defense: { atkBonus: -8, defBonus: 5 },
};

const NARRATIVES = {
  dribbleFail: [
    '{name} loses the ball in midfield.',
    '{name} tries a through ball — intercepted!',
    '{name} is dispossessed near the box.',
    'Poor touch by {name}, possession lost.',
  ],
  shotMiss: [
    '{name} fires wide from distance!',
    '{name} volleys it over the bar!',
    '{name} curls one just past the post!',
    'Long-range effort from {name} — off target.',
  ],
  shotSave: [
    '{name} shoots! Great save by the keeper!',
    '{name} forces a diving stop!',
    'Header from {name} — caught cleanly!',
    '{name} hits it low — keeper palms it away!',
  ],
  goal: [
    'GOAL! {name} smashes it into the net!',
    'GOAL! {name} slots it home coolly!',
    'GOAL! What a strike from {name}!',
    'GOAL! {name} heads it in at the far post!',
    'GOAL! {name} rounds the keeper and scores!',
  ],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function narrate(pool: string[], name: string): string {
  return pick(pool).replace('{name}', name);
}

export function simulateMatch(
  home: AgentStats,
  away: AgentStats,
  homeTactic: Tactic,
  awayTactic: Tactic
): MatchResult {
  const totalPossessions = 10;
  const events: PossessionEvent[] = [];
  let homeGoals = 0;
  let awayGoals = 0;
  let homeShots = 0;
  let awayShots = 0;

  for (let i = 0; i < totalPossessions; i++) {
    const isHome = i % 2 === 0;
    const attacker = isHome ? home : away;
    const defender = isHome ? away : home;
    const atkTactic = isHome ? homeTactic : awayTactic;
    const defTactic = isHome ? awayTactic : homeTactic;
    const team: 'home' | 'away' = isHome ? 'home' : 'away';

    const atkMod = TACTIC_MOD[atkTactic];
    const defMod = TACTIC_MOD[defTactic];

    const atkPower = attacker.atk + atkMod.atkBonus + attacker.spd * 0.2;
    const midPower = attacker.mid + attacker.luck * 0.15;
    const defPower = defender.def + defMod.defBonus + defender.mid * 0.15;

    // Dribble phase: attacker mid+spd vs defender def+mid
    const dribbleChance = 0.4 + (midPower - defPower * 0.7) / 200;
    const dribbleRoll = Math.random();
    const dribbleSuccess = dribbleRoll < Math.max(0.2, Math.min(0.85, dribbleChance));

    if (!dribbleSuccess) {
      events.push({
        team,
        possession: i + 1,
        dribbleSuccess: false,
        shotOnTarget: false,
        goal: false,
        narrative: narrate(NARRATIVES.dribbleFail, attacker.name),
      });
      continue;
    }

    // Shot phase
    if (isHome) homeShots++;
    else awayShots++;

    const shotPower = atkPower + attacker.luck * 0.3;
    const savePower = defender.def + defMod.defBonus + defender.luck * 0.2;
    const goalChance = 0.25 + (shotPower - savePower) / 250;
    const goalRoll = Math.random();
    const isGoal = goalRoll < Math.max(0.08, Math.min(0.55, goalChance));

    if (isGoal) {
      if (isHome) homeGoals++;
      else awayGoals++;
      events.push({
        team,
        possession: i + 1,
        dribbleSuccess: true,
        shotOnTarget: true,
        goal: true,
        narrative: narrate(NARRATIVES.goal, attacker.name),
      });
    } else {
      const onTarget = Math.random() < 0.6;
      events.push({
        team,
        possession: i + 1,
        dribbleSuccess: true,
        shotOnTarget: onTarget,
        goal: false,
        narrative: narrate(onTarget ? NARRATIVES.shotSave : NARRATIVES.shotMiss, attacker.name),
      });
    }
  }

  return {
    homeGoals,
    awayGoals,
    events,
    homeShots,
    awayShots,
    homePossession: 50,
    awayPossession: 50,
  };
}
