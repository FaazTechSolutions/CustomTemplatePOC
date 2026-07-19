// --- Dashboard Data ---
// In a real environment, you would fetch this from an API endpoint.
let _this = this;
let dashboardData = _this.currentPageData;

// Colors mapping matching the CSS variables
const statusColors = {
  New: "#00d2fc",
  InProgress: "#f5a623",
  Scheduled: "#8e44ad",
  ReOpen: "#e74c3c",
  Closed: "#2ecc71",
};

document.addEventListener("DOMContentLoaded", () => {
  initDashboard();
});

function initDashboard() {
  if (!dashboardData) return;

  // 1. Populate Metrics Cards
  if (dashboardData.AllTickets) {
    populateMetrics("all-tickets-metrics", dashboardData.AllTickets);
    const allBadge = document.getElementById("all-total-badge");
    if (allBadge) allBadge.textContent =
      dashboardData.AllTickets.TotalCount.toLocaleString() + " Tickets";
  }
  
  if (dashboardData.MyAssignedTicket) {
    populateMetrics("my-tickets-metrics", dashboardData.MyAssignedTicket);
    const myBadge = document.getElementById("my-total-badge");
    if (myBadge) myBadge.textContent =
      dashboardData.MyAssignedTicket.TotalCount.toLocaleString() + " Tickets";
  }

  // 2. Render Charts
  if (dashboardData.AllTicketsChart) {
    renderChart("allTicketsChart", dashboardData.AllTicketsChart);
  }
  if (dashboardData.MyAssignedTicketChart) {
    renderChart("myTicketsChart", dashboardData.MyAssignedTicketChart);
  }

  // 3. Populate Tables directly from the JSON
  if (dashboardData.RequestbyCoordinatorWithCustomer) {
    populateCoordCustTable(dashboardData.RequestbyCoordinatorWithCustomer);
  }
  
  if (dashboardData.RequestbyCoordinator) {
    populateCoordTable(dashboardData.RequestbyCoordinator);
    renderCoordinatorGroupChart(
      "coordGroupChart",
      dashboardData.RequestbyCoordinator,
    );
  }

  // 4. Initialize Search filtering
  initSearch("search-coord-cust", "coord-cust-table-body");
  initSearch("search-coord", "coord-table-body");
}

function populateMetrics(containerId, data) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  const keys = ["New", "InProgress", "Scheduled", "ReOpen", "Closed"];

  keys.forEach((key) => {
    const value = data[key];
    const card = document.createElement("div");
    card.className = `metric-item metric-${key.toLowerCase()}`;

    card.innerHTML = `
            <div class="metric-value">${value.toLocaleString()}</div>
            <div class="metric-label">${key}</div>
        `;
    container.appendChild(card);
  });
}

function renderChart(canvasId, chartData) {
  const ctx = document.getElementById(canvasId).getContext("2d");

  // Filter out TotalCount if it's there to keep chart focused on categories
  const filteredData = chartData.filter(
    (item) => item.labelKey !== "TotalCount",
  );

  const labels = filteredData.map((item) => item.labelKey);
  const dataPoints = filteredData.map((item) => item.YAxisKey);
  const bgColors = labels.map((label) => statusColors[label] || "#333");

  new Chart(ctx, {
    type: "pie",
    data: {
      labels: labels,
      datasets: [
        {
          data: dataPoints,
          backgroundColor: bgColors,
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right",
          labels: {
            usePointStyle: true,
            padding: 20,
            font: { family: "'Inter', sans-serif", size: 12 },
          },
        },
      },
    },
  });
}

function renderCoordinatorGroupChart(canvasId, data) {
  const ctx = document.getElementById(canvasId).getContext("2d");

  // Sort coordinators by total count descending and take top 10 for better readability
  const sortedData = [...data]
    .sort((a, b) => b.TotalCount - a.TotalCount)
    .slice(0, 10);

  const labels = sortedData.map((item) => item.Name);

  // Common dataset options for a premium look
  const datasetOptions = {
    borderWidth: 0,
    borderRadius: 4,
    barPercentage: 0.6,
    categoryPercentage: 0.8,
  };

  const datasets = [
    {
      label: "New",
      data: sortedData.map((item) => item.New),
      backgroundColor: statusColors["New"],
      ...datasetOptions,
    },
    {
      label: "In Progress",
      data: sortedData.map((item) => item.InProgress),
      backgroundColor: statusColors["InProgress"],
      ...datasetOptions,
    },
    {
      label: "Scheduled",
      data: sortedData.map((item) => item.Scheduled),
      backgroundColor: statusColors["Scheduled"],
      ...datasetOptions,
    },
    {
      label: "ReOpen",
      data: sortedData.map((item) => item.ReOpen),
      backgroundColor: statusColors["ReOpen"],
      ...datasetOptions,
    },
    {
      label: "Closed",
      data: sortedData.map((item) => item.Closed),
      backgroundColor: statusColors["Closed"],
      ...datasetOptions,
    },
  ];

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: datasets,
    },
    options: {
      indexAxis: "y", // Makes it a horizontal bar chart for better label reading
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        axis: "y",
        intersect: false,
      },
      plugins: {
        legend: {
          position: "top",
          labels: {
            usePointStyle: true,
            padding: 20,
            font: { family: "'Inter', sans-serif", size: 12, weight: 500 },
          },
        },
        tooltip: {
          backgroundColor: "rgba(30, 30, 45, 0.95)",
          titleFont: { family: "'Inter', sans-serif", size: 14, weight: 600 },
          bodyFont: { family: "'Inter', sans-serif", size: 13 },
          padding: 12,
          cornerRadius: 8,
          usePointStyle: true,
          boxPadding: 6,
        },
      },
      scales: {
        x: {
          stacked: true,
          grid: {
            color: "rgba(0, 0, 0, 0.04)",
            drawBorder: false,
          },
          ticks: {
            font: { family: "'Inter', sans-serif" },
          },
        },
        y: {
          stacked: true,
          grid: { display: false, drawBorder: false },
          ticks: {
            font: { family: "'Inter', sans-serif", weight: 500 },
            color: "#444",
          },
        },
      },
    },
  });
}

