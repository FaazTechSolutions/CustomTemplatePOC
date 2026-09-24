let dashboardData = null;
let currentDateFilter = 'today';
let customDateRange = { FromDate: '', ToDate: '' };

function getDateRangeForFilter(filter) {
    const now = new Date();
    const getStartOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const formatDate = (d) => {
        const yr = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        const da = String(d.getDate()).padStart(2, '0');
        return `${yr}-${mo}-${da}`;
    };

    let startDate, endDate;

    switch(filter) {
        case 'yesterday':
            startDate = getStartOfDay(now);
            startDate.setDate(startDate.getDate() - 1);
            endDate = new Date(startDate);
            break;
        case 'current-week':
            startDate = getStartOfDay(now);
            const day = startDate.getDay();
            const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
            startDate.setDate(diff);
            endDate = getStartOfDay(now);
            break;
        case 'current-month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = getStartOfDay(now);
            break;
        case 'prev-month':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0);
            break;
        case 'custom':
            return customDateRange;
        case 'today':
        default:
            startDate = getStartOfDay(now);
            endDate = getStartOfDay(now);
            break;
    }
    return { FromDate: formatDate(startDate), ToDate: formatDate(endDate) };
}
var LOCAL_STORAGE_TOKEN_KEY =
  "eyjJwhtbtGockieOniJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzA0L3htbGRzaWctbW9yZSNobWFjLXNoYTI1NiIsInR5cCI6IkpXVCJ9";

function getAuthToken() {
  var primaryToken = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
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
  return "";
}

