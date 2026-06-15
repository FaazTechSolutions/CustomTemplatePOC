var _this = this;
var token = localStorage.getItem(
  "eyjJwhtbtGockieOniJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzA0L3htbGRzaWctbW9yZSNobWFjLXNoYTI1NiIsInR5cCI6IkpXVCJ9",
);
var CompanyId = localStorage.getItem("CompanyId");
var recId =
  _this.globalService.route.queryParams._value.RecId || _this.ParentData?.RecId;
const CONFIG = {
  TOKEN: token,
  // TOKEN:       'eyJhbGciOiJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzA0L3htbGRzaWctbW9yZSNobWFjLXNoYTI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VySWQiOiJhLmh5ZGVyIiwiTmFtZSI6Ikh5ZGVyIEFsaSBBIiwiRW1haWwiOiJoeWRlckBmYWF6dGVjaHNvbHV0aW9ucy5jb20iLCJNb2JpbGVOdW1iZXIiOiI5OTQzMjIxMzIxIiwiQ29tcGFueUlkIjoiTEdFMDAwMDAwMSIsImV4cCI6MTc4MTE2NzYxNywiaXNzIjoiYXBwczR4LmNvbSIsImF1ZCI6ImFwcHM0eC5jb20ifQ.iC6ztGEaLCCx-fqdqqmk3P0KdU3Th4gXjAHFvkC-RfY',
  COMPANY_ID: CompanyId,
  // COMPANY_ID:  'LGE0000001',
  ENTITY_ID: "9d4eed72bbae44e5af7ca824a95b4423",
  // REF_REC_ID:  '{{Query.RecId}}',
  REF_REC_ID: recId,
  ENDPOINT:
    `https://portal.mawarid.com.sa/apps4x-api/api/v1/metaobject/${CompanyId}/byobjectId?objectId=9d4eed72bbae44e5af7ca824a95b4423`,
  UPLOAD_BASE:
    `https://portal.mawarid.com.sa/apps4x-api/api/v1/attachment/${CompanyId}/upload`,
  FILES_BASE:
    `https://portal.mawarid.com.sa/apps4x-api/api/v1/attachment/${CompanyId}/files`,
  DOWNLOAD_BASE:
    `https://portal.mawarid.com.sa/apps4x-api/api/v1/attachment/${CompanyId}/download`,
  //  ENDPOINT:       'https://portal.mawarid.com.sa/apps4x-api/api/v1/metaobject/LGE0000001/byobjectId?objectId=9d4eed72bbae44e5af7ca824a95b4423',
  // UPLOAD_BASE:    'https://portal.mawarid.com.sa/apps4x-api/api/v1/attachment/LGE0000001/upload',
  // FILES_BASE:     'https://portal.mawarid.com.sa/apps4x-api/api/v1/attachment/LGE0000001/files',
  // DOWNLOAD_BASE:  'https://portal.mawarid.com.sa/apps4x-api/api/v1/attachment/LGE0000001/download',
};

/* ─── Shared JSON headers ────────────────────────────────── */
function buildHeaders() {
  return {
    Authorization: `Bearer ${CONFIG.TOKEN}`,
    companyid: CONFIG.COMPANY_ID,
    "Content-Type": "application/json",
  };
}
function getTileId(att) {
  if (!att) return "";
  return (
    att.TypeId ??
    att.Id ??
    att.Code ??
    (att.index !== undefined ? String(att.index) : "")
  );
}
/* ─── FormData headers (no Content-Type → browser sets boundary) ── */
function buildFormHeaders() {
  return {
    Authorization: `Bearer ${CONFIG.TOKEN}`,
    companyid: CONFIG.COMPANY_ID,
  };
}
function buildUploadUrl(att, files) {
  const id = getTileId(att);
  const version = (tileFileCounts[id] ?? 0) + 1;
  const params = new URLSearchParams({
    refRecId: CONFIG.REF_REC_ID,
    title: att.TypeName ?? att.Name ?? "Document",
    entityId: CONFIG.ENTITY_ID,
    documentType: att.TypeId ?? att.Id ?? "",
    documentVersion: String(version),
  });
  return `${CONFIG.UPLOAD_BASE}?${params.toString()}`;
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
      method: "GET",
      headers: buildHeaders(),
      xhrFields: {
        responseType: "blob",
      },
    });
    const url = URL.createObjectURL(data);
    const $a = $("<a/>", {
      href: url,
      download: fileName || "attachment",
    }).appendTo("body");
    $a[0].click();
    $a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("[Download] Error:", err);
    Swal.fire({
      icon: "error",
      title: "Download Failed",
      text: err.statusText ?? "Could not download the file.",
      background: "#ffffff",
      color: "#1e293b",
      confirmButtonColor: "#fdbd3f",
    });
  }
}
/* ─── Files-list URL builder ─────────────────────────────── */
function buildFilesUrl(att) {
  const params = new URLSearchParams({
    doctypeId: att.TypeId ?? att.Id ?? "",
    refRecId: CONFIG.REF_REC_ID,
    entityId: CONFIG.ENTITY_ID,
  });
  return `${CONFIG.FILES_BASE}?${params.toString()}`;
}

