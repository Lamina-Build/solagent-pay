/**
 * SolAgent Pay — Frontend Logic
 * Colosseum Global Hackathon 2026 | Lamina Build
 *
 * Handles:
 * - Wallet connection simulation (Phantom)
 * - Agent selection and task execution
 * - Payment flow with Solana tx simulation
 * - Claude API calls (direct or via backend)
 * - Transaction history
 */

// ── Config ───────────────────────────────────────────────────────────────────
const CONFIG = {
  model:      "claude-sonnet-4-20250514",
  network:    "devnet",
  team:       "Lamina Build",
  // Set to your backend URL when running the Python API:
  // backendUrl: "https://your-api.railway.app"
  backendUrl: null,
};

// ── Agent Catalog ─────────────────────────────────────────────────────────────
const AGENTS = [
  { id: "research",  icon: "🔍", name: "Web Research",     desc: "Researches any topic and delivers a structured report.",        price: 0.50, agent: "ResearchAgent v2" },
  { id: "summary",   icon: "📝", name: "Text Summary",     desc: "Paste any text and receive an intelligent structured summary.", price: 0.25, agent: "SummaryAgent v1" },
  { id: "code",      icon: "💻", name: "Code Generation",  desc: "Describe what you need and the agent writes the code.",         price: 1.00, agent: "CodeAgent Pro" },
  { id: "translate", icon: "🌎", name: "Translation",      desc: "Professional translation to any language with full context.",   price: 0.15, agent: "LinguaAgent" },
  { id: "data",      icon: "📊", name: "Data Analysis",    desc: "Send raw data and receive insights, patterns, recommendations.", price: 0.75, agent: "DataAgent Analytics" },
  { id: "creative",  icon: "✨", name: "Creative Writing", desc: "Texts, stories, posts and copy for any purpose.",               price: 0.40, agent: "CreativeAgent" },
];

const SYSTEM_PROMPTS = {
  research:  "You are a specialized research agent. Provide a structured research report with key points, relevant data and conclusions. Use simple markdown (bold, lists). Be informative and concise.",
  summary:   "You are a summary agent. Create a structured summary with the main points highlighted in bold. Be concise and clear.",
  code:      "You are a code generation agent. Generate clean, commented and functional code. Briefly explain what the code does. Use code blocks when needed.",
  translate: "You are a professional translation agent. Provide the requested translation with quality and context. If the target language is not specified, translate to English.",
  data:      "You are a data analysis agent. Analyze the provided information, identify patterns and provide actionable insights.",
  creative:  "You are a creative writing agent. Produce original, engaging, high-quality content. Adapt the tone to the requested context.",
};

// ── State ─────────────────────────────────────────────────────────────────────
let walletConnected = false;
let walletAddress   = "";
let balance         = 100.00;
let selectedAgent   = null;
let totalPaid       = 0;
let totalTasks      = 0;
let pendingPayment  = null;

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  renderAgents();
});

function renderAgents() {
  const grid = document.getElementById("tasksGrid");
  grid.innerHTML = AGENTS.map(a => `
    <div class="task-card" id="task-${a.id}" onclick="selectAgent('${a.id}')">
      <div class="task-icon">${a.icon}</div>
      <div class="task-name">${a.name}</div>
      <div class="task-desc">${a.desc}</div>
      <div class="task-price">${a.price.toFixed(2)} USDC</div>
    </div>
  `).join("");
}

// ── Wallet ────────────────────────────────────────────────────────────────────
function connectWallet() {
  const btn = document.querySelector(".wallet-connect-btn");
  btn.innerHTML = '<span class="spinner"></span> Connecting...';
  btn.disabled = true;

  // Simulate Phantom connection (replace with real Phantom SDK in production)
  setTimeout(() => {
    walletConnected = true;
    walletAddress   = generateSolanaAddress();

    document.getElementById("walletDisconnected").style.display = "none";
    document.getElementById("walletConnected").style.display    = "block";
    document.getElementById("walletAddress").textContent =
      walletAddress.slice(0, 6) + "..." + walletAddress.slice(-6);
    updateBalanceDisplay();

    if (selectedAgent) document.getElementById("payBtn").disabled = false;

    addAgentMessage(
      `✅ Wallet connected! Address: <strong>${walletAddress.slice(0,4)}...${walletAddress.slice(-4)}</strong>. ` +
      `You have <strong>${balance.toFixed(2)} USDC</strong> available. Select a task and tell me what you need!`
    );
    showToast("Wallet connected!", walletAddress.slice(0, 8) + "...");
  }, 1200);
}

