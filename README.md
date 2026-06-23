<p align="center">
  <img src="https://img.shields.io/badge/0G-Zero%20Cup%20Hackathon-7C3AED?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSIxMiIgeT0iMTYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IndoaXRlIj4wRzwvdGV4dD48L3N2Zz4=" alt="0G Zero Cup"/>
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js" alt="Next.js 16"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" alt="React 19"/>
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Three.js-3D-000000?style=for-the-badge&logo=three.js" alt="Three.js"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License"/>
</p>

<h1 align="center">⚽ ZeroCall</h1>

<p align="center">
  <b>Predict the World Cup. Beat the AI. Prove it on-chain.</b>
</p>

<p align="center">
  A retro-arcade football prediction oracle where humans compete against six AI agents across every FIFA World Cup 2026 fixture. Every prediction is cryptographically anchored to the <a href="https://0g.ai">0G Network</a> for tamper-proof, verifiable proof-of-foresight. ⚡
</p>

<p align="center">
  <a href="https://0g.ai/arena/zero-cup">Built for the 0G Arena Zero Cup Hackathon</a> 🏆
</p>

---

## The Problem 🤔

Prediction markets and social media predictions have zero accountability. Anyone can claim they "called it" after the fact. There is no timestamped, tamper-proof record that a prediction was made *before* the event happened. ❌

## The Solution 💡

ZeroCall solves this by combining real-time AI inference with decentralized data anchoring:

1. **You predict** a match outcome and exact score before kickoff ⏰
2. **Your prediction is hashed into a Merkle tree** and uploaded to 0G Storage at the moment of submission 🔒
3. **The storage hash becomes your receipt** - a verifiable, immutable proof that your call was locked before the whistle blew 📜
4. **Six AI agents make their own predictions** via 0G Compute, creating a benchmark you compete against 🤖

No edits. No deletions. No "I told you so" without proof. 🎯

---

## 0G Integration Deep Dive 🔗

This project leverages two core pillars of the 0G ecosystem:

### 0G Storage (Data Availability Layer) 🗄️

Every prediction submitted through ZeroCall is packaged as a JSON payload containing the predictor's wallet address, match ID, predicted outcome, predicted score, and a UTC timestamp. This payload is:

1. Written to a temporary file on the server 📝
2. Processed into a **Merkle tree** using the `@0glabs/0g-ts-sdk` 🌳
3. Uploaded to 0G Storage via the Galileo Testnet indexer 📤
4. The resulting **root hash** is returned to the client as an immutable storage reference ✅

The root hash links directly to the 0G StorageScan explorer, where anyone can independently verify the prediction data. See the implementation in [`storage.ts`](src/lib/storage.ts). 🔍

### 0G Compute (Decentralized AI Inference) 🧠

Six AI agents generate predictions for every fixture using decentralized inference through 0G Compute. Each agent sends a structured prompt to the `qwen/qwen-2.5-7b-instruct` model with a unique system persona that shapes its analytical approach. The AI responses are parsed as structured JSON containing the predicted outcome, score, and reasoning. See the implementation in [`agents.ts`](src/lib/agents.ts). ⚙️

---

## Features 🎮

### Global Arena 🌍
The main prediction hub. Browse all World Cup 2026 group stage fixtures, submit your outcome and exact score predictions, and watch your calls get locked to 0G in real-time. A countdown timer tracks the next kickoff, and completed matches reveal results alongside your accuracy. 📊

### Agent Arena 🤖
Six autonomous AI predictors, each with a distinct personality and strategy:

| Agent | Avatar | Strategy |
|-------|--------|----------|
| **Vega** | ✨ | Balanced analyst weighing form, rankings, and matchup history evenly |
| **Ronin** | 🃏 | Upset specialist who backs underdogs and thrives on chaos |
| **Sage** | 📊 | Pure statistics engine driven by xG, rankings, and H2H data |
| **Halo** | 🔥 | Narrative-driven believer in momentum and tournament destiny |
| **Knox** | 🛡️ | Defensive realist expecting low-scoring tactical grinds |
| **Phoenix** | 🚀 | Hot-hand form chaser who backs teams on winning streaks |

Each agent generates predictions via 0G Compute with tuned temperature settings. Ronin runs at 0.95 temperature for maximum unpredictability. Sage and Knox run at 0.3 for conservative, data-driven outputs. 🎲

### Penalty Shootout Minigame ⚽
A fully interactive 3D penalty shootout built with Three.js. Choose your shot direction (5 zones), height (low/mid/high), and power. The AI goalkeeper uses agent-specific strategies to read your shooting patterns:

- **Vega** mirrors the opposite of your last shot 🪞
- **Sage** tracks your most common direction and plays percentages 📈
- **Phoenix** copies your exact last shot direction 🔄
- **Knox** always plants center, mid-height (the defensive realist) 🧱
- **Ronin** only dives to the extremes, left or right 💨
- **Halo** is pure 50/50 gut instinct every time 🎰

Score 3+ out of 5 to win, earn bonus leaderboard points. 🏅

### Head-to-Head Comparisons ⚔️
Pick any two predictors (human or AI) and view a match-by-match breakdown of their predictions, scores, and accuracy. See who had the better read on every completed fixture. 📋

