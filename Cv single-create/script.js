let _this = this;
let portalResponseData = _this ? _this.ResponseData : null;
let portalRecordId = null;
if (portalResponseData) {
  let dataObj = portalResponseData;
  if (dataObj.Data) {
    dataObj = typeof dataObj.Data === "string" ? JSON.parse(dataObj.Data) : dataObj.Data;
  }
  portalRecordId = dataObj.RecId || dataObj.Id || dataObj.id || null;
}
// ─── App Mode Configuration (Create vs Update) ───
// Automatically detect Update mode if portal data is provided. (Force true for local testing)
let IS_EDIT_MODE = portalResponseData ? true : false; 
let EDIT_CANDIDATE_ID = portalRecordId || null; 
const IMAGE_BASE_URL = "https://portal.mawarid.com.sa/apps4x-api"; // Base URL for attachments

function initApp() {
  // ─── Auto-calculate Age from DOB ───
  const dobInput = document.getElementById("DateofBirth");
  const ageInput = document.getElementById("Age");

  dobInput.addEventListener("change", (e) => {
    if (e.target.value) {
      const dob = new Date(e.target.value);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      ageInput.value = age > 0 ? age : 0;
    } else {
      ageInput.value = "";
    }
  });

  // ─── Profile Image Preview ───
  const profileImageInput = document.getElementById("ProfileImage");
  const profilePreview = document.getElementById("profilePreview");

  profileImageInput.addEventListener("change", function () {
    if (this.files && this.files[0]) {
      const reader = new FileReader();
      reader.onload = function (e) {
        profilePreview.src = e.target.result;
      };
      reader.readAsDataURL(this.files[0]);
    }
  });

  const fullSizeInputUpload = document.getElementById("FullSizeImage");
  const fullSizeFileName = document.getElementById("fullSizeFileName");
  const fullSizePreviewImg = document.getElementById("fullSizePreviewImg");
  const fullSizeDropText = document.getElementById("fullSizeDropText");
  const fullSizeIcon = document.getElementById("fullSizeIcon");
  const fullSizeDropArea = document.getElementById("fullSizeDropArea");

  if (fullSizeInputUpload && fullSizeFileName) {
    fullSizeInputUpload.addEventListener("change", function () {
      if (this.files && this.files.length > 0) {
        fullSizeFileName.textContent = this.files[0].name;

        // Large Image preview
        const reader = new FileReader();
        reader.onload = function (e) {
          if (fullSizePreviewImg) {
            fullSizePreviewImg.src = e.target.result;
            fullSizePreviewImg.style.display = "block";
            if (fullSizeDropText) fullSizeDropText.style.display = "none";
            if (fullSizeIcon) fullSizeIcon.style.display = "none";
            if (fullSizeDropArea)
              fullSizeDropArea.style.flexDirection = "column";
          }
        };
        reader.readAsDataURL(this.files[0]);
      } else {
        fullSizeFileName.textContent = "";
        if (fullSizePreviewImg) {
          fullSizePreviewImg.style.display = "none";
          if (fullSizeDropText) fullSizeDropText.style.display = "flex";
          if (fullSizeIcon) fullSizeIcon.style.display = "flex";
          if (fullSizeDropArea) fullSizeDropArea.style.flexDirection = "row";
        }
      }
    });
  }

  // ─── Lazy Fetch Helper ───
  function setupLazyDropdown(id, placeholder, fetchCallback) {
    const select = document.getElementById(id);
    if (!select) return;

    select.innerHTML = `<option value="">${placeholder}</option>`;
    initSearchableDropdown(select);

    let hasFetched = false;
    select.parentElement.addEventListener(
      "click",
      (e) => {
        const trigger = e.target.closest(".sd-trigger");
        if (trigger && !hasFetched) {
          e.stopPropagation(); // Prevent normal open
          hasFetched = true;
          trigger.querySelector(".sd-value").innerHTML =
            `<span class="sd-loader"></span> Loading...`;

          fetchCallback()
            .then(() => {
              const newSelect = document.getElementById(id);
              if (newSelect) {
                const newWrapper = newSelect.parentElement;
                if (newWrapper && newWrapper.classList.contains("sd-wrapper")) {
                  newWrapper.classList.add("sd-open");
                  const searchInput = newWrapper.querySelector(".sd-search");
                  if (searchInput) setTimeout(() => searchInput.focus(), 30);

                  // Scroll the active item into view now that the list is populated
                  setTimeout(() => {
                    const activeItem = newWrapper.querySelector(".sd-active");
                    if (activeItem) {
                      activeItem.scrollIntoView({ block: "center" });
                    }
                  }, 50);
                }
              }
            })
            .catch((err) => {
              console.error("Lazy dropdown error:", err);
              const newSelect = document.getElementById(id);
              if (newSelect && newSelect.parentElement) {
                const valEl =
                  newSelect.parentElement.querySelector(".sd-value");
                if (valEl) valEl.textContent = placeholder;
              } else {
                trigger.querySelector(".sd-value").textContent = placeholder;
              }
              hasFetched = false;
            });
        }
      },
      true,
    );
  }

  // ─── Fetch Nationality once & populate Nationality + cache for dynamic Country ───
  const nationalityUrl =
    "https://portal.mawarid.com.sa/apps4x-api/graph-api/api/v1/Integration/GetApplicationAvailableNationality";
  const nationalityMapping = {
    value: "countryregionId",
    text: "englishName",
    labels: [
      { key: "countryregionId", label: "Code" },
      { key: "englishName", label: "English" },
      { key: "arabicName", label: "Arabic" },
    ],
  };

  setupLazyDropdown("Nationality", "Select Nationality", () => {
    return fetchAndPopulateMultiple(
      nationalityUrl,
      ["Nationality"],
      nationalityMapping,
    ).then((items) => {
      window.cachedCountryData = items;
      window.cachedCountryMapping = nationalityMapping;
      const expTemplate = document.getElementById("experienceTemplate");
      if (expTemplate) {
        const countrySelect =
          expTemplate.content.querySelector(".dynamic-country");
        if (countrySelect)
          populateNativeSelect(
            countrySelect,
            items,
            nationalityMapping,
            "Country",
          );
      }
      document.querySelectorAll(".dynamic-country").forEach((select) => {
        populateNativeSelect(select, items, nationalityMapping, "Country");
        reinitSearchableDropdown(select);
      });
    });
  });

  // ─── Fetch & Populate Profession Dropdown ───
  const professionUrl =
    "https://portal.mawarid.com.sa/apps4x-api/graph-api/api/v1/Integration/GetApplicationAvailableProfession?refreshjson=false";
  const professionMapping = {
    value: "professionCode",
    text: "englishDescription",
    labels: [
      { key: "professionCode", label: "Code" },
      { key: "englishDescription", label: "English" },
      { key: "arabicDescription", label: "Arabic" },
    ],
  };

  setupLazyDropdown("Profession", "Select Profession", () => {
    return fetchAndPopulateMultiple(
      professionUrl,
      ["Profession"],
      professionMapping,
    );
  });

  // ─── Fetch & Populate Education Dropdown ───
  const educationUrl = `https://portal.mawarid.com.sa/apps4x-api/api/v1/data/${localStorage.getItem("CompanyId") || "LGE0000001"}?entityId=f33cd1a2ea3c497a98b2e3ec37d4d361&$page=0&$size=0&$orderbydirection=1`;
  const educationMapping = {
    value: "Level",
    text: "Level",
    labels: [{ key: "Level", label: "Level" }],
  };

  setupLazyDropdown("EducationLevel", "Select Education", () => {
    return fetchAndPopulateMultiple(
      educationUrl,
      ["EducationLevel"],
      educationMapping,
    );
  });

  // ─── Upgrade ALL static selects to custom dropdown ───
  ["Gender", "MaritalStatus"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) initSearchableDropdown(el);
  });

  // Initialize dynamic sections instantly (does not wait for API)
  initDynamicSections();

  // ─── Form Submission Handler ───
  const cvForm = document.getElementById("cvForm");
  if (cvForm) {
    cvForm.addEventListener("submit", function (e) {
      e.preventDefault();

      // Extract standard fields
      const formData = new FormData(this);
      const modelData = {
        name: formData.get("Name") || "",
        passportNumber: formData.get("PassportNumber") || "",
        dateofBirth: formData.get("DateofBirth") || "",
        nationality: formData.get("Nationality") || "",
        profession: formData.get("Profession") || "",
        religion: formData.get("Religion") || "",
        maritalStatus: formData.get("MaritalStatus") || "",
        phoneNumber: formData.get("PhoneNumber") || "",
        placeOfBirth: formData.get("PlaceofBirth") || "",
        age: parseInt(formData.get("Age")) || 0,
        numberOfChildren: parseInt(formData.get("NumberofChildren")) || 0,
        weight: parseFloat(formData.get("Weight")) || 0,
        height: parseFloat(formData.get("Height")) || 0,
        monthlySalary: parseFloat(formData.get("MonthlySalary")) || 0,
        gender: formData.get("Gender") || "",
        Education: formData.getAll("EducationLevel[]").join(",") || "",
        isPrimary: true,
        comments: "Available to start immediately",
        status: "Waiting for approval",
        confirmationStatus: "Pending",
        additionalFields: {},
      };

      // Skills
      modelData.skills = [];
      const skillNames = formData.getAll("SkillName[]");
      skillNames.forEach((name) => {
        if (name.trim()) modelData.skills.push(name.trim());
      });

      // Languages
      modelData.languages = [];
      const langNames = formData.getAll("Language[]");
      const langProfs = formData.getAll("Proficiency[]");
      langNames.forEach((name, i) => {
        if (name.trim() || langProfs[i]) {
          modelData.languages.push({
            languageName: name.trim(),
            proficiency: langProfs[i] || "",
          });
        }
      });

      // Experience
      modelData.experiences = [];
      const expWorkplaces = formData.getAll("Workplace[]");
      const expDurations = formData.getAll("Experienceduration[]");
      const expCountries = formData.getAll("Country[]");
      const expPositions = formData.getAll("ExpPosition[]");
      const expRoles = formData.getAll("Roles[]");

      expWorkplaces.forEach((workplace, i) => {
        if (
          workplace.trim() ||
          expDurations[i] ||
          expCountries[i] ||
          expPositions[i] ||
          expRoles[i]
        ) {
          modelData.experiences.push({
            workplace: workplace.trim(),
            experienceDuration: expDurations[i] || "",
            country: expCountries[i] || "",
            position: expPositions[i] || "",
            roles: expRoles[i] || "",
          });
        }
      });

      console.log("Prepared CV Model Data:", modelData);

      const submitData = new FormData();
      const fileInput = document.getElementById("ProfileImage");
      if (fileInput && fileInput.files.length > 0) {
        submitData.append("profileImage", fileInput.files[0]);
      }

      const fullSizeInput = document.getElementById("FullSizeImage");
      if (fullSizeInput && fullSizeInput.files.length > 0) {
        submitData.append("FullSizeImage", fullSizeInput.files[0]);
      }

      submitData.append("modelData", JSON.stringify(modelData));

      let apiUrl =
        "https://portal.mawarid.com.sa/apps4x-api/graph-api/api/v1/Integration/ProcessCandidateCVUpload";
      let apiMethod = "POST";

      const targetId = EDIT_CANDIDATE_ID;

      if (IS_EDIT_MODE && targetId) {
        apiUrl = `https://portal.mawarid.com.sa/apps4x-api/graph-api/api/v1/Integration/ProcessCandidateCVUpload/${targetId}`;
        apiMethod = "PUT";
        
        // Ensure the ID is passed inside the payload as well, since some APIs require it to update instead of create
        modelData.RecId = targetId;
        modelData.Id = targetId;
      }

      fetch(apiUrl, {
        method: apiMethod,
        headers: API_HEADERS,
        body: submitData,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("HTTP error " + response.status);
          }
          return response.json();
        })
        .then((result) => {
          console.log("Success:", result);
          // Close the modal popup
          const formContainer = document.querySelector(
            ".singlecreatecvcontainer",
          );
          if (formContainer) {
            const modal =
              formContainer.closest('[id^="DynamicWidget_"]') ||
              formContainer.closest(".modal");
            if (modal) {
              // Try to find the modal's close button in the header and click it for a clean Angular state update
              const closeBtn = modal.querySelector(
                '.modal-header button, [data-bs-dismiss="modal"]',
              );
              if (closeBtn) {
                closeBtn.click();
              } else {
                // Fallback: forcefully hide it
                modal.classList.remove("d", "block", "d-block");
                modal.style.display = "none";
              }
            }
          }
        })
        .catch((error) => {
          console.error("Error submitting CV:", error);
        });
    });
  }
}

