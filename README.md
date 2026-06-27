<p align="center">
  <img src="https://img.shields.io/badge/0G-Zero%20Cup%20Hackathon-7C3AED?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSIxMiIgeT0iMTYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IndoaXRlIj4wRzwvdGV4dD48L3N2Zz4=" alt="0G Zero Cup"/>
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js" alt="Next.js 16"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" alt="React 19"/>
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License"/>
</p>

<h1 align="center">ZeroCall</h1>

<p align="center">
  <b>Predict the World Cup. Beat the AI. Prove it on-chain.</b>
</p>

<p align="center">
  A retro-arcade football prediction oracle where humans compete against six AI agents across every FIFA World Cup 2026 fixture. Every prediction is cryptographically anchored to the <a href="https://0g.ai">0G Network</a> for tamper-proof, verifiable proof-of-foresight.
</p>

<p align="center">
  <a href="https://0g.ai/arena/zero-cup">Built for the 0G Arena Zero Cup Hackathon</a>
</p>

---

## The Problem

Prediction markets and social media predictions have zero accountability. Anyone can claim they "called it" after the fact. There is no timestamped, tamper-proof record that a prediction was made *before* the event happened.

## The Solution

ZeroCall solves this by combining real-time AI inference with decentralized data anchoring:

1. **You predict** a match outcome and exact score before kickoff
2. **Your prediction is hashed into a Merkle tree** and uploaded to 0G Storage at the moment of submission
3. **The storage hash becomes your receipt** — a verifiable, immutable proof that your call was locked before the whistle blew
4. **Six AI agents make their own predictions** via 0G Compute, creating a benchmark you compete against

No edits. No deletions. No "I told you so" without proof.

---

## 0G Integration Deep Dive

This project leverages two core pillars of the 0G ecosystem:

### 0G Storage (Data Availability Layer)

Every prediction submitted through ZeroCall is packaged as a JSON payload containing the predictor identity, match ID, predicted outcome, predicted score, and a UTC timestamp. This payload is:

1. Written to a temporary file on the server
2. Processed into a **Merkle tree** using the `@0glabs/0g-ts-sdk`
3. Uploaded to 0G Storage via the Galileo Testnet indexer
4. The resulting **root hash** is returned to the client as an immutable storage reference

The root hash links directly to the 0G StorageScan explorer, where anyone can independently verify the prediction data. See [`src/lib/storage.ts`](src/lib/storage.ts).

### 0G Compute (Decentralized AI Inference)

Six AI agents generate predictions for every fixture using decentralized inference through 0G Compute. Each agent sends a structured prompt to the `qwen/qwen-2.5-7b-instruct` model via the 0G Compute API (`router-api.0g.ai/v1`) with a unique system persona. Temperature settings vary per agent personality — from 0.3 (conservative Sage/Knox) to 0.95 (chaotic Ronin). See [`src/lib/agents.ts`](src/lib/agents.ts).

Match simulation results from the Agent Arena are also anchored to 0G Storage, creating a full audit trail of every AI-vs-AI battle.

---

## Features

### Global Arena
The main prediction hub. Browse all World Cup 2026 group stage fixtures, submit your outcome and exact score predictions, and watch your calls get locked to 0G in real-time. A countdown timer tracks the next kickoff, and completed matches reveal results alongside your accuracy.

### Six AI Agents

| Agent | Avatar | Strategy |
|-------|--------|----------|
| **Vega** | ✨ | Balanced analyst — form, rankings, matchup history |
| **Ronin** | 🃏 | Upset specialist — backs underdogs, thrives on chaos |
| **Sage** | 📊 | Pure statistics — xG, rankings, H2H data only |
| **Halo** | 🔥 | Narrative-driven — momentum, destiny, tournament magic |
| **Knox** | 🛡️ | Defensive realist — expects low-scoring tactical grinds |
| **Phoenix** | 🚀 | Form chaser — backs teams on winning streaks |

### Agent vs Agent Match Simulator
Pick two AI agents, choose tactics (Attack / Balanced / Defense), and watch them battle head-to-head in a possession-based football simulation rendered on Canvas 2D. Each agent's stats (ATK/DEF/MID/SPD/LUCK) and tactic modifiers determine dribble success, shot accuracy, and goal probability across 10 possessions. Match results are uploaded to 0G Storage.

### Penalty Shootout Minigame
A fully interactive penalty shootout with Canvas 2D rendering. Choose your shot direction and try to beat the AI goalkeeper. Score 3+ out of 5 to win the bonus. Each AI agent uses a different goalkeeping strategy.

### User Profile
Track your 0G PTS balance, prediction stats (rank, picks, accuracy, correct outcomes, exact scores), daily challenge progress, and full prediction history with 0G proof links.

### Daily Challenges
Two daily quests that reset each day:
- **Predict 1 match** — +20 0G PTS
- **Play Penalty Shootout** — +20 0G PTS

### Head-to-Head Comparisons
Pick any two predictors (human or AI) and view a match-by-match breakdown of their predictions, scores, and accuracy.

### Global Leaderboard
A unified ranking with accuracy tracking:

| Event | 0G PTS |
|-------|--------|
| Correct outcome (home/draw/away) | +15 |
| Exact score match | +10 bonus |
| **Maximum per match** | **25** |

The leaderboard shows points, correct outcomes, exact scores, and ACC% (accuracy percentage computed from scored picks).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) with React 19 and TypeScript 5 |
| **Styling** | Tailwind CSS 4 with custom retro CRT design system |
| **Animations** | Framer Motion for page transitions and micro-interactions |
| **2D Rendering** | Canvas 2D for match simulator and penalty shootout |
| **Web3 Wallet** | RainbowKit + Wagmi + Viem for wallet connect |
| **Blockchain SDK** | `@0glabs/0g-ts-sdk` + Ethers.js v6 for 0G Storage uploads |
| **AI Inference** | 0G Compute API (OpenAI-compatible chat completions) |
| **Effects** | Canvas Confetti for celebration moments |
| **Deployment** | Vercel |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A funded wallet on the 0G Galileo Testnet (get test tokens from [faucet.0g.ai](https://faucet.0g.ai))

### Installation

```bash
# Clone the repository
git clone https://github.com/sahilg28/zerocall.git
cd zerocall

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your keys

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `PRIVATE_KEY` | Wallet private key for 0G Storage uploads |
| `ZG_API_KEY` | 0G Compute API key for AI inference |
| `RPC_URL` | 0G Galileo Testnet RPC (defaults to `https://evmrpc-testnet.0g.ai`) |
| `STORAGE_INDEXER` | 0G Storage indexer URL (defaults to turbo endpoint) |
| `ZG_SERVICE_URL` | 0G Compute endpoint (defaults to `https://router-api.0g.ai/v1`) |
| `ZG_MODEL` | AI model ID (defaults to `qwen/qwen-2.5-7b-instruct`) |

---

## License

This project is open source under the [MIT License](LICENSE).

---

<p align="center">
  Built for the <a href="https://0g.ai/arena/zero-cup">0G Arena Zero Cup</a>
</p>
