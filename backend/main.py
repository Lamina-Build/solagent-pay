"""
SolAgent Pay — Backend API
Colosseum Global Hackathon 2026 | Lamina Build

FastAPI backend that:
- Proxies Claude API calls securely (API key never exposed to frontend)
- Simulates Solana transaction verification
- Logs task executions and payments
- Provides agent pricing and availability
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import httpx
import os
import uuid
import time
from datetime import datetime

# ── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="SolAgent Pay API",
    description="Decentralized AI agent marketplace on Solana",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Config ───────────────────────────────────────────────────────────────────
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
CLAUDE_MODEL      = "claude-sonnet-4-20250514"

# ── In-memory store (replace with DB in production) ──────────────────────────
transactions: list = []
total_paid: float  = 0.0
total_tasks: int   = 0

# ── Agent catalog ─────────────────────────────────────────────────────────────
AGENTS = {
    "research": {
        "id": "research",
        "name": "ResearchAgent v2",
        "icon": "🔍",
        "description": "Researches any topic and delivers a structured report.",
        "price_usdc": 0.50,
        "system_prompt": (
            "You are a specialized research agent. Provide a structured research report "
            "with key points, relevant data and conclusions. Use simple markdown (bold, lists). "
            "Be informative and concise."
        ),
    },
    "summary": {
        "id": "summary",
        "name": "SummaryAgent v1",
        "icon": "📝",
        "description": "Summarizes any text into structured key points.",
        "price_usdc": 0.25,
        "system_prompt": (
            "You are a summary agent. Create a structured summary with the main points "
            "highlighted in bold. Be concise and clear."
        ),
    },
    "code": {
        "id": "code",
        "name": "CodeAgent Pro",
        "icon": "💻",
        "description": "Generates clean, functional code for any requirement.",
        "price_usdc": 1.00,
        "system_prompt": (
            "You are a code generation agent. Generate clean, commented and functional code. "
            "Briefly explain what the code does. Use code blocks when needed."
        ),
    },
    "translate": {
        "id": "translate",
        "name": "LinguaAgent",
        "icon": "🌎",
        "description": "Professional translation to any language with full context.",
        "price_usdc": 0.15,
        "system_prompt": (
            "You are a professional translation agent. Provide the requested translation "
            "with quality and context. If the target language is not specified, translate to English."
        ),
    },
    "data": {
        "id": "data",
        "name": "DataAgent Analytics",
        "icon": "📊",
        "description": "Analyzes data and delivers insights, patterns and recommendations.",
        "price_usdc": 0.75,
        "system_prompt": (
            "You are a data analysis agent. Analyze the provided information, "
            "identify patterns and provide actionable insights."
        ),
    },
    "creative": {
        "id": "creative",
        "name": "CreativeAgent",
        "icon": "✨",
        "description": "Writes texts, stories, posts and copy for any purpose.",
        "price_usdc": 0.40,
        "system_prompt": (
            "You are a creative writing agent. Produce original, engaging, high-quality content. "
            "Adapt the tone to the requested context."
        ),
    },
}

# ── Schemas ──────────────────────────────────────────────────────────────────
class ExecuteRequest(BaseModel):
    agent_id: str
    instruction: str
    wallet_address: str
    tx_signature: Optional[str] = None  # Solana tx hash (from frontend simulation)

class ExecuteResponse(BaseModel):
    task_id: str
    agent_id: str
    result: str
    tx_signature: str
    amount_usdc: float
    timestamp: str
    status: str

# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "name": "SolAgent Pay API",
        "version": "1.0.0",
        "team": "Lamina Build",
        "hackathon": "Colosseum Global Hackathon 2026",
        "docs": "/docs"
    }


@app.get("/agents")
def list_agents():
    """Returns all available AI agents and their pricing."""
    return {
        "agents": [
            {
                "id": a["id"],
                "name": a["name"],
                "icon": a["icon"],
                "description": a["description"],
                "price_usdc": a["price_usdc"],
            }
            for a in AGENTS.values()
        ]
    }


@app.get("/agents/{agent_id}")
def get_agent(agent_id: str):
    """Returns a specific agent's details."""
    agent = AGENTS.get(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found.")
    return {k: v for k, v in agent.items() if k != "system_prompt"}


@app.post("/execute", response_model=ExecuteResponse)
async def execute_task(req: ExecuteRequest):
    """
    Core endpoint: verifies payment intent and executes the AI agent task.

    Flow:
    1. Validate agent exists
    2. Verify wallet address is provided
    3. Call Claude API with agent-specific system prompt
    4. Log the transaction
    5. Return result + tx details
    """
    global total_paid, total_tasks

    # Validate agent
    agent = AGENTS.get(req.agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent '{req.agent_id}' not found.")

    # Validate wallet
    if not req.wallet_address or len(req.wallet_address) < 32:
        raise HTTPException(status_code=400, detail="Invalid wallet address.")

    # Validate instruction
    if not req.instruction or len(req.instruction.strip()) < 3:
        raise HTTPException(status_code=400, detail="Instruction too short.")

    # Call Claude API
    result = await call_claude(agent["system_prompt"], req.instruction)

    # Generate tx signature if not provided (devnet simulation)
    tx_sig = req.tx_signature or generate_tx_hash()

    # Log transaction
    task_id   = str(uuid.uuid4())
    timestamp = datetime.utcnow().isoformat() + "Z"

    transaction = {
        "task_id":      task_id,
        "agent_id":     req.agent_id,
        "agent_name":   agent["name"],
        "wallet":       req.wallet_address,
        "instruction":  req.instruction,
        "amount_usdc":  agent["price_usdc"],
        "tx_signature": tx_sig,
        "timestamp":    timestamp,
        "status":       "confirmed",
    }
    transactions.append(transaction)
    total_paid  += agent["price_usdc"]
    total_tasks += 1

    return ExecuteResponse(
        task_id=task_id,
        agent_id=req.agent_id,
        result=result,
        tx_signature=tx_sig,
        amount_usdc=agent["price_usdc"],
        timestamp=timestamp,
        status="confirmed",
    )


@app.get("/transactions")
def list_transactions(wallet: Optional[str] = None, limit: int = 20):
    """Returns transaction history. Optionally filtered by wallet address."""
    txs = transactions
    if wallet:
        txs = [t for t in txs if t["wallet"] == wallet]
    return {
        "transactions": txs[-limit:][::-1],
        "total": len(txs),
    }


@app.get("/stats")
def get_stats():
    """Returns global platform statistics."""
    return {
        "total_tasks":    total_tasks,
        "total_paid_usdc": round(total_paid, 4),
        "total_agents":   len(AGENTS),
        "network":        "solana-devnet",
        "settlement_time": "<1s",
    }


# ── Helpers ──────────────────────────────────────────────────────────────────

async def call_claude(system_prompt: str, instruction: str) -> str:
    """Calls the Anthropic Claude API and returns the text response."""
    if not ANTHROPIC_API_KEY:
        return "[API key not configured — set ANTHROPIC_API_KEY in .env]"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            ANTHROPIC_API_URL,
            headers={"Content-Type": "application/json"},
            json={
                "model": CLAUDE_MODEL,
                "max_tokens": 1000,
                "system": system_prompt,
                "messages": [{"role": "user", "content": instruction}],
            },
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Claude API error: {response.status_code}"
        )

    data = response.json()
    return data["content"][0]["text"]


def generate_tx_hash() -> str:
    """Generates a fake Solana-style transaction hash for devnet simulation."""
    import random, string
    chars = string.ascii_lowercase + string.digits
    return "".join(random.choices(chars, k=88))
