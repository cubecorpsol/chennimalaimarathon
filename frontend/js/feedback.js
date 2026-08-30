/* ============================================================
   Chennimalai Marathon — Post-Race Feedback (multi-category)
   Talks to the ADMIN backend's public endpoints (a separate deployment from this
   site's own registration backend), not js/marathon-api.js's BACKEND_URL.
   Identity (BIB + mobile number) is verified server-side the same way the finisher
   certificate page does it — this file only collects input, shows the right message,
   and prefills from the query string when arriving from the certificate email.
   Categories are fetched from the admin-editable list, not hardcoded here, so adding/
   renaming/reordering a category on the admin Reviews page needs no changes to this file.
   ============================================================ */

const ADMIN_API_BASE = "https://admin.chennimalaimarathon.com";

(function () {
  const categoriesLoading = document.getElementById("fbCategoriesLoading");
  const categoriesWrap = document.getElementById("fbCategoryRatings");
  const ratingError = document.getElementById("fbRating-error");
  const emailInput = document.getElementById("fbEmail");
  const mobileInput = document.getElementById("fbMobile");
  const mobileError = document.getElementById("fbMobile-error");
  const bibInput = document.getElementById("fbBib");
  const bibError = document.getElementById("fbBib-error");
  const commentInput = document.getElementById("fbComment");
  const charCounter = document.getElementById("fbCharCounter");
  const submitBtn = document.getElementById("fbSubmitBtn");
  const formWrap = document.getElementById("fbFormWrap");
  const thankYouPanel = document.getElementById("fbThankYou");

  const modalOverlay = document.getElementById("fbAlertModalOverlay");
  const modalIcon = document.getElementById("fbAlertModalIcon");
  const modalMessage = document.getElementById("fbAlertModalMessage");
  const modalClose = document.getElementById("fbAlertModalClose");

  const RATING_LABELS = { 1: "Needs Improvement", 2: "Below Average", 3: "Average", 4: "Good", 5: "Excellent" };
  // categoryName -> selected rating (1-5), populated once categories load.
  const selectedRatings = {};
  let categories = [];

  function showErrorModal(message) {
    modalIcon.classList.remove("success");
    modalIcon.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i>';
    modalMessage.textContent = message;
    modalOverlay.classList.add("open");
  }
  modalClose?.addEventListener("click", () => modalOverlay.classList.remove("open"));

  function paintStars(row, value) {
    row.querySelectorAll("button").forEach(btn => {
      btn.classList.toggle("filled", Number(btn.dataset.value) <= value);
    });
    const label = row.parentElement.querySelector(".category-rating-label");
    if (label) label.textContent = value ? RATING_LABELS[value] : "";
  }

  function renderCategories(prefillRating) {
    categoriesWrap.innerHTML = "";
    categories.forEach(name => {
      if (prefillRating) selectedRatings[name] = prefillRating;

      const row = document.createElement("div");
      row.className = "category-rating-row";

      const nameEl = document.createElement("div");
      nameEl.className = "category-rating-name";
      nameEl.textContent = name;

      const starsEl = document.createElement("div");
      starsEl.className = "star-rating";
      for (let n = 1; n <= 5; n++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.dataset.value = String(n);
        btn.setAttribute("aria-label", `${n} star${n === 1 ? "" : "s"} for ${name}`);
        btn.innerHTML = '<i class="fa-solid fa-star"></i>';
        btn.addEventListener("click", () => {
          selectedRatings[name] = n;
          paintStars(starsEl, n);
          ratingError.textContent = "";
        });
        starsEl.appendChild(btn);
      }
      if (prefillRating) paintStars(starsEl, prefillRating);

      row.appendChild(nameEl);
      row.appendChild(starsEl);
      categoriesWrap.appendChild(row);
    });
    categoriesLoading.style.display = "none";
    categoriesWrap.style.display = "block";
  }

  async function loadCategories() {
    const params = new URLSearchParams(window.location.search);
    const prefillRating = parseInt(params.get("rating"), 10);
    try {
      const res = await fetch(`${ADMIN_API_BASE}/api/public/feedback-categories`);
      const data = await res.json();
      if (res.ok && data.success && data.categories.length > 0) {
        categories = data.categories;
        renderCategories(prefillRating >= 1 && prefillRating <= 5 ? prefillRating : null);
      } else {
        categoriesLoading.innerHTML = "Feedback categories aren't available right now — please try again later.";
      }
    } catch {
      categoriesLoading.innerHTML = "Couldn't load rating categories. Please check your connection and reload.";
    }
  }

  function updateCharCounter() {
    const remaining = 100 - commentInput.value.length;
    charCounter.textContent = `${remaining} character${remaining === 1 ? "" : "s"} left`;
    charCounter.classList.toggle("warn", remaining <= 10);
  }
  commentInput.addEventListener("input", updateCharCounter);

  function prefillContactFromQuery() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("email")) emailInput.value = params.get("email");
    if (params.get("mobile")) mobileInput.value = params.get("mobile");
    if (params.get("bib")) bibInput.value = params.get("bib");
  }

  function clearErrors() {
    mobileError.textContent = "";
    bibError.textContent = "";
    ratingError.textContent = "";
  }

  function setButtonBusy(busy) {
    submitBtn.disabled = busy;
    submitBtn.innerHTML = busy
      ? '<i class="fa-solid fa-spinner fa-spin"></i> SUBMITTING…'
      : '<i class="fa-solid fa-paper-plane"></i> SUBMIT FEEDBACK';
  }

  async function submitFeedback() {
    clearErrors();
    const mobileNumber = (mobileInput.value || "").trim();
    const bibNumber = (bibInput.value || "").trim();
    const comment = (commentInput.value || "").trim().slice(0, 100);
    let hasError = false;

    const missing = categories.filter(name => !selectedRatings[name]);
    if (missing.length > 0) {
      ratingError.textContent = "Please rate every category before submitting.";
      hasError = true;
    }
    if (!mobileNumber || mobileNumber.replace(/\D/g, "").slice(-10).length !== 10) {
      mobileError.textContent = "Enter a valid 10-digit mobile number.";
      hasError = true;
    }
    if (!bibNumber) {
      bibError.textContent = "Enter your BIB number.";
      hasError = true;
    }
    if (hasError) return;

    const ratings = categories.map(name => ({ category: name, rating: selectedRatings[name] }));

    setButtonBusy(true);
    try {
      const res = await fetch(`${ADMIN_API_BASE}/api/public/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobileNumber, bibNumber, ratings, comment })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        // Swap the form out for a clean confirmation panel — showing a success popup while the
        // filled-in form just sat there unchanged was the actual bug being fixed here.
        formWrap.style.display = "none";
        thankYouPanel.style.display = "block";
      } else {
        showErrorModal(data.message || "Couldn't submit your feedback. Please try again.");
      }
    } catch {
      showErrorModal("Couldn't reach the feedback service. Check your connection and try again.");
    } finally {
      setButtonBusy(false);
    }
  }

  submitBtn?.addEventListener("click", submitFeedback);
  updateCharCounter();
  prefillContactFromQuery();
  loadCategories();
})();
