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
   CHENNIMALAI MARATHON — REGISTER PAGE
   Step navigation, validation, DOB → Category auto selection,
   and progress indicator for register.html
   ========================================================= */

document.addEventListener('DOMContentLoaded', function () {
  var isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  var BACKEND_URL = isLocal ? "http://localhost:3000" : ""; 

  function updateDynamicPrices(settings) {
    if (!settings) return;
    var adultFee = settings.adultFee || 500;
    var kidsFee = settings.kidsFee || 300;
    var tshirtPrice = settings.tshirtPrice || 200;

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
      el.textContent = '₹' + tshirtPrice;
    });
  }

  async function checkGlobalStatus() {
    try {
      var res = await fetch(BACKEND_URL + "/api/status");
      var data = await res.json();
      updateDynamicPrices(data);
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
    adultFee: 500,
    kidsFee: 300,
    tshirtPrice: 200,
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

  function updateTshirtHint() {
    var hint = document.getElementById('tshirt-hint');
    if (!hint) return;
    var cutoff = getAgeCutoff();
    hint.textContent = 'Available only for runners aged above ' + cutoff + ' (7 KM category).';
  }

  function updateRegistrationSummary() {
    var feeEl = document.getElementById('summaryRegFee');
    var tshirtRow = document.getElementById('summaryTshirtRow');
    var tshirtEl = document.getElementById('summaryTshirtFee');
    var pgEl = document.getElementById('summaryPgFee');
    var totalEl = document.getElementById('summaryTotal');
    if (!feeEl && !totalEl) return;

    var cutoff = getAgeCutoff();
    var fee = currentSettings.adultFee || 500;
    var isKids = false;
    var dob = dobInput ? parseDOB(dobInput.value) : null;
    if (dob) {
      var age = calculateAge(dob, EVENT_DATE);
      isKids = age <= cutoff;
      fee = isKids
        ? (currentSettings.kidsFee || 300)
        : (currentSettings.adultFee || 500);
    }

    var tshirtSelectEl = document.getElementById('tshirt');
    var tshirtSelected = !isKids && tshirtSelectEl &&
      tshirtSelectEl.value !== "" &&
      tshirtSelectEl.value !== "NO" &&
      tshirtSelectEl.value !== "N/A";
    var tshirtFee = tshirtSelected ? (currentSettings.tshirtPrice || 200) : 0;
    var subtotal = fee + tshirtFee;
    var pgFee = Number((subtotal * 0.025).toFixed(2));
    var total = Number((subtotal + pgFee).toFixed(2));

    if (feeEl) feeEl.textContent = formatRupee(fee);
    if (tshirtRow) tshirtRow.style.display = tshirtFee > 0 ? "" : "none";
    if (tshirtEl) tshirtEl.textContent = formatRupee(tshirtFee);
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
        disableRegistrations("Registrations Closed! All slots have been filled or registrations are closed.");
      }

      // Handle dynamic remaining slots badge if present on DOM
      var slotsContainer = document.getElementById("remainingSlotsBadge") || document.querySelector(".remaining-slots-box");
      if (slotsContainer) {
        if (data.showRemainingSlots === false) {
          slotsContainer.style.display = "none";
        } else {
          slotsContainer.style.display = "";
          var slotsVal = document.getElementById("remainingSlotsVal");
          if (slotsVal) slotsVal.textContent = data.remainingSlots;
        }
      }

      updateTshirtHint();
      updateRegistrationSummary();
    } catch (err) {
      console.warn("Status check error:", err);
    }
  }

  function disableRegistrations(msg) {
    if (registerBtn) {
      registerBtn.disabled = true;
      registerBtn.textContent = "REGISTRATIONS CLOSED";
    }
    if (continueBtn) {
      continueBtn.disabled = true;
      continueBtn.textContent = "REGISTRATIONS CLOSED";
    }
    showAlertModal(msg);
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

  checkStatus();

  /* ---------------------------------------------------------
     Element references
  --------------------------------------------------------- */
  var formSteps = document.querySelectorAll('.form-step');

  // Step 1 — Personal Details
  var fullNameInput    = document.getElementById('fullName');
  var dobInput         = document.getElementById('dob');
  var phoneInput       = document.getElementById('phone');
  var emailInput       = document.getElementById('email');
  var districtSelect   = document.getElementById('district');
  var pincodeInput     = document.getElementById('pincode');
  var tshirtSelect     = document.getElementById('tshirt');
  var bloodGroupSelect = document.getElementById('bloodGroup');
  var continueBtn      = document.getElementById('continueBtn');

  // Step 2 — Additional Details
  var backToPersonal        = document.getElementById('backToPersonal');
  var categoryNameEl        = document.getElementById('categoryName');
  var categoryAgeEl         = document.getElementById('categoryAge');
  var genderBoxes           = document.querySelectorAll('.gender-row .option-box');
  var emergencyContactInput = document.getElementById('emergencyContact');
  var fitnessCheckbox       = document.getElementById('fitnessConfirm');
  var registerBtn           = document.getElementById('registerBtn');

  var selectedGender = null;

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
      if (tshirtFormGroup) tshirtFormGroup.style.display = 'none';
      if (tshirtSelect) tshirtSelect.value = 'N/A';
      clearError('tshirt');
    } else {
      if (categoryNameEl) categoryNameEl.textContent = '7 KM TIMED RUN';
      if (categoryAgeEl) categoryAgeEl.textContent = 'Age: Above ' + cutoff + ' Years';
      if (tshirtFormGroup) tshirtFormGroup.style.display = '';
      if (tshirtSelect && tshirtSelect.value === 'N/A') tshirtSelect.value = '';
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
    var dob = parseDOB(dobInput.value);
    if (dob) {
      var age = calculateAge(dob, EVENT_DATE);
      if (age <= getAgeCutoff()) {
        clearError('tshirt');
        return true;
      }
    }
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

  function validateStep1() {
    var results = [
      validateFullName(),
      validateDOB(),
      validatePhone(),
      validateEmail(),
      validateDistrict(),
      validatePincode(),
      validateTshirt(),
      validateBloodGroup()
    ];
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

  function validateStep2() {
    var results = [
      validateGender(),
      validateEmergencyContact(),
      validateFitness()
    ];
    return results.indexOf(false) === -1;
  }

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
    formSteps.forEach(function (step) { step.classList.remove('active'); });
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

  if (continueBtn) {
    continueBtn.addEventListener('click', function () {
      if (validateStep1()) {
        updateCategory();
        updateRegistrationSummary();
        goToStep('step-additional');
      }
    });
  }

  if (backToPersonal) {
    backToPersonal.addEventListener('click', function () {
      goToStep('step-personal');
    });
  }

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

    var payload = {
      fullName: fullNameInput.value.trim(),
      dob: cleanDob,
      phone: phoneInput.value.trim(),
      email: emailInput.value.trim(),
      district: districtSelect.value,
      pincode: pincodeInput.value.trim(),
      tshirtSize: isKidsUser ? "N/A" : (tshirtSelect.value || "M"),
      tshirtSelected: !isKidsUser && tshirtSelect.value !== "" && tshirtSelect.value !== "NO" && tshirtSelect.value !== "N/A",
      bloodGroup: bloodGroupSelect.value,
      gender: selectedGender,
      emergencyContact: emergencyContactInput.value.trim()
    };

    try {
      var orderRes = await fetch(BACKEND_URL + "/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      var orderData = await orderRes.json();

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
            disableRegistrations("Registrations are now officially closed.");
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
                disableRegistrations("Registrations are now officially closed.");
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

  if (registerBtn) {
    registerBtn.addEventListener('click', function (e) {
      e.preventDefault();
      if (validateStep2()) {
        handleFormSubmission();
      }
    });
  }

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
              <p>Sponsorship opportunities are open. Be our early partner and get featured here.</p>
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
