var _this = this;
var token = localStorage.getItem("eyjJwhtbtGockieOniJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzA0L3htbGRzaWctbW9yZSNobWFjLXNoYTI1NiIsInR5cCI6IkpXVCJ9");
var CompanyId = localStorage.getItem('CompanyId');
var recId = _this.globalService.route.queryParams._value.RecId || _this.ParentData?.RecId;
const CONFIG = {
  TOKEN: token,
  // TOKEN:       'eyJhbGciOiJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzA0L3htbGRzaWctbW9yZSNobWFjLXNoYTI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VySWQiOiJhLmh5ZGVyIiwiTmFtZSI6Ikh5ZGVyIEFsaSBBIiwiRW1haWwiOiJoeWRlckBmYWF6dGVjaHNvbHV0aW9ucy5jb20iLCJNb2JpbGVOdW1iZXIiOiI5OTQzMjIxMzIxIiwiQ29tcGFueUlkIjoiTEdFMDAwMDAwMSIsImV4cCI6MTc4MTE2NzYxNywiaXNzIjoiYXBwczR4LmNvbSIsImF1ZCI6ImFwcHM0eC5jb20ifQ.iC6ztGEaLCCx-fqdqqmk3P0KdU3Th4gXjAHFvkC-RfY',
  COMPANY_ID: CompanyId,
  // COMPANY_ID:  'LGE0000001',
  ENTITY_ID: '9d4eed72bbae44e5af7ca824a95b4423',
  // REF_REC_ID:  '{{Query.RecId}}',
  REF_REC_ID: recId,
  ENDPOINT: 'https://portal.mawarid.com.sa/apps4x-api/api/v1/metaobject/{{Local.CompanyId}}/byobjectId?objectId=9d4eed72bbae44e5af7ca824a95b4423',
  FILES_BASE: 'https://portal.mawarid.com.sa/apps4x-api/api/v1/attachment/{{Local.CompanyId}}/files',
  DOWNLOAD_BASE: 'https://portal.mawarid.com.sa/apps4x-api/api/v1/attachment/{{Local.CompanyId}}/download',
  //  ENDPOINT:       'https://portal.mawarid.com.sa/apps4x-api/api/v1/metaobject/LGE0000001/byobjectId?objectId=9d4eed72bbae44e5af7ca824a95b4423',
  // FILES_BASE:     'https://portal.mawarid.com.sa/apps4x-api/api/v1/attachment/LGE0000001/files',
  // DOWNLOAD_BASE:  'https://portal.mawarid.com.sa/apps4x-api/api/v1/attachment/LGE0000001/download',
};

/* ─── Shared JSON headers ────────────────────────────────── */
function buildHeaders() {
  return {
    'Authorization': `Bearer ${CONFIG.TOKEN}`,
    'companyid': CONFIG.COMPANY_ID,
    'Content-Type': 'application/json',
  };
}
/* ─── Download URL builder ───────────────────────────────── */
function buildDownloadUrl(recId) {
  const params = new URLSearchParams({
    entityId: CONFIG.ENTITY_ID,
    recId: recId,
  });
  return `${CONFIG.DOWNLOAD_BASE}?${params.toString()}`;
}
/* ─── Authenticated file download ───────────────────────── */
async function downloadAttachment(recId, fileName) {
  try {
    const data = await $.ajax({
      url: buildDownloadUrl(recId),
      method: 'GET',
      headers: buildHeaders(),
      xhrFields: {
        responseType: 'blob'
      }
    });
    const url = URL.createObjectURL(data);
    const $a = $('<a/>', {
      href: url,
      download: fileName || 'attachment'
    }).appendTo('body');
    $a[0].click();
    $a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('[Download] Error:', err);
    Swal.fire({
      icon: 'error', title: 'Download Failed',
      text: err.statusText ?? 'Could not download the file.',
      background: '#ffffff', color: '#1e293b', confirmButtonColor: '#fdbd3f',
    });
  }
}
/* ─── Files-list URL builder ─────────────────────────────── */
function buildFilesUrl(att) {
  const params = new URLSearchParams({
    doctypeId: att.TypeId ?? att.Id ?? '',
    refRecId: CONFIG.REF_REC_ID,
    entityId: CONFIG.ENTITY_ID,
  });
  return `${CONFIG.FILES_BASE}?${params.toString()}`;
}

