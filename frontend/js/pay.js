/* ============================================================
   CHENIMALAI MARATHON — SECURE PAYMENT LINK HANDLER
   Supports Razorpay Checkout + PayU Hosted Checkout
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("payContentArea");
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  const statusParam = urlParams.get("status");

  // Handle PayU redirect return (surl/furl → pay.html?status=...)
  if (statusParam === "success") {
    renderSuccessState({
      tshirtNumber: urlParams.get("bib") || "Assigned",
      category: urlParams.get("category") || "Marathon"
    }, {
      fullName: urlParams.get("name") || "Runner",
      email: urlParams.get("email") || "",
      category: urlParams.get("category") || "Marathon"
    });
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname + (token ? `?token=${encodeURIComponent(token)}` : ""));
    }
    return;
  }

  if (statusParam === "failed") {
    const reason = urlParams.get("reason") || "Transaction declined";
    renderErrorState("Payment Failed", reason);
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname + (token ? `?token=${encodeURIComponent(token)}` : ""));
    }
    return;
  }

  if (!token) {
    renderErrorState("Missing Payment Link", "This payment link is invalid or incomplete. Please check the URL received in your email.");
    return;
  }

  try {
    const res = await fetch(`/api/payment-request/${encodeURIComponent(token)}`);
    const data = await res.json();

    if (!res.ok || !data.success) {
      if (data.isPaid) {
        renderPaidState(data.message);
      } else if (data.isExpired) {
        renderExpiredState(data.message);
      } else {
        renderErrorState("Invalid Payment Link", data.message || "Unable to locate payment record.");
      }
      return;
    }

    renderPaymentSummary(data.registration, token);
  } catch (err) {
    console.error("Fetch payment token error:", err);
    renderErrorState("Connection Error", "Unable to connect to marathon server. Please check your internet connection.");
  }

  function renderErrorState(title, message) {
    container.innerHTML = `
      <div class="state-card error">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(message)}</p>
        <a href="index.html" class="btn-pay-now" style="text-decoration: none; max-width: 200px; margin: 0 auto; padding: 12px 20px; font-size: 15px;">
          Go to Homepage
        </a>
      </div>
    `;
  }

  function renderPaidState(message) {
    container.innerHTML = `
      <div class="state-card success">
        <i class="fa-solid fa-circle-check"></i>
        <h3>Payment Already Completed!</h3>
        <p>${escapeHtml(message || "Your registration for Chennimalai Marathon 2026 is confirmed. This unique payment link has been deactivated to prevent duplicate payments.")}</p>
        <a href="index.html" class="btn-pay-now" style="text-decoration: none; max-width: 220px; margin: 0 auto; padding: 12px 20px; font-size: 15px;">
          <i class="fa-solid fa-house" style="font-size: 13px;"></i> Return to Homepage
        </a>
      </div>
    `;
  }

  function renderExpiredState(message) {
    container.innerHTML = `
      <div class="state-card expired">
        <i class="fa-solid fa-clock"></i>
        <h3>Payment Link Expired</h3>
        <p>${escapeHtml(message || "This payment request link has expired. Please contact the marathon admin team to request a new payment link.")}</p>
        <a href="contact.html" class="btn-pay-now" style="text-decoration: none; max-width: 220px; margin: 0 auto; padding: 12px 20px; font-size: 15px;">
          <i class="fa-solid fa-envelope"></i> Contact Support
        </a>
      </div>
    `;
  }

  function renderSuccessState(result, reg) {
    const bib = result.tshirtNumber || "Assigned";
    container.innerHTML = `
      <div class="state-card success">
        <i class="fa-solid fa-circle-check"></i>
        <h3>Payment Successful!</h3>
        <p>Congratulations <strong>${escapeHtml(reg.fullName)}</strong>! Your registration payment for <strong>${escapeHtml(reg.category || result.category || "Marathon")}</strong> has been received successfully.</p>
        
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px; margin: 20px 0; text-align: center;">
          <div style="font-size: 12px; color: #166534; font-weight: 700; text-transform: uppercase;">OFFICIAL BIB NUMBER</div>
          <div style="font-size: 28px; font-weight: 800; color: #15803d; font-family: 'Poppins', sans-serif;">#${escapeHtml(bib)}</div>
        </div>

        <p style="font-size: 13px; color: #64748b; margin-bottom: 24px;">A confirmation receipt email has been dispatched to <strong>${escapeHtml(reg.email || "")}</strong>.</p>

        <a href="index.html" class="btn-pay-now" style="text-decoration: none; max-width: 220px; margin: 0 auto; padding: 12px 20px; font-size: 15px;">
          <i class="fa-solid fa-house"></i> Go to Homepage
        </a>
      </div>
    `;
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function resetPayButton(btn, amount) {
    btn.disabled = false;
    const formatted = (amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    btn.innerHTML = `<i class="fa-solid fa-lock"></i> <span>Proceed to Pay ₹${formatted}</span>`;
  }

  function submitPayuForm(action, params) {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = action;
    form.style.display = "none";

    Object.keys(params || {}).forEach((key) => {
      if (params[key] === undefined || params[key] === null) return;
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = String(params[key]);
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  }

  function renderPaymentSummary(reg, paymentToken) {
    const subtotal = (reg.registrationFee || 0) + (reg.tshirtFee || 0);
    const pgFeeVal = reg.pgFee !== undefined && reg.pgFee > 0 ? reg.pgFee : Number((subtotal * 0.025).toFixed(2));
    const totalVal = reg.totalAmount && reg.totalAmount > subtotal ? reg.totalAmount : Number((subtotal + pgFeeVal).toFixed(2));

    const totalFormatted = totalVal.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    const regFeeFormatted = (reg.registrationFee || 0).toLocaleString("en-IN");
    const tshirtFeeVal = reg.tshirtFee || 0;
    const tshirtFeeFormatted = tshirtFeeVal.toLocaleString("en-IN");
    const pgFeeFormatted = pgFeeVal.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    const gatewayLabel = (reg.paymentGateway || "razorpay").toLowerCase() === "payu" ? "PayU" : "Razorpay";
    const tshirtFeeRow = tshirtFeeVal > 0
      ? `<div class="summary-row">
          <span class="label">T-Shirt Addon Fee</span>
          <span class="value">₹${tshirtFeeFormatted}</span>
        </div>`
      : "";

    container.innerHTML = `
      <div class="summary-card">
        <div class="summary-title"><i class="fa-solid fa-user-check" style="color: #ff6b00;"></i> Registration Details Summary</div>
        <div class="summary-row">
          <span class="label">Participant Name</span>
          <span class="value">${escapeHtml(reg.fullName)}</span>
        </div>
        <div class="summary-row">
          <span class="label">Event Category</span>
          <span class="value" style="color: #2563eb;">${escapeHtml(reg.category)}</span>
        </div>
        <div class="summary-row">
          <span class="label">Participant Type</span>
          <span class="value">${escapeHtml(reg.participantType)}</span>
        </div>
        <div class="summary-row">
          <span class="label">Email Address</span>
          <span class="value">${escapeHtml(reg.email)}</span>
        </div>
        <div class="summary-row">
          <span class="label">Phone Number</span>
          <span class="value">${escapeHtml(reg.phone)}</span>
        </div>
        <div class="summary-row">
          <span class="label">T-Shirt Option</span>
          <span class="value">${escapeHtml(reg.tshirtSize)} (${reg.tshirtSelected ? "Opted" : "Not Opted"})</span>
        </div>
        <div class="summary-row">
          <span class="label">Payment Gateway</span>
          <span class="value">${escapeHtml(gatewayLabel)}</span>
        </div>
      </div>

      <div class="summary-card" style="background: #ffffff;">
        <div class="summary-title"><i class="fa-solid fa-receipt" style="color: #ff6b00;"></i> Fee Breakdown</div>
        <div class="summary-row">
          <span class="label">Registration Entry Fee</span>
          <span class="value">₹${regFeeFormatted}</span>
        </div>
        ${tshirtFeeRow}
        <div class="summary-row">
          <span class="label">Payment Gateway Charges (2.5%)</span>
          <span class="value">₹${pgFeeFormatted}</span>
        </div>
      </div>

      <div class="fee-total-card">
        <div>
          <div class="fee-total-title">Total Amount Payable</div>
          <div style="font-size: 12px; color: #c2410c;">Includes registration fees and PG charges</div>
        </div>
        <div class="fee-total-amount">₹${totalFormatted}</div>
      </div>

      <button id="payTokenBtn" class="btn-pay-now">
        <i class="fa-solid fa-lock"></i> <span>Proceed to Pay ₹${totalFormatted}</span>
      </button>

      <div class="notice-box">
        <i class="fa-solid fa-shield-halved"></i>
        <div>
          <strong>Secure Direct Checkout:</strong> Your payment will be processed securely via SSL encryption. Once payment is completed, your registration status will be updated immediately in our system and this link will be automatically deactivated.
        </div>
      </div>
    `;

    const payBtn = document.getElementById("payTokenBtn");
    if (payBtn) {
      payBtn.addEventListener("click", () => initiateTokenPayment(paymentToken, reg, payBtn));
    }
  }

  async function fetchWithRetry(url, options, maxRetries) {
    maxRetries = maxRetries || 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const fetchOpts = Object.assign({}, options, { signal: controller.signal });
        const res = await fetch(url, fetchOpts);
        clearTimeout(timeoutId);
        if (res.ok || res.status === 400 || res.status === 403 || res.status === 404) {
          return res;
        }
      } catch (err) {
        console.warn("API Call Attempt " + attempt + " failed:", err);
        if (attempt === maxRetries) throw err;
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
  }

  async function verifyRazorpayTokenPayment(token, reg, response, btn) {
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> <span>Verifying Payment...</span>`;
    try {
      const verifyRes = await fetchWithRetry("/api/verify-token-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature
        })
      });
      const verifyData = await verifyRes.json();
      if (verifyRes.ok && verifyData.success) {
        renderSuccessState(verifyData, reg);
      } else {
        alert(verifyData.message || "Payment verification failed.");
        resetPayButton(btn, reg.totalAmount);
      }
    } catch (err) {
      console.error("Token payment verification error:", err);
      alert("Payment received, but server response timed out. Your registration will be confirmed automatically via email shortly.");
      resetPayButton(btn, reg.totalAmount);
    }
  }

  async function initiateTokenPayment(paymentToken, reg, btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> <span>Initializing Payment...</span>`;

    try {
      const orderRes = await fetch("/api/create-order-for-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: paymentToken })
      });
      const orderData = await orderRes.json();

      if (!orderRes.ok || !orderData.success) {
        alert(orderData.message || "Failed to initialize payment gateway. Please try again.");
        resetPayButton(btn, reg.totalAmount);
        return;
      }

      // PayU Hosted Checkout — auto-submit secure form
      if (orderData.gateway === "payu") {
        btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> <span>Redirecting to PayU...</span>`;
        submitPayuForm(orderData.action, orderData.payuParams);
        return;
      }

      // Development / missing Razorpay SDK — complete token payment without live checkout
      if (orderData.isDevelopment || typeof Razorpay === "undefined") {
        await verifyRazorpayTokenPayment(paymentToken, reg, {
          razorpay_order_id: orderData.orderId,
          razorpay_payment_id: "DEMO_PAY_ID_" + Date.now(),
          razorpay_signature: "DEMO_SIG"
        }, btn);
        return;
      }

      if (!orderData.key) {
        alert("Razorpay is not configured on the server. Please contact support.");
        resetPayButton(btn, reg.totalAmount);
        return;
      }

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "Chennimalai Marathon 2026",
        description: `Registration Fee for ${reg.category}`,
        image: "images/logo.webp",
        order_id: orderData.orderId,
        prefill: {
          name: reg.fullName,
          email: reg.email,
          contact: reg.phone
        },
        theme: { color: "#ff6b00" },
        handler: async function (response) {
          try {
            await verifyRazorpayTokenPayment(paymentToken, reg, response, btn);
          } catch (e) {
            console.error("Verification error:", e);
            alert("Connection error during payment verification.");
            resetPayButton(btn, reg.totalAmount);
          }
        },
        modal: {
          ondismiss: function () {
            resetPayButton(btn, reg.totalAmount);
          }
        }
      };

      const rzp = new Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Token payment error:", err);
      alert("An unexpected error occurred. Please try again.");
      resetPayButton(btn, reg.totalAmount);
    }
  }
});
