/* ============================================================
   MAWARID – Attachment Manager  |  app.js
   ============================================================ */

/* ────────────────────────────────────────────────────────────
   ❶  CENTRALIZED CONFIGURATION  ← Change everything here
   ──────────────────────────────────────────────────────────── */
const CONFIG = {
  TOKEN:       'eyJhbGciOiJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzA0L3htbGRzaWctbW9yZSNobWFjLXNoYTI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VySWQiOiJhLmh5ZGVyIiwiTmFtZSI6Ikh5ZGVyIEFsaSBBIiwiRW1haWwiOiJoeWRlckBmYWF6dGVjaHNvbHV0aW9ucy5jb20iLCJNb2JpbGVOdW1iZXIiOiI5OTQzMjIxMzIxIiwiQ29tcGFueUlkIjoiTEdFMDAwMDAwMSIsImV4cCI6MTc4MTE2NzYxNywiaXNzIjoiYXBwczR4LmNvbSIsImF1ZCI6ImFwcHM0eC5jb20ifQ.iC6ztGEaLCCx-fqdqqmk3P0KdU3Th4gXjAHFvkC-RfY',
  COMPANY_ID:  'LGE0000001',
  ENTITY_ID:   '9d4eed72bbae44e5af7ca824a95b4423',
  /**
   * REF_REC_ID – read from the last URL path segment.
   * URL pattern: /apps4x/AttachmentDetails/{refRecId}
   * Returns null (no fallback) when the segment is missing or non-numeric.
   */
  REF_REC_ID: (() => {
    const seg = window.location.pathname.split('/').filter(Boolean).pop();
    return (seg && /^\d+$/.test(seg)) ? seg : null;
  })(),
  ENDPOINT:       'https://portal.mawarid.com.sa/apps4x-api/api/v1/metaobject/LGE0000001/byobjectId?objectId=9d4eed72bbae44e5af7ca824a95b4423',
  UPLOAD_BASE:    'https://portal.mawarid.com.sa/apps4x-api/api/v1/attachment/LGE0000001/upload',
  FILES_BASE:     'https://portal.mawarid.com.sa/apps4x-api/api/v1/attachment/LGE0000001/files',
  DOWNLOAD_BASE:  'https://portal.mawarid.com.sa/apps4x-api/api/v1/attachment/LGE0000001/download',
};