// ─── Dynamic Form Sections ───
function initDynamicSections() {
  setupDynamicList("addSkillBtn", "skillsContainer", "skillTemplate");
  setupDynamicList("addLanguageBtn", "languagesContainer", "languageTemplate");

  setupDynamicList(
    "addExperienceBtn",
    "experienceContainer",
    "experienceTemplate",
  );
}

function setupDynamicList(btnId, containerId, templateId) {
  const btn = document.getElementById(btnId);
  const container = document.getElementById(containerId);
  const template = document.getElementById(templateId);

  if (!btn || !container || !template) return;

  function addItem() {
    const clone = template.content.cloneNode(true);
    const itemElement = clone.querySelector(".dynamic-item");

    // Remove functionality
    const removeBtn = clone.querySelector(".btn-remove-item");
    removeBtn.addEventListener("click", () => {
      itemElement.remove();
    });

    // Initialize any searchable dropdowns in the clone
    const selects = clone.querySelectorAll("select");
    selects.forEach((select) => {
      // Need to append first before initSearchableDropdown so it can insert wrapper adjacent to it
      setTimeout(() => {
        initSearchableDropdown(select);
      }, 0);
    });

    container.appendChild(clone);
  }

  // Add first item automatically
  if (container.children.length === 0) {
    addItem();
  }

  // Add on click
  btn.addEventListener("click", addItem);
}

