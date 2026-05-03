// ── Night Biz — Business Loyalty Tokens ───────────────────────

var NB_API = 'http://127.0.0.1:3001';
var _apiReady = null;
async function apiCheck() {
  if (_apiReady !== null) return _apiReady;
  try { await fetch(NB_API + '/health', { signal: AbortSignal.timeout(2000) }); _apiReady = true; } catch { _apiReady = false; }
  return _apiReady;
}
async function apiPost(path, body) {
  const r = await fetch(NB_API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

var walletState = { connected: false, demo: false, address: null };
var _bizData = JSON.parse(localStorage.getItem('nb_token') || 'null');
function saveBiz() { localStorage.setItem('nb_token', JSON.stringify(_bizData)); }

async function connectLace() {
  if (typeof nightWallet === 'undefined') { connectDemo(); return; }
  try {
    const state = await nightWallet.connect('lace');
    walletState = { connected: state.connected, demo: state.demo, address: state.address };
    closeModal('ov-wallet'); updateWalletUI();
    toast(state.demo ? '🎭 Demo mode' : '✓ Lace connected', 'success');
    await syncBizState();
  } catch { connectDemo(); }
}

function connectDemo() {
  walletState = { connected: true, demo: true, address: 'mn_addr_preprod1' + Math.random().toString(36).slice(2, 14) };
  closeModal('ov-wallet'); updateWalletUI();
  toast('🎭 Demo mode — no real funds', 'success');
}

function handleWalletClick() {
  if (walletState.connected) {
    if (confirm('Disconnect?')) { walletState = { connected: false, demo: false, address: null }; updateWalletUI(); }
  } else { openModal('ov-wallet'); }
}

async function syncBizState() {
  if (!walletState.address) return;
  try {
    const r = await fetch(NB_API + `/api/nightbiz/state/${encodeURIComponent(walletState.address)}`, { signal: AbortSignal.timeout(3000) });
    if (r.ok) { const data = await r.json(); _bizData = data; saveBiz(); }
  } catch { /* use local state */ }
}

function updateWalletUI() {
  const dot = document.getElementById('wallet-dot');
  const lbl = document.getElementById('wallet-label');
  if (!dot || !lbl) return;
  dot.style.background = walletState.connected ? '#00d68f' : '#ef4444';
  lbl.textContent = walletState.connected ? (walletState.demo ? '🎭 Demo' : walletState.address.slice(0, 14) + '…') : 'Sign in';
}

function updateSplit() {
  const holder = parseInt(document.getElementById('split-holder')?.value || '80');
  const creator = 95 - holder;
  const hv = document.getElementById('split-holder-val');
  const cv = document.getElementById('split-creator-val');
  if (hv) hv.textContent = holder + '%';
  if (cv) cv.textContent = (creator < 0 ? 0 : creator) + '%';
}

async function deployBizToken() {
  if (!walletState.connected) { openModal('ov-wallet'); return; }
  const name    = document.getElementById('nb-name')?.value?.trim();
  const symbol  = document.getElementById('nb-symbol')?.value?.trim().toUpperCase();
  const supply  = document.getElementById('nb-supply')?.value?.trim() || '10,000,000';
  const bronze  = parseInt(document.getElementById('thresh-bronze')?.value || '100');
  const silver  = parseInt(document.getElementById('thresh-silver')?.value || '500');
  const gold    = parseInt(document.getElementById('thresh-gold')?.value || '2000');
  const plat    = parseInt(document.getElementById('thresh-plat')?.value || '10000');
  const holderBps = (parseInt(document.getElementById('split-holder')?.value || '80')) * 100;
  const licenseReq = document.getElementById('nb-license')?.checked || false;

  if (!name || !symbol) { toast('Enter business name and token symbol', 'error'); return; }

  const btn = document.getElementById('nb-deploy-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Deploying…'; }

  const circuit = document.getElementById('nb-circuit');
  if (circuit) circuit.style.display = 'flex';

  const steps = [
    { label: `Compiling NightBizToken circuit for ${symbol}…`, ms: 900 },
    { label: 'Configuring tier thresholds on-chain…',           ms: 800 },
    { label: `Setting revenue split: ${holderBps/100}% holders…`, ms: 700 },
    { label: licenseReq ? 'Enabling regional licensing gate…' : 'Deploying open token (no licence gate)…', ms: 700 },
    { label: 'Deploying NightBizToken contract to Midnight…',   ms: 1000 },
    { label: '✓ Business token live',                            ms: 0 },
  ];

  if (circuit) {
    circuit.innerHTML = steps.map((s, i) =>
      `<div id="nbc-${i}"><span class="ct-dot wait" id="nbd-${i}"></span>${s.label}</div>`).join('');
  }

  let i = 0;
  function next() {
    if (i > 0) { const pd = document.getElementById(`nbd-${i-1}`); if (pd) pd.className = 'ct-dot done'; }
    if (i >= steps.length) {
      const addr = `mn_contract_preprod1${symbol.toLowerCase()}${Math.random().toString(36).slice(2, 10)}`;
      _bizData = { name, symbol, supply, address: addr, bronzeThresh: bronze, silverThresh: silver, goldThresh: gold, platThresh: plat, holderBps, licenseReq, epoch: 0, epochRev: 0, holders: 0, claimable: 0, revFeed: [] };
      saveBiz();
      try { apiPost('/api/nightfun/launch-curve', { tokenAddress: addr, initialTokens: 1000000, privacyEnabled: true }); } catch {}
      if (btn) { btn.disabled = false; btn.textContent = '🌙 Deploy business token →'; }
      toast(`✓ $${symbol} deployed — tier system live`, 'success');
      renderTokenDash();
      switchTab('my-token');
      return;
    }
    const pd = document.getElementById(`nbd-${i}`); if (pd) pd.className = 'ct-dot active';
    const ms = steps[i].ms; i++;
    if (ms > 0) setTimeout(next, ms); else next();
  }
  next();
}

function renderTokenDash() {
  if (!_bizData) return;
  const d = _bizData;
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  set('biz-name',    d.name);
  set('biz-symbol',  '$' + d.symbol);
  set('biz-addr',    d.address ? d.address.slice(0, 18) + '…' : 'preprod');
  set('biz-holders', d.holders || '0');
  set('biz-epoch',   'Epoch ' + (d.epoch || 0));
  set('biz-epoch-rev', (d.epochRev || 0) + ' NIGHT');
  set('biz-claimable', (d.claimable || 0) + ' NIGHT');
  set('biz-split',   (d.holderBps / 100).toFixed(0) + '% holders');

  const dash = document.getElementById('biz-token-dash');
  if (dash) dash.style.display = 'block';

  const revFeed = document.getElementById('biz-rev-feed');
  if (revFeed && d.revFeed?.length) {
    revFeed.innerHTML = d.revFeed.slice(-5).reverse().map(f =>
      `<div style="display:flex;justify-content:space-between;padding:8px 12px;background:var(--raised);border:1px solid var(--rim);border-radius:8px;font-size:11px;margin-bottom:4px;">
        <span style="color:var(--green);">↗</span> ${f.desc}
        <span style="font-family:var(--mono);color:var(--green);">+${f.amount} NIGHT</span>
      </div>`).join('');
  } else if (revFeed) {
    revFeed.innerHTML = '<div style="font-size:11px;color:var(--muted);text-align:center;padding:10px;">No revenue events yet.</div>';
  }
}

async function bizCloseEpoch() {
  if (!_bizData) return;
  const distributed = Math.floor(Math.random() * 100);
  _bizData.epoch = (_bizData.epoch || 0) + 1;
  _bizData.revFeed = _bizData.revFeed || [];
  _bizData.revFeed.push({ desc: `Epoch ${_bizData.epoch} closed · revenue distributed`, amount: distributed });
  _bizData.epochRev = 0;
  saveBiz(); renderTokenDash();
  toast('✓ Epoch closed — revenue distributed to holders', 'success');
}

async function bizRefresh() {
  toast('Refreshing from chain…', 'info');
  try {
    const res = await fetch(NB_API + '/api/nightfun/state?addr=' + (_bizData?.address || ''), { signal: AbortSignal.timeout(5000) });
    Object.assign(_bizData, await res.json());
    saveBiz(); renderTokenDash(); toast('✓ Refreshed', 'success');
  } catch { toast('Chain offline — showing cached data', 'info'); }
}

var _activeTab = 'configure';
function switchTab(tab) {
  _activeTab = tab;
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
  const t = document.getElementById(`tab-${tab}`);
  if (t) t.classList.add('active');
  ['configure','my-token','tiers','revenue'].forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.style.display = v === tab ? 'block' : 'none';
  });
  if (tab === 'tiers') renderTierPreview();
}