/* ─── Shared JSON headers ────────────────────────────────── */
function buildHeaders() {
  return {
    'Authorization': `Bearer ${CONFIG.TOKEN}`,
    'companyid':     CONFIG.COMPANY_ID,
    'Content-Type':  'application/json',
  };
}
/* ─── FormData headers (no Content-Type → browser sets boundary) ── */
function buildFormHeaders() {
  return {
    'Authorization': `Bearer ${CONFIG.TOKEN}`,
    'companyid':     CONFIG.COMPANY_ID,
  };
}
/* ─── Upload URL builder ─────────────────────────────────── */
function buildUploadUrl(att, file) {
  /* documentVersion = existing count + 1  (min 1) */
  const attId   = att.Id ?? att.Code ?? '';
  const version = (tileFileCounts[attId] ?? 0) + 1;
  const params  = new URLSearchParams({
    refRecId:        CONFIG.REF_REC_ID,
    documentType:    att.TypeId ?? att.Id ?? '',
    documentVersion: String(version),
    title:           att.TypeName ?? att.Name ?? 'Document',
    entityId:        CONFIG.ENTITY_ID,
    fileName:        file.name.replace(/\s+/g, '_'),
  });
  return `${CONFIG.UPLOAD_BASE}?${params.toString()}`;
}
/* ─── Download URL builder ───────────────────────────────── */
function buildDownloadUrl(recId) {
  const params = new URLSearchParams({
    entityId: CONFIG.ENTITY_ID,
    recId:    recId,
  });
  return `${CONFIG.DOWNLOAD_BASE}?${params.toString()}`;
}
/* ─── Authenticated file download ───────────────────────── */
async function downloadAttachment(recId, fileName) {
  try {
    const res = await fetch(buildDownloadUrl(recId), {
      method:  'GET',
      headers: buildHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = fileName || 'attachment';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('[Download] Error:', err);
    Swal.fire({
      icon: 'error', title: 'Download Failed',
      text: err.message ?? 'Could not download the file.',
      background: '#ffffff', color: '#1e293b', confirmButtonColor: '#fdbd3f',
    });
  }
}
/* ─── Files-list URL builder ─────────────────────────────── */
function buildFilesUrl(att) {
  const params = new URLSearchParams({
    doctypeId: att.TypeId ?? att.Id ?? '',
    refRecId:  CONFIG.REF_REC_ID,
    entityId:  CONFIG.ENTITY_ID,
  });
  return `${CONFIG.FILES_BASE}?${params.toString()}`;
}

/* ────────────────────────────────────────────────────────────
   ❷  DOM REFERENCES
   ──────────────────────────────────────────────────────────── */
const skeletonGrid      = document.getElementById('skeleton-grid');
const tilesGrid         = document.getElementById('tiles-grid');
const errorState        = document.getElementById('error-state');
const errorMessage      = document.getElementById('error-message');
const statusBadge       = document.getElementById('status-badge');
const badgeLabel        = document.getElementById('badge-label');
const btnRefresh        = document.getElementById('btn-refresh');
const btnRetry          = document.getElementById('btn-retry');

const modalBackdrop     = document.getElementById('modal-backdrop');
const modalClose        = document.getElementById('modal-close');
const btnCancel         = document.getElementById('btn-cancel');
const btnUpload         = document.getElementById('btn-upload');
const modalTitle        = document.getElementById('modal-title');
const modalSubtitle     = document.getElementById('modal-subtitle');
const modalIconWrap     = document.getElementById('modal-icon-wrap');

/* Files section */
const modalFilesLoading = document.getElementById('modal-files-loading');
const modalFilesEmpty   = document.getElementById('modal-files-empty');
const modalFilesList    = document.getElementById('modal-files-list');
const modalFilesBadge   = document.getElementById('modal-files-badge');

/* Upload section */
const dropZone          = document.getElementById('drop-zone');
const fileInput         = document.getElementById('file-input');
const filePreview       = document.getElementById('file-preview');
const previewName       = document.getElementById('preview-name');
const previewSize       = document.getElementById('preview-size');
const btnRemoveFile     = document.getElementById('btn-remove-file');
const uploadProgress    = document.getElementById('upload-progress');
const progressFill      = document.getElementById('progress-bar-fill');
const progressPct       = document.getElementById('progress-pct');

const toast             = document.getElementById('toast');
const toastMessage      = document.getElementById('toast-message');

/* ────────────────────────────────────────────────────────────
   ❸  APPLICATION STATE
   ──────────────────────────────────────────────────────────── */
let attachments      = [];
let selectedFile     = null;
let activeAttachment = null;   // { att, index }
let toastTimer       = null;
/** Cache tile file counts: attId → number */
const tileFileCounts = {};

/* ────────────────────────────────────────────────────────────
   ❹  STATUS BADGE
   ──────────────────────────────────────────────────────────── */
function setStatus(state, label) {
  statusBadge.className  = 'status-badge ' + state;
  badgeLabel.textContent = label;
}

/* ────────────────────────────────────────────────────────────
   ❺  LOAD ATTACHMENT TYPES
   ──────────────────────────────────────────────────────────── */
async function loadAttachments() {
  /* Guard: refuse to run without a valid record ID in the URL */
  if (!CONFIG.REF_REC_ID) {
    skeletonGrid.classList.add('hidden');
    setStatus('error', 'No Record ID');
    await Swal.fire({
      icon:              'error',
      title:             'Missing Record ID',
      html:              `<span style="color:#475569;font-size:14px">No valid record ID was found in the URL.<br><br>Please open this page as:<br><code style="background:#f1f5f9;padding:3px 8px;border-radius:4px;font-size:12px">/AttachmentDetails/<b>{recordId}</b></code></span>`,
      confirmButtonText: 'OK',
      background:        '#ffffff',
      color:             '#1e293b',
      confirmButtonColor:'#fdbd3f',
      customClass:       { popup: 'swal-mawarid', confirmButton: 'swal-mawarid-btn' },
      allowOutsideClick: false,
    });
    return;
  }

  skeletonGrid.classList.remove('hidden');
  tilesGrid.classList.add('hidden');
  errorState.classList.add('hidden');
  setStatus('loading', 'Loading…');

  try {
    const res = await fetch(CONFIG.ENDPOINT, { method: 'GET', headers: buildHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const json = await res.json();

    let parsedData = {};
    if (json.Data) {
      parsedData = typeof json.Data === 'string' ? JSON.parse(json.Data) : json.Data;
    }

    attachments = parsedData.Attachments ?? [];
    if (!attachments.length) throw new Error('No attachment types found in the response.');

    renderTiles(attachments);
    setStatus('ready', `${attachments.length} attachment type${attachments.length > 1 ? 's' : ''} loaded`);

  } catch (err) {
    console.error('[Attachment Manager] Load failed:', err);
    showError(err.message);
  } finally {
    skeletonGrid.classList.add('hidden');
  }
}

/* ────────────────────────────────────────────────────────────
   ❻  RENDER TILES  (no file loading here — lazy on click)
   ──────────────────────────────────────────────────────────── */
function renderTiles(list) {
  tilesGrid.innerHTML = '';
  list.forEach((att, index) => tilesGrid.appendChild(createTile(att, index)));
  tilesGrid.classList.remove('hidden');
}

function createTile(att, index) {
  const id    = att.Id  ?? att.Code  ?? String(index);
  const name  = att.TypeName ?? att.Name ?? att.Description ?? att.Label ?? `Attachment ${index + 1}`;
  const code  = att.Code ?? att.Type ?? '';
  const isReq = att.IsMandatory ?? att.Required ?? false;

  const tile = document.createElement('div');
  tile.className  = 'tile';
  tile.tabIndex   = 0;
  tile.role       = 'button';
  tile.dataset.id = id;
  tile.dataset.idx = String(index);
  tile.style.animationDelay = `${index * 55}ms`;
  tile.setAttribute('aria-label', `View attachments for: ${name}`);

  tile.innerHTML = `
    <div class="tile-icon-wrap" id="tile-icon-${escapeHtml(id)}">
      ${documentSVG()}
    </div>

    <div class="tile-body">
      <p class="tile-name">${escapeHtml(name)}</p>
      ${code ? `<p class="tile-code">${escapeHtml(code)}</p>` : ''}
    </div>

    <div class="tile-footer">
      <span class="tile-status" id="tile-status-${escapeHtml(id)}">
        ${isReq
          ? `<span style="color:var(--clr-warning)">●</span> Required`
          : `<span style="color:var(--clr-text-3)">○</span> Optional`}
      </span>
      <span class="tile-count-badge hidden" id="tile-count-${escapeHtml(id)}"></span>
      <span class="tile-action">
        ${attachSVG(13)} Open
      </span>
    </div>
  `;

  tile.addEventListener('click',   () => openModal(att, index));
  tile.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(att, index); }
  });
  return tile;
}

/* ─── Update tile badge from cached count ────────────────── */
function updateTileBadge(att) {
  const id    = att.Id ?? att.Code ?? '';
  const count = tileFileCounts[id];
  if (count === undefined) return;

  const tileEl    = tilesGrid.querySelector(`[data-id="${CSS.escape(id)}"]`);
  if (!tileEl) return;

  const iconWrap  = tileEl.querySelector(`#tile-icon-${CSS.escape(id)}`);
  const statusEl  = tileEl.querySelector(`#tile-status-${CSS.escape(id)}`);
  const countEl   = tileEl.querySelector(`#tile-count-${CSS.escape(id)}`);

  if (count > 0) {
    tileEl.classList.add('uploaded');
    if (iconWrap)  iconWrap.innerHTML  = uploadedSVG();
    if (statusEl)  statusEl.innerHTML  = `${checkSVG(14)} Attached`;
    if (countEl) {
      countEl.textContent = `${count} file${count > 1 ? 's' : ''}`;
      countEl.classList.remove('hidden');
    }
  } else {
    tileEl.classList.remove('uploaded');
    if (iconWrap) iconWrap.innerHTML = documentSVG();
    if (countEl) countEl.classList.add('hidden');
  }
}

/* ────────────────────────────────────────────────────────────
   ❼  MODAL — OPEN / CLOSE
   ──────────────────────────────────────────────────────────── */
function openModal(att, index) {
  activeAttachment = { att, index };
  const name = att.TypeName ?? att.Name ?? att.Description ?? att.Label ?? `Attachment ${index + 1}`;

  modalTitle.textContent    = name;
  modalSubtitle.textContent = `Manage files for "${name}"`;
  modalIconWrap.innerHTML   = documentSVG(28);

  /* Reset upload section */
  clearFileSelection();
  uploadProgress.classList.add('hidden');

  /* Reset files section to loading state */
  setFilesState('loading');

  modalBackdrop.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => modalClose.focus());

  /* Fetch files for this attachment type */
  loadModalFiles(att);
}

