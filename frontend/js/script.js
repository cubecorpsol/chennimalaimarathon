/* =========================================================
   MOBILE HAMBURGER NAVIGATION — ALL PAGES
   Opens/closes the mobile menu, toggles the icon, closes on
   link click and on outside click.
   ========================================================= */
document.addEventListener('DOMContentLoaded', function () {
  var navToggle = document.querySelector('.nav-toggle');
  var mainNav = document.querySelector('.main-nav');
  if (!navToggle || !mainNav) return; // Nav markup not present on this page.

  var toggleIcon = navToggle.querySelector('i');

  function openMenu() {
    mainNav.classList.add('open');
    navToggle.setAttribute('aria-expanded', 'true');
    if (toggleIcon) {
      toggleIcon.classList.remove('fa-bars');
      toggleIcon.classList.add('fa-xmark');
    }
  }

  function closeMenu() {
    mainNav.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    if (toggleIcon) {
      toggleIcon.classList.remove('fa-xmark');
      toggleIcon.classList.add('fa-bars');
    }
  }

  navToggle.addEventListener('click', function (e) {
    e.stopPropagation();
    if (mainNav.classList.contains('open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  // Close the menu after a nav link is selected.
  mainNav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      closeMenu();
    });
  });

  // Close the menu when clicking outside of it.
  document.addEventListener('click', function (e) {
    if (mainNav.classList.contains('open') &&
        !mainNav.contains(e.target) &&
        !navToggle.contains(e.target)) {
      closeMenu();
    }
  });

  // Close the menu on Escape key press.
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu();
  });
});

/* =========================================================
   LIVE REMAINING SLOTS BADGE — the small in-form pill on the
   register page (#remainingSlotsBadge inside the first built step, or
   any .remaining-slots-box). Mirrors the admin "show remaining
   slots" toggle exposed via /api/status. Irrelevant while
   registrations are closed because its parent step is swapped
   out for the closed panel at that point anyway.
   ========================================================= */
function updateRemainingSlotsBadge(data) {
  var slotsContainer = document.getElementById("remainingSlotsBadge") || document.querySelector(".remaining-slots-box");
  if (!slotsContainer) return;
  if (!data || data.showRemainingSlots === false) {
    slotsContainer.style.display = "none";
    return;
  }
  slotsContainer.style.display = "";
  var slotsVal = document.getElementById("remainingSlotsVal");
  if (slotsVal) slotsVal.textContent = data.remainingSlots;
}

/* =========================================================
   HOME PAGE STATUS BANNER — #homeSlotsBanner. Unlike the
   register-page badge above, the home page has no form step to
   swap out, so when registrations are closed this banner itself
   becomes the "Registrations Closed" notice and points the
   visitor at the register page for full details/contact info.
   ========================================================= */
function updateHomeSlotsBanner(data) {
  var banner = document.getElementById("homeSlotsBanner");
  if (!banner) return;

  if (!data) {
    banner.style.display = "none";
    return;
  }

  if (data.closed || data.isOpen === false) {
    banner.classList.add("closed");
    banner.style.display = "";
    banner.innerHTML =
      '<div class="slots-strip-inner">' +
      '<i class="fa-solid fa-circle-exclamation"></i>' +
      '<span>Registrations Closed — Kindly visit the <a href="register.html">Register Page</a> for more details.</span>' +
      '</div>';
    return;
  }

  banner.classList.remove("closed");
  if (data.showRemainingSlots === false) {
    banner.style.display = "none";
    return;
  }
  banner.style.display = "";
  banner.innerHTML =
    '<div class="slots-strip-inner">' +
    '<i class="fa-solid fa-bolt"></i>' +
    '<span><span class="slots-num">' + (data.remainingSlots != null ? data.remainingSlots : 0) + '</span> Registration Slots Remaining — Grab yours before they\'re gone!</span>' +
    '</div>';
}

/* =========================================================
   CHENNIMALAI MARATHON — REGISTER PAGE
   Step navigation, validation, DOB → Category auto selection,
   and progress indicator for register.html
   ========================================================= */

document.addEventListener('DOMContentLoaded', function () {
  var isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  var BACKEND_URL = isLocal ? "http://localhost:3000" : "";

  function updateDynamicPrices(settings) {
    if (!settings) return;
    var adultFee = settings.adultFee ?? 150;
    var kidsFee = settings.kidsFee ?? 100;
    var tshirtPrice = Number(settings.tshirtPrice ?? 0);

    document.querySelectorAll('.dynamic-entry-fee').forEach(function (el) {
      el.textContent = '₹' + adultFee + ' / ₹' + kidsFee;
    });
    document.querySelectorAll('.dynamic-adult-fee').forEach(function (el) {
      el.textContent = '₹' + adultFee;
    });
    document.querySelectorAll('.dynamic-kids-fee').forEach(function (el) {
      el.textContent = '₹' + kidsFee;
    });
    document.querySelectorAll('.dynamic-tshirt-fee').forEach(function (el) {
      el.textContent = tshirtPrice > 0 ? ('₹' + tshirtPrice) : 'Complimentary';
    });
  }

  async function checkGlobalStatus() {
    try {
      var res = await fetch(BACKEND_URL + "/api/status");
      var data = await res.json();
      updateDynamicPrices(data);
      updateRemainingSlotsBadge(data);
      updateHomeSlotsBanner(data);
    } catch (err) {
      console.warn("Global status check error:", err);
    }
  }

  checkGlobalStatus();
});