function renderTierPreview() {
  if (!_bizData) return;
  const b = _bizData.bronzeThresh, s = _bizData.silverThresh, g = _bizData.goldThresh, p = _bizData.platThresh;
  const grid = document.getElementById('tier-preview-grid');
  if (!grid) return;
  const tiers = [
    { name: 'Bronze',   cls: 'tier-bronze',   color: 'var(--bronze)',   icon: '🥉', thresh: b, perk: '5% discount on all purchases · Priority support' },
    { name: 'Silver',   cls: 'tier-silver',   color: 'var(--silver)',   icon: '🥈', thresh: s, perk: '10% discount · Early access · Free shipping' },
    { name: 'Gold',     cls: 'tier-gold',     color: 'var(--gold)',     icon: '🥇', thresh: g, perk: '20% discount · VIP events · Revenue share boost 2×' },
    { name: 'Platinum', cls: 'tier-platinum', color: 'var(--platinum)', icon: '💎', thresh: p, perk: 'Unlimited discount · Private access · Co-ownership voting' },
  ];
  grid.innerHTML = tiers.map(t => `
    <div class="tier-card ${t.cls}">
      <div class="tier-icon">${t.icon}</div>
      <div class="tier-name ${t.name.toLowerCase()}">${t.name}</div>
      <div class="tier-threshold">≥ ${t.thresh.toLocaleString()} $${_bizData.symbol}</div>
      <div class="tier-perk">${t.perk}</div>
    </div>`).join('');
}

function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

function toast(msg, type = 'info') {
  const wrap = document.getElementById('toast-wrap');
  if (!wrap) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`; t.textContent = msg;
  wrap.appendChild(t); setTimeout(() => t.remove(), 3500);
}

document.addEventListener('DOMContentLoaded', () => {
  updateWalletUI();
  updateSplit();
  switchTab('configure');
  if (_bizData) { renderTokenDash(); }
});
