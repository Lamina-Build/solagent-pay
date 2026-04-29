# ⚡ SolAgent Pay

> **Colosseum Global Hackathon 2026** — Built by [Lamina Build](https://github.com/TomazMalfoy)

**Hire specialized AI agents. Pay per task in USDC on Solana. Settle in under 1 second.**

🔗 **Live Demo:** https://solagent-pay.vercel.app

---

## 🧠 What is SolAgent Pay?

SolAgent Pay is a decentralized marketplace where anyone can hire specialized AI agents and pay per task in USDC on Solana — using the **x402 payment protocol**.

No subscriptions. No credit cards. No intermediaries.

The user connects their Phantom wallet → selects an agent → describes the task → confirms the USDC payment → the agent executes and delivers the result. The transaction settles on Solana in under 1 second and is permanently recorded on-chain.

---

## 🎯 Problem

AI services today are stuck in Web2:
- Monthly subscriptions with credit cards
- No native way to pay an AI agent per task in crypto
- Autonomous AI agents can't receive payments without human intervention

**SolAgent Pay fixes this:** pay-per-use, on-chain, instant.

---

## 🏗️ Architecture

```
User → Connect Phantom Wallet
     → Select Agent + Describe Task
     → Confirm USDC payment (Solana)
     → Transaction confirmed < 1s
     → Agent executes via Claude API
     → Result delivered in chat
     → TX recorded in history
```

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | Solana Devnet |
| Token | USDC (SPL) |
| Payment Protocol | x402 |
| Wallet | Phantom |
| AI | Claude (Anthropic) |
| Frontend | Vanilla HTML/CSS/JS |
| Deploy | Vercel |
| Future | Anchor (Rust) smart contracts |

---

## 🤖 Available Agents

| Agent | Task | Price |
|---|---|---|
| ResearchAgent v2 | Web Research | 0.50 USDC |
| SummaryAgent v1 | Text Summary | 0.25 USDC |
| CodeAgent Pro | Code Generation | 1.00 USDC |
| LinguaAgent | Translation | 0.15 USDC |
| DataAgent Analytics | Data Analysis | 0.75 USDC |
| CreativeAgent | Creative Writing | 0.40 USDC |

---

## 🚀 Run Locally

No dependencies needed — just open the file:

```bash
git clone https://github.com/TomazMalfoy/solagent-pay.git
cd solagent-pay
open index.html

# Or with a local server:
npx serve .
```

---

## 🗺️ Roadmap

### MVP — Hackathon (May 2026)
- [x] Full marketplace UI
- [x] Phantom wallet simulation
- [x] 6 specialized AI agents
- [x] Transaction history
- [x] Claude API integration
- [x] Vercel deploy

### V1 — Post Hackathon
- [ ] Real Phantom SDK integration
- [ ] Anchor smart contracts (Rust)
- [ ] Real USDC SPL on Devnet
- [ ] On-chain task verification
- [ ] Agent reputation system

### V2 — Scale
- [ ] Open marketplace (third-party agents)
- [ ] Revenue sharing for agent creators
- [ ] Mainnet launch

---

## 🏆 Hackathon Tracks

- ✅ **AI Platforms / Agents** — autonomous AI agents with on-chain payments
- ✅ **DeFi / Payments** — programmatic USDC payments on Solana
- ✅ **Consumer Apps** — simple, accessible UX for non-crypto users

---

## 👥 Team

**Lamina Build** — Colosseum Global Hackathon 2026
- [@TomazMalfoy](https://github.com/TomazMalfoy)

---

## 📄 License

MIT