document.addEventListener('DOMContentLoaded', function () {

  var registerSection = document.querySelector('.register-section');
  if (!registerSection) return; // Not on the register page — nothing to do.

  /* ---------------------------------------------------------
     Custom Alert Modal — replaces every native browser alert()
     with a styled in-page modal (message + OK button).
  --------------------------------------------------------- */
  var alertModalOverlay = document.getElementById('alertModalOverlay');
  var alertModalMessage = document.getElementById('alertModalMessage');
  var alertModalClose   = document.getElementById('alertModalClose');

  function showAlertModal(message) {
    if (!alertModalOverlay || !alertModalMessage) {
      window.alert(message);
      return;
    }
    alertModalMessage.textContent = message;
    alertModalOverlay.classList.add('open');
    if (alertModalClose) alertModalClose.focus();
  }

  function closeAlertModal() {
    if (alertModalOverlay) alertModalOverlay.classList.remove('open');
  }

  if (alertModalClose) alertModalClose.addEventListener('click', closeAlertModal);
  if (alertModalOverlay) {
    alertModalOverlay.addEventListener('click', function (e) {
      if (e.target === alertModalOverlay) closeAlertModal();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && alertModalOverlay && alertModalOverlay.classList.contains('open')) {
      closeAlertModal();
    }
  });

  /* ---------------------------------------------------------
     Backend Configuration & MongoDB Dynamic Settings
  --------------------------------------------------------- */
  var isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  var BACKEND_URL = isLocal ? "http://localhost:3000" : ""; 

  var currentSettings = {
    adultFee: 150,
    kidsFee: 100,
    tshirtPrice: 0,
    pricingTitle: "Marathon Registration Fees",
    maxRegistrations: 1000,
    remainingSlots: 1000,
    showRemainingSlots: true,
    isOpen: true,
    ageCutoff: 13
  };

  function getAgeCutoff() {
    return currentSettings.ageCutoff || 13;
  }

  function formatRupee(amount) {
    var num = Number(amount) || 0;
    if (Number.isInteger(num)) {
      return '₹' + num.toLocaleString('en-IN');
    }
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatTshirtCharge(amount) {
    var num = Number(amount) || 0;
    return num > 0 ? formatRupee(num) : 'Complimentary';
  }

  function updateTshirtHint() {
    var hint = document.getElementById('tshirt-hint');
    if (!hint) return;
    var cutoff = getAgeCutoff();
    var tshirtPrice = Number(currentSettings.tshirtPrice ?? 0);
    var settings = currentTshirtSettings || defaultTshirtSettings();
    var eligibilityText = settings.kidsEnabled && settings.adultsEnabled
      ? 'Available for all participants'
      : (settings.adultsEnabled ? 'Available only for runners aged above ' + cutoff + ' (7 KM category)' : 'Available only for the 3.5 KM Fun Run category');
    hint.textContent = tshirtPrice > 0
      ? eligibilityText + '. Charge: ' + formatRupee(tshirtPrice) + '.'
      : eligibilityText + '.';
  }

  function updateRegistrationSummary() {
    var feeEl = document.getElementById('summaryRegFee');
    var tshirtRow = document.getElementById('summaryTshirtRow');
    var tshirtEl = document.getElementById('summaryTshirtFee');
    var pgEl = document.getElementById('summaryPgFee');
    var totalEl = document.getElementById('summaryTotal');
    if (!feeEl && !totalEl) return;

    var cutoff = getAgeCutoff();
    var fee = currentSettings.adultFee ?? 150;
    var isKids = false;
    var dob = dobInput ? parseDOB(dobInput.value) : null;
    if (dob) {
      var age = calculateAge(dob, EVENT_DATE);
      isKids = age <= cutoff;
      fee = isKids
        ? (currentSettings.kidsFee ?? 100)
        : (currentSettings.adultFee ?? 150);
    }

    var tshirtSelectEl = document.getElementById('tshirt');
    var tshirtSelected = isTshirtEligibleForCurrentUser(isKids) && tshirtSelectEl &&
      tshirtSelectEl.value !== "" &&
      tshirtSelectEl.value !== "NO" &&
      tshirtSelectEl.value !== "N/A";
    var tshirtPrice = Number(currentSettings.tshirtPrice ?? 0);
    var tshirtFee = tshirtSelected ? tshirtPrice : 0;
    var subtotal = fee + tshirtFee;
    var pgFee = Number((subtotal * 0.025).toFixed(2));
    var total = Number((subtotal + pgFee).toFixed(2));

    if (feeEl) feeEl.textContent = formatRupee(fee);
    if (tshirtRow) tshirtRow.style.display = tshirtSelected ? "" : "none";
    if (tshirtEl) tshirtEl.textContent = formatTshirtCharge(tshirtFee);
    if (pgEl) pgEl.textContent = formatRupee(pgFee);
    if (totalEl) totalEl.textContent = formatRupee(total);
  }

  /* ---------------------------------------------------------
     Payment-status helpers & Dynamic MongoDB Status Fetch
  --------------------------------------------------------- */
  async function checkStatus() {
    try {
      var res = await fetch(BACKEND_URL + "/api/status");
      var data = await res.json();

      currentSettings = Object.assign({}, currentSettings, data);
      updateCategory();

      if (data.closed || data.isOpen === false) {
        showRegistrationsClosedPanel();
      } else {
        showRegistrationsOpenFlow();
      }

      updateRemainingSlotsBadge(data);
      updateTshirtHint();
      updateRegistrationSummary();
    } catch (err) {
      console.warn("Status check error:", err);
    }
  }

  function lockRegistrationButtons() {
    if (registerBtn) {
      registerBtn.disabled = true;
      registerBtn.textContent = "REGISTRATIONS CLOSED";
    }
    if (continueBtn) {
      continueBtn.disabled = true;
      continueBtn.textContent = "REGISTRATIONS CLOSED";
    }
  }

  // Swaps the whole registration form out for a persistent "Registrations
  // Closed" panel (with contact details) instead of just disabling buttons —
  // the closed state must survive as long as the page is open, not just
  // flash a one-time alert. Only used for the initial/incoming-visitor
  // state check — a visitor already on step-success (they just took the
  // last slot) keeps their confirmation and is only button-locked.
  function showRegistrationsClosedPanel() {
    var closedStep = document.getElementById('step-closed');
    var successStep = document.getElementById('step-success');
    if (closedStep && !(successStep && successStep.classList.contains('active'))) {
      document.querySelectorAll('.form-step').forEach(function (step) { step.classList.remove('active'); });
      closedStep.classList.add('active');
    }
    lockRegistrationButtons();
  }

  // Restores the regular first-step flow — used when /api/status reports
  // registrations are open (default state on every fresh page load).
  function showRegistrationsOpenFlow() {
    var closedStep = document.getElementById('step-closed');
    if (closedStep && closedStep.classList.contains('active')) {
      closedStep.classList.remove('active');
      var personalStep = firstStepId ? document.getElementById(firstStepId) : null;
      if (personalStep) personalStep.classList.add('active');
    }
    if (registerBtn) {
      registerBtn.disabled = false;
      registerBtn.textContent = "REGISTER NOW";
    }
    if (continueBtn) {
      continueBtn.disabled = false;
      continueBtn.textContent = "CONTINUE";
    }
  }

  async function reportPaymentPending(payload, reason) {
    try {
      await fetch(BACKEND_URL + "/api/payment-pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData: payload, reason: reason })
      });
    } catch (err) {
      console.error("Pending status log error", err);
    }
  }

  async function reportPaymentFailure(payload, reason) {
    try {
      await fetch(BACKEND_URL + "/api/payment-failed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData: payload, reason: reason })
      });
    } catch (err) {
      console.error("Failure status log error", err);
    }
  }

  /* ---------------------------------------------------------
     Element references
  --------------------------------------------------------- */
  var fullNameInput    = document.getElementById('fullName');
  var dobInput         = document.getElementById('dob');
  var phoneInput       = document.getElementById('phone');
  var emailInput       = document.getElementById('email');
  var districtSelect   = document.getElementById('district');
  var pincodeInput     = document.getElementById('pincode');
  var tshirtSelect     = document.getElementById('tshirt');
  var bloodGroupSelect = document.getElementById('bloodGroup');
  var continueBtn      = null; // assigned once the config-driven steps are built, below

  var categoryNameEl        = document.getElementById('categoryName');
  var categoryAgeEl         = document.getElementById('categoryAge');
  var genderBoxes           = document.querySelectorAll('.gender-row .option-box');
  var emergencyContactInput = document.getElementById('emergencyContact');
  var fitnessCheckbox       = document.getElementById('fitnessConfirm');
  var registerBtn           = null; // assigned once the config-driven steps are built, below

  var selectedGender = null;

  /* ---------------------------------------------------------
     Registration Form Builder — dynamic steps/fields, driven by
     /api/registration-form-config (superadmin-editable in the admin
     panel). Falls back to today's default 2-step layout if that
     request fails, so the page keeps working even if the API is down.
  --------------------------------------------------------- */
  var fieldPool             = document.getElementById('fieldPool');
  var closingBlockPool      = document.getElementById('closingBlockPool');
  var infoBoxPool           = document.getElementById('infoBoxPool');
  var dynamicStepsContainer = document.getElementById('dynamicStepsContainer');

  var PAIRABLE_FIELD_KEYS = ['fullName', 'dob', 'phone', 'email', 'district', 'pincode', 'tshirtSize', 'bloodGroup'];
  var DOM_ID_FOR_KEY = { tshirtSize: 'tshirt' };
  var currentFormConfig = null;
  var firstStepId = null;

  function domIdForKey(key) {
    return DOM_ID_FOR_KEY[key] || key;
  }

  function getFieldConfig(key) {
    if (!currentFormConfig) return { enabled: true, required: true };
    for (var i = 0; i < currentFormConfig.steps.length; i++) {
      var fields = currentFormConfig.steps[i].fields || [];
      for (var j = 0; j < fields.length; j++) {
        if (fields[j].key === key) return fields[j];
      }
    }
    return { enabled: false, required: false };
  }

  function isFieldEnabled(key) {
    var cfg = getFieldConfig(key);
    return !!(cfg && cfg.enabled);
  }

  /* ---------------------------------------------------------
     T-Shirt Settings — admin-configurable eligibility (per
     participant type) + the "View Size Chart" popup's data.
     Driven by /api/tshirt-settings (T-Shirt Settings admin page).
  --------------------------------------------------------- */
  var currentTshirtSettings = null;

  function defaultTshirtSettings() {
    return {
      kidsEnabled: false,
      adultsEnabled: true,
      sizeChart: [
        { size: 'XS', chest: '34', width: 17, height: 24.75 },
        { size: 'S', chest: '36', width: 18, height: 26.25 },
        { size: 'M', chest: '38', width: 19, height: 27.75 },
        { size: 'L', chest: '40', width: 20, height: 28.75 },
        { size: 'XL', chest: '42', width: 21, height: 29.75 },
        { size: 'XXL', chest: '44', width: 22, height: 30.75 },
        { size: 'XXXL', chest: '46', width: 23, height: 31.75 }
      ],
      warningText: 'Once registration is confirmed, the selected T-shirt size cannot be changed.'
    };
  }

  async function loadTshirtSettings() {
    try {
      var res = await fetch(BACKEND_URL + "/api/tshirt-settings");
      var data = await res.json();
      if (data && data.success && data.settings) return data.settings;
    } catch (err) {
      console.warn("T-shirt settings load error:", err);
    }
    return defaultTshirtSettings();
  }

  // A category (kids/adults) may only be offered a t-shirt when BOTH the
  // Registration Form Builder's "T-Shirt Size" field is enabled AND the
  // T-Shirt Settings page marks that category eligible.
  function isTshirtEligibleForCurrentUser(isKids) {
    if (!isFieldEnabled('tshirtSize')) return false;
    var settings = currentTshirtSettings || defaultTshirtSettings();
    return !!(isKids ? settings.kidsEnabled : settings.adultsEnabled);
  }

  function populateSizeChartModal(settings) {
    var tbody = document.getElementById('sizeChartTableBody');
    var warningTextEl = document.getElementById('sizeChartWarningText');
    if (!settings) return;

    if (tbody && Array.isArray(settings.sizeChart)) {
      tbody.innerHTML = '';
      settings.sizeChart.forEach(function (row) {
        var tr = document.createElement('tr');
        [row.size, row.chest || '', row.width, row.height].forEach(function (val) {
          var td = document.createElement('td');
          td.textContent = val;
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }
    if (warningTextEl && settings.warningText) {
      warningTextEl.textContent = settings.warningText;
    }
  }

  // The actual selectable sizes in the T-Shirt Size dropdown come from the same
  // admin-configured size chart (T-Shirt Settings page) — adding/removing a row
  // there adds/removes it as a selectable option here too.
  function populateTshirtSizeOptions(settings) {
    if (!tshirtSelect || !settings || !Array.isArray(settings.sizeChart) || !settings.sizeChart.length) return;

    var currentValue = tshirtSelect.value;
    tshirtSelect.innerHTML = '';

    var placeholderOpt = document.createElement('option');
    placeholderOpt.value = '';
    placeholderOpt.textContent = 'Select T-Shirt Size';
    tshirtSelect.appendChild(placeholderOpt);

    var validValues = [];
    settings.sizeChart.forEach(function (row) {
      var opt = document.createElement('option');
      opt.value = row.size;
      opt.textContent = row.size;
      tshirtSelect.appendChild(opt);
      validValues.push(row.size);
    });

    if (currentValue && (validValues.indexOf(currentValue) !== -1 || currentValue === 'N/A')) {
      tshirtSelect.value = currentValue;
    }
  }

  function defaultRegistrationFormConfig() {
    return {
      steps: [
        {
          id: 'step-1', title: 'Personal Details',
          subtitle: 'Please provide your basic information to continue.', order: 0,
          fields: [
            { key: 'fullName', enabled: true, required: true }, { key: 'dob', enabled: true, required: true },
            { key: 'phone', enabled: true, required: true }, { key: 'email', enabled: true, required: true },
            { key: 'district', enabled: true, required: true }, { key: 'pincode', enabled: true, required: true },
            { key: 'tshirtSize', enabled: true, required: true }, { key: 'bloodGroup', enabled: true, required: true }
          ]
        },
        {
          id: 'step-2', title: 'Additional Details',
          subtitle: 'Almost there! Just a few more details to complete your registration.', order: 1,
          fields: [
            { key: 'gender', enabled: true, required: true }, { key: 'emergencyContact', enabled: true, required: true },
            { key: 'fitnessConfirm', enabled: true, required: true }
          ]
        }
      ],
      messages: {}
    };
  }

  async function loadRegistrationFormConfig() {
    try {
      var res = await fetch(BACKEND_URL + "/api/registration-form-config");
      var data = await res.json();
      if (data && data.success && data.config && Array.isArray(data.config.steps) && data.config.steps.length) {
        return data.config;
      }
    } catch (err) {
      console.warn("Registration form config load error:", err);
    }
    return defaultRegistrationFormConfig();
  }

  function applyRegistrationMessages(config) {
    var messages = (config && config.messages) || {};
    var closedTitleEl = document.getElementById('closedPanelTitle');
    var closedTextEl = document.getElementById('closedPanelText');
    var successTitleEl = document.getElementById('successPanelTitle');
    var successTextEl = document.getElementById('successPanelText');
    if (closedTitleEl && messages.closedTitle) closedTitleEl.textContent = messages.closedTitle;
    if (closedTextEl && messages.closedText) closedTextEl.textContent = messages.closedText;
    if (successTitleEl && messages.successTitle) successTitleEl.textContent = messages.successTitle;
    if (successTextEl && messages.successText) successTextEl.textContent = messages.successText;
  }

  // Admin-configured announcement popup (Registration Form Builder > Announcement
  // Popup) — off unless the admin enables it, and shown at most once per browser
  // session, mirroring the homepage's volunteer promo popup.
  function initRegistrationPopup(config) {
    var overlay = document.getElementById('registrationPopupOverlay');
    if (!overlay) return;

    var messages = (config && config.messages) || {};
    if (!messages.popupEnabled || !(messages.popupTitle || messages.popupText)) return;

    var titleEl = document.getElementById('registrationPopupTitle');
    var textEl = document.getElementById('registrationPopupText');
    if (titleEl) titleEl.textContent = messages.popupTitle || '';
    if (textEl) textEl.textContent = messages.popupText || '';

    var STORAGE_KEY = 'registrationPopupShown';
    var alreadyShown = false;
    try { alreadyShown = !!sessionStorage.getItem(STORAGE_KEY); } catch (e) { /* private browsing — ignore */ }
    if (alreadyShown) return;

    function markShown() {
      try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (e) { /* private browsing — ignore */ }
    }

    function closePopup() {
      overlay.classList.remove('open');
      markShown();
    }

    var dismissBtn = document.getElementById('registrationPopupDismiss');
    var closeBtn = document.getElementById('registrationPopupClose');
    if (dismissBtn) dismissBtn.addEventListener('click', closePopup);
    if (closeBtn) closeBtn.addEventListener('click', closePopup);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closePopup();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('open')) closePopup();
    });

    setTimeout(function () { overlay.classList.add('open'); }, 1200);
  }

  // Applies a field's required-star visibility + label/placeholder overrides directly
  // onto its pooled DOM node, once, right before that node gets moved into a step.
  function applyFieldOverrides(wrapperEl, fieldCfg) {
    var starEl = wrapperEl.querySelector('[data-role="required-star"]');
    if (starEl) starEl.style.display = fieldCfg.required ? '' : 'none';
    if (fieldCfg.label) {
      var labelEl = wrapperEl.querySelector('[data-role="label"]');
      if (labelEl) {
        var starHtml = starEl ? starEl.outerHTML : '';
        labelEl.innerHTML = fieldCfg.label + ' ' + starHtml;
      }
    }
    if (fieldCfg.placeholder) {
      var inputEl = wrapperEl.querySelector('[data-role="input"]');
      if (inputEl && 'placeholder' in inputEl) inputEl.placeholder = fieldCfg.placeholder;
    }
  }

  // Builds the whole step DOM from config, re-parenting the pooled field nodes (never
  // cloning them) so their ids/values/already-bound listeners keep working unchanged
  // regardless of which step they end up on.
  function buildRegistrationSteps(config) {
    currentFormConfig = config;
    applyRegistrationMessages(config);
    if (!dynamicStepsContainer || !fieldPool) return;

    dynamicStepsContainer.innerHTML = '';
    var steps = config.steps.slice().sort(function (a, b) { return a.order - b.order; });
    var total = steps.length;

    steps.forEach(function (step, idx) {
      var isFirst = idx === 0;
      var isLast = idx === total - 1;
      var stepEl = document.createElement('div');
      stepEl.className = 'form-step' + (isFirst ? ' active' : '');
      stepEl.id = step.id;
      if (isFirst) firstStepId = step.id;

      var badge = document.createElement('div');
      badge.className = 'step-badge';
      badge.textContent = 'STEP ' + (idx + 1) + ' OF ' + total;
      stepEl.appendChild(badge);

      if (isFirst) {
        var slotsBadge = document.createElement('div');
        slotsBadge.className = 'reg-slots-badge';
        slotsBadge.id = 'remainingSlotsBadge';
        slotsBadge.style.display = 'none';
        slotsBadge.innerHTML = '<i class="fa-solid fa-bolt"></i> <span id="remainingSlotsVal">0</span>&nbsp;Registration Slots Remaining';
        stepEl.appendChild(slotsBadge);
      }

      var stepper = document.createElement('div');
      stepper.className = 'register-stepper';
      steps.forEach(function (s, sIdx) {
        if (sIdx > 0) {
          var track = document.createElement('div');
          track.className = 'stepper-track';
          var fill = document.createElement('div');
          fill.className = 'stepper-track-fill' + (sIdx <= idx ? ' full' : '');
          track.appendChild(fill);
          stepper.appendChild(track);
        }
        var item = document.createElement('div');
        item.className = 'stepper-item' + (sIdx === idx ? ' active' : (sIdx < idx ? ' completed' : ''));
        if (sIdx < idx) {
          var check = document.createElement('span');
          check.className = 'stepper-check';
          check.innerHTML = '<i class="fa-solid fa-check"></i>';
          item.appendChild(check);
        }
        var stepLabel = document.createElement('span');
        stepLabel.className = 'stepper-label';
        stepLabel.textContent = s.title;
        item.appendChild(stepLabel);
        stepper.appendChild(item);
      });
      stepEl.appendChild(stepper);

      if (!isFirst) {
        var back = document.createElement('span');
        back.className = 'back-link';
        back.innerHTML = '<i class="fa-solid fa-arrow-left"></i> Back to details';
        (function (targetId) {
          back.addEventListener('click', function () { goToStep(targetId); });
        })(steps[idx - 1].id);
        stepEl.appendChild(back);
      }

      var title = document.createElement('h2');
      title.className = 'form-title';
      title.textContent = (step.title || '').toUpperCase();
      stepEl.appendChild(title);

      var underline = document.createElement('div');
      underline.className = 'form-title-underline';
      stepEl.appendChild(underline);

      if (step.subtitle) {
        var subtitle = document.createElement('p');
        subtitle.className = 'form-subtitle';
        subtitle.textContent = step.subtitle;
        stepEl.appendChild(subtitle);
      }

      // Pair consecutive "standard" input/select fields 2-per-row (matching today's
      // layout); gender/fitnessConfirm always render full-width and solo.
      var pending = null;
      function flushPending() {
        if (!pending) return;
        var row = document.createElement('div');
        row.className = 'form-row';
        pending.style.gridColumn = '1 / -1';
        row.appendChild(pending);
        stepEl.appendChild(row);
        pending = null;
      }

      (step.fields || []).forEach(function (fieldCfg) {
        var wrapper = fieldPool.querySelector('[data-field-key="' + fieldCfg.key + '"]');
        if (!wrapper || !fieldCfg.enabled) return;
        applyFieldOverrides(wrapper, fieldCfg);

        if (PAIRABLE_FIELD_KEYS.indexOf(fieldCfg.key) !== -1) {
          if (!pending) {
            pending = wrapper;
          } else {
            var row = document.createElement('div');
            row.className = 'form-row';
            row.appendChild(pending);
            row.appendChild(wrapper);
            stepEl.appendChild(row);
            pending = null;
          }
        } else {
          flushPending();
          stepEl.appendChild(wrapper);
        }
      });
      flushPending();

      if (isLast && closingBlockPool) {
        while (closingBlockPool.firstChild) stepEl.appendChild(closingBlockPool.firstChild);
      }

      var actionBtn = document.createElement('button');
      actionBtn.type = 'button';
      actionBtn.className = 'btn-continue';
      actionBtn.innerHTML = isLast
        ? 'REGISTER NOW <i class="fa-solid fa-arrow-right"></i>'
        : 'CONTINUE <i class="fa-solid fa-arrow-right"></i>';
      (function (thisStep, nextStepId, isLastStep) {
        actionBtn.addEventListener('click', function () {
          if (!validateFieldsForStep(thisStep)) return;
          updateCategory();
          updateRegistrationSummary();
          if (isLastStep) {
            handleFormSubmission();
          } else {
            goToStep(nextStepId);
          }
        });
      })(step, isLast ? null : steps[idx + 1].id, isLast);
      stepEl.appendChild(actionBtn);

      if (isFirst) {
        continueBtn = actionBtn;
        if (infoBoxPool) {
          while (infoBoxPool.firstChild) stepEl.appendChild(infoBoxPool.firstChild);
        }
      }
      if (isLast) {
        registerBtn = actionBtn;
      }

      dynamicStepsContainer.appendChild(stepEl);
    });

    updateCategory();
    updateTshirtHint();
    updateRegistrationSummary();
  }

  Promise.all([loadRegistrationFormConfig(), loadTshirtSettings()]).then(function (results) {
    var config = results[0];
    currentTshirtSettings = results[1];
    populateSizeChartModal(currentTshirtSettings);
    populateTshirtSizeOptions(currentTshirtSettings);
    buildRegistrationSteps(config);
    initRegistrationPopup(config);
    checkStatus();
  });

  // Event date used as reference point for age / category calculation
  var EVENT_DATE = new Date(2026, 7, 31); // 31 Aug 2026

  /* ---------------------------------------------------------
     District list
  --------------------------------------------------------- */
  var TN_DISTRICTS = [
    'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore',
    'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi', 'Kanchipuram',
    'Kanyakumari', 'Karur', 'Krishnagiri', 'Madurai', 'Mayiladuthurai',
    'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai',
    'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi',
    'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli',
    'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur',
    'Vellore', 'Viluppuram', 'Virudhunagar', 'Other'
  ];

  if (districtSelect) {
    TN_DISTRICTS.forEach(function (name) {
      var opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      districtSelect.appendChild(opt);
    });
  }

  /* ---------------------------------------------------------
     Error helpers
  --------------------------------------------------------- */
  function showError(field, message) {
    var errorEl = document.getElementById(field + '-error');
    if (errorEl) errorEl.textContent = message;
    var wrapEl = document.getElementById(field + '-wrap');
    if (wrapEl) wrapEl.classList.add('has-error');
  }

  function clearError(field) {
    var errorEl = document.getElementById(field + '-error');
    if (errorEl) errorEl.textContent = '';
    var wrapEl = document.getElementById(field + '-wrap');
    if (wrapEl) wrapEl.classList.remove('has-error');
  }

  /* ---------------------------------------------------------
     DOB formatting, parsing & age calculation
  --------------------------------------------------------- */
  function formatDOBInput() {
    var digits = dobInput.value.replace(/\D/g, '').slice(0, 8);
    var formatted = '';
    if (digits.length > 0) formatted = digits.slice(0, 2);
    if (digits.length >= 3) formatted += ' / ' + digits.slice(2, 4);
    if (digits.length >= 5) formatted += ' / ' + digits.slice(4, 8);
    dobInput.value = formatted;
  }

  function parseDOB(value) {
    var match = /^(\d{2})\s*\/\s*(\d{2})\s*\/\s*(\d{4})$/.exec((value || '').trim());
    if (!match) return null;

    var day = parseInt(match[1], 10);
    var month = parseInt(match[2], 10);
    var year = parseInt(match[3], 10);

    if (month < 1 || month > 12) return null;
    var daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) return null;

    return new Date(year, month - 1, day);
  }

  function calculateAge(dob, referenceDate) {
    var age = referenceDate.getFullYear() - dob.getFullYear();
    var monthDiff = referenceDate.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }

  var tshirtFormGroup = document.getElementById('tshirtFormGroup');

  /* ---------------------------------------------------------
     DOB → Category auto selection
  --------------------------------------------------------- */
  function updateCategory() {
    if (!dobInput) {
      updateRegistrationSummary();
      return;
    }

    var dob = parseDOB(dobInput.value);
    if (!dob) {
      updateRegistrationSummary();
      return;
    }

    var cutoff = getAgeCutoff();
    var age = calculateAge(dob, EVENT_DATE);
    var isKids = age <= cutoff;

    if (isKids) {
      if (categoryNameEl) categoryNameEl.textContent = '3.5 KM FUN RUN';
      if (categoryAgeEl) categoryAgeEl.textContent = 'Age: ' + cutoff + ' & Below';
    } else {
      if (categoryNameEl) categoryNameEl.textContent = '7 KM TIMED RUN';
      if (categoryAgeEl) categoryAgeEl.textContent = 'Age: Above ' + cutoff + ' Years';
    }

    // T-shirt visibility follows eligibility (T-Shirt Settings admin page),
    // not just participant type — either category can be enabled/disabled.
    var tshirtEligible = isTshirtEligibleForCurrentUser(isKids);
    if (tshirtFormGroup) tshirtFormGroup.style.display = tshirtEligible ? '' : 'none';
    if (!tshirtEligible) {
      if (tshirtSelect) tshirtSelect.value = 'N/A';
      clearError('tshirt');
    } else if (tshirtSelect && tshirtSelect.value === 'N/A') {
      tshirtSelect.value = '';
    }

    updateRegistrationSummary();
  }

  if (dobInput) {
    dobInput.addEventListener('input', function () {
      formatDOBInput();
      clearError('dob');
      updateCategory();
    });
  }

  /* ---------------------------------------------------------
     Field validators — Step 1
  --------------------------------------------------------- */
  function validateFullName() {
    var value = fullNameInput.value.trim();
    if (!value) {
      showError('fullName', 'Full name is required.');
      return false;
    }
    if (value.length < 3) {
      showError('fullName', 'Please enter your full name.');
      return false;
    }
    if (!/^[A-Za-z\s.'-]+$/.test(value)) {
      showError('fullName', 'Name can only contain letters.');
      return false;
    }
    clearError('fullName');
    return true;
  }

  function validateDOB() {
    var value = dobInput.value.trim();
    if (!value) {
      showError('dob', 'Date of birth is required.');
      return false;
    }
    var dob = parseDOB(value);
    if (!dob) {
      showError('dob', 'Enter a valid date in DD / MM / YYYY format.');
      return false;
    }
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dob > today) {
      showError('dob', 'Date of birth cannot be in the future.');
      return false;
    }
    var age = calculateAge(dob, EVENT_DATE);
    if (age < 5) {
      showError('dob', 'Participant must be at least 5 years old.');
      return false;
    }
    if (age > 70) {
      showError('dob', 'Participant must be 70 years old or younger.');
      return false;
    }
    clearError('dob');
    return true;
  }

  function validatePhone() {
    var value = phoneInput.value.trim();
    if (!value) {
      showError('phone', 'Phone number is required.');
      return false;
    }
    if (!/^[6-9]\d{9}$/.test(value)) {
      showError('phone', 'Enter a valid 10 digit mobile number.');
      return false;
    }
    clearError('phone');
    return true;
  }

  function validateEmail() {
    var value = emailInput.value.trim();
    if (!value) {
      showError('email', 'Email address is required.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      showError('email', 'Enter a valid email address.');
      return false;
    }
    clearError('email');
    return true;
  }

  function validateDistrict() {
    if (!districtSelect.value) {
      showError('district', 'Please select your district.');
      return false;
    }
    clearError('district');
    return true;
  }

  function validatePincode() {
    var value = pincodeInput.value.trim();
    if (!value) {
      showError('pincode', 'Pincode is required.');
      return false;
    }
    if (!/^\d{6}$/.test(value)) {
      showError('pincode', 'Enter a valid 6 digit pincode.');
      return false;
    }
    if (typeof window.lookupTNDistrictByPincode === 'function' && !window.lookupTNDistrictByPincode(value)) {
      showError('pincode', 'Invalid Pincode');
      return false;
    }
    clearError('pincode');
    return true;
  }

  function validateTshirt() {
    // tshirtFormGroup's display already reflects eligibility (T-Shirt Settings
    // admin page) for whichever participant type the current DOB resolves to —
    // set in updateCategory(), which always runs before this validator.
    if (tshirtFormGroup && tshirtFormGroup.style.display === 'none') {
      clearError('tshirt');
      return true;
    }
    if (!tshirtSelect.value || tshirtSelect.value === 'N/A') {
      showError('tshirt', 'Please select a t-shirt size.');
      return false;
    }
    clearError('tshirt');
    return true;
  }

  function validateBloodGroup() {
    if (!bloodGroupSelect.value) {
      showError('bloodGroup', 'Please select your blood group.');
      return false;
    }
    clearError('bloodGroup');
    return true;
  }

  var FIELD_VALIDATORS = {
    fullName: validateFullName, dob: validateDOB, phone: validatePhone, email: validateEmail,
    district: validateDistrict, pincode: validatePincode, tshirtSize: validateTshirt,
    bloodGroup: validateBloodGroup
    // gender / emergencyContact / fitnessConfirm added below, once defined.
  };

  var FIELD_RAW_VALUE_GETTERS = {
    fullName: function () { return fullNameInput.value.trim(); },
    dob: function () { return dobInput.value.trim(); },
    phone: function () { return phoneInput.value.trim(); },
    email: function () { return emailInput.value.trim(); },
    district: function () { return districtSelect.value; },
    pincode: function () { return pincodeInput.value.trim(); },
    tshirtSize: function () { return tshirtSelect.value; },
    bloodGroup: function () { return bloodGroupSelect.value; }
  };

  // Validates one config-driven step: skips disabled fields entirely, and for
  // enabled-but-optional fields only runs the field's format checks when it's
  // non-empty (an empty optional field is valid). Applies a per-field custom
  // error message override on failure, when the admin has set one.
  function validateFieldsForStep(step) {
    var results = (step.fields || []).map(function (fieldCfg) {
      if (!fieldCfg.enabled) return true;
      var validatorFn = FIELD_VALIDATORS[fieldCfg.key];
      if (!validatorFn) return true;

      if (!fieldCfg.required) {
        var getter = FIELD_RAW_VALUE_GETTERS[fieldCfg.key];
        var raw = getter ? getter() : null;
        var isEmpty = fieldCfg.key === 'fitnessConfirm' ? !raw : (raw === '' || raw === null || raw === undefined);
        if (isEmpty) {
          clearError(domIdForKey(fieldCfg.key));
          return true;
        }
      }

      var ok = validatorFn();
      if (!ok && fieldCfg.errorMessage) {
        showError(domIdForKey(fieldCfg.key), fieldCfg.errorMessage);
      }
      return ok;
    });
    return results.indexOf(false) === -1;
  }

  /* ---------------------------------------------------------
     Field validators — Step 2
  --------------------------------------------------------- */
  function validateGender() {
    if (!selectedGender) {
      showError('gender', 'Please select your gender.');
      return false;
    }
    clearError('gender');
    return true;
  }

  function validateEmergencyContact() {
    var value = emergencyContactInput.value.trim();
    if (!value) {
      showError('emergencyContact', 'Emergency contact number is required.');
      return false;
    }
    if (!/^[6-9]\d{9}$/.test(value)) {
      showError('emergencyContact', 'Enter a valid 10 digit mobile number.');
      return false;
    }
    if (phoneInput && value === phoneInput.value.trim()) {
      showError('emergencyContact', 'Emergency contact number must be different from your mobile number.');
      return false;
    }
    clearError('emergencyContact');
    return true;
  }

  function validateFitness() {
    if (!fitnessCheckbox.checked) {
      showError('fitnessConfirm', 'Please confirm that you are medically fit to participate.');
      return false;
    }
    clearError('fitnessConfirm');
    return true;
  }

  // Extend the field-key lookup maps (declared earlier) now that these 3 validators exist.
  FIELD_VALIDATORS.gender = validateGender;
  FIELD_VALIDATORS.emergencyContact = validateEmergencyContact;
  FIELD_VALIDATORS.fitnessConfirm = validateFitness;
  FIELD_RAW_VALUE_GETTERS.gender = function () { return selectedGender; };
  FIELD_RAW_VALUE_GETTERS.emergencyContact = function () { return emergencyContactInput.value.trim(); };
  FIELD_RAW_VALUE_GETTERS.fitnessConfirm = function () { return fitnessCheckbox.checked; };

  /* ---------------------------------------------------------
     Input filters (digits-only fields)
  --------------------------------------------------------- */
  function restrictToDigits(input, maxLength) {
    if (!input) return;
    input.addEventListener('input', function () {
      input.value = input.value.replace(/\D/g, '').slice(0, maxLength);
    });
  }

  if (phoneInput) restrictToDigits(phoneInput, 10);
  if (pincodeInput) restrictToDigits(pincodeInput, 6);
  if (emergencyContactInput) restrictToDigits(emergencyContactInput, 10);

  /* ---------------------------------------------------------
     Pincode -> District auto-fill
  --------------------------------------------------------- */
  function selectDistrictByName(name) {
    if (!districtSelect || !name) return;
    var options = districtSelect.options;
    for (var i = 0; i < options.length; i++) {
      if (options[i].value.toLowerCase() === name.toLowerCase()) {
        districtSelect.value = options[i].value;
        districtSelect.dispatchEvent(new Event('change'));
        return;
      }
    }
  }

  function handlePincodeLookup() {
    if (!pincodeInput || typeof window.lookupTNDistrictByPincode !== 'function') return;

    var value = pincodeInput.value.trim();
    if (value.length < 6) {
      clearError('pincode');
      return;
    }

    var district = window.lookupTNDistrictByPincode(value);
    if (district) {
      clearError('pincode');
      selectDistrictByName(district);
    } else {
      showError('pincode', 'Invalid Pincode');
    }
  }

  if (pincodeInput) {
    pincodeInput.addEventListener('input', handlePincodeLookup);
  }

  /* ---------------------------------------------------------
     Clear errors as user types
  --------------------------------------------------------- */
  [
    [fullNameInput, 'fullName'],
    [phoneInput, 'phone'],
    [emailInput, 'email'],
    [districtSelect, 'district'],
    [tshirtSelect, 'tshirt'],
    [bloodGroupSelect, 'bloodGroup'],
    [emergencyContactInput, 'emergencyContact']
  ].forEach(function (pair) {
    var el = pair[0];
    var field = pair[1];
    if (!el) return;
    var evt = (el.tagName === 'SELECT') ? 'change' : 'input';
    el.addEventListener(evt, function () { clearError(field); });
  });

  if (tshirtSelect) {
    tshirtSelect.addEventListener('change', updateRegistrationSummary);
  }

  if (fitnessCheckbox) {
    fitnessCheckbox.addEventListener('change', function () { clearError('fitnessConfirm'); });
  }

  /* ---------------------------------------------------------
     Gender selection
  --------------------------------------------------------- */
  genderBoxes.forEach(function (box) {
    box.addEventListener('click', function () {
      genderBoxes.forEach(function (b) { b.classList.remove('selected-gender'); });
      box.classList.add('selected-gender');
      selectedGender = box.getAttribute('data-gender');
      clearError('gender');
    });
  });

  /* ---------------------------------------------------------
     Step navigation
  --------------------------------------------------------- */
  function goToStep(stepId) {
    document.querySelectorAll('.form-step').forEach(function (step) { step.classList.remove('active'); });
    var target = document.getElementById(stepId);
    if (target) target.classList.add('active');

    var card = document.querySelector('.register-card');
    if (card && card.scrollIntoView) {
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Handle PayU Hosted Checkout Return Status in URL Query Parameters
  (function checkReturnPaymentStatus() {
    if (typeof window === 'undefined' || !window.location) return;
    var urlParams = new URLSearchParams(window.location.search);
    var statusParam = urlParams.get('status');

    if (statusParam === 'success') {
      goToStep('step-success');
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } else if (statusParam === 'failed') {
      var reason = urlParams.get('reason') || 'Transaction declined';
      showAlertModal('Payment failed: ' + reason);
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  })();

  // Continue/Back/Register button wiring now happens per-step inside
  // buildRegistrationSteps(), since steps (and which button is "last") are
  // config-driven rather than fixed to a hardcoded 2-step layout.

  /* ---------------------------------------------------------
     BACKEND SUBMISSION & REGISTRATION
  --------------------------------------------------------- */
  async function handleFormSubmission() {
    var originalText = registerBtn.textContent;
    registerBtn.disabled = true;
    registerBtn.textContent = "Processing Payment...";

    var cleanDob = dobInput ? dobInput.value.trim() : "";
    var dobForAge = parseDOB(cleanDob);
    var userAge = dobForAge ? calculateAge(dobForAge, EVENT_DATE) : 20;
    var isKidsUser = userAge <= getAgeCutoff();

    // Only enabled fields are collected — a field the admin disabled via the
    // Registration Form Builder is simply omitted; the backend already falls
    // back to a sensible default for any field that's missing from the payload.
    var payload = {};
    if (isFieldEnabled('fullName')) payload.fullName = fullNameInput.value.trim();
    if (isFieldEnabled('dob')) payload.dob = cleanDob;
    if (isFieldEnabled('phone')) payload.phone = phoneInput.value.trim();
    if (isFieldEnabled('email')) payload.email = emailInput.value.trim();
    if (isFieldEnabled('district')) payload.district = districtSelect.value;
    if (isFieldEnabled('pincode')) payload.pincode = pincodeInput.value.trim();
    if (isFieldEnabled('tshirtSize')) {
      var tshirtEligibleForSubmit = isTshirtEligibleForCurrentUser(isKidsUser);
      payload.tshirtSize = tshirtEligibleForSubmit ? (tshirtSelect.value || "M") : "N/A";
      payload.tshirtSelected = tshirtEligibleForSubmit && tshirtSelect.value !== "" && tshirtSelect.value !== "NO" && tshirtSelect.value !== "N/A";
    }
    if (isFieldEnabled('bloodGroup')) payload.bloodGroup = bloodGroupSelect.value;
    if (isFieldEnabled('gender')) payload.gender = selectedGender;
    if (isFieldEnabled('emergencyContact')) payload.emergencyContact = emergencyContactInput.value.trim();

    try {
      // Retry briefly on cold-start / DB connect failures so users aren't stuck
      // before the payment gateway opens.
      var orderRes = null;
      var orderData = null;
      for (var orderAttempt = 1; orderAttempt <= 3; orderAttempt++) {
        orderRes = await fetch(BACKEND_URL + "/api/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        orderData = await orderRes.json().catch(function () { return {}; });

        if (orderRes.ok || orderRes.status === 400 || orderRes.status === 403) break;
        if (orderRes.status === 503 || orderData.error === "DB_CONNECTION_FAILED" || orderData.error === "ORDER_CREATION_FAILED") {
          if (orderAttempt < 3) {
            await new Promise(function (resolve) { setTimeout(resolve, 1200 * orderAttempt); });
            continue;
          }
        }
        break;
      }

      if (orderRes.status === 403) {
        showAlertModal(orderData.message || "Registrations are closed. All slots have been filled.");
        registerBtn.disabled = false;
        registerBtn.textContent = originalText;
        return;
      }

      if (!orderRes.ok) {
        showAlertModal(orderData.message || "Could not initialize registration. Please try again.");
        registerBtn.disabled = false;
        registerBtn.textContent = originalText;
        return;
      }

      // PayU Hosted Checkout Form POST Redirect (check before Razorpay SDK)
      if (orderData.gateway === "payu" && orderData.payuParams) {
        var form = document.createElement("form");
        form.method = "POST";
        form.action = orderData.action;

        var params = orderData.payuParams;
        for (var pKey in params) {
          if (Object.prototype.hasOwnProperty.call(params, pKey)) {
            var hiddenField = document.createElement("input");
            hiddenField.type = "hidden";
            hiddenField.name = pKey;
            hiddenField.value = params[pKey];
            form.appendChild(hiddenField);
          }
        }

        document.body.appendChild(form);
        form.submit();
        return;
      }

  async function fetchWithRetry(url, options, maxRetries) {
    maxRetries = maxRetries || 3;
    for (var attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        var controller = new AbortController();
        var timeoutId = setTimeout(function() { controller.abort(); }, 15000);
        var fetchOpts = Object.assign({}, options, { signal: controller.signal });
        var res = await fetch(url, fetchOpts);
        clearTimeout(timeoutId);
        if (res.ok || res.status === 400 || res.status === 403 || res.status === 404) {
          return res;
        }
      } catch (err) {
        console.warn("API Call Attempt " + attempt + " failed:", err);
        if (attempt === maxRetries) throw err;
        await new Promise(function(resolve) { setTimeout(resolve, 1500); });
      }
    }
  }

  // Development mode or Razorpay SDK not loaded — complete registration without live checkout
      if (orderData.isDevelopment || typeof Razorpay === "undefined") {
        var verifyRes = await fetchWithRetry(BACKEND_URL + "/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            razorpay_order_id: orderData.orderId,
            razorpay_payment_id: "DEMO_PAY_ID_" + Date.now(),
            razorpay_signature: "DEMO_SIG"
          })
        });

        var verifyData = await verifyRes.json();
        if (verifyRes.ok) {
          goToStep('step-success');
          if (verifyData.closed) {
            lockRegistrationButtons();
          }
        } else {
          showAlertModal(verifyData.message || "Registration failed.");
          registerBtn.disabled = false;
          registerBtn.textContent = originalText;
        }
        return;
      }

      // Render Razorpay payment modal
      var options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Chennimalai Marathon 2026",
        description: "Registration Fee",
        order_id: orderData.orderId,
        prefill: {
          name: payload.fullName,
          email: payload.email,
          contact: payload.phone
        },
        handler: async function (response) {
          var finalPayload = {
            ...payload,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          };

          try {
            var verifyRes = await fetchWithRetry(BACKEND_URL + "/api/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(finalPayload)
            });

            var verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              // Payment verified — registration record updated to Success.
              goToStep('step-success');
              if (verifyData.closed) {
                lockRegistrationButtons();
              }
            } else {
              showAlertModal(verifyData.message || "Payment verification failed.");
              registerBtn.disabled = false;
              registerBtn.textContent = originalText;
            }
          } catch (err) {
            console.error("Verification error:", err);
            showAlertModal("Payment received, but server response timed out. Your registration will be confirmed automatically via email shortly.");
            registerBtn.disabled = false;
            registerBtn.textContent = originalText;
          }
        },
        modal: {
          ondismiss: function () {
            // User closed the payment window before paying — mark Pending.
            reportPaymentPending(payload, "User closed payment window without paying");
            showAlertModal("Registration incomplete. Your status has been saved as pending — you can complete payment later.");
            registerBtn.disabled = false;
            registerBtn.textContent = originalText;
          }
        }
      };

      var rzp = new Razorpay(options);
      rzp.on('payment.failed', function (response) {
        // Bank / gateway / transaction error — mark Failed.
        reportPaymentFailure(payload, response.error.description || "Transaction declined");
        showAlertModal("Payment failed: " + (response.error.description || "Transaction declined"));
        registerBtn.disabled = false;
        registerBtn.textContent = originalText;
      });
      rzp.open();

    } catch (err) {
      console.error("Payment initiation error:", err);
      showAlertModal("Unable to connect to payment server. Please check your connection and try again.");
      registerBtn.disabled = false;
      registerBtn.textContent = originalText;
    }
  }

  // registerBtn's click handling is wired inline in buildRegistrationSteps()
  // (its click handler calls handleFormSubmission() directly for the last step).

});