/* ────────────────────────────────────────────────────────────
   ❷  DOM REFERENCES
   ──────────────────────────────────────────────────────────── */
let $skeletonGrid,
  $tilesGrid,
  $errorState,
  $errorMessage,
  $statusBadge,
  $badgeLabel;
let $btnRefresh, $btnRetry, $modalBackdrop, $modalClose, $btnCancel, $btnUpload;
let $modalTitle,
  $modalSubtitle,
  $modalIconWrap,
  $modalFilesLoading,
  $modalFilesEmpty;
let $modalFilesList, $modalFilesBadge, $dropZone, $fileInput, $filePreview;
let $previewName, $previewSize, $btnRemoveFile, $uploadProgress, $progressFill;
let $progressPct, $toast, $toastMessage;

function initDOMReferences() {
  $skeletonGrid = $("#skeleton-grid");
  $tilesGrid = $("#tiles-grid");
  $errorState = $("#error-state");
  $errorMessage = $("#error-message");
  $statusBadge = $("#status-badge");
  $badgeLabel = $("#badge-label");
  $btnRefresh = $("#btn-refresh");
  $btnRetry = $("#btn-retry");

  $modalBackdrop = $("#modal-backdrop");
  $modalClose = $("#modal-close");
  $btnCancel = $("#btn-cancel");
  $btnUpload = $("#btn-upload");
  $modalTitle = $("#modal-title");
  $modalSubtitle = $("#modal-subtitle");
  $modalIconWrap = $("#modal-icon-wrap");

  $modalFilesLoading = $("#modal-files-loading");
  $modalFilesEmpty = $("#modal-files-empty");
  $modalFilesList = $("#modal-files-list");
  $modalFilesBadge = $("#modal-files-badge");

  $dropZone = $("#drop-zone");
  $fileInput = $("#file-input");
  $filePreview = $("#file-preview");
  $previewName = $("#preview-name");
  $previewSize = $("#preview-size");
  $btnRemoveFile = $("#btn-remove-file");
  $uploadProgress = $("#upload-progress");
  $progressFill = $("#progress-bar-fill");
  $progressPct = $("#progress-pct");

  $toast = $("#toast");
  $toastMessage = $("#toast-message");
}

/* ────────────────────────────────────────────────────────────
   ❸  APPLICATION STATE
   ──────────────────────────────────────────────────────────── */
let attachments = [];
let selectedFiles = [];
let activeAttachment = null; // { att, index }
let toastTimer = null;
/** Cache tile file counts: attId → number */
const tileFileCounts = {};

/* ────────────────────────────────────────────────────────────
   ❹  STATUS BADGE
   ──────────────────────────────────────────────────────────── */
function setStatus(state, label) {
  $statusBadge.attr("class", "status-badge " + state);
  $badgeLabel.text(label);
}

/* ────────────────────────────────────────────────────────────
   ❺  LOAD ATTACHMENT TYPES
   ──────────────────────────────────────────────────────────── */
function getAttachmentsEndpoint() {
  const appRecId =
    _this.globalService.route.queryParams._value.ApplicationRecId ||
    _this.globalService.route.queryParams._value.RecId ||
    _this.ParentData?.ApplicationRecId ||
    _this.ParentData?.RecId ||
    CONFIG.REF_REC_ID;

  const refRecId =
    _this.globalService.route.queryParams._value.RecId ||
    _this.ParentData?.RecId ||
    CONFIG.REF_REC_ID;

  const cond = {
    Condition: [
      {
        ConditionElement: {
          FieldType: "FieldValue",
          Field: "ApplicationRecId",
          Type: "Equals",
          ValueType: "Value",
          Value: String(appRecId),
        },
        Type: "Condition",
      },
    ],
    ConditionOperator: "1",
  };

  const params = new URLSearchParams({
    object_Type: "V",
    objectName: "ViewApplicationDocumentStatus",
    whereCondition: JSON.stringify(cond),
    $page: "1",
    $size: "0",
    RecId: String(refRecId),
  });

  return `https://portal.mawarid.com.sa/apps4x-api/api/v1/${CONFIG.COMPANY_ID}/connector/CON0000001/sql/sysobjectexecute?${params.toString()}`;
}