function populateCoordCustTable(requests) {
  const tbody = document.getElementById("coord-cust-table-body");
  tbody.innerHTML = "";

  // Sort by TotalCount descending
  const sorted = [...requests].sort((a, b) => b.TotalCount - a.TotalCount);

  sorted.forEach((req) => {
    const row = document.createElement("tr");

    // Use profile image if available, else initials
    let avatarHtml = "";
    if (req.Profile_Path) {
      const baseUrl = "https://portal.mawarid.com.sa/apps4x-api";
      const imgUrl = baseUrl + req.Profile_Path.replace(/\\\\/g, "/");
      avatarHtml = `<img src="${imgUrl}" alt="${req.Name}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid #eaedf1;">`;
    } else {
      const initials = (req.Name || "U N")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();
      avatarHtml = `<div class="coordinator-avatar">${initials}</div>`;
    }

    row.innerHTML = `
            <td>
                <div class="coordinator-name">
                    ${avatarHtml}
                    <div>
                        <div style="font-weight: 600; color: #333">${req.Name}</div>
                        <div style="font-size: 11px; color: #888">${req.UserID}</div>
                    </div>
                </div>
            </td>
            <td><span class="customer-code">${req.CustomerCode}</span></td>
            <td>${req.CustomerName || '<span style="color:#aaa;font-style:italic">N/A</span>'}</td>
            <td><span class="status-pill pill-new">${req.New}</span></td>
            <td><span class="status-pill pill-inprogress">${req.InProgress}</span></td>
            <td><span class="status-pill pill-scheduled">${req.Scheduled}</span></td>
            <td><span class="status-pill pill-reopen">${req.ReOpen}</span></td>
            <td><span class="status-pill pill-closed">${req.Closed}</span></td>
            <td style="font-weight: 700;">${req.TotalCount}</td>
        `;

    tbody.appendChild(row);
  });
}

function populateCoordTable(requests) {
  const tbody = document.getElementById("coord-table-body");
  tbody.innerHTML = "";

  // Sort by TotalCount descending
  const sorted = [...requests].sort((a, b) => b.TotalCount - a.TotalCount);

  sorted.forEach((req) => {
    const row = document.createElement("tr");

    // Use profile image if available, else initials
    let avatarHtml = "";
    if (req.Profile_Path) {
      const baseUrl = "https://portal.mawarid.com.sa/apps4x-api";
      const imgUrl = baseUrl + req.Profile_Path.replace(/\\\\/g, "/");
      avatarHtml = `<img src="${imgUrl}" alt="${req.Name}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid #eaedf1;">`;
    } else {
      const initials = (req.Name || "U N")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();
      avatarHtml = `<div class="coordinator-avatar">${initials}</div>`;
    }

    row.innerHTML = `
            <td>
                <div class="coordinator-name">
                    ${avatarHtml}
                    <div>
                        <div style="font-weight: 600; color: #333">${req.Name}</div>
                        <div style="font-size: 11px; color: #888">${req.UserID}</div>
                    </div>
                </div>
            </td>
            <td><span class="status-pill pill-new">${req.New}</span></td>
            <td><span class="status-pill pill-inprogress">${req.InProgress}</span></td>
            <td><span class="status-pill pill-scheduled">${req.Scheduled}</span></td>
            <td><span class="status-pill pill-reopen">${req.ReOpen}</span></td>
            <td><span class="status-pill pill-closed">${req.Closed}</span></td>
            <td style="font-weight: 700;">${req.TotalCount}</td>
        `;

    tbody.appendChild(row);
  });
}

function initSearch(inputId, tbodyId) {
  const searchInput = document.getElementById(inputId);
  const tbody = document.getElementById(tbodyId);

  if (searchInput && tbody) {
    searchInput.addEventListener("keyup", function (e) {
      const term = e.target.value.toLowerCase();
      const rows = tbody.getElementsByTagName("tr");

      for (let i = 0; i < rows.length; i++) {
        const text = rows[i].textContent.toLowerCase();
        if (text.includes(term)) {
          rows[i].style.display = "";
        } else {
          rows[i].style.display = "none";
        }
      }
    });
  }
}

initDashboard();
