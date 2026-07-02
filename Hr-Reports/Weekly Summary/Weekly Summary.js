let _this = this;

const response = _this.ResponseData;
let weeklyChartInstance = null;

function renderTable(response) {
  const table = document.getElementById("weeklySummaryTable");
  if (!table) return;
  const sheets = response.Data ? response.Data.Sheets : response.Sheets;
  if (!sheets || sheets.length === 0) return;

  const sheet = sheets[0];
  const data = sheet.Data || [];

  // Find week columns dynamically
  const allKeys = data.length > 0 ? Object.keys(data[0]) : [];
  const weekCols = allKeys.filter(
    (k) => k !== "Category" && k !== "KPIs" && k !== "Subject",
  );

  // Build Header
  let thead = `
        <thead>
            <tr class="title-row">
                <th colspan="${3 + weekCols.length}">Weekly Summary</th>
            </tr>
            <tr class="col-headers">
                <th></th>
                <th style="text-align: left;">KPIs</th>
                <th>Subject</th>
                ${weekCols.map((w) => `<th>${w}</th>`).join("")}
            </tr>
        </thead>
    `;

  // Pre-calculate rowspans
  for (let i = 0; i < data.length; i++) {
    data[i].catSpan = 0;
    data[i].kpiSpan = 0;
  }

  let lastCatIdx = 0;
  let lastKpiIdx = 0;

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      data[i].catSpan = 1;
      data[i].kpiSpan = 1;
      continue;
    }

    if (data[i].Category === data[i - 1].Category) {
      data[lastCatIdx].catSpan++;
    } else {
      data[i].catSpan = 1;
      lastCatIdx = i;
    }

    if (
      data[i].Category === data[i - 1].Category &&
      data[i].KPIs === data[i - 1].KPIs
    ) {
      data[lastKpiIdx].kpiSpan++;
    } else {
      data[i].kpiSpan = 1;
      lastKpiIdx = i;
    }
  }

  // Build Body
  let tbody = "<tbody>";
  for (let i = 0; i < data.length; i++) {
    let row = data[i];
    tbody += "<tr>";

    if (row.catSpan > 0) {
      let catText = row.Category ? row.Category.replace(/\n/g, "<br>") : "";
      tbody += `<td rowspan="${row.catSpan}" class="category"><span>${catText}</span></td>`;
    }

    if (row.kpiSpan > 0) {
      let kpiText = row.KPIs ? row.KPIs.replace(/\n/g, "<br>") : "";
      tbody += `<td rowspan="${row.kpiSpan}" class="kpi">${kpiText}</td>`;
    }

    tbody += `<td class="subject">${row.Subject || ""}</td>`;

    for (let col of weekCols) {
      let val = row[col];
      let displayVal = val;
      if (typeof val === "number") {
        let subj = (row.Subject || "").toLowerCase();
        if (
          subj.includes("%") ||
          subj.includes("persentage") ||
          subj.includes("percentage") ||
          subj.includes("rate") ||
          subj.includes("sla") ||
          subj.includes("نسبة")
        ) {
          displayVal = (val * 100).toFixed(0) + "%";
        } else {
          displayVal = val.toLocaleString("en-US");
        }
      } else if (val === null || val === undefined) {
        displayVal = "";
      }
      tbody += `<td class="val">${displayVal}</td>`;
    }

    tbody += "</tr>";
  }
  tbody += "</tbody>";

  table.innerHTML = thead + tbody;

  // Initialize the chart with data and columns
  initChart(data, weekCols);
}