// ─── Common API Headers ───
let token = "";
let userId = "";
let companyId = "";
const userInfo = JSON.parse(localStorage.getItem("userInfo") || "null");

if (window.location.hostname === "portal.mawarid.com.sa") {
  token = localStorage.getItem(
    "eyjJwhtbtGockieOniJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzA0L3htbGRzaWctbW9yZSNobWFjLXNoYTI1NiIsInR5cCI6IkpXVCJ9",
  );
  userId = localStorage.getItem("UserId");
  companyId = localStorage.getItem("CompanyId");
} else if (
  window.location.hostname === "localhost" ||
  window.location.hostname === ""
) {
  token =
    "eyJhbGciOiJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzA0L3htbGRzaWctbW9yZSNobWFjLXNoYTI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VySWQiOiJhLmh5ZGVyIiwiTmFtZSI6Ikh5ZGVyIEFsaSBBIiwiRW1haWwiOiJoeWRlckBmYWF6dGVjaHNvbHV0aW9ucy5jb20iLCJNb2JpbGVOdW1iZXIiOiI5OTQzMjIxMzIxIiwiQ29tcGFueUlkIjoiTEdFMDAwMDAwMSIsImV4cCI6MTc4NDI2OTk2NSwiaXNzIjoiYXBwczR4LmNvbSIsImF1ZCI6ImFwcHM0eC5jb20ifQ.kVmNDDJ6J65zah_90O_xHmDrYnV50cdi-HjPJgB5MEQ";
  userId = "a.hyder";
  companyId = "LGE0000001";
}

