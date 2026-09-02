# Frontend changes for backend integration

Three new files were added; your original app files were edited minimally.

## New files
- **`auth.js`** — talks to the backend (login, register, forgot password, data sync). Loaded before `script.js`.
- **`account-ui.js`** — wires the new Account section in Settings to `auth.js`. Loaded after `script.js`.
- **`reset-password.html`** — standalone page for the link sent in the reset-password email.

## Edited files
- **`index.html`** — added an "Account" block in Settings (login/register/forgot/logout), and added the two new `<script>` tags.
- **`script.js`** — two small additions only:
  1. `saveData()` now also calls `AuthSync.queuePush()` so local changes sync to the server when logged in.
  2. At the end of the file, `renderAll` and a new `replaceState()` are exposed on `window` so a server sync can refresh the UI, and `AuthSync.trySyncOnLoad()` is called on startup.
- **`style.css`** — untouched. The new Account form reuses existing classes (`io-pod`, `btn`, etc.) with a few inline styles for the inputs.

## Before deploying: set your backend URL
Both `auth.js` and `reset-password.html` have this line near the top —
update it to your deployed backend's URL once you have one:
```js
var API_BASE_URL = "http://localhost:5000/api";
```

## How syncing works
- **Not logged in:** the app behaves exactly as before — everything stays in `localStorage` only.
- **Register/Login:** on login, the server's saved data (if any) overwrites what's on this device. On register, this device's current data is pushed up to seed the new account.
- **While logged in:** every local save is pushed to the server ~900ms after you stop making changes (debounced), so it doesn't hammer the API on every tap.
- **Logout:** just clears the session token locally — your data stays on the device and on the server, untouched.

## Testing locally
1. Run the backend (`npm run dev` inside `backend/`, listening on `http://localhost:5000`).
2. Serve this frontend folder with any static server, e.g.:
   ```bash
   npx serve .
   ```
3. Open it in the browser, go to Settings → Account, and try registering.