### Global Leaderboard 🏆
A unified ranking system combining humans and AI agents. The scoring system awards:
- **3 points** for a correct outcome (home/draw/away) ✅
- **+2 bonus points** for an exact score prediction 🎯
- Tiebreakers resolved by exact score count 🥇

### Prophet Moment Celebrations 🔮
When you or an agent nails an upset prediction with the exact score, the app triggers a special "Prophet Moment" animation celebrating the call. 🎉

---

## Tech Stack 🛠️

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) with React 19 and TypeScript 5 |
| **Styling** | Tailwind CSS 4 with custom retro CRT design system |
| **Animations** | Framer Motion for page transitions and micro-interactions |
| **3D Engine** | Three.js for the penalty shootout simulation |
| **Web3 Wallet** | RainbowKit + Wagmi + Viem for wallet connect |
| **Blockchain SDK** | `@0glabs/0g-ts-sdk` + Ethers.js v6 for 0G Storage uploads |
| **AI Inference** | 0G Compute API (OpenAI-compatible chat completions) |
| **Effects** | Canvas Confetti for celebration moments |
| **Deployment** | Vercel |

---

## Project Structure 📁

```
zero_oracle/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing page with stats, next match, and mode cards
│   │   ├── layout.tsx            # Root layout with Nav, Ticker, CRT effects
│   │   ├── global/page.tsx       # Global prediction arena
│   │   ├── agents/page.tsx       # Agent arena with per-agent breakdowns
│   │   ├── penalty/page.tsx      # 3D penalty shootout minigame
│   │   ├── compare/page.tsx      # Head-to-head comparison tool
│   │   ├── leaderboard/page.tsx  # Unified global leaderboard
│   │   └── api/
│   │       ├── storage/route.ts  # POST endpoint: uploads picks to 0G Storage
│   │       └── agents/route.ts   # POST endpoint: generates AI predictions via 0G Compute
│   ├── components/               # 16 reusable UI components
│   │   ├── AppProvider.tsx       # Global state context provider
│   │   ├── PickModal.tsx         # Prediction submission modal with 0G locking
│   │   ├── MatchCard.tsx         # Individual match display card
│   │   ├── Leaderboard.tsx       # Shared leaderboard table component
│   │   ├── Nav.tsx               # Navigation with wallet connect and guest mode
│   │   ├── PressStart.tsx        # Retro arcade intro splash screen
│   │   └── ...                   # CountdownTimer, MatchTicker, ShareCard, etc.
│   ├── lib/
│   │   ├── storage.ts            # 0G Storage SDK integration (Merkle tree + upload)
│   │   ├── agents.ts             # AI agent personas and 0G Compute inference
│   │   ├── scoring.ts            # Points calculation and leaderboard builder
│   │   ├── store.ts              # Client-side state management (Context + localStorage)
│   │   ├── types.ts              # TypeScript interfaces and agent definitions
│   │   └── countries.ts          # Country flag URL utility
│   └── data/
│       └── matches.json          # World Cup 2026 group stage fixture data
├── .env.example                  # Environment variable template
├── package.json
└── LICENSE
```

---

## Getting Started 🚀

### Prerequisites

- Node.js 18+ 📦
- A funded wallet on the 0G Galileo Testnet (get test tokens from [faucet.0g.ai](https://faucet.0g.ai)) 💰

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/zero_oracle.git
cd zero_oracle

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your keys (see Environment Variables section below)

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. 🖥️

---

## Environment Variables ⚙️

Create a `.env` file in the root directory using `.env.example` as a template. **Never commit your `.env` file to version control.** 🔐

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `RPC_URL` | No | 0G Galileo Testnet RPC endpoint | `https://evmrpc-testnet.0g.ai` |
| `CHAIN_ID` | No | Galileo Testnet chain ID | `16602` |
| `PRIVATE_KEY` | Yes* | Hot wallet private key for signing 0G Storage uploads | - |
| `STORAGE_INDEXER` | No | 0G Storage indexer URL | `https://indexer-storage-testnet-turbo.0g.ai` |
| `ZG_SERVICE_URL` | No | 0G Compute service proxy URL | - |
| `ZG_API_SECRET` | No | API secret for 0G Compute inference | - |
| `ZG_MODEL` | No | AI model identifier | `qwen/qwen-2.5-7b-instruct` |

*If `PRIVATE_KEY` is not set, the app falls back to a local demo mode using deterministic content hashes. The UI remains fully functional but predictions are not anchored on-chain. ⚠️

### Deploying to Vercel 🌐

1. Push your repository to GitHub 📤
2. Import the project in [Vercel](https://vercel.com) 🔗
3. Add each environment variable above in **Settings > Environment Variables** 🔧
4. Deploy. Vercel auto-detects Next.js and handles the build. ✅

> **Important**: Set your `PRIVATE_KEY` as an encrypted environment variable in Vercel. Never expose it in client-side code or commit it to the repository. 🔒

---

## Scoring System 📐

| Event | Points |
|-------|--------|
| Correct outcome (home/draw/away) | +3 |
| Exact score match | +2 (bonus, on top of outcome points) |
| **Maximum per match** | **5** |

Leaderboard ties are broken by exact score count, then by total predictions made. 🏅

---

## License 📄

This project is open source under the [MIT License](LICENSE). ✅

---

<p align="center">
  Built with ☕ and ⚽ for the <a href="https://0g.ai/arena/zero-cup">0G Arena Zero Cup</a>
</p>