/* ────────────────────────────────────────────────────────────
   ❷  DOM REFERENCES
   ──────────────────────────────────────────────────────────── */
let $skeletonGrid, $tilesGrid, $errorState, $errorMessage, $statusBadge, $badgeLabel;
let $btnRefresh, $btnRetry, $modalBackdrop, $modalClose, $btnCancel, $btnUpload;
let $modalTitle, $modalSubtitle, $modalFilesLoading, $modalFilesEmpty;
let $modalFilesList, $modalFilesBadge;
let $dropZone, $filePreview, $previewName, $previewSize, $btnRemoveFile;
let $uploadProgress, $progressFill, $progressPct;

function initDOMReferences() {
  $skeletonGrid = $('#skeleton-grid');
  $tilesGrid = $('#tiles-grid');
  $errorState = $('#error-state');
  $errorMessage = $('#error-message');
  $statusBadge = $('#status-badge');
  $badgeLabel = $('#badge-label');
  $btnRefresh = $('#btn-refresh');
  $btnRetry = $('#btn-retry');

  $modalBackdrop = $('#modal-backdrop');
  $modalClose = $('#modal-close');
  $btnCancel = $('#btn-cancel');
  $modalTitle = $('#modal-title');
  $modalSubtitle = $('#modal-subtitle');

  $modalFilesLoading = $('#modal-files-loading');
  $modalFilesEmpty = $('#modal-files-empty');
  $modalFilesList = $('#modal-files-list');
  $modalFilesBadge = $('#modal-files-badge');

  $dropZone = $('#drop-zone');
  $filePreview = $('#file-preview');
  $previewName = $('#preview-name');
  $previewSize = $('#preview-size');
  $btnRemoveFile = $('#btn-remove-file');
  $uploadProgress = $('#upload-progress');
  $progressFill = $('#progress-bar-fill');
  $progressPct = $('#progress-pct');

  $btnUpload = $('#btn-upload');
}

/* ────────────────────────────────────────────────────────────
   ❸  APPLICATION STATE
   ──────────────────────────────────────────────────────────── */
let attachments = [];
let selectedFile = null;
let activeAttachment = null;   // { att, index }
/** Cache tile file counts: attId → number */
const tileFileCounts = {};

/* ────────────────────────────────────────────────────────────
   ❹  STATUS BADGE
   ──────────────────────────────────────────────────────────── */
function setStatus(state, label) {
  $statusBadge.attr('class', 'status-badge ' + state);
  $badgeLabel.text(label);
}

/* ────────────────────────────────────────────────────────────
   ❺  LOAD ATTACHMENT TYPES
   ──────────────────────────────────────────────────────────── */
async function loadAttachments() {
  if (!CONFIG.REF_REC_ID) {
    $skeletonGrid.addClass('hidden');
    setStatus('error', 'No Record ID');
    await Swal.fire({
      icon: 'error',
      title: 'Missing Record ID',
      html: `<span style="color:#475569;font-size:14px">No valid record ID was found in the URL.<br><br>Please open this page as:<br><code style="background:#f1f5f9;padding:3px 8px;border-radius:4px;font-size:12px">/AttachmentDetails/<b>{recordId}</b></code></span>`,
      confirmButtonText: 'OK',
      background: '#ffffff',
      color: '#1e293b',
      confirmButtonColor: '#fdbd3f',
      customClass: { popup: 'swal-mawarid', confirmButton: 'swal-mawarid-btn' },
      allowOutsideClick: false,
    });
    return;
  }

  $skeletonGrid.removeClass('hidden');
  $tilesGrid.addClass('hidden');
  $errorState.addClass('hidden');

  try {
    const json = await $.ajax({
      url: CONFIG.ENDPOINT,
      method: 'GET',
      headers: buildHeaders()
    });

    let parsedData = {};
    if (json.Data) {
      parsedData = typeof json.Data === 'string' ? JSON.parse(json.Data) : json.Data;
    }

    attachments = parsedData.Attachments ?? [];
    if (!attachments.length) throw new Error('No attachment types found in the response.');

    attachments.forEach(att => {
      if (att.TypeId === '6fb7fe4a0c014398abd6caad24d54104') {
        att.TypeName = 'Others';
        att.Name = 'Others';
      } else {
        if (att.TypeName) att.TypeName = att.TypeName.replace(/_/g, ' ');
        if (att.Name) att.Name = att.Name.replace(/_/g, ' ');
      }
    });

    renderTiles(attachments);
    setStatus('ready', `${attachments.length} attachment type${attachments.length > 1 ? 's' : ''} loaded`);

  } catch (err) {
    console.error('[Attachment Manager] Load failed:', err);
    showError(err.message || err.statusText || 'Failed to load data');
  } finally {
    $skeletonGrid.addClass('hidden');
    $btnRefresh.removeClass('loading').prop('disabled', false);
  }
}

