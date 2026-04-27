# Night Biz

**Business Loyalty Tokens with ZK Tier Verification on Midnight Network**

Night Biz lets any business — from a corner café to a multinational — issue private loyalty tokens with ZK-enforced tier benefits. Customers prove their tier (Bronze / Silver / Gold / Platinum) without ever revealing their exact token balance. Revenue is shared automatically with holders every epoch.

---

## How it works

```
Business                         Customer
   │                                  │
   ├─ initialize(name, tiers, split)  │
   │  ← token deployed on Midnight    │
   │                                  │
   │                                  ├─ transfer(tokens) ← receives loyalty tokens
   │                                  │
   │                                  ├─ proveTierStatus()
   │                                  │  ← ZK proof: "I am Gold tier"
   │                                  │  ← balance NOT revealed
   │
   ├─ recordSale(amount)             │
   ├─ closeEpoch(sharePerToken)      │
   │                                  ├─ claimRevenue()
   │                                  │  ← NIGHT distributed pro-rata
```

---

## Tier system

| Tier | Default threshold | Example perks |
|------|------------------|---------------|
| 🥉 Bronze | ≥ 100 tokens | 5% discount · priority support |
| 🥈 Silver | ≥ 500 tokens | 10% discount · early access · free shipping |
| 🥇 Gold | ≥ 2,000 tokens | 20% discount · VIP events · revenue boost 2× |
| 💎 Platinum | ≥ 10,000 tokens | Unlimited perks · private access · governance |

Thresholds are fully configurable at deploy time.

---

## ZK tier proof

The `proveTierStatus()` circuit generates a zero-knowledge proof that the caller holds ≥ the tier threshold — without revealing their exact balance:

```compact
export circuit proveTierStatus(): Uint<8> {
  const commit  = callerCommitment();
  const balance = holderTokenBalance();        // witness
  assert(holder_balance.lookup(commit) == balance, "balance witness mismatch");

  if (balance >= tier_platinum.lookup(pad(32,"tp"))) { return 4; }
  if (balance >= tier_gold.lookup(pad(32,"tg")))     { return 3; }
  if (balance >= tier_silver.lookup(pad(32,"ts")))   { return 2; }
  if (balance >= tier_bronze.lookup(pad(32,"tb")))   { return 1; }
  return 0;
}
```

The network sees only the returned tier level (0–4) — not the balance.

---

## Contract — `NightBizToken.compact`

```
contracts/
└── NightBizToken.compact      Compact v0.20 (Midnight)
```

### Key circuits

| Circuit | Who calls | Description |
|---------|-----------|-------------|
| `initialize(name, symbol, supply, holderBps, creatorBps, tiers, licReq)` | Creator | Deploy token with tier config |
| `transfer(to, amount)` | Any holder | Transfer tokens (with optional licence gate) |
| `proveTierStatus()` | Customer | ZK proof of tier |
| `recordSale(amount)` | Creator/PoS | Log sale, add to epoch revenue |
| `closeEpoch(sharePerToken)` | Creator | Snapshot + calculate distributions |
| `claimRevenue()` | Holder | Claim NIGHT revenue |
| `grantLicense(holderCommit)` | Creator | Whitelist wallet for regional gate |

### Revenue split
```
holderBps + creatorBps = 9500
platform always takes 500 bps (5%)
```

### Regional licensing gate
Set `licReq = true` at deploy time to require `grantLicense()` before any wallet can receive tokens. Used for franchise/enterprise distribution control.

---

## Use cases

| Business | Tokens | Example tier perk |
|----------|--------|------------------|
| ☕ Café / retail | 10,000 | Bronze = free coffee, Platinum = tasting events |
| 🛍️ DTC brand | 100,000 | Silver = early drops, Gold = co-design |
| 💻 SaaS | Unlimited | Tiers = API rate limits, support SLA |
| 🏢 Enterprise | 1,000,000,000 | Regional licensing gates for distributors |

---

## Front-end

```
public/
├── index.html           Token configurator + dashboard
├── css/nightbiz.css     Design system (gold accent)
└── js/biz.js            Deploy, tier preview, epoch management
```

Token state persisted in `localStorage` (`nb_token`). Tabs: Configure · My Token · Tiers · Revenue.

---

## Development

```bash
npm install
npm run dev          # Vite dev server on :3008
npm run compile      # compactc NightBizToken.compact
npm run build        # Production build → dist/
```

---

## Deployment

GitHub Pages via `.github/workflows/pages.yml`. Push to `main` → `public/` served automatically. To enable: **Settings → Pages → Source: GitHub Actions**.

---

## Part of Night Markets

| Repo | Description |
|------|-------------|
| [night-fun](https://github.com/kingmunz1994-lgtm/night-fun) | Core token launchpad |
| [night-work](https://github.com/kingmunz1994-lgtm/night-work) | Task marketplace |
| [night-save](https://github.com/kingmunz1994-lgtm/night-save) | Collateral vault + sUSD |
| [night-lend](https://github.com/kingmunz1994-lgtm/night-lend) | DeFi lending |
| [night-store](https://github.com/kingmunz1994-lgtm/night-store) | Merch store |
| **night-biz** | **Business loyalty tokens** |

---

*Built on Midnight Network · Compact v0.20 · ZK-private tiers · Any scale*
