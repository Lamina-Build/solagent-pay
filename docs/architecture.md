# SolAgent Pay — Technical Architecture

## Overview

SolAgent Pay implements the **x402 payment pattern** on Solana: an AI agent requires a verified payment before executing a task. This creates a trustless, autonomous pay-per-use model.

## Payment Flow

```
1. User selects agent + writes instruction
2. Frontend displays payment modal (price in USDC)
3. User confirms → Phantom signs tx on Solana Devnet
4. Frontend sends tx signature to backend (/execute)
5. Backend verifies signature + calls Claude API
6. Result returned to user
7. TX logged on-chain
```

## x402 Protocol

The x402 protocol (HTTP 402 Payment Required) enables machines to pay machines. In our implementation:

- Price is defined per agent (e.g. 0.50 USDC for research)
- Payment is made in USDC on Solana (SPL token)
- The agent only executes after payment is confirmed
- No human approval needed — fully autonomous

## Solana Advantages

- **Speed:** transactions confirm in ~400ms
- **Cost:** fees of ~$0.00025 per tx
- **USDC:** native SPL token, no wrapping needed
- **Ecosystem:** largest DeFi + AI developer community

## Security Considerations

- API keys are never exposed to the frontend
- All Claude API calls are proxied through the FastAPI backend
- Wallet signatures are verified before task execution
- In production: Anchor smart contracts verify payments on-chain

## Future: On-chain Verification

In V1, we'll deploy an Anchor program that:
1. Locks USDC in escrow when task is submitted
2. Releases payment to agent wallet on completion
3. Refunds user if agent fails (timeout/error)
4. Records task metadata permanently on-chain
