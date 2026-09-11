var _this = this;

// Dynamically inject SweetAlert2 if not already present
if (typeof Swal === 'undefined') {
  const scriptSwal = document.createElement('script');
  scriptSwal.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
  document.head.appendChild(scriptSwal);
}

(function ($) {
  /* ──────────────────────────────────────────────────────────────
     1. GLOBAL STATE & API CONFIG
     ────────────────────────────────────────────────────────────── */
  var API_BASE_URL =
    "https://portal.mawarid.com.sa/apps4x-api/api/v1/LGE0000001/connector/CON0000001/sql/sysobjectexecute";
  var API_VIEW_NAME = "vw_RSR_ProjectSummaryReport";
  var LOCAL_STORAGE_TOKEN_KEY =
    "eyjJwhtbtGockieOniJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzA0L3htbGRzaWctbW9yZSNobWFjLXNoYTI1NiIsInR5cCI6IkpXVCJ9";
  var API_FALLBACK_TOKEN =
    "Bearer eyJhbGciOiJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzA0L3htbGRzaWctbW9yZSNobWFjLXNoYTI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VySWQiOiJhLmh5ZGVyIiwiTmFtZSI6Ikh5ZGVyIEFsaSBBIiwiRW1haWwiOiJoeWRlckBmYWF6dGVjaHNvbHV0aW9ucy5jb20iLCJNb2JpbGVOdW1iZXIiOiI5OTQzMjIxMzIxIiwiQ29tcGFueUlkIjoiTEdFMDAwMDAwMSIsImV4cCI6MTc4Nzc0MTMwNSwiaXNzIjoiYXBwczR4LmNvbSIsImF1ZCI6ImFwcHM0eC5jb20ifQ.dP6ONemiwTAtx7I-XqanLPSxnCBpcOWw8gNv9EKaA_E";

  var rsrCurrentType = "Mawarid Agencies";
  var rsrSelectedProjects = [];
  var rsrSelectedCustomers = [];
  var rsrSelectedAgencies = [];
  var rawApiData = [];
  var targetInputsState = {};
  var modalTargetInputsState = {};

  // Modal Global State
  var rsrModalCurrentMpCode = '';
  var rsrModalRawData = [];
  var rsrModalSelectedAgents = [];

  var STATUS_ROWS = [
    { code: "1", label: "New", key: "Count_New" },
    { code: "2", label: "Received", key: "Count_Received" },
    { code: "3", label: "Authorized", key: "Count_Authorized" },
    { code: "4", label: "Scheduled", key: "Count_Scheduled" },
    { code: "5", label: "Shortlisted", key: "Count_Shortlisted" },
    { code: "6", label: "Offered", key: "Count_Offered" },
    { code: "7", label: "Selected Not Started", key: "Count_SelectedNotStarted" },
    { code: "8", label: "Backup", key: "Count_Backup" },
    { code: "9", label: "Not Selected", key: "Count_NotSelected" },
    { code: "10", label: "Not Accepting Offer", key: "Count_NotAcceptingOffer" },
    { code: "11", label: "UNDER MEDICAL", key: "Count_UnderMedical" },
    { code: "12", label: "MEDICAL FIT", key: "Count_MedicalFit" },
    {
      code: "13",
      label: "MEDICALLY UNFIT",
      key: "Count_MedicallyUnfit",
      opts: { valueColor: "#C00000", labelColor: "#C00000", bold: true },
    },
    { code: "14", label: "UNDER MEDICAL TREATMENT", key: "Count_UnderMedicalTreatment" },
    { code: "15", label: "Prometric Exam", key: "Count_PrometricExam" },
    { code: "16", label: "Mumaris", key: "Count_Mumaris" },
    { code: "17", label: "UNDER VFS", key: "Count_VFS" },
    { code: "18", label: "SVP", key: "Count_SVP" },
    { code: "19", label: "QVP", key: "Count_QVP" },
    { code: "20", label: "UNDER STAMPING", key: "Count_UnderStamping" },
    { code: "21", label: "VISA STAMPED", key: "Count_Stamped" },
    { code: "22", label: "Ticket Booking", key: "Count_TicketBooking" },
    {
      code: "23",
      label: "TICKET CONFIRMED",
      key: "Count_TicketConfirmed",
      opts: { bg: "#E2EFDA", labelColor: "#000000", valueColor: "#000000", bold: true },
    },
    { code: "24", label: "Immigration Check", key: "Count_ImmigrationCheck" },
    { code: "25", label: "Arrived", key: "Count_Arrived" },
    { code: "26", label: "Employed", key: "Count_Employed" },
    {
      code: "27",
      label: "Backed Out",
      key: "Count_BackedOut",
      opts: { valueColor: "#C00000", labelColor: "#C00000", bold: true },
    },
  ];

  /* ──────────────────────────────────────────────────────────────
     2. AUTH TOKEN RESOLUTION
     ────────────────────────────────────────────────────────────── */
  function getAuthToken() {
    var primaryToken = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
      //  primaryToken = "eyJhbGciOiJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzA0L3htbGRzaWctbW9yZSNobWFjLXNoYTI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VySWQiOiJhLmh5ZGVyIiwiTmFtZSI6Ikh5ZGVyIEFsaSBBIiwiRW1haWwiOiJoeWRlckBmYWF6dGVjaHNvbHV0aW9ucy5jb20iLCJNb2JpbGVOdW1iZXIiOiI5OTQzMjIxMzIxIiwiQ29tcGFueUlkIjoiTEdFMDAwMDAwMSIsImV4cCI6MTc4ODg0OTIzOCwiaXNzIjoiYXBwczR4LmNvbSIsImF1ZCI6ImFwcHM0eC5jb20ifQ.-qDcsJ0BU5Cd0dWiGwCt14Ml4EuDRqwA4ZhMO2KjZXg";
    if (primaryToken && primaryToken.trim() !== "") {
      var trimmedToken = primaryToken.trim();
      return trimmedToken.startsWith("Bearer ")
        ? trimmedToken
        : "Bearer " + trimmedToken;
    }

    if (
      typeof _this !== "undefined" &&
      _this &&
      _this.globalService &&
      _this.globalService.SysParameter &&
      _this.globalService.SysParameter.Token
    ) {
      var t = _this.globalService.SysParameter.Token;
      return t.startsWith("Bearer ") ? t : "Bearer " + t;
    }

    var tokenKeys = ["token", "authToken", "authorization", "BearerToken"];
    for (var i = 0; i < tokenKeys.length; i++) {
      var stored = localStorage.getItem(tokenKeys[i]);
      if (stored && stored.trim() !== "") {
        var s = stored.trim();
        return s.startsWith("Bearer ") ? s : "Bearer " + s;
      }
    }

    return API_FALLBACK_TOKEN;
  }

  /* ──────────────────────────────────────────────────────────────
     3. FORMATTING & URL GENERATION HELPERS
     ────────────────────────────────────────────────────────────── */
  function getHiringProjectUrl(hiringProjectCode) {
    if (!hiringProjectCode) return "#";
    return (
      "/apps/hiring-projects/detail?id=" + encodeURIComponent(hiringProjectCode)
    );
  }

  function formatReferenceNo(refStr) {
    if (!refStr) return "-";
    var safeStr = String(refStr).replace(/"/g, "&quot;");
    var parts = String(refStr)
      .split(",")
      .map(function (s) {
        return s.trim();
      });
    if (parts.length > 1) {
      return (
        '<div class="rsr-rpt-ref-wrapper" title="' +
        safeStr +
        '">' +
        '<span class="rsr-rpt-ref-truncated">' +
        parts[0] +
        "</span>" +
        '<span class="rsr-rpt-ref-badge">+' +
        (parts.length - 1) +
        "</span></div>"
      );
    } else {
      return (
        '<div class="rsr-rpt-ref-wrapper" title="' +
        safeStr +
        '">' +
        '<span class="rsr-rpt-ref-truncated">' +
        refStr +
        "</span></div>"
      );
    }
  }

  function formatDateStr(dateStr) {
    if (!dateStr || dateStr === "-") return "-";
    var str = String(dateStr).trim();
    if (!str) return "-";

    if (str.indexOf(" to ") > -1) {
      var parts = str.split(" to ");
      return formatDateStr(parts[0]) + " to " + formatDateStr(parts[1]);
    }
    if (str.indexOf(" - ") > -1) {
      var parts = str.split(" - ");
      return formatDateStr(parts[0]) + " to " + formatDateStr(parts[1]);
    }

    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Match DD-MM-YYYY or DD/MM/YYYY
    var matchDDMMYYYY = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (matchDDMMYYYY) {
      var d = parseInt(matchDDMMYYYY[1], 10);
      var m = parseInt(matchDDMMYYYY[2], 10) - 1;
      var y = matchDDMMYYYY[3];
      if (m >= 0 && m < 12) {
        var dayStr = d < 10 ? "0" + d : "" + d;
        return dayStr + "-" + months[m] + "-" + y;
      }
    }

    // Match YYYY-MM-DD
    var matchYYYYMMDD = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (matchYYYYMMDD) {
      var y = matchYYYYMMDD[1];
      var m = parseInt(matchYYYYMMDD[2], 10) - 1;
      var d = parseInt(matchYYYYMMDD[3], 10);
      if (m >= 0 && m < 12) {
        var dayStr = d < 10 ? "0" + d : "" + d;
        return dayStr + "-" + months[m] + "-" + y;
      }
    }

    return str;
  }

  function formatHeaderCode(code) {
    if (!code) return "";
    var safeStr = String(code).replace(/"/g, "&quot;");
    var parts = String(code)
      .split(",")
      .map(function (s) {
        return s.trim();
      });
    if (parts.length > 1) {
      return (
        '<span title="' +
        safeStr +
        '">' +
        parts[0] +
        ' <span class="rsr-rpt-ref-badge">+' +
        (parts.length - 1) +
        "</span></span>"
      );
    }
    return '<span title="' + safeStr + '">' + code + "</span>";
  }

  function getActualStatusChip(item) {
    var statusStr =
      item.ProjectStatus ||
      item.Status ||
      (item.MainProjectIsActive ? "Active" : "Inactive");

    var options = [
      { text: "Not started", value: "Not started" },
      { text: "In Progress", value: "In Progress" },
      { text: "Hold", value: "Hold" },
      { text: "Cancelled", value: "Cancelled" },
      { text: "Completed", value: "Completed" },
    ];

    var optionsHtml = options
      .map(function (opt) {
        var selected =
          opt.value.toLowerCase() === (statusStr || "").toLowerCase()
            ? "selected"
            : "";
        return (
          '<option value="' +
          opt.value +
          '" ' +
          selected +
          ">" +
          opt.text +
          "</option>"
        );
      })
      .join("");

    var safeItem = encodeURIComponent(JSON.stringify(item));
    var initialClass = window.rsrGetChipClass ? window.rsrGetChipClass(statusStr) : "rsr-rpt-chip rsr-rpt-chip-gray";

    return (
      '<select class="' + initialClass + '" style="cursor:pointer; appearance:none; -webkit-appearance:none; border:none; outline:none; text-align:center; padding-right:12px;" onchange="this.className=window.rsrGetChipClass(this.value); window.rsrUpdateProjectStatus(this, \'' +
      safeItem +
      "')\">" +
      optionsHtml +
      "</select>"
    );
  }

  /* ──────────────────────────────────────────────────────────────
     4. LIVE API DATA LOADER ($size=0)
     ────────────────────────────────────────────────────────────── */
  function resolveLocalData() {
    if (
      _this &&
      _this.ResponseData &&
      _this.ResponseData.Result &&
      _this.ResponseData.Result.Data
    ) {
      return _this.ResponseData.Result.Data;
    }
    if (
      window.apiResponse &&
      window.apiResponse.Result &&
      window.apiResponse.Result.Data
    ) {
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
      $(".rsr-rpt-tab").removeClass("rsr-rpt-active");
      var $targetTab = $(".rsr-rpt-tab").filter(function () {
        return (
          $(this).attr("data-type").trim().toLowerCase() ===
          rsrCurrentType.toLowerCase()
        );
      });
      if ($targetTab.length) {
        $targetTab.addClass("rsr-rpt-active");
      } else {
        $(".rsr-rpt-tab").first().addClass("rsr-rpt-active");
      }
    }
  }

  async function fetchRSRDataFromAPI() {
    var token = getAuthToken();
    var url =
      API_BASE_URL +
      "?object_Type=V&objectName=" +
      API_VIEW_NAME +
      "&$page=1&$size=0";

    try {
      var response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      });

      if (!response.ok) {
        throw new Error("API returned HTTP status " + response.status);
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
      console.warn("API fetch notice:", err.message);
    }

    rawApiData = resolveLocalData();
    autoSelectActiveTab();
    rsrSwitchType(rsrCurrentType);
  }

  function rsrInit() {
    $("#rsrGroups").html(
      '<div style="padding:40px;text-align:center;color:var(--rsr-gold);font-weight:500;font-size:14px">Loading RSR Report data from API (vw_RSR_ProjectSummaryReport)...</div>',
    );
    rawApiData = resolveLocalData();
    fetchRSRDataFromAPI();
  }

  /* ──────────────────────────────────────────────────────────────
     5. TABS & MULTI-SELECT CASCADING FILTERS
     ────────────────────────────────────────────────────────────── */
  function getItemsForCurrentTab() {
    return rawApiData.filter(function (item) {
      if (!rsrCurrentType) return true;
      var itemType = (item.ProjectType || "").trim().toLowerCase();
      var curType = (rsrCurrentType || "").trim().toLowerCase();
      return itemType === curType;
    });
  }

  function rsrSwitchType(type, el) {
    rsrCurrentType = type;

    $(".rsr-rpt-tab").removeClass("rsr-rpt-active");
    if (el) {
      $(el).addClass("rsr-rpt-active");
    } else {
      $(".rsr-rpt-tab")
        .filter(function () {
          return (
            ($(this).attr("data-type") || "").trim().toLowerCase() ===
            type.trim().toLowerCase()
          );
        })
        .addClass("rsr-rpt-active");
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
    $(".rsr-rpt-msf-panel").each(function () {
      if (this.id === panelId) {
        $(this).toggleClass("open");
      } else {
        $(this).removeClass("open");
      }
    });
  }

  $(document).on("click", function (e) {
    if (!$(e.target).closest(".rsr-rpt-msf").length) {
      $(".rsr-rpt-msf-panel").removeClass("open");
    }
    if (!$(e.target).closest("select").length && !$(e.target).closest(".rsr-rpt-chip").length) {
      if (document.activeElement && document.activeElement.tagName === "SELECT") {
        document.activeElement.blur();
      }
      $("select").blur();
      $(".rsr-rpt-status-dropdown, .rsr-rpt-dropdown-menu").removeClass("open active");
    }
  });

  // Explicit click-outside listener for pop-up modal agent filter dropdown
  $(document).on("click", ".rsr-rpt-modal-bg, .rsr-rpt-modal, .rsr-rpt-modal-body", function (e) {
    if (!$(e.target).closest(".rsr-rpt-msf").length) {
      $("#rsrModalAgentPanel").removeClass("open");
      $(".rsr-rpt-msf-panel").removeClass("open");
    }
  });

  $(document).on("keydown", function (e) {
    if (e.key === "Escape" || e.keyCode === 27) {
      $(".rsr-rpt-msf-panel").removeClass("open");
      $("#rsrModalAgentPanel").removeClass("open");
      if (document.activeElement && document.activeElement.tagName === "SELECT") {
        document.activeElement.blur();
      }
      $("select").blur();
      $(".rsr-rpt-status-dropdown, .rsr-rpt-dropdown-menu").removeClass("open active");
    }
  });

  function rsrRenderProjectPanel() {
    var $panel = $("#rsrProjectPanel");
    if (!$panel.length) return;

    var tabItems = getItemsForCurrentTab();
    var projects = [];
    tabItems.forEach(function (item) {
      if (
        item.MainProjectCode &&
        projects.indexOf(item.MainProjectCode) === -1
      ) {
        projects.push(item.MainProjectCode);
      }
    });

    if (projects.length === 0) {
      $panel.html(
        '<div class="rsr-rpt-msf-empty">No main projects available</div>',
      );
      return;
    }

    var html = projects
      .map(function (code) {
        var checked = rsrSelectedProjects.indexOf(code) > -1 ? "checked" : "";
        return (
          '<label class="rsr-rpt-msf-opt"><input type="checkbox" class="rsr-rpt-check" ' +
          checked +
          " onclick=\"window.rsrToggleProject('" +
          code +
          "')\"> " +
          code +
          "</label>"
        );
      })
      .join("");

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
      if (
        !rsrSelectedProjects.length ||
        rsrSelectedProjects.indexOf(item.MainProjectCode) > -1
      ) {
        var custVal = item.HiringProject || item.Customer;
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
    var $panel = $("#rsrCustomerPanel");
    if (!$panel.length) return;

    var tabItems = getItemsForCurrentTab();
    var scopedItems = tabItems.filter(function (item) {
      return (
        !rsrSelectedProjects.length ||
        rsrSelectedProjects.indexOf(item.MainProjectCode) > -1
      );
    });

    var customers = [];
    scopedItems.forEach(function (item) {
      var custVal = item.HiringProject || item.Customer;
      if (custVal && customers.indexOf(custVal) === -1) {
        customers.push(custVal);
      }
    });

    if (customers.length === 0) {
      $panel.html(
        '<div class="rsr-rpt-msf-empty">No hiring projects available</div>',
      );
      return;
    }

    var html = customers
      .map(function (cust) {
        var checked = rsrSelectedCustomers.indexOf(cust) > -1 ? "checked" : "";
        return (
          '<label class="rsr-rpt-msf-opt"><input type="checkbox" class="rsr-rpt-check" ' +
          checked +
          " onclick=\"window.rsrToggleCustomer('" +
          cust.replace(/'/g, "\\'") +
          "')\"> " +
          cust +
          "</label>"
        );
      })
      .join("");

    $panel.html(html);

    var $hint = $("#rsrCascadeHint");
    if ($hint.length) {
      if (rsrSelectedProjects.length) {
        $hint
          .show()
          .text("Hiring project list scoped to selected Main Project(s).");
      } else {
        $hint
          .show()
          .text("Showing all hiring projects under " + rsrCurrentType + ".");
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
    var $panel = $("#rsrAgencyPanel");
    if (!$panel.length) return;

    var tabItems = getItemsForCurrentTab();
    var agencies = [];
    tabItems.forEach(function (item) {
      if (
        item.SubProjectOwner &&
        agencies.indexOf(item.SubProjectOwner) === -1
      ) {
        agencies.push(item.SubProjectOwner);
      }
    });

    if (agencies.length === 0) {
      $panel.html('<div class="rsr-rpt-msf-empty">No agencies available</div>');
      return;
    }

    var html = agencies
      .map(function (agency) {
        var checked = rsrSelectedAgencies.indexOf(agency) > -1 ? "checked" : "";
        return (
          '<label class="rsr-rpt-msf-opt"><input type="checkbox" class="rsr-rpt-check" ' +
          checked +
          " onclick=\"window.rsrToggleAgency('" +
          agency.replace(/'/g, "\\'") +
          "')\"> " +
          agency +
          "</label>"
        );
      })
      .join("");

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
      return '<span style="color:var(--rsr-ink3)">' + placeholder + "</span>";
    }
    return list
      .map(function (val) {
        return (
          '<span class="rsr-rpt-msf-chip">' +
          val +
          '<span class="x" onclick="event.stopPropagation();' +
          removeFn +
          "('" +
          val.replace(/'/g, "\\'") +
          "')\">&times;</span></span>"
        );
      })
      .join("");
  }

  function rsrUpdateChips() {
    $("#rsrProjectChips").html(
      buildChipsHtml(
        rsrSelectedProjects,
        "window.rsrToggleProject",
        "All main projects",
      ),
    );
    $("#rsrCustomerChips").html(
      buildChipsHtml(
        rsrSelectedCustomers,
        "window.rsrToggleCustomer",
        "All hiring projects",
      ),
    );
    $("#rsrAgencyChips").html(
      buildChipsHtml(
        rsrSelectedAgencies,
        "window.rsrToggleAgency",
        "All agencies",
      ),
    );
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
     6. RENDER SINGLE TABLE
     ────────────────────────────────────────────────────────────── */
  function rsrRenderTable() {
    var $container = $("#rsrGroups");
    if (!$container.length) return;

    var filteredItems = getItemsForCurrentTab().filter(function (item) {
      if (
        rsrSelectedProjects.length &&
        rsrSelectedProjects.indexOf(item.MainProjectCode) === -1
      ) {
        return false;
      }
      var custVal = item.HiringProject || item.Customer;
      if (
        rsrSelectedCustomers.length &&
        rsrSelectedCustomers.indexOf(custVal) === -1
      ) {
        return false;
      }
      if (
        rsrSelectedAgencies.length &&
        rsrSelectedAgencies.indexOf(item.SubProjectOwner) === -1
      ) {
        return false;
      }
      return true;
    });

    if (filteredItems.length === 0) {
      $container.html(
        '<div style="padding:40px;text-align:center;color:var(--rsr-ink3);border:0.5px dashed var(--rsr-border2);border-radius:var(--rsr-r2)">No data matching the active tab and selected filter options.</div>',
      );
      return;
    }

    var html =
      '<div class="rsr-rpt-table-wrap" style="margin-bottom:24px;overflow-x:auto">';
    html +=
      '<table style="min-width:700px"><thead><tr>' +
      '<th style="min-width:240px">Sub-Project / Metric</th>' +
      '<th style="text-align:center;width:75px">Total</th>';

    filteredItems.forEach(function (item, idx) {
      var subCode = item.SubProjectCode || item.SubProjectCodes || item.SubProjectCodeString || item.MainProjectCode || ('SubProj_' + (idx + 1));
      var mp = item.MainProjectCode || '-';
      var cust = item.HiringProject || item.Customer || '';
      var nat = item.Nationality || '';
      var prof = item.Profession || '';
      var gnd = item.Gender || '';
      var subRecId = item.SubProjectRecId || item.RecId || '';

      var linkHtml = '<a href="javascript:void(0)" class="rsr-rpt-mp-link" onclick="window.openAgentDetailModal(\''
        + mp.replace(/'/g, "\\'") + '\', \''
        + cust.replace(/'/g, "\\'") + '\', \''
        + nat.replace(/'/g, "\\'") + '\', \''
        + prof.replace(/'/g, "\\'") + '\', \''
        + gnd.replace(/'/g, "\\'") + '\', \''
        + subCode.replace(/'/g, "\\'") + '\', \''
        + subRecId + '\')" title="Click to view Agent Breakdown Details for ' + subCode + '">' + subCode + '</a>';

      html +=
        '<th style="text-align:center;min-width:120px;vertical-align:middle;">' +
        linkHtml +
        "</th>";
    });
    html += "</tr></thead><tbody>";

    function addRow(label, values, opts) {
      opts = opts || {};
      var rowStyle = opts.bg ? " background:" + opts.bg + ";" : "";
      var labelStyle = opts.labelColor ? " color:" + opts.labelColor + ";" : "";
      var valueStyle = opts.valueColor ? " color:" + opts.valueColor + ";" : "";
      var weight = opts.bold ? " font-weight:600;" : "";

      html += "<tr" + (rowStyle ? ' style="' + rowStyle + '"' : "") + ">";
      html += '<td style="' + labelStyle + weight + '">' + label + "</td>";
      html +=
        '<td style="text-align:center;' +
        valueStyle +
        weight +
        '">' +
        (values.total !== undefined ? values.total : "") +
        "</td>";
      filteredItems.forEach(function (item, idx) {
        html +=
          '<td style="text-align:center;' +
          valueStyle +
          weight +
          '">' +
          (values[idx] !== undefined ? values[idx] : "") +
          "</td>";
      });
      html += "</tr>";
    }

    // 1. Reference No
    var refs = {};
    filteredItems.forEach(function (item, idx) {
      var rawRec = item.RecruitingID || item.RecruitingIDs || item.RecruitingId || item.HrmRecruitingId || "-";
      if (rawRec && rawRec !== "-") {
        refs[idx] = '<span class="rsr-rpt-ellipsis" title="' + String(rawRec).replace(/"/g, '&quot;') + '">' + rawRec + '</span>';
      } else {
        refs[idx] = "-";
      }
    });
    refs.total = filteredItems.length;
    addRow("Reference No", refs);

    // 3. Hiring Project
    var hpRows = {};
    filteredItems.forEach(function (item, idx) {
      var hp = item.HiringProject || item.Customer || "-";
      hpRows[idx] =
        '<span style="color:var(--rsr-teal);font-weight:500;">' +
        hp +
        "</span>";
    });
    hpRows.total = "-";
    addRow("Hiring Project", hpRows);

    // 4. Nationality
    var nats = {};
    filteredItems.forEach(function (item, idx) {
      nats[idx] = item.Nationality || "-";
    });
    nats.total = "-";
    addRow("Nationality", nats);

    // 5. Gender
    var genders = {};
    filteredItems.forEach(function (item, idx) {
      genders[idx] = item.Gender || "-";
    });
    genders.total = "-";
    addRow("Gender", genders);

    // 6. Profession
    var profs = {};
    filteredItems.forEach(function (item, idx) {
      profs[idx] = item.Profession || "-";
    });
    profs.total = "-";
    addRow("Profession", profs);

    // 7. Period
    var periods = {};
    filteredItems.forEach(function (item, idx) {
      var rawP =
        item.SubProjectPeriod ||
        (item.SubProjectStartDate && item.SubProjectEndDate
          ? item.SubProjectStartDate + " to " + item.SubProjectEndDate
          : item.SubProjectStartDate || item.SubProjectEndDate || "-");
      periods[idx] = formatDateStr(rawP);
    });
    periods.total = "-";
    addRow("Period", periods);

    // 8. Owner
    var owners = {};
    filteredItems.forEach(function (item, idx) {
      owners[idx] = item.SubProjectOwner || "-";
    });
    owners.total = "-";
    addRow("Owner", owners);

    // 9. TARGET (THIS MONTH) — EDITABLE INPUT FIELD (Yellow #FFFF00)
    html +=
      '<tr style="background:#FFFF00;border-top:1px solid #C9C9C9"><td style="color:#000000;font-weight:700">Target (this month)</td>' +
      '<td style="text-align:center;font-weight:700;color:#000000" id="rsrSingleTargetTotal">0</td>';

    filteredItems.forEach(function (item, idx) {
      var colKey = "single_" + idx;
      var defaultTarget =
        targetInputsState[colKey] !== undefined
          ? targetInputsState[colKey]
          : item.TotalSubProjectQuantity || 10;
      var arrived =
        item.Count_Arrived !== undefined && item.Count_Arrived > 0
          ? item.Count_Arrived
          : item.Count_Employed || 0;
      var confirmed =
        item.Count_ImmigrationCheck !== undefined &&
        item.Count_ImmigrationCheck > 0
          ? item.Count_ImmigrationCheck
          : item.Count_Stamped || arrived;
      html +=
        '<td style="text-align:center"><input class="rsr-rpt-input" id="rsrTarget_' +
        colKey +
        '" data-colindex="' +
        idx +
        '" data-arrived="' +
        arrived +
        '" data-confirmed="' +
        confirmed +
        '" data-qty="' +
        (item.TotalSubProjectQuantity || 0) +
        '" value="' +
        defaultTarget +
        '" oninput="window.rsrRecalcSingleTable()" onchange="window.rsrRecalcSingleTable()" onkeyup="window.rsrRecalcSingleTable()"></td>';
    });
    html += "</tr>";

    // 10. REMAINING (THIS MONTH) (Soft Cream #FFF2CC)
    html +=
      '<tr style="background:#FFF2CC;border-bottom:1px solid #C9C9C9"><td style="font-weight:600;color:#000000">Remaining (This Month)</td>' +
      '<td style="text-align:center;font-weight:700;color:#000000" id="rsrSingleRemainTotal">0</td>';
    filteredItems.forEach(function (item, idx) {
      html +=
        '<td style="text-align:center;font-weight:600;color:#000000" id="rsrRemain_single_' +
        idx +
        '">0</td>';
    });
    html += "</tr>";

    // 11. Quantity
    var totalQty = 0;
    var qtys = {};
    filteredItems.forEach(function (item, idx) {
      var q = item.TotalSubProjectQuantity || 0;
      qtys[idx] = q;
      totalQty += q;
    });
    qtys.total = totalQty;
    addRow("Quantity", qtys, { bold: true });

    // 12. Total Applications
    var totalApps = 0;
    var appVals = {};
    filteredItems.forEach(function (item, idx) {
      var a = item.TotalApplications || 0;
      appVals[idx] = a;
      totalApps += a;
    });
    appVals.total = totalApps;
    addRow("Total Applications", appVals, { bold: true });

    // 13. Project Status — ACTUAL STATUS CHIP (Amber #FFC000)
    var statusVals = {};
    filteredItems.forEach(function (item, idx) {
      statusVals[idx] = getActualStatusChip(item);
    });
    statusVals.total = "-";
    addRow("Project Status", statusVals, { bg: "#FFC000", labelColor: "#000000", valueColor: "#000000", bold: true });

    // Separator Header
    html +=
      '<tr><td colspan="' +
      (filteredItems.length + 2) +
      '" class="rsr-rpt-hdr"><span style="position:sticky;left:14px;display:inline-block">Status &mdash; fixed order, always shown, no show/hide toggle</span></td></tr>';

    // 14. Fixed Status Breakdown Rows (A to P)
    STATUS_ROWS.forEach(function (sr) {
      var rowVals = {};
      var rowTotal = 0;
      filteredItems.forEach(function (item, idx) {
        var v = sr.calc ? sr.calc(item) : item[sr.key] || 0;
        rowVals[idx] = v;
        rowTotal += v;
      });
      rowVals.total = rowTotal;
      addRow(sr.label, rowVals, sr.opts || {});
    });

    // 15. ARRIVED (This Month) (Soft Green #C6E0B4)
    var arrivedThisMonthVals = {};
    var totalArrivedThisMonth = 0;
    filteredItems.forEach(function (item, idx) {
      var a =
        item.Count_Arrived !== undefined && item.Count_Arrived > 0
          ? item.Count_Arrived
          : item.Count_Employed || 0;
      arrivedThisMonthVals[idx] = a;
      totalArrivedThisMonth += a;
    });
    arrivedThisMonthVals.total = totalArrivedThisMonth;
    addRow("ARRIVED (This Month)", arrivedThisMonthVals, {
      bg: "#C6E0B4",
      labelColor: "#000000",
      valueColor: "#000000",
      bold: true,
    });

    // 16. Confirmed Completion (This Month) (Leaf Green #70AD47)
    var confirmedVals = {};
    var totalConfirmed = 0;
    filteredItems.forEach(function (item, idx) {
      var a =
        item.Count_Arrived !== undefined && item.Count_Arrived > 0
          ? item.Count_Arrived
          : item.Count_Employed || 0;
      var c =
        item.Count_ImmigrationCheck !== undefined &&
        item.Count_ImmigrationCheck > 0
          ? item.Count_ImmigrationCheck
          : item.Count_Stamped || a;
      confirmedVals[idx] = c;
      totalConfirmed += c;
    });
    confirmedVals.total = totalConfirmed;
    addRow("Confirmed Completion (This Month)", confirmedVals, {
      bg: "#70AD47",
      labelColor: "#FFFFFF",
      valueColor: "#FFFFFF",
      bold: true,
    });

    // 17. Confirmed Completion (This Month) %
    html +=
      '<tr style="background:#E2EFDA"><td style="font-weight:600;color:#385723">Confirmed Completion (This Month) %</td>' +
      '<td style="text-align:center;font-weight:700;color:#385723" id="rsrSingleConfCompTotal">0.0%</td>';
    filteredItems.forEach(function (item, idx) {
      html +=
        '<td style="text-align:center;font-weight:600;color:#385723" id="rsrConfComp_single_' +
        idx +
        '">0.0%</td>';
    });
    html += "</tr>";

    // 18. Q) ARRIVED (Overall) = Arrived + Employed (Dark Forest Green #375623)
    var arrivedOverallVals = {};
    var totalArrivedOverall = 0;
    filteredItems.forEach(function (item, idx) {
      var a =
        item.Count_Arrived !== undefined && item.Count_Arrived > 0
          ? item.Count_Arrived
          : 0;
      var ov = a + (item.Count_Employed || 0);
      arrivedOverallVals[idx] = ov;
      totalArrivedOverall += ov;
    });
    arrivedOverallVals.total = totalArrivedOverall;
    addRow("Q) ARRIVED (Overall)", arrivedOverallVals, {
      bg: "#375623",
      labelColor: "#FFFFFF",
      valueColor: "#FFFFFF",
      bold: true,
    });

    // 19. Remaining (Overall) = Quantity - Arrived Overall
    var remainOverallVals = {};
    var totalRemainOverall = 0;
    filteredItems.forEach(function (item, idx) {
      var q = item.TotalSubProjectQuantity || 0;
      var a =
        item.Count_Arrived !== undefined && item.Count_Arrived > 0
          ? item.Count_Arrived
          : 0;
      var ov = a + (item.Count_Employed || 0);
      var r = q - ov;
      remainOverallVals[idx] = r;
      totalRemainOverall += r;
    });
    remainOverallVals.total = totalRemainOverall;
    addRow("Remaining (Overall)", remainOverallVals, { bold: true });

    // 20. Completion (Overall) % = (Arrived Overall / Quantity) * 100
    var compOverallVals = {};
    filteredItems.forEach(function (item, idx) {
      var q = item.TotalSubProjectQuantity || 0;
      var a =
        item.Count_Arrived !== undefined && item.Count_Arrived > 0
          ? item.Count_Arrived
          : 0;
      var ov = a + (item.Count_Employed || 0);
      var pct = q > 0 ? ((ov / q) * 100).toFixed(1) + "%" : "0.0%";
      compOverallVals[idx] = pct;
    });
    compOverallVals.total =
      totalQty > 0
        ? ((totalArrivedOverall / totalQty) * 100).toFixed(1) + "%"
        : "0.0%";
    addRow("Completion (Overall) %", compOverallVals, {
      bold: true,
      valueColor: "#0F6E56",
    });

    // 21. COMPLETION (THIS MONTH) % (Light Pale Green #E2EFDA)
    html +=
      '<tr style="background:#E2EFDA;border-top:1.5px solid #70AD47"><td style="font-weight:700;color:#000000">Completion (This Month) %</td>' +
      '<td style="text-align:center;font-weight:700;color:#000000" id="rsrSingleCompTotal">0.0%</td>';
    filteredItems.forEach(function (item, idx) {
      html +=
        '<td style="text-align:center;font-weight:700;color:#000000" id="rsrComp_single_' +
        idx +
        '">0.0%</td>';
    });
    html += "</tr>";

    html += "</tbody></table></div>";
    $container.html(html);

    rsrRecalcSingleTable();
  }

  /* ──────────────────────────────────────────────────────────────
     7. DYNAMIC TARGET RECALCULATION
     ────────────────────────────────────────────────────────────── */
  function rsrRecalcSingleTable() {
    var $inputs = $("input[data-colindex]");
    if (!$inputs.length) return;

    var totalTarget = 0;
    var totalArrived = 0;
    var totalConfirmed = 0;

    $inputs.each(function () {
      var $inp = $(this);
      var idx = $inp.data("colindex");
      var colKey = "single_" + idx;

      var target = parseInt($inp.val(), 10) || 0;
      targetInputsState[colKey] = target;

      var arrived =
        parseInt($inp.attr("data-arrived"), 10) ||
        parseInt($inp.data("arrived"), 10) ||
        0;
      var confirmed =
        parseInt($inp.attr("data-confirmed"), 10) ||
        parseInt($inp.data("confirmed"), 10) ||
        0;

      totalTarget += target;
      totalArrived += arrived;
      totalConfirmed += confirmed;

      var remaining = target - arrived;
      var compPctVal = target > 0 ? (arrived / target) * 100 : 0;
      var compPctStr = compPctVal.toFixed(1) + "%";

      var confCompPctVal = target > 0 ? (confirmed / target) * 100 : 0;
      var confCompPctStr = confCompPctVal.toFixed(1) + "%";

      $("#rsrRemain_" + colKey).text(remaining);
      $("#rsrComp_" + colKey).text(compPctStr);
      $("#rsrConfComp_" + colKey).text(confCompPctStr);
    });

    $("#rsrSingleTargetTotal").text(totalTarget);

    var totalRemaining = totalTarget - totalArrived;
    var totalCompPct =
      totalTarget > 0
        ? ((totalArrived / totalTarget) * 100).toFixed(1) + "%"
        : "0.0%";
    var totalConfCompPct =
      totalTarget > 0
        ? ((totalConfirmed / totalTarget) * 100).toFixed(1) + "%"
        : "0.0%";

    $("#rsrSingleRemainTotal").text(totalRemaining);
    $("#rsrSingleCompTotal").text(totalCompPct);
    $("#rsrSingleConfCompTotal").text(totalConfCompPct);
  }

  /* ──────────────────────────────────────────────────────────────
     8. EXPORT
     ────────────────────────────────────────────────────────────── */
  function rsrExportExcel() {
    var $table = $("#rsrGroups table");
    if (!$table.length) {
      if (typeof Swal !== 'undefined') {
        Swal.fire('Warning', 'No data to export.', 'warning');
      } else {
        alert("No data to export.");
      }
      return;
    }

    var $clone = $table.clone();

    // Replace inputs with their current values
    var inputValues = [];
    $table.find("input").each(function () {
      inputValues.push($(this).val());
    });

    $clone.find("input").each(function (index) {
      $(this).replaceWith("<span>" + inputValues[index] + "</span>");
    });

    // Replace select dropdowns with clean styled status badges
    var selectValues = [];
    $table.find("select").each(function () {
      var val = $(this).val() || $(this).find('option:selected').text() || '';
      selectValues.push(val);
    });

    $clone.find("select").each(function (index) {
      var val = selectValues[index] || '';
      var chipClass = window.rsrGetChipClass ? window.rsrGetChipClass(val) : "rsr-rpt-chip";
      $(this).replaceWith('<span class="' + chipClass + '">' + val + '</span>');
    });

    // Move inline styles from tr to td so Excel doesn't extend background to infinity
    $clone.find("tr").each(function () {
      var $tr = $(this);
      var trStyle = $tr.attr("style");
      if (trStyle) {
        $tr.children("td, th").each(function () {
          var currentStyle = $(this).attr("style") || "";
          $(this).attr("style", trStyle + ";" + currentStyle);
        });
        $tr.removeAttr("style");
      }
    });

    var html = $clone[0].outerHTML;

    // Replace CSS variables with Hex values so Excel can interpret them
    html = html
      .replace(/var\(--rsr-sand\)/g, "#F5F3EE")
      .replace(/var\(--rsr-ink\)/g, "#1A1917")
      .replace(/var\(--rsr-ink2\)/g, "#4A4845")
      .replace(/var\(--rsr-ink3\)/g, "#888780")
      .replace(/var\(--rsr-gold\)/g, "#BA7517")
      .replace(/var\(--rsr-gold-bg\)/g, "#FAEEDA")
      .replace(/var\(--rsr-gold-lt\)/g, "#FAC775")
      .replace(/var\(--rsr-teal\)/g, "#0F6E56")
      .replace(/var\(--rsr-teal-bg\)/g, "#E1F5EE")
      .replace(/var\(--rsr-teal-lt\)/g, "#9FE1CB")
      .replace(/var\(--rsr-red\)/g, "#A32D2D")
      .replace(/var\(--rsr-red-bg\)/g, "#FCEBEB")
      .replace(/var\(--rsr-blue\)/g, "#185FA5")
      .replace(/var\(--rsr-blue-bg\)/g, "#E6F1FB")
      .replace(/var\(--rsr-purple\)/g, "#534AB7")
      .replace(/var\(--rsr-purple-bg\)/g, "#EEEDFE")
      .replace(/var\(--rsr-green\)/g, "#3B6D11")
      .replace(/var\(--rsr-green-bg\)/g, "#EAF3DE")
      .replace(/var\(--rsr-coral\)/g, "#993C1D")
      .replace(/var\(--rsr-coral-bg\)/g, "#FAECE7")
      .replace(/var\(--rsr-border\)/g, "#E3E3E3")
      .replace(/var\(--rsr-border2\)/g, "#C9C9C9");

    var style = `<style>
      body, table, td, th { font-family: "Segoe UI", Arial, sans-serif; font-size: 11pt; }
      table { border-collapse: collapse; width: 100%; }
      th { background-color: #595959 !important; color: #FFFFFF !important; border: 1px solid #7F7F7F; padding: 8px 12px; text-align: center; font-weight: bold; font-size: 10pt; }
      td { border: 1px solid #D9D9D9; color: #000000; padding: 6px 10px; vertical-align: middle; }
      td:first-child { text-align: left; font-weight: bold; }
      .rsr-rpt-hdr { background-color: #D9D9D9 !important; color: #000000 !important; font-weight: bold; text-transform: uppercase; text-align: left !important; }
      .rsr-rpt-chip { display: inline-block; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; }
      .rsr-rpt-chip-green { background-color: #EAF3DE; color: #3B6D11; }
      .rsr-rpt-chip-teal { background-color: #E1F5EE; color: #0F6E56; }
      .rsr-rpt-chip-gold { background-color: #FAEEDA; color: #BA7517; }
      .rsr-rpt-chip-red { background-color: #FCEBEB; color: #A32D2D; }
      .rsr-rpt-chip-gray { background-color: #F1EFE8; color: #888780; }
      a { color: #000000; text-decoration: none; font-weight: bold; }
    </style>`;

    var fullHtml =
      '<html><head><meta charset="utf-8">' +
      style +
      "</head><body>" +
      html +
      "</body></html>";

    var blob = new Blob(["\ufeff", fullHtml], {
      type: "application/vnd.ms-excel",
    });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "RSR_Report_" + new Date().toISOString().slice(0, 10) + ".xls";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /* ──────────────────────────────────────────────────────────────
     8.5 UPDATE PROJECT STATUS
     ────────────────────────────────────────────────────────────── */
  window.rsrUpdateProjectStatus = async function (selectEl, encodedItemStr) {
    if (selectEl) selectEl.blur();
    try {
      var item = JSON.parse(decodeURIComponent(encodedItemStr));
      var newStatus = selectEl.value;
      var oldStatus = item.ProjectStatus || item.Status || (item.MainProjectIsActive ? "Active" : "Inactive");

      if (typeof Swal !== 'undefined') {
        var result = await Swal.fire({
          title: 'Confirm Update',
          text: 'Are you sure you want to update the Project Status to "' + newStatus + '"?',
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: '#0F6E56',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Yes, update it!'
        });

        if (!result.isConfirmed) {
          selectEl.value = oldStatus;
          if (window.rsrGetChipClass) {
            selectEl.className = window.rsrGetChipClass(oldStatus);
          }
          return;
        }
      } else {
        if (!confirm('Are you sure you want to update the Project Status to "' + newStatus + '"?')) {
          selectEl.value = oldStatus;
          if (window.rsrGetChipClass) {
            selectEl.className = window.rsrGetChipClass(oldStatus);
          }
          return;
        }
      }

      var entityData = {
        ProjectStatus: newStatus,
        RecId: item.SubProjectRecId || item.RecId || 0,
        EntityId: item.EntityId || "63680ea038694357a38df574177e01cd",
      };

      var token = getAuthToken();
      var companyId = "LGE0000001";
      var url =
        "https://portal.mawarid.com.sa/apps4x-api/api/v1/data/" +
        companyId +
        "/update";

      var formData = new FormData();
      formData.append("EntityData", JSON.stringify(entityData));

      var originalColor = selectEl.style.color;
      selectEl.disabled = true;
      selectEl.style.color = "gray";

      var response = await fetch(url, {
        method: "PUT",
        headers: {
          authorization: token,
          companyid: companyId,
          appid: "bf053c91ba5c42b48c9f96d0a8450e79",
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Update failed with status " + response.status);
      }

      if (typeof Swal !== 'undefined') {
        Swal.fire('Success', 'ProjectStatus updated successfully to ' + newStatus, 'success');
      } else {
        console.log("ProjectStatus updated successfully to", newStatus);
      }
    } catch (e) {
      console.error(e);
      if (typeof Swal !== 'undefined') {
        Swal.fire('Error', 'Error updating ProjectStatus: ' + e.message, 'error');
      } else {
        alert("Error updating ProjectStatus: " + e.message);
      }
    } finally {
      if (selectEl) {
        selectEl.disabled = false;
        selectEl.style.color = originalColor;
      }
    }
  };

  /* ──────────────────────────────────────────────────────────────
     8.8 READ-ONLY AGENT DETAIL MODAL & POPUP LOGIC
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
        AgentNumber: "AG00867",
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
        AgentNumber: "AG00412",
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
    html += '<table style="min-width:650px"><thead><tr>'
      + '<th style="min-width:240px">Agent / Candidate Status Metric</th>'
      + '<th style="text-align:center;width:75px">Total</th>';

    filteredAgents.forEach(function (item) {
      var agName = item.AgentName || item.AgentId || 'Agent';
      var agDisplay = '<span style="font-weight:600;color:#ffffff;line-height:1.3;display:inline-block;">' + agName + '</span>';
      html += '<th style="text-align:center;min-width:130px;vertical-align:middle;">' + agDisplay + '</th>';
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
    filteredAgents.forEach(function (item, idx) {
      var rawRec = item.RecruitingID || '-';
      if (rawRec && rawRec !== '-') {
        recIds[idx] = '<span class="rsr-rpt-ellipsis" title="' + String(rawRec).replace(/"/g, '&quot;') + '">' + rawRec + '</span>';
      } else {
        recIds[idx] = '-';
      }
    });
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

    // 6. Target (this month) — EDITABLE INPUT FIELD PER AGENT
    html += '<tr style="background:#FFFF00;border-top:1px solid #C9C9C9">'
      + '<td style="color:#000000;font-weight:700">Target (this month)</td>'
      + '<td style="text-align:center;font-weight:700;color:#000000" id="rsrModalTargetTotal">0</td>';

    filteredAgents.forEach(function (item, idx) {
      var colKey = "modal_agent_" + idx;
      var defaultTarget = modalTargetInputsState[colKey] !== undefined ? modalTargetInputsState[colKey] : (item.TargetQuantity !== undefined ? item.TargetQuantity : 0);
      var arrived = (item.Count_Arrived || 0) + (item.Count_Employed || 0);

      html += '<td style="text-align:center"><input class="rsr-rpt-input rsr-modal-input" id="rsrModalTarget_' + colKey + '" data-colindex="' + idx + '" data-arrived="' + arrived + '" value="' + defaultTarget + '" oninput="window.rsrRecalcModalAgentTable()" onchange="window.rsrRecalcModalAgentTable()" onkeyup="window.rsrRecalcModalAgentTable()"></td>';
    });
    html += '</tr>';

    // 7. Remaining (This Month)
    html += '<tr style="background:#FFF2CC;border-bottom:1px solid #C9C9C9">'
      + '<td style="font-weight:600;color:#000000">Remaining (This Month)</td>'
      + '<td style="text-align:center;font-weight:700;color:#000000" id="rsrModalRemainTotal">0</td>';
    filteredAgents.forEach(function (item, idx) {
      html += '<td style="text-align:center;font-weight:600;color:#000000" id="rsrModalRemain_' + idx + '">0</td>';
    });
    html += '</tr>';

    // 8. Total Applications (Read-Only)
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
    html += '<tr><td colspan="' + (filteredAgents.length + 2) + '" class="rsr-rpt-hdr"><span style="position:sticky;left:14px;display:inline-block">Read-Only Candidate Status Breakdown per Agent</span></td></tr>';

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
      addModalRow(sr.label, rowVals, sr.opts || {});
    });

    // ARRIVED Overall = Count_Arrived + Count_Employed (Dark Forest Green #375623)
    var arrivedVals = {};
    var totalArrived = 0;
    filteredAgents.forEach(function (item, idx) {
      var a = (item.Count_Arrived || 0) + (item.Count_Employed || 0);
      arrivedVals[idx] = a;
      totalArrived += a;
    });
    arrivedVals.total = totalArrived;
    addModalRow('Q) ARRIVED & EMPLOYED (Overall)', arrivedVals, { bg: '#375623', labelColor: '#FFFFFF', valueColor: '#FFFFFF', bold: true });

    // Completion (This Month) % (Light Pale Green #E2EFDA)
    html += '<tr style="background:#E2EFDA;border-top:1.5px solid #70AD47">'
      + '<td style="font-weight:700;color:#000000">Completion (This Month) %</td>'
      + '<td style="text-align:center;font-weight:700;color:#000000" id="rsrModalCompTotal">0.0%</td>';
    filteredAgents.forEach(function (item, idx) {
      html += '<td style="text-align:center;font-weight:700;color:#000000" id="rsrModalComp_' + idx + '">0.0%</td>';
    });
    html += '</tr>';

    html += '</tbody></table></div>';
    $container.html(html);

    // Initial calculation for modal agent inputs
    rsrRecalcModalAgentTable();
  }

  function rsrRecalcModalAgentTable() {
    var totalTarget = 0;
    var totalArrived = 0;

    $(".rsr-modal-input").each(function () {
      var colIdx = $(this).data("colindex");
      var targetVal = parseFloat($(this).val()) || 0;
      var arrivedVal = parseFloat($(this).data("arrived")) || 0;

      modalTargetInputsState["modal_agent_" + colIdx] = targetVal;

      var remain = targetVal - arrivedVal;
      var compPct = targetVal > 0 ? ((arrivedVal / targetVal) * 100).toFixed(1) + "%" : "0.0%";

      $("#rsrModalRemain_" + colIdx).text(remain);
      $("#rsrModalComp_" + colIdx).text(compPct);

      totalTarget += targetVal;
      totalArrived += arrivedVal;
    });

    $("#rsrModalTargetTotal").text(totalTarget);
    var totalRemaining = totalTarget - totalArrived;
    var totalCompPct = totalTarget > 0 ? ((totalArrived / totalTarget) * 100).toFixed(1) + "%" : "0.0%";
    $("#rsrModalRemainTotal").text(totalRemaining);
    $("#rsrModalCompTotal").text(totalCompPct);
  }

  function rsrExportAgentDetailExcel() {
    var $table = $("#rsrModalAgentTableWrap table");
    if (!$table.length) {
      if (typeof Swal !== 'undefined') {
        Swal.fire('Warning', 'No agent detail data available to export.', 'warning');
      } else {
        alert("No agent detail data available to export.");
      }
      return;
    }

    var $clone = $table.clone();

    // Move inline styles from tr to td
    $clone.find("tr").each(function () {
      var $tr = $(this);
      var trStyle = $tr.attr("style");
      if (trStyle) {
        $tr.children("td, th").each(function () {
          var currentStyle = $(this).attr("style") || "";
          $(this).attr("style", trStyle + ";" + currentStyle);
        });
        $tr.removeAttr("style");
      }
    });

    var html = $clone[0].outerHTML;

    // Replace CSS variables with Hex values
    html = html
      .replace(/var\(--rsr-sand\)/g, "#F5F3EE")
      .replace(/var\(--rsr-ink\)/g, "#1A1917")
      .replace(/var\(--rsr-ink2\)/g, "#4A4845")
      .replace(/var\(--rsr-ink3\)/g, "#888780")
      .replace(/var\(--rsr-gold\)/g, "#BA7517")
      .replace(/var\(--rsr-gold-bg\)/g, "#FAEEDA")
      .replace(/var\(--rsr-teal\)/g, "#0F6E56")
      .replace(/var\(--rsr-teal-bg\)/g, "#E1F5EE")
      .replace(/var\(--rsr-red\)/g, "#A32D2D")
      .replace(/var\(--rsr-red-bg\)/g, "#FCEBEB")
      .replace(/var\(--rsr-blue\)/g, "#185FA5")
      .replace(/var\(--rsr-border\)/g, "#E3E3E3");

    var modalTitle = $("#rsrModalTitle").text() || ("Agent Breakdown Details — " + (rsrModalCurrentMpCode || "Report"));
    var modalSubTitle = $("#rsrModalSubtitle").text() || "";

    var style = `<style>
      body, table, td, th { font-family: "Segoe UI", Arial, sans-serif; font-size: 11pt; }
      table { border-collapse: collapse; width: 100%; }
      th { background-color: #595959 !important; color: #FFFFFF !important; border: 1px solid #7F7F7F; padding: 8px 12px; text-align: center; font-weight: bold; font-size: 10pt; }
      td { border: 1px solid #D9D9D9; padding: 6px 10px; vertical-align: middle; text-align: center; color: #000000; }
      td:first-child { text-align: left; font-weight: bold; }
      .rsr-rpt-hdr { background-color: #D9D9D9 !important; color: #000000 !important; font-weight: bold; text-transform: uppercase; text-align: left !important; }
      .rsr-rpt-chip { display: inline-block; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; }
      .rsr-rpt-chip-green { background-color: #EAF3DE; color: #3B6D11; }
      .rsr-rpt-chip-teal { background-color: #E1F5EE; color: #0F6E56; }
      .rsr-rpt-chip-gold { background-color: #FAEEDA; color: #BA7517; }
      .rsr-rpt-chip-red { background-color: #FCEBEB; color: #A32D2D; }
      .rsr-rpt-chip-gray { background-color: #F1EFE8; color: #888780; }
    </style>`;

    var fullHtml =
      '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">' +
      '<head><meta charset="utf-8">' +
      '<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>' +
      '<x:Name>Agent Breakdown Details</x:Name>' +
      '<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>' +
      '</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->' +
      style +
      "</head><body>" +
      '<h2 style="color:#1A1917;font-family:\'Segoe UI\',Arial,sans-serif;margin-bottom:4px">' + modalTitle + '</h2>' +
      '<p style="color:#4A4845;font-family:\'Segoe UI\',Arial,sans-serif;font-size:10pt;margin-top:0;margin-bottom:4px">' + modalSubTitle + '</p>' +
      '<p style="color:#888780;font-family:\'Segoe UI\',Arial,sans-serif;font-size:9pt;margin-top:0">Exported on: ' + new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString() + '</p><br>' +
      html +
      "</body></html>";

    var blob = new Blob(["\ufeff", fullHtml], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "Agent_Breakdown_Details_" + (rsrModalCurrentMpCode || 'Report').replace(/\s+/g, '_') + "_" + new Date().toISOString().slice(0, 10) + ".xls";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
  window.rsrExportExcel = rsrExportExcel;

  // Modal Exports
  window.openAgentDetailModal = openAgentDetailModal;
  window.closeAgentDetailModal = closeAgentDetailModal;
  window.rsrRenderModalAgentPanel = rsrRenderModalAgentPanel;
  window.rsrToggleModalAgent = rsrToggleModalAgent;
  window.rsrUpdateModalChips = rsrUpdateModalChips;
  window.rsrClearModalFilters = rsrClearModalFilters;
  window.rsrRenderModalTable = rsrRenderModalTable;
  window.rsrRecalcModalAgentTable = rsrRecalcModalAgentTable;
  window.rsrExportAgentDetailExcel = rsrExportAgentDetailExcel;
  
  window.rsrGetChipClass = function(statusStr) {
    statusStr = statusStr || "";
    var lower = statusStr.toLowerCase();
    if (
      lower === "active" ||
      lower === "in progress" ||
      lower === "open"
    ) {
      return "rsr-rpt-chip rsr-rpt-chip-green";
    } else if (lower === "hold" || lower === "pending") {
      return "rsr-rpt-chip rsr-rpt-chip-gold";
    } else if (lower === "completed" || lower === "finished") {
      return "rsr-rpt-chip rsr-rpt-chip-teal";
    } else {
      return "rsr-rpt-chip rsr-rpt-chip-gray";
    }
  };
  
  // rsrUpdateProjectStatus is already attached to window in its definition

  $(function () {
    rsrInit();
  });
})(window.jQuery || jQuery);
