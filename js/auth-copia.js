/* ============================================================
   BolsaGT — Autenticación (login por código, vía Supabase Auth)
   ============================================================
   Usa el flujo "Email OTP" de Supabase: se envía un código de 6
   dígitos al correo del estudiante, y con ese código se inicia
   sesión (sin contraseña). Requiere configurar SUPABASE_CONFIG en
   js/config.js — si está vacío, este módulo queda inactivo y la
   app corre en modo demo local (ver js/config.js).
   ============================================================ */

var Auth = (function () {
  "use strict";

  var client = null;
  var currentSession = null;
  var listeners = [];

  function isEnabled() {
    return !!(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey);
  }

  function getClient() {
    if (!isEnabled()) return null;
    if (!client) {
      if (!window.supabase || !window.supabase.createClient) {
        throw new Error(
          "No se pudo cargar la librería de Supabase. Verifica tu conexión a internet " +
          "(se carga desde CDN la primera vez)."
        );
      }
      client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    }
    return client;
  }

  /** Envía el código de acceso al correo. Crea el usuario si no existe. */
  function sendCode(email) {
    var c = getClient();
    return c.auth.signInWithOtp({ email: email, options: { shouldCreateUser: true } })
      .then(function (res) {
        if (res.error) throw res.error;
        return true;
      });
  }

  /** Verifica el código de 6 dígitos y completa el inicio de sesión. */
  function verifyCode(email, code) {
    var c = getClient();
    return c.auth.verifyOtp({ email: email, token: code.trim(), type: "email" })
      .then(function (res) {
        if (res.error) throw res.error;
        currentSession = res.data.session;
        return res.data.session ? res.data.session.user : null;
      });
  }

  function signOut() {
    var c = getClient();
    return c.auth.signOut().then(function () { currentSession = null; });
  }

  function getCurrentUser() {
    return currentSession ? currentSession.user : null;
  }

  /**
   * Revisa si ya hay una sesión activa (persistida por supabase-js en su
   * propio localStorage) y llama a onChange cada vez que cambie el estado
   * de autenticación (login, logout, refresco de token).
   */
  function init(onChange) {
    if (!isEnabled()) {
      onChange(null);
      return Promise.resolve(null);
    }
    var c = getClient();
    listeners.push(onChange);
    c.auth.onAuthStateChange(function (_event, session) {
      currentSession = session;
      listeners.forEach(function (fn) { fn(session ? session.user : null); });
    });
    return c.auth.getSession().then(function (res) {
      currentSession = res.data.session;
      var user = currentSession ? currentSession.user : null;
      onChange(user);
      return user;
    });
  }

  return {
    isEnabled: isEnabled,
    getClient: getClient,
    sendCode: sendCode,
    verifyCode: verifyCode,
    signOut: signOut,
    getCurrentUser: getCurrentUser,
    init: init
  };
})();