async function loadAttachments() {
  if (!CONFIG.REF_REC_ID) {
    $skeletonGrid.addClass("hidden");
    setStatus("error", "No Record ID");
    await Swal.fire({
      icon: "error",
      title: "Missing Record ID",
      html: `<span style="color:#475569;font-size:14px">No valid record ID was found in the URL.<br><br>Please open this page as:<br><code style="background:#f1f5f9;padding:3px 8px;border-radius:4px;font-size:12px">/AttachmentDetails/<b>{recordId}</b></code></span>`,
      confirmButtonText: "OK",
      background: "#ffffff",
      color: "#1e293b",
      confirmButtonColor: "#fdbd3f",
      customClass: { popup: "swal-mawarid", confirmButton: "swal-mawarid-btn" },
      allowOutsideClick: false,
    });
    return;
  }

  $skeletonGrid.removeClass("hidden");
  $tilesGrid.addClass("hidden");
  $errorState.addClass("hidden");

  try {
    // 1. Fetch metadata configuration
    const metaJson = await $.ajax({
      url: CONFIG.ENDPOINT,
      method: "GET",
      headers: buildHeaders(),
    });

    let metaData = {};
    if (metaJson.Data) {
      metaData =
        typeof metaJson.Data === "string"
          ? JSON.parse(metaJson.Data)
          : metaJson.Data;
    }
    const metaAttachments = metaData.Attachments ?? [];

    // Helper to normalize strings
    function normalizeName(str) {
      if (!str) return "";
      return str.toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ").trim();
    }

    // 2. Fetch view status
    const viewUrl = getAttachmentsEndpoint();
    const viewJson = await $.ajax({
      url: viewUrl,
      method: "GET",
      headers: buildHeaders(),
    });

    let viewData = viewJson;
    if (viewJson && viewJson.Data) {
      viewData =
        typeof viewJson.Data === "string"
          ? JSON.parse(viewJson.Data)
          : viewJson.Data;
    }
    const viewItems = Array.isArray(viewData)
      ? viewData
      : (viewData.Data ?? viewData.Value ?? viewData.Result ?? []);

    if (!viewItems.length) {
      throw new Error("No attachments returned from the status view.");
    }

    const ORDERED_CONFIGS = [
      {
        pattern: /passport(?!.*(photo|size))/i,
        name: "Passport copy",
        mandatory: "YES",
      },
      {
        pattern: /cv|curriculum|resume/i,
        name: "Updated CV and must be new and clear with specifications such as ICU or ER etc…",
        mandatory: "YES",
      },
      {
        pattern: /nursing.*diploma|nursing.*degree|degree.*certificate/i,
        name: "Nursing diploma / degree certificate",
        mandatory: "YES",
      },
      { pattern: /transcript/i, name: "Academic transcript", mandatory: "YES" },
      {
        pattern: /license/i,
        name: "Valid nursing license from home country",
        mandatory: "YES",
      },
      {
        pattern: /good.*standing/i,
        name: "Good Standing Certificate",
        mandatory: "No",
      },
      {
        pattern: /experience.*certificate/i,
        name: "Experience certificates",
        mandatory: "YES",
      },
      {
        pattern: /photo/i,
        name: "Passport-size photos (white background)",
        mandatory: "YES",
      },
      {
        pattern: /data.*flow/i,
        name: "DataFlow verification documents",
        mandatory: "YES",
      },
      {
        pattern: /prometric/i,
        name: "Prometric exam result (if available)",
        mandatory: "YES",
      },
      {
        pattern: /scfhs|classification|eligibility/i,
        name: "Saudi SCFHS eligibility / classification",
        mandatory: "YES",
      },
      { pattern: /iqama/i, name: "Copy of Iqama", mandatory: "After Arrival" },
      { pattern: /birth/i, name: "Birth certificate", mandatory: "No" },
      {
        pattern: /medical|fitness/i,
        name: "Medical report / fitness certificate",
        mandatory: "YES",
      },
      { pattern: /vaccin/i, name: "Vaccination records", mandatory: "No" },
      {
        pattern: /reference/i,
        name: "Professional references (if available)",
        mandatory: "No",
      },
      {
        pattern: /previous.*employment/i,
        name: "Previous employment certificates",
        mandatory: "YES",
      },
      {
        pattern: /english|ielts|toefl|proficiency/i,
        name: "English proficiency certificate",
        mandatory: "Optional",
      },
    ];

    // Map each view item to its corresponding metadata configuration
    attachments = viewItems.map((item, index) => {
      const viewName = item.DocumentTypeName ?? "";
      const normViewName = normalizeName(viewName);

      // Try exact match first
      let matchedMeta = metaAttachments.find(
        (m) =>
          normalizeName(
            m.TypeName ?? m.Name ?? m.Description ?? m.Label ?? "",
          ) === normViewName,
      );

      // Try pattern match fallback if exact match fails
      if (!matchedMeta) {
        const matchedPatternIdx = ORDERED_CONFIGS.findIndex((cfg) =>
          cfg.pattern.test(viewName),
        );
        if (matchedPatternIdx !== -1) {
          const pattern = ORDERED_CONFIGS[matchedPatternIdx].pattern;
          matchedMeta = metaAttachments.find((m) =>
            pattern.test(
              m.TypeName ?? m.Name ?? m.Description ?? m.Label ?? "",
            ),
          );
        }
      }

      // Check for "Others" fallback
      if (
        !matchedMeta &&
        (/other/i.test(viewName) || /others/i.test(viewName))
      ) {
        matchedMeta = metaAttachments.find(
          (m) =>
            /other/i.test(
              m.TypeName ?? m.Name ?? m.Description ?? m.Label ?? "",
            ) || m.TypeId === "6fb7fe4a0c014398abd6caad24d54104",
        );
      }

      // Return enriched attachment object
      return {
        ...matchedMeta,
        index: index,
        DocumentTypeName: viewName,
        Mandatory: item.Mandatory,
        ShowForm: item.ShowForm,
        FileStatus: item.FileStatus,
        TypeName: viewName,
        Name: viewName,
      };
    });

    attachments.forEach((att) => {
      const name = (att.TypeName ?? "").replace(/_/g, " ");

      let matchedIdx = -1;
      let config = null;
      if (
        att.TypeId === "6fb7fe4a0c014398abd6caad24d54104" ||
        /other/i.test(name)
      ) {
        matchedIdx = 999;
        config = { name: "Others", mandatory: "No" };
      } else {
        for (let i = 0; i < ORDERED_CONFIGS.length; i++) {
          if (ORDERED_CONFIGS[i].pattern.test(name)) {
            matchedIdx = i;
            config = ORDERED_CONFIGS[i];
            break;
          }
        }
      }

      if (config) {
        att.TypeName = config.name;
        att.Name = config.name;
        if (config.mandatory === "YES") {
          att.Mandatory = true;
          att.RequiredStatus = "YES";
        } else if (config.mandatory === "No") {
          att.Mandatory = false;
          att.RequiredStatus = "No";
        } else if (config.mandatory === "After Arrival") {
          att.Mandatory = "After Arrival";
          att.RequiredStatus = "After Arrival";
        } else if (config.mandatory === "Optional") {
          att.Mandatory = false;
          att.RequiredStatus = "Optional";
        }
        att.sortOrder = matchedIdx;
      } else {
        att.TypeName = name;
        att.Name = name;
        att.sortOrder = 500;
        att.RequiredStatus = (att.Mandatory ?? att.Required) ? "YES" : "No";
      }
    });

    attachments.sort((a, b) => a.sortOrder - b.sortOrder);

    renderTiles(attachments);
    setStatus(
      "ready",
      `${attachments.length} attachment type${attachments.length > 1 ? "s" : ""} loaded`,
    );
  } catch (err) {
    console.error("[Attachment Manager] Load failed:", err);
    showError(err.message || err.statusText || "Failed to load data");
  } finally {
    $skeletonGrid.addClass("hidden");
    $btnRefresh.removeClass("loading").prop("disabled", false);
  }
}

