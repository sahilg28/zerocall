'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp, isMuted as readMuted, setMuted as writeMuted, getPoints } from '@/lib/store';
import { getChiptune } from '@/lib/chiptune';
import { DAILY_QUESTS, getTodayProgress, type DailyProgress } from '@/lib/quests';

export function Nav() {
  const pathname = usePathname();
  const { walletAddress, setWalletAddress } = useApp();
  const [showHelp, setShowHelp] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [walletError, setWalletError] = useState<string | null>(null);
  const [showGamesMenu, setShowGamesMenu] = useState(false);
  const [showQuestsMenu, setShowQuestsMenu] = useState(false);

  const isGuest = walletAddress?.startsWith('guest:');
  const displayName = isGuest
    ? walletAddress!.slice('guest:'.length)
    : walletAddress
      ? `${walletAddress.slice(0, 4)}..${walletAddress.slice(-3)}`
      : '';

  const playAsGuest = () => {
    const trimmed = guestName.trim().slice(0, 16);
    if (!trimmed) return;
    setWalletAddress(`guest:${trimmed}`);
    setShowConnect(false);
    setGuestName('');
  };

  const [muted, setMutedState] = useState(false);
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [pts, setPts] = useState(0);
  const [questProgress, setQuestProgress] = useState<DailyProgress>({});

  useEffect(() => {
    setMutedState(readMuted());
    setPts(getPoints());
    setQuestProgress(getTodayProgress());
    const onMuteChange = (e: Event) => setMutedState((e as CustomEvent<boolean>).detail);
    window.addEventListener('zerocall-mute', onMuteChange);
    const onPointsChange = (e: Event) => setPts((e as CustomEvent<number>).detail);
    window.addEventListener('zerocall-points', onPointsChange);
    const onQuestsChange = () => setQuestProgress(getTodayProgress());
    window.addEventListener('zerocall-quests', onQuestsChange);
    const pointsInterval = setInterval(() => {
      setPts(getPoints());
      setQuestProgress(getTodayProgress());
    }, 3000);
    return () => {
      window.removeEventListener('zerocall-mute', onMuteChange);
      window.removeEventListener('zerocall-points', onPointsChange);
      window.removeEventListener('zerocall-quests', onQuestsChange);
      clearInterval(pointsInterval);
    };
  }, []);

  const toggleMute = () => {
    const next = !muted;
    setMutedState(next);
    writeMuted(next);
    const t = getChiptune();
    if (next) t.stop();
    else t.start();
  };

  const links = [
    { href: '/', label: 'HOME' },
    { href: '/global', label: 'PREDICT' },
    { href: '/agents', label: 'AGENTS' },
  ];

  const isGamesActive = pathname === '/psg' || pathname === '/head2head';
  const hasUnclaimedQuest = DAILY_QUESTS.some(q => !questProgress[q.id]?.completed);

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({
          method: 'eth_requestAccounts',
        });
        if (accounts[0]) {
          setWalletAddress(accounts[0]);
          try {
            await (window as any).ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x40DA' }],
            });
          } catch (switchErr: any) {
            if (switchErr.code === 4902) {
              await (window as any).ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: '0x40DA',
                  chainName: '0G Galileo Testnet',
                  nativeCurrency: { name: '0G', symbol: '0G', decimals: 18 },
                  rpcUrls: ['https://evmrpc-testnet.0g.ai'],
                  blockExplorerUrls: ['https://chainscan-galileo.0g.ai'],
                }],
              });
            }
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Wallet connection failed';
        setWalletError(msg);
        setTimeout(() => setWalletError(null), 4000);
      }
    } else {
      window.open('https://metamask.io', '_blank');
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-50 bg-[var(--bg-primary)]/90 backdrop-blur-md border-b border-[var(--neon-cyan)]/15 shadow-[0_2px_16px_rgba(0,0,0,0.4)]">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <Link href="/" className="font-pixel text-xs sm:text-sm text-[var(--neon-green)] flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 64 64" aria-hidden className="shrink-0">
              <rect width="64" height="64" rx="10" fill="#0a0e1a" stroke="#00ff88" strokeOpacity="0.4"/>
              <path d="M16 18 H48 V26 L26 46 H48 V54 H16 V46 L38 26 H16 Z" fill="#00ff88"/>
            </svg>
            ZEROCALL
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1.5">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`font-pixel text-[8px] tracking-wider transition-all px-3 py-2 border-2 ${
                  pathname === link.href
                    ? 'text-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10 border-[var(--neon-cyan)]/40 shadow-[inset_0_0_20px_rgba(0,229,255,0.06),0_2px_0_rgba(0,229,255,0.2)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--neon-cyan)] hover:bg-white/5 border-white/10 hover:border-[var(--neon-cyan)]/30 shadow-[inset_0_0_12px_rgba(255,255,255,0.01),0_2px_0_rgba(255,255,255,0.05)]'
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* GAMES dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowGamesMenu(v => !v)}
                className={`font-pixel text-[8px] tracking-wider transition-all px-3 py-2 border-2 flex items-center gap-1 ${
                  isGamesActive
                    ? 'text-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10 border-[var(--neon-cyan)]/40 shadow-[inset_0_0_20px_rgba(0,229,255,0.06),0_2px_0_rgba(0,229,255,0.2)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--neon-cyan)] hover:bg-white/5 border-white/10 hover:border-[var(--neon-cyan)]/30 shadow-[inset_0_0_12px_rgba(255,255,255,0.01),0_2px_0_rgba(255,255,255,0.05)]'
                }`}
              >
                GAMES <span className="text-[7px]">▼</span>
              </button>
              <AnimatePresence>
                {showGamesMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    onMouseLeave={() => setShowGamesMenu(false)}
                    className="absolute left-0 mt-2 w-44 card-retro p-2 z-50"
                  >
                    <Link
                      href="/head2head"
                      onClick={() => setShowGamesMenu(false)}
                      className={`block font-pixel text-[8px] px-3 py-2 rounded-sm transition-colors ${
                        pathname === '/head2head'
                          ? 'text-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10'
                          : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'
                      }`}
                    >
                      HEAD2HEAD
                    </Link>
                    <Link
                      href="/psg"
                      onClick={() => setShowGamesMenu(false)}
                      className={`block font-pixel text-[8px] px-3 py-2 rounded-sm transition-colors ${
                        pathname === '/psg'
                          ? 'text-[var(--neon-green)] bg-[var(--neon-green)]/10'
                          : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'
                      }`}
                    >
                      PSG
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Daily quests icon */}
            <div className="relative hidden sm:block">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowQuestsMenu(v => !v)}
                className="w-8 h-8 flex items-center justify-center border border-[var(--neon-orange)]/30 rounded-full text-[var(--neon-orange)] hover:bg-[var(--neon-orange)]/10 transition-colors text-xs relative"
                title="Daily challenges"
              >
                <span className="text-sm">⚡</span>
              </motion.button>
              <AnimatePresence>
                {showQuestsMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    onMouseLeave={() => setShowQuestsMenu(false)}
                    className="absolute right-0 mt-2 w-64 card-retro p-3 z-50"
                  >
                    <div className="font-pixel text-[8px] text-[var(--neon-orange)] tracking-widest mb-2">
                      DAILY CHALLENGES
                    </div>
                    <div className="space-y-2">
                      {DAILY_QUESTS.map(quest => {
                        const done = questProgress[quest.id]?.completed ?? false;
                        return (
                          <div key={quest.id} className={`flex items-center gap-2 p-2 rounded-sm border ${
                            done ? 'border-[var(--neon-green)]/30 bg-[var(--neon-green)]/5' : 'border-white/10 bg-white/[0.02]'
                          }`}>
                            <span className="text-base">{quest.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="font-pixel text-[8px] text-white">{quest.title}</div>
                              <div className="font-retro text-xs text-[var(--text-muted)]">{quest.description}</div>
                            </div>
                            <div className="shrink-0">
                              {done ? (
                                <span className="font-pixel text-[8px] text-[var(--neon-green)]">DONE</span>
                              ) : (
                                <Link
                                  href={quest.id === 'predict_match' ? '/global' : quest.id === 'play_penalty' ? '/psg' : '/head2head'}
                                  onClick={() => setShowQuestsMenu(false)}
                                  className="font-pixel text-[8px] px-2 py-1 border border-[var(--neon-cyan)]/40 text-[var(--neon-cyan)] rounded-sm hover:bg-[var(--neon-cyan)]/10 transition-colors"
                                >
                                  GO
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sound toggle */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleMute}
              className="w-8 h-8 flex items-center justify-center border border-white/15 rounded-full text-[var(--text-muted)] hover:text-white hover:border-white/30 transition-colors text-xs hidden sm:flex"
              title={muted ? 'Unmute' : 'Mute'}
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? '🔇' : '🔊'}
            </motion.button>

            {/* Help button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowHelp(true)}
              className="w-8 h-8 flex items-center justify-center border border-[var(--neon-yellow)]/30 rounded-full text-[var(--neon-yellow)] hover:bg-[var(--neon-yellow)]/10 transition-colors font-pixel text-xs hidden sm:flex"
              title="How it works"
            >
              ?
            </motion.button>

            {/* Connect / identity with profile */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={walletAddress ? () => setShowWalletMenu((v) => !v) : () => setShowConnect(true)}
                className={`font-pixel text-[9px] px-2 sm:px-3 py-1.5 border rounded-sm transition-colors tracking-widest ${
                  walletAddress
                    ? 'border-[var(--neon-green)]/50 text-[var(--neon-green)] bg-[var(--neon-green)]/10 hover:bg-[var(--neon-green)]/15'
                    : 'border-[var(--neon-cyan)]/60 text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10 animate-pulse'
                }`}
                title={walletAddress ? 'Account menu' : 'Connect or play as guest'}
              >
                {walletAddress ? displayName.toUpperCase() : 'CONNECT'}
              </motion.button>

              <AnimatePresence>
                {walletAddress && showWalletMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    onMouseLeave={() => setShowWalletMenu(false)}
                    className="absolute right-0 mt-2 w-56 card-retro p-3 z-50"
                  >
                    <div className="font-pixel text-[8px] text-[var(--text-muted)] tracking-widest mb-1">
                      {isGuest ? 'GUEST SESSION' : 'WALLET'}
                    </div>
                    <div className="font-pixel text-[10px] text-white break-all mb-2">
                      {isGuest ? displayName : walletAddress}
                    </div>

                    {/* 0G Points */}
                    <div className="flex items-center justify-between p-2 rounded-sm border border-[var(--neon-cyan)]/20 bg-[var(--neon-cyan)]/5 mb-2">
                      <span className="font-pixel text-[8px] text-[var(--text-muted)] tracking-widest">0G PTS</span>
                      <span className="font-pixel text-sm text-[var(--neon-cyan)]">{pts}</span>
                    </div>

                    {/* Profile link */}
                    <Link
                      href="/profile"
                      onClick={() => setShowWalletMenu(false)}
                      className="block w-full font-pixel text-[9px] tracking-widest py-2 mb-2 border border-[var(--neon-green)]/30 text-[var(--neon-green)] rounded-sm hover:bg-[var(--neon-green)]/10 transition-colors text-center"
                    >
                      VIEW PROFILE
                    </Link>

                    <button
                      onClick={() => { setShowWalletMenu(false); setWalletAddress(null); }}
                      className="w-full font-pixel text-[9px] tracking-widest py-2 border border-red-500/40 text-red-300 rounded-sm hover:bg-red-500/15 transition-colors"
                    >
                      DISCONNECT
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden w-8 h-8 flex items-center justify-center border border-[var(--neon-cyan)]/30 rounded-sm text-[var(--neon-cyan)] bg-[var(--neon-cyan)]/5 hover:bg-[var(--neon-cyan)]/15 transition-all cursor-pointer select-none ml-0.5 shadow-[0_0_6px_rgba(0,229,255,0.05)]"
              aria-label={showMobileMenu ? 'Close menu' : 'Open menu'}
              aria-expanded={showMobileMenu}
            >
              <div className="flex flex-col justify-center items-center w-4 h-4 relative">
                <span className={`absolute block w-3.5 h-[1.5px] bg-[var(--neon-cyan)] transition-all duration-300 ${showMobileMenu ? 'rotate-45' : '-translate-y-1'}`} />
                <span className={`absolute block w-3.5 h-[1.5px] bg-[var(--neon-cyan)] transition-all duration-300 ${showMobileMenu ? 'opacity-0' : ''}`} />
                <span className={`absolute block w-3.5 h-[1.5px] bg-[var(--neon-cyan)] transition-all duration-300 ${showMobileMenu ? '-rotate-45' : 'translate-y-1'}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {showMobileMenu && (() => {
            const mobileMenuLinks = [
              { href: '/', label: 'HOME', borderStyle: 'border-[var(--neon-green)]/45 text-[var(--neon-green)] shadow-[inset_0_0_10px_rgba(0,255,136,0.06),0_0_12px_rgba(0,255,136,0.15)] bg-[var(--neon-green)]/5' },
              { href: '/global', label: 'PREDICT', borderStyle: 'border-[var(--neon-cyan)]/45 text-[var(--neon-cyan)] shadow-[inset_0_0_10px_rgba(0,229,255,0.06),0_0_12px_rgba(0,229,255,0.15)] bg-[var(--neon-cyan)]/5' },
              { href: '/agents', label: 'AGENTS', borderStyle: 'border-[var(--neon-yellow)]/45 text-[var(--neon-yellow)] shadow-[inset_0_0_10px_rgba(255,229,0,0.06),0_0_12px_rgba(255,229,0,0.15)] bg-[var(--neon-yellow)]/5' },
              { href: '/head2head', label: 'HEAD2HEAD', borderStyle: 'border-[var(--neon-magenta)]/45 text-[var(--neon-magenta)] shadow-[inset_0_0_10px_rgba(255,0,255,0.06),0_0_12px_rgba(255,0,255,0.15)] bg-[var(--neon-magenta)]/5' },
              { href: '/psg', label: 'PSG', borderStyle: 'border-[var(--neon-orange)]/45 text-[var(--neon-orange)] shadow-[inset_0_0_10px_rgba(255,102,0,0.06),0_0_12px_rgba(255,102,0,0.15)] bg-[var(--neon-orange)]/5' },
            ];

            return (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="md:hidden overflow-hidden border-t border-white/10 bg-[#070a14]"
              >
                {/* Links Grid */}
                <div className="grid grid-cols-2 gap-1.5 p-2.5">
                  {mobileMenuLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setShowMobileMenu(false)}
                      className={`font-pixel text-[8px] py-2.5 border-2 text-center transition-all ${
                        pathname === link.href
                          ? link.borderStyle
                          : 'text-[var(--text-muted)] border-white/10 hover:text-white hover:border-white/25 bg-black/10'
                      }`}
                    >
                      {pathname === link.href ? `▸ ${link.label}` : link.label}
                    </Link>
                  ))}
                  <button
                    onClick={() => { setShowMobileMenu(false); setShowQuestsMenu(true); }}
                    className="font-pixel text-[8px] py-2.5 border-2 border-[var(--neon-orange)]/45 text-[var(--neon-orange)] bg-[var(--neon-orange)]/5 hover:bg-[var(--neon-orange)]/15 transition-all text-center cursor-pointer shadow-[inset_0_0_10px_rgba(255,102,0,0.06)] active:scale-95"
                  >
                    ⚡ QUESTS
                  </button>
                </div>

                {/* Symmetrical Settings Footer Bar */}
                <div className="flex items-center justify-between px-3 py-2 border-t border-white/5 bg-black/25 gap-2">
                  <span className="font-pixel text-[7px] text-[var(--text-muted)] tracking-widest mr-auto">SETTINGS</span>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={toggleMute}
                      className="w-7 h-7 flex items-center justify-center border border-white/10 rounded-full text-[var(--text-muted)] hover:text-white text-xs bg-black/30 hover:bg-black/50 transition-colors cursor-pointer"
                    >
                      {muted ? '🔇' : '🔊'}
                    </button>
                    <button
                      onClick={() => { setShowMobileMenu(false); setShowHelp(true); }}
                      className="w-7 h-7 flex items-center justify-center border border-[var(--neon-yellow)]/30 rounded-full text-[var(--neon-yellow)] font-pixel text-xs bg-black/30 hover:bg-black/50 transition-colors cursor-pointer"
                    >
                      ?
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </nav>

      {/* Connect Modal */}
      <AnimatePresence>
        {showConnect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm"
            onClick={() => setShowConnect(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="card-retro p-6 w-full max-w-sm mx-4 border-[var(--neon-cyan)]/30!"
            >
              <div className="flex justify-between items-center mb-5">
                <h2 className="font-pixel text-xs text-[var(--neon-cyan)]">JOIN THE ARENA</h2>
                <button onClick={() => setShowConnect(false)} aria-label="Close" className="font-pixel text-xs text-[var(--text-muted)] hover:text-white">✕</button>
              </div>

              <button
                onClick={() => { setShowConnect(false); connectWallet(); }}
                className="w-full mb-3 p-3 border border-[var(--neon-green)]/40 rounded-sm bg-[var(--neon-green)]/5 hover:bg-[var(--neon-green)]/15 transition-colors text-left"
              >
                <div className="font-pixel text-[10px] text-[var(--neon-green)] mb-1">CONNECT WALLET</div>
                <div className="font-retro text-sm text-[var(--text-muted)]">MetaMask. 0G Galileo testnet. Predictions sealed with your wallet.</div>
              </button>

              <div className="font-pixel text-[8px] text-[var(--text-muted)] text-center my-3 tracking-widest">OR</div>

              <div className="p-3 border border-[var(--neon-cyan)]/30 rounded-sm bg-[var(--neon-cyan)]/5">
                <div className="font-pixel text-[10px] text-[var(--neon-cyan)] mb-1">PLAY AS GUEST</div>
                <div className="font-retro text-sm text-[var(--text-muted)] mb-3">No wallet. Picks lock with a demo hash.</div>
                <form onSubmit={(e) => { e.preventDefault(); playAsGuest(); }} className="flex gap-2">
                  <input
                    autoFocus
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    maxLength={16}
                    placeholder="YOUR NAME"
                    className="flex-1 bg-[var(--bg-secondary)] border border-white/15 rounded-sm px-2 py-1.5 font-pixel text-[10px] text-white placeholder:text-white/30 focus:border-[var(--neon-cyan)]/60 outline-none uppercase"
                  />
                  <button type="submit" disabled={!guestName.trim()} className="font-pixel text-[9px] px-3 py-1.5 bg-[var(--neon-cyan)] text-[var(--bg-primary)] rounded-sm disabled:opacity-30 disabled:cursor-not-allowed">
                    ENTER
                  </button>
                </form>
              </div>

              {walletError && (
                <p className="font-pixel text-[8px] text-red-400 text-center mt-3 tracking-widest">
                  {walletError}
                </p>
              )}

              <p className="font-pixel text-[8px] text-[var(--text-muted)] text-center mt-4 tracking-widest">
                BUILT ON 0G · GALILEO TESTNET
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Modal */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm"
            onClick={() => setShowHelp(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="card-retro p-6 w-full max-w-lg mx-4 border-[var(--neon-yellow)]/30! max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-pixel text-sm text-[var(--neon-yellow)]">HOW IT WORKS</h2>
                <button
                  onClick={() => setShowHelp(false)}
                  aria-label="Close"
                  className="font-pixel text-xs text-[var(--text-muted)] hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {[
                  { step: '01', icon: '01', title: 'CONNECT OR GO GUEST', desc: 'Plug in a 0G Galileo wallet, or just type a username and play. Either way your picks count.' },
                  { step: '02', icon: '02', title: 'PREDICT MATCHES', desc: 'Open PREDICT, scroll the World Cup 2026 fixtures, hit CALL IT. Pick Home / Draw / Away — and the exact score for bonus 0G Points.' },
                  { step: '03', icon: '03', title: 'LOCK ON 0G', desc: 'Every pick uploads to 0G Storage with a content hash. A badge appears on the card — click to view on 0G Explorer.' },
                  { step: '04', icon: '04', title: 'BEAT THE AGENTS', desc: 'Six AI agents predict every fixture via 0G Compute. Each plays in character — see who you can out-call.' },
                  { step: '05', icon: '05', title: 'PLAY THE GAMES', desc: 'PSG: 5 shots vs an AI keeper. Head2Head: pick two FC teams and watch them battle on the pixel pitch.' },
                  { step: '06', icon: '06', title: 'CLIMB THE BOARD', desc: '+15 for correct outcome, +10 for exact score. You and the six AI agents ranked on one board.' },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3">
                    <div className="shrink-0 w-10 h-10 flex items-center justify-center rounded-sm bg-[var(--bg-secondary)] border border-white/10">
                      <span className="text-xl">{item.icon}</span>
                    </div>
                    <div>
                      <h3 className="font-pixel text-[9px] text-[var(--neon-cyan)] mb-0.5">
                        {item.step}. {item.title}
                      </h3>
                      <p className="font-retro text-sm text-[var(--text-muted)]">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-white/10">
                <h3 className="font-pixel text-[9px] text-[var(--neon-green)] mb-2">SCORING</h3>
                <div className="grid grid-cols-2 gap-2 font-retro text-sm text-[var(--text-muted)]">
                  <div>Correct outcome</div><div className="text-[var(--neon-green)]">+15 pts</div>
                  <div>Exact score bonus</div><div className="text-[var(--neon-yellow)]">+10 pts</div>
                  <div>Wrong prediction</div><div className="text-red-400">0 pts</div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 text-center">
                <p className="font-pixel text-[8px] text-[var(--text-muted)]">
                  BUILT ON 0G · GALILEO TESTNET · CHAIN ID 16602
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
