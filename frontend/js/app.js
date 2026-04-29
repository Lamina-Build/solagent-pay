/**
 * SolAgent Pay — Frontend Logic
 * Colosseum Global Hackathon 2026 | Lamina Build
 */

const CONFIG = {
  network: 'devnet',
  team: 'Lamina Build',
  // Calls our own Vercel serverless function — API key never exposed
  apiEndpoint: '/api/execute',
};

const AGENTS = [
  { id: 'research',  icon: '🔍', name: 'Web Research',     desc: 'Researches any topic and delivers a structured report.',        price: 0.50, agent: 'ResearchAgent v2' },
  { id: 'summary',   icon: '📝', name: 'Text Summary',     desc: 'Paste any text and receive an intelligent structured summary.', price: 0.25, agent: 'SummaryAgent v1' },
  { id: 'code',      icon: '💻', name: 'Code Generation',  desc: 'Describe what you need and the agent writes the code.',         price: 1.00, agent: 'CodeAgent Pro' },
  { id: 'translate', icon: '🌎', name: 'Translation',      desc: 'Professional translation to any language with full context.',   price: 0.15, agent: 'LinguaAgent' },
  { id: 'data',      icon: '📊', name: 'Data Analysis',    desc: 'Send raw data and receive insights, patterns, recommendations.', price: 0.75, agent: 'DataAgent Analytics' },
  { id: 'creative',  icon: '✨', name: 'Creative Writing', desc: 'Texts, stories, posts and copy for any purpose.',               price: 0.40, agent: 'CreativeAgent' },
];

// ── State ─────────────────────────────────────────────────────────────────────
let walletConnected = false;
let walletAddress   = '';
let balance         = 100.00;
let selectedAgent   = null;
let totalPaid       = 0;
let totalTasks      = 0;
let pendingPayment  = null;

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', renderAgents);

function renderAgents() {
  const grid = document.getElementById('tasksGrid');
  grid.innerHTML = AGENTS.map(a => `
    <div class="task-card" id="task-${a.id}" onclick="selectAgent('${a.id}')">
      <div class="task-icon">${a.icon}</div>
      <div class="task-name">${a.name}</div>
      <div class="task-desc">${a.desc}</div>
      <div class="task-price">${a.price.toFixed(2)} USDC</div>
    </div>
  `).join('');
}

// ── Wallet ────────────────────────────────────────────────────────────────────
function connectWallet() {
  const btn = document.querySelector('.wallet-connect-btn');
  btn.innerHTML = '<span class="spinner"></span> Connecting...';
  btn.disabled = true;

  setTimeout(() => {
    walletConnected = true;
    walletAddress   = generateSolanaAddress();

    document.getElementById('walletDisconnected').style.display = 'none';
    document.getElementById('walletConnected').style.display    = 'block';
    document.getElementById('walletAddress').textContent =
      walletAddress.slice(0,6) + '...' + walletAddress.slice(-6);
    updateBalanceDisplay();

    if (selectedAgent) document.getElementById('payBtn').disabled = false;

    addAgentMessage(
      `✅ Wallet connected! Address: <strong>${walletAddress.slice(0,4)}...${walletAddress.slice(-4)}</strong>. ` +
      `You have <strong>${balance.toFixed(2)} USDC</strong> available. Select a task and tell me what you need!`
    );
    showToast('Wallet connected!', walletAddress.slice(0,8) + '...');
  }, 1200);
}

function updateBalanceDisplay() {
  document.getElementById('walletBalance').innerHTML = `${balance.toFixed(2)}<span>USDC</span>`;
}