const API_HEADERS = {
  accept: "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9",
  appid: "bf053c91ba5c42b48c9f96d0a8450e79",
  authorization: token ? `Bearer ${token}` : "",
  companyid: companyId || "",
  "user-id": userId || "",
};

/**
 * Fetch data from API ONCE and populate multiple <select> elements with the same data.
 *
 * @param {string} url - The API endpoint
 * @param {string[]} selectIds - Array of <select> element IDs to populate
 * @param {{ value: string, text: string, labels?: Array }} mapping - Field mapping
 */
async function fetchAndPopulateMultiple(url, selectIds, mapping) {
  const selects = selectIds
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: API_HEADERS,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Extract the array from the response
    let items = [];
    if (Array.isArray(data)) {
      items = data;
    } else if (data.Data && Array.isArray(data.Data)) {
      items = data.Data;
    } else if (data.Result && Array.isArray(data.Result)) {
      items = data.Result;
    } else if (data.Items && Array.isArray(data.Items)) {
      items = data.Items;
    }

    // Populate each select with the same data
    selects.forEach((select) => {
      populateNativeSelect(select, items, mapping, select.id);
      // Upgrade to searchable dropdown (use reinit to remove old lazy wrapper)
      reinitSearchableDropdown(select);
    });

    return items;
  } catch (error) {
    console.error(`Failed to fetch data:`, error);
    selects.forEach((select) => {
      select.innerHTML = `<option value="">Failed to load</option>`;
      reinitSearchableDropdown(select);
    });
    return [];
  }
}

function populateNativeSelect(select, items, mapping, placeholderName) {
  // Preserve existing selected value(s) for Edit Mode hydration
  const isMultiple = select.multiple;
  const preservedValues = isMultiple
    ? Array.from(select.selectedOptions)
        .map((o) => o.value)
        .filter((v) => v !== "")
    : [select.value].filter((v) => v !== "");

  select.innerHTML = `<option value="">Select ${placeholderName || ""}</option>`;

  items.forEach((item) => {
    const val = item[mapping.value] || "";
    const txt = item[mapping.text] || val;
    const option = document.createElement("option");
    option.value = val;
    option.textContent = txt;

    if (mapping.labels) {
      option.dataset.labels = JSON.stringify(
        mapping.labels.map((l) => ({
          label: l.label,
          value: item[l.key] || "",
        })),
      );
    }

    select.appendChild(option);
  });

  // Restore preserved values so custom dropdown initialization reads them
  if (preservedValues.length > 0) {
    if (isMultiple) {
      Array.from(select.options).forEach((opt) => {
        if (preservedValues.includes(opt.value)) opt.selected = true;
      });
    } else {
      select.value = preservedValues[0];
    }
  }
}

// ═══════════════════════════════════════════════════════
//  Premium Custom Dropdown Component
// ═══════════════════════════════════════════════════════

const SEARCH_SVG = `<svg class="sd-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>`;

const CHECK_SVG = `<svg class="sd-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

const CHEVRON_SVG = `<svg class="sd-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;

function reinitSearchableDropdown(nativeSelect) {
  if (nativeSelect.parentElement.classList.contains("sd-wrapper")) {
    const wrapper = nativeSelect.parentElement;
    wrapper.parentElement.insertBefore(nativeSelect, wrapper);
    wrapper.remove();
    // Reset visually hidden styles
    nativeSelect.style.position = "";
    nativeSelect.style.opacity = "";
    nativeSelect.style.width = "";
    nativeSelect.style.height = "";
    nativeSelect.style.overflow = "";
    nativeSelect.style.clip = "";
    nativeSelect.style.pointerEvents = "";
    nativeSelect.style.zIndex = "";
  }
  initSearchableDropdown(nativeSelect);
}