/* ────────────────────────────────────────────────────────────
   ❻  RENDER TILES
   ──────────────────────────────────────────────────────────── */
function renderTiles(list) {
  $tilesGrid.empty();
  list.forEach((att, index) => $tilesGrid.append(createTile(att, index)));
  $tilesGrid.removeClass('hidden');
}

function createTile(att, index) {
  const id = att.Id ?? att.Code ?? String(index);
  const name = att.TypeName ?? att.Name ?? att.Description ?? att.Label ?? `Attachment ${index + 1}`;
  const code = att.Code ?? att.Type ?? '';
  const isReq = att.Mandatory ?? att.Required ?? false;

  const $tile = $('<div/>', {
    class: 'tile',
    tabindex: 0,
    role: 'button',
    'data-id': id,
    'data-idx': String(index),
    'aria-label': `View attachments for: ${name}`,
    css: { animationDelay: `${index * 55}ms` },
    html: `
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
        ? `<span style="color:var(--clr-danger)">! Required</span>`
        : `<span style="color:var(--clr-warning)">- Optional</span>`}
        </span>
        <span class="tile-count-badge hidden" id="tile-count-${escapeHtml(id)}"></span>
        <span class="tile-action">
          ${eyeSVG(13)} View
        </span>
      </div>
    `,
    click: () => openModal(att, index),
    keydown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(att, index); }
    }
  });

  return $tile;
}

/* ─── Update tile badge from cached count ────────────────── */
function updateTileBadge(att) {
  const id = att.Id ?? att.Code ?? '';
  const count = tileFileCounts[id];
  if (count === undefined) return;

  const $tileEl = $tilesGrid.find(`[data-id="${CSS.escape(id)}"]`);
  if (!$tileEl.length) return;

  const $iconWrap = $tileEl.find(`#tile-icon-${CSS.escape(id)}`);
  const $statusEl = $tileEl.find(`#tile-status-${CSS.escape(id)}`);
  const $countEl = $tileEl.find(`#tile-count-${CSS.escape(id)}`);

  if (count > 0) {
    $tileEl.addClass('uploaded');
    if ($iconWrap.length) $iconWrap.html(uploadedSVG());
    if ($statusEl.length) $statusEl.html(`${checkSVG(14)} Attached`);
    if ($countEl.length) {
      $countEl.text(`${count} file${count > 1 ? 's' : ''}`);
      $countEl.removeClass('hidden');
    }
  } else {
    $tileEl.removeClass('uploaded');
    if ($iconWrap.length) $iconWrap.html(documentSVG());
    if ($countEl.length) $countEl.addClass('hidden');
  }
}

/* ────────────────────────────────────────────────────────────
   ❼  MODAL — OPEN / CLOSE
   ──────────────────────────────────────────────────────────── */
function openModal(att, index) {
  activeAttachment = { att, index };
  const name = att.TypeName ?? att.Name ?? att.Description ?? att.Label ?? `Attachment ${index + 1}`;

  $modalTitle.text(name);
  $modalSubtitle.text(`Manage files for "${name}"`);

  /* Reset upload section */
  clearFileSelection();
  $uploadProgress.addClass('hidden');

  /* Reset files section to loading state */
  setFilesState('loading');

  $modalBackdrop.removeClass('hidden');
  $('body').css('overflow', 'hidden');
  requestAnimationFrame(() => $modalClose.focus());

  /* Fetch files for this attachment type */
  loadModalFiles(att);
}

function closeModal() {
  $modalBackdrop.addClass('hidden');
  $('body').css('overflow', '');
  clearFileSelection();
  $uploadProgress.addClass('hidden');
  activeAttachment = null;
}

/* ────────────────────────────────────────────────────────────
   ❽  LOAD & RENDER FILES INSIDE MODAL
   ──────────────────────────────────────────────────────────── */