/* =========================================================
   FAQ PAGE — ACCORDION EXPAND / COLLAPSE
   ========================================================= */
document.addEventListener('DOMContentLoaded', function () {
  var faqItems = document.querySelectorAll('.faq-item');
  if (!faqItems.length) return;

  faqItems.forEach(function (item) {
    var question = item.querySelector('.faq-question');
    if (!question) return;

    question.addEventListener('click', function () {
      var isOpen = item.classList.contains('open');
      faqItems.forEach(function (other) { other.classList.remove('open'); });
      if (!isOpen) item.classList.add('open');
    });
  });
});

/* =========================================================
   HOME PAGE — EVENT COUNTDOWN TIMER
   ========================================================= */
document.addEventListener('DOMContentLoaded', function () {
  var countdownBox = document.querySelector('.countdown-box');
  if (!countdownBox) return;

  var EVENT_DATE = new Date(2026, 7, 30, 0, 0, 0);

  var daysEl    = countdownBox.querySelector('[data-unit="days"]');
  var hoursEl   = countdownBox.querySelector('[data-unit="hours"]');
  var minutesEl = countdownBox.querySelector('[data-unit="minutes"]');
  var secondsEl = countdownBox.querySelector('[data-unit="seconds"]');

  function pad(num) { return (num < 10 ? '0' : '') + num; }

  function updateCountdown() {
    var now = new Date();
    var diff = EVENT_DATE.getTime() - now.getTime();

    if (diff <= 0) {
      if (daysEl) daysEl.textContent = '00';
      if (hoursEl) hoursEl.textContent = '00';
      if (minutesEl) minutesEl.textContent = '00';
      if (secondsEl) secondsEl.textContent = '00';
      return;
    }

    var totalSeconds = Math.floor(diff / 1000);
    var days    = Math.floor(totalSeconds / 86400);
    var hours   = Math.floor((totalSeconds % 86400) / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;

    if (daysEl) daysEl.textContent = pad(days);
    if (hoursEl) hoursEl.textContent = pad(hours);
    if (minutesEl) minutesEl.textContent = pad(minutes);
    if (secondsEl) secondsEl.textContent = pad(seconds);
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);
});

/* =========================================================
   PRIZES PAGE — 3.5KM / 7KM TOGGLE
   Switches which prize category columns are visible based on
   the selected race distance. No page reload; pure JS + CSS.
   ========================================================= */
document.addEventListener('DOMContentLoaded', function () {
  var kmPills = document.querySelectorAll('.km-pill');
  var prizeCols = document.querySelectorAll('.prize-cat-col[data-km]');
  if (!kmPills.length || !prizeCols.length) return;

  function showKm(km) {
    prizeCols.forEach(function (col) {
      if (col.getAttribute('data-km') === km) {
        col.classList.remove('km-hidden');
      } else {
        col.classList.add('km-hidden');
      }
    });

    kmPills.forEach(function (pill) {
      pill.classList.toggle('active', pill.getAttribute('data-km') === km);
    });
  }

  kmPills.forEach(function (pill) {
    pill.addEventListener('click', function () {
      showKm(pill.getAttribute('data-km'));
    });
  });

  // Default view on load: whichever pill already has .active (falls back to 3.5KM).
  var defaultPill = document.querySelector('.km-pill.active') || kmPills[0];
  showKm(defaultPill.getAttribute('data-km'));
});
/* =========================================================
   WATCH VIDEO MODAL — home page only
   Opens the modal, plays the video; closes on the X button,
   backdrop click, or Escape, and pauses playback on close.
   ========================================================= */
document.addEventListener('DOMContentLoaded', function () {
  var watchBtn = document.getElementById('watchVideoBtn');
  var overlay = document.getElementById('videoModalOverlay');
  var closeBtn = document.getElementById('videoModalClose');
  var player = document.getElementById('videoModalPlayer');
  if (!watchBtn || !overlay || !player) return; // Modal markup not present on this page.

  function openModal() {
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    player.currentTime = 0;
    player.play().catch(function () {});
  }

  function closeModal() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    player.pause();
  }

  watchBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
  });
});

