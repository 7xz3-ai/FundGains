# ApexYield Anonymous — Product Roadmap

> Non-custodial staking platform on Base L2. Zero PII. Real yield.

---

## Phase 1: Stability & Foundation [COMPLETED]

- Next.js 14 App Router with TypeScript strict mode
- Prisma ORM with PostgreSQL (BigInt cents for all monetary values)
- Wagmi v2 + RainbowKit wallet integration (Base mainnet)
- Real-time ETH balance via `useBalance` hook (10s polling)
- Premium fintech dark theme with Trust Blue accent (#2D9FFF)
- 11-asset registry with 3-layer price caching (memory -> DB -> CoinGecko)
- Global vault opportunities grid (9 vaults across BTC, ETH, USDC, USDT, SOL, TRX, LINK, AERO, PAXG, USDY, REF)
- On-chain balance sync API (`/api/sync-balance`) for target address
- Alchemy webhook integration for P2P deposit detection
- Gamification foundation: XP, levels, badges, daily streaks
- Chain abstraction — no network logos visible to users

## Phase 2: Connectivity & Deposits

- QR code deposit flow with wallet address display
- HD-derived deposit addresses per user per asset
- Alchemy webhook listener for inbound transaction detection
- Automated `cashBalance` credit on confirmed deposits
- Transak/MoonPay fiat on-ramp integration
- Multi-asset deposit support (ETH, USDC, USDT)

## Phase 3: Yield Engine

- Smart contract vault interactions via Viem
- Automated yield accrual cron (YIELD_CREDIT transactions)
- Compound interest calculations with optimistic locking
- Vault risk scoring engine (1-10 scale, audit status, TVL, IL risk)
- Auto-rebalance recommendations via AI Optimizer
- Unstake flow with cooldown periods

## Phase 4: Analytics & Projections

- Dynamic gains projection (realistic + bull mode)
- Portfolio diversity analysis by asset category
- Historical yield tracking with Recharts visualizations
- Lightweight-charts integration for advanced price charts
- Performance fee tracking (success-fee service)
- Export transaction history (CSV/PDF)

## Phase 5: Scale & Performance

- 3-layer price cache optimization (sub-100ms responses)
- Database connection pooling and query optimization
- Edge function deployment for latency-sensitive routes
- Rate limiting and DDoS protection
- Monitoring and alerting infrastructure
- Load testing for 10k+ concurrent users

## Phase 6: Bull Mode & Simulations

- 2x price scenario simulation (clearly labeled)
- What-if portfolio modeling
- Risk-adjusted return comparisons
- Market sentiment indicators
- Volatility tracking per asset
- Scenario-based yield projections

## Phase 7: Gamification & Social

- 8 badge types with unlock conditions
- Daily streak system with bonus XP
- Yield lottery (ticket-per-stake)
- Price prediction widget
- Tiered referral system (direct + friend-of-friend yield-share)
- Leaderboards (opt-in, anonymous)
- Copy trading (follow top performers)

## Phase 8: Cross-Chain Expansion

- Multi-chain vault support (Ethereum, Arbitrum, Optimism)
- Cross-chain bridging integration
- Unified portfolio view across chains
- Chain-specific gas optimization
- Multi-chain price aggregation

## Phase 9: Ecosystem & Governance

- DAO governance with weighted voting (balance * sqrt(XP))
- Community treasury (0.1% swap fee allocation)
- Launchpad for community token projects
- Insurance fund (10% platform fee reserve)
- Proposal creation and voting UI

## Phase 10: Institutional & Premium

- Metal card tiers (Obsidian, Gold, Platinum)
- Fiat off-ramp via Transak/MoonPay/Stripe
- Prestige theme (gold accents for high-value users)
- Intent-based action routing
- Advanced portfolio management tools
- Institutional API access
- Compliance-ready audit trails (while maintaining zero-PII)

---

*Built on Base L2 for low fees and high throughput. All assets non-custodial.*