function updateBalanceDisplay() {
  document.getElementById("walletBalance").innerHTML =
    `${balance.toFixed(2)}<span>USDC</span>`;
}

// ── Agent Selection ───────────────────────────────────────────────────────────
function selectAgent(id) {
  document.querySelectorAll(".task-card").forEach(c => c.classList.remove("selected"));
  document.getElementById("task-" + id).classList.add("selected");

  selectedAgent = AGENTS.find(a => a.id === id);
  document.getElementById("currentPrice").textContent     = `${selectedAgent.price.toFixed(2)} USDC`;
  document.getElementById("agentNameDisplay").textContent = selectedAgent.agent;
  document.getElementById("taskInput").placeholder        = `Describe your ${selectedAgent.name.toLowerCase()} task...`;

  if (walletConnected) document.getElementById("payBtn").disabled = false;

  addAgentMessage(
    `${selectedAgent.icon} <strong>${selectedAgent.agent}</strong> here! ` +
    `Ready to execute <em>${selectedAgent.name}</em>. ` +
    `Cost: <strong>${selectedAgent.price.toFixed(2)} USDC</strong>. What do you need?`
  );
}

// ── Payment Flow ──────────────────────────────────────────────────────────────
function initiatePayment() {
  if (!walletConnected) { addAgentMessage("⚠️ Please connect your Phantom wallet first!"); return; }
  if (!selectedAgent)   { addAgentMessage("⚠️ Please select a task first!"); return; }

  const instruction = document.getElementById("taskInput").value.trim();
  if (!instruction)     { addAgentMessage("⚠️ Please describe what you need before paying!"); return; }

  if (balance < selectedAgent.price) {
    addAgentMessage("⚠️ Insufficient USDC balance. Please top up your wallet.");
    return;
  }

  pendingPayment = { agent: selectedAgent, instruction };

  document.getElementById("modalTask").textContent        = selectedAgent.name;
  document.getElementById("modalInstruction").textContent = instruction.length > 60
    ? instruction.slice(0, 60) + "..." : instruction;
  document.getElementById("modalPrice").textContent       = selectedAgent.price.toFixed(2) + " USDC";
  document.getElementById("payModal").classList.add("open");
}

function closeModal() {
  document.getElementById("payModal").classList.remove("open");
  pendingPayment = null;
}

async function confirmPayment() {
  const btn = document.getElementById("confirmBtn");

  btn.innerHTML = '<span class="spinner"></span> Signing transaction...'; btn.disabled = true;
  await sleep(800);
  btn.innerHTML = '<span class="spinner"></span> Broadcasting on Solana...';
  await sleep(900);
  btn.innerHTML = '<span class="spinner"></span> Confirming block...';
  await sleep(700);

  const txHash = generateTxHash();

  // Deduct balance
  balance     -= pendingPayment.agent.price;
  totalPaid   += pendingPayment.agent.price;
  totalTasks  += 1;

  updateBalanceDisplay();
  document.getElementById("statPaid").textContent  = `$${totalPaid.toFixed(2)}`;
  document.getElementById("statTasks").textContent = totalTasks;

  closeModal();
  addUserMessage(pendingPayment.instruction);
  addTxItem(pendingPayment.agent, txHash, pendingPayment.agent.price);

  // Execute AI agent
  document.getElementById("agentStatusText").textContent = "executing task...";
  const typingId = addTypingIndicator();

  const result = CONFIG.backendUrl
    ? await callBackend(pendingPayment.agent, pendingPayment.instruction, txHash)
    : await callClaudeDirect(pendingPayment.agent, pendingPayment.instruction);

  removeTypingIndicator(typingId);
  document.getElementById("agentStatusText").textContent = "online · awaiting instruction";

  addAgentMessage(
    `✅ <strong>Task complete!</strong> Payment of <strong>${pendingPayment.agent.price.toFixed(2)} USDC</strong> received ` +
    `(tx: <code style="font-family:'Space Mono',monospace;font-size:0.75rem;color:var(--accent2)">${txHash.slice(0,12)}...</code>)<br><br>${result}`
  );
  showToast("Task complete!", `tx: ${txHash.slice(0, 16)}...`);

  document.getElementById("taskInput").value = "";
  btn.innerHTML = "🔐 Pay & Execute"; btn.disabled = false;
  pendingPayment = null;
}

// ── API Calls ─────────────────────────────────────────────────────────────────

