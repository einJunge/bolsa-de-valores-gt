/* ============================================================
   news-ui.js
   Panel visual de noticias — BolsaGT
   ------------------------------------------------------------
   Se auto-inyecta como una pestaña adicional "Noticias" en la
   barra de navegación existente, SIN modificar index.html ni
   ui.js. Usa el mismo patrón visual (paneles, tabular, colores
   gain/loss) que el resto del sistema para no romper el diseño.

   Requiere que se carguen, en este orden, DESPUÉS de los scripts
   originales de BolsaGT:
     <script src="js/news-data.js"></script>
     <script src="js/news-engine.js"></script>
     <script src="js/news-ui.js"></script>
   ============================================================ */

(function () {
  "use strict";

  var CATEGORY_LABEL = {
    macro: "Macroeconomía",
    earnings: "Resultados corporativos",
    company: "Empresa",
    regulatory: "Regulatorio",
    commodity: "Commodities",
    geopolitical: "Geopolítica",
    noise: "Ruido / rumor"
  };

  var SENTIMENT_LABEL = { positive: "Alcista", negative: "Bajista", neutral: "Mixto" };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function timeAgo(iso) {
    var diffMs = Date.now() - new Date(iso).getTime();
    var mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "justo ahora";
    if (mins < 60) return "hace " + mins + " min";
    var hrs = Math.floor(mins / 60);
    return "hace " + hrs + " h";
  }

  function injectStyles() {
    var style = document.createElement("style");
    style.id = "news-ui-styles";
    style.textContent = [
      "#view-news { display: none; }",
      "#view-news.active { display: block; }",
      ".news-feed { display: flex; flex-direction: column; gap: 12px; max-width: 720px; }",
      ".news-card { background: var(--panel-bg, #141b24); border: 1px solid var(--border-color, #223040);",
      "  border-radius: 10px; padding: 16px 18px; }",
      ".news-card.impacted { border-left: 3px solid #1abc9c; }",
      ".news-card.no-impact { border-left: 3px solid #566374; opacity: .85; }",
      ".news-top-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }",
      ".news-tag { font-size: 11px; font-weight: 600; padding: 2px 9px; border-radius: 20px; letter-spacing: .02em; }",
      ".news-tag.cat { background: #1a2330; color: #9aa4b2; }",
      ".news-tag.positive { background: #2ecc7122; color: #2ecc71; }",
      ".news-tag.negative { background: #e74c3c22; color: #e74c3c; }",
      ".news-tag.neutral { background: #e6a23c22; color: #e6a23c; }",
      ".news-tag.impact-yes { background: #1abc9c22; color: #1abc9c; }",
      ".news-tag.impact-no { background: #56637422; color: #9aa4b2; }",
      ".news-time { font-size: 11.5px; color: #6b7684; margin-left: auto; }",
      ".news-headline { font-size: 15px; font-weight: 600; color: #e8ecf1; margin: 0 0 6px; }",
      ".news-body { font-size: 13.5px; color: #9aa4b2; margin: 0 0 10px; line-height: 1.5; }",
      ".news-symbols { display: flex; gap: 6px; flex-wrap: wrap; }",
      ".news-symbol-chip { font-size: 12px; font-family: monospace; background: #1a2330;",
      "  border: 1px solid #223040; color: #e8ecf1; padding: 3px 8px; border-radius: 6px; }",
      ".news-analysis-box { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #223040; }",
      ".news-analysis-box summary { cursor: pointer; font-size: 13px; color: #1abc9c; font-weight: 600; }",
      ".news-analysis-box p { font-size: 13px; color: #9aa4b2; margin: 8px 0 0; }",
      ".news-empty { color: #9aa4b2; text-align: center; padding: 40px 0; font-size: 14px; }",
      ".news-intro { color: #9aa4b2; font-size: 13.5px; max-width: 680px; margin-bottom: 18px; }"
    ].join("\n");
    document.head.appendChild(style);
  }

  function buildView() {
    var main = document.querySelector("main.app-main") || document.querySelector("main");
    if (!main) return;
    var section = document.createElement("section");
    section.id = "view-news";
    section.className = "view";
    section.innerHTML =
      '<p class="news-intro">Estas noticias simulan el tipo de eventos que mueven mercados reales ' +
      '(decisiones de tasas, resultados corporativos, commodities, geopolítica). ' +
      '<strong>No todas las noticias generan un movimiento de precio</strong> — parte del análisis de un ' +
      "inversionista es distinguir qué información es relevante y cuál es solo ruido. Antes de operar, " +
      "pregúntate: ¿esta noticia afecta las ganancias futuras, el costo de capital o la percepción de riesgo " +
      'de este instrumento?</p>' +
      '<div id="newsFeedList" class="news-feed"></div>';
    main.appendChild(section);
  }

  function addNavButton() {
    var nav = document.querySelector("nav.main-nav");
    if (!nav || nav.querySelector('[data-view="news"]')) return;
    var btn = document.createElement("button");
    btn.className = "nav-btn";
    btn.dataset.view = "news";
    btn.textContent = "Noticias";
    nav.appendChild(btn);
    btn.addEventListener("click", function () {
      document.querySelectorAll(".nav-btn").forEach(function (b) {
        b.classList.toggle("active", b === btn);
      });
      document.querySelectorAll(".view").forEach(function (s) {
        s.classList.toggle("active", s.id === "view-news");
      });
      renderFeed();
    });
  }

  function analysisHint(entry) {
    if (entry.category === "noise") {
      return "Esta noticia es un ejemplo de <strong>ruido informativo</strong>: circula pero no aporta datos financieros verificables. Operar solo por esto suele ser arriesgado.";
    }
    if (!entry.impacted) {
      return "Aunque el tema es relevante, en este caso el mercado ya lo tenía anticipado (o el efecto fue absorbido rápido) y no generó un movimiento notorio de precio.";
    }
    if (entry.sentiment === "positive") {
      return "Es una noticia de sesgo <strong>alcista</strong>: suele asociarse con mejores expectativas de ganancias futuras o menor costo de capital para los símbolos afectados.";
    }
    if (entry.sentiment === "negative") {
      return "Es una noticia de sesgo <strong>bajista</strong>: suele asociarse con menores expectativas de ganancias futuras o mayor percepción de riesgo para los símbolos afectados.";
    }
    return "Es una noticia de impacto mixto: distintos inversionistas pueden interpretarla en direcciones opuestas.";
  }

  function renderFeed() {
    var el = document.getElementById("newsFeedList");
    if (!el) return;
    var feed = NewsEngine.getFeed();
    if (feed.length === 0) {
      el.innerHTML = '<div class="news-empty">Aún no han salido noticias. La primera aparecerá en unos segundos…</div>';
      return;
    }
    el.innerHTML = feed.map(function (entry) {
      var catLabel = CATEGORY_LABEL[entry.category] || entry.category;
      var sentLabel = SENTIMENT_LABEL[entry.sentiment] || entry.sentiment;
      var cardClass = entry.impacted ? "impacted" : "no-impact";
      var impactTag = entry.impacted
        ? '<span class="news-tag impact-yes">⚡ Movió el mercado</span>'
        : '<span class="news-tag impact-no">— Sin impacto notorio</span>';
      return (
        '<div class="news-card ' + cardClass + '">' +
          '<div class="news-top-row">' +
            '<span class="news-tag cat">' + esc(catLabel) + '</span>' +
            '<span class="news-tag ' + entry.sentiment + '">' + esc(sentLabel) + '</span>' +
            impactTag +
            '<span class="news-time">' + timeAgo(entry.publishedAt) + '</span>' +
          '</div>' +
          '<h3 class="news-headline">' + esc(entry.headline) + '</h3>' +
          '<p class="news-body">' + esc(entry.body) + '</p>' +
          '<div class="news-symbols">' +
            entry.symbols.map(function (s) { return '<span class="news-symbol-chip">' + esc(s) + '</span>'; }).join("") +
          '</div>' +
          '<details class="news-analysis-box">' +
            '<summary>¿Por qué importa esto? (guía de análisis)</summary>' +
            '<p>' + analysisHint(entry) + '</p>' +
          '</details>' +
        '</div>'
      );
    }).join("");
  }

  function init() {
    injectStyles();
    addNavButton();
    buildView();
    NewsEngine.onNews(renderFeed);
    NewsEngine.start();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