/* =========================================================
   EVENT SPONSORSHIP FORM & PUBLIC SPONSORS WALL
   ========================================================= */
document.addEventListener('DOMContentLoaded', function () {
  var isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  var BACKEND_URL = isLocal ? "http://localhost:3000" : "";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function sanitizeUrl(url) {
    var trimmed = String(url || "").trim();
    if (!trimmed) return "";
    try {
      var parsed = new URL(trimmed, window.location.origin);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.href;
    } catch (e) {}
    return "";
  }

  // Handle PayU / gateway return on sponsorship pages
  (function checkSponsorshipReturnStatus() {
    var path = (window.location.pathname || "").toLowerCase();
    if (!path.includes("sponsor")) return;
    var urlParams = new URLSearchParams(window.location.search);
    var statusParam = urlParams.get("status");
    if (!statusParam) return;

    if (statusParam === "success") {
      var company = urlParams.get("company") || "your organization";
      var sponsorId = urlParams.get("sponsorId") || "";
      var msg = "Sponsorship Payment Confirmed! Thank you " + company + " for supporting Chennimalai Marathon 2026.";
      if (sponsorId) msg += " Sponsor ID: " + sponsorId + ".";
      msg += " Official receipt has been sent to your email.";
      if (typeof showAlertModal === "function") showAlertModal(msg);
      else alert(msg);
    } else if (statusParam === "failed") {
      var reason = urlParams.get("reason") || "Transaction declined";
      if (typeof showAlertModal === "function") showAlertModal("Sponsorship payment failed: " + reason);
      else alert("Sponsorship payment failed: " + reason);
    }

    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  })();

  // 1. Fetch & Render Public Sponsors Wall (on Sponsors, Home, and Prizes pages)
  async function fetchPublicSponsors() {
    var wallContainers = [
      document.getElementById('publicSponsorsWall'),
      document.getElementById('homeSponsorsWall'),
      document.getElementById('prizesSponsorsWall')
    ].filter(Boolean);

    if (!wallContainers.length) return;

    try {
      var res = await fetch(BACKEND_URL + "/api/sponsors");
      var data = await res.json();

      wallContainers.forEach(function (container) {
        if (!data.success || !data.sponsors || !data.sponsors.length) {
          container.innerHTML = `
            <div class="sponsors-empty-inline">
              <p>We're grateful to everyone who supports Chennimalai Marathon.</p>
            </div>
          `;
          return;
        }

        container.innerHTML = "";
        data.sponsors.forEach(function (sp) {
          var card = document.createElement("div");
          card.className = "sponsor-card";
          var safeTier = escapeHtml(sp.tier || "Custom");
          var safeCompany = escapeHtml(sp.companyName || "Sponsor");
          var safeContact = escapeHtml(sp.contactPerson || "");
          var safeWebsite = sanitizeUrl(sp.website);
          var websiteHtml = safeWebsite
            ? `<a href="${escapeHtml(safeWebsite)}" target="_blank" rel="noopener noreferrer" class="sponsor-link"><i class="fa-solid fa-globe"></i> Visit Website</a>`
            : "";

          card.innerHTML = `
            <span class="sponsor-badge badge-${safeTier}">${safeTier} Sponsor</span>
            <h4>${safeCompany}</h4>
            <div class="sponsor-contact">${safeContact}</div>
            ${websiteHtml}
          `;
          container.appendChild(card);
        });
      });
    } catch (err) {
      console.warn("Public sponsors fetch error:", err);
    }
  }

  fetchPublicSponsors();

  // 2. Sponsorship Form Handling
  var spForm = document.getElementById('sponsorshipForm');
  var spSubmitBtn = document.getElementById('sponsorSubmitBtn');
  if (!spForm || !spSubmitBtn) return;

  var selectedTier = "Gold";
  var selectedAmount = 25000;

  var tierBoxes = document.querySelectorAll('.tier-option-box');
  var customGroup = document.getElementById('customAmountGroup');
  var customInput = document.getElementById('spCustomAmount');

  function updateSpSummary() {
    var amount = selectedTier === "Custom" ? (Number(customInput.value) || 0) : selectedAmount;
    var spSummaryAmount = document.getElementById('spSummaryAmount');
    var spSummaryTotal = document.getElementById('spSummaryTotal');
    var format = '₹' + amount.toLocaleString('en-IN');
    if (spSummaryAmount) spSummaryAmount.textContent = format;
    if (spSummaryTotal) spSummaryTotal.textContent = format;
  }

  tierBoxes.forEach(function (box) {
    box.addEventListener('click', function () {
      tierBoxes.forEach(function (b) { b.classList.remove('selected'); });
      box.classList.add('selected');

      selectedTier = box.getAttribute('data-tier');
      selectedAmount = Number(box.getAttribute('data-amount')) || 0;

      if (selectedTier === "Custom") {
        if (customGroup) customGroup.style.display = "block";
      } else {
        if (customGroup) customGroup.style.display = "none";
      }
      updateSpSummary();
    });
  });

  if (customInput) {
    customInput.addEventListener('input', updateSpSummary);
  }

  function showSpError(id, msg) {
    var errorEl = document.getElementById(id + '-error');
    if (errorEl) errorEl.textContent = msg;
    var wrapEl = document.getElementById(id + '-wrap');
    if (wrapEl) wrapEl.classList.add('has-error');
  }

  function clearSpError(id) {
    var errorEl = document.getElementById(id + '-error');
    if (errorEl) errorEl.textContent = '';
    var wrapEl = document.getElementById(id + '-wrap');
    if (wrapEl) wrapEl.classList.remove('has-error');
  }

  ['spCompanyName', 'spContactPerson', 'spPhone', 'spEmail', 'spCustomAmount'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', function() { clearSpError(id); });
  });

  var spConfirm = document.getElementById('spConfirm');
  if (spConfirm) {
    spConfirm.addEventListener('change', function() { clearSpError('spConfirm'); });
  }

  async function handleSponsorshipSubmission() {
    var companyName = document.getElementById('spCompanyName').value.trim();
    var contactPerson = document.getElementById('spContactPerson').value.trim();
    var phone = document.getElementById('spPhone').value.trim();
    var email = document.getElementById('spEmail').value.trim();
    var designation = document.getElementById('spDesignation').value.trim();
    var gstin = document.getElementById('spGstin').value.trim();
    var website = document.getElementById('spWebsite').value.trim();
    var message = document.getElementById('spMessage').value.trim();

    var isValid = true;

    if (!companyName) { showSpError('spCompanyName', 'Company name is required.'); isValid = false; }
    if (!contactPerson) { showSpError('spContactPerson', 'Contact person name is required.'); isValid = false; }
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) { showSpError('spPhone', 'Enter a valid 10 digit mobile number.'); isValid = false; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showSpError('spEmail', 'Enter a valid email address.'); isValid = false; }

    var finalAmount = selectedTier === "Custom" ? Number(customInput.value) : selectedAmount;
    if (selectedTier === "Custom" && (!finalAmount || finalAmount < 1000)) {
      showSpError('spCustomAmount', 'Enter a valid amount (minimum ₹1,000).');
      isValid = false;
    }

    if (!spConfirm.checked) {
      showSpError('spConfirm', 'Please accept the sponsorship terms to continue.');
      isValid = false;
    }

    if (!isValid) return;

    var originalText = spSubmitBtn.textContent;
    spSubmitBtn.disabled = true;
    spSubmitBtn.textContent = "Processing Payment...";

    var payload = {
      companyName: companyName,
      contactPerson: contactPerson,
      phone: phone,
      email: email,
      designation: designation,
      gstin: gstin,
      website: website,
      tier: selectedTier,
      amount: finalAmount,
      message: message
    };

    try {
      var orderRes = await fetch(BACKEND_URL + "/api/sponsorship/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      var orderData = await orderRes.json();

      if (!orderRes.ok || !orderData.success) {
        if (typeof showAlertModal === "function") showAlertModal(orderData.message || "Failed to initialize payment.");
        else alert(orderData.message || "Failed to initialize payment.");
        spSubmitBtn.disabled = false;
        spSubmitBtn.textContent = originalText;
        return;
      }

      // Handle PayU Hosted Checkout Form POST
      if (orderData.gateway === "payu" && orderData.payuParams) {
        var form = document.createElement("form");
        form.method = "POST";
        form.action = orderData.action;

        var params = orderData.payuParams;
        for (var pKey in params) {
          if (Object.prototype.hasOwnProperty.call(params, pKey)) {
            var hiddenField = document.createElement("input");
            hiddenField.type = "hidden";
            hiddenField.name = pKey;
            hiddenField.value = params[pKey];
            form.appendChild(hiddenField);
          }
        }
        document.body.appendChild(form);
        form.submit();
        return;
      }

      // Dev Mode or Razorpay SDK missing fallback
      if (orderData.isDevelopment || typeof Razorpay === "undefined") {
        var verifyRes = await fetch(BACKEND_URL + "/api/sponsorship/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sponsorshipId: orderData.sponsorshipId,
            razorpay_order_id: orderData.orderId,
            razorpay_payment_id: "DEMO_SPN_PAY_" + Date.now(),
            razorpay_signature: "DEMO_SIG"
          })
        });

        var verifyData = await verifyRes.json();
        if (verifyRes.ok && verifyData.success) {
          if (typeof showAlertModal === "function") {
            showAlertModal("🎉 Sponsorship Payment Confirmed! Thank you for supporting Chennimalai Marathon 2026. Official receipt has been sent to your email.");
          } else {
            alert("Sponsorship Payment Confirmed!");
          }
          spForm.reset();
          fetchPublicSponsors();
        } else {
          if (typeof showAlertModal === "function") showAlertModal(verifyData.message || "Payment verification failed.");
        }
        spSubmitBtn.disabled = false;
        spSubmitBtn.textContent = originalText;
        return;
      }

      // Razorpay Modal Checkout
      var options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Chennimalai Marathon 2026",
        description: selectedTier + " Sponsorship Contribution",
        order_id: orderData.orderId,
        prefill: {
          name: contactPerson + " (" + companyName + ")",
          email: email,
          contact: phone
        },
        handler: async function (response) {
          try {
            var verifyRes = await fetch(BACKEND_URL + "/api/sponsorship/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sponsorshipId: orderData.sponsorshipId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });

            var verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              if (typeof showAlertModal === "function") {
                showAlertModal("🎉 Sponsorship Payment Confirmed! Thank you for supporting Chennimalai Marathon 2026. Official receipt has been sent to your email.");
              } else {
                alert("Sponsorship Payment Confirmed!");
              }
              spForm.reset();
              fetchPublicSponsors();
            } else {
              if (typeof showAlertModal === "function") showAlertModal(verifyData.message || "Payment verification failed.");
            }
          } catch (err) {
            console.error("Verification error:", err);
            if (typeof showAlertModal === "function") showAlertModal("Payment received. Official receipt will be emailed shortly.");
          } finally {
            spSubmitBtn.disabled = false;
            spSubmitBtn.textContent = originalText;
          }
        },
        modal: {
          ondismiss: function () {
            spSubmitBtn.disabled = false;
            spSubmitBtn.textContent = originalText;
          }
        }
      };

      var rzp = new Razorpay(options);
      rzp.open();

    } catch (err) {
      console.error("Sponsorship error:", err);
      if (typeof showAlertModal === "function") showAlertModal("Unable to connect to payment server. Please try again.");
      spSubmitBtn.disabled = false;
      spSubmitBtn.textContent = originalText;
    }
  }

  spSubmitBtn.addEventListener('click', function(e) {
    e.preventDefault();
    handleSponsorshipSubmission();
  });
});