// ── Agent Selection ───────────────────────────────────────────────────────────
function selectAgent(id) {
  document.querySelectorAll('.task-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('task-' + id).classList.add('selected');

  selectedAgent = AGENTS.find(a => a.id === id);
  document.getElementById('currentPrice').textContent     = `${selectedAgent.price.toFixed(2)} USDC`;
  document.getElementById('agentNameDisplay').textContent = selectedAgent.agent;
  document.getElementById('taskInput').placeholder        = `Describe your ${selectedAgent.name.toLowerCase()} task...`;

  if (walletConnected) document.getElementById('payBtn').disabled = false;

  addAgentMessage(
    `${selectedAgent.icon} <strong>${selectedAgent.agent}</strong> here! ` +
    `Ready to execute <em>${selectedAgent.name}</em>. ` +
    `Cost: <strong>${selectedAgent.price.toFixed(2)} USDC</strong>. What do you need?`
  );
}

// ── Payment Flow ──────────────────────────────────────────────────────────────
function initiatePayment() {
  if (!walletConnected) { addAgentMessage('⚠️ Please connect your Phantom wallet first!'); return; }
  if (!selectedAgent)   { addAgentMessage('⚠️ Please select a task first!'); return; }

  const instruction = document.getElementById('taskInput').value.trim();
  if (!instruction)     { addAgentMessage('⚠️ Please describe what you need before paying!'); return; }

  if (balance < selectedAgent.price) {
    addAgentMessage('⚠️ Insufficient USDC balance.');
    return;
  }

  pendingPayment = { agent: selectedAgent, instruction };

  document.getElementById('modalTask').textContent        = selectedAgent.name;
  document.getElementById('modalInstruction').textContent =
    instruction.length > 60 ? instruction.slice(0,60) + '...' : instruction;
  document.getElementById('modalPrice').textContent       = selectedAgent.price.toFixed(2) + ' USDC';
  document.getElementById('payModal').classList.add('open');
}

function closeModal() {
  document.getElementById('payModal').classList.remove('open');
  pendingPayment = null;
}

async function confirmPayment() {
  const btn = document.getElementById('confirmBtn');
  btn.innerHTML = '<span class="spinner"></span> Signing transaction...'; btn.disabled = true;
  await sleep(800);
  btn.innerHTML = '<span class="spinner"></span> Broadcasting on Solana...';
  await sleep(900);
  btn.innerHTML = '<span class="spinner"></span> Confirming block...';
  await sleep(600);

  const txHash = generateTxHash();

  // Save reference before closeModal() clears pendingPayment
  const currentPayment = { ...pendingPayment };

  balance    -= currentPayment.agent.price;
  totalPaid  += currentPayment.agent.price;
  totalTasks += 1;

  updateBalanceDisplay();
  document.getElementById('statPaid').textContent  = `$${totalPaid.toFixed(2)}`;
  document.getElementById('statTasks').textContent = totalTasks;

  closeModal();
  addUserMessage(currentPayment.instruction);
  addTxItem(currentPayment.agent, txHash, currentPayment.agent.price);

  document.getElementById('agentStatusText').textContent = 'executing task...';
  const typingId = addTypingIndicator();

  // Call secure Vercel proxy
  const result = await callAPI(currentPayment.agent.id, currentPayment.instruction);

  removeTypingIndicator(typingId);
  document.getElementById('agentStatusText').textContent = 'online · awaiting instruction';

  addAgentMessage(
    `✅ <strong>Task complete!</strong> Payment of <strong>${currentPayment.agent.price.toFixed(2)} USDC</strong> received ` +
    `(tx: <code style="font-family:'Space Mono',monospace;font-size:0.75rem;color:var(--accent2)">${txHash.slice(0,12)}...</code>)<br><br>${result}`
  );
  showToast('Task complete!', `tx: ${txHash.slice(0,16)}...`);

  document.getElementById('taskInput').value = '';
  btn.innerHTML = '🔐 Pay & Execute'; btn.disabled = false;
}

// ── API Call (secure proxy) ───────────────────────────────────────────────────
async function callAPI(agentId, instruction) {
  try {
    const res = await fetch(CONFIG.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: agentId, instruction }),
    });

    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const data = await res.json();
    return formatResponse(data.result || 'Task completed successfully.');

  } catch (err) {
    console.warn('API call failed, using fallback:', err.message);
    return getFallbackResponse(agentId, instruction);
  }
}

