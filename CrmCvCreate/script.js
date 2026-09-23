// Dynamically inject SweetAlert2 if not already present
if (typeof Swal === "undefined") {
  const scriptSwal = document.createElement("script");
  scriptSwal.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11";
  document.head.appendChild(scriptSwal);
}

let _this = this;
let portalResponseData = _this ? _this.ParentData || _this.ResponseData : null;
let portalRecordId = null;
if (portalResponseData) {
  let dataObj = portalResponseData;
  if (dataObj.Data) {
    dataObj =
      typeof dataObj.Data === "string"
        ? JSON.parse(dataObj.Data)
        : dataObj.Data;
  }
  portalRecordId =
    dataObj.mediationLaborId ||
    dataObj.RecId ||
    dataObj.id ||
    dataObj.recId ||
    null;
}

// Mode Configuration (Create vs Update)
let IS_EDIT_MODE = portalResponseData ? true : false;
let EDIT_CANDIDATE_ID = portalRecordId || null;
const IMAGE_BASE_URL = "https://portal.mawarid.com.sa/apps4x-api";

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
    "eyJhbGciOiJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzA0L3htbGRzaWctbW9yZSNobWFjLXNoYTI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VySWQiOiJhLmh5ZGVyIiwiTmFtZSI6Ikh5ZGVyIEFsaSBBIiwiRW1haWwiOiJoeWRlckBmYWF6dGVjaHNvbHV0aW9ucy5jb20iLCJNb2JpbGVOdW1iZXIiOiI5OTQzMjIxMzIxIiwiQ29tcGFueUlkIjoiTEdFMDAwMDAwMSIsImV4cCI6MTc5MDE1ODA1OCwiaXNzIjoiYXBwczR4LmNvbSIsImF1ZCI6ImFwcHM0eC5jb20ifQ.cBBS6mQjlTSKd2ZqJ5E3Wu91NvEtCpjzeMGNLNRaIYE";
  userId = "a.hyder";
  companyId = "LGE0000001";
}

const API_HEADERS = {
  accept: "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9",
  appid: "bf053c91ba5c42b48c9f96d0a8450e79",
  authorization: token ? `Bearer ${token}` : "",
  companyid: companyId || "LGE0000001",
  "user-id": userId || "a.hyder",
};

// Helper: Close Popup / Modal across Portal environments
function closeCurrentPopup() {
  try {
    // Helper function to dismiss a modal element
    const dismissModalElement = (modal) => {
      if (!modal) return false;

      // Try clicking header close button
      const closeBtn = modal.querySelector(
        '.modal-header button, .modal-header .close, .modal-header [class*="close"], .modal-header i, .modal-header span, [data-bs-dismiss="modal"]',
      );
      if (closeBtn) {
        try {
          closeBtn.click();
        } catch (e) {}
      }

      // Remove modal visibility classes and set display: none !important
      modal.classList.remove("d-block", "show", "open", "d", "block");
      modal.style.setProperty("display", "none", "important");

      // Hide parent host element (e.g. <dynamic_widget>) if present
      if (
        modal.parentElement &&
        modal.parentElement.tagName.toLowerCase().includes("widget")
      ) {
        modal.parentElement.style.setProperty("display", "none", "important");
      }
      return true;
    };

    // 1. Search in parent window document (when embedded inside iframe/portal host)
    try {
      if (window.parent && window.parent.document) {
        const parentModals = window.parent.document.querySelectorAll(
          '[id^="DynamicWidget_"], .modal.d-block, .modal',
        );
        parentModals.forEach((m) => dismissModalElement(m));
      }
    } catch (e) {
      console.log("Parent document search:", e);
    }

    // 2. Search in local document
    const localModals = document.querySelectorAll(
      '[id^="DynamicWidget_"], .modal.d-block, .modal',
    );
    localModals.forEach((m) => dismissModalElement(m));

    const formContainer = document.querySelector(".crmcvcreate");
    if (formContainer) {
      const modal =
        formContainer.closest('[id^="DynamicWidget_"]') ||
        formContainer.closest(".modal");
      if (modal) dismissModalElement(modal);
    }

    // 3. Portal Host Component / Service closeModal Callbacks
    if (_this && typeof _this.closeModal === "function") {
      _this.closeModal();
    } else if (
      _this &&
      _this.globalService &&
      typeof _this.globalService.closeModal === "function"
    ) {
      _this.globalService.closeModal();
    } else if (
      window.parent &&
      typeof window.parent.closeModal === "function"
    ) {
      window.parent.closeModal();
    } else if (
      window.parent &&
      typeof window.parent.closePopup === "function"
    ) {
      window.parent.closePopup();
    } else if (
      window.parent &&
      typeof window.parent.closeDialog === "function"
    ) {
      window.parent.closeDialog();
    } else if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "CLOSE_POPUP", success: true }, "*");
    }
  } catch (err) {
    console.log("Close popup attempt error:", err);
  }
}

