# Learnings - Fix main.js API_URL

- API_URL was already correctly set to `http://localhost:3000` in the file (no truncation)
- Removed `onLoginExitoso()` function (lines 106-129) as part of auth migration to external redirect
- Added IIFE callback handler that checks URL params for `token` query param, saves it to localStorage, and cleans the URL via `history.replaceState`
- `URLSearchParams` used for parsing query string in the callback handler
- All three verification greps pass: API_URL present, onLoginExitoso absent, URLSearchParams present
- LSP diagnostics clean
