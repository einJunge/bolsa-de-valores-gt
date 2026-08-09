/* ============================================================
   news-engine.js
   Motor de noticias simuladas — BolsaGT
   ------------------------------------------------------------
   Depende de: news-data.js (banco de noticias) y del MarketEngine
   ya existente en js/engine.js. NO modifica ningún archivo actual:
   solo LEE y AJUSTA precios usando la API pública que ya expone
   MarketEngine (getState, onTick), exactamente igual que hace
   ui.js con el resto del sistema.

   Cómo funciona:
   - Cada cierto intervalo, hay una probabilidad de que "salga" una
     noticia nueva del banco (aleatoria, ponderada por categoría).
   - Cada noticia tiene un impactProbability: NO todas las noticias
     mueven el mercado — así el estudiante aprende a distinguir
     señal de ruido, igual que en la vida real.
   - Si la noticia "impacta", se aplica un shock gradual al precio
     de los símbolos afectados durante varios segundos (no un salto
     instantáneo), para que se vea como una reacción de mercado.
   ============================================================ */

var NewsEngine = (function () {
  "use strict";

  var NEWS_CHECK_INTERVAL_MS = 20000;   // cada 20s se evalúa si aparece noticia
  var SHOCK_DURATION_TICKS = 8;         // el impacto se reparte en ~8 ticks (segundos)
  var MAX_FEED_ITEMS = 40;

  var feed = [];           // noticias ya publicadas, más reciente primero
  var listeners = [];       // callbacks(newsItem) cuando se publica una noticia
  var activeShocks = [];    // shocks en curso: { symbol, perTickPct, ticksLeft }
  var timer = null;
  var tickUnsub = null;
  var recentlyUsed = {};    // evita repetir la misma noticia muy seguido

  function rand(min, max) { return min + Math.random() * (max - min); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function pickNewsItem() {
    var pool = NewsData.all();
    var candidates = pool.filter(function (n) {
      return !recentlyUsed[n.id] || (Date.now() - recentlyUsed[n.id]) > 3 * 60 * 1000;
    });
    if (candidates.length === 0) candidates = pool;
    return pick(candidates);
  }

  function sentimentFor(newsItem, symbol) {
    if (newsItem.symbolSentiment && newsItem.symbolSentiment[symbol]) {
      return newsItem.symbolSentiment[symbol];
    }
    return newsItem.sentiment;
  }

  function applyShock(newsItem, didImpact) {
    if (!didImpact) return;
    var magnitude = rand(newsItem.magnitudeRange[0], newsItem.magnitudeRange[1]);

    newsItem.symbols.forEach(function (symbol) {
      var state = MarketEngine.getState(symbol);
      if (!state) return;
      var sentiment = sentimentFor(newsItem, symbol);
      var sign = sentiment === "positive" ? 1 : sentiment === "negative" ? -1 : (Math.random() > 0.5 ? 1 : -1);
      var totalPct = magnitude * sign;
      var perTickPct = totalPct / SHOCK_DURATION_TICKS;

      activeShocks.push({ symbol: symbol, perTickPct: perTickPct, ticksLeft: SHOCK_DURATION_TICKS });
    });
  }

  function publish(newsItem, didImpact) {
    var entry = {
      id: newsItem.id + "_" + Date.now(),
      newsId: newsItem.id,
      category: newsItem.category,
      sentiment: newsItem.sentiment,
      headline: newsItem.headline,
      body: newsItem.body,
      symbols: newsItem.symbols.slice(),
      impacted: didImpact,
      publishedAt: new Date().toISOString()
    };
    feed.unshift(entry);
    if (feed.length > MAX_FEED_ITEMS) feed.pop();
    recentlyUsed[newsItem.id] = Date.now();
    listeners.forEach(function (cb) { cb(entry); });
    return entry;
  }

  /** Dispara manualmente una noticia específica (útil para modo instructor/demo). */
  function forcePublish(newsId, forceImpact) {
    var newsItem = NewsData.byId(newsId);
    if (!newsItem) throw new Error("Noticia no encontrada: " + newsId);
    var didImpact = forceImpact != null ? forceImpact : Math.random() < newsItem.impactProbability;
    applyShock(newsItem, didImpact);
    return publish(newsItem, didImpact);
  }

  function maybePublishRandomNews() {
    var newsItem = pickNewsItem();
    var didImpact = Math.random() < newsItem.impactProbability;
    applyShock(newsItem, didImpact);
    publish(newsItem, didImpact);
  }

  function onEngineTick() {
    if (activeShocks.length === 0) return;
    var remaining = [];
    activeShocks.forEach(function (shock) {
      var state = MarketEngine.getState(shock.symbol);
      if (state) {
        var minPrice = state.instrument.decimals >= 4 ? 0.0001 : 0.01;
        state.price = Math.max(state.price * (1 + shock.perTickPct), minPrice);
        state.price = Number(state.price.toFixed(state.instrument.decimals));
      }
      shock.ticksLeft -= 1;
      if (shock.ticksLeft > 0) remaining.push(shock);
    });
    activeShocks = remaining;
  }

  function start() {
    if (timer) return;
    timer = setInterval(maybePublishRandomNews, NEWS_CHECK_INTERVAL_MS);
    tickUnsub = MarketEngine.onTick(onEngineTick);
    // primera noticia poco después de arrancar, para que se vea algo de inmediato
    setTimeout(maybePublishRandomNews, 4000);
  }

  function onNews(cb) { listeners.push(cb); }

  function getFeed(filter) {
    if (!filter) return feed;
    return feed.filter(function (n) {
      if (filter.symbol && n.symbols.indexOf(filter.symbol) === -1) return false;
      if (filter.impactedOnly && !n.impacted) return false;
      if (filter.category && n.category !== filter.category) return false;
      return true;
    });
  }

  function getLatestFor(symbol, limit) {
    return feed.filter(function (n) { return n.symbols.indexOf(symbol) !== -1; }).slice(0, limit || 5);
  }

  return {
    start: start,
    onNews: onNews,
    getFeed: getFeed,
    getLatestFor: getLatestFor,
    forcePublish: forcePublish
  };
})();