// Dataset Objects
const DROPDOWN_DATA = {
  genders: [
    { typeNameAR: "ذكر", typeNameEn: "Male", typeValue: "1" },
    { typeNameAR: "أنثى", typeNameEn: "Female", typeValue: "2" },
    { typeNameAR: "أي", typeNameEn: "Any", typeValue: "3" },
  ],
  religions: [
    { typeNameAR: "مسلم", typeNameEn: "Muslim", typeValue: "1" },
    { typeNameAR: "مسيحي", typeNameEn: "Christian", typeValue: "2" },
    { typeNameAR: "أخرى", typeNameEn: "Other", typeValue: "3" },
  ],
  insuranceLevels: [
    { typeNameAR: "VIP", typeNameEn: "VIP", typeValue: "1" },
    { typeNameAR: "A+", typeNameEn: "A+", typeValue: "2" },
    { typeNameAR: "A", typeNameEn: "A", typeValue: "3" },
    { typeNameAR: "B+", typeNameEn: "B+", typeValue: "4" },
    { typeNameAR: "B", typeNameEn: "B", typeValue: "5" },
    { typeNameAR: "C", typeNameEn: "C", typeValue: "6" },
  ],
  educationLevels: [
    { typeNameAR: "نعم", typeNameEn: "Yes", typeValue: "yes" },
    { typeNameAR: "لا", typeNameEn: "No", typeValue: "no" },
  ],
  nationalities: [
    {
      typeNameAR: "الفلبين",
      typeNameEn: "Philippines",
      typeValue: "82a21413-fb48-eb11-a812-000d3ada5366",
    },
    {
      typeNameAR: "أفريقيا",
      typeNameEn: "Africa",
      typeValue: "62ffd845-4920-ec11-b6e5-000d3ade66d9",
    },
    {
      typeNameAR: "إثيوبيا",
      typeNameEn: "Ethiopia",
      typeValue: "e2d5ce4f-f0c8-eb11-8235-0022489aa021",
    },
    {
      typeNameAR: "إندونيسيا",
      typeNameEn: "Indonesia",
      typeValue: "e6d5ce4f-f0c8-eb11-8235-0022489aa021",
    },
    {
      typeNameAR: "كينيا",
      typeNameEn: "Kenya",
      typeValue: "e8d5ce4f-f0c8-eb11-8235-0022489aa021",
    },
    {
      typeNameAR: "اوغندا",
      typeNameEn: "Uganda",
      typeValue: "eed5ce4f-f0c8-eb11-8235-0022489aa021",
    },
    {
      typeNameAR: "شرق أسيا",
      typeNameEn: "East Asia",
      typeValue: "85d572d0-cf72-f111-ab0e-7ced8d428a6a",
    },
    {
      typeNameAR: "أفريقيا /أخرى",
      typeNameEn: "Africa/ Other",
      typeValue: "727f74fb-cf72-f111-ab0e-7ced8d428a6a",
    },
  ],
  services: [
    {
      typeNameAR: "عاملة منزلية",
      typeNameEn: "Housekeeper / Housemaid",
      typeValue: "100000024",
    },
    {
      typeNameAR: "مربية أطفال",
      typeNameEn: "Nanny / Child Caregiver",
      typeValue: "100000025",
    },
    {
      typeNameAR: "رعاية كبار السن",
      typeNameEn: "Elderly Caregiver",
      typeValue: "100000026",
    },
    {
      typeNameAR: "ممرضة منزلية",
      typeNameEn: "Home Nurse",
      typeValue: "100000027",
    },
    {
      typeNameAR: "سائق خاص",
      typeNameEn: "Private Driver",
      typeValue: "100000028",
    },
    {
      typeNameAR: "طباخ خاص",
      typeNameEn: "Private Cook",
      typeValue: "100000029",
    },
  ],
  statuses: [
    {
      typeNameAR: "جاهز للبيع",
      typeNameEn: "Ready for Sales",
      typeValue: "1",
    },
    {
      typeNameAR: "على رأس العمل",
      typeNameEn: "On Duty",
      typeValue: "100000000",
    },
    {
      typeNameAR: "فشل في التوظيف",
      typeNameEn: "Failed in Recruitment",
      typeValue: "100000001",
    },
    {
      typeNameAR: "ملغي",
      typeNameEn: "Cancelled",
      typeValue: "100000002",
    },
    {
      typeNameAR: "محجوز",
      typeNameEn: "Reserved",
      typeValue: "100000003",
    },
    {
      typeNameAR: "قيد التوظيف",
      typeNameEn: "Pending Recruitment",
      typeValue: "100000004",
    },
    {
      typeNameAR: "مرفوض من التوظيف",
      typeNameEn: "Rejected by Recruitment",
      typeValue: "100000005",
    },
    {
      typeNameAR: "غير نشط",
      typeNameEn: "Inactive",
      typeValue: "2",
    },
  ],
};