/* ============================================================
   Contact Form (contact.html)
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
  var contactForm = document.getElementById('contactForm');
  if (!contactForm) return; // Not on the contact page — nothing to do.

  var isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  var BACKEND_URL = isLocal ? "http://localhost:3000" : "";

  var contactSubmitBtn = document.getElementById('contactSubmitBtn');
  var captchaQuestionEl = document.getElementById('cCaptchaQuestion');
  var captchaAnswerInput = document.getElementById('cCaptchaAnswer');
  var captchaRefreshBtn = document.getElementById('cCaptchaRefresh');
  var currentCaptchaToken = null;

  /* ---------------------------------------------------------
     Confirmation Popup (mirrors the site's alert-modal design)
  --------------------------------------------------------- */
  var cModalOverlay = document.getElementById('cAlertModalOverlay');
  var cModalMessage = document.getElementById('cAlertModalMessage');
  var cModalIcon = document.getElementById('cAlertModalIcon');
  var cModalClose = document.getElementById('cAlertModalClose');

  function showContactModal(message, isSuccess) {
    if (!cModalOverlay || !cModalMessage) {
      window.alert(message);
      return;
    }
    cModalMessage.textContent = message;
    if (cModalIcon) {
      cModalIcon.classList.toggle('success', !!isSuccess);
      cModalIcon.innerHTML = isSuccess
        ? '<i class="fa-solid fa-circle-check"></i>'
        : '<i class="fa-solid fa-circle-exclamation"></i>';
    }
    cModalOverlay.classList.add('open');
    if (cModalClose) cModalClose.focus();
  }

  function closeContactModal() {
    if (cModalOverlay) cModalOverlay.classList.remove('open');
  }

  if (cModalClose) cModalClose.addEventListener('click', closeContactModal);
  if (cModalOverlay) {
    cModalOverlay.addEventListener('click', function (e) {
      if (e.target === cModalOverlay) closeContactModal();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && cModalOverlay && cModalOverlay.classList.contains('open')) {
      closeContactModal();
    }
  });

  /* ---------------------------------------------------------
     Registration Notice Popup — shown once per session, shortly
     after the contact page loads, so visitors messaging about
     event registration know upfront that registrations are
     closed and won't get a response on that topic.
  --------------------------------------------------------- */
  var regNoticeOverlay = document.getElementById('cRegNoticeOverlay');
  var regNoticeClose = document.getElementById('cRegNoticeClose');
  var REG_NOTICE_STORAGE_KEY = 'contactRegNoticeShown';

  if (regNoticeOverlay) {
    function closeRegNotice() {
      regNoticeOverlay.classList.remove('open');
      try { sessionStorage.setItem(REG_NOTICE_STORAGE_KEY, '1'); } catch (e) { /* private browsing — ignore */ }
    }

    if (regNoticeClose) regNoticeClose.addEventListener('click', closeRegNotice);
    regNoticeOverlay.addEventListener('click', function (e) {
      if (e.target === regNoticeOverlay) closeRegNotice();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && regNoticeOverlay.classList.contains('open')) closeRegNotice();
    });

    var regNoticeAlreadyShown = false;
    try { regNoticeAlreadyShown = !!sessionStorage.getItem(REG_NOTICE_STORAGE_KEY); } catch (e) { /* private browsing — ignore */ }
    if (!regNoticeAlreadyShown) {
      setTimeout(function () { regNoticeOverlay.classList.add('open'); }, 900);
    }
  }

  /* ---------------------------------------------------------
     Security Check (math captcha) — fetched fresh on load and
     re-fetched after every failed attempt so a stale/used
     question can't be resubmitted.
  --------------------------------------------------------- */
  async function loadCaptcha() {
    if (captchaQuestionEl) captchaQuestionEl.textContent = 'Loading…';
    try {
      var res = await fetch(BACKEND_URL + "/api/captcha");
      var data = await res.json();
      currentCaptchaToken = data.token;
      if (captchaQuestionEl) captchaQuestionEl.textContent = 'What is ' + data.question + '?';
    } catch (err) {
      console.error("Captcha load error:", err);
      if (captchaQuestionEl) captchaQuestionEl.textContent = 'Unavailable — click refresh to retry.';
    }
    if (captchaAnswerInput) captchaAnswerInput.value = '';
  }

  loadCaptcha();
  if (captchaRefreshBtn) captchaRefreshBtn.addEventListener('click', loadCaptcha);

  function showCError(id, msg) {
    var errorEl = document.getElementById(id + '-error');
    if (errorEl) errorEl.textContent = msg;
    var wrapEl = document.getElementById(id + '-wrap');
    if (wrapEl) wrapEl.classList.add('has-error');
  }

  function clearCError(id) {
    var errorEl = document.getElementById(id + '-error');
    if (errorEl) errorEl.textContent = '';
    var wrapEl = document.getElementById(id + '-wrap');
    if (wrapEl) wrapEl.classList.remove('has-error');
  }

  ['cName', 'cPhone', 'cEmail', 'cMessage', 'cCaptchaAnswer'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', function () { clearCError(id); });
  });

  async function handleContactSubmission() {
    var name = document.getElementById('cName').value.trim();
    var phone = document.getElementById('cPhone').value.trim();
    var email = document.getElementById('cEmail').value.trim();
    var message = document.getElementById('cMessage').value.trim();
    var captchaAnswer = captchaAnswerInput ? captchaAnswerInput.value.trim() : '';
    var website = document.getElementById('cWebsite') ? document.getElementById('cWebsite').value.trim() : '';

    var isValid = true;

    if (!name) { showCError('cName', 'Full name is required.'); isValid = false; }
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) { showCError('cPhone', 'Enter a valid 10 digit mobile number.'); isValid = false; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showCError('cEmail', 'Enter a valid email address.'); isValid = false; }
    if (!message) { showCError('cMessage', 'Please enter a message.'); isValid = false; }
    if (!captchaAnswer) { showCError('cCaptchaAnswer', 'Please answer the security check.'); isValid = false; }

    if (!isValid) return;

    // contactSubmitBtn is disabled for the full request round-trip below, so a
    // double-click (or a bot firing repeated submits) can't fire a second request
    // while the first is still in flight.
    var originalText = contactSubmitBtn.textContent;
    contactSubmitBtn.disabled = true;
    contactSubmitBtn.textContent = "Sending...";

    try {
      var res = await fetch(BACKEND_URL + "/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name, phone: phone, email: email, message: message,
          captchaToken: currentCaptchaToken, captchaAnswer: captchaAnswer,
          website: website
        })
      });
      var result = await res.json();

      if (!res.ok || !result.success) {
        if (result.error === 'WRONG_CAPTCHA' || result.error === 'CAPTCHA_EXPIRED' || result.error === 'MISSING_CAPTCHA') {
          showCError('cCaptchaAnswer', result.message || 'Security check failed. Please try the new one.');
          loadCaptcha();
        } else {
          showContactModal(result.message || "Something went wrong. Please try again.", false);
        }
        return;
      }

      showContactModal(result.message || "Thank you! Your message has been sent. We'll get back to you soon.", true);
      contactForm.reset();
      loadCaptcha();
    } catch (err) {
      console.error("Contact form error:", err);
      showContactModal("Could not connect to the server. Please try again later.", false);
    } finally {
      contactSubmitBtn.disabled = false;
      contactSubmitBtn.textContent = originalText;
    }
  }

  contactSubmitBtn.addEventListener('click', function (e) {
    e.preventDefault();
    handleContactSubmission();
  });
});