/* ────────────────────────────────────────────────────────────
   ❻  RENDER TILES
   ──────────────────────────────────────────────────────────── */
function renderTiles(list) {
  $tilesGrid.empty();
  list.forEach((att, index) => $tilesGrid.append(createTile(att, index)));
  $tilesGrid.removeClass("hidden");
}

function createTile(att, index) {
  const id = getTileId(att);
  const name =
    att.TypeName ??
    att.Name ??
    att.Description ??
    att.Label ??
    `Attachment ${index + 1}`;
  const code = att.Code ?? att.Type ?? "";
  const reqStatus =
    att.RequiredStatus ?? ((att.Mandatory ?? att.Required) ? "YES" : "No");

  const isUploaded =
    tileFileCounts[id] !== undefined
      ? tileFileCounts[id] > 0
      : att.FileStatus === true;

  let rightIndicatorHTML = "";
  if (isUploaded) {
    rightIndicatorHTML = `
      <div class="tile-status-indicator" style="position: absolute; top: 12px; right: 14px; color: var(--clr-success); font-size: 16px; font-weight: 700; line-height: 1;" title="Attached">✔</div>
    `;
  } else if (reqStatus === "YES") {
    rightIndicatorHTML = `
      <div class="tile-status-indicator" style="position: absolute; top: 12px; right: 14px; color: var(--clr-danger); font-size: 18px; font-weight: 700; line-height: 1;" title="Required">*</div>
    `;
  } else {
    rightIndicatorHTML = `
      <div class="tile-status-indicator" style="position: absolute; top: 12px; right: 14px; line-height: 1;"></div>
    `;
  }

  const tileClass = isUploaded ? "tile uploaded" : "tile";
  const iconHTML = isUploaded ? uploadedSVG() : documentSVG();
  const statusHTML = isUploaded ? `${checkSVG(14)} Attached` : "";

  const $tile = $("<div/>", {
    class: tileClass,
    tabindex: 0,
    role: "button",
    "data-id": id,
    "data-idx": String(index),
    "aria-label": `View attachments for: ${name}`,
    css: { animationDelay: `${index * 55}ms` },
    html: `
      ${rightIndicatorHTML}
      <div class="tile-icon-wrap" id="tile-icon-${escapeHtml(id)}">
        ${iconHTML}
      </div>
      <div class="tile-body">
        <p class="tile-name">${escapeHtml(name)}</p>
        ${code ? `<p class="tile-code">${escapeHtml(code)}</p>` : ""}
      </div>
      <div class="tile-footer">
        <span class="tile-status" id="tile-status-${escapeHtml(id)}">
          ${statusHTML}
        </span>
        <span class="tile-count-badge hidden" id="tile-count-${escapeHtml(id)}"></span>
        <span class="tile-action">
          ${attachSVG(13)} Open
        </span>
      </div>
    `,
    click: () => openModal(att, index),
    keydown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openModal(att, index);
      }
    },
  });

  return $tile;
}

