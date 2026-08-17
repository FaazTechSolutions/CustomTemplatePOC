/* ═══════════════════════════════════════════════════════════
   SQL Query Executor – app.js
   Mawarid Connector · CON0000001
   ═══════════════════════════════════════════════════════════ */

'use strict';

// ── Config ────────────────────────────────────────────────────────────────────
const CFG = {
  BASE_URL:   'https://portal.mawarid.com.sa/apps4x-api/api/v1',
  COMPANY_ID: 'LGE0000001',
  CON_ID:     'CON0000001',
  USER_ID:    's.azam@mawarid.com.sa',
  APP_ID:     'Studio',
  TOKEN_KEY:  'eyjJwhtbtGockieOniJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzA0L3htbGRzaWctbW9yZSNobWFjLXNoYTI1NiIsInR5cCI6IkpXVCJ9',
};

// ── App state ─────────────────────────────────────────────────────────────────
let currentData = null;
let currentView = 'tree';
let allExpanded = true;

// ══════════════════════════════════════════════════════════
//  UTILITIES
// ══════════════════════════════════════════════════════════
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Build standard request headers for every API call */
function buildHeaders(token) {
  return {
    'accept':          'application/json, text/plain, */*',
    'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
    'appid':           CFG.APP_ID,
    'authorization':   `Bearer ${token}`,
    'companyid':       CFG.COMPANY_ID,
    'user-id':         CFG.USER_ID,
    'x-client-page':   `/Studio/${CFG.CON_ID}`,
  };
}

/**
 * Resolve the row array from any API response shape.
 * Priority:
 *   1. response.Data          ← primary (as per current API)
 *   2. response.Result.Data
 *   3. response[]             ← root array
 *   4. response.data
 *   5. [response]             ← wrap single object as fallback
 */
function extractRows(response) {
  if (response && Array.isArray(response.Data))              return response.Data;
  if (response && response.Result && Array.isArray(response.Result.Data)) return response.Result.Data;
  if (Array.isArray(response))                               return response;
  if (response && Array.isArray(response.data))              return response.data;
  return [response];
}

// ══════════════════════════════════════════════════════════
//  TOKEN MANAGEMENT
// ══════════════════════════════════════════════════════════
function getToken() {
  return localStorage.getItem(CFG.TOKEN_KEY) || null;
}

function checkToken() {
  const tok      = getToken();
  const badge    = document.getElementById('tokenBadge');
  const dot      = document.getElementById('statusDot');
  const text     = document.getElementById('statusText');
  const status   = document.getElementById('tokenStatus');
  const enterBtn = document.getElementById('btnEnterToken');

  if (tok) {
    badge.className  = 'token-pill ok';
    badge.textContent = '✓ Token loaded';
    dot.style.background = 'var(--success)';
    dot.style.animation  = 'pulse 2s infinite';
    text.textContent = 'Connected';
    status.style.cssText =
      'background:rgba(63,185,80,0.15);border:1px solid rgba(63,185,80,0.35);' +
      'color:var(--success);margin-left:auto;font-size:11px;font-weight:600;' +
      'padding:3px 10px;border-radius:20px;display:flex;align-items:center;gap:5px;transition:all 0.3s';
    enterBtn.textContent       = '🔑 Change Token';
    enterBtn.style.borderColor = 'rgba(63,185,80,0.4)';
    enterBtn.style.color       = 'var(--success)';
    closeTokenDrawer();
    loadAllObjects();
  } else {
    badge.className  = 'token-pill bad';
    badge.textContent = '⚠ No token';
    dot.style.background = 'var(--danger)';
    dot.style.animation  = 'none';
    text.textContent = 'No token';
    status.style.cssText =
      'background:rgba(248,81,73,0.12);border:1px solid rgba(248,81,73,0.3);' +
      'color:var(--danger);margin-left:auto;font-size:11px;font-weight:600;' +
      'padding:3px 10px;border-radius:20px;display:flex;align-items:center;gap:5px;transition:all 0.3s';
    enterBtn.textContent       = '🔑 Enter Token';
    enterBtn.style.borderColor = '';
    enterBtn.style.color       = '';
    openTokenDrawer();
  }
}

function openTokenDrawer() {
  document.getElementById('tokenDrawer').classList.add('open');
  setTimeout(() => document.getElementById('manualTokenInput').focus(), 350);
}

function closeTokenDrawer() {
  document.getElementById('tokenDrawer').classList.remove('open');
}

