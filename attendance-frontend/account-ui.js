// ===== ACCOUNT UI =====
// Wires the login/register/forgot-password/logout forms in Settings to
// window.AuthSync (defined in auth.js). Loaded AFTER script.js.
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  function showToastSafe(msg) {
    if (typeof window.showToastFromAccountUI === 'function') {
      window.showToastFromAccountUI(msg);
      return;
    }
    var toast = $('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, 2200);
  }

  function showError(msg) {
    var el = $('authFormError');
    el.textContent = msg;
    el.style.display = 'block';
  }
  function clearError() {
    var el = $('authFormError');
    el.style.display = 'none';
    el.textContent = '';
  }

  function refreshAccountView() {
    var loggedIn = window.AuthSync && window.AuthSync.isLoggedIn();
    $('authLoggedOut').style.display = loggedIn ? 'none' : 'block';
    $('authLoggedIn').style.display = loggedIn ? 'block' : 'none';
    if (loggedIn) {
      $('authUserEmail').textContent = window.AuthSync.getStoredEmail() || '';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.AuthSync) return;
    refreshAccountView();

    $('loginBtn').addEventListener('click', function () {
      clearError();
      var email = $('authEmailInput').value.trim();
      var password = $('authPasswordInput').value;
      if (!email || !password) { showError('Enter your email and password.'); return; }

      this.disabled = true;
      var btn = this;
      window.AuthSync.login(email, password)
        .then(function () {
          refreshAccountView();
          showToastSafe('Logged in — data synced.');
        })
        .catch(function (err) { showError(err.message); })
        .finally(function () { btn.disabled = false; });
    });

    $('registerBtn').addEventListener('click', function () {
      clearError();
      var email = $('authEmailInput').value.trim();
      var password = $('authPasswordInput').value;
      if (!email || !password) { showError('Enter your email and password.'); return; }
      if (password.length < 6) { showError('Password must be at least 6 characters.'); return; }

      this.disabled = true;
      var btn = this;
      window.AuthSync.register(email, password)
        .then(function () {
          refreshAccountView();
          showToastSafe('Account created — data synced.');
        })
        .catch(function (err) { showError(err.message); })
        .finally(function () { btn.disabled = false; });
    });

    $('logoutBtn').addEventListener('click', function () {
      window.AuthSync.logout();
      refreshAccountView();
      showToastSafe('Logged out. Your data stays on this device.');
    });

    $('forgotPasswordToggle').addEventListener('click', function () {
      var box = $('forgotPasswordBox');
      box.style.display = box.style.display === 'none' ? 'block' : 'none';
    });

    $('sendResetBtn').addEventListener('click', function () {
      var email = $('forgotEmailInput').value.trim();
      if (!email) return;
      this.disabled = true;
      var btn = this;
      window.AuthSync.forgotPassword(email)
        .then(function (json) {
          showToastSafe(json.message || 'Check your email for a reset link.');
          $('forgotPasswordBox').style.display = 'none';
        })
        .catch(function (err) { showToastSafe(err.message); })
        .finally(function () { btn.disabled = false; });
    });
  });
})();
