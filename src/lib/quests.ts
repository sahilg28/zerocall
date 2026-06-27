'use client';

const QUESTS_KEY = 'zerocall_quests';

export interface Quest {
  id: string;
  title: string;
  description: string;
  reward: number;
  icon: string;
}

export interface QuestProgress {
  completed: boolean;
  claimed: boolean;
}

export type DailyProgress = Record<string, QuestProgress>;

export const DAILY_QUESTS: Quest[] = [
  {
    id: 'predict_match',
    title: 'PREDICT A MATCH',
    description: 'Lock in a prediction on any match today',
    reward: 20,
    icon: '/',
  },
  {
    id: 'play_penalty',
    title: 'PLAY PSG',
    description: 'Play one Penalty Shooter Game',
    reward: 20,
    icon: '/',
  },
  {
    id: 'play_h2h',
    title: 'PLAY HEAD2HEAD',
    description: 'Complete a Head2Head match simulation',
    reward: 25,
    icon: '/',
  },
];

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadAllProgress(): Record<string, DailyProgress> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(QUESTS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveAllProgress(data: Record<string, DailyProgress>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(QUESTS_KEY, JSON.stringify(data));
}

export function getTodayProgress(): DailyProgress {
  const all = loadAllProgress();
  return all[todayKey()] || {};
}

export function completeQuest(questId: string): number {
  const all = loadAllProgress();
  const key = todayKey();
  if (!all[key]) all[key] = {};
  if (all[key][questId]?.completed) return 0;
  const quest = DAILY_QUESTS.find((q) => q.id === questId);
  const reward = quest?.reward || 0;
  all[key][questId] = { completed: true, claimed: true };
  saveAllProgress(all);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('zerocall-quests'));
  }
  return reward;
}

export function claimQuest(questId: string): number {
  const all = loadAllProgress();
  const key = todayKey();
  const progress = all[key]?.[questId];
  if (!progress?.completed || progress.claimed) return 0;
  all[key][questId] = { ...progress, claimed: true };
  saveAllProgress(all);
  const quest = DAILY_QUESTS.find((q) => q.id === questId);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('zerocall-quests'));
  }
  return quest?.reward || 0;
}

export function isQuestCompleted(questId: string): boolean {
  return getTodayProgress()[questId]?.completed ?? false;
}

export function isQuestClaimed(questId: string): boolean {
  return getTodayProgress()[questId]?.claimed ?? false;
}