/* ============================================================
   Volunteer Form (volunteer.html)
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
  var volunteerForm = document.getElementById('volunteerForm');
  if (!volunteerForm) return; // Not on the volunteer page — nothing to do.

  var isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  var BACKEND_URL = isLocal ? "http://localhost:3000" : "";

  var volunteerSubmitBtn = document.getElementById('volunteerSubmitBtn');
  var districtSelect = document.getElementById('vDistrict');
  var captchaQuestionEl = document.getElementById('vCaptchaQuestion');
  var captchaAnswerInput = document.getElementById('vCaptchaAnswer');
  var captchaRefreshBtn = document.getElementById('vCaptchaRefresh');
  var currentCaptchaToken = null;

  /* ---------------------------------------------------------
     Gender selection
  --------------------------------------------------------- */
  var selectedVGender = null;
  var vGenderBoxes = document.querySelectorAll('#volunteerForm .gender-row .option-box');
  vGenderBoxes.forEach(function (box) {
    box.addEventListener('click', function () {
      vGenderBoxes.forEach(function (b) { b.classList.remove('selected-gender'); });
      box.classList.add('selected-gender');
      selectedVGender = box.getAttribute('data-gender');
      clearVError('vGender');
    });
  });

  /* ---------------------------------------------------------
     Volunteer Page Open/Closed — controlled from the admin
     Settings page. Swaps the form out for a closed notice.
  --------------------------------------------------------- */
  var volunteerClosedPanel = document.getElementById('volunteerClosedPanel');
  var volunteerFormWrap = document.getElementById('volunteerFormWrap');

  async function checkVolunteerPageStatus() {
    try {
      var res = await fetch(BACKEND_URL + "/api/status");
      var data = await res.json();
      if (data.volunteerPageOpen === false) {
        if (volunteerClosedPanel) volunteerClosedPanel.style.display = "";
        if (volunteerFormWrap) volunteerFormWrap.style.display = "none";
      }
    } catch (err) {
      console.warn("Volunteer page status check error:", err);
    }
  }

  checkVolunteerPageStatus();

  var TN_DISTRICTS = [
    'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore',
    'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi', 'Kanchipuram',
    'Kanyakumari', 'Karur', 'Krishnagiri', 'Madurai', 'Mayiladuthurai',
    'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai',
    'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi',
    'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli',
    'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur',
    'Vellore', 'Viluppuram', 'Virudhunagar', 'Other'
  ];
  if (districtSelect) {
    TN_DISTRICTS.forEach(function (name) {
      var opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      districtSelect.appendChild(opt);
    });
  }

  /* ---------------------------------------------------------
     Confirmation Popup (mirrors the site's alert-modal design)
  --------------------------------------------------------- */
  var vModalOverlay = document.getElementById('vAlertModalOverlay');
  var vModalMessage = document.getElementById('vAlertModalMessage');
  var vModalIcon = document.getElementById('vAlertModalIcon');
  var vModalClose = document.getElementById('vAlertModalClose');

  function showVolunteerModal(message, isSuccess) {
    if (!vModalOverlay || !vModalMessage) {
      window.alert(message);
      return;
    }
    vModalMessage.textContent = message;
    if (vModalIcon) {
      vModalIcon.classList.toggle('success', !!isSuccess);
      vModalIcon.innerHTML = isSuccess
        ? '<i class="fa-solid fa-circle-check"></i>'
        : '<i class="fa-solid fa-circle-exclamation"></i>';
    }
    vModalOverlay.classList.add('open');
    if (vModalClose) vModalClose.focus();
  }

  function closeVolunteerModal() {
    if (vModalOverlay) vModalOverlay.classList.remove('open');
  }

  if (vModalClose) vModalClose.addEventListener('click', closeVolunteerModal);
  if (vModalOverlay) {
    vModalOverlay.addEventListener('click', function (e) {
      if (e.target === vModalOverlay) closeVolunteerModal();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && vModalOverlay && vModalOverlay.classList.contains('open')) {
      closeVolunteerModal();
    }
  });

  /* ---------------------------------------------------------
     Security Check (math captcha) — fetched fresh on load and
     re-fetched after every failed attempt so a stale/used
     question can't be resubmitted.
  --------------------------------------------------------- */
  async function loadCaptcha() {
    if (captchaQuestionEl) captchaQuestionEl.textContent = 'Loading…';
    try {
      var res = await fetch(BACKEND_URL + "/api/captcha");
      var data = await res.json();
      currentCaptchaToken = data.token;
      if (captchaQuestionEl) captchaQuestionEl.textContent = 'What is ' + data.question + '?';
    } catch (err) {
      console.error("Captcha load error:", err);
      if (captchaQuestionEl) captchaQuestionEl.textContent = 'Unavailable — click refresh to retry.';
    }
    if (captchaAnswerInput) captchaAnswerInput.value = '';
  }

  loadCaptcha();
  if (captchaRefreshBtn) captchaRefreshBtn.addEventListener('click', loadCaptcha);

  function showVError(id, msg) {
    var errorEl = document.getElementById(id + '-error');
    if (errorEl) errorEl.textContent = msg;
    var wrapEl = document.getElementById(id + '-wrap');
    if (wrapEl) wrapEl.classList.add('has-error');
  }

  function clearVError(id) {
    var errorEl = document.getElementById(id + '-error');
    if (errorEl) errorEl.textContent = '';
    var wrapEl = document.getElementById(id + '-wrap');
    if (wrapEl) wrapEl.classList.remove('has-error');
  }

  ['vName', 'vAge', 'vPhone', 'vEmail', 'vDistrict', 'vTshirt', 'vCaptchaAnswer'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', function () { clearVError(id); });
  });

  async function handleVolunteerSubmission() {
    var name = document.getElementById('vName').value.trim();
    var age = document.getElementById('vAge').value.trim();
    var phone = document.getElementById('vPhone').value.trim();
    var email = document.getElementById('vEmail').value.trim();
    var district = districtSelect.value;
    var tshirtSize = document.getElementById('vTshirt').value;
    var roleEl = document.getElementById('vRole');
    var role = roleEl ? roleEl.value : '';
    var experience = document.getElementById('vExperience').value;
    var message = document.getElementById('vMessage').value.trim();
    var captchaAnswer = captchaAnswerInput ? captchaAnswerInput.value.trim() : '';
    var website = document.getElementById('vWebsite') ? document.getElementById('vWebsite').value.trim() : '';

    var isValid = true;

    if (!name) { showVError('vName', 'Full name is required.'); isValid = false; }
    var ageNum = Number(age);
    if (!age || isNaN(ageNum) || ageNum < 15 || ageNum > 80) { showVError('vAge', 'Enter a valid age (15–80).'); isValid = false; }
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) { showVError('vPhone', 'Enter a valid 10 digit mobile number.'); isValid = false; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showVError('vEmail', 'Enter a valid email address.'); isValid = false; }
    if (!district) { showVError('vDistrict', 'Please select your district.'); isValid = false; }
    if (!tshirtSize) { showVError('vTshirt', 'Please select a T-shirt size.'); isValid = false; }
    if (!selectedVGender) { showVError('vGender', 'Please select your gender.'); isValid = false; }
    if (!captchaAnswer) { showVError('vCaptchaAnswer', 'Please answer the security check.'); isValid = false; }

    if (!isValid) return;

    var originalText = volunteerSubmitBtn.textContent;
    volunteerSubmitBtn.disabled = true;
    volunteerSubmitBtn.textContent = "Submitting...";

    try {
      var res = await fetch(BACKEND_URL + "/api/volunteer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name, age: ageNum, gender: selectedVGender, phone: phone, email: email, district: district,
          tshirtSize: tshirtSize, role: role, experience: experience, message: message,
          captchaToken: currentCaptchaToken, captchaAnswer: captchaAnswer,
          website: website
        })
      });
      var result = await res.json();

      if (!res.ok || !result.success) {
        if (result.error === 'WRONG_CAPTCHA' || result.error === 'CAPTCHA_EXPIRED' || result.error === 'MISSING_CAPTCHA') {
          showVError('vCaptchaAnswer', result.message || 'Security check failed. Please try the new one.');
          loadCaptcha();
        } else {
          showVolunteerModal(result.message || "Something went wrong. Please try again.", false);
        }
        return;
      }

      showVolunteerModal(result.message || "Thank you for volunteering! We'll get back to you soon.", true);
      volunteerForm.reset();
      vGenderBoxes.forEach(function (b) { b.classList.remove('selected-gender'); });
      selectedVGender = null;
      loadCaptcha();
    } catch (err) {
      console.error("Volunteer form error:", err);
      showVolunteerModal("Could not connect to the server. Please try again later.", false);
    } finally {
      volunteerSubmitBtn.disabled = false;
      volunteerSubmitBtn.textContent = originalText;
    }
  }

  volunteerSubmitBtn.addEventListener('click', function (e) {
    e.preventDefault();
    handleVolunteerSubmission();
  });
});

