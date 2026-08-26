var _this = this;

(function ($) {
  /* ──────────────────────────────────────────────────────────────
     1. GLOBAL STATE & API CONFIG
     ────────────────────────────────────────────────────────────── */
  var API_BASE_URL = 'https://portal.mawarid.com.sa/apps4x-api/api/v1/LGE0000001/connector/CON0000001/sql/sysobjectexecute';
  var API_VIEW_NAME = 'vw_RSR_ProjectSummaryReport';
  var API_DETAIL_VIEW_NAME = 'vw_RSR_ProjectDetailAgentReport';
  var LOCAL_STORAGE_TOKEN_KEY = 'eyjJwhtbtGockieOniJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzA0L3htbGRzaWctbW9yZSNobWFjLXNoYTI1NiIsInR5cCI6IkpXVCJ9';
  var API_FALLBACK_TOKEN = 'Bearer eyJhbGciOiJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzA0L3htbGRzaWctbW9yZSNobWFjLXNoYTI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VySWQiOiJhLmh5ZGVyIiwiTmFtZSI6Ikh5ZGVyIEFsaSBBIiwiRW1haWwiOiJoeWRlckBmYWF6dGVjaHNvbHV0aW9ucy5jb20iLCJNb2JpbGVOdW1iZXIiOiI5OTQzMjIxMzIxIiwiQ29tcGFueUlkIjoiTEdFMDAwMDAwMSIsImV4cCI6MTc4NzgxMzY2NSwiaXNzIjoiYXBwczR4LmNvbSIsImF1ZCI6ImFwcHM0eC5jb20ifQ.KuUcYh_GXB9rzGLy7fAfClw5FQYiFLjS97BPl9cL83I';

  var rsrCurrentType = 'Mawarid Agencies';
  var rsrSelectedProjects = [];
  var rsrSelectedCustomers = [];
  var rsrSelectedAgencies = [];
  var rawApiData = [];
  var targetInputsState = {};

  // Modal Global State
  var rsrModalCurrentMpCode = '';
  var rsrModalRawData = [];
  var rsrModalSelectedAgents = [];

  var STATUS_ROWS = [
    { code: 'A', label: 'Backed Out', key: 'Count_BackedOut', opts: { valueColor: 'var(--rsr-red)' } },
    { code: 'C', label: 'Not Started', key: 'Count_SelectedNotStarted' },
    { code: 'D', label: 'UNDER MEDICAL', key: 'Count_UnderMedical' },
    { code: 'E', label: 'MEDICAL DONE WAITING FITNESS', calc: function(d) { return (d.Count_UnderMedicalTreatment || 0) + (d.Count_PrometricExam || 0) + (d.Count_Mumaris || 0); } },
    { code: 'F', label: 'MEDICAL FIT', key: 'Count_MedicalFit' },
    { code: 'G', label: 'MEDICALLY UNFIT', key: 'Count_MedicallyUnfit', opts: { valueColor: 'var(--rsr-red)', labelColor: 'var(--rsr-red)' } },
    { code: 'H', label: 'UNDER MEDICAL TREATMENT', key: 'Count_UnderMedicalTreatment' },
    { code: 'J', label: 'SVP / QVP', calc: function(d) { return (d.Count_SVP || 0) + (d.Count_QVP || 0); } },
    { code: 'I', label: 'UNDER VFS', key: 'Count_VFS' },
    { code: 'M', label: 'UNDER STAMPING', key: 'Count_UnderStamping' },
    { code: 'N', label: 'VISA STAMPED', key: 'Count_Stamped' },
    { code: 'P', label: 'TICKET CONFIRMED', calc: function(d) { return (d.Count_TicketConfirmed || 0) + (d.Count_TicketBooking || 0); } }
  ];

  /* ──────────────────────────────────────────────────────────────
     2. AUTH TOKEN RESOLUTION
     ────────────────────────────────────────────────────────────── */
  function getAuthToken() {
    var primaryToken = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
    primaryToken = "eyJhbGciOiJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzA0L3htbGRzaWctbW9yZSNobWFjLXNoYTI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VySWQiOiJhLmh5ZGVyIiwiTmFtZSI6Ikh5ZGVyIEFsaSBBIiwiRW1haWwiOiJoeWRlckBmYWF6dGVjaHNvbHV0aW9ucy5jb20iLCJNb2JpbGVOdW1iZXIiOiI5OTQzMjIxMzIxIiwiQ29tcGFueUlkIjoiTEdFMDAwMDAwMSIsImV4cCI6MTc4NzgxMzY2NSwiaXNzIjoiYXBwczR4LmNvbSIsImF1ZCI6ImFwcHM0eC5jb20ifQ.KuUcYh_GXB9rzGLy7fAfClw5FQYiFLjS97BPl9cL83I";
    if (primaryToken && primaryToken.trim() !== "") {
      var trimmedToken = primaryToken.trim();
      return trimmedToken.startsWith('Bearer ') ? trimmedToken : 'Bearer ' + trimmedToken;
    }

    if (typeof _this !== 'undefined' && _this && _this.globalService && _this.globalService.SysParameter && _this.globalService.SysParameter.Token) {
      var t = _this.globalService.SysParameter.Token;
      return t.startsWith('Bearer ') ? t : 'Bearer ' + t;
    }

    var tokenKeys = ['token', 'authToken', 'authorization', 'BearerToken'];
    for (var i = 0; i < tokenKeys.length; i++) {
      var stored = localStorage.getItem(tokenKeys[i]);
      if (stored && stored.trim() !== "") {
        var s = stored.trim();
        return s.startsWith('Bearer ') ? s : 'Bearer ' + s;
      }
    }

    return API_FALLBACK_TOKEN;
  }

  /* ──────────────────────────────────────────────────────────────
     3. FORMATTING HELPERS
     ────────────────────────────────────────────────────────────── */
  function formatReferenceNo(refStr) {
    if (!refStr) return '-';
    var safeStr = String(refStr).replace(/"/g, '&quot;');
    var parts = String(refStr).split(',').map(function (s) { return s.trim(); });
    if (parts.length > 1) {
      return '<div class="rsr-rpt-ref-wrapper" title="' + safeStr + '">'
        + '<span class="rsr-rpt-ref-truncated">' + parts[0] + '</span>'
        + '<span class="rsr-rpt-ref-badge">+' + (parts.length - 1) + '</span></div>';
    } else {
      return '<div class="rsr-rpt-ref-wrapper" title="' + safeStr + '">'
        + '<span class="rsr-rpt-ref-truncated">' + refStr + '</span></div>';
    }
  }

  function formatHeaderCode(code) {
    if (!code) return '';
    var safeStr = String(code).replace(/"/g, '&quot;');
    var parts = String(code).split(',').map(function (s) { return s.trim(); });
    if (parts.length > 1) {
      return '<span title="' + safeStr + '">' + parts[0] + ' <span class="rsr-rpt-ref-badge">+' + (parts.length - 1) + '</span></span>';
    }
    return '<span title="' + safeStr + '">' + code + '</span>';
  }

  function getActualStatusChip(item) {
    var statusStr = item.ProjectStatus || item.Status || (item.MainProjectIsActive ? "Active" : "Inactive");
    var chipClass = "rsr-rpt-chip rsr-rpt-chip-green";
    if (statusStr === "Active" || statusStr === "In Progress" || statusStr === "Open") {
      chipClass = "rsr-rpt-chip rsr-rpt-chip-green";
    } else if (statusStr === "Hold" || statusStr === "Pending") {
      chipClass = "rsr-rpt-chip rsr-rpt-chip-gold";
    } else if (statusStr === "Completed" || statusStr === "Finished") {
      chipClass = "rsr-rpt-chip rsr-rpt-chip-teal";
    } else if (statusStr === "Inactive" || statusStr === "Cancelled") {
      chipClass = "rsr-rpt-chip rsr-rpt-chip-gray";
    }
    return '<span class="' + chipClass + '">' + statusStr + '</span>';
  }

  /* ──────────────────────────────────────────────────────────────
     4. LIVE API DATA LOADER ($size=0)
     ────────────────────────────────────────────────────────────── */
  function resolveLocalData() {
    if (_this && _this.ResponseData && _this.ResponseData.Result && _this.ResponseData.Result.Data) {
      return _this.ResponseData.Result.Data;
    }
    if (window.apiResponse && window.apiResponse.Result && window.apiResponse.Result.Data) {
      return window.apiResponse.Result.Data;
    }
    return [];
  }

  function autoSelectActiveTab() {
    if (!rawApiData || !rawApiData.length) return;

    var currentItems = getItemsForCurrentTab();
    if (currentItems.length > 0) return;

    var firstType = rawApiData[0].ProjectType;
    if (firstType) {
      rsrCurrentType = firstType.trim();
      $('.rsr-rpt-tab').removeClass('rsr-rpt-active');
      var $targetTab = $('.rsr-rpt-tab').filter(function () {
        return $(this).attr('data-type').trim().toLowerCase() === rsrCurrentType.toLowerCase();
      });
      if ($targetTab.length) {
        $targetTab.addClass('rsr-rpt-active');
      } else {
        $('.rsr-rpt-tab').first().addClass('rsr-rpt-active');
      }
    }
  }

  async function fetchRSRDataFromAPI() {
    var token = getAuthToken();
    var url = API_BASE_URL + '?object_Type=V&objectName=' + API_VIEW_NAME + '&$page=1&$size=0';

    try {
      var response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        }
      });

      if (!response.ok) {
        throw new Error('API returned HTTP status ' + response.status);
      }

      var resJson = await response.json();
      var dataList = null;

      if (resJson && resJson.Result && resJson.Result.Data) {
        dataList = resJson.Result.Data;
      } else if (resJson && resJson.Data) {
        dataList = resJson.Data;
      } else if (Array.isArray(resJson)) {
        dataList = resJson;
      }

      if (dataList && dataList.length > 0) {
        rawApiData = dataList;
        autoSelectActiveTab();
        rsrSwitchType(rsrCurrentType);
        return;
      }
    } catch (err) {
      console.warn('API fetch notice:', err.message);
    }

    rawApiData = resolveLocalData();
    autoSelectActiveTab();
    rsrSwitchType(rsrCurrentType);
  }

  function rsrInit() {
    $('#rsrGroups').html('<div style="padding:40px;text-align:center;color:var(--rsr-gold);font-weight:500;font-size:14px">Loading RSR Report data from API (vw_RSR_ProjectSummaryReport)...</div>');
    rawApiData = resolveLocalData();
    fetchRSRDataFromAPI();
  }

  /* ──────────────────────────────────────────────────────────────
     5. TABS & MULTI-SELECT CASCADING FILTERS
     ────────────────────────────────────────────────────────────── */
  function getItemsForCurrentTab() {
    return rawApiData.filter(function (item) {
      if (!rsrCurrentType) return true;
      var itemType = (item.ProjectType || '').trim().toLowerCase();
      var curType = (rsrCurrentType || '').trim().toLowerCase();
      return itemType === curType;
    });
  }

  function rsrSwitchType(type, el) {
    rsrCurrentType = type;

    $('.rsr-rpt-tab').removeClass('rsr-rpt-active');
    if (el) {
      $(el).addClass('rsr-rpt-active');
    } else {
      $('.rsr-rpt-tab').filter(function () {
        return ($(this).attr('data-type') || '').trim().toLowerCase() === type.trim().toLowerCase();
      }).addClass('rsr-rpt-active');
    }

    rsrSelectedProjects = [];
    rsrSelectedCustomers = [];
    rsrSelectedAgencies = [];

    rsrRenderProjectPanel();
    rsrRenderCustomerPanel();
    rsrRenderAgencyPanel();
    rsrUpdateChips();
    rsrRenderTable();
  }

  function rsrTogglePanel(panelId, e) {
    if (e) e.stopPropagation();
    $('.rsr-rpt-msf-panel').each(function () {
      if (this.id === panelId) {
        $(this).toggleClass('open');
      } else {
        $(this).removeClass('open');
      }
    });
  }

  $(document).on('click', function (e) {
    if (!$(e.target).closest('.rsr-rpt-msf').length) {
      $('.rsr-rpt-msf-panel').removeClass('open');
    }
  });

  function rsrRenderProjectPanel() {
    var $panel = $('#rsrProjectPanel');
    if (!$panel.length) return;

    var tabItems = getItemsForCurrentTab();
    var projects = [];
    tabItems.forEach(function (item) {
      if (item.MainProjectCode && projects.indexOf(item.MainProjectCode) === -1) {
        projects.push(item.MainProjectCode);
      }
    });

    if (projects.length === 0) {
      $panel.html('<div class="rsr-rpt-msf-empty">No main projects available</div>');
      return;
    }

    var html = projects.map(function (code) {
      var checked = rsrSelectedProjects.indexOf(code) > -1 ? 'checked' : '';
      return '<label class="rsr-rpt-msf-opt"><input type="checkbox" class="rsr-rpt-check" ' + checked +
        ' onclick="window.rsrToggleProject(\'' + code + '\')"> ' + code + '</label>';
    }).join('');

    $panel.html(html);
  }

  function rsrToggleProject(code) {
    var idx = rsrSelectedProjects.indexOf(code);
    if (idx > -1) {
      rsrSelectedProjects.splice(idx, 1);
    } else {
      rsrSelectedProjects.push(code);
    }

    var allowedCustomers = [];
    getItemsForCurrentTab().forEach(function (item) {
      if (!rsrSelectedProjects.length || rsrSelectedProjects.indexOf(item.MainProjectCode) > -1) {
        var custVal = item.Customer;
        if (custVal && allowedCustomers.indexOf(custVal) === -1) {
          allowedCustomers.push(custVal);
        }
      }
    });
    rsrSelectedCustomers = rsrSelectedCustomers.filter(function (c) {
      return allowedCustomers.indexOf(c) > -1;
    });

    rsrRenderProjectPanel();
    rsrRenderCustomerPanel();
    rsrUpdateChips();
    rsrRenderTable();
  }

  function rsrRenderCustomerPanel() {
    var $panel = $('#rsrCustomerPanel');
    if (!$panel.length) return;

    var tabItems = getItemsForCurrentTab();
    var scopedItems = tabItems.filter(function (item) {
      return !rsrSelectedProjects.length || rsrSelectedProjects.indexOf(item.MainProjectCode) > -1;
    });

    var customers = [];
    scopedItems.forEach(function (item) {
      var custVal = item.Customer;
      if (custVal && customers.indexOf(custVal) === -1) {
        customers.push(custVal);
      }
    });

    if (customers.length === 0) {
      $panel.html('<div class="rsr-rpt-msf-empty">No customers available</div>');
      return;
    }

    var html = customers.map(function (cust) {
      var checked = rsrSelectedCustomers.indexOf(cust) > -1 ? 'checked' : '';
      return '<label class="rsr-rpt-msf-opt"><input type="checkbox" class="rsr-rpt-check" ' + checked +
        ' onclick="window.rsrToggleCustomer(\'' + cust.replace(/'/g, "\\'") + '\')"> ' + cust + '</label>';
    }).join('');

    $panel.html(html);

    var $hint = $('#rsrCascadeHint');
    if ($hint.length) {
      if (rsrSelectedProjects.length) {
        $hint.show().text('Customer list scoped to selected Main Project(s).');
      } else {
        $hint.show().text('Showing all customers under ' + rsrCurrentType + '.');
      }
    }
  }

  function rsrToggleCustomer(cust) {
    var idx = rsrSelectedCustomers.indexOf(cust);
    if (idx > -1) {
      rsrSelectedCustomers.splice(idx, 1);
    } else {
      rsrSelectedCustomers.push(cust);
    }

    rsrRenderCustomerPanel();
    rsrUpdateChips();
    rsrRenderTable();
  }

  function rsrRenderAgencyPanel() {
    var $panel = $('#rsrAgencyPanel');
    if (!$panel.length) return;

    var tabItems = getItemsForCurrentTab();
    var agencies = [];
    tabItems.forEach(function (item) {
      if (item.SubProjectOwner && agencies.indexOf(item.SubProjectOwner) === -1) {
        agencies.push(item.SubProjectOwner);
      }
    });

    if (agencies.length === 0) {
      $panel.html('<div class="rsr-rpt-msf-empty">No agencies available</div>');
      return;
    }

    var html = agencies.map(function (agency) {
      var checked = rsrSelectedAgencies.indexOf(agency) > -1 ? 'checked' : '';
      return '<label class="rsr-rpt-msf-opt"><input type="checkbox" class="rsr-rpt-check" ' + checked +
        ' onclick="window.rsrToggleAgency(\'' + agency.replace(/'/g, "\\'") + '\')"> ' + agency + '</label>';
    }).join('');

    $panel.html(html);
  }

  function rsrToggleAgency(agency) {
    var idx = rsrSelectedAgencies.indexOf(agency);
    if (idx > -1) {
      rsrSelectedAgencies.splice(idx, 1);
    } else {
      rsrSelectedAgencies.push(agency);
    }

    rsrRenderAgencyPanel();
    rsrUpdateChips();
    rsrRenderTable();
  }

  function buildChipsHtml(list, removeFn, placeholder) {
    if (!list || !list.length) {
      return '<span style="color:var(--rsr-ink3)">' + placeholder + '</span>';
    }
    return list.map(function (val) {
      return '<span class="rsr-rpt-msf-chip">' + val +
        '<span class="x" onclick="event.stopPropagation();' + removeFn + '(\'' + val.replace(/'/g, "\\'") + '\')">&times;</span></span>';
    }).join('');
  }

  function rsrUpdateChips() {
    $('#rsrProjectChips').html(buildChipsHtml(rsrSelectedProjects, 'window.rsrToggleProject', 'All main projects'));
    $('#rsrCustomerChips').html(buildChipsHtml(rsrSelectedCustomers, 'window.rsrToggleCustomer', 'All customers'));
    $('#rsrAgencyChips').html(buildChipsHtml(rsrSelectedAgencies, 'window.rsrToggleAgency', 'All agencies'));
  }

  function rsrSearch() {
    rsrRenderTable();
  }

  function rsrClear() {
    rsrSelectedProjects = [];
    rsrSelectedCustomers = [];
    rsrSelectedAgencies = [];

    rsrRenderProjectPanel();
    rsrRenderCustomerPanel();
    rsrRenderAgencyPanel();
    rsrUpdateChips();
    rsrRenderTable();
  }

  /* ──────────────────────────────────────────────────────────────
     6. RENDER MAIN RSR SUMMARY TABLE
     ────────────────────────────────────────────────────────────── */
  function rsrRenderTable() {
    var $container = $('#rsrGroups');
    if (!$container.length) return;

    var filteredItems = getItemsForCurrentTab().filter(function (item) {
      if (rsrSelectedProjects.length && rsrSelectedProjects.indexOf(item.MainProjectCode) === -1) {
        return false;
      }
      var custVal = item.Customer;
      if (rsrSelectedCustomers.length && rsrSelectedCustomers.indexOf(custVal) === -1) {
        return false;
      }
      if (rsrSelectedAgencies.length && rsrSelectedAgencies.indexOf(item.SubProjectOwner) === -1) {
        return false;
      }
      return true;
    });

    if (filteredItems.length === 0) {
      $container.html('<div style="padding:40px;text-align:center;color:var(--rsr-ink3);border:0.5px dashed var(--rsr-border2);border-radius:var(--rsr-r2)">No data matching the active tab and selected filter options.</div>');
      return;
    }

    var html = '<div class="rsr-rpt-table-wrap" style="margin-bottom:24px;overflow-x:auto">';
    html += '<table style="min-width:900px"><thead><tr>'
      + '<th style="min-width:270px">Sub-Project / Metric</th>'
      + '<th style="text-align:center;width:95px">Total</th>';

    filteredItems.forEach(function (item, idx) {
      var headerCode = formatHeaderCode(item.SubProjectCodes || ('SubProj_' + (idx + 1)));
      html += '<th style="text-align:center;min-width:170px">' + headerCode + '<br>'
        + '<span style="font-weight:400;color:var(--rsr-ink3);font-size:10px">'
        + (item.MainProjectCode || '') + '</span></th>';
    });
    html += '</tr></thead><tbody>';

    function addRow(label, values, opts) {
      opts = opts || {};
      var rowStyle = opts.bg ? ' background:' + opts.bg + ';' : '';
      var labelStyle = opts.labelColor ? ' color:' + opts.labelColor + ';' : '';
      var valueStyle = opts.valueColor ? ' color:' + opts.valueColor + ';' : '';
      var weight = opts.bold ? ' font-weight:600;' : '';

      html += '<tr' + (rowStyle ? ' style="' + rowStyle + '"' : '') + '>';
      html += '<td style="' + labelStyle + weight + '">' + label + '</td>';
      html += '<td style="text-align:center;' + valueStyle + weight + '">' + (values.total !== undefined ? values.total : '') + '</td>';
      filteredItems.forEach(function (item, idx) {
        html += '<td style="text-align:center;' + valueStyle + weight + '">' + (values[idx] !== undefined ? values[idx] : '') + '</td>';
      });
      html += '</tr>';
    }

    // 1. Reference No
    var refs = {};
    filteredItems.forEach(function (item, idx) {
      refs[idx] = formatReferenceNo(item.SubProjectCodes);
    });
    refs.total = filteredItems.length + ' sub-proj';
    addRow('Reference No (ERP hiring IDs, pooled)', refs);

    // 2. Main Project Code (Clickable link to open Agent Detail Modal)
    var mpCodes = {};
    filteredItems.forEach(function (item, idx) {
      var mp = item.MainProjectCode || '-';
      var cust = item.Customer || '';
      var nat = item.Nationality || '';
      var prof = item.Profession || '';
      var gnd = item.Gender || '';
      var subCode = item.SubProjectCodes || '';
      var subRecId = item.SubProjectRecId || '';
      mpCodes[idx] = '<a href="javascript:void(0)" class="rsr-rpt-mp-link" onclick="window.openAgentDetailModal(\''
        + mp.replace(/'/g, "\\'") + '\', \''
        + cust.replace(/'/g, "\\'") + '\', \''
        + nat.replace(/'/g, "\\'") + '\', \''
        + prof.replace(/'/g, "\\'") + '\', \''
        + gnd.replace(/'/g, "\\'") + '\', \''
        + subCode.replace(/'/g, "\\'") + '\', \''
        + subRecId + '\')" title="Click to view Agent Breakdown Details for ' + (subCode || mp) + '">' + mp + '</a>';
    });
    mpCodes.total = '-';
    addRow('Main Project Code', mpCodes, { bold: true });

    // 3. Nationality
    var nats = {};
    filteredItems.forEach(function (item, idx) { nats[idx] = item.Nationality || '-'; });
    nats.total = '-';
    addRow('Nationality', nats);

    // 4. Gender
    var genders = {};
    filteredItems.forEach(function (item, idx) { genders[idx] = item.Gender || '-'; });
    genders.total = '-';
    addRow('Gender', genders);

    // 5. Profession
    var profs = {};
    filteredItems.forEach(function (item, idx) { profs[idx] = item.Profession || '-'; });
    profs.total = '-';
    addRow('Profession', profs);

    // 6. Hiring Date
    var hiringDates = {};
    filteredItems.forEach(function (item, idx) {
      hiringDates[idx] = item.HiringDate || item.SubProjectStartDate || '-';
    });
    hiringDates.total = '-';
    addRow('Hiring Date', hiringDates);

    // 7. Authorization Date
    var authDates = {};
    filteredItems.forEach(function (item, idx) {
      authDates[idx] = item.AuthorizationDate || item.SubProjectEndDate || '-';
    });
    authDates.total = '-';
    addRow('Authorization Date', authDates);

    // 8. Period
    var periods = {};
    filteredItems.forEach(function (item, idx) { periods[idx] = item.SubProjectPeriod || (item.SubProjectStartDate + ' to ' + item.SubProjectEndDate); });
    periods.total = '-';
    addRow('Period (from setup)', periods);

    // 9. Owner
    var owners = {};
    filteredItems.forEach(function (item, idx) { owners[idx] = item.SubProjectOwner || '-'; });
    owners.total = '-';
    addRow('Owner', owners);

    // 10. Quantity
    var totalQty = 0;
    var qtys = {};
    filteredItems.forEach(function (item, idx) {
      var q = item.TotalSubProjectQuantity || 0;
      qtys[idx] = q;
      totalQty += q;
    });
    qtys.total = totalQty;
    addRow('Quantity (sub-project, used for RSR)', qtys, { bold: true });

    // 11. REMAINING (THIS MONTH) — CALCULATED BASED ON TARGET
    html += '<tr style="background:var(--rsr-gold-bg);border-top:1px solid var(--rsr-gold-lt)"><td style="font-weight:600;color:var(--rsr-gold)">Remaining (This Month) &mdash; calculated: Target &minus; Arrived</td>'
      + '<td style="text-align:center;font-weight:700;color:var(--rsr-gold)" id="rsrSingleRemainTotal">0</td>';
    filteredItems.forEach(function (item, idx) {
      html += '<td style="text-align:center;font-weight:600;color:var(--rsr-gold)" id="rsrRemain_single_' + idx + '">0</td>';
    });
    html += '</tr>';

    // 12. COMPLETION (THIS MONTH) % — CALCULATED BASED ON TARGET
    html += '<tr style="background:var(--rsr-gold-bg)"><td style="font-weight:600;color:var(--rsr-gold)">Completion (This Month) % &mdash; calculated: (Arrived / Target) &times; 100</td>'
      + '<td style="text-align:center;font-weight:700;color:var(--rsr-gold)" id="rsrSingleCompTotal">0.0%</td>';
    filteredItems.forEach(function (item, idx) {
      html += '<td style="text-align:center;font-weight:600;color:var(--rsr-gold)" id="rsrComp_single_' + idx + '">0.0%</td>';
    });
    html += '</tr>';

    // 13. TARGET (THIS MONTH) — EDITABLE INPUT FIELD
    html += '<tr style="border-bottom:1.5px solid var(--rsr-gold-lt)"><td style="color:var(--rsr-gold);font-weight:700">Target (this month) &mdash; [Editable Input]</td>'
      + '<td style="text-align:center;font-weight:700;color:var(--rsr-gold)" id="rsrSingleTargetTotal">0</td>';

    filteredItems.forEach(function (item, idx) {
      var colKey = 'single_' + idx;
      var defaultTarget = targetInputsState[colKey] !== undefined ? targetInputsState[colKey] : (item.TotalSubProjectQuantity || 10);
      var arrived = (item.Count_Arrived !== undefined && item.Count_Arrived > 0) ? item.Count_Arrived : (item.Count_Employed || 0);
      var confirmed = (item.Count_ImmigrationCheck !== undefined && item.Count_ImmigrationCheck > 0) ? item.Count_ImmigrationCheck : (item.Count_Stamped || arrived);
      html += '<td style="text-align:center"><input class="rsr-rpt-input" id="rsrTarget_' + colKey + '" data-colindex="' + idx + '" data-arrived="' + arrived + '" data-confirmed="' + confirmed + '" data-qty="' + (item.TotalSubProjectQuantity || 0) + '" value="' + defaultTarget + '" oninput="window.rsrRecalcSingleTable()" onchange="window.rsrRecalcSingleTable()" onkeyup="window.rsrRecalcSingleTable()"></td>';
    });
    html += '</tr>';

    // 14. Project Status — ACTUAL STATUS CHIP
    var statusVals = {};
    filteredItems.forEach(function (item, idx) {
      statusVals[idx] = getActualStatusChip(item);
    });
    statusVals.total = '-';
    addRow('Project Status', statusVals, { bold: true });

    // Separator Header
    html += '<tr><td colspan="' + (filteredItems.length + 2) + '" class="rsr-rpt-hdr">Status &mdash; fixed order, always shown, no show/hide toggle</td></tr>';

    // 15. Fixed Status Breakdown Rows (A to P)
    STATUS_ROWS.forEach(function (sr) {
      var rowVals = {};
      var rowTotal = 0;
      filteredItems.forEach(function (item, idx) {
        var v = sr.calc ? sr.calc(item) : (item[sr.key] || 0);
        rowVals[idx] = v;
        rowTotal += v;
      });
      rowVals.total = rowTotal;
      addRow(sr.code + ') ' + sr.label, rowVals, sr.opts || {});
    });

    // 16. ARRIVED (This Month)
    var arrivedThisMonthVals = {};
    var totalArrivedThisMonth = 0;
    filteredItems.forEach(function (item, idx) {
      var a = (item.Count_Arrived !== undefined && item.Count_Arrived > 0) ? item.Count_Arrived : (item.Count_Employed || 0);
      arrivedThisMonthVals[idx] = a;
      totalArrivedThisMonth += a;
    });
    arrivedThisMonthVals.total = totalArrivedThisMonth;
    addRow('ARRIVED (This Month)', arrivedThisMonthVals, { bg: 'var(--rsr-teal-bg)', labelColor: 'var(--rsr-teal)', valueColor: 'var(--rsr-teal)', bold: true });

    // 17. Confirmed Completion (This Month)
    var confirmedVals = {};
    var totalConfirmed = 0;
    filteredItems.forEach(function (item, idx) {
      var a = (item.Count_Arrived !== undefined && item.Count_Arrived > 0) ? item.Count_Arrived : (item.Count_Employed || 0);
      var c = (item.Count_ImmigrationCheck !== undefined && item.Count_ImmigrationCheck > 0) ? item.Count_ImmigrationCheck : (item.Count_Stamped || a);
      confirmedVals[idx] = c;
      totalConfirmed += c;
    });
    confirmedVals.total = totalConfirmed;
    addRow('Confirmed Completion (This Month)', confirmedVals, { bg: 'var(--rsr-green-bg)', labelColor: 'var(--rsr-green)', valueColor: 'var(--rsr-green)', bold: true });

    // 18. Confirmed Completion (This Month) % = (Confirmed / Target) * 100
    html += '<tr><td style="font-weight:600;color:var(--rsr-green)">Confirmed Completion (This Month) % &mdash; calculated: (Confirmed / Target) &times; 100</td>'
      + '<td style="text-align:center;font-weight:700;color:var(--rsr-green)" id="rsrSingleConfCompTotal">0.0%</td>';
    filteredItems.forEach(function (item, idx) {
      html += '<td style="text-align:center;font-weight:600;color:var(--rsr-green)" id="rsrConfComp_single_' + idx + '">0.0%</td>';
    });
    html += '</tr>';

    // 19. Q) ARRIVED (Overall) = Arrived + Employed
    var arrivedOverallVals = {};
    var totalArrivedOverall = 0;
    filteredItems.forEach(function (item, idx) {
      var a = (item.Count_Arrived !== undefined && item.Count_Arrived > 0) ? item.Count_Arrived : 0;
      var ov = a + (item.Count_Employed || 0);
      arrivedOverallVals[idx] = ov;
      totalArrivedOverall += ov;
    });
    arrivedOverallVals.total = totalArrivedOverall;
    addRow('Q) ARRIVED (Overall)', arrivedOverallVals, { bg: '#0F6E56', labelColor: '#fff', valueColor: '#fff', bold: true });

    // 20. Remaining (Overall) = Quantity - Arrived Overall
    var remainOverallVals = {};
    var totalRemainOverall = 0;
    filteredItems.forEach(function (item, idx) {
      var q = item.TotalSubProjectQuantity || 0;
      var a = (item.Count_Arrived !== undefined && item.Count_Arrived > 0) ? item.Count_Arrived : 0;
      var ov = a + (item.Count_Employed || 0);
      var r = q - ov;
      remainOverallVals[idx] = r;
      totalRemainOverall += r;
    });
    remainOverallVals.total = totalRemainOverall;
    addRow('Remaining (Overall)', remainOverallVals, { bold: true });

    // 21. Completion (Overall) % = (Arrived Overall / Quantity) * 100
    var compOverallVals = {};
    filteredItems.forEach(function (item, idx) {
      var q = item.TotalSubProjectQuantity || 0;
      var a = (item.Count_Arrived !== undefined && item.Count_Arrived > 0) ? item.Count_Arrived : 0;
      var ov = a + (item.Count_Employed || 0);
      var pct = q > 0 ? ((ov / q) * 100).toFixed(1) + '%' : '0.0%';
      compOverallVals[idx] = pct;
    });
    compOverallVals.total = totalQty > 0 ? ((totalArrivedOverall / totalQty) * 100).toFixed(1) + '%' : '0.0%';
    addRow('Completion (Overall) %', compOverallVals, { bold: true, valueColor: 'var(--rsr-teal)' });

    html += '</tbody></table></div>';
    $container.html(html);

    rsrRecalcSingleTable();
  }

  /* ──────────────────────────────────────────────────────────────
     7. DYNAMIC TARGET RECALCULATION
     ────────────────────────────────────────────────────────────── */
  function rsrRecalcSingleTable() {
    var $inputs = $('input[data-colindex]');
    if (!$inputs.length) return;

    var totalTarget = 0;
    var totalArrived = 0;
    var totalConfirmed = 0;

    $inputs.each(function () {
      var $inp = $(this);
      var idx = $inp.data('colindex');
      var colKey = 'single_' + idx;

      var target = parseInt($inp.val(), 10) || 0;
      targetInputsState[colKey] = target;

      var arrived = parseInt($inp.attr('data-arrived'), 10) || parseInt($inp.data('arrived'), 10) || 0;
      var confirmed = parseInt($inp.attr('data-confirmed'), 10) || parseInt($inp.data('confirmed'), 10) || 0;

      totalTarget += target;
      totalArrived += arrived;
      totalConfirmed += confirmed;

      var remaining = target - arrived;
      var compPctVal = target > 0 ? ((arrived / target) * 100) : 0;
      var compPctStr = compPctVal.toFixed(1) + '%';

      var confCompPctVal = target > 0 ? ((confirmed / target) * 100) : 0;
      var confCompPctStr = confCompPctVal.toFixed(1) + '%';

      $('#rsrRemain_' + colKey).text(remaining);
      $('#rsrComp_' + colKey).text(compPctStr);
      $('#rsrConfComp_' + colKey).text(confCompPctStr);
    });

    $('#rsrSingleTargetTotal').text(totalTarget);

    var totalRemaining = totalTarget - totalArrived;
    var totalCompPct = totalTarget > 0 ? ((totalArrived / totalTarget) * 100).toFixed(1) + '%' : '0.0%';
    var totalConfCompPct = totalTarget > 0 ? ((totalConfirmed / totalTarget) * 100).toFixed(1) + '%' : '0.0%';

    $('#rsrSingleRemainTotal').text(totalRemaining);
    $('#rsrSingleCompTotal').text(totalCompPct);
    $('#rsrSingleConfCompTotal').text(totalConfCompPct);
  }

  /* ──────────────────────────────────────────────────────────────
     8. READ-ONLY AGENT DETAIL MODAL & POPUP LOGIC
     ────────────────────────────────────────────────────────────── */
  function getSampleAgentDetailData(mpCode, customer, nationality, profession, gender) {
    return [
      {
        MainProjectCode: mpCode || "002_613_ABW_M",
        CustomerId: customer || "BR0001455",
        Nationality: nationality || "PHL",
        Profession: profession || "6132045",
        Gender: gender || "Male",
        RecruitingID: "HReq-0004040",
        AgentId: "AG00867",
        AgentName: "AFDAH KAKIRI INVESTMENT LIMITED",
        TotalApplications: 142,
        Count_New: 10,
        Count_Received: 0,
        Count_Authorized: 0,
        Count_Scheduled: 0,
        Count_Shortlisted: 0,
        Count_Offered: 0,
        Count_SelectedNotStarted: 0,
        Count_Backup: 0,
        Count_NotSelected: 0,
        Count_NotAcceptingOffer: 0,
        Count_UnderMedical: 0,
        Count_MedicalFit: 0,
        Count_MedicallyUnfit: 0,
        Count_UnderMedicalTreatment: 0,
        Count_PrometricExam: 0,
        Count_Mumaris: 0,
        Count_VFS: 0,
        Count_SVP: 0,
        Count_QVP: 0,
        Count_UnderStamping: 0,
        Count_Stamped: 20,
        Count_TicketBooking: 0,
        Count_TicketConfirmed: 0,
        Count_ImmigrationCheck: 0,
        Count_Arrived: 0,
        Count_Employed: 112,
        Count_BackedOut: 0
      },
      {
        MainProjectCode: mpCode || "002_613_ABW_M",
        CustomerId: customer || "BR0001455",
        Nationality: nationality || "PHL",
        Profession: profession || "6132045",
        Gender: gender || "Male",
        RecruitingID: "HReq-0004041",
        AgentId: "AG00412",
        AgentName: "AL-AMIN GLOBAL SERVICES",
        TotalApplications: 85,
        Count_New: 5,
        Count_Received: 0,
        Count_Authorized: 0,
        Count_Scheduled: 0,
        Count_Shortlisted: 0,
        Count_Offered: 0,
        Count_SelectedNotStarted: 0,
        Count_Backup: 0,
        Count_NotSelected: 0,
        Count_NotAcceptingOffer: 0,
        Count_UnderMedical: 0,
        Count_MedicalFit: 0,
        Count_MedicallyUnfit: 0,
        Count_UnderMedicalTreatment: 0,
        Count_PrometricExam: 0,
        Count_Mumaris: 0,
        Count_VFS: 0,
        Count_SVP: 0,
        Count_QVP: 0,
        Count_UnderStamping: 0,
        Count_Stamped: 15,
        Count_TicketBooking: 0,
        Count_TicketConfirmed: 0,
        Count_ImmigrationCheck: 0,
        Count_Arrived: 0,
        Count_Employed: 65,
        Count_BackedOut: 0
      }
    ];
  }

  async function openAgentDetailModal(mpCode, customer, nationality, profession, gender, subProjectCode, subProjectRecId) {
    rsrModalCurrentMpCode = mpCode || 'Project';
    rsrModalSelectedAgents = [];

    var displaySubTitle = 'Read-only candidate status breakdown per Agent for ';
    if (subProjectCode) {
      displaySubTitle += 'Sub-Project: ' + subProjectCode + ' | ';
    }
    displaySubTitle += 'Customer: ' + (customer || '-') + ' | Profession: ' + (profession || '-') + ' | Nationality: ' + (nationality || '-') + ' | Gender: ' + (gender || '-');

    $('#rsrModalTitle').text('Agent Breakdown Details — ' + (subProjectCode || rsrModalCurrentMpCode));
    $('#rsrModalSubtitle').text(displaySubTitle);

    $('#rsrModalAgentTableWrap').html('<div style="padding:40px;text-align:center;color:var(--rsr-gold);font-weight:500;font-size:14px">Loading agent breakdown details from Procedure API (sp_GetRSR_ProjectDetailAgentReport)...</div>');
    $('#rsrAgentModalBg').addClass('open');

    var token = getAuthToken();
    
    // Dynamic Stored Procedure API Call with object_Type=P and SubProjectRecId parameter
    var url = API_BASE_URL + '?object_Type=P&objectName=sp_GetRSR_ProjectDetailAgentReport';
    if (subProjectRecId) {
      url += '&SubProjectRecId=' + encodeURIComponent(subProjectRecId);
    } else if (mpCode) {
      url += '&MainProjectCode=' + encodeURIComponent(mpCode);
    }

    try {
      var response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        }
      });

      if (response.ok) {
        var resJson = await response.json();
        var dataList = null;
        if (resJson && resJson.Result && resJson.Result.Data) {
          dataList = resJson.Result.Data;
        } else if (resJson && resJson.Data) {
          dataList = resJson.Data;
        } else if (Array.isArray(resJson)) {
          dataList = resJson;
        }

        if (dataList && dataList.length > 0) {
          rsrModalRawData = dataList;
          rsrRenderModalAgentPanel();
          rsrUpdateModalChips();
          rsrRenderModalTable();
          return;
        }
      }
    } catch (err) {
      console.warn('Procedure API fetch notice (using fallback dataset):', err.message);
    }

    rsrModalRawData = getSampleAgentDetailData(mpCode, customer, nationality, profession, gender);
    rsrRenderModalAgentPanel();
    rsrUpdateModalChips();
    rsrRenderModalTable();
  }

  function closeAgentDetailModal(e) {
    if (!e || e.target.id === 'rsrAgentModalBg' || $(e.target).hasClass('rsr-rpt-modal-close')) {
      $('#rsrAgentModalBg').removeClass('open');
      $('.rsr-rpt-msf-panel').removeClass('open');
    }
  }

  function rsrRenderModalAgentPanel() {
    var $panel = $('#rsrModalAgentPanel');
    if (!$panel.length) return;

    var agents = [];
    rsrModalRawData.forEach(function (item) {
      var agKey = item.AgentId || item.AgentName;
      if (agKey && agents.indexOf(agKey) === -1) {
        agents.push(agKey);
      }
    });

    if (agents.length === 0) {
      $panel.html('<div class="rsr-rpt-msf-empty">No agents available</div>');
      return;
    }

    var html = agents.map(function (agKey) {
      var item = rsrModalRawData.filter(function(d){ return (d.AgentId || d.AgentName) === agKey; })[0] || {};
      var labelText = (item.AgentId ? item.AgentId + ' - ' : '') + (item.AgentName || agKey);
      var checked = rsrModalSelectedAgents.indexOf(agKey) > -1 ? 'checked' : '';
      return '<label class="rsr-rpt-msf-opt"><input type="checkbox" class="rsr-rpt-check" ' + checked +
        ' onclick="window.rsrToggleModalAgent(\'' + agKey.replace(/'/g, "\\'") + '\')"> ' + labelText + '</label>';
    }).join('');

    $panel.html(html);
  }

  function rsrToggleModalAgent(agKey) {
    var idx = rsrModalSelectedAgents.indexOf(agKey);
    if (idx > -1) {
      rsrModalSelectedAgents.splice(idx, 1);
    } else {
      rsrModalSelectedAgents.push(agKey);
    }

    rsrRenderModalAgentPanel();
    rsrUpdateModalChips();
    rsrRenderModalTable();
  }

  function rsrUpdateModalChips() {
    $('#rsrModalAgentChips').html(buildChipsHtml(rsrModalSelectedAgents, 'window.rsrToggleModalAgent', 'All assigned agents'));
  }

  function rsrClearModalFilters() {
    rsrModalSelectedAgents = [];
    rsrRenderModalAgentPanel();
    rsrUpdateModalChips();
    rsrRenderModalTable();
  }

  function rsrRenderModalTable() {
    var $container = $('#rsrModalAgentTableWrap');
    if (!$container.length) return;

    var filteredAgents = rsrModalRawData.filter(function (item) {
      var agKey = item.AgentId || item.AgentName;
      if (rsrModalSelectedAgents.length && rsrModalSelectedAgents.indexOf(agKey) === -1) {
        return false;
      }
      return true;
    });

    if (filteredAgents.length === 0) {
      $container.html('<div style="padding:40px;text-align:center;color:var(--rsr-ink3);border:0.5px dashed var(--rsr-border2);border-radius:var(--rsr-r2)">No agent breakdown data matching selected agent filter.</div>');
      return;
    }

    var html = '<div class="rsr-rpt-table-wrap" style="margin-bottom:12px;overflow-x:auto">';
    html += '<table style="min-width:850px"><thead><tr>'
      + '<th style="min-width:270px">Agent / Candidate Status Metric</th>'
      + '<th style="text-align:center;width:95px">Total</th>';

    filteredAgents.forEach(function (item) {
      var agIdStr = item.AgentId || item.AgentNumber || '';
      var agDisplay = (agIdStr ? '<b style="color:var(--rsr-teal)">' + agIdStr + '</b><br>' : '')
        + '<span style="font-weight:500;color:var(--rsr-ink)">' + (item.AgentName || agIdStr || 'Agent') + '</span>'
        + (item.AgentNumber && item.AgentNumber !== item.AgentId ? '<br><span style="font-size:10px;color:var(--rsr-gold)">No: ' + item.AgentNumber + '</span>' : '')
        + '<br><span style="font-size:10px;color:var(--rsr-ink3);font-weight:400">' + (item.RecruitingID || '') + '</span>';
      html += '<th style="text-align:center;min-width:180px">' + agDisplay + '</th>';
    });
    html += '</tr></thead><tbody>';

    function addModalRow(label, values, opts) {
      opts = opts || {};
      var rowStyle = opts.bg ? ' background:' + opts.bg + ';' : '';
      var labelStyle = opts.labelColor ? ' color:' + opts.labelColor + ';' : '';
      var valueStyle = opts.valueColor ? ' color:' + opts.valueColor + ';' : '';
      var weight = opts.bold ? ' font-weight:600;' : '';

      html += '<tr' + (rowStyle ? ' style="' + rowStyle + '"' : '') + '>';
      html += '<td style="' + labelStyle + weight + '">' + label + '</td>';
      html += '<td style="text-align:center;' + valueStyle + weight + '">' + (values.total !== undefined ? values.total : '') + '</td>';
      filteredAgents.forEach(function (item, idx) {
        html += '<td style="text-align:center;' + valueStyle + weight + '">' + (values[idx] !== undefined ? values[idx] : '') + '</td>';
      });
      html += '</tr>';
    }

    // 1. Recruiting ID
    var recIds = {};
    filteredAgents.forEach(function (item, idx) { recIds[idx] = item.RecruitingID || '-'; });
    recIds.total = '-';
    addModalRow('Recruiting ID', recIds, { bold: true, valueColor: 'var(--rsr-blue)' });

    // 1b. Agent ID
    var agentIds = {};
    filteredAgents.forEach(function (item, idx) { agentIds[idx] = item.AgentId || '-'; });
    agentIds.total = '-';
    addModalRow('Agent ID', agentIds, { bold: true, valueColor: 'var(--rsr-teal)' });

    // 1c. Agent Number (if available)
    var agentNums = {};
    filteredAgents.forEach(function (item, idx) { agentNums[idx] = item.AgentNumber || '-'; });
    agentNums.total = '-';
    addModalRow('Agent Number', agentNums);

    // 2. Customer ID
    var custs = {};
    filteredAgents.forEach(function (item, idx) { custs[idx] = item.CustomerId || '-'; });
    custs.total = '-';
    addModalRow('Customer ID', custs);

    // 3. Profession ID
    var profs = {};
    filteredAgents.forEach(function (item, idx) { profs[idx] = item.Profession || '-'; });
    profs.total = '-';
    addModalRow('Profession ID', profs);

    // 4. Nationality
    var nats = {};
    filteredAgents.forEach(function (item, idx) { nats[idx] = item.Nationality || '-'; });
    nats.total = '-';
    addModalRow('Nationality', nats);

    // 5. Gender
    var gnds = {};
    filteredAgents.forEach(function (item, idx) { gnds[idx] = item.Gender || '-'; });
    gnds.total = '-';
    addModalRow('Gender', gnds);

    // 6. Total Applications (Read-Only)
    var totApps = {};
    var sumApps = 0;
    filteredAgents.forEach(function (item, idx) {
      var a = item.TotalApplications || 0;
      totApps[idx] = a;
      sumApps += a;
    });
    totApps.total = sumApps;
    addModalRow('Total Applications (assigned to agent)', totApps, { bg: 'var(--rsr-gold-bg)', labelColor: 'var(--rsr-gold)', valueColor: 'var(--rsr-gold)', bold: true });

    // Separator Header
    html += '<tr><td colspan="' + (filteredAgents.length + 2) + '" class="rsr-rpt-hdr">Read-Only Candidate Status Breakdown per Agent</td></tr>';

    // Fixed Status Breakdown Rows (A to P)
    STATUS_ROWS.forEach(function (sr) {
      var rowVals = {};
      var rowTotal = 0;
      filteredAgents.forEach(function (item, idx) {
        var v = sr.calc ? sr.calc(item) : (item[sr.key] || 0);
        rowVals[idx] = v;
        rowTotal += v;
      });
      rowVals.total = rowTotal;
      addModalRow(sr.code + ') ' + sr.label, rowVals, sr.opts || {});
    });

    // ARRIVED Overall = Count_Arrived + Count_Employed
    var arrivedVals = {};
    var totalArrived = 0;
    filteredAgents.forEach(function (item, idx) {
      var a = (item.Count_Arrived || 0) + (item.Count_Employed || 0);
      arrivedVals[idx] = a;
      totalArrived += a;
    });
    arrivedVals.total = totalArrived;
    addModalRow('Q) ARRIVED & EMPLOYED (Overall)', arrivedVals, { bg: '#0F6E56', labelColor: '#fff', valueColor: '#fff', bold: true });

    html += '</tbody></table></div>';
    $container.html(html);
  }

  /* ──────────────────────────────────────────────────────────────
     9. GLOBAL EXPOSURE
     ────────────────────────────────────────────────────────────── */
  window.rsrInit = rsrInit;
  window.rsrSwitchType = rsrSwitchType;
  window.rsrTogglePanel = rsrTogglePanel;
  window.rsrToggleProject = rsrToggleProject;
  window.rsrToggleCustomer = rsrToggleCustomer;
  window.rsrToggleAgency = rsrToggleAgency;
  window.rsrSearch = rsrSearch;
  window.rsrClear = rsrClear;
  window.rsrRecalcSingleTable = rsrRecalcSingleTable;

  // Modal Exports
  window.openAgentDetailModal = openAgentDetailModal;
  window.closeAgentDetailModal = closeAgentDetailModal;
  window.rsrRenderModalAgentPanel = rsrRenderModalAgentPanel;
  window.rsrToggleModalAgent = rsrToggleModalAgent;
  window.rsrUpdateModalChips = rsrUpdateModalChips;
  window.rsrClearModalFilters = rsrClearModalFilters;
  window.rsrRenderModalTable = rsrRenderModalTable;

  // Modal Exports
  window.openAgentDetailModal = openAgentDetailModal;
  window.closeAgentDetailModal = closeAgentDetailModal;
  window.rsrRenderModalAgentPanel = rsrRenderModalAgentPanel;
  window.rsrToggleModalAgent = rsrToggleModalAgent;
  window.rsrUpdateModalChips = rsrUpdateModalChips;
  window.rsrClearModalFilters = rsrClearModalFilters;
  window.rsrRenderModalTable = rsrRenderModalTable;

  $(function () {
    rsrInit();
  });

})(window.jQuery || jQuery);
