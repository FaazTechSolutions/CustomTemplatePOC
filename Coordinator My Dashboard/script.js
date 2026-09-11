// --- Coordinator My Dashboard ---
// Reads MyTeamTickets data and populates the team ticket cards.
var _this = this;
var dashboardData = _this ? _this.currentPageData : null;

// Colors mapping matching the CSS variables
var statusColors = {
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
  if (typeof _this !== "undefined" && _this && _this.currentPageData) {
    dashboardData = _this.currentPageData;
  }
  if (!dashboardData) return;

  // Guard check: If the container isn't in the DOM, exit early.
  const container = document.getElementById("my-team-tickets-container");
  if (!container) return;

  // Prevent re-render if data hasn't changed
  let dataFingerprint = "empty";
  try {
    const teamTotal = dashboardData.MyTeamTickets
      ? dashboardData.MyTeamTickets.length
      : 0;
    dataFingerprint = `team_${teamTotal}`;
  } catch (e) {
    // ignore
  }

  const isPopulated = container.children.length > 0;

  if (window._lastDashboardDataString === dataFingerprint && isPopulated) {
    return;
  }
  window._lastDashboardDataString = dataFingerprint;

  // Populate My Team Tickets Cards
  if (dashboardData.MyTeamTickets) {
    populateMyTeamTicketsCards(dashboardData.MyTeamTickets);
  }
}

function populateMyTeamTicketsCards(requests) {
  const container = document.getElementById("my-team-tickets-container");
  if (!container) return;

  const html = requests
    .map((req) => {
      const statusKey = req.Status.toLowerCase();
      const borderColor = statusColors[req.Status] || "var(--primary-color)";

      return `
      <div class="team-ticket-card" style="border-top-color: ${borderColor}">
        <div class="team-ticket-header">
          <h4>${req.Status}</h4>
          <span class="status-pill pill-${statusKey}">${req.Status}</span>
        </div>
        <div class="team-ticket-total">
          ${req.Total} <span style="font-size: 12px; color: var(--text-muted); font-weight: 500;">Total</span>
        </div>
        <div class="team-ticket-breakdown">
          <div class="team-ticket-stat unassigned">
            <span>Unassigned</span>
            <strong>${req.Unassigned}</strong>
          </div>
          <div class="team-ticket-stat assigned">
            <span>Assigned</span>
            <strong>${req.Assigned}</strong>
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  container.innerHTML = html;
}

initDashboard();