function initSearchableDropdown(nativeSelect) {
  if (nativeSelect.parentElement.classList.contains("sd-wrapper")) return;

  const isMultiple = nativeSelect.multiple;
  const options = Array.from(nativeSelect.options);
  const placeholder =
    options[0]?.textContent || (isMultiple ? "Select options..." : "Select...");
  let selectedValues = isMultiple
    ? Array.from(nativeSelect.selectedOptions)
        .map((o) => o.value)
        .filter((v) => v !== "")
    : nativeSelect.value
      ? [nativeSelect.value]
      : [];
  let focusedIndex = -1;

  // Determine initial trigger text based on selected values
  let initialTriggerText = placeholder;
  if (selectedValues.length > 0) {
    if (isMultiple) {
      const texts = selectedValues.map((val) => {
        const opt = options.find((o) => o.value === val);
        return opt ? opt.textContent : val;
      });
      initialTriggerText = texts.join(", ");
    } else {
      const opt = options.find((o) => o.value === selectedValues[0]);
      if (opt) initialTriggerText = opt.textContent;
    }
  }

  // Visually hide native select but keep it focusable for HTML5 validation
  nativeSelect.style.position = "absolute";
  nativeSelect.style.opacity = "0";
  nativeSelect.style.width = "1px";
  nativeSelect.style.height = "1px";
  nativeSelect.style.overflow = "hidden";
  nativeSelect.style.clip = "rect(0, 0, 0, 0)";
  nativeSelect.style.pointerEvents = "none";
  nativeSelect.style.zIndex = "-1";

  // ── Build DOM ──
  const wrapper = document.createElement("div");
  wrapper.className = "sd-wrapper";
  wrapper.setAttribute("tabindex", "0");

  const trigger = document.createElement("div");
  trigger.className = "sd-trigger";
  if (selectedValues.length > 0) trigger.classList.add("sd-selected");
  trigger.innerHTML = `<span class="sd-value">${initialTriggerText}</span>${CHEVRON_SVG}`;

  const panel = document.createElement("div");
  panel.className = "sd-panel";

  // Search bar with icon
  const searchBar = document.createElement("div");
  searchBar.className = "sd-search-bar";
  searchBar.innerHTML = SEARCH_SVG;
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.className = "sd-search";
  searchInput.placeholder = "Type to search...";
  searchInput.autocomplete = "off";
  searchBar.appendChild(searchInput);

  // Handle HTML5 validation focus
  nativeSelect.addEventListener("invalid", () => {
    wrapper.style.borderColor = "#dc3545"; // highlight red
  });
  nativeSelect.addEventListener("change", () => {
    wrapper.style.borderColor = ""; // clear error
  });
  nativeSelect.addEventListener("focus", () => {
    wrapper.focus();
  });

  const list = document.createElement("div");
  list.className = "sd-list";

  const allItems = [];

  // Detect if first option has labels data (for table header)
  let hasTableLayout = false;
  let headerLabels = [];
  try {
    const firstWithLabels = options.find((o, i) => i > 0 && o.dataset.labels);
    if (firstWithLabels) {
      headerLabels = JSON.parse(firstWithLabels.dataset.labels);
      hasTableLayout = headerLabels.length > 0;
    }
  } catch (e) {}

  // Helper to get grid template columns based on number of labels
  const getGridCols = (count) => {
    if (count === 1) return "1fr 28px";
    if (count === 2) return "80px 1fr 28px";
    return "80px 1fr 1fr 28px";
  };

  // Build table header if applicable
  if (hasTableLayout) {
    const headerRow = document.createElement("div");
    headerRow.className = "sd-table-header";
    headerRow.style.gridTemplateColumns = getGridCols(headerLabels.length);
    headerLabels.forEach((l) => {
      const cell = document.createElement("span");
      cell.className = "sd-th";
      cell.textContent = l.label;
      headerRow.appendChild(cell);
    });
    // Empty cell for checkmark column
    const checkCell = document.createElement("span");
    checkCell.className = "sd-th sd-th-check";
    headerRow.appendChild(checkCell);
    list.appendChild(headerRow);
  }

  options.forEach((opt, i) => {
    if (i === 0 && opt.value === "") return;
    const item = document.createElement("div");
    item.dataset.value = opt.value;

    // Build rich content if labels data exists
    let labelsData = null;
    try {
      labelsData = opt.dataset.labels ? JSON.parse(opt.dataset.labels) : null;
    } catch (e) {}

    if (labelsData && labelsData.length > 0) {
      item.className = "sd-item sd-table-row";
      item.style.gridTemplateColumns = getGridCols(labelsData.length);
      let cellsHtml = labelsData
        .map((l) => `<span class="sd-td">${l.value}</span>`)
        .join("");
      item.innerHTML = `${cellsHtml}<span class="sd-td sd-td-check">${CHECK_SVG}</span>`;
    } else {
      item.className = "sd-item";
      item.innerHTML = `<span class="sd-item-text">${opt.textContent}</span>${CHECK_SVG}`;
    }

    // Store searchable text (all label values for filtering)
    item.dataset.searchText = labelsData
      ? labelsData
          .map((l) => l.value)
          .join(" ")
          .toLowerCase()
      : opt.textContent.toLowerCase();

    if (selectedValues.includes(opt.value) && opt.value !== "") {
      item.classList.add("sd-active");
    }

    item.addEventListener("click", (e) => {
      e.stopPropagation();
      selectItem(opt.value, opt.textContent);
    });
    list.appendChild(item);
    allItems.push(item);
  });

  panel.appendChild(searchBar);
  panel.appendChild(list);
  wrapper.appendChild(trigger);
  wrapper.appendChild(panel);

  nativeSelect.parentNode.insertBefore(wrapper, nativeSelect);
  wrapper.appendChild(nativeSelect);

  // ── Select an item ──
  function selectItem(value, text) {
    if (isMultiple) {
      const idx = selectedValues.indexOf(value);
      if (idx > -1) {
        selectedValues.splice(idx, 1);
      } else {
        selectedValues.push(value);
      }

      Array.from(nativeSelect.options).forEach((opt) => {
        if (opt.value === value) opt.selected = selectedValues.includes(value);
      });
      nativeSelect.dispatchEvent(new Event("change"));

      if (selectedValues.length === 0) {
        trigger.querySelector(".sd-value").textContent = placeholder;
        trigger.classList.remove("sd-selected");
      } else {
        const texts = selectedValues.map((val) => {
          const opt = Array.from(nativeSelect.options).find(
            (o) => o.value === val,
          );
          return opt ? opt.textContent : val;
        });
        trigger.querySelector(".sd-value").textContent = texts.join(", ");
        trigger.classList.add("sd-selected");
      }

      allItems.forEach((it) =>
        it.classList.toggle(
          "sd-active",
          selectedValues.includes(it.dataset.value),
        ),
      );
    } else {
      selectedValues = [value];
      nativeSelect.value = value;
      nativeSelect.dispatchEvent(new Event("change"));
      trigger.querySelector(".sd-value").textContent = text;
      trigger.classList.add("sd-selected");
      allItems.forEach((it) =>
        it.classList.toggle("sd-active", it.dataset.value === value),
      );
      closePanel();
    }
  }

  // ── Search / Filter ──
  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase();
    let visibleCount = 0;
    allItems.forEach((item) => {
      const searchText = item.dataset.searchText || "";
      const match = searchText.includes(query);
      item.style.display = match ? "" : "none";
      if (match) visibleCount++;
    });
    focusedIndex = -1;
    let noResult = list.querySelector(".sd-no-result");
    if (visibleCount === 0) {
      if (!noResult) {
        noResult = document.createElement("div");
        noResult.className = "sd-no-result";
        noResult.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg> No results`;
        list.appendChild(noResult);
      }
      noResult.style.display = "";
    } else if (noResult) {
      noResult.style.display = "none";
    }
  });

  // ── Open / Close ──
  function openPanel() {
    document
      .querySelectorAll(".sd-wrapper.sd-open")
      .forEach((w) => w.classList.remove("sd-open"));
    wrapper.classList.add("sd-open");
    searchInput.value = "";
    searchInput.dispatchEvent(new Event("input"));
    focusedIndex = -1;
    setTimeout(() => searchInput.focus(), 30);
    // Scroll active item into view
    const activeItem = list.querySelector(".sd-active");
    if (activeItem) activeItem.scrollIntoView({ block: "nearest" });
  }

  function closePanel() {
    wrapper.classList.remove("sd-open");
    focusedIndex = -1;
  }

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    wrapper.classList.contains("sd-open") ? closePanel() : openPanel();
  });

  document.addEventListener("click", (e) => {
    if (!wrapper.contains(e.target)) closePanel();
  });

  // ── Keyboard Navigation ──
  searchInput.addEventListener("keydown", (e) => {
    const visible = allItems.filter((it) => it.style.display !== "none");
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusedIndex = Math.min(focusedIndex + 1, visible.length - 1);
      highlightItem(visible);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusedIndex = Math.max(focusedIndex - 1, 0);
      highlightItem(visible);
    } else if (
      e.key === "Enter" &&
      focusedIndex >= 0 &&
      visible[focusedIndex]
    ) {
      e.preventDefault();
      visible[focusedIndex].click();
    } else if (e.key === "Escape") {
      closePanel();
    }
  });

  function highlightItem(visible) {
    allItems.forEach((it) => it.classList.remove("sd-focused"));
    if (visible[focusedIndex]) {
      visible[focusedIndex].classList.add("sd-focused");
      visible[focusedIndex].scrollIntoView({ block: "nearest" });
    }
  }
}

// ─── Initialize Application ───
async function initializeApp() {
  initApp();

  // If in Edit Mode, fetch and populate
  if (IS_EDIT_MODE) {
    // Change submit button text
    const submitBtn = document.querySelector('#cvForm button[type="submit"]');
    if (submitBtn) submitBtn.textContent = "Update Profile";

    try {
      // 1. Try to use injected ResponseData from the framework (e.g. Apps4x portal)
      if (portalResponseData) {
        console.log("Using injected ResponseData for Edit Mode");
        let data = portalResponseData;
        if (data.Data) {
          data =
            typeof data.Data === "string" ? JSON.parse(data.Data) : data.Data;
        } else if (data.data) {
          data = data.data;
        }

        // Dynamically grab the Candidate ID if available (prioritize RecId from either level)
        const recordId = portalResponseData.RecId || data.RecId || portalResponseData.Id || data.Id || data.id;
        if (recordId) {
          EDIT_CANDIDATE_ID = recordId;
          console.log("Found Edit Candidate ID:", EDIT_CANDIDATE_ID);
        } else {
          console.warn("Could not find RecId or Id in the provided data");
        }

        hydrateFormData(data);
      }
      // 2. Fallback to manual API fetch for local testing
      else if (EDIT_CANDIDATE_ID) {
        const response = await fetch(
          `https://portal.mawarid.com.sa/apps4x-api/graph-api/api/v1/Integration/ProcessCandidateCVUpload/${EDIT_CANDIDATE_ID}`,
          {
            method: "GET",
            headers: API_HEADERS,
          },
        );

        if (response.ok) {
          let data = await response.json();
          if (data.Data) {
            data =
              typeof data.Data === "string" ? JSON.parse(data.Data) : data.Data;
          } else if (data.data) {
            data = data.data;
          }
          hydrateFormData(data);
        } else {
          console.error("Failed to load candidate data for edit mode.");
        }
      }
    } catch (e) {
      console.error("Error fetching/loading candidate data:", e);
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}

