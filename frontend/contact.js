const API_URL = "https://your-api-id.execute-api.us-east-1.amazonaws.com/prod";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const form = document.getElementById("contact-form");
const submitBtn = document.getElementById("submit-btn");
const successEl = document.getElementById("success");
const errorEl = document.getElementById("error");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.style.display = "none";

  // Honeypot check — if filled, silently pretend success
  const honeypot = document.getElementById("website").value;
  if (honeypot) {
    form.style.display = "none";
    successEl.style.display = "block";
    return;
  }

  const name = document.getElementById("name").value.trim().slice(0, 100);
  const email = document.getElementById("email").value.trim().slice(0, 254);
  const message = document.getElementById("message").value.trim().slice(0, 2000);

  if (!name || !email || !message) {
    errorEl.querySelector("p").textContent = "Please fill in all fields.";
    errorEl.style.display = "block";
    return;
  }
  if (!EMAIL_RE.test(email)) {
    errorEl.querySelector("p").textContent = "Please enter a valid email address.";
    errorEl.style.display = "block";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Sending...";

  try {
    const res = await fetch(`${API_URL}/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        site: "myapp",
        type: "contact",
        email,
        data: { name, message },
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || "Something went wrong.");
    }

    form.style.display = "none";
    successEl.style.display = "block";
  } catch (err) {
    errorEl.querySelector("p").textContent = err.message || "Something went wrong. Please try again.";
    errorEl.style.display = "block";
    submitBtn.disabled = false;
    submitBtn.textContent = "Send Message";
  }
});