// Helper: Extract English and Arabic Descriptions for single or multiselect dropdown values
function getDropdownDescriptions(value, dataset) {
  if (!value || !dataset || !Array.isArray(dataset))
    return { en: null, ar: null };
  const vals = String(value)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const enArr = [];
  const arArr = [];
  vals.forEach((val) => {
    const item = dataset.find((i) => String(i.typeValue) === val);
    if (item) {
      if (item.typeNameEn) enArr.push(item.typeNameEn);
      if (item.typeNameAR) arArr.push(item.typeNameAR);
    }
  });
  return {
    en: enArr.length > 0 ? enArr.join(", ") : null,
    ar: arArr.length > 0 ? arArr.join(", ") : null,
  };
}

// Helper: Programmatically set Custom Dropdown Value
function setCustomDropdownValue(wrapperId, hiddenInputId, val, items) {
  const wrap = document.getElementById(wrapperId);
  const hiddenInput = document.getElementById(hiddenInputId);
  if (!wrap || !hiddenInput) return;
  hiddenInput.value = val;
  const trigger = wrap.querySelector(".custom-dropdown-trigger");
  const valSpan = trigger.querySelector(".dropdown-trigger-val");
  const matched = items.find(
    (i) => (typeof i === "string" ? i : i.typeValue) == val,
  );
  if (matched && valSpan) {
    let en = typeof matched === "string" ? matched : matched.typeNameEn;
    let ar = typeof matched === "string" ? "" : matched.typeNameAR;
    valSpan.innerHTML = `${en} ${ar ? `<span style="color:#64748B; font-weight:600; margin-left:6px;">- ${ar}</span>` : ""}`;
    valSpan.classList.remove("dropdown-trigger-placeholder");
  }
}

// Single-Select Bilingual Dropdown Initializer
function initCustomBilingualDropdown(
  wrapperId,
  listContainerId,
  hiddenInputId,
  items,
  placeholder,
) {
  const wrap = document.getElementById(wrapperId);
  const listEl = document.getElementById(listContainerId);
  const hiddenInput = document.getElementById(hiddenInputId);
  if (!wrap || !listEl || !hiddenInput) return;

  const trigger = wrap.querySelector(".custom-dropdown-trigger");
  const valSpan = trigger.querySelector(".dropdown-trigger-val");
  const searchInput = wrap.querySelector(".dropdown-search-box input");

  function renderItems(filter = "") {
    listEl.innerHTML = "";
    items.forEach((item) => {
      let en = item.typeNameEn;
      let ar = item.typeNameAR;
      let val = item.typeValue;

      if (filter) {
        const term = filter.toLowerCase();
        if (
          !en.toLowerCase().includes(term) &&
          !ar.toLowerCase().includes(term)
        ) {
          return;
        }
      }

      const div = document.createElement("div");
      div.className = "dropdown-option-item";
      if (hiddenInput.value == val) div.classList.add("selected");

      div.innerHTML = `
                <span class="opt-en">${en}</span>
                <span class="opt-ar">${ar}</span>
            `;

      div.addEventListener("click", (e) => {
        e.stopPropagation();
        hiddenInput.value = val;
        valSpan.innerHTML = `${en} <span style="color:#64748B; font-weight:600; margin-left:6px;">- ${ar}</span>`;
        valSpan.classList.remove("dropdown-trigger-placeholder");

        listEl
          .querySelectorAll(".dropdown-option-item")
          .forEach((el) => el.classList.remove("selected"));
        div.classList.add("selected");
        wrap.classList.remove("open");
      });

      listEl.appendChild(div);
    });
  }

  renderItems();

  if (searchInput) {
    searchInput.addEventListener("input", (e) => renderItems(e.target.value));
    searchInput.addEventListener("click", (e) => e.stopPropagation());
  }

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    document.querySelectorAll(".custom-dropdown-wrap").forEach((w) => {
      if (w !== wrap) w.classList.remove("open");
    });
    wrap.classList.toggle("open");
    if (wrap.classList.contains("open") && searchInput) {
      setTimeout(() => searchInput.focus(), 50);
    }
  });
}