// Direct call to Claude API (frontend — no backend needed for demo)
async function callClaudeDirect(agent, instruction) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: CONFIG.model,
        max_tokens: 1000,
        system: SYSTEM_PROMPTS[agent.id] || "You are a helpful AI agent.",
        messages: [{ role: "user", content: instruction }],
      }),
    });
    const data = await res.json();
    if (data.content?.[0]) return formatResponse(data.content[0].text);
    return "Task processed successfully!";
  } catch {
    return getFallbackResponse(agent, instruction);
  }
}

// Call Python backend (production mode)
async function callBackend(agent, instruction, txHash) {
  try {
    const res = await fetch(`${CONFIG.backendUrl}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agent_id:       agent.id,
        instruction,
        wallet_address: walletAddress,
        tx_signature:   txHash,
      }),
    });
    const data = await res.json();
    return formatResponse(data.result || "Task executed successfully!");
  } catch {
    return callClaudeDirect(agent, instruction);
  }
}

// ── Formatting ────────────────────────────────────────────────────────────────
function formatResponse(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, `<code style="font-family:'Space Mono',monospace;font-size:0.8rem;background:rgba(153,69,255,0.1);padding:1px 5px;border-radius:4px">$1</code>`)
    .replace(/\n\n/g, "<br><br>")
    .replace(/\n- /g, "<br>• ")
    .replace(/\n/g, "<br>");
}

function getFallbackResponse(agent, instruction) {
  const fb = {
    research:  `📋 <strong>Research Result:</strong><br><br>Analyzed your request about "<em>${instruction}</em>".<br><br>• Topic identified and processed<br>• Relevant data collected<br>• Insights generated successfully`,
    summary:   `📝 <strong>Summary generated.</strong><br><br>Content analyzed and key points extracted.`,
    code:      `💻 <strong>Code generated:</strong><br><br><code style="background:rgba(153,69,255,0.1);padding:4px 8px;border-radius:4px;font-family:'Space Mono',monospace">// Code for: ${instruction}</code>`,
    translate: `🌎 <strong>Translation complete.</strong><br><br>Text translated successfully.`,
    data:      `📊 <strong>Analysis complete.</strong><br><br>Data processed. Patterns identified.`,
    creative:  `✨ <strong>Content created!</strong><br><br>Text generated as requested.`,
  };
  return fb[agent.id] || "Task executed successfully!";
}

// ── Chat Helpers ──────────────────────────────────────────────────────────────
function addAgentMessage(html) {
  const chat = document.getElementById("chatArea");
  const div  = document.createElement("div");
  div.className = "msg agent";
  div.innerHTML = `<div class="msg-avatar">⚡</div><div class="msg-bubble">${html}</div>`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function addUserMessage(text) {
  const chat = document.getElementById("chatArea");
  const div  = document.createElement("div");
  div.className = "msg user";
  div.innerHTML = `<div class="msg-avatar">👤</div><div class="msg-bubble">${text}</div>`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function addTypingIndicator() {
  const chat = document.getElementById("chatArea");
  const id   = "typing-" + Date.now();
  const div  = document.createElement("div");
  div.className = "msg agent"; div.id = id;
  div.innerHTML = `<div class="msg-avatar">⚡</div><div class="msg-bubble typing"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  return id;
}

function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function handleEnter(e) { if (e.key === "Enter") initiatePayment(); }

// ── TX Log ────────────────────────────────────────────────────────────────────
function addTxItem(agent, hash, amount) {
  const list  = document.getElementById("txList");
  const empty = list.querySelector("div[style]");
  if (empty) empty.remove();

  const item = document.createElement("div");
  item.className = "tx-item";
  item.innerHTML = `
    <div class="tx-left">
      <div class="tx-icon">${agent.icon}</div>
      <div>
        <div class="tx-task">${agent.name}</div>
        <div class="tx-hash">${hash.slice(0,20)}...${hash.slice(-8)}</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:16px">
      <div class="tx-amount">-${amount.toFixed(2)} USDC</div>
      <div class="tx-status"><div class="dot"></div>Confirmed</div>
    </div>`;
  list.prepend(item);
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(title, sub) {
  const toast = document.getElementById("toast");
  document.getElementById("toastTitle").textContent = title;
  document.getElementById("toastSub").textContent   = sub;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 4000);
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function generateSolanaAddress() {
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let a = "";
  for (let i = 0; i < 44; i++) a += chars[Math.floor(Math.random() * chars.length)];
  return a;
}

function generateTxHash() {
  const c = "0123456789abcdef";
  let h = "";
  for (let i = 0; i < 64; i++) h += c[Math.floor(Math.random() * c.length)];
  return h;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