// ── Formatting ────────────────────────────────────────────────────────────────
function formatResponse(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, lang, code) =>
      `<pre style="background:rgba(153,69,255,0.08);border:1px solid rgba(153,69,255,0.2);border-radius:8px;padding:12px;margin:8px 0;overflow-x:auto;font-family:'Space Mono',monospace;font-size:0.78rem;line-height:1.5">${escapeHtml(code.trim())}</pre>`
    )
    .replace(/`(.*?)`/g, '<code style="font-family:\'Space Mono\',monospace;font-size:0.8rem;background:rgba(153,69,255,0.1);padding:1px 5px;border-radius:4px">$1</code>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n- /g, '<br>• ')
    .replace(/\n\d+\. /g, (m) => '<br>' + m.trim() + ' ')
    .replace(/\n/g, '<br>');
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getFallbackResponse(agentId, instruction) {
  const fb = {
    research:  `📋 <strong>Research Result:</strong><br><br>Analyzed your request about "<em>${instruction}</em>".<br><br>• Topic identified and processed<br>• Relevant data collected<br>• Insights generated<br><br><em>Note: Connect API key in Vercel environment variables for full AI responses.</em>`,
    summary:   `📝 <strong>Summary generated.</strong><br><br>Content analyzed and key points extracted successfully.<br><br><em>Connect API key for full AI responses.</em>`,
    code:      `💻 <strong>Code ready:</strong><br><br><pre style="background:rgba(153,69,255,0.08);border:1px solid rgba(153,69,255,0.2);border-radius:8px;padding:12px;font-family:'Space Mono',monospace;font-size:0.78rem"># Generated for: ${instruction}\nprint("Hello, Solana!")</pre>`,
    translate: `🌎 <strong>Translation complete.</strong><br><br>Text translated successfully.<br><em>Connect API key for full AI responses.</em>`,
    data:      `📊 <strong>Analysis complete.</strong><br><br>Data processed. Patterns identified.<br><em>Connect API key for full AI responses.</em>`,
    creative:  `✨ <strong>Content created!</strong><br><br>Text generated as requested.<br><em>Connect API key for full AI responses.</em>`,
  };
  return fb[agentId] || 'Task executed. Connect API key for full AI responses.';
}

// ── Chat Helpers ──────────────────────────────────────────────────────────────
function addAgentMessage(html) {
  const chat = document.getElementById('chatArea');
  const div  = document.createElement('div');
  div.className = 'msg agent';
  div.innerHTML = `<div class="msg-avatar">⚡</div><div class="msg-bubble">${html}</div>`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function addUserMessage(text) {
  const chat = document.getElementById('chatArea');
  const div  = document.createElement('div');
  div.className = 'msg user';
  div.innerHTML = `<div class="msg-avatar">👤</div><div class="msg-bubble">${text}</div>`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function addTypingIndicator() {
  const chat = document.getElementById('chatArea');
  const id   = 'typing-' + Date.now();
  const div  = document.createElement('div');
  div.className = 'msg agent'; div.id = id;
  div.innerHTML = `<div class="msg-avatar">⚡</div><div class="msg-bubble typing"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  return id;
}

function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function handleEnter(e) { if (e.key === 'Enter') initiatePayment(); }

// ── TX Log ────────────────────────────────────────────────────────────────────
function addTxItem(agent, hash, amount) {
  const list  = document.getElementById('txList');
  const empty = list.querySelector('div[style]');
  if (empty) empty.remove();

  const item = document.createElement('div');
  item.className = 'tx-item';
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
  const toast = document.getElementById('toast');
  document.getElementById('toastTitle').textContent = title;
  document.getElementById('toastSub').textContent   = sub;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4000);
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function generateSolanaAddress() {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let a = '';
  for (let i = 0; i < 44; i++) a += chars[Math.floor(Math.random() * chars.length)];
  return a;
}

function generateTxHash() {
  const c = '0123456789abcdef';
  let h = '';
  for (let i = 0; i < 64; i++) h += c[Math.floor(Math.random() * c.length)];
  return h;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