// MULTISELECT Service Dropdown Initializer
function initCustomMultiselectDropdown(
  wrapperId,
  listContainerId,
  hiddenInputId,
  items,
  placeholder,
) {
  const wrap = document.getElementById(wrapperId);
  const listEl = document.getElementById(listContainerId);
  const hiddenInput = document.getElementById(hiddenInputId);
  const tagsContainer = document.getElementById("serviceTriggerTags");
  if (!wrap || !listEl || !hiddenInput || !tagsContainer) return;

  const trigger = wrap.querySelector(".custom-dropdown-trigger");
  const searchInput = wrap.querySelector(".dropdown-search-box input");
  let selectedValues = [];

  function updateTriggerTags() {
    tagsContainer.innerHTML = "";
    if (selectedValues.length === 0) {
      tagsContainer.textContent = placeholder;
      tagsContainer.classList.add("dropdown-trigger-placeholder");
      hiddenInput.value = "";
    } else {
      tagsContainer.classList.remove("dropdown-trigger-placeholder");
      hiddenInput.value = selectedValues.join(",");

      selectedValues.forEach((val) => {
        const matched = items.find((i) => i.typeValue == val);
        const tag = document.createElement("span");
        tag.className = "multiselect-tag";
        tag.innerHTML = `
                    <span>${matched ? matched.typeNameEn.split("/")[0].trim() : val}</span>
                    <i class="fa-solid fa-xmark tag-remove"></i>
                `;
        tag.querySelector(".tag-remove").addEventListener("click", (e) => {
          e.stopPropagation();
          selectedValues = selectedValues.filter((v) => v !== val);
          updateTriggerTags();
          renderItems(searchInput ? searchInput.value : "");
        });
        tagsContainer.appendChild(tag);
      });
    }
  }

  window._setServiceMultiselectValues = function (vals) {
    selectedValues = Array.isArray(vals)
      ? vals.map((v) => String(v).trim())
      : String(vals)
          .split(",")
          .map((v) => v.trim());
    updateTriggerTags();
    renderItems();
  };

  function renderItems(filter = "") {
    listEl.innerHTML = "";
    items.forEach((item) => {
      let en = item.typeNameEn;
      let ar = item.typeNameAR;
      let val = item.typeValue;

      if (filter) {
        const term = filter.toLowerCase();
        if (
          !en.toLowerCase().includes(term) &&
          !ar.toLowerCase().includes(term)
        ) {
          return;
        }
      }

      const isSelected = selectedValues.includes(val);
      const div = document.createElement("div");
      div.className = `dropdown-option-item ${isSelected ? "selected" : ""}`;

      div.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px;">
                    <i class="fa-solid ${isSelected ? "fa-square-check" : "fa-square"}" style="color:${isSelected ? "#F8B633" : "#CBD5E1"}"></i>
                    <span class="opt-en">${en}</span>
                </div>
                <span class="opt-ar">${ar}</span>
            `;

      div.addEventListener("click", (e) => {
        e.stopPropagation();
        if (selectedValues.includes(val)) {
          selectedValues = selectedValues.filter((v) => v !== val);
        } else {
          selectedValues.push(val);
        }
        updateTriggerTags();
        renderItems(filter);
      });

      listEl.appendChild(div);
    });
  }

  renderItems();

  if (searchInput) {
    searchInput.addEventListener("input", (e) => renderItems(e.target.value));
    searchInput.addEventListener("click", (e) => e.stopPropagation());
  }

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    document.querySelectorAll(".custom-dropdown-wrap").forEach((w) => {
      if (w !== wrap) w.classList.remove("open");
    });
    wrap.classList.toggle("open");
    if (wrap.classList.contains("open") && searchInput) {
      setTimeout(() => searchInput.focus(), 50);
    }
  });
}

// ─── Main Application Initializer ───
function initializeApp() {
  // Initialize Custom Dropdowns
  initCustomBilingualDropdown(
    "ddGender",
    "listGender",
    "Gender",
    DROPDOWN_DATA.genders,
    "Select Gender",
  );
  initCustomBilingualDropdown(
    "ddReligion",
    "listReligion",
    "Religion",
    DROPDOWN_DATA.religions,
    "Select Religion",
  );
  initCustomBilingualDropdown(
    "ddInsurance",
    "listInsurance",
    "insuranceLevel",
    DROPDOWN_DATA.insuranceLevels,
    "Select Insurance",
  );
  initCustomBilingualDropdown(
    "ddEducation",
    "listEducation",
    "educationLevel",
    DROPDOWN_DATA.educationLevels,
    "Select Education",
  );
  initCustomBilingualDropdown(
    "ddNationality",
    "listNationality",
    "Nationality",
    DROPDOWN_DATA.nationalities,
    "Select Nationality",
  );
  initCustomMultiselectDropdown(
    "ddService",
    "listService",
    "service",
    DROPDOWN_DATA.services,
    "Select Services / اختر الخدمات",
  );

  // Close Dropdowns on outside click
  document.addEventListener("click", () => {
    document
      .querySelectorAll(".custom-dropdown-wrap")
      .forEach((w) => w.classList.remove("open"));
  });

  // Form & Upload Elements
  const form = document.getElementById("crmCvForm");
  const nameInput = document.getElementById("Name");
  const dobInput = document.getElementById("DateofBirth");
  const ageInput = document.getElementById("Age");
  const avatarInitials = document.getElementById("avatarInitials");
  const profileImagePreview = document.getElementById("profileImagePreview");
  const profileImageInput = document.getElementById("ProfileImage");

  const fullSizeInputUpload = document.getElementById("FullSizeImage");
  const fullSizeFileName = document.getElementById("fullSizeFileName");
  const fullSizePreviewImg = document.getElementById("fullSizePreviewImg");
  const fullSizeDropText = document.getElementById("fullSizeDropText");
  const fullSizeIcon = document.getElementById("fullSizeIcon");
  const fullSizeDropArea = document.getElementById("fullSizeDropArea");
  const toastWrap = document.getElementById("toastWrap");

  // Age Auto Calculation
  if (dobInput) {
    dobInput.addEventListener("change", (e) => {
      if (e.target.value) {
        const dob = new Date(e.target.value);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        if (ageInput) ageInput.value = age > 0 ? age : 0;
      } else {
        if (ageInput) ageInput.value = "";
      }
    });
  }

  // Name Initials Generator
  if (nameInput) {
    nameInput.addEventListener("input", (e) => {
      const val = e.target.value.trim();
      if (
        val &&
        profileImagePreview &&
        profileImagePreview.style.display === "none"
      ) {
        const parts = val.split(" ");
        let initials = parts[0][0] || "U";
        if (parts.length > 1 && parts[1][0]) {
          initials += parts[1][0];
        }
        if (avatarInitials) avatarInitials.textContent = initials.toUpperCase();
      }
    });
  }

  // Profile Image Upload Preview
  if (profileImageInput) {
    profileImageInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (evt) {
          if (profileImagePreview) {
            profileImagePreview.src = evt.target.result;
            profileImagePreview.style.display = "block";
          }
          if (avatarInitials) avatarInitials.style.display = "none";
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Full Size Image Preview
  if (fullSizeInputUpload && fullSizeFileName) {
    fullSizeInputUpload.onchange = function () {
      if (this.files && this.files.length > 0) {
        fullSizeFileName.textContent = this.files[0].name;
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
    };
  }

  // Toast Helper
  function showToast(msg, isError = false) {
    if (!toastWrap) return;
    const toast = document.createElement("div");
    toast.className = "toast-msg";
    toast.innerHTML = `<i class="fa-solid ${isError ? "fa-circle-xmark" : "fa-circle-check"}" style="color:${isError ? "#EF4444" : "#F8B633"}"></i> <span>${msg}</span>`;
    toastWrap.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  // Form Submission for CRM API Create with Loading & Auto-Close Popup
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const saveBtn = form.querySelector(".btn-save-profile");
      const originalBtnHtml = saveBtn
        ? saveBtn.innerHTML
        : IS_EDIT_MODE
          ? "Update Profile"
          : "Save Profile";

      // 1. Set Loading State on Submit Button
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> ${IS_EDIT_MODE ? "Updating..." : "Saving..."}`;
      }

      const profileFile = profileImageInput ? profileImageInput.files[0] : null;
      const fullSizeFile = fullSizeInputUpload
        ? fullSizeInputUpload.files[0]
        : null;

      const nationalityVal = document.getElementById("Nationality")
        ? document.getElementById("Nationality").value
        : null;
      const insuranceVal = document.getElementById("insuranceLevel")
        ? document.getElementById("insuranceLevel").value
        : null;
      const serviceVal = document.getElementById("service")
        ? document.getElementById("service").value
        : null;
      const statusVal = document.getElementById("Status")
        ? document.getElementById("Status").value
        : "100000004";

      const natDesc = getDropdownDescriptions(
        nationalityVal,
        DROPDOWN_DATA.nationalities,
      );
      const insDesc = getDropdownDescriptions(
        insuranceVal,
        DROPDOWN_DATA.insuranceLevels,
      );
      const srvDesc = getDropdownDescriptions(
        serviceVal,
        DROPDOWN_DATA.services,
      );
      const stDesc = getDropdownDescriptions(statusVal, DROPDOWN_DATA.statuses);

      // Format birthDate to ISO string if provided
      let formattedBirthDate = null;
      if (dobInput && dobInput.value) {
        const d = new Date(dobInput.value);
        formattedBirthDate = !isNaN(d.getTime())
          ? d.toISOString()
          : dobInput.value;
      }

      // Format passportExpiryDate to ISO string if provided
      let formattedPassportExpiry = null;
      const passportExpiryEl = document.getElementById("PassportExpiryDate");
      if (passportExpiryEl && passportExpiryEl.value) {
        const d = new Date(passportExpiryEl.value);
        formattedPassportExpiry = !isNaN(d.getTime())
          ? d.toISOString()
          : passportExpiryEl.value;
      }

      // Parse service string to array of numbers
      let serviceArr = [];
      if (serviceVal) {
        serviceArr = String(serviceVal)
          .split(",")
          .map((v) => parseInt(v.trim(), 10))
          .filter((n) => !isNaN(n));
      }

      const genderVal = document.getElementById("Gender")
        ? document.getElementById("Gender").value
        : null;
      const religionVal = document.getElementById("Religion")
        ? document.getElementById("Religion").value
        : null;
      const expectedSalaryVal = document.getElementById("expectedSalary")
        ? document.getElementById("expectedSalary").value
        : null;
      const yearsExpVal = document.getElementById("YearsOfExperience")
        ? document.getElementById("YearsOfExperience").value
        : null;

      const modelData = {
        passportNumber: document.getElementById("PassportNumber")
          ? document.getElementById("PassportNumber").value
          : null,
        nationalityId: nationalityVal,
        Nationality_Des: natDesc.en,
        Nationality_DesAr: natDesc.ar,
        expectedSalary:
          expectedSalaryVal !== null && expectedSalaryVal !== ""
            ? parseFloat(expectedSalaryVal)
            : 0,
        gender:
          genderVal !== null && genderVal !== ""
            ? parseInt(genderVal, 10)
            : null,
        birthDate: formattedBirthDate,
        name: nameInput ? nameInput.value : null,
        religion:
          religionVal !== null && religionVal !== ""
            ? parseInt(religionVal, 10)
            : null,
        insuranceLevel:
          insuranceVal !== null && insuranceVal !== ""
            ? parseInt(insuranceVal, 10)
            : null,
        insuranceLevel_Desc: insDesc.en,
        insuranceLevel_DescAr: insDesc.ar,
        educationLevel: document.getElementById("educationLevel")
          ? document.getElementById("educationLevel").value
          : "yes",
        service: serviceArr,
        service_Desc: srvDesc.en,
        service_DescAr: srvDesc.ar,
        canSpeakArabic: document.getElementById("canSpeakArabic")
          ? document.getElementById("canSpeakArabic").checked
          : false,
        speakEnglish: document.getElementById("speakEnglish")
          ? document.getElementById("speakEnglish").checked
          : false,
        takeCareOfChildren: document.getElementById("takeCareOfChildren")
          ? document.getElementById("takeCareOfChildren").checked
          : false,
        takeCareOfElders: document.getElementById("takeCareOfElders")
          ? document.getElementById("takeCareOfElders").checked
          : false,
        takeCareOfInfants: document.getElementById("takeCareOfInfants")
          ? document.getElementById("takeCareOfInfants").checked
          : false,
        takeCareOfHandicap: document.getElementById("takeCareOfHandicap")
          ? document.getElementById("takeCareOfHandicap").checked
          : false,
        yearsOfExperience:
          yearsExpVal !== null && yearsExpVal !== ""
            ? parseFloat(yearsExpVal)
            : 0,
        passportExpiryDate: formattedPassportExpiry,
        Status: statusVal
          ? isNaN(parseInt(statusVal, 10))
            ? statusVal
            : parseInt(statusVal, 10)
          : 100000004,
        Status_Desc: stDesc.en,
        Status_DescAr: stDesc.ar,
      };

      const formData = new FormData();
      formData.append("modelData", JSON.stringify(modelData));
      if (profileFile)
        formData.append("profileImage", profileFile, profileFile.name);
      if (fullSizeFile)
        formData.append("fullSizeImage", fullSizeFile, fullSizeFile.name);

      let targetUrl =
        "https://portal.mawarid.com.sa/apps4x-api/graph-api/api/v1/Integration/createCandidateCVSingleInSystemAndCRM";
      let targetMethod = "POST";

      if (IS_EDIT_MODE && EDIT_CANDIDATE_ID) {
        targetUrl = `https://portal.mawarid.com.sa/apps4x-api/graph-api/api/v1/Integration/ProcessCandidateCVUpload/${EDIT_CANDIDATE_ID}`;
        targetMethod = "PUT";

        modelData.RecId = EDIT_CANDIDATE_ID;
        modelData.Id = EDIT_CANDIDATE_ID;
        modelData.recId = EDIT_CANDIDATE_ID;
        modelData.id = EDIT_CANDIDATE_ID;
      }

      console.log(
        `modelData JSON Payload for ${IS_EDIT_MODE ? "Update" : "Create"} Candidate CV API:`,
        modelData,
      );

      try {
        showToast(
          `${IS_EDIT_MODE ? "Updating" : "Saving"} candidate "${modelData.name || "Candidate"}"...`,
        );

        const response = await fetch(targetUrl, {
          method: targetMethod,
          headers: API_HEADERS,
          body: formData,
        });

        if (response.ok) {
          const resJson = await response.json();
          console.log("API Response:", resJson);
          const successMsg = `Candidate CV for "${modelData.name || "Candidate"}" ${IS_EDIT_MODE ? "updated" : "created"} successfully!`;
          showToast(successMsg);

          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<i class="fa fa-check"></i> ${IS_EDIT_MODE ? "Updated!" : "Saved!"}`;
          }

          if (typeof Swal !== "undefined") {
            Swal.fire({
              icon: "success",
              title: "Success",
              text: successMsg,
              confirmButtonText: "OK",
              confirmButtonColor: "#F8B633",
            }).then(() => {
              closeCurrentPopup();
              if (saveBtn) {
                saveBtn.innerHTML = originalBtnHtml;
              }
            });
          } else {
            setTimeout(() => {
              closeCurrentPopup();
              if (saveBtn) {
                saveBtn.innerHTML = originalBtnHtml;
              }
            }, 1200);
          }
        } else {
          const errMsg = `Failed to ${IS_EDIT_MODE ? "update" : "save"} candidate profile.`;
          showToast(errMsg, true);
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalBtnHtml;
          }
          if (typeof Swal !== "undefined") {
            Swal.fire({
              icon: "error",
              title: "Error",
              text: errMsg,
              confirmButtonText: "OK",
              confirmButtonColor: "#EF4444",
            });
          }
        }
      } catch (err) {
        console.error("API Call error / fallback:", err);
        const errMsg = `An error occurred while ${IS_EDIT_MODE ? "updating" : "saving"} candidate profile.`;
        showToast(errMsg, true);
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = originalBtnHtml;
        }
        if (typeof Swal !== "undefined") {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: errMsg,
            confirmButtonText: "OK",
            confirmButtonColor: "#EF4444",
          });
        }
      }
    });
  }

  // Edit Mode Data Hydration Helper
  if (IS_EDIT_MODE) {
    const saveBtn = document.querySelector(".btn-save-profile");
    if (saveBtn) saveBtn.textContent = "Update Profile";

    if (portalResponseData) {
      hydrateFormData(portalResponseData);
    }
  }
}

// Robust ReadyState Execution Helper
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}

// Edit Mode Data Hydration Implementation
function hydrateFormData(portalData) {
  if (!portalData) return;

  let data = portalData;
  if (data.Data) {
    data = typeof data.Data === "string" ? JSON.parse(data.Data) : data.Data;
  }

  const candidateName = data.name || data.Name;
  if (candidateName && document.getElementById("Name"))
    document.getElementById("Name").value = candidateName;

  const dobVal = data.birthDate || data.DateofBirth;
  if (dobVal && document.getElementById("DateofBirth")) {
    const rawDate =
      typeof dobVal === "string" && dobVal.includes("T")
        ? dobVal.split("T")[0]
        : dobVal;
    document.getElementById("DateofBirth").value = rawDate;
    const dob = new Date(dobVal);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    if (document.getElementById("Age"))
      document.getElementById("Age").value = age > 0 ? age : 0;
  }

  const passNum = data.passportNumber || data.PassportNumber;
  if (passNum && document.getElementById("PassportNumber"))
    document.getElementById("PassportNumber").value = passNum;

  const passExp = data.passportExpiryDate || data.PassportExpiryDate;
  if (passExp && document.getElementById("PassportExpiryDate")) {
    const rawExp =
      typeof passExp === "string" && passExp.includes("T")
        ? passExp.split("T")[0]
        : passExp;
    document.getElementById("PassportExpiryDate").value = rawExp;
  }

  const expSal =
    data.expectedSalary !== undefined
      ? data.expectedSalary
      : data.ExpectedSalary;
  if (
    expSal !== undefined &&
    expSal !== null &&
    document.getElementById("expectedSalary")
  )
    document.getElementById("expectedSalary").value = expSal;

  const yrsExp =
    data.yearsOfExperience !== undefined
      ? data.yearsOfExperience
      : data.YearsOfExperience;
  if (
    yrsExp !== undefined &&
    yrsExp !== null &&
    document.getElementById("YearsOfExperience")
  )
    document.getElementById("YearsOfExperience").value = yrsExp;

  if (data.Status && document.getElementById("Status"))
    document.getElementById("Status").value = data.Status;

  const genVal = data.gender !== undefined ? data.gender : data.Gender;
  if (genVal !== undefined && genVal !== null)
    setCustomDropdownValue("ddGender", "Gender", genVal, DROPDOWN_DATA.genders);

  const relVal = data.religion !== undefined ? data.religion : data.Religion;
  if (relVal !== undefined && relVal !== null)
    setCustomDropdownValue(
      "ddReligion",
      "Religion",
      relVal,
      DROPDOWN_DATA.religions,
    );

  const natId = data.nationalityId || data.Nationality;
  if (natId)
    setCustomDropdownValue(
      "ddNationality",
      "Nationality",
      natId,
      DROPDOWN_DATA.nationalities,
    );

  if (data.insuranceLevel !== undefined && data.insuranceLevel !== null)
    setCustomDropdownValue(
      "ddInsurance",
      "insuranceLevel",
      data.insuranceLevel,
      DROPDOWN_DATA.insuranceLevels,
    );
  if (data.educationLevel)
    setCustomDropdownValue(
      "ddEducation",
      "educationLevel",
      data.educationLevel,
      DROPDOWN_DATA.educationLevels,
    );

  if (data.service && window._setServiceMultiselectValues) {
    const serviceArr =
      typeof data.service === "string" ? data.service.split(",") : data.service;
    window._setServiceMultiselectValues(serviceArr);
  }

  if (
    data.canSpeakArabic !== undefined &&
    document.getElementById("canSpeakArabic")
  )
    document.getElementById("canSpeakArabic").checked = Boolean(
      data.canSpeakArabic,
    );
  if (
    data.speakEnglish !== undefined &&
    document.getElementById("speakEnglish")
  )
    document.getElementById("speakEnglish").checked = Boolean(
      data.speakEnglish,
    );
  if (
    data.takeCareOfChildren !== undefined &&
    document.getElementById("takeCareOfChildren")
  )
    document.getElementById("takeCareOfChildren").checked = Boolean(
      data.takeCareOfChildren,
    );
  if (
    data.takeCareOfInfants !== undefined &&
    document.getElementById("takeCareOfInfants")
  )
    document.getElementById("takeCareOfInfants").checked = Boolean(
      data.takeCareOfInfants,
    );
  if (
    data.takeCareOfElders !== undefined &&
    document.getElementById("takeCareOfElders")
  )
    document.getElementById("takeCareOfElders").checked = Boolean(
      data.takeCareOfElders,
    );
  if (
    data.takeCareOfHandicap !== undefined &&
    document.getElementById("takeCareOfHandicap")
  )
    document.getElementById("takeCareOfHandicap").checked = Boolean(
      data.takeCareOfHandicap,
    );

  // Handle Images in Edit Mode using IMAGE_BASE_URL
  const profileImagePath =
    data.ProfileImage_Path ||
    data.profileImage_Path ||
    data.ProfileImage ||
    data.profileImage;
  if (profileImagePath) {
    const rawPath =
      typeof profileImagePath === "object"
        ? profileImagePath.url || profileImagePath.path || ""
        : String(profileImagePath);
    if (rawPath.trim()) {
      const sanitized = rawPath.trim().replace(/\\/g, "/");
      const fullProfileUrl =
        sanitized.startsWith("http://") ||
        sanitized.startsWith("https://") ||
        sanitized.startsWith("data:")
          ? sanitized
          : `${IMAGE_BASE_URL}${sanitized.startsWith("/") ? "" : "/"}${sanitized}`;

      const profileImagePreview = document.getElementById(
        "profileImagePreview",
      );
      const profilePreview = document.getElementById("profilePreview");
      const avatarInitials = document.getElementById("avatarInitials");
      if (profileImagePreview) {
        profileImagePreview.src = fullProfileUrl;
        profileImagePreview.style.display = "block";
        if (avatarInitials) avatarInitials.style.display = "none";
      } else if (profilePreview) {
        profilePreview.src = fullProfileUrl;
      }
    }
  }

  const fullSizeImagePath =
    data.FullSizeImage_Path ||
    data.fullSizeImage_Path ||
    data.FullSizeImage ||
    data.fullSizeImage;
  if (fullSizeImagePath) {
    const rawPath =
      typeof fullSizeImagePath === "object"
        ? fullSizeImagePath.url || fullSizeImagePath.path || ""
        : String(fullSizeImagePath);
    if (rawPath.trim()) {
      const sanitized = rawPath.trim().replace(/\\/g, "/");
      const fullSizeUrl =
        sanitized.startsWith("http://") ||
        sanitized.startsWith("https://") ||
        sanitized.startsWith("data:")
          ? sanitized
          : `${IMAGE_BASE_URL}${sanitized.startsWith("/") ? "" : "/"}${sanitized}`;

      const fullSizePreviewImg = document.getElementById("fullSizePreviewImg");
      if (fullSizePreviewImg) {
        fullSizePreviewImg.src = fullSizeUrl;
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
            data.FullSizeImage_Name ||
            data.fullSizeImage_Name ||
            sanitized.split("/").pop() ||
            "";
        }
      }
    }
  }
}
