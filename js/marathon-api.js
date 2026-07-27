/* ============================================================
   Chennimalai Marathon — Frontend <-> Backend Connector
   ============================================================ */

// 1. Point to local server during testing; update to Render URL for production:
const BACKEND_URL = "http://localhost:3000"; 

// 2. Keep DEMO_MODE = true for testing; flip to false on official launch day!
const DEMO_MODE = true; 

// ---------- STEP 1: Save Step 1 Data to Session Storage ----------
function saveStep1AndContinue(nextPageUrl) {
  const step1Data = {
    fullName: document.getElementById("fullName")?.value.trim(),
    dob: document.getElementById("dob")?.value.trim(), // Format: DD/MM/YYYY
    phone: document.getElementById("phone")?.value.trim(),
    email: document.getElementById("email")?.value.trim(),
    district: document.getElementById("district")?.value,
    pincode: document.getElementById("pincode")?.value.trim(),
    tshirtSize: document.getElementById("tshirtSize")?.value,
    bloodGroup: document.getElementById("bloodGroup")?.value
  };

  for (const [key, val] of Object.entries(step1Data)) {
    if (!val) {
      alert(`Please fill in all required fields: ${key}`);
      return;
    }
  }

  sessionStorage.setItem("marathonStep1", JSON.stringify(step1Data));
  
  if (nextPageUrl) {
    window.location.href = nextPageUrl;
  }
}

// ---------- STEP 2: Combine Answers & Submit to Backend ----------
async function submitRegistration() {
  const step1Raw = sessionStorage.getItem("marathonStep1");
  
  // Fallback: If form is single-page, read directly from DOM
  let step1Data;
  if (step1Raw) {
    step1Data = JSON.parse(step1Raw);
  } else {
    step1Data = {
      fullName: document.getElementById("fullName")?.value.trim(),
      dob: document.getElementById("dob")?.value.trim(),
      phone: document.getElementById("phone")?.value.trim(),
      email: document.getElementById("email")?.value.trim(),
      district: document.getElementById("district")?.value,
      pincode: document.getElementById("pincode")?.value.trim(),
      tshirtSize: document.getElementById("tshirtSize")?.value,
      bloodGroup: document.getElementById("bloodGroup")?.value
    };
  }

  const gender = document.querySelector('input[name="gender"]:checked')?.value
              || document.getElementById("gender")?.value;
  const emergencyContact = document.getElementById("emergencyContact")?.value.trim();

  if (!gender) { alert("Please select a gender."); return; }
  if (!emergencyContact) { alert("Please enter an emergency contact number."); return; }

  const fullPayload = { ...step1Data, gender, emergencyContact };

  const endpoint = DEMO_MODE ? "/api/register-demo" : "/api/register";
  const registerBtn = document.getElementById("registerNowBtn");
  if (registerBtn) { registerBtn.disabled = true; registerBtn.textContent = "Submitting..."; }

  try {
    const res = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fullPayload)
    });
    const result = await res.json();

    if (res.status === 409) {
      alert("This email address is already registered. Please use a different email address.");
      return;
    }
    if (res.status === 403) {
      alert("Registrations are closed. All 1,000 slots have been filled.");
      return;
    }
    if (!res.ok) {
      alert(result.message || "Something went wrong. Please try again.");
      return;
    }

    // Success Response
    sessionStorage.removeItem("marathonStep1");
    alert(
      (DEMO_MODE ? "[DEMO SUCCESS] " : "") +
      `Registration Successful!\n\n` +
      `Category: ${result.category}\n` +
      `T-Shirt Number: ${result.tshirtNumber}\n\n` +
      `A confirmation email has been sent to ${fullPayload.email}.`
    );

  } catch (err) {
    console.error(err);
    alert("Could not connect to the backend server. Make sure node server is running on port 3000.");
  } finally {
    if (registerBtn) { registerBtn.disabled = false; registerBtn.textContent = "Register Now"; }
  }
}