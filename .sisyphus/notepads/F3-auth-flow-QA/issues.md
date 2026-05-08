# Issues Found During QA

## Minor: main.js API_URL trailing comment anomaly
- **File:** `frontend/js/main.js` line 4
- **Detail:** `const API_URL = 'http://localhost:3000'//localhost:3000';`
- The `//localhost:3000';` is treated as a comment (no functional issue)
- The assignment resolves to `'http://localhost:3000'` which is correct
- Works due to Automatic Semicolon Insertion (ASI) in JavaScript
- **Risk:** None functionally, but looks like a copy-paste artifact from an earlier refactor
- **Suggestion:** Clean up to `const API_URL = 'http://localhost:3000';` for readability
