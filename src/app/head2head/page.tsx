'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { FC_TEAMS, fcToPlayer, fcToTeam, type FCTeam } from '@/lib/fc-teams'
import { runMatch, buildAttackTimeline } from '@/lib/h2h-engine'
import type { H2HMatchResult, BeatKind } from '@/lib/h2h-types'
import type { FootballFrame } from '@/lib/pixel-football'
import { h2hSound } from '@/lib/h2h-sound'
import { addPoints } from '@/lib/store'
import { completeQuest } from '@/lib/quests'
import { getFlagUrl } from '@/lib/countries'
import type { Tactic as H2HTactic } from '@/lib/h2h-engine'

const PitchTopDown = dynamic(() => import('@/components/Match/PitchTopDown'), { ssr: false })

type GamePhase = 'select' | 'loading' | 'prematch' | 'playing' | 'result'

const TACTICS: { label: string; value: H2HTactic }[] = [
  { label: 'ATK', value: 'attack' },
  { label: 'BAL', value: 'balanced' },
  { label: 'DEF', value: 'defense' },
]

const RAIN_CHANCE = 0.10

export default function Head2HeadPage() {
  const [phase, setPhase] = useState<GamePhase>('select')
  const [fcA, setFcA] = useState<FCTeam>(FC_TEAMS[0])
  const [fcB, setFcB] = useState<FCTeam>(FC_TEAMS[2])
  const [tacticA, setTacticA] = useState<H2HTactic>('balanced')
  const [tacticB, setTacticB] = useState<H2HTactic>('balanced')
  const [isRaining, setIsRaining] = useState(false)

  const [frameA, setFrameA] = useState<FootballFrame>('idle')
  const [frameB, setFrameB] = useState<FootballFrame>('idle')
  const [ballX, setBallX] = useState(0)
  const [pitchPhase, setPitchPhase] = useState('idle')
  const [beatKind, setBeatKind] = useState<BeatKind | undefined>()
  const [scoreA, setScoreA] = useState(0)
  const [scoreB, setScoreB] = useState(0)
  const [commentary, setCommentary] = useState('')
  const [goalChance, setGoalChance] = useState(0)
  const [matchMinute, setMatchMinute] = useState(0)
  const [result, setResult] = useState<H2HMatchResult | null>(null)
  const [speed, setSpeed] = useState(1)
  const [shaking, setShaking] = useState(false)
  const [rainCancelled, setRainCancelled] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [storageStatus, setStorageStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [storageHash, setStorageHash] = useState<string | null>(null)
  const [storageUrl, setStorageUrl] = useState<string | null>(null)
  const [commentaryLog, setCommentaryLog] = useState<string[]>([])

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const speedRef = useRef(speed)
  speedRef.current = speed

  const playerA = fcToPlayer(fcA)
  const playerB = fcToPlayer(fcB)
  const teamA = fcToTeam(fcA)
  const teamB = fcToTeam(fcB)

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
  }, [])

  const triggerShake = useCallback(() => {
    setShaking(true)
    setTimeout(() => setShaking(false), 200)
  }, [])

  const randomTeams = useCallback(() => {
    const shuffled = [...FC_TEAMS].sort(() => Math.random() - 0.5)
    setFcA(shuffled[0])
    setFcB(shuffled[1])
  }, [])

  const handleKickOff = useCallback(() => {
    setPhase('loading')
    setRainCancelled(false)
    setStorageStatus('idle')
    setStorageHash(null)
    setStorageUrl(null)
    setCommentaryLog([])
    const willRain = Math.random() < RAIN_CHANCE
    setIsRaining(willRain)
    setTimeout(() => {
      if (willRain) {
        setRainCancelled(true)
        setPhase('result')
      } else {
        setPhase('prematch')
      }
    }, 2500)
  }, [])

  // ── Save match data to 0G Storage ──────────────────────────
  const saveToStorage = useCallback(async (matchResult: H2HMatchResult, log: string[]) => {
    setStorageStatus('saving')
    try {
      const matchData = {
        type: 'h2h_match',
        matchId: matchResult.id,
        timestamp: new Date().toISOString(),
        homeTeam: { code: fcA.code, name: fcA.name, player: fcA.squad[0].shortName },
        awayTeam: { code: fcB.code, name: fcB.name, player: fcB.squad[0].shortName },
        scoreHome: matchResult.scoreA,
        scoreAway: matchResult.scoreB,
        winner: matchResult.winnerId === playerA.id ? fcA.code : fcB.code,
        tacticHome: tacticA,
        tacticAway: tacticB,
        possessions: matchResult.possessions.length,
        shots: {
          home: matchResult.possessions.filter(po => po.attackerId === playerA.id && po.plays.some(pl => pl.action === 'shoot' || pl.action === 'special')).length,
          away: matchResult.possessions.filter(po => po.attackerId === playerB.id && po.plays.some(pl => pl.action === 'shoot' || pl.action === 'special')).length,
        },
        commentary: log,
        stats: {
          homePlayer: { name: playerA.shortName, overall: playerA.overall, pace: playerA.pace, shooting: playerA.shooting, dribbling: playerA.dribbling, passing: playerA.passing, physical: playerA.physical },
          awayPlayer: { name: playerB.shortName, overall: playerB.overall, pace: playerB.pace, shooting: playerB.shooting, dribbling: playerB.dribbling, passing: playerB.passing, physical: playerB.physical },
        },
      }
      const res = await fetch('/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matchData),
      })
      const data = await res.json()
      if (data.success) {
        setStorageStatus('saved')
        setStorageHash(data.rootHash)
        setStorageUrl(data.explorerUrl)
      } else {
        setStorageStatus('error')
      }
    } catch {
      setStorageStatus('error')
    }
  }, [fcA, fcB, playerA, playerB, tacticA, tacticB])

  const startMatch = useCallback(() => {
    clearTimeouts()
    setPhase('playing')
    setScoreA(0); setScoreB(0)
    setCommentary('KICK OFF!')
    setCommentaryLog(['KICK OFF!'])
    setGoalChance(0); setMatchMinute(1)
    setFrameA('idle'); setFrameB('idle')
    setBallX(0); setPitchPhase('idle'); setBeatKind(undefined)

    h2hSound.resume()
    h2hSound.crowdStart()
    h2hSound.whistle()

    const matchResult = runMatch(playerA, teamA, playerB, teamB, { tacticA, tacticB })
    setResult(matchResult)

    const log: string[] = ['KICK OFF!']
    let delay = 1200
    let runningA = 0, runningB = 0
    const totalPoss = matchResult.possessions.length
    const minutePerPoss = 90 / totalPoss

    matchResult.possessions.forEach((poss, pi) => {
      const isA = poss.attackerId === playerA.id
      const attacker = isA ? playerA : playerB
      const beats = buildAttackTimeline(poss, attacker)

      beats.forEach((beat) => {
        const t = setTimeout(() => {
          const bx = isA ? -1 + beat.prog * 2 : 1 - beat.prog * 2
          setBallX(bx)
          setPitchPhase(isA ? 'attackA' : 'attackB')
          setBeatKind(beat.kind)
          setCommentary(beat.label)
          log.push(beat.label)
          setCommentaryLog([...log])
          setGoalChance(Math.round(beat.goalChance))
          setMatchMinute(Math.min(90, Math.round((pi + beat.prog) * minutePerPoss)))

          if (isA) setFrameA(beat.frame)
          else setFrameB(beat.frame)

          if (beat.shake) triggerShake()

          if (beat.kind === 'shot') h2hSound.kick()
          if (beat.kind === 'goal') {
            h2hSound.goal()
            if (isA) { runningA++; setScoreA(runningA) }
            else { runningB++; setScoreB(runningB) }
            setPitchPhase(isA ? 'goalA' : 'goalB')
          }
          if (beat.kind === 'save') h2hSound.save()
          if (beat.kind === 'miss') h2hSound.miss()
        }, delay / speedRef.current)
        timeoutsRef.current.push(t)
        delay += beat.durationMs
      })

      const resetT = setTimeout(() => {
        setBallX(0); setPitchPhase('idle'); setBeatKind(undefined)
        setFrameA('idle'); setFrameB('idle')
        setGoalChance(0)
      }, delay / speedRef.current)
      timeoutsRef.current.push(resetT)
      delay += 600
    })

    const endT = setTimeout(() => {
      h2hSound.whistle()
      h2hSound.crowdStop()
      setCommentary('FULL TIME!')
      log.push('FULL TIME!')
      setCommentaryLog([...log])
      setPitchPhase('idle')
      setBeatKind(undefined)
      setMatchMinute(90)
      setTimeout(() => {
        setPhase('result')
        // Auto-save to 0G storage
        saveToStorage(matchResult, log)
      }, 2000 / speedRef.current)
    }, delay / speedRef.current)
    timeoutsRef.current.push(endT)
  }, [playerA, playerB, teamA, teamB, tacticA, tacticB, clearTimeouts, triggerShake, saveToStorage])

  useEffect(() => {
    return () => { clearTimeouts(); h2hSound.crowdStop(); h2hSound.stopIntro() }
  }, [clearTimeouts])

  const playAgain = useCallback(() => {
    clearTimeouts()
    h2hSound.crowdStop()
    setPhase('select')
    setResult(null)
    setRainCancelled(false)
    setCommentary('')
    setCommentaryLog([])
    setScoreA(0); setScoreB(0)
    setShowLeaveModal(false)
    setStorageStatus('idle')
    setStorageHash(null)
    setStorageUrl(null)
  }, [clearTimeouts])

  const handleLeaveAttempt = useCallback(() => {
    setShowLeaveModal(true)
  }, [])

  useEffect(() => {
    if (phase === 'result' && result && !rainCancelled) {
      let ptsToAdd = 15;
      const questReward = completeQuest('play_h2h');
      if (questReward > 0) {
        ptsToAdd += questReward;
      }
      addPoints(ptsToAdd);
    }
  }, [phase, result, rainCancelled])

  // ── Styled Home/Away Stats Card (Balanced structure matching Left Card layout) ──
  const PlayerCardBottom = ({ player, team, fc, side }: { player: typeof playerA; team: typeof teamA; fc: FCTeam; side: 'left' | 'right' }) => {
    const isHome = side === 'left';
    return (
      <div className={`flex-1 card-retro p-2 sm:p-4 border-2 transition-all min-w-0 ${
        isHome 
          ? 'border-[var(--neon-green)] bg-gradient-to-br from-[#0c2e1b]/95 to-[#04140b]/95 shadow-[0_0_15px_rgba(0,255,136,0.2)]' 
          : 'border-[var(--neon-magenta)] bg-gradient-to-br from-[#3b0c15]/95 to-[#1a0408]/95 shadow-[0_0_15px_rgba(255,0,255,0.2)]'
      }`}>
        <div className="flex items-center justify-between mb-1.5 sm:mb-2.5">
          <div className="min-w-0">
            <span className={`font-pixel text-[6px] sm:text-[8px] tracking-widest block mb-0.5 ${isHome ? 'text-[var(--neon-green)]' : 'text-[var(--neon-magenta)]'}`}>
              {isHome ? 'YOU' : 'OPPONENT'}
            </span>
            <span className="font-pixel text-[9px] sm:text-sm text-white truncate block" style={{ color: team.primaryColor }}>
              {fc.code} · {player.shortName}
            </span>
          </div>
          <img src={getFlagUrl(fc.countryName)} alt={fc.code} className="w-6 h-4 sm:w-8 sm:h-5.5 object-cover rounded-sm border border-white/20 shrink-0 ml-1" />
        </div>
        <div className={`font-pixel text-[6px] sm:text-[8px] mb-2 sm:mb-3 truncate ${isHome ? 'text-[var(--neon-green)]' : 'text-[var(--neon-magenta)]'}`}>
          ✦ {player.specialMove}
        </div>
        {/* Stat bars */}
        <div className="flex flex-row sm:flex-col gap-1 sm:gap-2">
          {[
            { label: 'ATK', value: player.shooting, color: isHome ? '#00ff88' : '#ff00ff' },
            { label: 'DEF', value: player.physical, color: '#00e5ff' },
            { label: 'PAC', value: player.pace, color: '#ffe600' },
          ].map(s => (
            <div key={s.label} className="flex-1 flex flex-col sm:flex-row items-center gap-1 sm:gap-2 bg-black/35 px-1 sm:px-2 py-0.5 sm:py-1 rounded-sm border border-white/5 min-w-0">
              <span className="font-pixel text-[6px] sm:text-[8px] text-[var(--text-muted)] sm:w-6 shrink-0">{s.label}</span>
              <div className="hidden sm:block flex-1 h-2 bg-white/10 rounded-sm overflow-hidden">
                <div className="h-full rounded-sm" style={{ width: `${s.value}%`, backgroundColor: s.color }} />
              </div>
              <span className="font-pixel text-[7px] sm:text-[9px] text-white sm:w-6 sm:text-right shrink-0">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── Loading screen ─────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0a0e1a] bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:18px_18px] flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center animate-pulse"
        >
          <div className="flex items-center justify-center gap-8 mb-8">
            <div className="text-center">
              <img src={getFlagUrl(fcA.countryName)} alt={fcA.code} className="w-16 h-11 object-cover rounded-sm border border-white/20 mx-auto mb-2" />
              <div className="font-pixel text-[10px]" style={{ color: fcA.primaryColor }}>{fcA.code}</div>
            </div>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="font-pixel text-xl text-[var(--text-muted)]"
            >
              VS
            </motion.div>
            <div className="text-center">
              <img src={getFlagUrl(fcB.countryName)} alt={fcB.code} className="w-16 h-11 object-cover rounded-sm border border-white/20 mx-auto mb-2" />
              <div className="font-pixel text-[10px]" style={{ color: fcB.primaryColor }}>{fcB.code}</div>
            </div>
          </div>
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="font-pixel text-sm text-[var(--neon-cyan)] tracking-widest"
          >
            {isRaining ? 'CHECKING WEATHER...' : 'PREPARING MATCH...'}
          </motion.div>
          <div className="mt-6 w-48 h-1 bg-white/10 rounded-full overflow-hidden mx-auto">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 2.2, ease: 'easeInOut' }}
              className="h-full bg-[var(--neon-green)]"
            />
          </div>
        </motion.div>
      </div>
    )
  }

  // ── Selection phase ──────────────────────────────────────────────
  if (phase === 'select') {
    const starA = fcA.squad[0]
    const starB = fcB.squad[0]
    return (
      <div className="min-h-screen bg-transparent flex flex-col w-full px-4 sm:px-8">
        {/* ── VS Preview Panel — Transparent, no double background layer line ── */}
        <div className="w-full bg-transparent">
          <div className="w-full py-4 sm:py-5">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-6 items-center md:items-start">
              {/* HOME side card */}
              <div className="card-retro p-3 sm:p-4 border-2 border-[var(--neon-green)] bg-gradient-to-br from-[#0c2e1b]/95 to-[#04140b]/95 shadow-[0_0_15px_rgba(0,255,136,0.15)] w-full">
                <div className="font-pixel text-[7px] sm:text-[8px] text-[var(--neon-green)] tracking-widest mb-2">YOU</div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div>
                    <div className="font-pixel text-xs sm:text-sm text-white">{fcA.code}</div>
                    <div className="font-pixel text-[8px] sm:text-[10px] text-[var(--text-muted)]">{starA.shortName}</div>
                  </div>
                  <img src={getFlagUrl(fcA.countryName)} alt={fcA.code} className="w-8 h-5 sm:w-10 sm:h-7 object-cover rounded-sm border border-white/20" />
                </div>
                <div className="font-pixel text-[7px] sm:text-[8px] text-[var(--neon-green)] mb-2.5">✦ {starA.specialMove}</div>
                {/* Stat bars */}
                <div className="space-y-1.5">
                  {[
                    { label: 'ATK', value: starA.shooting, color: '#00ff88' },
                    { label: 'DEF', value: starA.physical, color: '#00e5ff' },
                    { label: 'PAC', value: starA.pace, color: '#ffe600' },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-2">
                      <span className="font-pixel text-[7px] sm:text-[8px] text-[var(--text-muted)] w-6 shrink-0">{s.label}</span>
                      <div className="flex-1 h-2 sm:h-2.5 bg-white/8 rounded-sm overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${s.value}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className="h-full rounded-sm"
                          style={{ backgroundColor: s.color }}
                        />
                      </div>
                      <span className="font-pixel text-[8px] sm:text-[10px] text-white w-6 text-right shrink-0">{s.value}</span>
                    </div>
                  ))}
                </div>

                {/* ── HOME TACTIC ── */}
                <div className="mt-3.5 pt-2 border-t border-white/10">
                  <div className="font-pixel text-[7px] text-[var(--neon-green)] mb-1.5 tracking-wider">YOUR TACTIC</div>
                  <div className="flex gap-1">
                    {TACTICS.map(t => (
                      <button
                        key={`h-t-${t.value}`}
                        onClick={() => setTacticA(t.value)}
                        className={`font-pixel text-[8px] px-2.5 py-1 border transition-all ${
                          tacticA === t.value
                            ? 'border-[var(--neon-green)] text-[var(--neon-green)] bg-[var(--neon-green)]/15 shadow-[0_0_6px_rgba(0,255,136,0.2)]'
                            : 'border-white/10 text-[var(--text-muted)] hover:border-white/20'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* CENTER — VS + Kick Off */}
              <div className="flex flex-col items-center gap-2 sm:gap-3 pt-2 px-1 w-full">
                <div className="font-pixel text-lg sm:text-2xl text-[var(--neon-green)] glow-green tracking-widest">VS</div>
                <div className="flex flex-row md:flex-col items-center justify-center gap-2.5 w-full md:w-32 mx-auto">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleKickOff}
                    disabled={fcA.code === fcB.code}
                    className="flex-1 md:flex-none w-full h-8 sm:h-9.5 btn-neon text-[8px]! sm:text-[9px]! whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span className="text-[var(--neon-green)]">▶</span> KICK OFF
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.08, rotate: [0, -5, 5, -5, 0] }}
                    whileTap={{ scale: 0.95 }}
                    onClick={randomTeams}
                    className="flex-1 md:flex-none w-full h-8 sm:h-9.5 font-pixel text-[8px]! sm:text-[9px]! border-2 border-[var(--neon-cyan)] text-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10 hover:bg-[var(--neon-cyan)]/25 rounded-sm shadow-[0_0_10px_rgba(0,229,255,0.25)] transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer"
                  >
                    🎲 SHUFFLE
                  </motion.button>
                </div>
                {fcA.code === fcB.code && (
                  <p className="font-retro text-[10px] text-[var(--neon-yellow)] text-center">Pick two different teams</p>
                )}
              </div>

              {/* AWAY side card */}
              <div className="card-retro p-3 sm:p-4 border-2 border-[var(--neon-magenta)] bg-gradient-to-br from-[#3b0c15]/95 to-[#1a0408]/95 shadow-[0_0_15px_rgba(255,0,255,0.15)] w-full">
                <div className="font-pixel text-[7px] sm:text-[8px] text-[var(--neon-magenta)] tracking-widest mb-2">OPPONENT</div>
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <div className="font-pixel text-xs sm:text-sm text-white">{fcB.code}</div>
                    <div className="font-pixel text-[8px] sm:text-[10px] text-[var(--text-muted)]">{starB.shortName}</div>
                  </div>
                  <img src={getFlagUrl(fcB.countryName)} alt={fcB.code} className="w-8 h-5 sm:w-10 sm:h-7 object-cover rounded-sm border border-white/20" />
                </div>
                <div className="font-pixel text-[7px] sm:text-[8px] text-[var(--neon-magenta)] mb-2.5">✦ {starB.specialMove}</div>
                {/* Stat bars */}
                <div className="space-y-1.5">
                  {[
                    { label: 'ATK', value: starB.shooting, color: '#ff00ff' },
                    { label: 'DEF', value: starB.physical, color: '#00e5ff' },
                    { label: 'PAC', value: starB.pace, color: '#ffe600' },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-2">
                      <span className="font-pixel text-[7px] sm:text-[8px] text-[var(--text-muted)] w-6 shrink-0">{s.label}</span>
                      <div className="flex-1 h-2 sm:h-2.5 bg-white/8 rounded-sm overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${s.value}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className="h-full rounded-sm"
                          style={{ backgroundColor: s.color }}
                        />
                      </div>
                      <span className="font-pixel text-[8px] sm:text-[10px] text-white w-6 text-right shrink-0">{s.value}</span>
                    </div>
                  ))}
                </div>

                {/* ── AWAY TACTIC ── */}
                <div className="mt-3.5 pt-2 border-t border-white/10">
                  <div className="font-pixel text-[7px] text-[var(--neon-magenta)] mb-1.5 tracking-wider">OPPONENT TACTIC</div>
                  <div className="flex gap-1">
                    {TACTICS.map(t => (
                      <button
                        key={`a-t-${t.value}`}
                        onClick={() => setTacticB(t.value)}
                        className={`font-pixel text-[8px] px-2.5 py-1 border transition-all ${
                          tacticB === t.value
                            ? 'border-[var(--neon-magenta)] text-[var(--neon-magenta)] bg-[var(--neon-magenta)]/15 shadow-[0_0_6px_rgba(255,0,255,0.2)]'
                            : 'border-white/10 text-[var(--text-muted)] hover:border-white/20'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main content ──────────────────────── */}
        <div className="flex-1 py-4 space-y-5">
          {/* ── SELECT HOME SQUAD ─────────────────────────── */}
          <div>
            <div className="font-pixel text-[9px] sm:text-[10px] text-[var(--neon-green)] tracking-widest mb-2">SELECT YOUR SQUAD</div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 sm:gap-2">
              {FC_TEAMS.map(fc => (
                <button
                  key={`h-${fc.code}`}
                  onClick={() => setFcA(fc)}
                  className={`card-retro !rounded-sm p-1.5 sm:p-2 text-center transition-all border-2 hover:!border-white/30 ${
                    fcA.code === fc.code
                      ? '!border-[var(--neon-green)] bg-[var(--neon-green)]/10 shadow-[0_0_8px_rgba(0,255,136,0.3)]'
                      : '!border-transparent'
                  }`}
                >
                  <img src={getFlagUrl(fc.countryName)} alt={fc.code} className="w-7 h-5 sm:w-9 sm:h-6 object-cover rounded-sm mx-auto mb-1 border border-white/15" />
                  <div className="font-pixel text-[7px] sm:text-[8px] text-white">{fc.code}</div>
                </button>
              ))}
            </div>
          </div>

          {/* ── SELECT AWAY SQUAD ─────────────────────────── */}
          <div>
            <div className="font-pixel text-[9px] sm:text-[10px] text-[var(--neon-magenta)] tracking-widest mb-2">SELECT OPPONENT SQUAD</div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 sm:gap-2">
              {FC_TEAMS.map(fc => (
                <button
                  key={`a-${fc.code}`}
                  onClick={() => setFcB(fc)}
                  className={`card-retro !rounded-sm p-1.5 sm:p-2 text-center transition-all border-2 hover:!border-white/30 ${
                    fcB.code === fc.code
                      ? '!border-[var(--neon-magenta)] bg-[var(--neon-magenta)]/10 shadow-[0_0_8px_rgba(255,0,255,0.3)]'
                      : '!border-transparent'
                  }`}
                >
                  <img src={getFlagUrl(fc.countryName)} alt={fc.code} className="w-7 h-5 sm:w-9 sm:h-6 object-cover rounded-sm mx-auto mb-1 border border-white/15" />
                  <div className="font-pixel text-[7px] sm:text-[8px] text-white">{fc.code}</div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Player Rosters — side by side ─────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* HOME PLAYER */}
            <div className="card-retro p-3">
              <div className="font-pixel text-[8px] sm:text-[9px] text-[var(--neon-green)] tracking-widest mb-2">YOUR PLAYER</div>
              {fcA.squad.map((sp, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between py-1.5 px-2 border-b border-white/5 last:border-0 transition-colors ${
                    i === 0 ? 'bg-[var(--neon-green)]/8 border-l-2 border-l-[var(--neon-green)]' : ''
                  }`}
                >
                  <span className={`font-pixel text-[8px] sm:text-[9px] ${i === 0 ? 'text-[var(--neon-green)]' : 'text-white'}`}>{sp.shortName}</span>
                  <div className="flex items-center gap-1">
                    <span className="font-pixel text-[8px] text-[var(--text-muted)]">OVR</span>
                    <span className={`font-pixel text-[9px] sm:text-[10px] font-bold ${sp.overall >= 85 ? 'text-[var(--neon-green)]' : sp.overall >= 80 ? 'text-[var(--neon-cyan)]' : 'text-[var(--neon-yellow)]'}`}>
                      {sp.overall}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {/* AWAY PLAYER */}
            <div className="card-retro p-3">
              <div className="font-pixel text-[8px] sm:text-[9px] text-[var(--neon-magenta)] tracking-widest mb-2">OPPONENT PLAYER</div>
              {fcB.squad.map((sp, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between py-1.5 px-2 border-b border-white/5 last:border-0 transition-colors ${
                    i === 0 ? 'bg-[var(--neon-magenta)]/8 border-l-2 border-l-[var(--neon-magenta)]' : ''
                  }`}
                >
                  <span className={`font-pixel text-[8px] sm:text-[9px] ${i === 0 ? 'text-[var(--neon-magenta)]' : 'text-white'}`}>{sp.shortName}</span>
                  <div className="flex items-center gap-1">
                    <span className="font-pixel text-[8px] text-[var(--text-muted)]">OVR</span>
                    <span className={`font-pixel text-[9px] sm:text-[10px] font-bold ${sp.overall >= 85 ? 'text-[var(--neon-green)]' : sp.overall >= 80 ? 'text-[var(--neon-cyan)]' : 'text-[var(--neon-yellow)]'}`}>
                      {sp.overall}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Pre-match — Kickoff screen (competitor style) ──────────────
  if (phase === 'prematch') {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0a0e1a] bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:18px_18px] flex flex-col overflow-hidden w-full px-4 sm:px-8">
        {/* ── Top scoreboard bar ── */}
        <div className="bg-[var(--bg-secondary)] border-b border-white/10 px-2.5 py-2 shrink-0 rounded-b-md">
          <div className="flex items-center justify-between w-full">
            {/* BACK + HOME player */}
            <div className="flex items-center gap-1.5 sm:gap-3 flex-1 min-w-0">
              <button onClick={playAgain} className="font-pixel text-[8px] px-2 py-1 border border-[var(--neon-yellow)]/40 text-[var(--neon-yellow)] hover:bg-[var(--neon-yellow)]/15 transition-colors shrink-0">
                ←
              </button>
              <div className="flex items-center gap-1 min-w-0">
                <span className="font-pixel text-[9px] sm:text-[10px] text-[var(--text-muted)] shrink-0 hidden sm:inline">{fcA.code}</span>
                <img src={getFlagUrl(fcA.countryName)} alt={fcA.code} className="w-5 h-3.5 rounded-sm shrink-0" />
                <div className="min-w-0 hidden md:block">
                  <div className="font-pixel text-[10px] sm:text-xs text-white truncate">{fcA.squad[0].shortName}</div>
                  <div className="font-pixel text-[7px] text-[var(--text-muted)]">{fcA.name}</div>
                </div>
              </div>
            </div>
            
            {/* LED Scoreboard Card */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0 bg-black/60 px-3 sm:px-4 py-1 border border-white/10 rounded shadow-[0_0_12px_rgba(255,255,255,0.05)]">
              <div className="flex items-center gap-1.5">
                <span className="font-pixel text-[8px] text-[var(--text-muted)] tracking-wider hidden sm:inline">YOU</span>
                <span className="font-pixel text-[9px] text-white font-bold sm:hidden">{fcA.code}</span>
                <div className="font-pixel text-xl sm:text-xl px-2 py-0.5 bg-[#080a10] border border-white/15 text-[var(--neon-green)] glow-green rounded-sm font-bold min-w-[28px] sm:min-w-[32px] text-center">
                  0
                </div>
              </div>
              <div className="flex flex-col items-center justify-center bg-black/80 px-1.5 sm:px-2 py-0.5 border border-white/5 rounded-sm min-w-[30px] sm:min-w-[40px]">
                <span className="font-pixel text-[8px] text-[var(--neon-cyan)] glow-cyan font-bold">VS</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="font-pixel text-xl sm:text-xl px-2 py-0.5 bg-[#080a10] border border-white/15 text-[var(--neon-magenta)] glow-magenta rounded-sm font-bold min-w-[28px] sm:min-w-[32px] text-center">
                  0
                </div>
                <span className="font-pixel text-[9px] text-white font-bold sm:hidden">{fcB.code}</span>
                <span className="font-pixel text-[8px] text-[var(--text-muted)] tracking-wider hidden sm:inline">OPPONENT</span>
              </div>
            </div>

            {/* AWAY player */}
            <div className="flex items-center justify-end gap-1 sm:gap-1.5 flex-1 min-w-0">
              <div className="min-w-0 text-right hidden md:block">
                <div className="font-pixel text-[10px] sm:text-xs text-white truncate">{fcB.squad[0].shortName}</div>
                <div className="font-pixel text-[7px] text-[var(--text-muted)]">{fcB.name}</div>
              </div>
              <img src={getFlagUrl(fcB.countryName)} alt={fcB.code} className="w-5 h-3.5 rounded-sm shrink-0" />
              <span className="font-pixel text-[9px] sm:text-[10px] text-[var(--text-muted)] shrink-0 hidden sm:inline">{fcB.code}</span>
            </div>
          </div>
        </div>

        {/* ── Tactic selector + Kick Off bar — Removed description ── */}
        <div className="bg-[var(--bg-secondary)]/60 border-b border-white/10 px-3 py-2 sm:py-2.5 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 w-full">
            <div className="text-center sm:text-left">
              <div className="font-pixel text-[8px] sm:text-[9px] text-[var(--neon-cyan)] tracking-widest uppercase">CHOOSE YOUR TACTIC</div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
              <div className="flex gap-1">
                {TACTICS.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setTacticA(t.value)}
                    className={`font-pixel text-[8px] sm:text-[9px] px-2.5 py-1.5 border transition-all cursor-pointer ${
                      tacticA === t.value
                        ? 'border-[var(--neon-green)] text-[var(--neon-green)] bg-[var(--neon-green)]/15 shadow-[0_0_6px_rgba(0,255,136,0.15)] font-bold'
                        : 'border-white/10 text-[var(--text-muted)] hover:border-white/20 bg-black/15'
                    }`}
                  >
                    {tacticA === t.value ? '◆ ' : ''}{t.label}
                  </button>
                ))}
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startMatch}
                className="btn-neon px-4 sm:px-6 py-1.5 sm:py-2 text-[8px]! sm:text-[10px]! whitespace-nowrap cursor-pointer flex-1 sm:flex-none text-center"
              >
                ⚽ KICK OFF!
              </motion.button>
            </div>
          </div>
        </div>

        {/* ── Pitch ──────────────────────────────────────── */}
        <div className="flex-1 relative min-h-0">
          <PitchTopDown
            playerA={playerA} playerB={playerB}
            teamA={teamA} teamB={teamB}
            frameA="idle" frameB="idle"
            ballX={0} phase="idle" kind={undefined}
          />
        </div>

        {/* ── Commentary ticker ──────────────────────────── */}
        <div className="bg-[var(--bg-secondary)]/90 border-t border-white/10 px-4 py-2 shrink-0">
          <div className="w-full">
            <p className="font-pixel text-[9px] sm:text-[10px] text-[var(--text-muted)]">
              <span className="text-[var(--neon-cyan)] mr-2">▸▸</span>
              OFFLINE · AGENT vs AGENT — PRESS KICK OFF
            </p>
          </div>
        </div>

        {/* ── Bottom player stats panel ──────────────────── */}
        <div className="bg-transparent border-t border-white/10 py-2 sm:py-3 shrink-0">
          <div className="w-full flex flex-row items-center gap-2 sm:gap-4">
            <PlayerCardBottom player={playerA} team={teamA} fc={fcA} side="left" />
            <div className="flex items-center justify-center shrink-0">
              <span className="font-pixel text-xs sm:text-lg text-[var(--neon-yellow)] glow-yellow font-bold select-none">VS</span>
            </div>
            <PlayerCardBottom player={playerB} team={teamB} fc={fcB} side="right" />
          </div>
        </div>
      </div>
    )
  }

  // ── Match / Result phase — COMPETITOR STYLE ───────────────────
  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0e1a] bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:18px_18px] flex flex-col overflow-hidden w-full px-4 sm:px-8">
      {/* ── Top scoreboard bar ── */}
      <div className="bg-[var(--bg-secondary)] border-b border-white/10 px-2.5 py-1.5 shrink-0 rounded-b-md">
        <div className="flex items-center justify-between w-full">
          {/* BACK + HOME player */}
          <div className="flex items-center gap-1.5 sm:gap-3 flex-1 min-w-0">
            <button
              onClick={handleLeaveAttempt}
              className="font-pixel text-[8px] px-2 py-1 border border-[var(--neon-yellow)]/40 text-[var(--neon-yellow)] hover:bg-[var(--neon-yellow)]/15 transition-colors shrink-0"
            >
              ←
            </button>
            <div className="flex items-center gap-1 min-w-0">
              <span className="font-pixel text-[9px] sm:text-[10px] text-[var(--text-muted)] shrink-0 hidden sm:inline">{fcA.code}</span>
              <img src={getFlagUrl(fcA.countryName)} alt={fcA.code} className="w-5 h-3.5 rounded-sm shrink-0" />
              <div className="min-w-0 hidden md:block">
                <div className="font-pixel text-[10px] sm:text-xs text-white truncate">{fcA.squad[0].shortName}</div>
              </div>
            </div>
          </div>
          
          {/* LED Digital Scoreboard Card */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 bg-black/60 px-3 sm:px-4 py-1 border border-white/10 rounded shadow-[0_0_12px_rgba(255,255,255,0.05)]">
            <div className="flex items-center gap-1.5">
              <span className="font-pixel text-[8px] text-[var(--text-muted)] tracking-wider hidden sm:inline">YOU</span>
              <span className="font-pixel text-[9px] text-white font-bold sm:hidden">{fcA.code}</span>
              <div className="font-pixel text-xl sm:text-2xl px-2.5 py-0.5 bg-[#080a10] border border-white/15 text-[var(--neon-green)] glow-green rounded-sm font-bold min-w-[32px] sm:min-w-[36px] text-center">
                {scoreA}
              </div>
            </div>
            <div className="flex flex-col items-center justify-center bg-black/85 px-1.5 sm:px-2.5 py-0.5 border border-white/5 rounded-sm min-w-[35px] sm:min-w-[45px]">
              <span className="font-pixel text-[8px] sm:text-[9px] text-[var(--neon-yellow)] glow-yellow font-bold">
                {phase === 'result' ? 'FT' : `${matchMinute}'`}
              </span>
              <span className="font-pixel text-[5px] text-[var(--text-muted)] tracking-widest mt-0.5">
                {matchMinute <= 45 ? '1ST H' : '2ND H'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="font-pixel text-xl sm:text-2xl px-2.5 py-0.5 bg-[#080a10] border border-white/15 text-[var(--neon-magenta)] glow-magenta rounded-sm font-bold min-w-[32px] sm:min-w-[36px] text-center">
                {scoreB}
              </div>
              <span className="font-pixel text-[9px] text-white font-bold sm:hidden">{fcB.code}</span>
              <span className="font-pixel text-[8px] text-[var(--text-muted)] tracking-wider hidden sm:inline">OPPONENT</span>
            </div>
          </div>

          {/* AWAY player */}
          <div className="flex items-center justify-end gap-1 sm:gap-1.5 flex-1 min-w-0">
            <div className="min-w-0 text-right hidden md:block">
              <div className="font-pixel text-[10px] sm:text-xs text-white truncate">{fcB.squad[0].shortName}</div>
            </div>
            <img src={getFlagUrl(fcB.countryName)} alt={fcB.code} className="w-5 h-3.5 rounded-sm shrink-0" />
            <span className="font-pixel text-[9px] sm:text-[10px] text-[var(--text-muted)] shrink-0 hidden sm:inline">{fcB.code}</span>
          </div>
        </div>
      </div>

      {/* ── Pitch area ────────────────────────────────── */}
      <div className={`flex-1 relative min-h-0 ${shaking ? 'animate-shake' : ''}`}>
        <PitchTopDown
          playerA={playerA} playerB={playerB}
          teamA={teamA} teamB={teamB}
          frameA={frameA} frameB={frameB}
          ballX={ballX} phase={pitchPhase} kind={beatKind}
        />
        {/* On-pitch overlay — xG + minute (left) */}
        <div className="absolute top-2 left-2 card-retro !bg-black/75 p-2 max-w-[140px] sm:max-w-[180px] border border-white/10 rounded-sm">
          <div className="font-pixel text-[7px] text-[var(--neon-cyan)] mb-1">◈ ON THE BALL</div>
          <div className="flex items-center gap-2 mb-1">
            <div className="font-pixel text-lg sm:text-xl text-[var(--neon-green)]">{goalChance}<span className="text-[8px] text-[var(--text-muted)]">%</span></div>
            <div>
              <div className="font-pixel text-sm sm:text-base text-white">{matchMinute}&apos;</div>
              <div className="font-pixel text-[6px] text-[var(--text-muted)]">{matchMinute <= 45 ? '1ST HALF' : '2ND HALF'}</div>
            </div>
          </div>
          <div className="font-pixel text-[7px] text-[var(--text-muted)] leading-tight">{commentary}</div>
        </div>
        {/* On-pitch overlay — 0G AI (right) */}
        <div className="absolute top-2 right-2 card-retro !bg-black/75 p-2 border border-white/10 rounded-sm">
          <div className="font-pixel text-[7px] text-[var(--neon-green)] mb-1">⚡ 0G AI <span className="text-[var(--neon-cyan)]">✓</span></div>
          <div className="flex gap-0.5">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1, delay: i * 0.3 }}
                className="w-1.5 h-1.5 rounded-full bg-[var(--neon-green)]"
              />
            ))}
          </div>
        </div>
        {/* Speed control — bottom right */}
        <div className="absolute bottom-2 right-2 flex gap-1">
          <button
            onClick={() => setSpeed(s => s === 1 ? 2 : 1)}
            className="font-pixel text-[8px] px-2.5 py-1 bg-black/70 border border-white/20 text-[var(--text-muted)] hover:text-white rounded transition-colors"
          >
            {speed}x
          </button>
        </div>
      </div>

      {/* ── Commentary ticker ──────────────────────────── */}
      <div className="bg-[var(--bg-secondary)]/90 border-t border-white/10 px-4 py-2 shrink-0">
        <div className="w-full">
          <p className="font-pixel text-[9px] sm:text-[10px] text-white">
            <span className="text-[var(--neon-cyan)] mr-2">▸▸</span>
            {commentary || 'Match in progress...'}
          </p>
        </div>
      </div>

      {/* ── Bottom player stats panel ──────────────────── */}
      <div className="bg-transparent border-t border-white/10 py-2 sm:py-3 shrink-0">
        <div className="w-full flex flex-row items-center gap-2 sm:gap-4">
          <PlayerCardBottom player={playerA} team={teamA} fc={fcA} side="left" />
          <div className="flex items-center justify-center shrink-0">
            <span className="font-pixel text-xs sm:text-lg text-[var(--neon-yellow)] glow-yellow font-bold select-none">VS</span>
          </div>
          <PlayerCardBottom player={playerB} team={teamB} fc={fcB} side="right" />
        </div>
      </div>

      {/* ── Leave match confirmation modal ───────────── */}
      <AnimatePresence>
        {showLeaveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="card-retro p-6 w-full max-w-xs mx-4 text-center border-t-3! border-t-[var(--neon-yellow)]! bg-gradient-to-b from-[#1a1c2e] to-[#0c0d1a]"
            >
              <h2 className="font-pixel text-sm text-[var(--neon-yellow)] glow-yellow mb-3">LEAVE MATCH?</h2>
              <p className="font-pixel text-[8px] text-[var(--text-muted)] leading-relaxed mb-1">THE MATCH WILL BE CANCELLED</p>
              <p className="font-pixel text-[8px] text-[var(--text-muted)] leading-relaxed mb-5">AND PROGRESS WILL BE LOST</p>
              <div className="space-y-2">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowLeaveModal(false)}
                  className="btn-neon w-full text-[9px]!"
                >
                  KEEP PLAYING
                </motion.button>
                <button
                  onClick={playAgain}
                  className="font-pixel text-[8px] w-full py-2 border border-[var(--neon-yellow)]/40 text-[var(--neon-yellow)] hover:bg-[var(--neon-yellow)]/10 transition-colors"
                >
                  LEAVE ANYWAY
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Result overlay ───────────────────────────── */}
      <AnimatePresence>
        {phase === 'result' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={`card-retro p-5 sm:p-6 w-full max-w-lg mx-4 my-auto border-t-4 bg-gradient-to-b from-[#131b31] to-[#0a0d18] shadow-2xl transition-all max-h-[92vh] overflow-y-auto ${
                rainCancelled 
                  ? 'border-[var(--neon-yellow)] shadow-[0_0_30px_rgba(255,230,0,0.25)]' 
                  : scoreA > scoreB 
                    ? 'border-[var(--neon-green)] shadow-[0_0_30px_rgba(0,255,136,0.25)]' 
                    : scoreB > scoreA 
                      ? 'border-[var(--neon-magenta)] shadow-[0_0_30px_rgba(255,0,255,0.25)]'
                      : 'border-[var(--neon-cyan)] shadow-[0_0_30px_rgba(0,229,255,0.25)]'
              }`}
            >
              {rainCancelled ? (
                <>
                  <h2 className="font-pixel text-sm text-center text-[var(--neon-yellow)] glow-yellow mb-3">
                    MATCH CANCELLED
                  </h2>
                  <div className="text-center mb-5">
                    <div className="font-pixel text-3xl mb-2">🌧</div>
                    <p className="font-retro text-xs text-[var(--text-muted)]">
                      Heavy rain has flooded the pitch. Match abandoned.
                    </p>
                    <p className="font-pixel text-[8px] text-[var(--neon-cyan)] mt-1.5">10% RAIN PROBABILITY</p>
                  </div>
                </>
              ) : result && (
                <>
                  <h2 className="font-pixel text-base text-center text-[var(--neon-yellow)] glow-yellow mb-4 tracking-widest">
                    MATCH RESULT
                  </h2>
                  
                  {/* Visual scoreboard */}
                  <div className="flex items-center justify-between gap-4 bg-black/45 p-4 rounded-sm border border-white/10 mb-5">
                    <div className="text-center flex-1">
                      <img src={getFlagUrl(fcA.countryName)} alt={fcA.code} className="w-12 h-8 object-cover rounded-sm border border-white/20 mx-auto mb-1.5" />
                      <div className="font-pixel text-[10px] font-bold" style={{ color: teamA.primaryColor }}>{fcA.code}</div>
                      <div className="font-pixel text-[6px] text-[var(--text-muted)] mt-0.5 truncate max-w-[100px] mx-auto">{playerA.shortName}</div>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <div className="font-pixel text-3xl text-white tracking-wider font-bold">
                        {scoreA} — {scoreB}
                      </div>
                      <div className="font-pixel text-[8px] text-[var(--text-muted)] mt-1 tracking-widest">FINAL SCORE</div>
                    </div>

                    <div className="text-center flex-1">
                      <img src={getFlagUrl(fcB.countryName)} alt={fcB.code} className="w-12 h-8 object-cover rounded-sm border border-white/20 mx-auto mb-1.5" />
                      <div className="font-pixel text-[10px] font-bold" style={{ color: teamB.primaryColor }}>{fcB.code}</div>
                      <div className="font-pixel text-[6px] text-[var(--text-muted)] mt-0.5 truncate max-w-[100px] mx-auto">{playerB.shortName}</div>
                    </div>
                  </div>

                  <div className="font-pixel text-[11px] text-center mb-5 font-bold tracking-wide">
                    {scoreA === scoreB ? (
                      <span className="text-[var(--neon-cyan)] glow-cyan">THE MATCH ENDED IN A DRAW!</span>
                    ) : (
                      <span style={{ color: scoreA > scoreB ? teamA.primaryColor : teamB.primaryColor }}>
                        🎉 {scoreA > scoreB ? fcA.code : fcB.code} WINS the Head2Head battle!
                      </span>
                    )}
                  </div>

                  {/* Match Stats Grid */}
                  <div className="space-y-2 bg-black/25 p-3 rounded-sm border border-white/5 mb-5">
                    <StatRow label="GOALS" a={scoreA} b={scoreB} />
                    <StatRow label="POSSESSIONS" a={result.possessions.filter(po => po.attackerId === playerA.id).length} b={result.possessions.filter(po => po.attackerId === playerB.id).length} />
                    <StatRow label="SHOTS ON TARGET"
                      a={result.possessions.filter(po => po.attackerId === playerA.id && po.plays.some(pl => pl.action === 'shoot' || pl.action === 'special')).length}
                      b={result.possessions.filter(po => po.attackerId === playerB.id && po.plays.some(pl => pl.action === 'shoot' || pl.action === 'special')).length}
                    />
                  </div>

                  {/* ── 0G Storage Status ──────────────── */}
                  <div className="card-retro py-2.5 px-3 border-l-2! border-l-[var(--neon-cyan)]! bg-black/45 mb-5 flex items-center justify-between gap-2">
                    <span className="font-pixel text-[7px] sm:text-[8px] text-[var(--neon-cyan)] tracking-wider flex items-center gap-1 uppercase select-none">
                      ⛓ ONCHAIN RECORD ON 0G
                    </span>
                    <span className="font-pixel text-[6px] sm:text-[7px] text-[var(--neon-green)] font-bold uppercase tracking-wider select-none">
                      POWERED BY 0G CHAIN
                    </span>
                  </div>
                </>
              )}
              
              <div className="flex gap-2">
                <Link href="/" className="flex-1">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full font-pixel text-[9px] sm:text-[10px] py-2.5 border-2 border-white/10 hover:border-white/20 text-white bg-white/5 hover:bg-white/10 rounded-sm transition-all text-center uppercase cursor-pointer h-10 flex items-center justify-center"
                  >
                    HOME
                  </motion.button>
                </Link>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={playAgain}
                  className="flex-1 btn-neon text-[9px]! sm:text-[10px]! cursor-pointer py-2.5 h-10 flex items-center justify-center"
                >
                  PLAY AGAIN
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StatRow({ label, a, b }: { label: string; a: number; b: number }) {
  return (
    <div className="space-y-1.5 py-1">
      <div className="flex items-center justify-between text-center select-none px-0.5">
        <span className="font-pixel text-[8px] sm:text-[9px] text-[var(--neon-green)] font-bold">{a}</span>
        <span className="font-pixel text-[7px] text-[var(--text-muted)] tracking-wider uppercase">{label}</span>
        <span className="font-pixel text-[8px] sm:text-[9px] text-[var(--neon-magenta)] font-bold">{b}</span>
      </div>
      <div className="flex h-2 gap-px bg-white/5 rounded-sm overflow-hidden w-full">
        <div className="h-full bg-[var(--neon-green)]" style={{ width: `${a + b > 0 ? (a / (a + b)) * 100 : 50}%` }} />
        <div className="h-full bg-[var(--neon-magenta)]" style={{ width: `${a + b > 0 ? (b / (a + b)) * 100 : 50}%` }} />
      </div>
    </div>
  )
}
