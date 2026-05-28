# MantleSpy — Full Product Specification
> Turing Test Hackathon 2026 | Track: AI Alpha & Data

---

## SECTION 1 — PRODUCT IDENTITY

**1. What is MantleSpy in one sentence?**
MantleSpy is a real-time on-chain surveillance platform that monitors wallet activity on Mantle Network and delivers AI-classified trading signals to developers and analysts.

**2. What specific problem does it solve, and for who?**
Developers and DeFi analysts on Mantle have no lightweight, developer-friendly tool to watch smart money move in real time. Block explorers are reactive and manual; full-stack analytics tools (Nansen, Dune) are expensive and generic. MantleSpy solves the "I need to know when a whale just moved" problem with instant AI-classified signals and a clean feed — built specifically for Mantle.

**3. What makes it different from existing tools?**
- Mantle-native: built specifically for Mantle's EVM, not ported from Ethereum
- AI-classified signals: every transaction is scored BUY / SELL / WATCH / IGNORE with risk tags, not just raw logs
- Real-time SSE push: no polling, no refresh — live feed to the browser
- Developer-first: clean API surface, not a bloated analytics dashboard
- On-chain agent identity via ERC-8004 NFT (hackathon requirement, adds credibility)

**4. What is the end goal?**
For the hackathon: an open-source MVP demonstrating the core loop (monitor → analyze → signal → display). Post-hackathon: a SaaS product with wallet watchlists, webhook alerts, and a paid API tier for DeFi teams building on Mantle.

---

## SECTION 2 — FEATURES & USER FLOW

**5. Every feature the app has:**
- Live signal counter (signals detected since session start)
- Live trade counter (trades flagged by AI)
- Real-time intelligence feed (scrolling list of signals)
- Per-signal detail: wallet address, signal type (BUY/SELL/WATCH/IGNORE), risk level, tags, AI summary
- Transaction history view per tracked wallet
- Wallet balance & token holdings display
- AI analysis panel per transaction (risk level, confidence, reasoning)
- SSE connection status indicator (connected / reconnecting)
- Auto-reconnect on SSE drop

**6. Exact user journey from landing to core action:**
1. User lands on homepage — sees live counters ticking (signals, trades)
2. SSE connection is established automatically in background
3. Intelligence feed begins populating with incoming signals
4. User clicks a signal → expanded view shows wallet address, transaction hash, AI classification (BUY/SELL/WATCH/IGNORE), risk level, tags (e.g. "large transfer", "unusual gas"), and AI reasoning text
5. User can look up a wallet address to see its balance, token holdings, and full transaction history
6. All updates arrive in real time — no manual refresh needed

**7. What is a "signal"?**
A signal is an AI-classified on-chain event. It is triggered when the backend detects a new transaction on Mantle that meets one or more smart-money criteria:
- Transfer value above a threshold (large transfer)
- Interaction with a known DeFi contract (Merchant Moe, Agni Finance, Fluxion)
- Unusual gas usage relative to transaction type
- High event log count (complex multi-step transaction)
- Known whale wallet address involved

Once detected, the transaction is passed to the AI model which outputs: signal type, risk level, confidence score, tags, and a one-sentence summary.

**8. What is a "trade"?**
A trade is a signal specifically classified as BUY or SELL by the AI — meaning the on-chain activity resembles a deliberate entry or exit position (e.g. a large swap, LP add/remove, or token accumulation pattern). Trades are NOT executed automatically. They are surfaced to the user for review. MantleSpy is an intelligence tool, not an execution bot.

**9. What does AI Analysis do, step by step?**
1. Backend detects a new transaction from an SSE or polling source
2. Transaction data (hash, from, to, value, gas, logs, contract interaction) is formatted into a structured prompt
3. Prompt is sent to the AI model (Claude or GPT-4o)
4. AI returns a JSON object: `{ signal: "BUY"|"SELL"|"WATCH"|"IGNORE", risk: "LOW"|"MEDIUM"|"HIGH", confidence: 0-100, tags: [...], summary: "..." }`
5. Backend parses and validates the JSON
6. Signal is stored in DB and pushed via SSE to all connected frontends
7. Frontend renders the signal in the intelligence feed with color-coded risk and tags