/* ─── Update tile badge from cached count ────────────────── */
function updateTileBadge(att) {
  const id = getTileId(att);
  const count = tileFileCounts[id];
  if (count === undefined) return;

  const $tileEl = $tilesGrid.find(`[data-id="${CSS.escape(id)}"]`);
  if (!$tileEl.length) return;

  const $iconWrap = $tileEl.find(`#tile-icon-${CSS.escape(id)}`);
  const $statusEl = $tileEl.find(`#tile-status-${CSS.escape(id)}`);
  const $countEl = $tileEl.find(`#tile-count-${CSS.escape(id)}`);
  const $indicatorEl = $tileEl.find(`.tile-status-indicator`);

  att.FileStatus = count > 0;

  if (count > 0) {
    $tileEl.addClass("uploaded");
    if ($iconWrap.length) $iconWrap.html(uploadedSVG());
    if ($statusEl.length) $statusEl.html(`${checkSVG(14)} Attached`);
    if ($countEl.length) {
      $countEl.addClass("hidden");
    }
    if ($indicatorEl.length) {
      $indicatorEl
        .html("✔")
        .css({
          color: "var(--clr-success)",
          fontSize: "16px",
          fontWeight: "700",
        })
        .attr("title", "Attached");
    }
  } else {
    $tileEl.removeClass("uploaded");
    if ($iconWrap.length) $iconWrap.html(documentSVG());
    if ($countEl.length) $countEl.addClass("hidden");
    if ($statusEl.length) $statusEl.empty();

    const reqStatus =
      att.RequiredStatus ?? ((att.Mandatory ?? att.Required) ? "YES" : "No");
    if ($indicatorEl.length) {
      if (reqStatus === "YES") {
        $indicatorEl
          .html("*")
          .css({
            color: "var(--clr-danger)",
            fontSize: "18px",
            fontWeight: "700",
          })
          .attr("title", "Required");
      } else {
        $indicatorEl.empty().attr("title", "");
      }
    }
  }
}

/* ────────────────────────────────────────────────────────────
   ❼  MODAL — OPEN / CLOSE
   ──────────────────────────────────────────────────────────── */
function openModal(att, index) {
  activeAttachment = { att, index };
  const name =
    att.TypeName ??
    att.Name ??
    att.Description ??
    att.Label ??
    `Attachment ${index + 1}`;

  $modalTitle.text(name);
  $modalSubtitle.text(`Manage files for "${name}"`);
  $modalIconWrap.html(documentSVG(28));

  /* Reset upload section */
  clearFileSelection();
  $uploadProgress.addClass("hidden");

  /* Reset files section to loading state */
  setFilesState("loading");

  $modalBackdrop.removeClass("hidden");
  $("body").css("overflow", "hidden");
  requestAnimationFrame(() => $modalClose.focus());

  /* Defer the API call so the click event completes first (avoids zone.js violation) */
  setTimeout(() => loadModalFiles(att), 0);
}