async function loadModalFiles(att) {
  setFilesState('loading');

  try {
    const data = await $.ajax({
      url: buildFilesUrl(att),
      method: 'GET',
      headers: buildHeaders()
    });

    const files = Array.isArray(data)
      ? data
      : (data.Data ?? data.Value ?? data.Files ?? data.Attachments ?? data.Result ?? []);

    const id = att.Id ?? att.Code ?? '';
    tileFileCounts[id] = files.length;
    updateTileBadge(att);

    renderModalFiles(files);

  } catch (err) {
    console.warn('[Files] Load failed:', err);
    setFilesState('empty');
  }
}

function setFilesState(state) {
  $modalFilesLoading.toggleClass('hidden', state !== 'loading');
  $modalFilesEmpty.toggleClass('hidden', state !== 'empty');
  $modalFilesList.toggleClass('hidden', state !== 'list');
  $modalFilesBadge.addClass('hidden');
}

function renderModalFiles(files) {
  if (!files.length) {
    setFilesState('empty');
    return;
  }

  const SHOW_LIMIT = 5;

  const sorted = [...files].sort((a, b) => {
    const da = new Date(a.CreatedAt ?? a.UploadedOn ?? a.Date ?? 0).getTime();
    const db = new Date(b.CreatedAt ?? b.UploadedOn ?? b.Date ?? 0).getTime();
    return db - da;
  });
  if (!sorted.some(f => f.CreatedAt ?? f.UploadedOn ?? f.Date)) sorted.reverse();

  $modalFilesBadge.text(sorted.length).removeClass('hidden');

  const rowsHTML = sorted.map((f, i) => {
    const isLatest = i === 0;
    const fname = f.Name ?? f.FileName ?? f.Title ?? f.fileName ?? f.name ?? `File ${i + 1}`;
    const fsize = f.FileSize ?? f.Size ?? f.fileSize ?? null;
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

  const extra = sorted.length - SHOW_LIMIT;
  const showMoreHTML = extra > 0 ? `
    <button class="mf-show-more" id="mf-show-more" data-expanded="false"
      onclick="toggleExtraFiles(this, ${extra})">
      ${chevronDownSVG(12)}
      Show ${extra} more file${extra > 1 ? 's' : ''}
    </button>` : '';

  $modalFilesList.html(rowsHTML + showMoreHTML);
  setFilesState('list');
}

window.toggleExtraFiles = function (btn, extra) {
  const $btn = $(btn);
  const isExpanded = $btn.attr('data-expanded') === 'true';
  $modalFilesList.find('[data-extra="true"]').css('display', isExpanded ? 'none' : 'flex');
  $btn.attr('data-expanded', isExpanded ? 'false' : 'true');
  $btn.html(isExpanded
    ? `${chevronDownSVG(12)} Show ${extra} more file${extra > 1 ? 's' : ''}`
    : `${chevronUpSVG(12)} Show less`);
};

window.downloadAttachment = downloadAttachment;

/* ────────────────────────────────────────────────────────────
   ❹  FILE SELECTION (drop only — no file manager)
   ──────────────────────────────────────────────────────────── */
function onFileSelected(file) {
  if (!file) return;
  selectedFile = file;
  $previewName.text(file.name);
  $previewSize.text(formatBytes(file.size));
  $filePreview.removeClass('hidden');
  $dropZone.addClass('hidden');
  $btnUpload.prop('disabled', false);
}

function clearFileSelection() {
  selectedFile = null;
  $filePreview.addClass('hidden');
  $dropZone.removeClass('hidden');
  $btnUpload.prop('disabled', true);
}

/* ────────────────────────────────────────────────────────────
   ❺  UPLOAD
   ──────────────────────────────────────────────────────────── */
async function uploadFile() {
  if (!selectedFile || !activeAttachment) return;
  const { att } = activeAttachment;

  $btnUpload.prop('disabled', true);
  $btnCancel.prop('disabled', true);
  $uploadProgress.removeClass('hidden');
  setProgress(0);

  try {
    const progressDone = simulateProgress();

    const formData = new FormData();
    formData.append('file', selectedFile);

    const attId = att.Id ?? att.Code ?? '';
    const version = (tileFileCounts[attId] ?? 0) + 1;
    const params = new URLSearchParams({
      refRecId: CONFIG.REF_REC_ID,
      documentType: att.TypeId ?? att.Id ?? '',
      documentVersion: String(version),
      title: att.TypeName ?? att.Name ?? 'Document',
      entityId: CONFIG.ENTITY_ID,
      fileName: selectedFile.name,
    });
    const uploadUrl = `${CONFIG.UPLOAD_BASE}?${params.toString()}`;

    await $.ajax({
      url: uploadUrl,
      method: 'POST',
      headers: { 'Authorization': `Bearer ${CONFIG.TOKEN}`, 'companyid': CONFIG.COMPANY_ID },
      data: formData,
      processData: false,
      contentType: false
    });

    await progressDone;
    setProgress(100);
    await delay(350);

    clearFileSelection();
    $uploadProgress.addClass('hidden');
    await loadModalFiles(att);

    const typeName = att.TypeName ?? att.Name ?? 'Document';
    await Swal.fire({
      icon: 'success',
      title: 'Uploaded Successfully!',
      html: `<span style="color:#475569;font-size:14px"><b style="color:#1e293b">${escapeHtml(typeName)}</b><br>has been attached successfully.</span>`,
      confirmButtonText: 'Done',
      background: '#ffffff',
      color: '#1e293b',
      confirmButtonColor: '#fdbd3f',
      customClass: { popup: 'swal-mawarid', confirmButton: 'swal-mawarid-btn' },
    });

  } catch (err) {
    console.error('[Upload] Error:', err);
    setProgress(0);
    await Swal.fire({
      icon: 'error',
      title: 'Upload Failed',
      text: err.statusText ?? 'An unexpected error occurred. Please try again.',
      confirmButtonText: 'Close',
      background: '#ffffff',
      color: '#1e293b',
      confirmButtonColor: '#dc2626',
    });
  } finally {
    $btnUpload.prop('disabled', false);
    $btnCancel.prop('disabled', false);
  }
}

/* ────────────────────────────────────────────────────────────
   ➋  PROGRESS HELPERS
   ──────────────────────────────────────────────────────────── */
function setProgress(pct) {
  $progressFill.css('width', pct + '%');
  $progressPct.text(pct + '%');
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

/* ────────────────────────────────────────────────────────────
   ❾  HELPERS
   ──────────────────────────────────────────────────────────── */
function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
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
  $errorMessage.text(msg);
  $errorState.removeClass('hidden');
  $tilesGrid.addClass('hidden');
  setStatus('error', 'Error');
}

/* ────────────────────────────────────────────────────────────
   ❿  SVG HELPERS
   ──────────────────────────────────────────────────────────── */
function documentSVG(size = 24) { return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`; }
function uploadedSVG(size = 24) { return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--clr-success)"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`; }
function checkSVG(size = 14) { return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`; }
function eyeSVG(size = 14) { return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`; }
function fileIconSVG(size = 16) { return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`; }
function downloadSVG(size = 16) { return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`; }
function chevronDownSVG(size = 14) { return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`; }
function chevronUpSVG(size = 14) { return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`; }
function starSVG(size = 16) { return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`; }

/* ────────────────────────────────────────────────────────────
   ⓫  EVENT LISTENERS & BOOT
   ──────────────────────────────────────────────────────────── */
$(document).ready(function () {
  // Initialize DOM references
  initDOMReferences();

  // Attach Listeners
  $btnRefresh.on('click', loadAttachments);
  $btnRetry.on('click', loadAttachments);

  $modalClose.on('click', closeModal);
  $btnCancel.on('click', closeModal);

  $modalBackdrop.on('click', function (e) {
    if (e.target === this) closeModal();
  });

  $(document).on('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });

  /* ── Drop zone: drag & drop only (no click → no OS file manager) ── */
  $dropZone.on('click', function (e) {
    e.preventDefault();   // block any click — no file picker
    e.stopPropagation();
  });
  $dropZone.on('dragover dragenter', function (e) {
    e.preventDefault();
    $(this).addClass('drag-over');
  });
  $dropZone.on('dragleave dragend', function () {
    $(this).removeClass('drag-over');
  });
  $dropZone.on('drop', function (e) {
    e.preventDefault();
    $(this).removeClass('drag-over');
    const file = e.originalEvent.dataTransfer.files[0];
    if (file) onFileSelected(file);
  });

  $btnRemoveFile.on('click', clearFileSelection);
  $btnUpload.on('click', uploadFile);

  // Boot Application
  loadAttachments();
});