async function initDashboardApp() {
  try {
    await loadDashboardData();
    setupEventListeners();
  } catch (error) {
    console.error("Failed to load dashboard data:", error);
    // Show error message on UI
    const tableBody = document.getElementById("tableBody");
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="12" style="text-align: center; padding: 2rem; color: var(--danger);">Failed to load data. Check console for errors.</td></tr>`;
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDashboardApp);
} else {
  // DOM is already ready, run immediately
  initDashboardApp();
}

async function loadDashboardData() {
  const dateRange = getDateRangeForFilter(currentDateFilter);
  const url =
    `https://portal.mawarid.com.sa/apps4x-api/api/v1/LGE0000001/connector/CON0000001/sql/sysobjectexecute?object_Type=p&objectName=sp_GetMailProcessingDailySummary&%24page=1&%24size=0&FromDate=${dateRange.FromDate}&ToDate=${dateRange.ToDate}`;

  // Note: Browser handles Cookie, Referer, User-Agent, and Sec-Ch-* headers automatically.
  // Adding them to fetch() in browser would result in a "Refused to set unsafe header" error.
  const headers = {
    accept: "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9",
    appid: "APP0000001",
    authorization: getAuthToken(),
    companyid: "LGE0000001",
    priority: "u=1, i",
  };

  const response = await fetch(url, {
    method: "GET",
    headers: headers,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();

  // Some APIs return the array directly, others wrap it in a 'data' property.
  // If the API matches our earlier sample exactly, it will be { success: true, date: '...', data: [...] }
  if (result && Array.isArray(result.data)) {
    dashboardData = result;
  } else if (Array.isArray(result)) {
    // Fallback if the SP just returns a flat array
    dashboardData = {
      date: new Date().toLocaleDateString(),
      totalUsers: result.length,
      data: result,
    };
  } else {
    // Wrap unknown structure safely
    dashboardData = {
      date: new Date().toLocaleDateString(),
      totalUsers: 0,
      data: [],
    };
    console.warn("Unexpected data structure received:", result);
  }

  initDashboard();
}

let autoRefreshInterval = null;

async function initDashboard() {
  if (!dashboardData || !dashboardData.data) return;

  // Set up auto-refresh every 60 seconds
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  autoRefreshInterval = setInterval(loadDashboardData, 60000);

  // The date is now handled by the Date Filter UI instead of a badge.


  // Calculate totals
  let totalReceived = 0;
  let totalNewTickets = 0;
  let totalReplies = 0;
  let totalDuplicates = 0;
  let totalProcessed = 0;
  let totalUnprocessed = 0;
  let totalErrors = 0;
  let highErrorUsers = [];

  dashboardData.data.forEach((item) => {
    // Ensure values are numbers
    const received = parseInt(item.totalEmailsReceived) || 0;
    const newTickets = parseInt(item.newTicketsCount) || 0;
    const replies = parseInt(item.replyCount) || 0;
    const duplicates = parseInt(item.duplicateCount) || 0;
    const processed = parseInt(item.processedCount) || 0;
    const unprocessed = parseInt(item.unprocessedCount) || 0;
    const errors = parseInt(item.errorCount) || 0;

    totalReceived += received;
    totalNewTickets += newTickets;
    totalReplies += replies;
    totalDuplicates += duplicates;
    totalProcessed += processed;
    totalUnprocessed += unprocessed;
    totalErrors += errors;

    if (errors > 0) {
      highErrorUsers.push(item);
    }
  });

  // Sort high error users by error count descending
  highErrorUsers.sort(
    (a, b) => (parseInt(b.errorCount) || 0) - (parseInt(a.errorCount) || 0),
  );

  // Update Summary Cards
  const totalUserCount = dashboardData.totalUsers || dashboardData.data.length;
  const statTotalUsersEl = document.getElementById("statTotalUsers");
  if (statTotalUsersEl) {
    statTotalUsersEl.textContent = totalUserCount;
  }

  // Update Subtitle dynamically
  const subtitleEl = document.getElementById("dashboardSubtitle");
  if (subtitleEl) {
    subtitleEl.innerHTML = `Real-time O365 Delta Sync & Customer Support Ticket Tracking for <span class="badge-mini" style="font-size:0.75rem;">${totalUserCount}</span> Users`;
  }
  document.getElementById("statTotalReceived").textContent = totalReceived;
  document.getElementById("statNewTickets").textContent = totalNewTickets;
  document.getElementById("statReplies").textContent = totalReplies;
  document.getElementById("statDuplicates").textContent = totalDuplicates;
  document.getElementById("statProcessed").textContent = totalProcessed;
  document.getElementById("statUnprocessed").textContent = totalUnprocessed;
  document.getElementById("statErrors").textContent = totalErrors;

  // Populate High Error List
  const errorListEl = document.getElementById("highErrorList");
  errorListEl.innerHTML = "";
  if (highErrorUsers.length === 0) {
    errorListEl.innerHTML =
      '<li class="error-list-item empty-state"><div class="empty-icon"><i class="fa fa-check-circle"></i></div><span class="text-success font-semibold">Awesome! No accounts with errors right now.</span></li>';
  } else {
    highErrorUsers.slice(0, 3).forEach((user) => {
      const errCount = parseInt(user.errorCount) || 0;
      const userId = user.userId || user.UserId || "Unknown User";

      // Extract initials or default avatar text
      const initial = userId.charAt(0).toUpperCase();
      const errorDetailsStr = encodeURIComponent(user.errorDetails || user.ErrorDetails || "");
      const lastSyncStatusStr = user.lastSyncStatus || user.LastSyncStatus || "UNKNOWN";

      const li = document.createElement("li");
      li.className = "error-list-item";
      li.style.cursor = "pointer";
      li.style.transition = "background-color 0.2s";
      li.onmouseover = () => li.style.backgroundColor = 'var(--bg-hover)';
      li.onmouseout = () => li.style.backgroundColor = '';
      
      li.innerHTML = `
                    <div class="user-info">
                        <div class="user-avatar">${initial}</div>
                        <span class="user-email">${userId}</span>
                    </div>
                    <span class="error-count-badge">
                        <i class="fa fa-circle-exclamation"></i> ${errCount} Errors
                    </span>
      `;
      
      li.onclick = function() {
          if (window.showUnifiedDetails) {
              window.showUnifiedDetails(userId, true, errorDetailsStr, errCount, lastSyncStatusStr);
          } else {
              console.error("showUnifiedDetails is not defined on window");
          }
      };
      
      errorListEl.appendChild(li);
    });
  }

  // Populate Table
  renderTable(dashboardData.data);
}

function renderTable(data) {
  const tableBody = document.getElementById("tableBody");
  tableBody.innerHTML = "";

  if (!data || data.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="12" style="text-align: center; padding: 1rem;">No records found.</td></tr>';
    return;
  }

  data.forEach((item) => {
    // Handle variations in casing from SQL SP vs JSON sample
    const userId = item.userId || item.UserId || "";
    const companyId = item.companyId || item.CompanyId || "";
    const received = item.totalEmailsReceived || item.TotalEmailsReceived || 0;
    const newTickets = item.newTicketsCount || item.NewTicketsCount || 0;
    const replies = item.replyCount || item.ReplyCount || 0;
    const duplicates = item.duplicateCount || item.DuplicateCount || 0;
    const processed = item.processedCount || item.ProcessedCount || 0;
    const unprocessed = item.unprocessedCount || item.UnprocessedCount || 0;
    const errorCount = item.errorCount || item.ErrorCount || 0;

    let successRate = item.successRate || item.SuccessRate;
    if (successRate === undefined) {
      if (received > 0) {
        successRate = ((processed / received) * 100).toFixed(1) + "%";
      } else {
        successRate = "0%";
      }
    } else {
      successRate = successRate + (String(successRate).includes("%") ? "" : "%");
    }

    const lastSyncTime = item.lastSyncTime || item.LastSyncTime;
    const syncDate = lastSyncTime
      ? new Date(lastSyncTime).toLocaleString()
      : "N/A";

    const lastSyncStatus =
      item.lastSyncStatus || item.LastSyncStatus || "UNKNOWN";
    const statusBadgeClass =
      lastSyncStatus.toUpperCase() === "SUCCESS"
        ? "status-success"
        : "status-error";
    const statusIcon =
      lastSyncStatus.toUpperCase() === "SUCCESS"
        ? "fa-circle-check"
        : "fa-circle-xmark";

    const errorDetails = item.errorDetails || item.ErrorDetails || "";
    const hasErrors = errorCount > 0 && errorDetails.trim() !== "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td><strong>${userId}</strong></td>
            <td class="text-center">${received}</td>
            <td class="text-center">${newTickets}</td>
            <td class="text-center">${replies}</td>
            <td class="text-center">${duplicates}</td>
            <td class="text-center">${processed}</td>
            <td class="text-center">${unprocessed}</td>
            <td class="text-center">
                ${
                  errorCount > 0
                    ? `<span class="error-count-inline">${errorCount}</span>`
                    : `<span class="text-muted">0</span>`
                }
            </td>
            <td class="text-center">${successRate}</td>
            <td>
                <span class="status-badge ${statusBadgeClass}">
                    <i class="fa ${statusIcon}"></i> ${lastSyncStatus}
                </span>
            </td>
            <td class="text-muted">${syncDate}</td>
            <td>
                    <button class="action-btn action-btn-view" title="View Details">
                        <i class="fa fa-expand"></i>
                    </button>
            </td>
        `;
    
    const viewBtn = tr.querySelector('.action-btn-view');
    if (viewBtn) {
        viewBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.showUnifiedDetails) {
                window.showUnifiedDetails(userId, hasErrors, encodeURIComponent(errorDetails), errorCount, lastSyncStatus);
            }
        });
    }
    
    tableBody.appendChild(tr);
  });
}

function setupEventListeners() {
  // Date Filter Dropdown
  const dateDropdown = document.getElementById("dateFilterDropdown");
  const dateBtn = document.getElementById("dateFilterBtn");
  const dateLabel = document.getElementById("dateFilterLabel");
  const dateItems = document.querySelectorAll(".date-filter-item");

  if (dateBtn) {
    dateBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dateDropdown.classList.toggle("open");
    });
  }

  // Handle High Error Card clicks using Event Delegation was removed from here.

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (dateDropdown && !dateDropdown.contains(e.target)) {
      dateDropdown.classList.remove("open");
    }
  });

  if (dateItems) {
    dateItems.forEach(item => {
      item.addEventListener("click", (e) => {
        // Update Active Class
        dateItems.forEach(el => el.classList.remove("active"));
        item.classList.add("active");
        
        // Update Label
        dateLabel.textContent = item.textContent;
        
        // Set new filter and reload
        currentDateFilter = item.getAttribute("data-filter");
        
        dateDropdown.classList.remove("open");

        dateLabel.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Loading...';
        loadDashboardData().then(() => {
          dateLabel.textContent = item.textContent;
        }).catch(() => {
          dateLabel.textContent = item.textContent;
        });
      });
    });
  }

  // Handle Custom Date Apply
  const applyCustomBtn = document.getElementById("applyCustomDateBtn");
  if (applyCustomBtn) {
    applyCustomBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const startDateInput = document.getElementById("customStartDate").value;
      const endDateInput = document.getElementById("customEndDate").value;
      
      if (!startDateInput || !endDateInput) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'warning', title: 'Missing Dates', text: 'Please select both start and end dates.' });
        } else {
            alert("Please select both start and end dates.");
        }
        return;
      }

      customDateRange.FromDate = startDateInput;
      customDateRange.ToDate = endDateInput;
      currentDateFilter = "custom";
      
      // Remove active class from predefined items
      dateItems.forEach(el => el.classList.remove("active"));
      
      // Update label to show range nicely (e.g. 08-01 to 08-31)
      const labelFormat = `${startDateInput.substring(5)} to ${endDateInput.substring(5)}`;
      
      dateDropdown.classList.remove("open");
      
      dateLabel.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Loading...';
      loadDashboardData().then(() => {
        dateLabel.textContent = labelFormat;
      }).catch(() => {
        dateLabel.textContent = labelFormat;
      });
    });
  }

  // Hook up refresh button
  const refreshBtn = document.getElementById("refreshDashboardBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      refreshBtn.innerHTML =
        '<i class="fa-solid fa-arrows-rotate fa-spin"></i> Refreshing';
      loadDashboardData().then(() => {
        setTimeout(() => {
          refreshBtn.innerHTML =
            '<i class="fa-solid fa-arrows-rotate"></i> Refresh';
        }, 500);
      });
    });
  }

  // Search handling
  document.getElementById("searchInput").addEventListener("input", (e) => {
    if (!dashboardData || !dashboardData.data) return;

    const searchTerm = e.target.value.toLowerCase();
    const filteredData = dashboardData.data.filter((item) => {
      const userId = item.userId || item.UserId || "";
      const companyId = item.companyId || item.CompanyId || "";

      return (
        userId.toLowerCase().includes(searchTerm) ||
        companyId.toLowerCase().includes(searchTerm)
      );
    });
    renderTable(filteredData);
  });

  // Export handling
  const exportBtn = document.getElementById("exportTableBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      exportToCSV();
    });
  }
}

function exportToCSV() {
    const table = document.querySelector('.data-table');
    if (!table) return;

    const headers = Array.from(table.querySelectorAll('thead th'))
        .map(th => th.innerText.trim())
        .filter(text => text !== 'Action');
    
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    
    if (rows.length === 0 || (rows.length === 1 && rows[0].innerText.includes('No records found'))) {
        if(typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'info', title: 'No Data', text: 'No records available to export.'});
        } else {
            alert("No data available to export.");
        }
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    // Add BOM for Excel UTF-8 compatibility
    csvContent = "data:text/csv;charset=utf-8,\uFEFF"; 
    csvContent += headers.map(h => `"${h}"`).join(",") + "\r\n";
    
    rows.forEach(row => {
        const cols = Array.from(row.querySelectorAll('td'));
        if (cols.length > 1) { 
            const rowData = cols.slice(0, cols.length - 1).map(col => {
                let text = col.innerText.replace(/(\r\n|\n|\r)/gm, " ").trim();
                return `"${text.replace(/"/g, '""')}"`;
            });
            csvContent += rowData.join(",") + "\r\n";
        }
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `Mail_Processing_Logs_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Unified Details Modal Logic
window.showUnifiedDetails = async function (
  userId,
  hasErrors,
  encodedDetails,
  errorCount,
  lastSyncStatus,
) {
  const modal = document.getElementById("unifiedDetailsModal");
  const titleUser = document.getElementById("unifiedModalUserId");
  const tableContainer = document.getElementById("unifiedModalTableContainer");
  const errorSection = document.getElementById("unifiedErrorSection");
  const errorText = document.getElementById("unifiedModalErrorText");
  const errorBadge = document.getElementById("unifiedErrorCount");

  titleUser.textContent = userId || "Unknown User";

  // Safely decode error details
  let decodedText = "";
  try {
      decodedText = decodeURIComponent(encodedDetails);
  } catch(e) {
      console.warn("Failed to decode error details:", e);
      decodedText = encodedDetails; // fallback to raw
  }

  // Handle Error Section state
  if (hasErrors) {
    errorSection.style.display = "block";
    errorBadge.textContent = errorCount;
    errorText.textContent = decodedText;
  } else {
    errorSection.style.display = "none";
  }

  tableContainer.innerHTML =
    '<div style="text-align:center; padding: 3rem; color: var(--text-muted);"><i class="fa fa-spinner fa-spin fa-2x"></i><p style="margin-top:1rem;">Loading mail records...</p></div>';
  modal.classList.add("show");

  try {
    const url = `https://portal.mawarid.com.sa/apps4x-api/api/v1/LGE0000001/connector/CON0000001/sql/sysobjectexecute?object_Type=p&objectName=sp_GetUserDailyMails&%24page=1&%24size=0&UserId=${encodeURIComponent(userId)}`;

    const headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "en-US,en;q=0.9",
      appid: "APP0000001",
      authorization: getAuthToken(),
      companyid: "LGE0000001",
      priority: "u=1, i",
    };

    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    let result = await response.json();
    let dataList = [];

    if (result && Array.isArray(result.data)) {
      dataList = result.data;
    } else if (Array.isArray(result)) {
      dataList = result;
    }

    renderUserDetailsTable(dataList, tableContainer);
  } catch (error) {
    console.error("Error fetching user details:", error);
    tableContainer.innerHTML = `<div style="text-align:center; padding: 2rem; color: var(--danger);"><i class="fa fa-circle-exclamation fa-2x"></i><p style="margin-top:0.5rem;">Failed to load data. ${error.message}</p></div>`;
  }
};