// ─── Edit Mode Helper ───
function hydrateFormData(data) {
  if (!data) return;

  // 1. Map Basic Fields
  const basicFields = [
    { key: "Name", id: "Name" },
    { key: "DateofBirth", id: "DateofBirth" },
    { key: "Age", id: "Age" },
    { key: "Gender", id: "Gender" },
    { key: "MaritalStatus", id: "MaritalStatus" },
    { key: "Nationality", id: "Nationality" },
    { key: "PlaceOfBirth", id: "PlaceofBirth" },
    { key: "Religion", id: "Religion" },
    { key: "NumberOfChildren", id: "Children" },
    { key: "PhoneNumber", id: "PhoneNumber" },
    { key: "PassportNumber", id: "PassportNumber" },
    { key: "Height", id: "Height" },
    { key: "Weight", id: "Weight" },
    { key: "MonthlySalary", id: "MonthlySalary" },
  ];

  basicFields.forEach((fieldMapping) => {
    let dataVal =
      data[fieldMapping.key] !== undefined
        ? data[fieldMapping.key]
        : data[
            fieldMapping.key.charAt(0).toLowerCase() + fieldMapping.key.slice(1)
          ];
    const el = document.getElementById(fieldMapping.id);

    // Format DateofBirth if it contains 'T' (e.g. 2001-04-04T00:00:00)
    if (
      fieldMapping.key === "DateofBirth" &&
      typeof dataVal === "string" &&
      dataVal.includes("T")
    ) {
      dataVal = dataVal.split("T")[0];
    }

    if (el && dataVal !== undefined && dataVal !== null) {
      el.value = dataVal;
      // If it's a searchable dropdown, update its visual UI
      const wrapper = el.closest && el.closest(".sd-wrapper");
      if (wrapper) {
        const sdValue = wrapper.querySelector(".sd-value");
        if (sdValue) {
          // If the select doesn't have the option yet, add it
          if (!el.querySelector(`option[value="${dataVal}"]`)) {
            const newOption = new Option(dataVal, dataVal, true, true);
            el.add(newOption);
          }
          el.value = dataVal;
          const selectedOption = el.options[el.selectedIndex];
          sdValue.textContent = selectedOption ? selectedOption.text : dataVal;

          // Update active state in the custom dropdown list
          const items = wrapper.querySelectorAll(".sd-item");
          items.forEach((item) => {
            item.classList.toggle(
              "sd-active",
              item.getAttribute("data-value") === String(dataVal),
            );
          });
        }
      }
    }
  });

  // 1b. Handle Images
  const profileImagePath = data.ProfileImage_Path || data.profileImage_Path;
  if (profileImagePath) {
    const profilePreview = document.getElementById("profilePreview");
    if (profilePreview) {
      const sanitizedPath = profileImagePath.replace(/\\/g, "/");
      const fullUrl = sanitizedPath.startsWith("http")
        ? sanitizedPath
        : `${IMAGE_BASE_URL}${sanitizedPath.startsWith("/") ? "" : "/"}${sanitizedPath}`;
      profilePreview.src = fullUrl;
    }
  }

  const fullSizeImagePath = data.FullSizeImage_Path || data.fullSizeImage_Path;
  if (fullSizeImagePath) {
    const fullSizePreviewImg = document.getElementById("fullSizePreviewImg");
    if (fullSizePreviewImg) {
      const sanitizedPath = fullSizeImagePath.replace(/\\/g, "/");
      const fullUrl = sanitizedPath.startsWith("http")
        ? sanitizedPath
        : `${IMAGE_BASE_URL}${sanitizedPath.startsWith("/") ? "" : "/"}${sanitizedPath}`;

      fullSizePreviewImg.src = fullUrl;
      fullSizePreviewImg.style.display = "block";

      const fullSizeDropText = document.getElementById("fullSizeDropText");
      if (fullSizeDropText) fullSizeDropText.style.display = "none";
      const fullSizeIcon = document.getElementById("fullSizeIcon");
      if (fullSizeIcon) fullSizeIcon.style.display = "none";
      const fullSizeDropArea = document.getElementById("fullSizeDropArea");
      if (fullSizeDropArea) fullSizeDropArea.style.flexDirection = "column";

      const fullSizeFileName = document.getElementById("fullSizeFileName");
      if (fullSizeFileName) {
        fullSizeFileName.textContent =
          data.FullSizeImage_Name || data.fullSizeImage_Name || "";
      }
    }
  }

  // Handle Profession (Dropdown)
  if (data.profession || data.Profession) {
    const profVal = data.profession || data.Profession;
    const profSelect = document.getElementById("Profession");
    if (profSelect) {
      if (!profSelect.querySelector(`option[value="${profVal}"]`)) {
        profSelect.add(new Option(profVal, profVal, true, true));
      }
      profSelect.value = profVal;
      const profWrapper = profSelect.closest(".sd-wrapper");
      if (profWrapper) {
        const sdValue = profWrapper.querySelector(".sd-value");
        if (sdValue) sdValue.textContent = profVal;

        const items = profWrapper.querySelectorAll(".sd-item");
        items.forEach((item) => {
          item.classList.toggle(
            "sd-active",
            item.getAttribute("data-value") === String(profVal),
          );
        });
      }
    }
  }

  // Handle Education (Multi-select)
  if (data.education || data.Education) {
    const eduVal = data.education || data.Education;
    const eduSelect = document.getElementById("EducationLevel");
    if (eduSelect) {
      const selectedValues = eduVal.split(",").map((s) => s.trim());
      selectedValues.forEach((val) => {
        if (!eduSelect.querySelector(`option[value="${val}"]`)) {
          eduSelect.add(new Option(val, val));
        }
      });
      Array.from(eduSelect.options).forEach((opt) => {
        opt.selected = selectedValues.includes(opt.value);
      });

      const eduWrapper = eduSelect.closest(".sd-wrapper");
      if (eduWrapper) {
        const sdValue = eduWrapper.querySelector(".sd-value");
        const sdList = eduWrapper.querySelector(".sd-list");
        if (sdValue) sdValue.textContent = eduVal;
        if (sdList) {
          const items = sdList.querySelectorAll(".sd-item");
          items.forEach((item) => {
            const itemVal = item.getAttribute("data-value");
            item.classList.toggle(
              "sd-active",
              selectedValues.includes(itemVal),
            );
          });
        }
      }
    }
  }

  // 2. Handle Dynamic Collections

  // Skills
  const skillsData = data.skills || data.Skills;
  if (skillsData && Array.isArray(skillsData)) {
    const container = document.getElementById("skillsContainer");
    const addBtn = document.getElementById("addSkillBtn");
    if (container && addBtn) {
      container.innerHTML = ""; // Clear default rows
      skillsData.forEach((skill) => {
        addBtn.click();
        const row = container.lastElementChild;
        if (row) {
          const input = row.querySelector('[name="SkillName[]"]');
          // Handle string array or object array gracefully
          const skillVal =
            typeof skill === "string"
              ? skill
              : skill.skillName || skill.SkillName || "";
          if (input) input.value = skillVal;
        }
      });
    }
  }

  // Languages
  const langData = data.languages || data.Languages;
  if (langData && Array.isArray(langData)) {
    const container = document.getElementById("languagesContainer");
    const addBtn = document.getElementById("addLanguageBtn");
    if (container && addBtn) {
      container.innerHTML = "";
      langData.forEach((lang) => {
        addBtn.click();
        const row = container.lastElementChild;
        if (row) {
          const nameInput = row.querySelector('[name="Language[]"]');
          const profSelect = row.querySelector(
            '[name="LanguageProficiency[]"]',
          ); // Or 'Proficiency[]'
          const profInputAlternative = row.querySelector(
            '[name="Proficiency[]"]',
          );

          const profEl = profSelect || profInputAlternative;
          const langNameVal =
            lang.LanguageName || lang.languageName || lang.language || "";
          const profVal = lang.Proficiency || lang.proficiency || "";

          if (nameInput) nameInput.value = langNameVal;
          if (profEl) {
            profEl.value = profVal;
            const wrapper = profEl.closest && profEl.closest(".sd-wrapper");
            if (wrapper) {
              const sdValue = wrapper.querySelector(".sd-value");
              if (sdValue)
                sdValue.textContent = profVal || "Select Proficiency";
            }
          }
        }
      });
    }
  }

  // Experience
  const expData = data.experiences || data.Experiences;
  if (expData && Array.isArray(expData)) {
    const container = document.getElementById("experienceContainer");
    const addBtn = document.getElementById("addExperienceBtn");
    if (container && addBtn) {
      container.innerHTML = "";
      expData.forEach((exp) => {
        addBtn.click();
        const row = container.lastElementChild;
        if (row) {
          const workplace = row.querySelector('[name="Workplace[]"]');
          const duration = row.querySelector('[name="Experienceduration[]"]'); // Name differs slightly in HTML
          const country = row.querySelector('[name="Country[]"]');
          const position = row.querySelector('[name="ExpPosition[]"]'); // Or Position[]
          const roles = row.querySelector('[name="Roles[]"]');

          if (workplace) workplace.value = exp.Workplace || exp.workplace || "";
          if (duration)
            duration.value =
              exp.ExperienceDuration ||
              exp.experienceDuration ||
              exp.duration ||
              "";
          if (position) position.value = exp.Position || exp.position || "";
          if (roles) roles.value = exp.Roles || exp.roles || "";

          if (country) {
            const countryVal = exp.Country || exp.country || "";
            if (
              countryVal &&
              !country.querySelector(`option[value="${countryVal}"]`)
            ) {
              country.add(new Option(countryVal, countryVal, true, true));
            }
            country.value = countryVal;
            const wrapper = country.closest && country.closest(".sd-wrapper");
            if (wrapper) {
              const sdValue = wrapper.querySelector(".sd-value");
              if (sdValue) sdValue.textContent = countryVal || "Select";

              const items = wrapper.querySelectorAll(".sd-item");
              items.forEach((item) => {
                item.classList.toggle(
                  "sd-active",
                  item.getAttribute("data-value") === String(countryVal),
                );
              });
            }
          }
        }
      });
    }
  }
}