---

## SECTION 3 — TECH STACK

**10. Frontend:**
- Framework: React (Vite or Next.js)
- UI libraries: shadcn/ui or Radix UI primitives
- Styling: Tailwind CSS
- Animation: Framer Motion (counter ticks, feed entries sliding in)
- State management: Zustand or React Context + useReducer
- Web3: Ethers.js v6 + Wagmi for wallet connection

**11. Backend:**
- Language: TypeScript (Node.js)
- Framework: Express.js or Fastify
- Runtime: Node.js 20+
- Hosting: Railway, Render, or Fly.io (hackathon-friendly, free tier)

**12. Database:**
- DB: PostgreSQL (primary) + Redis (signal queue / pub-sub)
- Schema overview:
  - `wallets` — address, label, first_seen, last_seen
  - `transactions` — hash, block, from, to, value, gas, timestamp
  - `signals` — id, tx_hash, signal_type, risk, confidence, tags[], summary, created_at
  - `tracked_wallets` — user-defined watchlist (post-MVP)

**13. Blockchain:**
- Chain: Mantle Network (mainnet + testnet)
- SDKs: Ethers.js v6
- RPC providers: Mantle public RPC (`rpc.mantle.xyz`) + Ankr or Alchemy Mantle endpoint as fallback
- On-chain data read: latest blocks, transaction receipts, event logs, token balances via ERC-20 `balanceOf`

**14. Real-time layer:**
- Method: Server-Sent Events (SSE) — one-way push from backend to frontend
- Where: Express `/api/stream` endpoint; frontend uses `EventSource` API
- Fallback: 5-second polling if SSE connection drops after 3 retries
- Redis pub/sub used internally between the blockchain listener worker and the SSE broadcaster

**15. AI/ML:**
- Primary model: Claude (`claude-sonnet-4-20250514`) via Anthropic API
- Fallback: OpenAI GPT-4o
- Prompt structure: static system prompt defining the analyst role + dynamic transaction data injected per call
- Output: strict JSON (model instructed to return only JSON, no markdown)

**16. Third-party APIs:**
- Mantle RPC — raw blockchain data
- Ankr / Alchemy — RPC fallback and enhanced APIs (token balances, NFT metadata)
- CoinGecko API — token price feeds for USD value calculations
- Bybit API — price data for signal context (supported by hackathon track)

---

## SECTION 4 — DATA FLOW

**17. Where does raw data originate?**
- Primary: Mantle RPC (polling latest block every 2-3 seconds via `eth_getBlockByNumber`)
- Secondary: Event log subscriptions via `eth_getLogs` for known DeFi contract addresses
- Tertiary: Bybit API for price context; CoinGecko for token USD values

**18. Data from origin → processing → storage → UI:**
1. **Origin**: Blockchain listener polls Mantle RPC for new blocks every 2-3s
2. **Filter**: Transactions filtered by value threshold, known contract addresses, or watched wallets
3. **Enrich**: Token prices fetched from CoinGecko; USD value calculated
4. **AI call**: Enriched transaction sent to Claude API → returns signal JSON
5. **Validate**: JSON parsed and validated against schema
6. **Store**: Signal written to PostgreSQL; raw tx stored in transactions table
7. **Publish**: Signal published to Redis channel `signals:new`
8. **Push**: SSE broadcaster subscribes to Redis, pushes event to all connected clients
9. **Render**: Frontend `EventSource` receives event, appends to signal feed with animation

**19. What transforms/enriches the data in the middle?**
- USD value calculation (raw ETH/token amount × CoinGecko price)
- Contract label resolution (address → "Merchant Moe", "Agni Finance", etc.)
- Wallet label lookup (known whale addresses mapped to human labels)
- Gas anomaly scoring (compare tx gas to rolling average for that contract)
- Log count as complexity proxy (more logs = more contract interactions)

