/* ============================================================
   BolsaGT — Arranque de la aplicación
   ============================================================
   Orquesta: revisar sesión existente -> mostrar login si hace
   falta (solo en modo Supabase) -> inicializar Portfolio con el
   backend correcto (local o Supabase, ligado al usuario) ->
   arrancar la UI y el motor de mercado.
   ============================================================ */

document.addEventListener("DOMContentLoaded", function () {
  var booted = false;

  function boot(user) {
    if (booted) return;
    booted = true;
    Portfolio.init(user ? user.id : null).then(function () {
      UI.init();
    }).catch(function (err) {
      console.error("[BolsaGT] error inicializando el portafolio:", err);
      alert("No se pudo cargar tu portafolio. Revisa tu conexión e intenta recargar la página.");
    });
  }

  AuthUI.bindEvents(function (user) {
    AuthUI.renderUserBadge(user);
    boot(user);
  });

  Auth.init(function (user) {
    AuthUI.renderUserBadge(user);

    if (!Auth.isEnabled()) {
      // Modo demo local: sin login, arranca directo.
      boot(null);
      return;
    }

    if (user) {
      AuthUI.hideLogin();
      boot(user);
      return;
    }

    // No hay sesión activa.
    if (booted) {
      // Ya había una app corriendo con otro usuario (cerró sesión) ->
      // recargar es la forma más segura de limpiar todo el estado en memoria.
      window.location.reload();
      return;
    }
    AuthUI.showLogin();
  }).catch(function (err) {
    console.error("[BolsaGT] error verificando sesión:", err);
    AuthUI.showLogin();
  });

  // Guardado de mejor esfuerzo al ocultar/cerrar la pestaña (además del
  // guardado con debounce que ya ocurre en cada acción).
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && Portfolio.isReady()) Portfolio.flush();
  });
  window.addEventListener("beforeunload", function () {
    if (Portfolio.isReady()) Portfolio.flush();
  });
});
