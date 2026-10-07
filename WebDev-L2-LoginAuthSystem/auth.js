"use strict";

/*
  Front-end only authentication (Option A in the task card).
  - Users are stored in localStorage.
  - Passwords are never stored. We store a random salt + a PBKDF2-SHA256 hash.
  - A login creates a session in sessionStorage; the dashboard checks it and
    redirects to login.html when it is missing.
  NOTE: Everything runs in the browser, so this teaches the flow but is not
  real server-side security. See the README for details.
*/

const USERS_KEY = "oibsip-auth-users";
const SESSION_KEY = "oibsip-auth-session";
const PBKDF2_ITERATIONS = 100000;

/* ---------- Storage helpers ---------- */

function getUsers() {
  try {
    const data = JSON.parse(localStorage.getItem(USERS_KEY));
    return data && typeof data === "object" ? data : {};
  } catch (err) {
    return {};
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY));
  } catch (err) {
    return null;
  }
}

function normalise(identifier) {
  return identifier.trim().toLowerCase();
}

/* ---------- Hashing (Web Crypto) ---------- */

function toHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

function newSalt() {
  return toHex(crypto.getRandomValues(new Uint8Array(16)));
}

async function hashPassword(password, saltHex) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: fromHex(saltHex), iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return toHex(new Uint8Array(bits));
}

/* ---------- Form helpers ---------- */

function $(id) {
  return document.getElementById(id);
}

function showFieldError(fieldId, message) {
  const input = $(fieldId);
  const error = $(fieldId + "-error");
  if (input) input.classList.add("invalid");
  if (error) {
    error.textContent = message;
    error.hidden = false;
  }
}

function clearErrors() {
  document.querySelectorAll(".field-error").forEach((el) => { el.hidden = true; });
  document.querySelectorAll("input.invalid").forEach((el) => el.classList.remove("invalid"));
  const msg = $("form-message");
  if (msg) msg.hidden = true;
}

function showMessage(text, type) {
  const msg = $("form-message");
  msg.textContent = text;
  msg.className = "message " + type;
  msg.hidden = false;
}

function cryptoAvailable() {
  if (window.crypto && crypto.subtle) return true;
  showMessage("This browser blocks secure hashing here. Open the page with http://localhost or https:// and try again.", "error");
  return false;
}

/* ---------- Register page ---------- */

function setupRegister() {
  const form = $("register-form");
  const submitBtn = $("submit-btn");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors();
    if (!cryptoAvailable()) return;

    const identifier = $("identifier").value.trim();
    const password = $("password").value;
    const confirm = $("confirm").value;
    let valid = true;

    // Basic validation: no empty submissions
    if (identifier === "") {
      showFieldError("identifier", "Enter a username or email.");
      valid = false;
    } else if (identifier.includes("@")) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
        showFieldError("identifier", "Enter a valid email address.");
        valid = false;
      }
    } else if (!/^[A-Za-z0-9._-]{3,}$/.test(identifier)) {
      showFieldError("identifier", "Use at least 3 letters, numbers, dots, dashes or underscores.");
      valid = false;
    }

    // Password rule: minimum 8 characters, at least 1 number
    if (password === "") {
      showFieldError("password", "Enter a password.");
      valid = false;
    } else if (password.length < 8) {
      showFieldError("password", "Password must be at least 8 characters.");
      valid = false;
    } else if (!/\d/.test(password)) {
      showFieldError("password", "Password must include at least 1 number.");
      valid = false;
    }

    if (confirm === "") {
      showFieldError("confirm", "Re-enter your password.");
      valid = false;
    } else if (confirm !== password) {
      showFieldError("confirm", "Passwords do not match.");
      valid = false;
    }

    if (!valid) return;

    // Duplicate check (case-insensitive)
    const users = getUsers();
    const key = normalise(identifier);
    if (users[key]) {
      showMessage("An account with that username or email already exists.", "error");
      return;
    }

    submitBtn.disabled = true;
    try {
      const salt = newSalt();
      const hash = await hashPassword(password, salt);
      users[key] = { identifier, salt, hash, createdAt: Date.now() };
      saveUsers(users);
      window.location.href = "login.html?registered=1";
    } catch (err) {
      showMessage("Could not create the account. Please try again.", "error");
      submitBtn.disabled = false;
    }
  });
}

/* ---------- Login page ---------- */

function setupLogin() {
  if (getSession()) {
    window.location.replace("dashboard.html");
    return;
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get("registered")) showMessage("Account created. Log in to continue.", "ok");
  if (params.get("loggedout")) showMessage("You have been logged out.", "ok");

  const form = $("login-form");
  const submitBtn = $("submit-btn");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors();
    if (!cryptoAvailable()) return;

    const identifier = $("identifier").value.trim();
    const password = $("password").value;
    let valid = true;

    if (identifier === "") {
      showFieldError("identifier", "Enter your username or email.");
      valid = false;
    }
    if (password === "") {
      showFieldError("password", "Enter your password.");
      valid = false;
    }
    if (!valid) return;

    submitBtn.disabled = true;

    try {
      const users = getUsers();
      const user = users[normalise(identifier)];

      // Hash even when the user does not exist so both failures take similar time.
      const salt = user ? user.salt : "00000000000000000000000000000000";
      const attempt = await hashPassword(password, salt);

      if (!user || attempt !== user.hash) {
        // One message for every failure so it never reveals which field was wrong.
        showMessage("Incorrect username/email or password.", "error");
        submitBtn.disabled = false;
        return;
      }

      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ id: normalise(identifier), name: user.identifier, loginAt: Date.now() })
      );
      window.location.href = "dashboard.html";
    } catch (err) {
      showMessage("Something went wrong. Please try again.", "error");
      submitBtn.disabled = false;
    }
  });
}

/* ---------- Dashboard (protected page) ---------- */

function setupDashboard() {
  const panel = $("dashboard");

  function check() {
    const session = getSession();
    if (!session) {
      // Not logged in: send the visitor to the login page.
      window.location.replace("login.html");
      return;
    }

    const users = getUsers();
    const user = users[session.id];

    $("user-name").textContent = session.name;
    $("user-id").textContent = session.name;
    $("login-time").textContent = new Date(session.loginAt).toLocaleString();
    $("created-time").textContent = user ? new Date(user.createdAt).toLocaleString() : "Unknown";
    panel.hidden = false;
  }

  $("logout-btn").addEventListener("click", () => {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.replace("login.html?loggedout=1");
  });

  check();

  // If the user presses Back after logging out, re-check the session.
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) check();
  });
}

/* ---------- Start the right setup for each page ---------- */

const page = document.body.dataset.page;
if (page === "register") setupRegister();
else if (page === "login") setupLogin();
else if (page === "dashboard") setupDashboard();