function closeModal() {
  $modalBackdrop.addClass("hidden");
  $("body").css("overflow", "");
  clearFileSelection();
  $uploadProgress.addClass("hidden");
  activeAttachment = null;
}

/* ────────────────────────────────────────────────────────────
   ❽  LOAD & RENDER FILES INSIDE MODAL
   ──────────────────────────────────────────────────────────── */
async function loadModalFiles(att) {
  setFilesState("loading");

  try {
    const data = await $.ajax({
      url: buildFilesUrl(att),
      method: "GET",
      headers: buildHeaders(),
    });

    const files = Array.isArray(data)
      ? data
      : (data.Data ??
        data.Value ??
        data.Files ??
        data.Attachments ??
        data.Result ??
        []);

    const id = getTileId(att);
    tileFileCounts[id] = files.length;
    updateTileBadge(att);

    renderModalFiles(files);
  } catch (err) {
    console.warn("[Files] Load failed:", err);
    setFilesState("empty");
  }
}

function setFilesState(state) {
  $modalFilesLoading.toggleClass("hidden", state !== "loading");
  $modalFilesEmpty.toggleClass("hidden", state !== "empty");
  $modalFilesList.toggleClass("hidden", state !== "list");
  $modalFilesBadge.addClass("hidden");
}

function renderModalFiles(files) {
  if (!files.length) {
    setFilesState("empty");
    return;
  }

  const SHOW_LIMIT = 5;

  const sorted = [...files].sort((a, b) => {
    const da = new Date(a.CreatedAt ?? a.UploadedOn ?? a.Date ?? 0).getTime();
    const db = new Date(b.CreatedAt ?? b.UploadedOn ?? b.Date ?? 0).getTime();
    return db - da;
  });
  if (!sorted.some((f) => f.CreatedAt ?? f.UploadedOn ?? f.Date))
    sorted.reverse();

  $modalFilesBadge.text(sorted.length).removeClass("hidden");

  const rowsHTML = sorted
    .map((f, i) => {
      const isLatest = i === 0;
      const fname =
        f.Name ??
        f.FileName ??
        f.Title ??
        f.fileName ??
        f.name ??
        `File ${i + 1}`;
      const fsize = f.FileSize ?? f.Size ?? f.fileSize ?? null;
      const fdate = f.CreatedAt ?? f.UploadedOn ?? f.Date ?? null;
      const recId = f.RecId ?? f.recId ?? f.Id ?? f.id ?? null;
      const hiddenStyle = i >= SHOW_LIMIT ? ' style="display:none"' : "";

      return `
      <div class="mf-item${isLatest ? " mf-item-latest" : ""}" id="mf-item-${i}" data-extra="${i >= SHOW_LIMIT}"${hiddenStyle}>
        <div class="mf-item-icon${isLatest ? " mf-icon-latest" : ""}">
          ${isLatest ? starSVG(16) : fileIconSVG(18)}
        </div>
        <div class="mf-item-meta">
          <p class="mf-item-name" title="${escapeHtml(fname)}">
            ${escapeHtml(fname)}
            ${isLatest ? '<span class="mf-badge-latest">Latest</span>' : ""}
          </p>
          <p class="mf-item-sub">
            ${fsize ? `<span>${formatBytes(fsize)}</span>` : ""}
            ${fdate ? `<span>${formatDate(fdate)}</span>` : ""}
          </p>
        </div>
        <div class="mf-item-actions">
          ${
            recId != null
              ? `
            <button
              class="mf-btn mf-btn-dl"
              title="Download"
              onclick="downloadAttachment('${escapeHtml(String(recId))}','${escapeHtml(fname)}')"
            >${downloadSVG(14)}</button>`
              : ""
          }
        </div>
      </div>`;
    })
    .join("");

  const extra = sorted.length - SHOW_LIMIT;
  const showMoreHTML =
    extra > 0
      ? `
    <button class="mf-show-more" id="mf-show-more" data-expanded="false"
      onclick="toggleExtraFiles(this, ${extra})">
      ${chevronDownSVG(12)}
      Show ${extra} more file${extra > 1 ? "s" : ""}
    </button>`
      : "";

  $modalFilesList.html(rowsHTML + showMoreHTML);
  setFilesState("list");
}