/* ============================================================
   Marathon Photos Promo Modal (index.html)
   Shown once per browser session, shortly after the home page
   loads, pointing visitors to the official race-day photo gallery.
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
  var photosOverlay = document.getElementById('photosPromoOverlay');
  if (!photosOverlay) return; // Not on the home page — nothing to do.

  var photosDismiss = document.getElementById('photosPromoDismiss');
  var photosLater = document.getElementById('photosPromoLater');
  var photosCta = document.getElementById('photosPromoCta');
  var PHOTOS_STORAGE_KEY = 'photosPromoShown';

  function markPhotosShown() {
    try { sessionStorage.setItem(PHOTOS_STORAGE_KEY, '1'); } catch (e) { /* private browsing — ignore */ }
  }

  function closePhotosPromo() {
    photosOverlay.classList.remove('open');
    markPhotosShown();
  }

  function openPhotosPromo() {
    var alreadyShown = false;
    try { alreadyShown = !!sessionStorage.getItem(PHOTOS_STORAGE_KEY); } catch (e) { /* private browsing — ignore */ }
    if (alreadyShown) return;
    photosOverlay.classList.add('open');
  }

  if (photosDismiss) photosDismiss.addEventListener('click', closePhotosPromo);
  if (photosLater) photosLater.addEventListener('click', closePhotosPromo);
  if (photosCta) photosCta.addEventListener('click', markPhotosShown);
  photosOverlay.addEventListener('click', function (e) {
    if (e.target === photosOverlay) closePhotosPromo();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && photosOverlay.classList.contains('open')) closePhotosPromo();
  });

  setTimeout(openPhotosPromo, 1200);
});