function initChart(data, weekCols) {
  const selector = document.getElementById("weeklySummarySelector");
  const canvas = document.getElementById("weeklyChart");
  if (!selector || !canvas) return;

  const ctx = canvas.getContext("2d");

  // Group data by Category + KPIs
  const groupsMap = new Map();
  data.forEach((row) => {
    let cat = (row.Category || "").trim();
    let kpi = (row.KPIs || "").trim();
    let key = (cat ? cat + " - " : "") + kpi;
    if (!key) key = "Unknown KPI";

    if (!groupsMap.has(key)) {
      groupsMap.set(key, []);
    }
    groupsMap.get(key).push(row);
  });

  const uniqueGroups = Array.from(groupsMap.keys());

  selector.innerHTML = "";
  uniqueGroups.forEach((key) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = key;
    selector.appendChild(option);
  });

  selector.addEventListener("change", (e) => {
    const selectedKey = e.target.value;
    updateChart(groupsMap.get(selectedKey), weekCols, ctx, selectedKey);
  });

  if (uniqueGroups.length > 0) {
    updateChart(groupsMap.get(uniqueGroups[0]), weekCols, ctx, uniqueGroups[0]);
  }
}

function updateChart(rows, weekCols, ctx, groupKey) {
  const labels = weekCols;

  let existingChart = Chart.getChart(ctx.canvas);
  if (existingChart) {
    existingChart.destroy();
  }

  if (weeklyChartInstance) {
    weeklyChartInstance.destroy();
  }

  const backgroundColors = [
    "rgba(54, 162, 235, 0.8)",
    "rgba(255, 99, 132, 0.8)",
    "rgba(75, 192, 192, 0.8)",
    "rgba(255, 206, 86, 0.8)",
    "rgba(153, 102, 255, 0.8)",
    "rgba(255, 159, 64, 0.8)",
  ];

  const borderColors = [
    "rgba(54, 162, 235, 1)",
    "rgba(255, 99, 132, 1)",
    "rgba(75, 192, 192, 1)",
    "rgba(255, 206, 86, 1)",
    "rgba(153, 102, 255, 1)",
    "rgba(255, 159, 64, 1)",
  ];

  let hasPercentage = false;
  let hasNumber = false;

  const datasets = rows.map((row, i) => {
    const values = weekCols.map((col) => {
      let val = row[col];
      return typeof val === "number" ? val : null;
    });

    const subj = (row.Subject || "").toLowerCase();
    const isDatasetPercentage =
      subj.includes("%") ||
      subj.includes("persentage") ||
      subj.includes("percentage") ||
      subj.includes("rate") ||
      subj.includes("sla") ||
      subj.includes("نسبة");

    if (isDatasetPercentage) {
      hasPercentage = true;
    } else {
      hasNumber = true;
    }

    const colorIdx = i % backgroundColors.length;

    return {
      label: row.Subject || "Value",
      data: values,
      backgroundColor: backgroundColors[colorIdx],
      borderColor: borderColors[colorIdx],
      borderWidth: 1,
      borderRadius: 4,
      yAxisID: isDatasetPercentage ? "y-percentage" : "y",
    };
  });

  weeklyChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        title: {
          display: true,
          text: groupKey,
          font: {
            size: 16,
            family: "'Calibri', 'Arial', sans-serif",
          },
        },
        legend: {
          display: true,
          position: "top",
          labels: {
            font: {
              family: "'Calibri', 'Arial', sans-serif",
              size: 14,
            },
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              let label = context.dataset.label || "";
              if (label) {
                label += ": ";
              }
              if (context.parsed.y !== null) {
                const subj = (context.dataset.label || "").toLowerCase();
                const isDatasetPercentage =
                  subj.includes("%") ||
                  subj.includes("persentage") ||
                  subj.includes("percentage") ||
                  subj.includes("rate") ||
                  subj.includes("sla") ||
                  subj.includes("نسبة");

                if (isDatasetPercentage) {
                  label += (context.parsed.y * 100).toFixed(0) + "%";
                } else {
                  label += context.parsed.y.toLocaleString("en-US");
                }
              }
              return label;
            },
          },
        },
      },
      scales: {
        y: {
          type: "linear",
          display: hasNumber,
          position: "left",
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return value.toLocaleString("en-US");
            },
          },
        },
        "y-percentage": {
          type: "linear",
          display: hasPercentage,
          position: "right",
          beginAtZero: true,
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            callback: function (value) {
              return (value * 100).toFixed(0) + "%";
            },
          },
        },
      },
    },
  });
}

// Render the table and chart
renderTable(response);
