/* ============================================================
   BolsaGT — UI de autenticación (overlay de login + badge de usuario)
   ============================================================ */

var AuthUI = (function () {
  "use strict";

  var $ = function (sel) { return document.querySelector(sel); };
  var pendingEmail = "";

  function showLogin() {
    $("#authOverlay").style.display = "flex";
    showEmailStep();
  }

  function hideLogin() {
    $("#authOverlay").style.display = "none";
  }

  function showEmailStep() {
    $("#authStepEmail").style.display = "block";
    $("#authStepCode").style.display = "none";
    $("#authEmailFeedback").textContent = "";
  }

  function showCodeStep(email) {
    pendingEmail = email;
    $("#authEmailShown").textContent = email;
    $("#authStepEmail").style.display = "none";
    $("#authStepCode").style.display = "block";
    $("#authCodeFeedback").textContent = "";
    $("#authCode").value = "";
    $("#authCode").focus();
  }

  function renderUserBadge(user) {
    var el = $("#userBadge");
    if (!el) return;
    if (!Auth.isEnabled()) {
      el.innerHTML = '<span class="demo-tag" title="Sin Supabase configurado — los datos solo viven en este navegador">Modo demo local</span>';
      return;
    }
    if (!user) {
      el.innerHTML = "";
      return;
    }
    el.innerHTML =
      '<span class="user-email">' + (user.email || "") + '</span>' +
      '<button id="logoutBtn" class="logout-btn">Cerrar sesión</button>';
    $("#logoutBtn").addEventListener("click", function () {
      Portfolio.flush();
      Auth.signOut();
    });
  }

  /** @param {(user: object) => void} onLoggedIn — se llama tras verificar el código correctamente. */
  function bindEvents(onLoggedIn) {
    $("#authSendCode").addEventListener("click", function () {
      var email = $("#authEmail").value.trim();
      var fb = $("#authEmailFeedback");
      if (!email || email.indexOf("@") === -1) {
        fb.textContent = "Ingresa un correo válido.";
        fb.className = "feedback err";
        return;
      }
      fb.textContent = "Enviando código…";
      fb.className = "feedback";
      Auth.sendCode(email)
        .then(function () { showCodeStep(email); })
        .catch(function (err) {
          fb.textContent = err.message || "No se pudo enviar el código.";
          fb.className = "feedback err";
        });
    });

    $("#authEmail").addEventListener("keydown", function (e) {
      if (e.key === "Enter") $("#authSendCode").click();
    });

    $("#authVerifyCode").addEventListener("click", function () {
      var code = $("#authCode").value.trim();
      var fb = $("#authCodeFeedback");
      if (!/^\d{4,8}$/.test(code)) {
        fb.textContent = "Ingresa el código que recibiste por correo.";
        fb.className = "feedback err";
        return;
      }
      fb.textContent = "Verificando…";
      fb.className = "feedback";
      Auth.verifyCode(pendingEmail, code)
        .then(function (user) {
          hideLogin();
          onLoggedIn(user);
        })
        .catch(function (err) {
          fb.textContent = err.message || "Código inválido o expirado.";
          fb.className = "feedback err";
        });
    });

    $("#authCode").addEventListener("keydown", function (e) {
      if (e.key === "Enter") $("#authVerifyCode").click();
    });

    $("#authBackToEmail").addEventListener("click", showEmailStep);
  }

  return {
    showLogin: showLogin, hideLogin: hideLogin,
    renderUserBadge: renderUserBadge, bindEvents: bindEvents
  };
})();