**20. Latency targets:**
- Block detection → signal creation: under 5 seconds
- Signal creation → frontend display: under 1 second (SSE push)
- End-to-end (block mined → UI update): target under 8 seconds

**21. What triggers a signal?**
A signal is created when a transaction passes the filter AND the AI returns a classification other than IGNORE. The filter criteria: value > 0.1 ETH equivalent OR interaction with a whitelisted DeFi contract OR sender/receiver is a known whale address.

**22. How does the signal reach the frontend?**
Backend → Redis pub/sub → SSE broadcaster → `text/event-stream` HTTP response → browser `EventSource` → React state update → component re-render with animation.

---

## SECTION 5 — ARCHITECTURE

**23. Services map:**
- **Blockchain Listener** (worker): polls Mantle RPC, filters transactions, enriches data
- **AI Analyzer** (module within worker): calls Claude API, parses signal JSON
- **API Server** (Express): serves REST endpoints + SSE `/api/stream` endpoint
- **Redis**: internal message bus between listener and API server
- **PostgreSQL**: persistent storage for signals, transactions, wallets
- **Frontend** (React): static SPA served via CDN or Vercel

**24. How services communicate:**
- Listener → Redis: `PUBLISH signals:new <json>`
- Redis → API Server: `SUBSCRIBE signals:new`
- API Server → Frontend: SSE (`text/event-stream`)
- Frontend → API Server: REST (GET `/api/signals`, GET `/api/wallet/:address`)

**25. Background processors:**
- Blockchain listener runs as a persistent worker (setInterval or ethers.js `provider.on("block")`)
- Redis subscriber runs in the API server process
- Optional: cron job every 10 minutes to clean old signals from DB (keep last 1000)

**26. Authentication & authorization:**
- MVP: no auth (open feed, read-only)
- Post-MVP: API key auth for webhook endpoints; JWT for user watchlists

**27. Hosting:**
- Frontend: Vercel (free tier)
- Backend + Worker: Railway or Render (free tier, always-on)
- PostgreSQL: Railway managed Postgres or Supabase free tier
- Redis: Railway Redis plugin or Upstash (serverless Redis, free tier)

---

## SECTION 6 — CODE STRUCTURE

**28. Root-level folder structure:**
```
mantlespy/
├── frontend/          # React app
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── store/
│   │   └── pages/
│   └── package.json
├── backend/           # Express API + SSE server
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── db/
│   │   └── index.ts
│   └── package.json
├── worker/            # Blockchain listener + AI analyzer
│   ├── src/
│   │   ├── listener.ts
│   │   ├── analyzer.ts
│   │   ├── enricher.ts
│   │   └── index.ts
│   └── package.json
├── shared/            # Shared types/interfaces
│   └── types.ts
└── docker-compose.yml
```

**29. Most important files:**
- `worker/src/listener.ts` — polls Mantle RPC, detects new transactions
- `worker/src/analyzer.ts` — sends tx to Claude API, parses signal JSON
- `backend/src/routes/stream.ts` — SSE endpoint, subscribes to Redis
- `backend/src/routes/signals.ts` — REST endpoint for signal history
- `frontend/src/hooks/useSignalFeed.ts` — manages EventSource connection + state
- `frontend/src/components/SignalFeed.tsx` — renders the live intelligence feed
- `shared/types.ts` — Signal, Transaction, Wallet type definitions

**30. Design patterns:**
- **Pub/Sub**: Redis channels decouple listener from API server
- **Observer**: Frontend EventSource observes the SSE stream
- **Strategy**: AI analyzer can swap Claude ↔ GPT-4o via config flag
- **Repository**: DB access abstracted behind service modules (not raw SQL in routes)

