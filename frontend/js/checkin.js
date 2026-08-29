/* ============================================================
   Chennimalai Marathon — Race Day Check-In
   Talks to the ADMIN backend's public endpoint (a separate deployment from this
   site's own registration backend), not js/marathon-api.js's BACKEND_URL.
   ============================================================ */

const ADMIN_API_BASE = "https://admin.chennimalaimarathon.com";

(function () {
  const locationRow = document.getElementById("checkinLocationStatus");
  const locationText = document.getElementById("checkinLocationText");
  const submitBtn = document.getElementById("checkinSubmitBtn");
  const mobileInput = document.getElementById("ciMobile");
  const mobileError = document.getElementById("ciMobile-error");
  const bibInput = document.getElementById("ciBib");
  const bibError = document.getElementById("ciBib-error");

  const modalOverlay = document.getElementById("ciAlertModalOverlay");
  const modalIcon = document.getElementById("ciAlertModalIcon");
  const modalMessage = document.getElementById("ciAlertModalMessage");
  const modalClose = document.getElementById("ciAlertModalClose");

  let coords = null; // { lat, lng, accuracy }

  function showModal(ok, message) {
    modalIcon.classList.toggle("success", !!ok);
    modalIcon.innerHTML = ok
      ? '<i class="fa-solid fa-circle-check"></i>'
      : '<i class="fa-solid fa-circle-exclamation"></i>';
    modalMessage.textContent = message;
    modalOverlay.classList.add("open");
  }
  modalClose?.addEventListener("click", () => modalOverlay.classList.remove("open"));

  function setLocationRow(state, text) {
    locationRow.classList.remove("ok", "err");
    if (state === "ok") locationRow.classList.add("ok");
    if (state === "err") locationRow.classList.add("err");
    locationText.textContent = text;
  }

  function setButtonReady(ready, label, spin) {
    submitBtn.disabled = !ready;
    if (ready) {
      submitBtn.innerHTML = "CHECK IN";
    } else if (spin) {
      submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${label}`;
    } else {
      submitBtn.innerHTML = `<i class="fa-solid fa-lock"></i> ${label}`;
    }
  }

  function requestLocation() {
    if (!("geolocation" in navigator)) {
      setLocationRow("err", "Your browser doesn't support location — check-in isn't possible here.");
      setButtonReady(false, "LOCATION UNAVAILABLE");
      return;
    }
    setLocationRow("", "Requesting your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        };
        setLocationRow("ok", "Location found — you're ready to check in.");
        setButtonReady(true);
      },
      () => {
        setLocationRow("err", "Location permission denied. Enable location access for this site and reload the page.");
        setButtonReady(false, "LOCATION BLOCKED");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  function clearErrors() {
    mobileError.textContent = "";
    bibError.textContent = "";
  }

  async function submitCheckin() {
    clearErrors();
    const mobileNumber = (mobileInput.value || "").trim();
    const bibNumber = (bibInput.value || "").trim();
    let hasError = false;
    // Accepts a bare 10-digit number or one with a +91/0 prefix, spaces, or dashes — the server
    // normalizes to the last 10 digits the same way, so this is just a friendly early check.
    if (!mobileNumber || mobileNumber.replace(/\D/g, "").slice(-10).length !== 10) {
      mobileError.textContent = "Enter a valid 10-digit mobile number.";
      hasError = true;
    }
    if (!bibNumber) {
      bibError.textContent = "Enter your BIB number.";
      hasError = true;
    }
    if (hasError) return;

    if (!coords) {
      showModal(false, "Location isn't ready yet — please wait a moment and try again.");
      return;
    }

    if (ADMIN_API_BASE.includes("REPLACE_WITH_ADMIN_BACKEND_URL")) {
      showModal(false, "Check-in isn't configured yet — please check in at a station counter instead.");
      return;
    }

    setButtonReady(false, "CHECKING IN…", true);
    try {
      const res = await fetch(`${ADMIN_API_BASE}/api/public/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobileNumber, bibNumber, lat: coords.lat, lng: coords.lng, accuracy: coords.accuracy })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showModal(true, data.autoStarted
          ? "You're checked in — good luck out there! Your official race start has been recorded."
          : "You're checked in — good luck out there!");
      } else {
        showModal(false, data.message || "Check-in failed. Please try again or see a station counter.");
      }
    } catch {
      showModal(false, "Couldn't reach the check-in service. Check your connection and try again.");
    } finally {
      setButtonReady(true);
    }
  }

  submitBtn?.addEventListener("click", submitCheckin);
  requestLocation();
})();