window.closeUnifiedDetailsModal = function () {
  const modal = document.getElementById("unifiedDetailsModal");
  if (modal) {
    modal.classList.remove("show");
  }
};

function renderUserDetailsTable(dataList, container) {
  if (!dataList || dataList.length === 0) {
    container.innerHTML =
      '<div style="text-align:center; padding: 2rem; color: var(--text-muted);">No mail records found for this user today.</div>';
    return;
  }

  // Dynamically generate table based on first record keys
  let keys = Object.keys(dataList[0]);

  // Sort keys to prioritize important fields
  const priority = ["subject", "sender", "from", "date", "received", "ticket"];

  keys.sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();

    // 1. 'id' is always first
    const aIsId = aLower === "id";
    const bIsId = bLower === "id";
    if (aIsId && !bIsId) return -1;
    if (!aIsId && bIsId) return 1;

    // 2. 'status' and 'messageid' are always last
    const aIsLast =
      aLower.includes("status") ||
      aLower.includes("messageid") ||
      aLower.includes("guid");
    const bIsLast =
      bLower.includes("status") ||
      bLower.includes("messageid") ||
      bLower.includes("guid");
    if (aIsLast && !bIsLast) return 1;
    if (!aIsLast && bIsLast) return -1;

    // 3. Match against priority list for the rest
    let aPriority = priority.findIndex((p) => aLower.includes(p));
    let bPriority = priority.findIndex((p) => bLower.includes(p));

    if (aPriority === -1) aPriority = 99;
    if (bPriority === -1) bPriority = 99;

    if (aPriority !== bPriority) return aPriority - bPriority;

    return a.localeCompare(b);
  });

  let html =
    '<div class="table-responsive"><table class="data-table details-table"><thead><tr>';
  keys.forEach((k) => {
    html += `<th>${k}</th>`;
  });
  html += "</tr></thead><tbody>";

  dataList.forEach((row) => {
    html += "<tr>";
    keys.forEach((k) => {
      let val = row[k];
      if (val === null || val === undefined) val = "-";

      // Render basic status badges dynamically if a column seems to be a status
      if (k.toLowerCase().includes("status")) {
        let vLower = String(val).toLowerCase();
        let badgeClass = "status-badge bg-gray-200";
        if (vLower === "success" || vLower === "processed")
          badgeClass = "status-success";
        else if (
          vLower === "error" ||
          vLower === "failed" ||
          vLower === "unprocessed"
        )
          badgeClass = "status-error";

        html += `<td><span class="${badgeClass}">${val}</span></td>`;
      } else {
        // simple HTML escape to avoid XSS in dynamic keys
        const safeVal = String(val)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        html += `<td>${safeVal}</td>`;
      }
    });
    html += "</tr>";
  });
  html += "</tbody></table></div>";

  container.innerHTML = html;
}
// Initialization handled at the top of the file
