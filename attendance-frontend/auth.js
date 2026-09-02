// ===== AUTH & SYNC =====
// Handles login/register/forgot-password and pushing/pulling attendance
// data to the backend. Loaded BEFORE script.js.
(function () {
  "use strict";

  // ---- CONFIGURE THIS ----
  // Set this to your deployed backend URL, e.g. "https://your-app.onrender.com/api"
  var API_BASE_URL = 'https://atdns-marker.onrender.com/api';

  var TOKEN_KEY = "attendanceAuthToken";
  var EMAIL_KEY = "attendanceAuthEmail"; // just the email, for display — never the password
  var pushTimer = null;

  // ---------- token storage ----------
  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }
  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
  }
  function isLoggedIn() {
    return !!getToken();
  }

  // ---------- low-level request helper ----------
  function apiRequest(path, method, body, auth) {
    var headers = { "Content-Type": "application/json" };
    if (auth) {
      var t = getToken();
      if (t) headers["Authorization"] = "Bearer " + t;
    }
    return fetch(API_BASE_URL + path, {
      method: method,
      headers: headers,
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (res) {
      return res.json().then(function (json) {
        if (!res.ok) {
          throw new Error(json.error || "Request failed (" + res.status + ")");
        }
        return json;
      });
    });
  }

  // ---------- auth actions ----------
  function register(email, password) {
    return apiRequest("/auth/register", "POST", { email: email, password: password }, false)
      .then(function (json) {
        setToken(json.token);
        localStorage.setItem(EMAIL_KEY, json.user.email);
        return pushLocalDataToServer(); // seed server with current local data
      });
  }

  function login(email, password) {
    return apiRequest("/auth/login", "POST", { email: email, password: password }, false)
      .then(function (json) {
        setToken(json.token);
        localStorage.setItem(EMAIL_KEY, json.user.email);
        return pullFromServer(); // server data wins on login
      });
  }

  function logout() {
    clearToken();
  }

  function forgotPassword(email) {
    return apiRequest("/auth/forgot-password", "POST", { email: email }, false);
  }

  function resetPassword(token, newPassword) {
    return apiRequest("/auth/reset-password/" + encodeURIComponent(token), "POST", {
      password: newPassword,
    }, false);
  }

  function getStoredEmail() {
    return localStorage.getItem(EMAIL_KEY) || "";
  }

  // ---------- data sync ----------
  function pushLocalDataToServer() {
    if (!isLoggedIn() || !window.state) return Promise.resolve();
    return apiRequest("/data", "PUT", { data: window.state }, true);
  }

  function pullFromServer() {
    if (!isLoggedIn()) return Promise.resolve();
    return apiRequest("/data", "GET", null, true).then(function (json) {
      if (json.data && window.replaceState) {
        window.replaceState(json.data);
      } else if (!json.data) {
        // No data on server yet (e.g. first login on this account) — push local up
        return pushLocalDataToServer();
      }
    });
  }

  // Debounced push, called from script.js's saveData()
  function queuePush(stateObj) {
    if (!isLoggedIn()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      apiRequest("/data", "PUT", { data: stateObj }, true).catch(function (err) {
        console.warn("[AuthSync] push failed:", err.message);
      });
    }, 900);
  }

  // Called once by script.js after it finishes its own init/render
  function trySyncOnLoad() {
    if (!isLoggedIn()) return;
    pullFromServer().catch(function (err) {
      console.warn("[AuthSync] initial sync failed:", err.message);
    });
  }

  window.AuthSync = {
    isLoggedIn: isLoggedIn,
    getStoredEmail: getStoredEmail,
    register: register,
    login: login,
    logout: logout,
    forgotPassword: forgotPassword,
    resetPassword: resetPassword,
    queuePush: queuePush,
    pullFromServer: pullFromServer,
    trySyncOnLoad: trySyncOnLoad,
  };
})();