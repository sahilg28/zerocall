import { NextResponse } from 'next/server';
import type { Match, MatchStatus } from '@/lib/types';

const OPENFOOTBALL_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

interface OpenFootballMatch {
  round: string;
  date: string;
  time?: string;
  team1: string;
  team2: string;
  score?: { ft?: [number, number]; ht?: [number, number] };
  group?: string;
  ground?: string;
}

interface OpenFootballData {
  name: string;
  matches: OpenFootballMatch[];
}

let cache: { data: Match[]; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

function parseKickoff(date: string, time?: string): string {
  if (!time) return `${date}T18:00:00Z`;
  const cleaned = time.replace(/\s*UTC([+-]\d+)/, (_, offset) => {
    const hrs = parseInt(offset, 10);
    const abs = Math.abs(hrs);
    const sign = hrs >= 0 ? '+' : '-';
    return `${sign}${String(abs).padStart(2, '0')}:00`;
  });
  return `${date}T${cleaned}`;
}

function deriveStatus(score: OpenFootballMatch['score'], kickoff: string): MatchStatus {
  if (score?.ft) return 'final';
  const kickoffMs = new Date(kickoff).getTime();
  const now = Date.now();
  if (now >= kickoffMs && now < kickoffMs + 3 * 60 * 60 * 1000) return 'live';
  return 'upcoming';
}

function transformMatches(raw: OpenFootballData): Match[] {
  return raw.matches
    .filter((m) => m.team1 && m.team2 && !m.team1.match(/^\d/))
    .map((m, i) => {
      const kickoff = parseKickoff(m.date, m.time);
      const status = deriveStatus(m.score, kickoff);
      const group = m.group?.replace('Group ', '') ?? undefined;
      return {
        id: `m${String(i + 1).padStart(2, '0')}`,
        homeTeam: m.team1,
        awayTeam: m.team2,
        group,
        kickoffTime: kickoff,
        status,
        result: m.score?.ft
          ? { home: m.score.ft[0], away: m.score.ft[1] }
          : undefined,
      };
    });
}

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const res = await fetch(OPENFOOTBALL_URL, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`openfootball returned ${res.status}`);
    const raw: OpenFootballData = await res.json();
    const matches = transformMatches(raw);
    cache = { data: matches, ts: Date.now() };
    return NextResponse.json(matches);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch matches';
    if (cache) return NextResponse.json(cache.data);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
