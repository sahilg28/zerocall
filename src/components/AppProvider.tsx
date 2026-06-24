'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { AppContext, loadPicks, savePicks, loadWallet, saveWallet, getAllPredictors } from '@/lib/store';
import { Match, Pick, AGENT_IDS } from '@/lib/types';
import { generateAllAgentPicks } from '@/lib/agents';
import fallbackMatches from '@/data/matches.json';

const REFRESH_INTERVAL = 5 * 60 * 1000;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [matches, setMatches] = useState<Match[]>(fallbackMatches as Match[]);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedWallet = loadWallet();
    if (savedWallet) setWalletAddress(savedWallet);

    async function fetchMatches() {
      try {
        const res = await fetch('/api/matches');
        if (!res.ok) throw new Error('API error');
        const live: Match[] = await res.json();
        if (Array.isArray(live) && live.length > 0) {
          setMatches(live);
          return live;
        }
      } catch {
        /* fall through to fallback */
      }
      return fallbackMatches as Match[];
    }

    fetchMatches().then((m) => {
      const userPicks = loadPicks();
      const agentPicks = generateAllAgentPicks(m);
      setPicks([...userPicks, ...agentPicks]);
    });

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/matches');
        if (!res.ok) return;
        const live: Match[] = await res.json();
        if (Array.isArray(live) && live.length > 0) setMatches(live);
      } catch { /* ignore */ }
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mounted) saveWallet(walletAddress);
  }, [walletAddress, mounted]);

  const addPick = useCallback((pick: Pick) => {
    setPicks((prev) => {
      const filtered = prev.filter(
        (p) => !(p.predictorId === pick.predictorId && p.matchId === pick.matchId)
      );
      const updated = [...filtered, pick];
      const userPicks = updated.filter(
        (p) => !(AGENT_IDS as readonly string[]).includes(p.predictorId)
      );
      savePicks(userPicks);
      return updated;
    });
  }, []);

  const getPicksForMatch = useCallback(
    (matchId: string) => picks.filter((p) => p.matchId === matchId),
    [picks]
  );

  const getPicksForPredictor = useCallback(
    (predictorId: string) => picks.filter((p) => p.predictorId === predictorId),
    [picks]
  );

  const getUserPick = useCallback(
    (matchId: string) => {
      const userId = walletAddress || 'anon';
      return picks.find((p) => p.predictorId === userId && p.matchId === matchId);
    },
    [picks, walletAddress]
  );

  const predictors = useMemo(() => getAllPredictors(walletAddress), [walletAddress]);

  const store = useMemo(
    () => ({
      matches,
      picks,
      predictors,
      walletAddress,
      addPick,
      setWalletAddress,
      getPicksForMatch,
      getPicksForPredictor,
      getUserPick,
    }),
    [matches, picks, predictors, walletAddress, addPick, getPicksForMatch, getPicksForPredictor, getUserPick]
  );

  if (!mounted) {
    return <div className="min-h-screen bg-[var(--bg-primary)]" />;
  }

  return <AppContext.Provider value={store}>{children}</AppContext.Provider>;
}
