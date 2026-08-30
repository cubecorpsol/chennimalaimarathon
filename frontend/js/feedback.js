/* ============================================================
   Chennimalai Marathon — Post-Race Feedback
   Talks to the ADMIN backend's public endpoint (a separate deployment from this
   site's own registration backend), not js/marathon-api.js's BACKEND_URL.
   Identity (BIB + mobile number) is verified server-side the same way the finisher
   certificate page does it — this file only collects input, shows the right message,
   and prefills from the query string when arriving from the certificate email.
   ============================================================ */

const ADMIN_API_BASE = "https://admin.chennimalaimarathon.com";

(function () {
  const stars = Array.from(document.querySelectorAll("#fbStars button"));
  const ratingLabel = document.getElementById("fbRatingLabel");
  const ratingError = document.getElementById("fbRating-error");
  const emailInput = document.getElementById("fbEmail");
  const mobileInput = document.getElementById("fbMobile");
  const mobileError = document.getElementById("fbMobile-error");
  const bibInput = document.getElementById("fbBib");
  const bibError = document.getElementById("fbBib-error");
  const commentInput = document.getElementById("fbComment");
  const charCounter = document.getElementById("fbCharCounter");
  const submitBtn = document.getElementById("fbSubmitBtn");

  const modalOverlay = document.getElementById("fbAlertModalOverlay");
  const modalIcon = document.getElementById("fbAlertModalIcon");
  const modalMessage = document.getElementById("fbAlertModalMessage");
  const modalClose = document.getElementById("fbAlertModalClose");

  const RATING_LABELS = { 1: "Needs Improvement", 2: "Below Average", 3: "Average", 4: "Good", 5: "Excellent" };
  let selectedRating = 0;

  function showModal(ok, message) {
    modalIcon.classList.toggle("success", !!ok);
    modalIcon.innerHTML = ok
      ? '<i class="fa-solid fa-circle-check"></i>'
      : '<i class="fa-solid fa-circle-exclamation"></i>';
    modalMessage.textContent = message;
    modalOverlay.classList.add("open");
  }
  modalClose?.addEventListener("click", () => modalOverlay.classList.remove("open"));

  function paintStars(value) {
    stars.forEach(btn => {
      const v = Number(btn.dataset.value);
      btn.classList.toggle("filled", v <= value);
    });
    ratingLabel.textContent = value ? RATING_LABELS[value] : "Tap a star to rate";
  }

  function selectRating(value) {
    selectedRating = value;
    paintStars(value);
    ratingError.textContent = "";
  }

  stars.forEach(btn => {
    btn.addEventListener("click", () => selectRating(Number(btn.dataset.value)));
    btn.addEventListener("mouseenter", () => paintStars(Number(btn.dataset.value)));
  });
  document.getElementById("fbStars").addEventListener("mouseleave", () => paintStars(selectedRating));

  function updateCharCounter() {
    const remaining = 100 - commentInput.value.length;
    charCounter.textContent = `${remaining} character${remaining === 1 ? "" : "s"} left`;
    charCounter.classList.toggle("warn", remaining <= 10);
  }
  commentInput.addEventListener("input", updateCharCounter);

  // Prefill from the certificate email's link — ?email=...&bib=...&mobile=...&rating=...
  function prefillFromQuery() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("email")) emailInput.value = params.get("email");
    if (params.get("mobile")) mobileInput.value = params.get("mobile");
    if (params.get("bib")) bibInput.value = params.get("bib");
    const rating = parseInt(params.get("rating"), 10);
    if (rating >= 1 && rating <= 5) selectRating(rating);
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

    if (!selectedRating) {
      ratingError.textContent = "Please pick a star rating.";
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

    setButtonBusy(true);
    try {
      const res = await fetch(`${ADMIN_API_BASE}/api/public/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobileNumber, bibNumber, rating: selectedRating, comment })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        showModal(true, "Thank you! Your feedback has been submitted.");
      } else {
        showModal(false, data.message || "Couldn't submit your feedback. Please try again.");
      }
    } catch {
      showModal(false, "Couldn't reach the feedback service. Check your connection and try again.");
    } finally {
      setButtonBusy(false);
    }
  }

  submitBtn?.addEventListener("click", submitFeedback);
  updateCharCounter();
  prefillFromQuery();
})();