/* Both functions are called via inline onclick="..." attributes inside Angular's
   DOM, so zone.js wraps the click and would track their async work as part of
   the click handler (causing 4000ms+ violations). Wrapping in Zone.root.run()
   ensures the actual work always runs outside Angular's change detection. */
window.toggleExtraFiles = function (btn, extra) {
  const _run = () => {
    const $btn = $(btn);
    const isExpanded = $btn.attr("data-expanded") === "true";
    $modalFilesList
      .find('[data-extra="true"]')
      .css("display", isExpanded ? "none" : "flex");
    $btn.attr("data-expanded", isExpanded ? "false" : "true");
    $btn.html(
      isExpanded
        ? `${chevronDownSVG(12)} Show ${extra} more file${extra > 1 ? "s" : ""}`
        : `${chevronUpSVG(12)} Show less`,
    );
  };
  typeof Zone !== "undefined" && Zone.root ? Zone.root.run(_run) : _run();
};

window.downloadAttachment = function (recId, fileName) {
  const _run = () => downloadAttachment(recId, fileName);
  typeof Zone !== "undefined" && Zone.root ? Zone.root.run(_run) : _run();
};

/* ────────────────────────────────────────────────────────────
   ❾  FILE SELECTION
   ──────────────────────────────────────────────────────────── */
function onFilesSelected(filesList) {
  if (!filesList || filesList.length === 0) return;

  for (let i = 0; i < filesList.length; i++) {
    selectedFiles.push(filesList[i]);
  }

  renderSelectedFilesPreview();
}

function renderSelectedFilesPreview() {
  if (selectedFiles.length === 0) {
    clearFileSelection();
    return;
  }

  $filePreview.empty();
  $filePreview.css({
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: "6px",
    padding: "10px 12px",
  });

  selectedFiles.forEach((file, index) => {
    const $item = $("<div/>", {
      class: "file-preview-item",
      style:
        "display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: var(--clr-surface-3); border-radius: var(--radius-sm); font-size: 12px; border: 1px solid var(--clr-border); width: 100%;",
      html: `
        <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;">
          <div style="color: var(--clr-accent); flex-shrink: 0; display: flex; align-items: center;">${fileIconSVG(14)}</div>
          <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; color: var(--clr-text-1);" title="${escapeHtml(file.name)}">
            ${escapeHtml(file.name)}
          </div>
          <span style="font-size: 10px; color: var(--clr-text-3); margin-left: 4px; flex-shrink: 0;">(${formatBytes(file.size)})</span>
        </div>
        <button class="btn-remove-selected-file" data-index="${index}" style="border: none; background: transparent; color: var(--clr-text-3); cursor: pointer; display: flex; align-items: center; padding: 2px;" title="Remove">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      `,
    });
    $filePreview.append($item);
  });

  $filePreview
    .find(".btn-remove-selected-file")
    .off("click")
    .on("click", function (e) {
      e.stopPropagation();
      const idx = parseInt($(this).attr("data-index"), 10);
      selectedFiles.splice(idx, 1);
      renderSelectedFilesPreview();
    });

  $filePreview.removeClass("hidden");
  $dropZone.addClass("hidden");
  $btnUpload.prop("disabled", false);
}

function clearFileSelection() {
  selectedFiles = [];
  $fileInput.val("");
  $filePreview.addClass("hidden").empty();
  $dropZone.removeClass("hidden");
  $btnUpload.prop("disabled", true);
}

/* ────────────────────────────────────────────────────────────
   ❿  UPLOAD
   ──────────────────────────────────────────────────────────── */
async function uploadFile() {
  if (selectedFiles.length === 0 || !activeAttachment) return;
  const { att } = activeAttachment;

  $btnUpload.prop("disabled", true);
  $btnCancel.prop("disabled", true);
  $uploadProgress.removeClass("hidden");
  setProgress(0);

  try {
    const progressDone = simulateProgress();

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append("Files", file, file.name);
    });

    await $.ajax({
      url: buildUploadUrl(att, selectedFiles),
      method: "POST",
      headers: buildFormHeaders(),
      data: formData,
      processData: false,
      contentType: false,
    });

    await progressDone;
    setProgress(100);
    await delay(350);

    clearFileSelection();
    $uploadProgress.addClass("hidden");
    await loadModalFiles(att);

    const typeName = att.TypeName ?? att.Name ?? "Document";
    await Swal.fire({
      icon: "success",
      title: "Uploaded Successfully!",
      html: `<span style="color:#475569;font-size:14px"><b style="color:#1e293b">${escapeHtml(typeName)}</b><br>files have been attached successfully.</span>`,
      confirmButtonText: "Done",
      background: "#ffffff",
      color: "#1e293b",
      confirmButtonColor: "#fdbd3f",
      customClass: { popup: "swal-mawarid", confirmButton: "swal-mawarid-btn" },
    });
  } catch (err) {
    console.error("[Upload] Error:", err);
    setProgress(0);
    await Swal.fire({
      icon: "error",
      title: "Upload Failed",
      text: err.statusText ?? "An unexpected error occurred. Please try again.",
      confirmButtonText: "Close",
      background: "#ffffff",
      color: "#1e293b",
      confirmButtonColor: "#dc2626",
    });
  } finally {
    $btnUpload.prop("disabled", false);
    $btnCancel.prop("disabled", false);
  }
}

