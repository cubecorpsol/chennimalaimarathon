/* ============================================================
   Chennimalai Marathon — Finisher Certificate Download
   Talks to the ADMIN backend's public endpoint (a separate deployment from this
   site's own registration backend), not js/marathon-api.js's BACKEND_URL.
   Every check (mobile number/BIB match, finished status, review hold) happens server-side —
   this file only collects input, shows the right message, and saves the file the
   server sends back. Nothing about certificate generation or storage is exposed here.
   ============================================================ */

const ADMIN_API_BASE = "https://admin.chennimalaimarathon.com";

(function () {
  const checkingBlock = document.getElementById("certCheckingBlock");
  const closedBlock = document.getElementById("certClosedBlock");
  const closedText = document.getElementById("certClosedText");
  const availableBlock = document.getElementById("certAvailableBlock");

  const downloadBtn = document.getElementById("certDownloadBtn");
  const mobileInput = document.getElementById("crMobile");
  const mobileError = document.getElementById("crMobile-error");
  const bibInput = document.getElementById("crBib");
  const bibError = document.getElementById("crBib-error");

  const modalOverlay = document.getElementById("crAlertModalOverlay");
  const modalIcon = document.getElementById("crAlertModalIcon");
  const modalMessage = document.getElementById("crAlertModalMessage");
  const modalClose = document.getElementById("crAlertModalClose");

  function showModal(ok, message) {
    modalIcon.classList.toggle("success", !!ok);
    modalIcon.innerHTML = ok
      ? '<i class="fa-solid fa-circle-check"></i>'
      : '<i class="fa-solid fa-circle-exclamation"></i>';
    modalMessage.textContent = message;
    modalOverlay.classList.add("open");
  }
  modalClose?.addEventListener("click", () => modalOverlay.classList.remove("open"));

  const DEFAULT_CLOSED_MESSAGE = "Certificate downloads aren't available yet. Please complete the marathon and come back to this page to download your details.";

  function showClosed(message) {
    checkingBlock.style.display = "none";
    availableBlock.style.display = "none";
    closedBlock.style.display = "flex";
    closedText.textContent = message || DEFAULT_CLOSED_MESSAGE;
  }

  function showAvailable() {
    checkingBlock.style.display = "none";
    closedBlock.style.display = "none";
    availableBlock.style.display = "block";
  }

  // Checks with the admin backend whether downloads are turned on before ever showing the form —
  // the actual gate is enforced server-side too (POST /certificate-download refuses regardless of
  // what this page shows), this just avoids showing a form that would fail on submit anyway.
  async function checkAvailability() {
    if (ADMIN_API_BASE.includes("REPLACE_WITH_ADMIN_BACKEND_URL")) {
      showClosed("Certificate downloads aren't configured yet — please contact the event team.");
      return;
    }
    try {
      const res = await fetch(`${ADMIN_API_BASE}/api/public/certificate-download-status`);
      const data = await res.json();
      if (res.ok && data.success && data.enabled) {
        showAvailable();
      } else {
        showClosed(data.message);
      }
    } catch {
      showClosed("Couldn't check certificate download availability — please try again shortly.");
    }
  }

  function clearErrors() {
    mobileError.textContent = "";
    bibError.textContent = "";
  }

  function setButtonBusy(busy) {
    downloadBtn.disabled = busy;
    downloadBtn.innerHTML = busy
      ? '<i class="fa-solid fa-spinner fa-spin"></i> PREPARING YOUR CERTIFICATE…'
      : '<i class="fa-solid fa-download"></i> DOWNLOAD CERTIFICATE';
  }

  // Extracts filename="..." from a Content-Disposition header, falling back to a generic name.
  function filenameFromDisposition(header) {
    const match = /filename="?([^"]+)"?/i.exec(header || "");
    return match ? match[1] : "Finisher-Certificate.pdf";
  }

  async function submitDownload() {
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

    if (ADMIN_API_BASE.includes("REPLACE_WITH_ADMIN_BACKEND_URL")) {
      showModal(false, "Certificate downloads aren't configured yet — please contact the event team.");
      return;
    }

    setButtonBusy(true);
    try {
      const res = await fetch(`${ADMIN_API_BASE}/api/public/certificate-download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobileNumber, bibNumber })
      });

      const contentType = res.headers.get("Content-Type") || "";
      if (res.ok && contentType.includes("application/pdf")) {
        const blob = await res.blob();
        const filename = filenameFromDisposition(res.headers.get("Content-Disposition"));
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        showModal(true, "Your certificate has downloaded to your device.");
      } else {
        const data = await res.json().catch(() => ({}));
        showModal(false, data.message || "Couldn't download your certificate. Please try again or contact the event team.");
      }
    } catch {
      showModal(false, "Couldn't reach the certificate service. Check your connection and try again.");
    } finally {
      setButtonBusy(false);
    }
  }

  downloadBtn?.addEventListener("click", submitDownload);
  checkAvailability();
})();