function closeModal() {
  modalBackdrop.classList.add('hidden');
  document.body.style.overflow = '';
  clearFileSelection();
  uploadProgress.classList.add('hidden');
  activeAttachment = null;
}

/* ────────────────────────────────────────────────────────────
   ❽  LOAD & RENDER FILES INSIDE MODAL
   ──────────────────────────────────────────────────────────── */
async function loadModalFiles(att) {
  setFilesState('loading');

  try {
    const res = await fetch(buildFilesUrl(att), { method: 'GET', headers: buildHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const data  = await res.json();
    /* Normalise – API may return an array or wrap it in a property */
    const files = Array.isArray(data)
      ? data
      : (data.Data ?? data.Value ?? data.Files ?? data.Attachments ?? data.Result ?? []);

    /* Cache the count for the tile badge */
    const id = att.Id ?? att.Code ?? '';
    tileFileCounts[id] = files.length;
    updateTileBadge(att);

    renderModalFiles(files);

  } catch (err) {
    console.warn('[Files] Load failed:', err);
    setFilesState('empty');   // show "No files" on error too
  }
}

function setFilesState(state) {
  /* state: 'loading' | 'empty' | 'list' */
  modalFilesLoading.classList.toggle('hidden', state !== 'loading');
  modalFilesEmpty.classList.toggle('hidden',   state !== 'empty');
  modalFilesList.classList.toggle('hidden',    state !== 'list');
  modalFilesBadge.classList.add('hidden');
}

function renderModalFiles(files) {
  if (!files.length) {
    setFilesState('empty');
    return;
  }

  const SHOW_LIMIT = 5;

  /* ── Sort newest-first ──────────────────────────────────── */
  const sorted = [...files].sort((a, b) => {
    const da = new Date(a.CreatedAt ?? a.UploadedOn ?? a.Date ?? 0).getTime();
    const db = new Date(b.CreatedAt ?? b.UploadedOn ?? b.Date ?? 0).getTime();
    return db - da;
  });
  /* If the API returns no date fields at all, reverse (API usually
     appends newest at the end, so reversing gives newest-first) */
  if (!sorted.some(f => f.CreatedAt ?? f.UploadedOn ?? f.Date)) sorted.reverse();

  /* Show count badge */
  modalFilesBadge.textContent = sorted.length;
  modalFilesBadge.classList.remove('hidden');

  /* ── Build file rows ─────────────────────────────────────── */
  const rowsHTML = sorted.map((f, i) => {
    const isLatest = i === 0;
    const fname = f.Name ?? f.FileName ?? f.Title ?? f.fileName ?? f.name ?? `File ${i + 1}`;
    const fsize = f.FileSize ?? f.Size  ?? f.fileSize ?? null;
    const fdate = f.CreatedAt ?? f.UploadedOn ?? f.Date ?? null;
    const recId = f.RecId ?? f.recId ?? f.Id ?? f.id ?? null;
    const hiddenStyle = i >= SHOW_LIMIT ? ' style="display:none"' : '';

    return `
      <div class="mf-item${isLatest ? ' mf-item-latest' : ''}" id="mf-item-${i}" data-extra="${i >= SHOW_LIMIT}"${hiddenStyle}>
        <div class="mf-item-icon${isLatest ? ' mf-icon-latest' : ''}">
          ${isLatest ? starSVG(16) : fileIconSVG(18)}
        </div>
        <div class="mf-item-meta">
          <p class="mf-item-name" title="${escapeHtml(fname)}">
            ${escapeHtml(fname)}
            ${isLatest ? '<span class="mf-badge-latest">Latest</span>' : ''}
          </p>
          <p class="mf-item-sub">
            ${fsize ? `<span>${formatBytes(fsize)}</span>` : ''}
            ${fdate ? `<span>${formatDate(fdate)}</span>` : ''}
          </p>
        </div>
        <div class="mf-item-actions">
          ${recId != null ? `
            <button
              class="mf-btn mf-btn-dl"
              title="Download"
              onclick="downloadAttachment('${escapeHtml(String(recId))}','${escapeHtml(fname)}')"
            >${downloadSVG(14)}</button>` : ''}
        </div>
      </div>`;
  }).join('');

  /* ── Show-more button (only when there are extra items) ─── */
  const extra = sorted.length - SHOW_LIMIT;
  const showMoreHTML = extra > 0 ? `
    <button class="mf-show-more" id="mf-show-more" data-expanded="false"
      onclick="toggleExtraFiles(this, ${extra})">
      ${chevronDownSVG(12)}
      Show ${extra} more file${extra > 1 ? 's' : ''}
    </button>` : '';

  modalFilesList.innerHTML = rowsHTML + showMoreHTML;
  setFilesState('list');
}

/* Toggle hidden extra files */
function toggleExtraFiles(btn, extra) {
  const isExpanded = btn.dataset.expanded === 'true';
  modalFilesList.querySelectorAll('[data-extra="true"]').forEach(el => {
    el.style.display = isExpanded ? 'none' : 'flex';
  });
  btn.dataset.expanded = isExpanded ? 'false' : 'true';
  btn.innerHTML = isExpanded
    ? `${chevronDownSVG(12)} Show ${extra} more file${extra > 1 ? 's' : ''}`
    : `${chevronUpSVG(12)} Show less`;
}

/* ────────────────────────────────────────────────────────────
   ❾  FILE SELECTION
   ──────────────────────────────────────────────────────────── */
function onFileSelected(file) {
  if (!file) return;
  selectedFile = file;
  previewName.textContent = file.name;
  previewSize.textContent = formatBytes(file.size);
  filePreview.classList.remove('hidden');
  dropZone.classList.add('hidden');
  btnUpload.disabled = false;
}

function clearFileSelection() {
  selectedFile = null;
  fileInput.value = '';
  filePreview.classList.add('hidden');
  dropZone.classList.remove('hidden');
  btnUpload.disabled = true;
}

/* ────────────────────────────────────────────────────────────
   ❿  UPLOAD
   ──────────────────────────────────────────────────────────── */
async function uploadFile() {
  if (!selectedFile || !activeAttachment) return;
  const { att } = activeAttachment;

  btnUpload.disabled = true;
  btnCancel.disabled = true;
  uploadProgress.classList.remove('hidden');
  setProgress(0);

  try {
    const progressDone = simulateProgress();

    const formData = new FormData();
    formData.append('file', selectedFile);

    const res = await fetch(buildUploadUrl(att, selectedFile), {
      method:  'POST',
      headers: buildFormHeaders(),
      body:    formData,
    });

    await progressDone;
    setProgress(100);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Upload failed (HTTP ${res.status})${errBody ? ': ' + errBody : ''}`);
    }

    await delay(350);

    /* Clear the selected file and refresh the files list in modal */
    clearFileSelection();
    uploadProgress.classList.add('hidden');
    await loadModalFiles(att);

    /* SweetAlert success */
    const typeName = att.TypeName ?? att.Name ?? 'Document';
    await Swal.fire({
      icon:              'success',
      title:             'Uploaded Successfully!',
      html:              `<span style="color:#475569;font-size:14px"><b style="color:#1e293b">${escapeHtml(typeName)}</b><br>has been attached successfully.</span>`,
      confirmButtonText: 'Done',
      background:        '#ffffff',
      color:             '#1e293b',
      confirmButtonColor:'#fdbd3f',
      customClass: { popup: 'swal-mawarid', confirmButton: 'swal-mawarid-btn' },
    });

  } catch (err) {
    console.error('[Upload] Error:', err);
    setProgress(0);
    await Swal.fire({
      icon:              'error',
      title:             'Upload Failed',
      text:              err.message ?? 'An unexpected error occurred. Please try again.',
      confirmButtonText: 'Close',
      background:        '#ffffff',
      color:             '#1e293b',
      confirmButtonColor:'#dc2626',
    });
  } finally {
    btnUpload.disabled = false;
    btnCancel.disabled = false;
  }
}

/* ────────────────────────────────────────────────────────────
   ⓫  HELPERS
   ──────────────────────────────────────────────────────────── */
function setProgress(pct) {
  progressFill.style.width = pct + '%';
  progressPct.textContent  = pct + '%';
}

function simulateProgress() {
  return new Promise(resolve => {
    let pct = 0;
    const iv = setInterval(() => {
      pct += Math.random() * 18 + 4;
      if (pct >= 90) { pct = 90; clearInterval(iv); resolve(); }
      setProgress(Math.round(pct));
    }, 180);
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024)         return bytes + ' B';
  if (bytes < 1048576)      return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(2) + ' MB';
}

function formatDate(raw) {
  try {
    return new Date(raw).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return ''; }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])
  );
}

function showError(msg) {
  errorMessage.textContent = msg;
  errorState.classList.remove('hidden');
  tilesGrid.classList.add('hidden');
  setStatus('error', 'Error');
}

function showToast(msg, isError = false) {
  clearTimeout(toastTimer);
  toast.classList.remove('hidden', 'error-toast');
  if (isError) toast.classList.add('error-toast');
  toastMessage.textContent = msg;
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 4000);
}

/* ────────────────────────────────────────────────────────────
   ⓬  SVG HELPERS
   ──────────────────────────────────────────────────────────── */
function documentSVG(size = 24) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;
}

function uploadedSVG(size = 24) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--clr-success)"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
}

function checkSVG(size = 14) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
}

function attachSVG(size = 14) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>`;
}

function fileIconSVG(size = 16) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`;
}

function downloadSVG(size = 16) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
}

function chevronDownSVG(size = 14) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
}

function chevronUpSVG(size = 14) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`;
}

function starSVG(size = 16) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
}

/* ────────────────────────────────────────────────────────────
   ⓭  EVENT LISTENERS
   ──────────────────────────────────────────────────────────── */
btnRefresh.addEventListener('click', loadAttachments);
btnRetry.addEventListener('click',   loadAttachments);

modalClose.addEventListener('click', closeModal);
btnCancel.addEventListener('click',  closeModal);
modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

fileInput.addEventListener('change', (e) => onFileSelected(e.target.files[0]));

dropZone.addEventListener('dragover',  (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', ()  => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) onFileSelected(file);
});

btnRemoveFile.addEventListener('click', clearFileSelection);
btnUpload.addEventListener('click', uploadFile);

/* ────────────────────────────────────────────────────────────
   ⓮  BOOT
   ──────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', loadAttachments);