/* ────────────────────────────────────────────────────────────
   ⓫  HELPERS
   ──────────────────────────────────────────────────────────── */
function setProgress(pct) {
  $progressFill.css("width", pct + "%");
  $progressPct.text(pct + "%");
}

function simulateProgress() {
  return new Promise((resolve) => {
    let pct = 0;
    const iv = setInterval(() => {
      pct += Math.random() * 18 + 4;
      if (pct >= 90) {
        pct = 90;
        clearInterval(iv);
        resolve();
      }
      setProgress(Math.round(pct));
    }, 180);
  });
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(2) + " MB";
}

function formatDate(raw) {
  try {
    return new Date(raw).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        m
      ],
  );
}

function showError(msg) {
  $errorMessage.text(msg);
  $errorState.removeClass("hidden");
  $tilesGrid.addClass("hidden");
  setStatus("error", "Error");
}

function showToast(msg, isError = false) {
  clearTimeout(toastTimer);
  $toast.removeClass("hidden error-toast");
  if (isError) $toast.addClass("error-toast");
  $toastMessage.text(msg);
  toastTimer = setTimeout(() => $toast.addClass("hidden"), 4000);
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
   ⓭  BOOT — runs entirely outside Angular's NgZone
   ──────────────────────────────────────────────────────────── */
(function boot() {
  /* The widget component evaluates this script AFTER the DOM is rendered,
     so $(document).ready() is unnecessary. We run everything inside
     Zone.root so that NO event listener or async call ever triggers
     Angular's change detection (eliminates all zone.js violations). */

  function init() {
    initDOMReferences();

    /* ── Static event listeners ── */
    $btnRefresh[0].addEventListener("click", () =>
      setTimeout(loadAttachments, 0),
    );
    $btnRetry[0].addEventListener("click", () =>
      setTimeout(loadAttachments, 0),
    );

    $modalClose[0].addEventListener("click", closeModal);
    $btnCancel[0].addEventListener("click", closeModal);

    /* Stop bubbling to Angular host */
    $modalBackdrop[0].addEventListener("click", function (e) {
      e.stopPropagation();
    });
    document
      .getElementById("modal-card")
      .addEventListener("click", function (e) {
        e.stopPropagation();
      });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModal();
    });

    $fileInput[0].addEventListener("click", function (e) {
      e.stopPropagation(); // Prevent zone.js from tracking the click event
    });

    $fileInput[0].addEventListener("change", function (e) {
      onFilesSelected(e.target.files);
    });

    /* ── Drop zone: drag-and-drop & click-to-browse ── */
    const dropEl = $dropZone[0];
    if (dropEl) {
      dropEl.addEventListener("click", function () {
        $fileInput[0].click();
      });
      dropEl.addEventListener(
        "dragover",
        function (e) {
          e.preventDefault();
          dropEl.classList.add("drag-over");
        },
        { passive: false },
      );
      dropEl.addEventListener("dragenter", function () {
        dropEl.classList.add("drag-over");
      });
      dropEl.addEventListener("dragleave", function () {
        dropEl.classList.remove("drag-over");
      });
      dropEl.addEventListener("dragend", function () {
        dropEl.classList.remove("drag-over");
      });
      dropEl.addEventListener(
        "drop",
        function (e) {
          e.preventDefault();
          dropEl.classList.remove("drag-over");
          const files = e.dataTransfer?.files;
          if (files && files.length > 0) onFilesSelected(files);
        },
        { passive: false },
      );
    }

    $btnRemoveFile[0].addEventListener("click", clearFileSelection);
    $btnUpload[0].addEventListener("click", () => setTimeout(uploadFile, 0));

    /* ── Load initial data ── */
    setTimeout(loadAttachments, 0);
  }

  /* Run everything in Zone.root if available (Angular environment) */
  if (
    typeof Zone !== "undefined" &&
    Zone.root &&
    typeof Zone.root.run === "function"
  ) {
    Zone.root.run(init);
  } else {
    init();
  }
})();
