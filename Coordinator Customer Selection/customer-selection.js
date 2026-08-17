var _this = this;

// Dynamically inject SweetAlert2 if not already present
if (typeof Swal === 'undefined') {
  const scriptSwal = document.createElement('script');
  scriptSwal.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
  document.head.appendChild(scriptSwal);
}

$(document).ready(function () {
  // =========================================================================================
  // API CONFIGURATION & CREDENTIALS RETRIEVAL FROM LOCALSTORAGE
  // =========================================================================================
  const Apps4xApiUrl = "https://portal.mawarid.com.sa/apps4x-api/";

  // Retrieve values from localStorage (standard Mawarid template pattern)
  const token =
    localStorage.getItem(
      "eyjJwhtbtGockieOniJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzA0L3htbGRzaWctbW9yZSNobWFjLXNoYTI1NiIsInR5cCI6IkpXVCJ9",
    ) || "";
  const userId = localStorage.getItem("UserId") || "";
  const companyId = localStorage.getItem("CompanyId") || "LGE0000001";
  const appId = "APP0000001";

  // Register mock Handlebars Translate helper if Handlebars is present
  if (typeof Handlebars !== "undefined") {
    Handlebars.registerHelper("Translate", function (value) {
      return value || "";
    });
  }

  function handlebarCompile(templateSource) {
    if (typeof Handlebars !== "undefined") {
      return Handlebars.compile(templateSource)({});
    }
    return templateSource.replace(/\{\{Translate '([^']+)'\}\}/g, "$1");
  }



  // Loader utilities
  function showLoader(btnId) {
    const $loader = $('<span class="loader"></span>');
    const $btn = $(`#${btnId}`);
    $btn.find(".loader").remove();
    $btn.prop("disabled", true).append($loader);
  }

  function hideLoader(btnId) {
    const $btn = $(`#${btnId}`);
    $btn.find(".loader").remove();
    $btn.prop("disabled", false);
  }

  // State Variables
  let activeCoordinatorList = [];
  let tableData = [];
  let filteredData = [];
  let currentPage = 1;
  const recordsPerPage = 5;

  // =========================================================================================
  // CORE API FETCH FUNCTION (Using UserID from localStorage to filter CoordinatorAssignment)
  // =========================================================================================
  function loadCoordinatorCustomersFromApi(callback) {
    showLoader("btnConfirmCustomer");

    if (!userId) {
      console.warn(
        "UserId not found in localStorage. Unable to fetch coordinator customers.",
      );
      hideLoader("btnConfirmCustomer");
      if (callback) callback();
      return;
    }

    // Construct API URL with UserID filter from localStorage
    const apiUrl = `${Apps4xApiUrl}api/v1/data/${companyId}?collectionId=ECN0000004&entityid=ETN0000004&processStageId=-2&schemaVersion=1&$page=1&$size=100&$filter:UserID=in:%27${userId}%27`;

    fetch(apiUrl, {
      method: "GET",
      headers: {
        accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
        "User-Id": userId,
        appid: appId,
        CompanyId: companyId,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        hideLoader("btnConfirmCustomer");
        // Extract record list (handling data.Data, data.Return, or direct array)
        const returnedList = data.Data || data.Return || data;
        if (Array.isArray(returnedList)) {
          activeCoordinatorList = returnedList;
        } else {
          console.warn("Unexpected API structure received:", data);
          activeCoordinatorList = [];
        }
        if (callback) callback();
      })
      .catch((error) => {
        hideLoader("btnConfirmCustomer");
        console.error("Error fetching coordinator customers from API:", error);
        activeCoordinatorList = [];
        if (callback) callback();
      });
  }

  // Initialize Form by loading data from API and applying rules
  loadCoordinatorCustomersFromApi(() => {
    initializeCustomerSelection();
  });

  // Determines active customer context and executes validation rules
  function initializeCustomerSelection() {
    let currentCustomer = null;

    try {
      // Get customer code from parent component data
      if (
        typeof _this !== "undefined" &&
        _this &&
        _this.ParentData &&
        _this.ParentData.CustomerCode
      ) {
        currentCustomer = _this.ParentData.CustomerCode;
      }
    } catch (e) {
      console.log("ParentData not available", e);
    }

    // Fallback to URL parameter for testing
    if (!currentCustomer) {
      currentCustomer =
        new URLSearchParams(window.location.search).get("customer") || null;
    }

    executeCoordinatorRules(currentCustomer, activeCoordinatorList);
  }

  // Core Validation Logic for Customer Selection & Dropdown Behavior
  function executeCoordinatorRules(customer, coordinatorList) {
    // Clear inputs and reset UI state
    $("#CustomerId").val("");
    $("#CustomerName").val("");
    $(".dropdown-content").removeClass("active");
    $("#mappingAlertBanner").addClass("d-none");
    $("#CustomerId").removeClass("readOnly").prop("disabled", false);
    $("#btnConfirmCustomer")
      .prop("disabled", false)
      .removeClass("btn-secondary")
      .addClass("btn-primary");

    tableData = [...coordinatorList];
    filteredData = [...tableData];
    currentPage = 1;
    initializeTable();

    // Step 1: Customer is null
    if (!customer || customer.trim() === "") {
      if (coordinatorList.length === 0) {
        // Step 1b: coordinator customer is empty -> don't allow create + show redirect button
        blockAction(
          "Coordinator customer list is empty. You must map or add customers before proceeding.",
        );
      } else {
        // Step 1a: show dropdown coordinator customer
        $("#customerHelperText").html(
          '<i class="ti ti-hand-click me-1"></i>Please pick a customer from the coordinator dropdown table.',
        );
      }
    }
    // Step 2: Customer is not null
    else {
      if (coordinatorList.length === 0) {
        // Step 2c: customer code is found but coordinator customer is empty -> show proper message + don't allow create + redirect button
        blockAction(
          "Customer code (" +
            customer +
            ") is found, but coordinator customer list is empty. Please map the customer first.",
        );
      } else {
        // Check if existing customer code is matched in coordinator customer list
        const matchedCustomer = coordinatorList.find((c) => {
          const code = c.CustomerCode_Code || c.CustomerCode || "";
          return code.toLowerCase() === customer.trim().toLowerCase();
        });

        if (matchedCustomer) {
          // Step 2a: if match set same customer code, allow action
          const matchedCode =
            matchedCustomer.CustomerCode_Code || matchedCustomer.CustomerCode;
          $("#CustomerId").val(matchedCode);
          $("#CustomerName").val(matchedCustomer.CustomerCode_Name || "");
          $("#customerHelperText").html(
            '<i class="ti ti-check text-success me-1"></i>Customer auto-matched with coordinator list (' +
              matchedCode +
              "). Click to reselect.",
          );
        } else {
          // Step 2b: if not match allow customer to select from dropdown then allow action
          $("#customerHelperText").html(
            '<i class="ti ti-info-circle text-warning me-1"></i>Customer code (' +
              customer +
              ") not matched in coordinator list. Please select a valid coordinator customer below.",
          );
        }
      }
    }
  }

  // Helper to lock form action and show banner with redirect button
  function blockAction(errorMessage) {
    $("#mappingAlertText").text(handlebarCompile(errorMessage));
    $("#mappingAlertBanner").removeClass("d-none");
    $("#CustomerId").addClass("readOnly").prop("disabled", true);
    $("#btnConfirmCustomer")
      .prop("disabled", true)
      .removeClass("btn-primary")
      .addClass("btn-secondary");
    $("#customerHelperText").html(
      '<i class="ti ti-lock text-danger me-1"></i>Customer selection disabled until mapping is configured.',
    );

    Swal.fire({
      title: handlebarCompile("Action Blocked"),
      text: handlebarCompile(errorMessage),
      icon: "warning",
      confirmButtonText: handlebarCompile("OK"),
    });
  }

  // ================= Dropdown Table & Pagination Logic =================
  function initializeTable() {
    renderTable();
    updatePagination();
  }

  function renderTable() {
    const tbody = $(".data-table tbody");
    tbody.empty();

    if (filteredData.length === 0) {
      tbody.append(
        '<tr><td colspan="4" class="text-center py-3 text-muted">No coordinator customers available or matching criteria.</td></tr>',
      );
      $("#start-record").text("0");
      $("#end-record").text("0");
      $("#total-records").text("0");
      return;
    }

    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = Math.min(startIndex + recordsPerPage, filteredData.length);

    for (let i = startIndex; i < endIndex; i++) {
      const row = filteredData[i];
      const code = row.CustomerCode_Code || row.CustomerCode || "N/A";
      const name = row.CustomerCode_Name || "N/A";
      const email = row.CustomerCode_SupportEmail || "N/A";
      const domain = row.CustomerCode_SupportDomain || "N/A";

      const tr = $("<tr>");
      tr.append($("<td>").addClass("fw-bold text-primary").text(code));
      tr.append($("<td>").text(name));
      tr.append($("<td>").text(email));
      tr.append($("<td>").text(domain));

      if ($("#CustomerId").val() === code) {
        tr.addClass("selected");
      }

      tr.click(function () {
        $(".data-table tbody tr").removeClass("selected");
        $(this).addClass("selected");
        $("#CustomerId").val(code);
        $("#CustomerName").val(name);
        $(".dropdown-content").removeClass("active");
      });

      tbody.append(tr);
    }

    $("#start-record").text(filteredData.length > 0 ? startIndex + 1 : 0);
    $("#end-record").text(endIndex);
    $("#total-records").text(filteredData.length);
  }

  function updatePagination() {
    const totalPages = Math.ceil(filteredData.length / recordsPerPage);
    $(".pagination-controls .page-num-btn").remove();

    for (let i = 1; i <= totalPages; i++) {
      const btn = $("<button>")
        .attr("type", "button")
        .addClass("pagination-btn page-num-btn")
        .text(i)
        .click(function () {
          currentPage = i;
          renderTable();
          updatePagination();
        });
      if (i === currentPage) btn.addClass("active");
      $("#next-page").before(btn);
    }

    $("#first-page").prop("disabled", currentPage === 1 || totalPages === 0);
    $("#prev-page").prop("disabled", currentPage === 1 || totalPages === 0);
    $("#next-page").prop(
      "disabled",
      currentPage === totalPages || totalPages === 0,
    );
    $("#last-page").prop(
      "disabled",
      currentPage === totalPages || totalPages === 0,
    );
  }

  // Pagination navigation events
  $("#first-page").click(function () {
    if (currentPage > 1) {
      currentPage = 1;
      renderTable();
      updatePagination();
    }
  });
  $("#prev-page").click(function () {
    if (currentPage > 1) {
      currentPage--;
      renderTable();
      updatePagination();
    }
  });
  $("#next-page").click(function () {
    const max = Math.ceil(filteredData.length / recordsPerPage);
    if (currentPage < max) {
      currentPage++;
      renderTable();
      updatePagination();
    }
  });
  $("#last-page").click(function () {
    const max = Math.ceil(filteredData.length / recordsPerPage);
    if (currentPage < max) {
      currentPage = max;
      renderTable();
      updatePagination();
    }
  });

  // Column filtering events
  $(".filter-input").on("input", function (e) {
    e.stopPropagation();
    filteredData = tableData.filter((item) => {
      let match = true;
      $(".filter-input").each(function () {
        const filterVal = $(this).val().toLowerCase().trim();
        const idx = parseInt($(this).data("column"));
        if (filterVal) {
          let targetText = "";
          if (idx === 0)
            targetText = (
              item.CustomerCode_Code ||
              item.CustomerCode ||
              ""
            ).toLowerCase();
          else if (idx === 1)
            targetText = (item.CustomerCode_Name || "").toLowerCase();
          else if (idx === 2)
            targetText = (item.CustomerCode_SupportEmail || "").toLowerCase();
          else if (idx === 3)
            targetText = (item.CustomerCode_SupportDomain || "").toLowerCase();

          if (!targetText.includes(filterVal)) match = false;
        }
      });
      return match;
    });

    currentPage = 1;
    renderTable();
    updatePagination();
  });

  // Toggle dropdown table visibility
  $("#CustomerId").click(function (e) {
    e.stopPropagation();
    if (!$(this).hasClass("readOnly") && !$(this).prop("disabled")) {
      $(".dropdown-content").toggleClass("active");
    }
  });

  // Close dropdown if clicked outside
  $(document).click(function (e) {
    if (!$(e.target).closest(".custom-dropdown, .dropdown-content").length) {
      $(".dropdown-content").removeClass("active");
    }
  });

  // Stop click propagation inside dropdown
  $(".dropdown-content").click(function (e) {
    e.stopPropagation();
  });

  // Clear Button Handler
  $("#btnClear").click(function () {
    initializeCustomerSelection();
  });

  // Confirm Selection Submit Handler
  $("#btnConfirmCustomer").click(function () {
    if ($(this).prop("disabled")) {
      return;
    }

    const custId = $("#CustomerId").val();
    const custName = $("#CustomerName").val();

    if (!custId) {
      Swal.fire(
        handlebarCompile("Warning"),
        handlebarCompile(
          "Please select a Customer Code / Id from the dropdown.",
        ),
        "warning",
      );
      return;
    }

    Swal.fire({
      title: handlebarCompile("{{Translate 'Do you want to confirm this customer selection?'}}"),
      text: handlebarCompile("{{Translate 'You are about to link this customer.'}}"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: handlebarCompile("{{Translate 'Confirm Selection'}}"),
      cancelButtonText: handlebarCompile("{{Translate 'Cancel'}}"),
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        showLoader("btnConfirmCustomer");

        let parentId = 0;
        try {
          if (
            typeof _this !== "undefined" &&
            _this &&
            _this.ParentData &&
            _this.ParentData.Id
          ) {
            parentId = _this.ParentData.Id;
          }
        } catch (e) {
          console.log("ParentData not available", e);
        }

        const payload = {
          Id: parentId,
          CustomerCode: custId,
          ActionBy: userId,
        };

        fetch(
          "https://portal.mawarid.com.sa/apps4x-api/graph-api/api/Mail/ManualTicketCreation",
          {
            method: "POST",
            headers: {
              accept: "text/plain",
              "accept-language": "en-US,en;q=0.9",
              authorization: "Bearer " + token,
              companyid: companyId,
              "content-type": "application/json-patch+json",
            },
            body: JSON.stringify(payload),
          },
        )
          .then((response) => {
            if (!response.ok) {
              throw new Error("HTTP error! status: " + response.status);
            }
            return response.text();
          })
          .then((data) => {
            hideLoader("btnConfirmCustomer");
            Swal.fire({
              title: handlebarCompile("{{Translate 'Success'}}"),
              text: handlebarCompile(
                `{{Translate 'Customer'}} "${custName}" (${custId}) {{Translate 'has been processed successfully.'}}`,
              ),
              icon: "success",
              confirmButtonText: handlebarCompile("{{Translate 'OK'}}"),
            }).then(() => {
              const findModal = (doc) => {
                let modal = null;
                const formContainer = doc.querySelector(".form-container");
                if (formContainer) {
                  modal =
                    formContainer.closest("dynamic-widget") ||
                    formContainer.closest(".modal") ||
                    formContainer.closest('[id^="DynamicWidget_"]');
                }
                if (!modal) {
                  const allModals = doc.querySelectorAll(
                    "dynamic-widget, .modal.show, .modal.d-block",
                  );
                  if (allModals.length > 0) modal = allModals[allModals.length - 1];
                }
                return modal;
              };

              const forceClose = (modal, doc) => {
                if (!modal) return false;
                const btns = modal.querySelectorAll(
                  '.modal-header .btn-close, .modal-header button, .close, [aria-label="Close"]',
                );
                btns.forEach((btn) => {
                  // Fire both standard click and MouseEvent to ensure Angular/React/Vue picks it up
                  btn.click();
                  btn.dispatchEvent(
                    new MouseEvent("click", { bubbles: true, cancelable: true }),
                  );
                });

                // Forcefully hide the modal visually as a fallback guarantee
                modal.style.display = "none";
                modal.classList.remove("show", "d-block");
                doc.body.classList.remove("modal-open");
                doc.body.style.overflow = "";
                doc.body.style.paddingRight = "";
                doc.querySelectorAll(".modal-backdrop").forEach((b) => b.remove());
                return true;
              };

              let m = findModal(document);
              let isClosed = forceClose(m, document);

              if (!isClosed && window.parent && window.parent !== window) {
                try {
                  m = findModal(window.parent.document);
                  isClosed = forceClose(m, window.parent.document);
                } catch (e) {
                  console.log("Could not access parent document: ", e);
                }
              }
            });
          })
          .catch((error) => {
            hideLoader("btnConfirmCustomer");
            console.error("Error submitting manual ticket creation:", error);
            Swal.fire({
              title: handlebarCompile("{{Translate 'Error'}}"),
              text: handlebarCompile(
                "{{Translate 'An error occurred while submitting. Please try again.'}}",
              ),
              icon: "error",
              confirmButtonText: handlebarCompile("{{Translate 'OK'}}"),
            });
          });
      }
    });
  });
});
