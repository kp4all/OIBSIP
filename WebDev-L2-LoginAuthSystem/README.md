# Login Authentication System

Front-end authentication flow (Option A in the task card): register, log in, protected dashboard, log out.

**Tech:** HTML5, CSS3, vanilla JavaScript, localStorage / sessionStorage, Web Crypto API

## Pages
- `register.html` – create an account
- `login.html` – log in
- `dashboard.html` – protected page, redirects to login if there is no session

## Features
- Registration with username or email, password and confirm password
- Password rule: at least 8 characters and 1 number
- Duplicate username/email check (case-insensitive)
- Login with a single generic error ("Incorrect username/email or password.") so it never reveals which field was wrong
- Dashboard only opens after a successful login; direct visits redirect to `login.html`
- Logout clears the session and returns to login
- Passwords are never stored in plain text: each user gets a random salt and the password is hashed with PBKDF2 using SHA-256 (100,000 iterations)
- Empty-field validation on both forms

## Run
Open `index.html` (or `login.html`) in a browser. If your browser blocks secure hashing on a `file://` page, run a local server instead:

```
python -m http.server 8000
```
then open http://localhost:8000.

## Important limitation
This runs entirely in the browser. Anyone with access to the browser can read localStorage, so this demonstrates the flow but is not real security. A production system needs a server (for example Node.js + Express + bcrypt) and a database.
