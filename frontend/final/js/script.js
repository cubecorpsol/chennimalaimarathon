/* =========================================================
   CHENNIMALAI MARATHON — REGISTER PAGE
   Step navigation, validation, DOB → Category auto selection,
   and progress indicator for register.html
   ========================================================= */

document.addEventListener('DOMContentLoaded', function () {

  var registerSection = document.querySelector('.register-section');
  if (!registerSection) return; // Not on the register page — nothing to do.

  /* ---------------------------------------------------------
     Backend Configuration
  --------------------------------------------------------- */
  // Dynamically points to local server or relative path when hosted live on Render / Vercel
  var isLocalOrFile = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.protocol === "file:";
  var BACKEND_URL = isLocalOrFile ? "http://localhost:3000" : ""; 
  var DEMO_MODE = false; // Set to false for live customer production mode!

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

  /* ---------------------------------------------------------
     DOB → Category auto selection
  --------------------------------------------------------- */
  function updateCategory() {
    var dob = parseDOB(dobInput.value);
    if (!dob) return;

    var age = calculateAge(dob, EVENT_DATE);

    if (age < 13) {
      if (categoryNameEl) categoryNameEl.textContent = '5 KM FUN RUN';
      if (categoryAgeEl) categoryAgeEl.textContent = 'Age: Below 13 Years';
    } else {
      if (categoryNameEl) categoryNameEl.textContent = '10 KM TIMED RUN';
      if (categoryAgeEl) categoryAgeEl.textContent = 'Age: Above 13 Years';
    }
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
    if (age > 100) {
      showError('dob', 'Please enter a valid date of birth.');
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
    if (!tshirtSelect.value) {
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

  if (continueBtn) {
    continueBtn.addEventListener('click', function () {
      if (validateStep1()) {
        updateCategory();
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
    var endpoint = DEMO_MODE ? "/api/register-demo" : "/api/register";
    var originalText = registerBtn.textContent;
    registerBtn.disabled = true;
    registerBtn.textContent = "Submitting...";

    // Clean DOB into slashes DD/MM/YYYY for backend compatibility
    var cleanDob = dobInput.value.replace(/\s+/g, '');

    var payload = {
      fullName: fullNameInput.value.trim(),
      dob: cleanDob,
      phone: phoneInput.value.trim(),
      email: emailInput.value.trim(),
      district: districtSelect.value,
      pincode: pincodeInput.value.trim(),
      tshirtSize: tshirtSelect.value,
      bloodGroup: bloodGroupSelect.value,
      gender: selectedGender,
      emergencyContact: emergencyContactInput.value.trim()
    };

    try {
      var response = await fetch(BACKEND_URL + endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      var result = await response.json();

      if (response.status === 409) {
        alert("This email address is already registered. Please use a different email address.");
        return;
      }

      if (response.status === 403) {
        alert("Registrations are closed. All slots have been filled.");
        return;
      }

      if (!response.ok) {
        alert(result.message || "Something went wrong. Please try again.");
        return;
      }

      // Success!
      console.log("Backend response:", result);
      goToStep('step-success');

    } catch (err) {
      console.error("API Error:", err);
      alert("Could not connect to backend server. Make sure your Express server is running on port 3000.");
    } finally {
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