function saveManualToken() {
  const input = document.getElementById('manualTokenInput');
  const val   = input.value.trim();
  if (!val) {
    input.style.borderColor = 'var(--danger)';
    input.placeholder = '⚠ Please paste a token first';
    return;
  }
  // Strip "Bearer " prefix if user pasted the full header value
  const clean = val.replace(/^Bearer\s+/i, '');
  localStorage.setItem(CFG.TOKEN_KEY, clean);
  input.value        = '';
  input.style.borderColor = '';
  checkToken(); // closes drawer on success & triggers object load
}

function clearToken() {
  localStorage.removeItem(CFG.TOKEN_KEY);
  document.getElementById('manualTokenInput').value = '';
  checkToken();
}

// ══════════════════════════════════════════════════════════
//  SIDEBAR  –  Database Object Explorer
// ══════════════════════════════════════════════════════════

/** Load Tables, Views and SPs in parallel */
async function loadAllObjects() {
  const token = getToken();
  if (!token) return;
  await Promise.all([
    loadObjectGroup('tableobject', null,           'listTables', 'cntTables', 'table'),
    loadObjectGroup('viewobject',  null,           'listViews',  'cntViews',  'view'),
    loadObjectGroup('sysobjects',  'object_Type=P','listSPs',    'cntSPs',    'sp'),
  ]);
}

/**
 * Fetch one group of objects and render their names.
 * Confirmed API response shape: { Data: [{ ObjectName: "..." }, ...] }
 */
