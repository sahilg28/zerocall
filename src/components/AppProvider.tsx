'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { AppContext, loadPicks, savePicks, getAllPredictors } from '@/lib/store';
import { Match, Pick, AGENT_IDS } from '@/lib/types';
import { generateAllAgentPicks } from '@/lib/agents';
import matchesData from '@/data/matches.json';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const matches = matchesData as Match[];

  useEffect(() => {
    setMounted(true);
    const userPicks = loadPicks();
    const agentPicks = generateAllAgentPicks(matches);
    setPicks([...userPicks, ...agentPicks]);
  }, []);

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
