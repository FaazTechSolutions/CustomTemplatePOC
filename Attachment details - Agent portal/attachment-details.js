/* ================================================================
   MAWARID – Attachment Details  |  attachment-details.js
   jQuery version — consumes BCP proxy → Dynamics 365 API
   ================================================================

   HOW IT WORKS
   ─────────────
   1. Reads config from globalService / ParentData (same pattern as
      Agenttemplate.js already in this repo).
   2. POSTs to the BCP dynamic-proxy endpoint with the FileId.
   3. Parses the base-64 "File" field in the response.
   4. Renders file info, a Preview button (inline + lightbox) and a
      Download button that triggers a direct browser download.

   CONFIG VALUES (auto-resolved at runtime)
   ─────────────────────────────────────────
   TOKEN   – read from localStorage (same key as other templates)
   FILE_ID – read from globalService route queryParams or ParentData
   USER_ID – read from globalService / localStorage
   ================================================================ */

(function ($) {
  'use strict';

  /* ──────────────────────────────────────────────────────────────
     1.  RUNTIME CONFIG
     ────────────────────────────────────────────────────────────── */
  var _this = typeof window !== 'undefined' && window._this ? window._this : {};
  var _gs = (typeof _this.globalService !== 'undefined') ? _this.globalService : null;

  /* Token */
  var TOKEN = (function () {
    try { return localStorage.getItem('eyjJwhtbtGockieOniJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzA0L3htbGRzaWctbW9yZSNobWFjLXNoYTI1NiIsInR5cCI6IkpXVCJ9') || ''; }
    catch (e) { return ''; }
  })();

  /* FileId — from route params or ParentData */
  var FILE_ID = (function () {
    try {
      return (new URLSearchParams(window.location.search).get('FileId'))
    } catch (e) {
      return '1c4cfe26-854a-447e-8eeb-64105748b3bd';
    }
  })();

  /* User-Id header */
  var USER_ID = (function () {
    try {
      return (_gs && _gs.currentUser && _gs.currentUser.UserId)
        || localStorage.getItem('UserId')
        || 'a.hyder';
    } catch (e) { return 'a.hyder'; }
  })();

  var API_URL = 'https://bcp.mawarid.com.sa/api/v1/dynamicrestapicallfrombody?user-id=a.hyder';

  /* ──────────────────────────────────────────────────────────────
     2.  DOM CACHE  (all IDs are prefixed adt- to avoid collisions)
     ────────────────────────────────────────────────────────────── */
  var $w = $('.att-detail-widget');
  var $skeleton = $w.find('#adt-skeleton');
  var $error = $w.find('#adt-error');
  var $errMsg = $w.find('#adt-error-msg');
  var $details = $w.find('#adt-details-wrap');
  var $badge = $w.find('#adt-status-badge');
  var $badgeLbl = $w.find('#adt-badge-label');
  var $metaBar = $w.find('#adt-meta-bar');
  var $fileCard = $w.find('#adt-file-card');
  var $fileIcon = $w.find('#adt-file-type-icon');
  var $fileName = $w.find('#adt-file-name');
  var $fileMeta = $w.find('#adt-file-meta');
  var $btnPreview = $w.find('#adt-btn-preview');
  var $btnDownload = $w.find('#adt-btn-download');
  var $previewPanel = $w.find('#adt-preview-panel');
  var $previewLabel = $w.find('#adt-preview-label');
  var $previewClose = $w.find('#adt-preview-close');
  var $previewCont = $w.find('#adt-preview-content');
  var $fieldsGrid = $w.find('#adt-fields-grid');
  var $lightbox = $w.find('#adt-lightbox');
  var $lbBackdrop = $w.find('#adt-lightbox-backdrop');
  var $lbTitle = $w.find('#adt-lightbox-title');
  var $lbBody = $w.find('#adt-lightbox-body');
  var $lbDownload = $w.find('#adt-lb-download');
  var $lbClose = $w.find('#adt-lb-close');
  var $toast = $w.find('#adt-toast');
  var $toastMsg = $w.find('#adt-toast-msg');
  var $btnRetry = $w.find('#adt-btn-retry');

  /* ──────────────────────────────────────────────────────────────
     3.  STATE
     ────────────────────────────────────────────────────────────── */
  var state = {
    data: null,   // raw API response
    b64: '',     // base64 file string
    mime: '',     // detected MIME
    ext: '',     // file extension
    fileName: '',     // resolved file name
    dataUrl: '',     // data:mime;base64,... for preview/download
    objectUrl: null,   // Blob URL (created lazily, revoked on close)
    previewOpen: false,
  };

  /* ──────────────────────────────────────────────────────────────
     4.  HELPERS
     ────────────────────────────────────────────────────────────── */

  /** Show / hide badge states */
  function setBadge(type, label) {
    $badge.removeClass('success error loading');
    if (type) $badge.addClass(type);
    $badgeLbl.text(label);
  }

  /** Show toast */
  function showToast(msg, isError, durationMs) {
    $toast.removeClass('error');
    if (isError) $toast.addClass('error');
    $toastMsg.text(msg);
    $toast.removeClass('hidden');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { $toast.addClass('hidden'); }, durationMs || 3000);
  }

  /** Map extension → emoji icon + colour */
  var EXT_META = {
    pdf: { icon: '📄', bg: 'rgba(220,38,38,.10)', color: '#dc2626' },
    doc: { icon: '📝', bg: 'rgba(37,99,235,.10)', color: '#2563eb' },
    docx: { icon: '📝', bg: 'rgba(37,99,235,.10)', color: '#2563eb' },
    xls: { icon: '📊', bg: 'rgba(22,163,74,.10)', color: '#16a34a' },
    xlsx: { icon: '📊', bg: 'rgba(22,163,74,.10)', color: '#16a34a' },
    ppt: { icon: '📊', bg: 'rgba(234,88,12,.10)', color: '#ea580c' },
    pptx: { icon: '📊', bg: 'rgba(234,88,12,.10)', color: '#ea580c' },
    png: { icon: '🖼️', bg: 'rgba(124,58,237,.10)', color: '#7c3aed' },
    jpg: { icon: '🖼️', bg: 'rgba(124,58,237,.10)', color: '#7c3aed' },
    jpeg: { icon: '🖼️', bg: 'rgba(124,58,237,.10)', color: '#7c3aed' },
    gif: { icon: '🖼️', bg: 'rgba(124,58,237,.10)', color: '#7c3aed' },
    webp: { icon: '🖼️', bg: 'rgba(124,58,237,.10)', color: '#7c3aed' },
    svg: { icon: '🖼️', bg: 'rgba(124,58,237,.10)', color: '#7c3aed' },
    txt: { icon: '📃', bg: 'rgba(100,116,139,.10)', color: '#64748b' },
    zip: { icon: '🗜️', bg: 'rgba(180,83,9,.10)', color: '#b45309' },
    rar: { icon: '🗜️', bg: 'rgba(180,83,9,.10)', color: '#b45309' },
    mp4: { icon: '🎬', bg: 'rgba(15,118,110,.10)', color: '#0f766e' },
    mp3: { icon: '🎵', bg: 'rgba(15,118,110,.10)', color: '#0f766e' },
  };
  function extMeta(ext) {
    return EXT_META[ext.toLowerCase()] || { icon: '📎', bg: 'rgba(253,189,63,.12)', color: '#e0a820' };
  }

  /** Derive MIME from extension */
  var EXT_MIME = {
    pdf: 'application/pdf',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    txt: 'text/plain',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    mp4: 'video/mp4', mp3: 'audio/mpeg',
  };
  function mimeForExt(ext) {
    return EXT_MIME[ext.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Read the first bytes of a base64 string and match against known
   * magic-byte signatures. Returns { ext, mime } or null if unknown.
   *
   * This is the final safety net when the API returns no filename/extension.
   */
  function detectTypeFromB64(b64) {
    if (!b64 || b64.length < 8) return null;
    try {
      /* Decode only the first ~20 bytes — enough for all signatures */
      var sample = atob(b64.substring(0, 28));
      var bytes = [];
      for (var i = 0; i < Math.min(sample.length, 20); i++) {
        bytes.push(sample.charCodeAt(i));
      }

      /* Helper: compare byte array at offset */
      function match(sig, offset) {
        offset = offset || 0;
        for (var j = 0; j < sig.length; j++) {
          if (bytes[offset + j] !== sig[j]) return false;
        }
        return true;
      }

      /* ── Signatures ── */
      if (match([0x25, 0x50, 0x44, 0x46]))                          // %PDF
        return { ext: 'pdf', mime: 'application/pdf' };

      if (match([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) // PNG
        return { ext: 'png', mime: 'image/png' };

      if (match([0xFF, 0xD8, 0xFF]))                                 // JPEG
        return { ext: 'jpg', mime: 'image/jpeg' };

      if (match([0x47, 0x49, 0x46, 0x38]))                          // GIF8
        return { ext: 'gif', mime: 'image/gif' };

      if (match([0x52, 0x49, 0x46, 0x46]) && match([0x57, 0x45, 0x42, 0x50], 8)) // RIFF....WEBP
        return { ext: 'webp', mime: 'image/webp' };

      if (match([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1])) {
        /* OLE2 compound document: DOC / XLS / PPT / MSG all share this header.
           Scan a larger window for specific markers.                          */
        var oleRaw = '';
        try { oleRaw = atob(b64.substring(0, 4000)); } catch (e) { }
        var oleChunk = oleRaw.toLowerCase();

        /* MSG: Outlook email — unique stream name pattern __substg1.0_ */
        if (oleChunk.indexOf('__substg1.0') !== -1
          || oleChunk.indexOf('ipm.note') !== -1
          || oleChunk.indexOf('ipm.activity') !== -1
          || oleChunk.indexOf('ipm.contact') !== -1)
          return { ext: 'msg', mime: 'application/vnd.ms-outlook' };

        /* XLS: 'workbook' or 'biff' are Excel-specific (NOT 'xl' — too short) */
        if (oleChunk.indexOf('workbook') !== -1 || oleChunk.indexOf('biff') !== -1)
          return { ext: 'xls', mime: 'application/vnd.ms-excel' };

        /* PPT */
        if (oleChunk.indexOf('powerpoint') !== -1 || oleChunk.indexOf('presentation') !== -1)
          return { ext: 'ppt', mime: 'application/vnd.ms-powerpoint' };

        /* Default OLE2 — treat as Word */
        return { ext: 'doc', mime: 'application/msword' };
      }

      if (match([0x50, 0x4B, 0x03, 0x04])) {
        /* ZIP-based: DOCX / XLSX / PPTX all start with PK\x03\x04.
           Decode a larger chunk (~1100 bytes) and look for the path
           markers that appear uncompressed in ZIP local file headers. */
        var zipChunk = '';
        try { zipChunk = atob(b64.substring(0, 1500)).toLowerCase(); } catch (e) { }
        if (zipChunk.indexOf('xl/') !== -1 || zipChunk.indexOf('xl\\') !== -1)
          return { ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
        if (zipChunk.indexOf('ppt/') !== -1 || zipChunk.indexOf('ppt\\') !== -1)
          return { ext: 'pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
        if (zipChunk.indexOf('word/') !== -1 || zipChunk.indexOf('word\\') !== -1)
          return { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
        /* fallback: check content-types string */
        if (zipChunk.indexOf('spreadsheet') !== -1)
          return { ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
        if (zipChunk.indexOf('presentation') !== -1)
          return { ext: 'pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
        /* Final fallback matches portal behaviour: any ZIP defaults to xlsx */
        return { ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
      }

      if (match([0x42, 0x4D]))                                       // BMP
        return { ext: 'bmp', mime: 'image/bmp' };

      if (match([0x49, 0x49, 0x2A, 0x00]) || match([0x4D, 0x4D, 0x00, 0x2A])) // TIFF
        return { ext: 'tiff', mime: 'image/tiff' };

      if (match([0x00, 0x00, 0x00]) && (bytes[3] === 0x18 || bytes[3] === 0x20)) // MP4/MOV ftyp
        return { ext: 'mp4', mime: 'video/mp4' };

      if (match([0x49, 0x44, 0x33]) || match([0xFF, 0xFB]))          // MP3
        return { ext: 'mp3', mime: 'audio/mpeg' };

      if (match([0x3C])) {                                           // '<' — likely XML/SVG/HTML
        var head = sample.substring(0, 20).toLowerCase();
        if (head.indexOf('svg') !== -1) return { ext: 'svg', mime: 'image/svg+xml' };
        return { ext: 'xml', mime: 'application/xml' };
      }

      return null; // unknown
    } catch (e) {
      return null;
    }
  }

  /** Base64 → Blob → Object URL */
  function b64ToBlob(b64, mime) {
    var binary = atob(b64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  /** Format bytes */
  function fmtBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  }

  /** Estimate decoded base64 byte size */
  function b64Bytes(b64) {
    var pad = (b64.match(/={1,2}$/) || [''])[0].length;
    return Math.floor(b64.length * 0.75) - pad;
  }

  /** Pretty-print a field label (camelCase → words) */
  function prettyLabel(key) {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, function (c) { return c.toUpperCase(); }).trim();
  }

  /** Revoke any existing object URL to free memory */
  function revokeObjectUrl() {
    if (state.objectUrl) {
      URL.revokeObjectURL(state.objectUrl);
      state.objectUrl = null;
    }
  }

  /** Create a fresh blob URL for current file */
  function getObjectUrl() {
    if (!state.objectUrl) {
      var blob = b64ToBlob(state.b64, state.mime);
      state.objectUrl = URL.createObjectURL(blob);
    }
    return state.objectUrl;
  }

  /* ──────────────────────────────────────────────────────────────
     5.  BUILD REQUEST PAYLOAD
     ────────────────────────────────────────────────────────────── */
  function buildPayload(fileId) {
    return {
      Body: JSON.stringify({
        _request: {
          Company: 'MWD',
          FileId: fileId
        }
      }),
      Headers: [
        { Name: 'Authorization', Type: {}, Value: 'getToken' }
      ],
      Path: [],
      URL: 'https://almawarid.operations.dynamics.com/api/services/MWRecIntegration/MWRecPortalIntegrationService/GetAttachmentDetails',
      Method: 'POST',
      QueryStrings: [],
      ResponseView: 'Return',
      DeserializeResponse: true,
      RequestType: ''
    };
  }

  /* ──────────────────────────────────────────────────────────────
     6.  API CALL
     ────────────────────────────────────────────────────────────── */
  function loadAttachment() {
    /* Reset UI */
    $skeleton.removeClass('hidden');
    $error.addClass('hidden');
    $details.addClass('hidden');
    setBadge('loading', 'Loading…');

    $.ajax({
      url: API_URL,
      method: 'POST',
      contentType: 'application/json',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'origin': 'https://portal.mawarid.com.sa'
      },
      data: JSON.stringify(buildPayload(FILE_ID)),
      timeout: 30000,
    })
      .done(function (resp) {
        $skeleton.addClass('hidden');
        var raw = resp;

        /* The proxy may return the inner object as a string — parse if needed */
        if (typeof raw === 'string') {
          try { raw = JSON.parse(raw); } catch (e) { /* keep as-is */ }
        }

        /* Some APIs wrap in {Result:...} or {Data:...} */
        var data = raw.Result || raw.Data || raw.data || raw.result || raw;

        if (!data || (!data.File && !data.FileContent && !data.Content)) {
          showError('API returned no file data. Check the FileId or permissions.');
          return;
        }

        /* Log full response so field names are visible in DevTools */
        console.log('[AttachmentDetails] Raw API data keys:', Object.keys(data));
        console.log('[AttachmentDetails] Raw API data:', data);

        state.data = data;
        state.b64 = (
          data.File || data.FileContent || data.Content ||
          data.FileData || data.Base64Content || data.DocumentContent ||
          data.AttachmentContent || ''
        ).replace(/\s/g, '');


        /* ── Strict Validation via Magic Bytes ───────────── 
           Verifies the file is a known/supported type. */
        var detected = detectTypeFromB64(state.b64);
        if (!detected) {
          showError('Invalid file format. The file type is not supported or could not be determined.');
          setBadge('error', 'Invalid Format');
          return;
        }

        state.ext = detected.ext;
        state.mime = detected.mime;

        /* ── Resolve FileName ───────────── */
        var rawName = (
          data.FileName || data.Name ||
          data.OriginalFileName || data.DocumentName ||
          data.AttachmentName || 'attachment'
        ).trim();

        /* Ensure the correct extension is present */
        var extSuffix = '.' + state.ext;
        if (rawName.toLowerCase().endsWith(extSuffix)) {
          state.fileName = rawName;
        } else {
          /* Remove wrong extension if present, then append correct one */
          var nameParts = rawName.split('.');
          if (nameParts.length > 1) nameParts.pop();
          var baseName = nameParts.join('.') || rawName;
          state.fileName = baseName + extSuffix;
        }

        state.dataUrl = 'data:' + state.mime + ';base64,' + state.b64;
        state.objectUrl = null; // will be created lazily

        renderDetails(data);
        setBadge('success', 'Loaded');
        showToast('Attachment loaded successfully', false, 3000);
      })
      .fail(function (xhr, status, err) {
        $skeleton.addClass('hidden');
        var msg = (xhr.responseJSON && xhr.responseJSON.Message)
          || (xhr.responseJSON && xhr.responseJSON.message)
          || err || status || 'Network error';
        showError(msg);
        setBadge('error', 'Error');
      });
  }

  /* ──────────────────────────────────────────────────────────────
     7.  RENDER
     ────────────────────────────────────────────────────────────── */
  function showError(msg) {
    $error.removeClass('hidden');
    $errMsg.text(msg || 'An unexpected error occurred.');
    $details.addClass('hidden');
  }

  function renderDetails(data) {
    $details.removeClass('hidden');

    /* ── Meta chips ── */
    var chips = [];
    if (data.Company || data.CompanyId) chips.push({ l: 'Company', v: data.Company || data.CompanyId });
    if (data.FileId || FILE_ID) chips.push({ l: 'File ID', v: data.FileId || FILE_ID });
    if (data.DocumentType || data.TypeName) chips.push({ l: 'Type', v: data.DocumentType || data.TypeName });
    if (data.Status || data.DocumentStatus) chips.push({ l: 'Status', v: data.Status || data.DocumentStatus });
    if (data.CreatedDate || data.CreatedDateTime) {
      chips.push({ l: 'Created', v: formatDate(data.CreatedDate || data.CreatedDateTime) });
    }
    $metaBar.html(chips.map(function (c) {
      return '<div class="adt-meta-chip"><span>' + escHtml(c.l) + ':</span><strong>' + escHtml(c.v) + '</strong></div>';
    }).join(''));

    /* ── File icon & info ── */
    var em = extMeta(state.ext);
    $fileIcon.css({ background: em.bg, color: em.color }).html('<span style="font-size:22px">' + em.icon + '</span>');

    var fileSize = state.b64 ? fmtBytes(b64Bytes(state.b64)) : '—';
    $fileName.text(state.fileName);
    $fileMeta.text(state.ext.toUpperCase() + ' · ' + fileSize);

    /* ── Fields grid ── */
    var SKIP_KEYS = ['File', 'FileContent', 'Content', 'FileBase64'];
    var html = '';
    $.each(data, function (key, val) {
      if (SKIP_KEYS.indexOf(key) !== -1) return; // skip raw base64
      if (typeof val === 'object') return; // skip nested objects
      var label = prettyLabel(String(key));
      var value = val !== null && val !== undefined && val !== '' ? String(val) : null;
      html += '<div class="adt-field-item">'
        + '<p class="adt-field-label">' + escHtml(label) + '</p>'
        + '<p class="adt-field-value' + (value ? '' : ' empty') + '">' + escHtml(value || '—') + '</p>'
        + '</div>';
    });
    /* Always show FileName even if already in other field */
    if (!data.FileName) {
      html = '<div class="adt-field-item">'
        + '<p class="adt-field-label">File Name</p>'
        + '<p class="adt-field-value">' + escHtml(state.fileName) + '</p>'
        + '</div>' + html;
    }
    $fieldsGrid.html(html || '<p style="padding:16px;color:var(--clr-text-3)">No additional fields</p>');

    /* Show Preview button for all types that have file data */
    $btnPreview.toggle(!!state.b64);
    $btnDownload.prop('disabled', !state.b64);
  }

  /* ──────────────────────────────────────────────────────────────
     8.  PREVIEW (inline panel + lightbox)
     ────────────────────────────────────────────────────────────── */
  function buildPreviewEl(forLightbox, $container) {
    var ext = state.ext;
    var $el;

    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].indexOf(ext) !== -1) {
      /* ── Images ── */
      $el = $('<img/>').attr('src', state.dataUrl).attr('alt', state.fileName);
      return $el;

    } else if (ext === 'pdf') {
      /* ── PDF via Blob URL ── */
      var blobUrl = getObjectUrl();
      $el = $('<iframe/>').attr('src', blobUrl).attr('title', 'PDF Preview');
      return $el;

    } else if (ext === 'txt') {
      /* ── Plain text ── */
      var text = '';
      try { text = atob(state.b64); } catch (e) { text = 'Unable to decode text.'; }
      $el = $('<pre/>').css({
        padding: '16px', margin: 0, whiteSpace: 'pre-wrap',
        fontSize: '13px', fontFamily: 'monospace',
        color: '#e2e8f0', background: 'transparent',
        maxHeight: forLightbox ? '70vh' : '320px', overflowY: 'auto'
      }).text(text);
      return $el;

    } else if (ext === 'docx') {
      /* ── DOCX via mammoth.js → HTML ── */
      $el = $('<div/>').css({
        padding: '24px', background: '#fff', color: '#1e293b',
        fontFamily: 'Georgia, serif', fontSize: '14px', lineHeight: '1.7',
        maxHeight: forLightbox ? '72vh' : '400px', overflowY: 'auto',
        width: '100%', textAlign: 'left'
      }).html('<p style="color:#94a3b8;font-family:sans-serif">Rendering document…</p>');

      /* Load mammoth if not yet available, then convert */
      function renderDocx() {
        if (typeof mammoth === 'undefined') {
          showToast('mammoth.js not loaded – cannot preview DOCX', true, 4000);
          $el.html(officeNotSupportedHtml(ext, 'mammoth.js failed to load'));
          return;
        }
        try {
          /* base64 → ArrayBuffer */
          var binary = atob(state.b64);
          var buf = new ArrayBuffer(binary.length);
          var view = new Uint8Array(buf);
          for (var i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);

          mammoth.convertToHtml({ arrayBuffer: buf })
            .then(function (result) {
              if (result.value) {
                $el.html('<div style="max-width:720px;margin:0 auto">' + result.value + '</div>');
              } else {
                $el.html(officeNotSupportedHtml(ext, 'No content extracted'));
              }
            })
            .catch(function (err) {
              console.error('[AttachmentDetails] mammoth error:', err);
              $el.html(officeNotSupportedHtml(ext, err.message || 'Conversion failed'));
            });
        } catch (e) {
          $el.html(officeNotSupportedHtml(ext, e.message));
        }
      }

      if (typeof mammoth !== 'undefined') {
        renderDocx();
      } else {
        /* Lazy-load mammoth from CDN */
        $.getScript('https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js')
          .done(renderDocx)
          .fail(function () {
            $el.html(officeNotSupportedHtml(ext, 'Could not load mammoth.js from CDN'));
          });
      }
      return $el;

    } else if (['xlsx', 'xls'].indexOf(ext) !== -1) {
      /* ── XLSX / XLS via SheetJS → HTML table ── */
      $el = $('<div/>').css({
        background: '#fff', width: '100%', overflowX: 'auto',
        maxHeight: forLightbox ? '72vh' : '420px', overflowY: 'auto',
        fontSize: '13px', color: '#1e293b'
      }).html(
        '<div style="padding:16px 20px;color:#94a3b8;font-family:sans-serif;font-size:12px">' +
        '<span style="display:inline-block;width:14px;height:14px;border:2px solid #fdbd3f;' +
        'border-top-color:transparent;border-radius:50%;animation:adt-spin 0.7s linear infinite;vertical-align:middle;margin-right:8px"></span>' +
        'Loading spreadsheet…</div>'
      );

      function renderSheet() {
        if (typeof XLSX === 'undefined') {
          $el.html(officeNotSupportedHtml(ext, 'SheetJS failed to load'));
          return;
        }
        try {
          var wb = XLSX.read(state.b64, { type: 'base64', cellStyles: true });
          var tabs = wb.SheetNames;

          /* Build tab bar if multiple sheets */
          var tabsHtml = '';
          if (tabs.length > 1) {
            tabsHtml = '<div class="adt-sheet-tabs">' +
              tabs.map(function (n, i) {
                return '<button class="adt-sheet-tab' + (i === 0 ? ' active' : '') + '" data-idx="' + i + '">' + escHtml(n) + '</button>';
              }).join('') +
              '</div>';
          }

          /* Render first sheet */
          function renderSheetIdx(idx) {
            var ws = wb.Sheets[tabs[idx]];
            var html = XLSX.utils.sheet_to_html(ws, { editable: false });
            $el.find('.adt-sheet-body').html(html);
            $el.find('.adt-sheet-tab').removeClass('active');
            $el.find('.adt-sheet-tab[data-idx="' + idx + '"]').addClass('active');
          }

          var bodyHtml = '<div class="adt-sheet-body"></div>';
          $el.html(tabsHtml + bodyHtml);
          renderSheetIdx(0);

          /* Tab switching */
          $el.on('click', '.adt-sheet-tab', function () {
            renderSheetIdx(parseInt($(this).data('idx')));
          });

        } catch (e) {
          console.error('[AttachmentDetails] SheetJS error:', e);
          $el.html(officeNotSupportedHtml(ext, e.message));
        }
      }

      if (typeof XLSX !== 'undefined') {
        renderSheet();
      } else {
        $.getScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js')
          .done(renderSheet)
          .fail(function () { $el.html(officeNotSupportedHtml(ext, 'Could not load SheetJS from CDN')); });
      }
      return $el;

    } else if (['doc', 'ppt', 'pptx', 'msg'].indexOf(ext) !== -1) {
      /* ── Legacy binary / PPTX / MSG — no viable browser renderer ── */
      $el = $('<div class="adt-preview-unsupported"/>').html(officeNotSupportedHtml(ext));
      return $el;

    } else {
      /* ── Truly unsupported ── */
      $el = $('<div class="adt-preview-unsupported"/>').html(
        '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
        + '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>'
        + '<polyline points="13 2 13 9 20 9"/></svg>'
        + '<p>Preview not available for <strong>' + escHtml(ext.toUpperCase()) + '</strong> files.<br>Use the <strong>Download</strong> button.</p>'
      );
      return $el;
    }
  }

  /** Styled "office format – download to view" message */
  function officeNotSupportedHtml(ext, detail) {
    var labels = {
      doc: { name: 'Word Document (.doc)', icon: '📝', note: 'Legacy .doc files cannot be rendered in the browser.' },
      xls: { name: 'Excel Spreadsheet (.xls)', icon: '📊', note: 'Legacy .xls files cannot be rendered in the browser.' },
      xlsx: { name: 'Excel Spreadsheet (.xlsx)', icon: '📊', note: '.xlsx preview requires an Office-compatible viewer.' },
      ppt: { name: 'PowerPoint (.ppt)', icon: '📊', note: 'Legacy .ppt files cannot be rendered in the browser.' },
      pptx: { name: 'PowerPoint (.pptx)', icon: '📊', note: '.pptx preview is not supported in the browser.' },
      msg: { name: 'Outlook Message (.msg)', icon: '📧', note: '.msg files are Outlook email messages and cannot be rendered in the browser. Download and open in Outlook or a compatible mail client.' },
    };
    var info = labels[ext] || { name: ext.toUpperCase(), icon: '📎', note: 'This format cannot be previewed inline.' };
    return '<div style="text-align:center;padding:32px 20px;color:#94a3b8">'
      + '<div style="font-size:48px;margin-bottom:12px">' + info.icon + '</div>'
      + '<p style="font-size:14px;font-weight:600;color:#475569;margin-bottom:6px">' + escHtml(info.name) + '</p>'
      + '<p style="font-size:13px;margin-bottom:' + (detail ? '6px' : '16px') + '">' + escHtml(info.note) + '</p>'
      + (detail ? '<p style="font-size:11px;color:#cbd5e1;margin-bottom:16px">' + escHtml(detail) + '</p>' : '')
      + '<button onclick="$(\'.att-detail-widget\').find(\'#adt-btn-download\').trigger(\'click\')" '
      + 'style="display:inline-flex;align-items:center;gap:6px;padding:9px 20px;background:#fdbd3f;border:none;'
      + 'border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;color:#1a1100">'
      + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>'
      + '</svg>Download to View</button>'
      + '</div>';
  }

  function openInlinePreview() {
    $previewLabel.text('Preview – ' + state.fileName);
    $previewCont.empty().append(buildPreviewEl(false));
    $previewPanel.removeClass('hidden');
    state.previewOpen = true;
    /* Scroll card into view */
    $('html, body').animate({ scrollTop: $fileCard.offset().top - 20 }, 250);
  }

  function closeInlinePreview() {
    $previewPanel.addClass('hidden');
    $previewCont.empty();
    state.previewOpen = false;
    revokeObjectUrl();
  }

  function openLightbox() {
    $lbTitle.text(state.fileName);
    $lbBody.empty().append(buildPreviewEl(true));
    /* Download link always uses octet-stream — matches portal pattern */
    var downloadHref = 'data:application/octet-stream;base64,' + state.b64;
    $lbDownload.attr('href', downloadHref).attr('download', state.fileName);
    $lightbox.removeClass('hidden');
    $('body').css('overflow', 'hidden');
  }

  function closeLightbox() {
    $lightbox.addClass('hidden');
    $lbBody.empty();
    $('body').css('overflow', '');
    revokeObjectUrl();
  }

  /* ──────────────────────────────────────────────────────────────
     9.  DOWNLOAD
     ────────────────────────────────────────────────────────────── */
  function triggerDownload() {
    if (!state.b64) { showToast('No file data available.', true); return; }
    try {
      /* Always use application/octet-stream for download href
         — matches the portal's existing downloadFile() pattern */
      var downloadHref = 'data:application/octet-stream;base64,' + state.b64;
      var $a = $('<a/>', {
        href: downloadHref,
        download: state.fileName
      }).appendTo($w);
      $a[0].click();
      $a.remove();
      showToast('Download started: ' + state.fileName, false, 3000);
    } catch (e) {
      /* Fallback for very large files — use Blob URL with octet-stream */
      var blob = b64ToBlob(state.b64, 'application/octet-stream');
      var url = URL.createObjectURL(blob);
      var $a2 = $('<a/>', { href: url, download: state.fileName }).appendTo($w);
      $a2[0].click();
      $a2.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
      showToast('Download started: ' + state.fileName, false, 3000);
    }
  }

  /* ──────────────────────────────────────────────────────────────
     10.  UTILITIES
     ────────────────────────────────────────────────────────────── */
  function escHtml(str) {
    return $('<div/>').text(String(str)).html();
  }

  function formatDate(raw) {
    if (!raw) return '—';
    try {
      /* Handle /Date(1234567890000)/ format from Dynamics */
      var ts = String(raw).match(/\/Date\((\d+)/);
      if (ts) raw = parseInt(ts[1]);
      var d = new Date(raw);
      if (isNaN(d.getTime())) return String(raw);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) { return String(raw); }
  }

  /* ──────────────────────────────────────────────────────────────
     11.  EVENT BINDINGS
     ────────────────────────────────────────────────────────────── */
  /* Retry */
  $btnRetry.on('click', loadAttachment);

  /* Preview toggle */
  $btnPreview.on('click', function () {
    if (state.previewOpen) {
      /* Already open — open full lightbox */
      openLightbox();
    } else {
      openInlinePreview();
    }
  });

  /* Close inline preview */
  $previewClose.on('click', closeInlinePreview);

  /* Download */
  $btnDownload.on('click', triggerDownload);

  /* Lightbox close */
  $lbClose.on('click', closeLightbox);
  $lbBackdrop.on('click', closeLightbox);
  $(document).on('keydown.adtLb', function (e) {
    if (e.key === 'Escape') {
      if (!$lightbox.hasClass('hidden')) closeLightbox();
    }
  });

  /* Lightbox download link */
  $lbDownload.on('click', function (e) {
    /* href already set; just let the browser handle it */
    showToast('Download started: ' + state.fileName, false, 3000);
  });

  /* ──────────────────────────────────────────────────────────────
     12.  INIT
     ────────────────────────────────────────────────────────────── */
  loadAttachment();

})(window.jQuery || $);