async function loadObjectGroup(endpoint, qs, listId, countId, type) {
  const token   = getToken();
  const listEl  = document.getElementById(listId);
  const countEl = document.getElementById(countId);

  listEl.innerHTML = '<div class="obj-status"><span class="obj-spinner"></span> Loading…</div>';
  countEl.textContent = '…';

  const url = `${CFG.BASE_URL}/${CFG.COMPANY_ID}/connector/${CFG.CON_ID}/sql/${endpoint}${qs ? '?' + qs : ''}`;

  try {
    const resp = await fetch(url, { headers: buildHeaders(token) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} – ${resp.statusText}`);

    // Read raw text first so we can show it if parsing fails
    const rawText = await resp.text();
    let json;
    try {
      json = JSON.parse(rawText);
    } catch (e) {
      throw new Error(`JSON parse failed. Raw: ${rawText.substring(0, 80)}`);
    }

    // ── Discover the items array – try every known path ──
    let items = [];
    const topKeys = Object.keys(json || {});

    if (Array.isArray(json?.Data))             { items = json.Data; }
    else if (Array.isArray(json?.Result?.Data)) { items = json.Result.Data; }
    else if (Array.isArray(json))               { items = json; }
    else if (Array.isArray(json?.data))         { items = json.data; }
    else {
      // Last resort: look for any array property
      for (const k of topKeys) {
        if (Array.isArray(json[k])) { items = json[k]; break; }
      }
    }

    // ── Extract name from each item ──
    const names = [];
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const name =
        item.ObjectName   ||
        item.object_name  ||
        item.name         ||
        item.Name         ||
        item.TABLE_NAME   ||
        item.VIEW_NAME    ||
        item.ROUTINE_NAME ||
        item.SPECIFIC_NAME ||
        // Last resort: first string value in the item
        Object.values(item).find(v => typeof v === 'string' && v.trim());

      if (name && typeof name === 'string' && name.trim()) {
        names.push(name.trim());
      }
    }

    names.sort((a, b) => a.localeCompare(b));
    countEl.textContent = names.length;

    // ── If still nothing, show the raw response shape so we can debug ──
    if (!names.length) {
      const shape = `Top-level keys: [${topKeys.join(', ')}] | items found: ${items.length} | raw: ${rawText.substring(0, 120)}`;
      listEl.innerHTML = `
        <div class="obj-status" style="color:var(--warning);flex-direction:column;align-items:flex-start;gap:3px;padding:8px 10px">
          <span style="font-weight:600;color:var(--danger)">⚠ 0 items resolved</span>
          <span style="font-size:10px;word-break:break-all;color:var(--muted)">${escHtml(shape)}</span>
        </div>`;
      return;
    }

    listEl.innerHTML = '';
    names.forEach(name => {
      const div = document.createElement('div');
      div.className    = 'obj-item';
      div.dataset.name = name.toLowerCase();
      div.dataset.type = type;
      div.title        = `Click to build a query for ${name}`;
      div.innerHTML    = `<span class="obj-item-icon">${
        type === 'table' ? '▤' : type === 'view' ? '◉' : '▶'
      }</span> ${escHtml(name)}`;
      div.addEventListener('click', () => selectObject(name, type, div));
      listEl.appendChild(div);
    });

  } catch (err) {
    console.error(`[${endpoint}] error:`, err);
    listEl.innerHTML  = `<div class="obj-status" style="color:var(--danger);flex-direction:column;align-items:flex-start;gap:3px;padding:8px 10px">
      <span style="font-weight:600">⚠ ${escHtml(err.message)}</span>
    </div>`;
    countEl.textContent = '!';
  }
}

/** Called when the user clicks a sidebar item – fills the query textarea */
function selectObject(name, type, el) {
  document.querySelectorAll('.obj-item.active').forEach(i => i.classList.remove('active'));
  el.classList.add('active');

  const queries = {
    table: `SELECT TOP 100 * FROM [${name}]`,
    view:  `SELECT TOP 100 * FROM [${name}]`,
    sp:    `EXEC [${name}]`,
  };
  const textarea = document.getElementById('queryInput');
  textarea.value = queries[type] ?? `SELECT * FROM [${name}]`;
  textarea.focus();
}

function toggleGroup(id) {
  document.getElementById(id).classList.toggle('open');
}

function filterSidebar() {
  const q = document.getElementById('sidebarSearch').value.toLowerCase().trim();
  document.querySelectorAll('.obj-item').forEach(item => {
    item.style.display = (!q || item.dataset.name.includes(q)) ? '' : 'none';
  });
  // Auto-expand groups that have a visible match
  ['grpTables', 'grpViews', 'grpSPs'].forEach(gid => {
    const grp        = document.getElementById(gid);
    const hasVisible = [...grp.querySelectorAll('.obj-item')].some(i => i.style.display !== 'none');
    if (q && hasVisible) grp.classList.add('open');
  });
}

// ══════════════════════════════════════════════════════════
//  QUERY EXECUTION
// ══════════════════════════════════════════════════════════
async function executeQuery() {
  const query = document.getElementById('queryInput').value.trim();
  if (!query) { showError('Please enter a SQL query.', ''); return; }

  const token = getToken();
  if (!token) {
    openTokenDrawer();
    showError('Bearer token required',
      'No token found in localStorage. Use the <strong>🔑 Enter Token</strong> panel above to paste your token, then run again.');
    return;
  }

  const btn = document.getElementById('runBtn');
  btn.disabled  = true;
  btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px"></span> Running…';
  showLoading();

  const url = `${CFG.BASE_URL}/${CFG.COMPANY_ID}/connector/${CFG.CON_ID}/sql/executebyquery?query=${encodeURIComponent(query)}`;
  const t0  = performance.now();

  try {
    const resp = await fetch(url, {
      method:  'POST',
      headers: { ...buildHeaders(token), 'content-length': '0' },
    });
    const elapsed = Math.round(performance.now() - t0);

    if (!resp.ok) {
      let msg = `HTTP ${resp.status} – ${resp.statusText}`;
      try { const j = await resp.json(); msg = j.message || j.error || msg; } catch { /* noop */ }
      showError(`Request failed (${resp.status})`, msg);
      return;
    }

    const json = await resp.json();
    currentData = json;
    renderResults(json, elapsed, resp.status);

  } catch (err) {
    showError('Network / CORS Error',
      `<strong>${escHtml(err.message)}</strong><br><br>
       This page must be served from <code>https://portal.mawarid.com.sa</code> for CORS to succeed.`);
  } finally {
    btn.disabled  = false;
    btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M5 3.5l8 4.5-8 4.5V3.5z"/></svg> Run Query';
  }
}

// ══════════════════════════════════════════════════════════
//  RESULTS RENDERING
// ══════════════════════════════════════════════════════════
function renderResults(data, elapsed, status) {
  const toolbar  = document.getElementById('resultsToolbar');
  const meta     = document.getElementById('resultsMeta');
  toolbar.style.display = 'flex';

  const rows     = extractRows(data);
  const rowCount = rows.length;

  meta.innerHTML = `
    <span class="badge badge-green">✓ ${status} OK</span>
    <span class="badge badge-blue">${rowCount.toLocaleString()} row${rowCount !== 1 ? 's' : ''}</span>
    <span class="exec-time">${elapsed} ms</span>
  `;

  allExpanded = true;
  document.getElementById('btnToggleExpand').textContent    = '⊟ Collapse All';
  document.getElementById('btnToggleExpand').style.display  = (currentView === 'tree') ? '' : 'none';

  if (currentView === 'tree') renderTree(data);
  else renderTable(data);
}

// ── JSON Tree ─────────────────────────────────────────────
function renderTree(data) {
  currentView = 'tree';
  document.getElementById('btnTree').classList.add('active');
  document.getElementById('btnTable').classList.remove('active');
  document.getElementById('btnToggleExpand').style.display = '';

  const wrap = document.getElementById('viewerWrap');
  wrap.innerHTML = '';

  // Search bar
  const sb = document.createElement('div');
  sb.className = 'search-wrap';
  sb.innerHTML = `<input class="search-input" id="treeSearch" placeholder="🔍  Filter keys / values…" oninput="filterTree()" />
                  <span class="search-count" id="treeCount"></span>`;
  wrap.appendChild(sb);

  const container = document.createElement('div');
  container.className = 'json-tree';
  container.appendChild(buildNode(data, null));
  wrap.appendChild(container);
}

function buildNode(val, key) {
  const frag    = document.createDocumentFragment();
  const keyHtml = key !== null
    ? `<span class="jk">"${escHtml(String(key))}"</span><span class="jbracket">: </span>`
    : '';

  if (val === null) {
    const s = span('jn', keyHtml + '<span class="jnull">null</span>');
    frag.appendChild(s); return frag;
  }
  if (typeof val === 'string') {
    const s = span('jn', keyHtml + `<span class="js">"${escHtml(val)}"</span>`);
    frag.appendChild(s); return frag;
  }
  if (typeof val === 'number') {
    const s = span('jn', keyHtml + `<span class="jnum">${val}</span>`);
    frag.appendChild(s); return frag;
  }
  if (typeof val === 'boolean') {
    const s = span('jn', keyHtml + `<span class="jb">${val}</span>`);
    frag.appendChild(s); return frag;
  }
  if (Array.isArray(val)) {
    return buildCollapsible(val, keyHtml, '[', ']', `${val.length} items`, (el, i) => buildNode(el, i));
  }
  if (val && typeof val === 'object') {
    const keys = Object.keys(val);
    return buildCollapsible(keys, keyHtml, '{', '}', `${keys.length} keys`, k => buildNode(val[k], k));
  }
  const s = span('jn', keyHtml + escHtml(String(val)));
  frag.appendChild(s); return frag;
}

function buildCollapsible(items, keyHtml, open, close, countText, buildChild) {
  const frag    = document.createDocumentFragment();
  const wrapper = document.createElement('div');

  const toggle = span('jn-toggle',
    `${keyHtml}<span class="jbracket">${open}</span><span class="jcount">${countText}</span>`);

  const children = document.createElement('div');
  children.className = 'jn-children';
  items.forEach((item, i) => children.appendChild(buildChild(item, i)));

  const closing = span('jn', `<span class="jbracket">${close}</span>`);

  toggle.addEventListener('click', () => {
    const c = toggle.classList.toggle('collapsed');
    children.classList.toggle('hidden', c);
  });

  wrapper.appendChild(toggle);
  wrapper.appendChild(children);
  wrapper.appendChild(closing);
  frag.appendChild(wrapper);
  return frag;
}

function span(cls, html) {
  const el = document.createElement('span');
  el.className = cls;
  el.innerHTML = html;
  return el;
}

function toggleExpandAll() {
  allExpanded = !allExpanded;
  document.querySelectorAll('.jn-toggle').forEach(t => t.classList.toggle('collapsed', !allExpanded));
  document.querySelectorAll('.jn-children').forEach(c => c.classList.toggle('hidden', !allExpanded));
  document.getElementById('btnToggleExpand').textContent = allExpanded ? '⊟ Collapse All' : '⊞ Expand All';
}

function filterTree() {
  const q       = document.getElementById('treeSearch').value.toLowerCase();
  const countEl = document.getElementById('treeCount');
  if (!q) { countEl.textContent = ''; return; }
  const json    = JSON.stringify(currentData, null, 2).toLowerCase();
  const re      = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  const matches = (json.match(re) || []).length;
  countEl.textContent = matches ? `${matches} match${matches > 1 ? 'es' : ''}` : 'No matches';
}

// ── Table view ────────────────────────────────────────────
function renderTable(data) {
  currentView = 'table';
  document.getElementById('btnTable').classList.add('active');
  document.getElementById('btnTree').classList.remove('active');
  document.getElementById('btnToggleExpand').style.display = 'none';

  const wrap = document.getElementById('viewerWrap');
  wrap.innerHTML = '';

  const rows = extractRows(data);   // ← uses response.Data primary path
  if (!rows.length) {
    wrap.innerHTML = `<div class="state-box"><div class="state-icon">📭</div><div class="state-title">Empty result set</div></div>`;
    return;
  }

  const cols = [...new Set(rows.flatMap(r => Object.keys(r || {})))];

  // Search bar
  const sb = document.createElement('div');
  sb.className = 'search-wrap';
  sb.innerHTML = `<input class="search-input" id="tableSearch" placeholder="🔍  Search rows…" oninput="filterTable()" />
                  <span class="search-count" id="tableCount">${rows.length} rows</span>`;
  wrap.appendChild(sb);

  // Table
  const tw    = document.createElement('div');
  tw.className = 'table-wrap';

  const table = document.createElement('table');
  table.className = 'result-table';

  const thead = document.createElement('thead');
  thead.innerHTML = `<tr>${cols.map(c => `<th>${escHtml(c)}</th>`).join('')}</tr>`;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  tbody.id = 'resultTbody';

  rows.forEach(row => {
    const tr = document.createElement('tr');
    tr.dataset.raw = JSON.stringify(row).toLowerCase();
    cols.forEach(c => {
      const td = document.createElement('td');
      const v  = row?.[c];
      if (v === null || v === undefined) {
        td.innerHTML = '<span class="cell-null">null</span>';
      } else if (typeof v === 'object') {
        td.innerHTML = `<code style="font-size:11px;color:var(--muted)">${escHtml(JSON.stringify(v))}</code>`;
      } else {
        td.textContent = String(v);
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  tw.appendChild(table);
  wrap.appendChild(tw);
}

function filterTable() {
  const q    = document.getElementById('tableSearch').value.toLowerCase();
  const rows = document.querySelectorAll('#resultTbody tr');
  let shown  = 0;
  rows.forEach(r => {
    const match = !q || r.dataset.raw.includes(q);
    r.style.display = match ? '' : 'none';
    if (match) shown++;
  });
  document.getElementById('tableCount').textContent = `${shown} / ${rows.length} rows`;
}

function switchView(v) {
  if (!currentData) return;
  if (v === 'tree') renderTree(currentData);
  else              renderTable(currentData);
}

// ══════════════════════════════════════════════════════════
//  STATE HELPERS
// ══════════════════════════════════════════════════════════
function showLoading() {
  document.getElementById('resultsToolbar').style.display = 'none';
  document.getElementById('viewerWrap').innerHTML = `
    <div class="state-box">
      <div class="spinner"></div>
      <div class="state-title">Executing query…</div>
      <div class="state-desc">Connecting to Mawarid API</div>
    </div>`;
}

function showError(title, detail) {
  document.getElementById('resultsToolbar').style.display = 'none';
  document.getElementById('viewerWrap').innerHTML = `
    <div class="state-box">
      <div class="state-icon">⚠️</div>
      <div class="state-title" style="color:var(--danger)">${title}</div>
      <div class="state-desc">${detail}</div>
    </div>`;
}

// ══════════════════════════════════════════════════════════
//  CLIPBOARD / DOWNLOAD
// ══════════════════════════════════════════════════════════
function copyJson() {
  if (!currentData) return;
  navigator.clipboard
    .writeText(JSON.stringify(currentData, null, 2))
    .then(() => {
      const btn  = document.querySelector('[onclick="copyJson()"]');
      const orig = btn.textContent;
      btn.textContent = '✓ Copied!';
      setTimeout(() => (btn.textContent = orig), 1500);
    })
    .catch(() => alert('Clipboard access denied'));
}

function downloadJson() {
  if (!currentData) return;
  const blob = new Blob([JSON.stringify(currentData, null, 2)], { type: 'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `query-result-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ══════════════════════════════════════════════════════════
//  SIDEBAR RESIZE  (drag handle)
// ══════════════════════════════════════════════════════════
(function initSidebarResize() {
  const handle  = document.getElementById('resizeHandle');
  const sidebar = document.getElementById('sidebar');
  let dragging  = false;
  let startX, startW;

  handle.addEventListener('pointerdown', e => {
    dragging = true;
    startX   = e.clientX;
    startW   = sidebar.offsetWidth;
    handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener('pointermove', e => {
    if (!dragging) return;
    const w = Math.max(160, Math.min(420, startW + e.clientX - startX));
    sidebar.style.width    = `${w}px`;
    sidebar.style.minWidth = `${w}px`;
  });
  handle.addEventListener('pointerup', () => { dragging = false; });
})();

// ══════════════════════════════════════════════════════════
//  KEYBOARD SHORTCUTS
// ══════════════════════════════════════════════════════════
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') executeQuery();
});

// ══════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════
checkToken();
