var _this = this;

(function ($) {

  /* ──────────────────────────────────────────────────────────────
     1. DOM CACHE
     ────────────────────────────────────────────────────────────── */
  var $w = $('.rsr-report-container');
  var $table = $w.find('#rsrTable');

  // Fallback if .rsr-report-container isn't wrapping it properly
  if ($table.length === 0) {
    $table = $('#rsrTable');
  }

  /* ──────────────────────────────────────────────────────────────
     2. HELPERS
     ────────────────────────────────────────────────────────────── */
  function formatDate(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return `${date.getDate().toString().padStart(2, "0")}-${months[date.getMonth()]}-${date.getFullYear().toString().substr(-2)}`;
  }

  /* ──────────────────────────────────────────────────────────────
     3. RENDER DATA TO DOM
     ────────────────────────────────────────────────────────────── */
  function renderRSRTable(data) {
    if (!$table.length) {
      // Refresh cache in case it was added later
      $table = $('#rsrTable');
      if (!$table.length) {
        console.error("Table element with ID 'rsrTable' not found in DOM.");
        return;
      }
    }

    if (!data || data.length === 0) return;

    // Define the row structure exactly like the image
    const rows = [
      { label: "Reference No", key: "RecruitingID", type: "string" },
      { label: "Nationality", key: "Nationality", type: "string" },
      { label: "Profession", key: "Profession", type: "string" },
      { label: "Owner", key: "Owner", type: "string" },
      { label: "Hiring Date", key: "HiringDate", type: "date" },
      { label: "Authorization Date", key: "AuthorizationDate", type: "date" },
      { label: "Quantity", key: "Quantity", type: "number", isSum: true },
      {
        label: "Remaining (1st This Month)",
        key: "Remaining",
        type: "number",
        isSum: true,
      },
      {
        label: "Target (This Month)",
        key: "Target",
        type: "number",
        isSum: true,
        defaultEmpty: true,
      }, // Placeholder as per image
      { label: "Status", key: "ProjectStatus", type: "status" },
      {
        label: "A) Backed Out",
        key: "BackedOut",
        type: "number",
        isSum: true,
        color: "red",
      },
      { label: "C) Not Started", key: "NotStarted", type: "number", isSum: true },
      {
        label: "D) UNDER MEDICAL",
        key: "UnderMedical",
        type: "number",
        isSum: true,
      },
      {
        label: "E) MEDICAL DONE WAITING FITNESS",
        key: "MedicalDoneWaitingFitness",
        type: "number",
        isSum: true,
      },
      { label: "F) MEDICAL FIT", key: "MedicalFit", type: "number", isSum: true },
      {
        label: "G) MEDICALLY UNFIT",
        key: "MedicallyUnfit",
        type: "number",
        isSum: true,
        color: "red",
      },
      {
        label: "H) UNDER MEDICAL TREATMENT",
        key: "UnderMedicalTreatment",
        type: "number",
        isSum: true,
      },
      { label: "J) SVP/ QVP", key: "DropOut", type: "number", isSum: true }, // Mapping dropout to J based on image context
      { label: "I) UNDER VFS", key: "UnderVFS", type: "number", isSum: true },
      {
        label: "M) UNDER STAMPING",
        key: "UnderStamping",
        type: "number",
        isSum: true,
      },
      {
        label: "N) VISA STAMPED",
        key: "VisaStamped",
        type: "number",
        isSum: true,
      },
      {
        label: "P) TICKET CONFIRMED",
        key: "TicketConfirmed",
        type: "number",
        isSum: true,
      },
      {
        label: "ARRIVED (This Month)",
        key: "Arrival",
        type: "number",
        isSum: true,
        bg: "lightgreen",
      },
      {
        label: "Remaining (This Month)",
        key: "RemainingThisMonth",
        type: "calc_remaining",
        isSum: true,
        defaultEmpty: true,
      },
      {
        label: "Completion (This Month) %",
        key: "CompletionThisMonth",
        type: "calc_completion",
        defaultEmpty: true,
      },
      {
        label: "Confirmed Completion (This Month)",
        key: "ConfirmedCompletion",
        type: "number",
        isSum: true,
        bg: "green",
      },
      {
        label: "Confirmed Completion (This Month) %",
        key: "ConfirmedCompletionPercentage",
        type: "percentage",
      },
      {
        label: "Q) ARRIVED (Overall)",
        key: "ArrivedOverall",
        type: "number",
        isSum: true,
        bg: "darkgreen",
      },
      {
        label: "Remaining (Overall)",
        key: "RemainingOverall",
        type: "number",
        isSum: true,
      },
      {
        label: "Completion (Overall) %",
        key: "CompletionPercentage",
        type: "percentage",
      },
    ];

    let html = `<thead>
          <tr class="header-row">
              <th class="subject-header">Subject (Jun-2026)</th>
              <th class="total-header">Total</th>
              ${data.map((d) => `<th>${d.ProjectName || ""}</th>`).join("")}
          </tr>
      </thead><tbody>`;

    rows.forEach((rowDef) => {
      let totalVal = 0;
      let cellsHtml = "";

      data.forEach((d) => {
        let val = d[rowDef.key];
        if (rowDef.defaultEmpty) {
          val = 0; // Use 0 as default for placeholders
        }

        let displayVal = val === null || val === undefined ? "" : val;
        let cellStyle = "";

        if (rowDef.type === "number") {
          if (typeof val === "number") {
            totalVal += val;
          }
        } else if (rowDef.type === "date") {
          displayVal = formatDate(val);
        } else if (rowDef.type === "status") {
          if (val === "Started" || val === "Scheduled") {
            cellStyle = "background-color: #FFC000; font-weight: bold;"; // Yellow for In Progress
            displayVal = "In Progress";
          } else if (val === "Finished" || val === "Completed") {
            cellStyle = "background-color: #92D050; font-weight: bold;"; // Green for completed
          } else if (val === "Canceled") {
            cellStyle = "background-color: #ffcccc; font-weight: bold;";
          }
        } else if (rowDef.type === "percentage") {
          // API returns percentage values directly (e.g. 0.50 means 0.50%)
          if (typeof val === "number") {
            displayVal = val.toFixed(2) + "%";
          } else if (val !== null && val !== undefined && val !== "") {
            displayVal = parseFloat(val).toFixed(2) + "%";
          } else {
            displayVal = "0.00%";
          }
        } else if (rowDef.type.startsWith("calc")) {
          // Formatting for calculated percentage fields
          if (rowDef.type.includes("completion")) {
            displayVal = "0%";
          } else {
            displayVal = "0";
          }
        }

        if (rowDef.color === "red") {
          cellStyle += " color: red; font-weight: bold;";
        }
        if (rowDef.bg === "lightgreen") {
          cellStyle += " background-color: #c4d79b; font-weight: bold;";
        }
        if (rowDef.bg === "green") {
          cellStyle += " background-color: #92d050; font-weight: bold;";
        }
        if (rowDef.bg === "darkgreen") {
          cellStyle +=
            " background-color: #4f6228; color: white; font-weight: bold;";
        }

        // Zero values should often be shown as 0 if they are numbers
        if (
          rowDef.type === "number" &&
          (displayVal === "" || displayVal === null)
        ) {
          displayVal = "0";
        }

        cellsHtml += `<td style="${cellStyle}">${displayVal}</td>`;
      });

      let totalDisplay = "";
      if (rowDef.isSum) {
        totalDisplay = totalVal;
      } else if (rowDef.key === "RecruitingID") {
        // "15" in image, data length here
        totalDisplay = data.length;
      } else if (
        rowDef.type.startsWith("calc") &&
        rowDef.type.includes("completion")
      ) {
        totalDisplay = "0%";
      }

      let subjectStyle = "";
      if (rowDef.color === "red") {
        subjectStyle = "color: red; font-weight: bold;";
      }

      let totalStyle = "font-weight: bold;";
      if (rowDef.bg === "lightgreen") {
        totalStyle += " background-color: #c4d79b;";
      }
      if (rowDef.bg === "green") {
        totalStyle += " background-color: #92d050;";
      }
      if (rowDef.bg === "darkgreen") {
        totalStyle += " background-color: #4f6228; color: white;";
      }

      html += `<tr>
              <td class="subject-cell" style="${subjectStyle}">${rowDef.label}</td>
              <td class="total-cell" style="${totalStyle}">${totalDisplay}</td>
              ${cellsHtml}
          </tr>`;
    });

    html += `</tbody>`;
    $table.html(html);
  }

  /* ──────────────────────────────────────────────────────────────
     4. API CONFIG
     ────────────────────────────────────────────────────────────── */
  var API_BASE = 'https://portal.mawarid.com.sa/apps4x-api/api/v1/LGE0000001/connector/CON0000001/sql/sysobjectexecute';
  var API_PARAMS = 'object_Type=p&objectName=usp_GetRecruitmentProjectSummary';

  function getAuthToken() {
    // Try to get token from the portal context
    if (_this && _this.globalService && _this.globalService.SysParameter && _this.globalService.SysParameter.Token) {
      return _this.globalService.SysParameter.Token;
    }
    // Fallback: try localStorage (portal stores token here)
    var storedToken = localStorage.getItem('eyjJwhtbtGockieOniJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzA0L3htbGRzaWctbW9yZSNobWFjLXNoYTI1NiIsInR5cCI6IkpXVCJ9');
    if (storedToken) return storedToken;
    return '';
  }

  /* ──────────────────────────────────────────────────────────────
     5. LOAD DATA
     ────────────────────────────────────────────────────────────── */
  async function fetchRSRData() {
    var fromDate = $('#rsrFromDate').val();
    var toDate = $('#rsrToDate').val();

    if (!fromDate || !toDate) {
      if (!$table.length) $table = $('#rsrTable');
      $table.html('<tr><td colspan="30" style="text-align: center; padding: 20px; color: #666;">Please select From Date and To Date, then click Search.</td></tr>');
      return;
    }

    // Show loading state
    if (!$table.length) $table = $('#rsrTable');
    $table.html('<tr><td colspan="30" style="text-align: center; padding: 20px;">Loading data...</td></tr>');

    try {
      var url = API_BASE + '?' + API_PARAMS + '&FromDate=' + encodeURIComponent(fromDate) + '&ToDate=' + encodeURIComponent(toDate);
      var token = getAuthToken();

      var response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        }
      });

      if (!response.ok) {
        throw new Error('API returned status ' + response.status);
      }

      var result = await response.json();
      var data = result ? result : [];

      if (data.length === 0) {
        $table.html('<tr><td colspan="30" style="text-align: center; padding: 20px; color: #666;">No records found for the selected date range.</td></tr>');
        return;
      }

      renderRSRTable(data);
    } catch (error) {
      console.error("Failed to fetch RSR data:", error);
      if (!$table.length) $table = $('#rsrTable');
      if ($table.length) {
        $table.html('<tr><td colspan="30" style="color: red; text-align: center; padding: 20px;">Error loading data: ' + error.message + '</td></tr>');
      }
    }
  }

  /* ──────────────────────────────────────────────────────────────
     6. EXPORT TO EXCEL
     ────────────────────────────────────────────────────────────── */
  var EXPORT_URL = 'https://portal.mawarid.com.sa/apps4x-api/api/v1/rest/export';
  var EXPORT_API_URL = 'api/v1/LGE0000001/connector/CON0000001/sql/sysobjectexecute';

  // Column definitions matching the RSR response fields
  var EXPORT_COLUMNS = [
    { Field: "AgentId", Name: "Agent Id" },
    { Field: "RecruitingID", Name: "Recruiting ID" },
    { Field: "ProjectID", Name: "Project ID" },
    { Field: "ProjectName", Name: "Project Name" },
    { Field: "RecruitmentProjectDes", Name: "Description" },
    { Field: "ProjectStatus", Name: "Status" },
    { Field: "Owner", Name: "Owner" },
    { Field: "ProfessionID", Name: "Profession ID" },
    { Field: "Profession", Name: "Profession" },
    { Field: "NationalityID", Name: "Nationality ID" },
    { Field: "Nationality", Name: "Nationality" },
    { Field: "Gender", Name: "Gender" },
    { Field: "HiringDate", Name: "Hiring Date" },
    { Field: "AuthorizationDate", Name: "Authorization Date" },
    { Field: "Quantity", Name: "Quantity" },
    { Field: "Remaining", Name: "Remaining" },
    { Field: "BackedOut", Name: "Backed Out" },
    { Field: "NotStarted", Name: "Not Started" },
    { Field: "UnderMedical", Name: "Under Medical" },
    { Field: "MedicalDoneWaitingFitness", Name: "Medical Done Waiting Fitness" },
    { Field: "MedicalFit", Name: "Medical Fit" },
    { Field: "MedicallyUnfit", Name: "Medically Unfit" },
    { Field: "UnderMedicalTreatment", Name: "Under Medical Treatment" },
    { Field: "DropOut", Name: "Drop Out" },
    { Field: "UnderVFS", Name: "Under VFS" },
    { Field: "UnderStamping", Name: "Under Stamping" },
    { Field: "VisaStamped", Name: "Visa Stamped" },
    { Field: "TicketConfirmed", Name: "Ticket Confirmed" },
    { Field: "Arrival", Name: "Arrival" },
    { Field: "Employed", Name: "Employed" },
    { Field: "ArrivedOverall", Name: "Arrived Overall" },
    { Field: "RemainingOverall", Name: "Remaining Overall" },
    { Field: "ConfirmedCompletion", Name: "Confirmed Completion" },
    { Field: "CompletionPercentage", Name: "Completion %" },
    { Field: "ConfirmedCompletionPercentage", Name: "Confirmed Completion %" }
  ];

  async function exportToExcel() {
    var fromDate = $('#rsrFromDate').val();
    var toDate = $('#rsrToDate').val();
    var token = getAuthToken();

    if (!fromDate || !toDate) {
      alert('Please select From Date and To Date before exporting.');
      return;
    }

    // Build QueryString with filters
    var queryParams = [
      { Name: "object_Type", Value: "p" },
      { Name: "objectName", Value: "usp_GetRecruitmentProjectSummary" },
      { Name: "FromDate", Value: fromDate },
      { Name: "ToDate", Value: toDate }
    ];

    var headerParams = [
      { Name: "Authorization", Value: token },
      { Name: "companyid", Value: "LGE0000001" }
    ];

    var exportBody = {
      apiUrl: EXPORT_API_URL,
      columnDef: JSON.stringify(EXPORT_COLUMNS),
      filename: "RSR View Report Export",
      QueryString: JSON.stringify(queryParams),
      HeaderString: JSON.stringify(headerParams),
      BodyString: "",
      isTemplate: false,
      ResponsePath: "",
      Method: "GET"
    };

    // Show exporting state on button
    var $btn = $('#rsrExportBtn');
    var originalText = $btn.text();
    $btn.text('Exporting...').prop('disabled', true);

    try {
      var response = await fetch(EXPORT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token,
          'companyid': 'LGE0000001',
          'appid': 'bf053c91ba5c42b48c9f96d0a8450e79'
        },
        body: JSON.stringify(exportBody)
      });

      if (!response.ok) {
        throw new Error('Export API returned status ' + response.status);
      }

      // Response is a blob (Excel file)
      var blob = await response.blob();
      var downloadUrl = window.URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = downloadUrl;
      a.download = 'RSR_View_Report_Export.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Failed to export RSR data:", error);
      alert('Export failed: ' + error.message);
    } finally {
      $btn.text(originalText).prop('disabled', false);
    }
  }

  /* ──────────────────────────────────────────────────────────────
     7. BINDINGS & INIT
     ────────────────────────────────────────────────────────────── */
  function clearFilters() {
    $('#rsrFromDate').val('');
    $('#rsrToDate').val('');
    if (!$table.length) $table = $('#rsrTable');
    if ($table.length) {
      $table.html('<tr><td colspan="30" style="text-align: center; padding: 20px; color: #666;">Please select From Date and To Date, then click Search.</td></tr>');
    }
  }

  // Use event delegation so handlers work even if DOM is injected dynamically
  $(document).on('click', '#rsrSearchBtn', function () {
    fetchRSRData();
  });

  $(document).on('click', '#rsrExportBtn', function () {
    exportToExcel();
  });

  $(document).on('click', '#rsrClearBtn', function () {
    clearFilters();
  });

  // Expose globally as fallback for inline onclick
  window.rsrSearch = function () {
    fetchRSRData();
  };

  // window.rsrExport = function () {
  //   exportToExcel();
  // };

  window.rsrClear = function () {
    clearFilters();
  };

  // Show initial message
  $(function () {
    if (!$table.length) $table = $('#rsrTable');
    if ($table.length) {
      $table.html('<tr><td colspan="30" style="text-align: center; padding: 20px; color: #666;">Please select From Date and To Date, then click Search.</td></tr>');
    }
  });

})(window.jQuery || jQuery);