**31. Frontend component tree:**
```
App
├── Layout
│   ├── Header (logo, connection status badge)
│   └── StatusBar (signal counter, trade counter)
├── SignalFeed
│   ├── SignalCard (×N — one per signal)
│   │   ├── WalletBadge
│   │   ├── SignalTypeBadge (BUY/SELL/WATCH/IGNORE)
│   │   ├── RiskBadge
│   │   ├── TagList
│   │   └── AISummary
└── WalletDrawer (opens on wallet click)
    ├── WalletHeader (address, balance)
    ├── TokenHoldings
    └── TransactionHistory
```

---

## SECTION 7 — AI LAYER

**32. Which AI models and for what:**
- Claude `claude-sonnet-4-20250514` — transaction-level signal classification (primary)
- GPT-4o — fallback if Claude API is unavailable

**33. Input to the AI:**
Processed/enriched transaction object: hash, from address, to address (with label if known), ETH value, USD value, gas used, gas anomaly score, log count, contract name if known, and timestamp.

**34. AI output:**
Structured JSON:
```json
{
  "signal": "BUY" | "SELL" | "WATCH" | "IGNORE",
  "risk": "LOW" | "MEDIUM" | "HIGH",
  "confidence": 0-100,
  "tags": ["large_transfer", "whale_wallet", "unusual_gas", "defi_interaction"],
  "summary": "Whale address moved 50,000 USDT into Merchant Moe LP — likely accumulation."
}
```

**35. Prompt structure:**
```
SYSTEM: You are a DeFi transaction analyst for Mantle Network. Analyze transactions
and classify them as smart money signals. Always respond in valid JSON only.
No explanation, no markdown. Schema: { signal, risk, confidence, tags, summary }.

USER: Analyze this transaction:
From: 0xabc... (known whale: "Mantle Whale #7")
To: 0xdef... (Merchant Moe Router)
Value: 2.4 ETH ($8,640)
Gas: 312,000 (2.1x above average for this contract)
Logs: 8 events
Timestamp: 2026-05-28T10:23:00Z
```

**36. Where in the codebase the AI call happens:**
`worker/src/analyzer.ts` — the `analyzeTransaction(tx: EnrichedTransaction): Promise<Signal>` function. Called by the listener after enrichment, before Redis publish.

**37. How AI result is displayed:**
Each `SignalCard` in the feed shows: color-coded signal badge (green=BUY, red=SELL, yellow=WATCH, grey=IGNORE), risk badge, tag chips, and the AI summary text in small print below. Confidence score shown as a subtle percentage. High-risk signals get a pulsing border animation.

---

## SECTION 8 — GIT & DEV WORKFLOW

**38. Repo structure:**
Monorepo — single GitHub repository with `frontend/`, `backend/`, `worker/`, `shared/` directories. Managed with npm workspaces or Turborepo.

**39. Branching strategy:**
- `main` — production-ready, auto-deploys to Vercel/Railway
- `dev` — integration branch, all features merged here first
- `feature/<name>` — individual feature branches

**40. CI/CD:**
- GitHub Actions on push to `main`: lint → type-check → build → deploy to Vercel (frontend) + Railway (backend/worker)
- On PR to `dev`: lint + type-check only

**41. Environment variables needed:**
```
ANTHROPIC_API_KEY=
OPENAI_API_KEY=          # fallback
MANTLE_RPC_URL=          # https://rpc.mantle.xyz
MANTLE_RPC_FALLBACK=     # Ankr/Alchemy URL
DATABASE_URL=            # PostgreSQL connection string
REDIS_URL=               # Redis connection string
COINGECKO_API_KEY=
BYBIT_API_KEY=
PORT=3001
```

**42. Biggest technical challenges / unfinished parts:**
- **RPC reliability**: Mantle public RPC can be slow or rate-limited under load — fallback logic is critical
- **AI latency**: Claude API adds 1-3s per transaction — need to async this so it doesn't block the listener loop
- **Signal noise**: without good filtering, the feed will flood with low-value transactions — threshold tuning needed
- **Wallet history**: full transaction history per wallet requires pagination and can be slow — needs caching
- **Planned but not built**: wallet-level summarization (aggregate AI analysis across a wallet's last N transactions), anomaly detection across wallet history, and webhook/Telegram alert delivery