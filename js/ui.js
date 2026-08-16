/* ============================================================
   BolsaGT — UI: render de vistas y manejo de eventos
   ============================================================ */

var UI = (function () {
  "use strict";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $all = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function fmtPrice(v, d) { return Number(v).toLocaleString("en-US", { minimumFractionDigits: d || 2, maximumFractionDigits: d || 2 }); }
  function fmtMoney(v) { var s = v < 0 ? "-" : ""; return s + "$" + Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function fmtPct(v) { var s = v > 0 ? "+" : ""; return s + v.toFixed(2) + "%"; }
  function pnlClass(v) { return v > 0 ? "gain" : v < 0 ? "loss" : "flat"; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* ---------- Estado de UI ---------- */
  var view = "dashboard";
  var dashboardSymbol = "AAPL";
  var dashboardTab = "stock";
  var blitzSymbol = "AAPL";
  var blitzTab = "stock";
  var blitzDurationIdx = 2; // "1m" por defecto
  var historyStatusFilter = null;
  var reportPanelOpen = false;

  /* ================= Ticker tape ================= */
  var TAPE_SYMBOLS = ["AAPL", "TSLA", "NVDA", "XAUUSD", "WTI", "EURUSD", "USDGTQ", "MSFT", "AMZN"];

  function renderTickerTape() {
    var el = $("#tickerTapeInner");
    if (!el) return;
    var snapshot = MarketEngine.getSnapshot();
    var bySymbol = {};
    snapshot.forEach(function (t) { bySymbol[t.symbol] = t; });
    var items = TAPE_SYMBOLS.map(function (sym) {
      var instrument = BolsaData.find(sym);
      var t = bySymbol[sym];
      if (!instrument || !t) return "";
      return '<span class="tape-item"><span class="tape-sym">' + sym + '</span>' +
        '<span class="tabular tape-price">' + fmtPrice(t.price, instrument.decimals) + '</span>' +
        '<span class="tabular ' + pnlClass(t.changePct) + '">' + fmtPct(t.changePct) + '</span></span>';
    }).join("");
    el.innerHTML = items + items; // duplicado para loop continuo
  }

  /* ================= Navegación ================= */
  function setView(v) {
    view = v;
    $all(".nav-btn").forEach(function (b) { b.classList.toggle("active", b.dataset.view === v); });
    $all(".view").forEach(function (s) { s.classList.toggle("active", s.id === "view-" + v); });
    renderCurrentView();
  }

  function renderCurrentView() {
    if (view === "dashboard") renderDashboard();
    else if (view === "options") renderOptions();
    else if (view === "portfolio") renderPortfolio();
    else if (view === "history") renderHistory();
  }

  /* ================= Vista: Dashboard (Mercado) ================= */
  function renderDashboard() {
    renderWatchlist();
    renderPriceHeader();
    renderChartNow();
    renderOrderTicket();
    renderOpenOrders();
  }

  function renderWatchlist() {
    var tabsEl = $("#watchlistTabs");
    if (tabsEl && !tabsEl.dataset.bound) {
      tabsEl.dataset.bound = "1";
      tabsEl.innerHTML = ["stock", "index", "etf", "commodity", "forex"].map(function (c) {
        return '<button class="wl-tab" data-cat="' + c + '">' + BolsaData.categoryLabel(c) + "</button>";
      }).join("");
      tabsEl.addEventListener("click", function (e) {
        var btn = e.target.closest(".wl-tab");
        if (!btn) return;
        dashboardTab = btn.dataset.cat;
        renderWatchlist();
      });
    }
    $all(".wl-tab").forEach(function (b) { b.classList.toggle("active", b.dataset.cat === dashboardTab); });

    var listEl = $("#watchlistList");
    var snapshot = MarketEngine.getSnapshot();
    var bySymbol = {};
    snapshot.forEach(function (t) { bySymbol[t.symbol] = t; });
    var instruments = BolsaData.byCategory(dashboardTab);

    listEl.innerHTML = instruments.map(function (instrument) {
      var t = bySymbol[instrument.symbol];
      var active = instrument.symbol === dashboardSymbol;
      var risk = BolsaData.riskLevel(instrument);
      return '<button class="wl-row' + (active ? " active" : "") + '" data-symbol="' + instrument.symbol + '">' +
        '<span class="wl-info"><span class="wl-symbol">' + instrument.symbol +
        ' <span class="risk-badge risk-' + risk + '">' + BolsaData.riskLabel(risk) + '</span></span>' +
        '<span class="wl-name">' + esc(instrument.name) + '</span></span>' +
        '<span class="wl-price"><span class="tabular wl-last">' + (t ? fmtPrice(t.price, instrument.decimals) : "—") + '</span>' +
        '<span class="tabular ' + (t ? pnlClass(t.changePct) : "flat") + '">' + (t ? fmtPct(t.changePct) : "") + '</span></span></button>';
    }).join("");

    if (!listEl.dataset.bound) {
      listEl.dataset.bound = "1";
      listEl.addEventListener("click", function (e) {
        var btn = e.target.closest(".wl-row");
        if (!btn) return;
        dashboardSymbol = btn.dataset.symbol;
        renderDashboard();
      });
    }
  }

  function renderPriceHeader() {
    var instrument = BolsaData.find(dashboardSymbol);
    var t = MarketEngine.getSnapshot().find(function (x) { return x.symbol === dashboardSymbol; });
    $("#priceHeaderSymbol").textContent = dashboardSymbol;
    $("#priceHeaderName").textContent = instrument ? instrument.name : "";
    $("#priceHeaderPrice").textContent = t ? fmtPrice(t.price, instrument.decimals) : "—";
    var chEl = $("#priceHeaderChange");
    chEl.textContent = t ? fmtPct(t.changePct) : "";
    chEl.className = "tabular " + (t ? pnlClass(t.changePct) : "flat");
    $("#priceHeaderSpread").textContent = t ? "bid " + fmtPrice(t.bid, instrument.decimals) + " · ask " + fmtPrice(t.ask, instrument.decimals) : "";
    var descEl = $("#priceHeaderDesc");
    if (descEl) {
      if (instrument) {
        var risk = BolsaData.riskLevel(instrument);
        var ret = BolsaData.expectedReturnLevel(instrument);
        descEl.innerHTML = '<span class="risk-badge risk-' + risk + '">Riesgo ' + BolsaData.riskLabel(risk) + '</span>' +
          '<span class="return-badge return-' + ret + '">' + esc(BolsaData.expectedReturnLabel(ret)) + '</span>' +
          (instrument.description ? '<br><span class="muted small">' + esc(instrument.description) + '</span>' : '');
      } else {
        descEl.innerHTML = "";
      }
    }
    renderRelatedNews();
  }

  /** Noticias del feed simulado que mencionan el instrumento seleccionado —
   *  para que el estudiante vea, en el mismo lugar donde decide invertir,
   *  qué eventos recientes podrían afectar el precio de ese activo. */
  function renderRelatedNews() {
    var el = $("#priceHeaderNews");
    if (!el) return;
    if (typeof NewsEngine === "undefined") { el.innerHTML = ""; return; }
    var feed = NewsEngine.getFeed ? NewsEngine.getFeed() : [];
    var related = feed.filter(function (n) { return n.symbols && n.symbols.indexOf(dashboardSymbol) !== -1; }).slice(0, 3);
    if (related.length === 0) {
      el.innerHTML = '<div class="related-news-empty muted-mono small">Sin noticias recientes para ' + dashboardSymbol + ' todavía — revisa la pestaña Noticias.</div>';
      return;
    }
    el.innerHTML = '<div class="related-news-title muted-mono small">Noticias recientes de ' + dashboardSymbol + '</div>' +
      related.map(function (n) {
        var tagClass = n.impacted ? "impact-yes" : "impact-no";
        var tagText = n.impacted ? "Movió el precio" : "Sin impacto notorio";
        return '<div class="related-news-item"><span class="news-tag ' + tagClass + '">' + tagText + '</span> ' +
          '<span class="related-news-headline">' + esc(n.headline) + '</span></div>';
      }).join("");
  }

  var lastChartSymbol = null;
  function renderChartNow() {
    var canvas = $("#priceChart");
    if (!canvas) return;
    var instrument = BolsaData.find(dashboardSymbol);
    CandleChart.draw(canvas, MarketEngine.getCandles(dashboardSymbol), instrument ? instrument.decimals : 2);
    lastChartSymbol = dashboardSymbol;
  }

  function renderOrderTicket() {
    var el = $("#orderTicket");
    var instrument = BolsaData.find(dashboardSymbol);
    if (!instrument) { el.innerHTML = ""; return; }
    var t = MarketEngine.getSnapshot().find(function (x) { return x.symbol === dashboardSymbol; });
    var side = el.dataset.side || "buy";
    var kind = el.dataset.kind || "market";
    var estPrice = t ? (side === "buy" ? t.ask : t.bid) : null;

    el.innerHTML =
      '<div class="panel-title-row"><h3>Operar ' + dashboardSymbol + '</h3><span class="muted-mono">' + instrument.exchange + '</span></div>' +
      '<div class="side-toggle">' +
      '<button class="side-btn buy' + (side === "buy" ? " active" : "") + '" data-side="buy">Comprar</button>' +
      '<button class="side-btn sell' + (side === "sell" ? " active" : "") + '" data-side="sell">Vender</button>' +
      '</div>' +
      '<div class="kind-toggle">' +
      '<button class="kind-btn' + (kind === "market" ? " active" : "") + '" data-kind="market">Market</button>' +
      '<button class="kind-btn' + (kind === "limit" ? " active" : "") + '" data-kind="limit">Limit</button>' +
      '</div>' +
      '<label class="field-label">Cantidad<input type="number" id="otQty" min="0" step="1" value="' + (el.dataset.qty || "10") + '" class="field-input"></label>' +
      (kind === "limit" ? '<label class="field-label">Precio límite<input type="number" id="otLimit" step="any" placeholder="' + (t ? fmtPrice(t.price, instrument.decimals) : "") + '" value="' + (el.dataset.limit || "") + '" class="field-input"></label>' : "") +
      (side === "buy" ? '<label class="field-label">¿Por qué esta inversión? <span class="muted small">(para tu informe)</span>' +
        '<textarea id="otThesis" class="field-input thesis-input" rows="3" placeholder="Ej: diversifico con ETF de mercado total por su bajo riesgo relativo, o: apuesto por NVDA por su rentabilidad esperada en IA, asumiendo mayor volatilidad...">' + esc(el.dataset.thesis || "") + '</textarea></label>' : "") +
      '<div class="est-row"><span>Precio est.</span><span class="tabular">' + (estPrice ? fmtPrice(estPrice, instrument.decimals) : "—") + '</span></div>' +
      '<button id="otSubmit" class="submit-btn ' + side + '">' + (side === "buy" ? "Comprar " + dashboardSymbol : "Vender " + dashboardSymbol) + '</button>' +
      '<p id="otFeedback" class="feedback"></p>';

    $("#otQty", el).addEventListener("input", function () { el.dataset.qty = this.value; });
    var limitInput = $("#otLimit", el);
    if (limitInput) limitInput.addEventListener("input", function () { el.dataset.limit = this.value; });
    var thesisInput = $("#otThesis", el);
    if (thesisInput) thesisInput.addEventListener("input", function () { el.dataset.thesis = this.value; });

    $all(".side-btn", el).forEach(function (b) { b.addEventListener("click", function () { el.dataset.side = b.dataset.side; renderOrderTicket(); }); });
    $all(".kind-btn", el).forEach(function (b) { b.addEventListener("click", function () { el.dataset.kind = b.dataset.kind; renderOrderTicket(); }); });

    $("#otSubmit", el).addEventListener("click", function () {
      var qty = Number($("#otQty", el).value) || 0;
      var limitVal = limitInput ? Number(limitInput.value) : undefined;
      var thesisVal = thesisInput ? thesisInput.value.trim() : undefined;
      var fb = $("#otFeedback", el);
      try {
        var order = Portfolio.placeOrder({ symbol: dashboardSymbol, side: side, kind: kind, quantity: qty, limitPrice: limitVal, thesis: thesisVal });
        fb.textContent = order.status === "filled" ? "Ejecutada a $" + fmtPrice(order.filledPrice, 4) : "Orden límite colocada, esperando ejecución";
        fb.className = "feedback ok";
        renderOpenOrders();
        renderCurrentView();
      } catch (err) {
        fb.textContent = err.message;
        fb.className = "feedback err";
      }
    });
  }

  function renderOpenOrders() {
    var el = $("#openOrders");
    if (!el) return;
    var open = Portfolio.getOpenOrders();
    if (open.length === 0) {
      el.innerHTML = '<div class="panel muted-mono small-pad">Sin órdenes límite pendientes.</div>';
      return;
    }
    el.innerHTML = '<div class="panel"><div class="panel-header">Órdenes pendientes</div><div class="order-list">' +
      open.map(function (o) {
        return '<div class="order-row"><div>' +
          '<span class="' + (o.side === "buy" ? "gain" : "loss") + '">' + (o.side === "buy" ? "COMPRA" : "VENTA") + '</span> ' +
          '<span class="white">' + o.quantity + " " + o.symbol + '</span> ' +
          '<span class="muted-mono">@ ' + fmtPrice(o.limitPrice, 4) + '</span></div>' +
          '<button class="cancel-btn" data-id="' + o.id + '">Cancelar</button></div>';
      }).join("") + '</div></div>';

    $all(".cancel-btn", el).forEach(function (b) {
      b.addEventListener("click", function () {
        try { Portfolio.cancelOrder(b.dataset.id); renderOpenOrders(); } catch (e) { alert(e.message); }
      });
    });
  }

  /* ================= Vista: Opciones Blitz (sube/baja cronometrado) ================= */

  function renderOptions() {
    renderBlitzWatchlist();
    renderBlitzHeader();
    renderBlitzChart();
    renderBlitzTicket();
    renderBlitzOpenBets();
  }

  function renderBlitzWatchlist() {
    var tabsEl = $("#blitzTabs");
    if (tabsEl && !tabsEl.dataset.bound) {
      tabsEl.dataset.bound = "1";
      tabsEl.innerHTML = ["stock", "index", "etf", "commodity", "forex"].map(function (c) {
        return '<button class="wl-tab" data-cat="' + c + '">' + BolsaData.categoryLabel(c) + "</button>";
      }).join("");
      tabsEl.addEventListener("click", function (e) {
        var btn = e.target.closest(".wl-tab");
        if (!btn) return;
        blitzTab = btn.dataset.cat;
        renderOptions();
      });
    }
    $all(".wl-tab", tabsEl).forEach(function (b) { b.classList.toggle("active", b.dataset.cat === blitzTab); });

    var listEl = $("#blitzList");
    var snapshot = MarketEngine.getSnapshot();
    var bySymbol = {};
    snapshot.forEach(function (t) { bySymbol[t.symbol] = t; });
    var instruments = BolsaData.byCategory(blitzTab);

    listEl.innerHTML = instruments.map(function (instrument) {
      var t = bySymbol[instrument.symbol];
      var active = instrument.symbol === blitzSymbol;
      return '<button class="wl-row' + (active ? " active" : "") + '" data-symbol="' + instrument.symbol + '">' +
        '<span class="wl-info"><span class="wl-symbol">' + instrument.symbol + '</span>' +
        '<span class="wl-name">' + esc(instrument.name) + '</span></span>' +
        '<span class="wl-price"><span class="tabular wl-last">' + (t ? fmtPrice(t.price, instrument.decimals) : "—") + '</span>' +
        '<span class="tabular ' + (t ? pnlClass(t.changePct) : "flat") + '">' + (t ? fmtPct(t.changePct) : "") + '</span></span></button>';
    }).join("");

    if (!listEl.dataset.bound) {
      listEl.dataset.bound = "1";
      listEl.addEventListener("click", function (e) {
        var btn = e.target.closest(".wl-row");
        if (!btn) return;
        blitzSymbol = btn.dataset.symbol;
        renderOptions();
      });
    }
  }

  function renderBlitzHeader() {
    var instrument = BolsaData.find(blitzSymbol);
    var t = MarketEngine.getSnapshot().find(function (x) { return x.symbol === blitzSymbol; });
    $("#blitzSymbol").textContent = blitzSymbol;
    $("#blitzName").textContent = instrument ? instrument.name : "";
    $("#blitzPrice").textContent = t ? fmtPrice(t.price, instrument.decimals) : "—";
    var chEl = $("#blitzChange");
    chEl.textContent = t ? fmtPct(t.changePct) : "";
    chEl.className = "tabular " + (t ? pnlClass(t.changePct) : "flat");
  }

  function currentBlitzBet() {
    // Si hay varias apuestas abiertas sobre el mismo símbolo, se muestra en el
    // gráfico la que vence más pronto.
    var open = Portfolio.getOpenBets().filter(function (b) { return b.symbol === blitzSymbol; });
    if (open.length === 0) return null;
    open.sort(function (a, b) { return new Date(a.expiryTime) - new Date(b.expiryTime); });
    return open[0];
  }

  function renderBlitzChart() {
    var canvas = $("#blitzChart");
    if (!canvas) return;
    var instrument = BolsaData.find(blitzSymbol);
    var bet = currentBlitzBet();
    var overlay = null;
    if (bet) {
      var t = MarketEngine.getSnapshot().find(function (x) { return x.symbol === blitzSymbol; });
      var favorable = t ? (bet.direction === "up" ? t.price >= bet.openPrice : t.price <= bet.openPrice) : true;
      overlay = {
        openPrice: bet.openPrice, direction: bet.direction, favorable: favorable,
        openTimeMs: new Date(bet.openTime).getTime(), expiryMs: new Date(bet.expiryTime).getTime()
      };
    }
    CandleChart.draw(canvas, MarketEngine.getCandles(blitzSymbol), instrument ? instrument.decimals : 2, overlay);
  }

  function renderBlitzTicket() {
    var el = $("#blitzTicket");
    var amount = Number(el.dataset.amount || "100");
    var duration = BLITZ_DURATIONS[blitzDurationIdx];
    var payoutAmount = amount * duration.payoutPct;

    el.innerHTML =
      '<h3>Operación cronometrada</h3>' +
      '<p class="muted-mono small">Predice si ' + blitzSymbol + ' sube o baja antes de que termine el conteo.</p>' +
      '<div class="field-label">Duración<div id="blitzDurations" class="chip-row"></div></div>' +
      '<label class="field-label">Monto a invertir<input type="number" id="blitzAmount" min="1" step="10" value="' + amount + '" class="field-input"></label>' +
      '<div class="blitz-payout"><span>Beneficio si aciertas</span><span class="tabular gain">+' + (duration.payoutPct * 100).toFixed(0) + '% <span class="muted-mono small">($' + payoutAmount.toFixed(2) + ')</span></span></div>' +
      '<div class="blitz-buttons">' +
      '<button id="blitzUp" class="blitz-btn up">▲ SUBE</button>' +
      '<button id="blitzDown" class="blitz-btn down">▼ BAJA</button>' +
      '</div>' +
      '<p id="blitzFeedback" class="feedback"></p>';

    var durEl = $("#blitzDurations", el);
    durEl.innerHTML = BLITZ_DURATIONS.map(function (d, i) {
      return '<button class="chip amber' + (i === blitzDurationIdx ? " active" : "") + '" data-i="' + i + '">' + d.label + "</button>";
    }).join("");
    $all(".chip", durEl).forEach(function (b) {
      b.addEventListener("click", function () { blitzDurationIdx = Number(b.dataset.i); renderBlitzTicket(); });
    });

    $("#blitzAmount", el).addEventListener("input", function () { el.dataset.amount = this.value; });

    function submit(direction) {
      var fb = $("#blitzFeedback", el);
      var qty = Number($("#blitzAmount", el).value) || 0;
      try {
        Portfolio.placeBet({
          symbol: blitzSymbol, direction: direction, investment: qty,
          durationSeconds: duration.seconds, payoutPct: duration.payoutPct
        });
        fb.textContent = "Apuesta " + (direction === "up" ? "SUBE" : "BAJA") + " colocada por $" + qty.toFixed(2) + " · " + duration.label;
        fb.className = "feedback ok";
        renderBlitzChart();
        renderBlitzOpenBets();
      } catch (err) {
        fb.textContent = err.message;
        fb.className = "feedback err";
      }
    }
    $("#blitzUp", el).addEventListener("click", function () { submit("up"); });
    $("#blitzDown", el).addEventListener("click", function () { submit("down"); });
  }

  function renderBlitzOpenBets() {
    var el = $("#blitzOpenBets");
    var open = Portfolio.getOpenBets();
    if (open.length === 0) {
      el.innerHTML = '<div class="panel muted-mono small-pad">Sin apuestas abiertas. Elige un instrumento, monto y duración, y presiona SUBE o BAJA.</div>';
      return;
    }
    el.innerHTML = '<div class="panel"><div class="panel-header">Apuestas abiertas (' + open.length + ')</div><div class="bets-list">' +
      open.map(function (b) {
        var t = MarketEngine.getSnapshot().find(function (x) { return x.symbol === b.symbol; });
        var current = t ? t.price : b.openPrice;
        var favorable = b.direction === "up" ? current >= b.openPrice : current <= b.openPrice;
        var remainingMs = Math.max(0, new Date(b.expiryTime).getTime() - Date.now());
        var remaining = Math.round(remainingMs / 1000);
        var mm = String(Math.floor(remaining / 60)).padStart(2, "0");
        var ss = String(remaining % 60).padStart(2, "0");
        return '<div class="bet-row">' +
          '<div class="bet-main">' +
          '<span class="' + (b.direction === "up" ? "gain" : "loss") + '">' + (b.direction === "up" ? "▲ SUBE" : "▼ BAJA") + '</span> ' +
          '<span class="white">' + b.symbol + '</span> ' +
          '<span class="muted-mono small">$' + b.investment.toFixed(2) + ' · apertura ' + fmtPrice(b.openPrice, 4) + '</span>' +
          '</div>' +
          '<div class="bet-side">' +
          '<span class="countdown-badge ' + (favorable ? "gain" : "loss") + '">' + mm + ":" + ss + '</span>' +
          '<button class="close-early-btn" data-id="' + b.id + '">Cerrar ahora (estimado)</button>' +
          '</div></div>';
      }).join("") + '</div></div>';

    $all(".close-early-btn", el).forEach(function (b) {
      b.addEventListener("click", function () {
        try { Portfolio.closeBetEarly(b.dataset.id); renderOptions(); } catch (e) { alert(e.message); }
      });
    });
  }

  /* ================= Vista: Portafolio ================= */
  function renderRecommendedPlan() {
    var el = $("#portfolioRecommendedPlan");
    if (!el || !BolsaData.INVESTMENT_PLAN) return;
    var rows = BolsaData.INVESTMENT_PLAN.map(function (plan) {
      var instrument = BolsaData.find(plan.symbol) || {};
      return '<tr><td class="white"><strong>' + esc(plan.symbol) + '</strong><br><span class="muted-mono small">' + esc(instrument.name || "") + '</span></td>' +
        '<td class="muted-mono">' + esc(BolsaData.categoryLabel(instrument.category || "")) + '</td>' +
        '<td class="right tabular">' + plan.weight.toFixed(0) + '%</td>' +
        '<td class="right tabular white">' + fmtMoney(plan.allocation) + '</td>' +
        '<td class="right tabular">' + plan.expectedReturn.toFixed(1) + '% anual</td>' +
        '<td><span class="risk-badge risk-' + String(plan.risk).toLowerCase().replace(/[^a-z]+/g, "-") + '">' + esc(plan.risk) + '</span></td>' +
        '<td class="muted small">' + esc(plan.rationale) + '</td></tr>';
    }).join("");
    var total = BolsaData.INVESTMENT_PLAN.reduce(function (sum, plan) { return sum + plan.allocation; }, 0);
    el.innerHTML = '<div class="panel recommendation-panel"><div class="panel-header recommendation-header"><div><h3>Plan académico recomendado</h3><p class="muted-mono small">Distribución sugerida para fines educativos; no representa posiciones ejecutadas.</p></div><span class="recommendation-total">' + fmtMoney(total) + '</span></div>' +
      '<div class="recommendation-note">Carga este plan únicamente cuando lo solicites. La cuenta puede permanecer vacía con US$50,000 en efectivo.</div>' +
      '<div class="table-scroll"><table class="data-table recommendation-table"><thead><tr><th>Activo</th><th>Clase</th><th class="right">Objetivo</th><th class="right">Monto</th><th class="right">Rend. esp.</th><th>Riesgo</th><th>Justificación</th></tr></thead><tbody>' + rows + '</tbody><tfoot><tr><th colspan="2">TOTAL RECOMENDADO</th><th class="right">100%</th><th class="right">' + fmtMoney(total) + '</th><th colspan="3"></th></tr></tfoot></table></div></div>';
  }

  function renderPortfolio() {
    var summary = Portfolio.getSummary();
    var kpis = [
      { label: "Efectivo disponible", value: fmtMoney(summary.cash) },
      { label: "Valor en posiciones", value: fmtMoney(summary.equityValue) },
      { label: "Valor total de cuenta", value: fmtMoney(summary.totalValue), sub: "Balance inicial: " + fmtMoney(summary.startingBalance) },
      { label: "P&L total", value: fmtMoney(summary.totalPnl), sub: fmtPct(summary.totalPnlPct), cls: pnlClass(summary.totalPnl) },
      { label: "P&L del día", value: fmtMoney(summary.dayPnl), cls: pnlClass(summary.dayPnl) }
    ];
    $("#portfolioKpis").innerHTML = kpis.map(function (k) {
      return '<div class="kpi-card"><div class="kpi-label">' + k.label + '</div>' +
        '<div class="kpi-value ' + (k.cls || "") + '">' + k.value + '</div>' +
        (k.sub ? '<div class="kpi-sub">' + k.sub + '</div>' : "") + '</div>';
    }).join("");

    renderConcentrationWarning(summary);
    renderRecommendedPlan();

    var posEl = $("#positionsTable");
    if (summary.positions.length === 0) {
      posEl.innerHTML = '<div class="panel muted-mono center-pad">No tienes posiciones abiertas. Coloca una orden desde Mercado u Opciones para empezar. El plan académico recomendado se muestra arriba y no se carga automáticamente.</div>';
      return;
    }
    posEl.innerHTML = '<table class="data-table"><thead><tr>' +
      "<th>Símbolo</th><th>Tipo</th><th>Riesgo</th><th class='right'>Cantidad</th><th class='right'>Precio prom.</th>" +
      "<th class='right'>Precio actual</th><th class='right'>Valor de mercado</th><th class='right'>P&amp;L no realizado</th>" +
      "</tr></thead><tbody>" + summary.positions.map(function (p) {
        var instrument = BolsaData.find(p.symbol) || (p.category === "option" ? BolsaData.find(p.symbol.split("-")[0]) : null);
        var risk = instrument ? BolsaData.riskLevel(instrument) : "medium";
        var thesisRow = p.thesis ? "<tr class='thesis-row'><td colspan='8'><span class='muted-mono small'>Justificación:</span> <span class='muted small'>" + esc(p.thesis) + "</span></td></tr>" : "";
        return "<tr><td class='white'>" + p.symbol + (p.optionType ? ' <span class="muted-mono small">' + (p.optionType === "call" ? "CALL" : "PUT") + " " + p.strike + " · " + p.expiry + "</span>" : "") + "</td>" +
          "<td class='muted-mono'>" + BolsaData.categoryLabel(p.category) + "</td>" +
          "<td><span class='risk-badge risk-" + risk + "'>" + BolsaData.riskLabel(risk) + "</span></td>" +
          "<td class='right tabular white'>" + p.quantity + "</td>" +
          "<td class='right tabular muted-mono'>" + fmtPrice(p.avgPrice, 4) + "</td>" +
          "<td class='right tabular white'>" + fmtPrice(p.currentPrice, 4) + "</td>" +
          "<td class='right tabular white'>" + fmtMoney(p.marketValue) + "</td>" +
          "<td class='right tabular " + pnlClass(p.unrealizedPnl) + "'>" + fmtMoney(p.unrealizedPnl) + ' <span class="small">(' + fmtPct(p.unrealizedPnlPct) + ")</span></td></tr>" + thesisRow;
      }).join("") + "</tbody></table>";
  }

  /** Advierte si el portafolio está poco diversificado: una sola posición
   *  concentrando una porción muy grande del valor total de la cuenta. */
  function renderConcentrationWarning(summary) {
    var el = $("#concentrationWarning");
    if (!el) return;
    if (summary.positions.length === 0 || summary.totalValue <= 0) { el.innerHTML = ""; return; }
    var top = summary.positions.slice().sort(function (a, b) { return b.marketValue - a.marketValue; })[0];
    var topPct = (top.marketValue / summary.totalValue) * 100;
    if (topPct >= 40) {
      el.innerHTML = '<div class="concentration-warning">⚠️ <span><strong>Concentración alta:</strong> ' +
        topPct.toFixed(0) + '% de tu portafolio está en una sola posición (' + top.symbol +
        '). Considera repartir el capital entre más instrumentos o clases de activo distintas para diversificar el riesgo.</span></div>';
    } else {
      el.innerHTML = "";
    }
  }

  function renderPortfolioAnalytics() {
    var el = $("#portfolioAnalytics");
    if (!el || typeof PortfolioAnalytics === "undefined") return;
    var summary = Portfolio.getSummary();
    var metrics = PortfolioAnalytics.getMetrics(summary);
    var scenarioResults = PortfolioAnalytics.scenarioResults(summary);
    var selectedScenario = PortfolioAnalytics.getSelectedScenario();

    if (!el.dataset.bound) {
      el.innerHTML =
        '<div class="analytics-header"><div><h3>Analítica de cartera</h3><p class="muted-mono small">Evalúa si la distribución real se mantiene cerca del objetivo y documenta tus decisiones.</p></div>' +
        '<button id="exportDecisionsBtn" class="reset-btn">Exportar bitácora CSV</button></div>' +
        '<div id="analyticsKpis" class="analytics-kpis"></div>' +
        '<div class="analytics-grid">' +
          '<div class="panel analytics-panel"><h4>Asignación objetivo vs. real</h4><div id="allocationComparison"></div></div>' +
          '<div class="panel analytics-panel"><h4>Escenarios de mercado</h4>' +
            '<label class="field-label">Escenario seleccionado<select id="scenarioSelect" class="field-input"></select></label>' +
            '<div id="scenarioDescription" class="scenario-description"></div><div id="scenarioTable"></div>' +
          '</div>' +
        '</div>' +
        '<div class="panel analytics-panel decision-panel"><div class="analytics-header"><div><h4>Bitácora de decisiones</h4><p class="muted-mono small">Registra la hipótesis antes de comprar, vender o mantener una posición.</p></div></div>' +
          '<form id="decisionForm" class="decision-form">' +
            '<label class="field-label">Activo<select id="decisionSymbol" class="field-input"></select></label>' +
            '<label class="field-label">Acción<select id="decisionAction" class="field-input"><option>Compra</option><option>Venta</option><option>Mantener</option></select></label>' +
            '<label class="field-label">Monto US$<input id="decisionAmount" class="field-input" type="number" min="0" step="0.01" placeholder="0.00"></label>' +
            '<label class="field-label">Escenario<select id="decisionScenario" class="field-input"></select></label>' +
            '<label class="field-label span2">Expectativa<input id="decisionExpected" class="field-input" type="text" placeholder="Ej.: espero crecimiento por inversión en IA"></label>' +
            '<label class="field-label span2">Motivo de la decisión<textarea id="decisionReason" class="field-input" rows="2" placeholder="Explica el precio, riesgo, diversificación o noticia considerada"></textarea></label>' +
            '<button class="submit-btn amber" type="submit">Guardar decisión</button><span id="decisionFeedback" class="feedback"></span>' +
          '</form><div id="decisionLog"></div>' +
        '</div>';
      el.dataset.bound = "1";
      var scenarioOptions = Object.keys(PortfolioAnalytics.SCENARIOS).map(function (key) {
        return '<option value="' + key + '">' + esc(PortfolioAnalytics.SCENARIOS[key].label) + '</option>';
      }).join("");
      $("#scenarioSelect", el).innerHTML = scenarioOptions;
      $("#decisionScenario", el).innerHTML = scenarioOptions;
      $("#decisionSymbol", el).innerHTML = BolsaData.INVESTMENT_PLAN.map(function (plan) {
        return '<option value="' + plan.symbol + '">' + plan.symbol + ' — ' + esc((BolsaData.find(plan.symbol) || {}).name || "") + '</option>';
      }).join("");
      $("#scenarioSelect", el).addEventListener("change", function (event) {
        PortfolioAnalytics.setSelectedScenario(event.target.value);
        renderPortfolioAnalytics();
      });
      $("#exportDecisionsBtn", el).addEventListener("click", function () { PortfolioAnalytics.exportDecisionsCSV(); });
      $("#decisionForm", el).addEventListener("submit", function (event) {
        event.preventDefault();
        var amount = Number($("#decisionAmount", el).value || 0);
        var reason = $("#decisionReason", el).value.trim();
        if (!reason) { $("#decisionFeedback", el).textContent = "Agrega un motivo para documentar la decisión."; return; }
        PortfolioAnalytics.addDecision({
          symbol: $("#decisionSymbol", el).value, action: $("#decisionAction", el).value,
          amount: amount, expected: $("#decisionExpected", el).value.trim(), reason: reason,
          scenario: $("#decisionScenario", el).value
        });
        $("#decisionReason", el).value = "";
        $("#decisionExpected", el).value = "";
        $("#decisionAmount", el).value = "";
        $("#decisionFeedback", el).textContent = "Decisión guardada en la bitácora.";
        renderPortfolioAnalytics();
      });
    }

    $("#scenarioSelect", el).value = selectedScenario;
    $("#decisionScenario", el).value = selectedScenario;
    $("#analyticsKpis", el).innerHTML = [
      { label: "Riesgo relativo", value: metrics.riskLevel, cls: metrics.riskLevel === "Alto" ? "loss" : "amber" },
      { label: "Capital invertido", value: metrics.investedPct.toFixed(1) + "%", cls: "cyan" },
      { label: "Exposición QQQ + MSFT", value: metrics.techExposure.toFixed(1) + "%", cls: metrics.techExposure > 45 ? "loss" : "amber" },
      { label: "Mayor posición", value: metrics.largestSymbol + " · " + metrics.largestWeight.toFixed(1) + "%", cls: "white" },
      { label: "Desviación absoluta", value: metrics.totalAbsDeviation.toFixed(1) + " p.p.", cls: metrics.totalAbsDeviation > 15 ? "loss" : "cyan" },
      { label: "Peor escenario", value: metrics.scenarioWorstPct.toFixed(2) + "%", cls: metrics.scenarioWorstPct < 0 ? "loss" : "gain" }
    ].map(function (item) { return '<div class="analytics-kpi"><span>' + item.label + '</span><strong class="' + item.cls + '">' + item.value + '</strong></div>'; }).join("");

    $("#allocationComparison", el).innerHTML = '<table class="data-table compact-table"><thead><tr><th>Activo</th><th class="right">Objetivo</th><th class="right">Real</th><th class="right">Desvío</th></tr></thead><tbody>' +
      metrics.rows.map(function (row) { return '<tr><td class="white">' + row.symbol + '</td><td class="right tabular">' + row.targetWeight.toFixed(1) + '%</td><td class="right tabular">' + row.actualWeight.toFixed(1) + '%</td><td class="right tabular ' + pnlClass(-Math.abs(row.deviation)) + '">' + (row.deviation > 0 ? '+' : '') + row.deviation.toFixed(1) + ' p.p.</td></tr>'; }).join("") +
      '</tbody></table>';

    var selected = scenarioResults.find(function (item) { return item.key === selectedScenario; }) || scenarioResults[0];
    $("#scenarioDescription", el).textContent = selected.label + ": " + selected.description;
    $("#scenarioTable", el).innerHTML = '<div class="scenario-result"><span>Valor estimado</span><strong>' + fmtMoney(selected.value) + '</strong><span>Variación estimada</span><strong class="' + pnlClass(selected.change) + '">' + fmtMoney(selected.change) + ' (' + fmtPct(selected.changePct) + ')</strong></div>' +
      '<details class="scenario-details"><summary>Ver todos los escenarios</summary><table class="data-table compact-table"><thead><tr><th>Escenario</th><th class="right">Cambio</th><th class="right">Valor</th></tr></thead><tbody>' +
      scenarioResults.map(function (item) { return '<tr><td>' + item.label + '</td><td class="right tabular ' + pnlClass(item.change) + '">' + fmtMoney(item.change) + ' (' + fmtPct(item.changePct) + ')</td><td class="right tabular">' + fmtMoney(item.value) + '</td></tr>'; }).join("") + '</tbody></table></details>';

    var decisions = PortfolioAnalytics.getDecisions();
    $("#decisionLog", el).innerHTML = decisions.length === 0 ? '<div class="muted-mono center-pad">Todavía no hay decisiones registradas.</div>' : '<table class="data-table compact-table"><thead><tr><th>Fecha</th><th>Activo</th><th>Acción</th><th class="right">Monto</th><th>Expectativa y motivo</th><th></th></tr></thead><tbody>' + decisions.slice(0, 20).map(function (item) {
      return '<tr><td class="muted-mono small">' + new Date(item.date).toLocaleDateString("es-GT") + '</td><td class="white">' + item.symbol + '</td><td>' + esc(item.action) + '</td><td class="right tabular">' + fmtMoney(item.amount) + '</td><td><strong>' + esc(item.expected || "Sin expectativa") + '</strong><br><span class="muted-mono small">' + esc(item.reason) + '</span></td><td><button class="icon-btn delete-decision" data-id="' + item.id + '" title="Eliminar">×</button></td></tr>';
    }).join("") + '</tbody></table>';
    $all(".delete-decision", el).forEach(function (button) { button.addEventListener("click", function () { PortfolioAnalytics.removeDecision(button.dataset.id); renderPortfolioAnalytics(); }); });
  }

  /* ================= Vista: Historial ================= */
  var STATUS_OPTIONS = [
    { value: null, label: "Todas" }, { value: "filled", label: "Ejecutadas" }, { value: "pending", label: "Pendientes" },
    { value: "cancelled", label: "Canceladas" }, { value: "rejected", label: "Rechazadas" }
  ];
  var STATUS_COLOR = { filled: "gain", pending: "amber", cancelled: "flat", rejected: "loss" };

  function renderHistory() {
    renderReportPanel();
    renderHistoryLists();
  }

  function renderHistoryLists() {
    var filtersEl = $("#historyFilters");
    filtersEl.innerHTML = STATUS_OPTIONS.map(function (o) {
      return '<button class="chip' + (historyStatusFilter === o.value ? " active" : "") + '" data-v="' + (o.value || "") + '">' + o.label + "</button>";
    }).join("");
    $all(".chip", filtersEl).forEach(function (b) {
      b.addEventListener("click", function () { historyStatusFilter = b.dataset.v || null; renderHistoryLists(); });
    });

    var orders = Portfolio.getOrders(historyStatusFilter ? { status: historyStatusFilter } : {});
    var tableEl = $("#historyTable");
    if (orders.length === 0) {
      tableEl.innerHTML = '<div class="panel muted-mono center-pad">Sin operaciones registradas todavía.</div>';
    } else {
      tableEl.innerHTML = '<table class="data-table"><thead><tr>' +
        "<th>Fecha</th><th>Símbolo</th><th>Tipo</th><th>Lado</th><th>Orden</th>" +
        "<th class='right'>Cantidad</th><th class='right'>Precio ejecución</th><th class='right'>Estado</th></tr></thead><tbody>" +
        orders.map(function (o) {
          return "<tr><td class='muted-mono'>" + new Date(o.createdAt).toLocaleString("es-GT") + "</td>" +
            "<td class='white'>" + o.symbol + "</td>" +
            "<td class='muted-mono'>" + BolsaData.categoryLabel(o.category) + "</td>" +
            "<td class='" + (o.side === "buy" ? "gain" : "loss") + "'>" + (o.side === "buy" ? "Compra" : "Venta") + "</td>" +
            "<td class='muted-mono upper'>" + o.kind + "</td>" +
            "<td class='right tabular white'>" + o.quantity + "</td>" +
            "<td class='right tabular white'>" + (o.filledPrice != null ? fmtPrice(o.filledPrice, 4) : "—") + "</td>" +
            "<td class='right upper small " + (STATUS_COLOR[o.status] || "flat") + "'>" + o.status + "</td></tr>";
        }).join("") + "</tbody></table>";
    }

    renderBetsHistoryTable();
  }

  var BET_STATUS_COLOR = { open: "amber", won: "gain", lost: "loss", tied: "flat", closed_early: "cyan" };
  var BET_STATUS_LABEL = { open: "abierta", won: "ganada", lost: "perdida", tied: "empate", closed_early: "cerrada anticipada" };

  function renderBetsHistoryTable() {
    var el = $("#betsHistoryTable");
    if (!el) return;
    var bets = Portfolio.getBetHistory({});
    if (bets.length === 0) {
      el.innerHTML = '<div class="panel muted-mono center-pad">Sin apuestas Blitz registradas todavía.</div>';
      return;
    }
    el.innerHTML = '<table class="data-table"><thead><tr>' +
      "<th>Fecha</th><th>Símbolo</th><th>Dirección</th><th class='right'>Duración</th>" +
      "<th class='right'>Inversión</th><th class='right'>Apertura</th><th class='right'>Cierre</th>" +
      "<th class='right'>P/L</th><th class='right'>Estado</th></tr></thead><tbody>" +
      bets.map(function (b) {
        var durLabel = b.durationSeconds >= 60 ? (b.durationSeconds / 60) + "m" : b.durationSeconds + "s";
        return "<tr><td class='muted-mono'>" + new Date(b.openTime).toLocaleString("es-GT") + "</td>" +
          "<td class='white'>" + b.symbol + "</td>" +
          "<td class='" + (b.direction === "up" ? "gain" : "loss") + "'>" + (b.direction === "up" ? "▲ SUBE" : "▼ BAJA") + "</td>" +
          "<td class='right muted-mono'>" + durLabel + "</td>" +
          "<td class='right tabular white'>" + fmtMoney(b.investment) + "</td>" +
          "<td class='right tabular muted-mono'>" + fmtPrice(b.openPrice, 4) + "</td>" +
          "<td class='right tabular muted-mono'>" + (b.closePrice != null ? fmtPrice(b.closePrice, 4) : "—") + "</td>" +
          "<td class='right tabular " + (b.profit != null ? pnlClass(b.profit) : "flat") + "'>" + (b.profit != null ? fmtMoney(b.profit) : "—") + "</td>" +
          "<td class='right upper small " + (BET_STATUS_COLOR[b.status] || "flat") + "'>" + (BET_STATUS_LABEL[b.status] || b.status) + "</td></tr>";
      }).join("") + "</tbody></table>";
  }

  function renderReportPanel() {
    var el = $("#reportPanel");
    el.innerHTML =
      '<button id="reportToggle" class="report-toggle">' +
      '<div><h3>Informe de entrega de inversiones</h3>' +
      '<p class="muted-mono small">Descarga un PDF con resumen ejecutivo, composición del portafolio, gráficas de P&amp;L e historial — listo para entrega universitaria.</p></div>' +
      '<span class="cyan">' + (reportPanelOpen ? "Ocultar ▲" : "Configurar ▼") + "</span></button>" +
      (reportPanelOpen ? '<div class="report-form">' +
        '<div class="report-grid">' +
        field("reportTitle", "Título del informe", "Informe de Análisis y Entrega de Inversiones", true) +
        field("university", "Universidad", "Universidad de San Carlos de Guatemala") +
        field("course", "Curso", "Economía Financiera") +
        field("professor", "Catedrático", "") +
        field("section", "Sección", "") +
        field("studentName", "Nombre del estudiante", "") +
        field("studentId", "Carné", "") +
        "</div>" +
        '<div class="report-actions"><button id="reportSubmit" class="submit-btn amber">Descargar informe PDF</button><button id="reportDocxSubmit" class="submit-btn secondary">Descargar informe DOCX</button></div>' +
        '<p id="reportFeedback" class="feedback"></p></div>' : "");

    $("#reportToggle").addEventListener("click", function () { reportPanelOpen = !reportPanelOpen; renderReportPanel(); });

    if (reportPanelOpen) {
      function reportMeta() {
        return {
          reportTitle: val("reportTitle") || "Informe de Análisis y Entrega de Inversiones",
          university: val("university"), course: val("course"), professor: val("professor"),
          section: val("section"), studentName: val("studentName"), studentId: val("studentId")
        };
      }
      $("#reportSubmit").addEventListener("click", function () {
        var fb = $("#reportFeedback");
        try { InvestmentReport.generate(reportMeta()); fb.textContent = "Informe PDF descargado correctamente."; fb.className = "feedback ok"; }
        catch (err) { fb.textContent = "No se pudo generar el PDF: " + err.message; fb.className = "feedback err"; }
      });
      $("#reportDocxSubmit").addEventListener("click", function () {
        var fb = $("#reportFeedback");
        fb.textContent = "Generando DOCX...";
        InvestmentReport.generateDocx(reportMeta()).then(function () { fb.textContent = "Informe DOCX descargado correctamente."; fb.className = "feedback ok"; }).catch(function (err) { fb.textContent = "No se pudo generar el DOCX: " + err.message; fb.className = "feedback err"; });
      });
    }

    function field(id, label, placeholder, span2) {
      return '<label class="field-label' + (span2 ? " span2" : "") + '">' + label +
        '<input type="text" id="rf_' + id + '" placeholder="' + esc(placeholder) + '" value="' + esc(el.dataset[id] || "") + '" class="field-input"></label>';
    }
    function val(id) {
      var input = $("#rf_" + id);
      if (input) el.dataset[id] = input.value;
      return input ? input.value : "";
    }
  }

  /* ================= Init ================= */
  function init() {
    var mobileMenuToggle = $("#mobileMenuToggle");
    var mainNav = $("#mainNav");
    function closeMobileMenu() {
      if (!mobileMenuToggle || !mainNav) return;
      mobileMenuToggle.setAttribute("aria-expanded", "false");
      mainNav.classList.remove("is-open");
    }
    if (mobileMenuToggle && mainNav) {
      mobileMenuToggle.addEventListener("click", function () {
        var open = mobileMenuToggle.getAttribute("aria-expanded") === "true";
        mobileMenuToggle.setAttribute("aria-expanded", String(!open));
        mainNav.classList.toggle("is-open", !open);
      });
    }
    $all(".nav-btn").forEach(function (b) {
      b.addEventListener("click", function () { setView(b.dataset.view); closeMobileMenu(); });
    });
    var resetBtn = $("#resetSimBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        if (!confirm("¿Reiniciar la simulación? Esto borra tu portafolio, posiciones e historial y vuelve a $50,000 de balance inicial.")) return;
        resetBtn.disabled = true;
        if (window.PortfolioAnalytics && typeof PortfolioAnalytics.reset === "function") PortfolioAnalytics.reset();
        Promise.resolve(Portfolio.reset()).then(function () {
          window.location.reload();
        }).catch(function (err) {
          resetBtn.disabled = false;
          alert("No se pudo completar el reinicio: " + (err.message || "error desconocido"));
        });
      });
    }
    var loadPlanBtn = $("#loadPlanBtn");
    if (loadPlanBtn) {
      loadPlanBtn.addEventListener("click", function () {
        if (!confirm("¿Cargar la cartera recomendada? Reemplazará las posiciones actuales por la distribución académica de US$50,000.")) return;
        loadPlanBtn.disabled = true;
        Promise.resolve(Portfolio.loadRecommendedPlan()).then(function () {
          renderCurrentView();
          loadPlanBtn.disabled = false;
        }).catch(function (err) {
          loadPlanBtn.disabled = false;
          alert("No se pudo cargar la cartera recomendada. " + (err.message || ""));
        });
      });
    }
    renderTickerTape();
    setView("dashboard");

    MarketEngine.onTick(function () {
      Portfolio.runLimitMatching();
      Portfolio.settleExpiredBets();
      renderTickerTape();
      renderWatchlistPricesOnly(); // refresca ambas watchlists (Mercado y Opciones Blitz), visibles u ocultas
      if (view === "dashboard") { renderPriceHeader(); renderChartNow(); renderOpenOrders(); }
      else if (view === "options") { renderBlitzHeader(); renderBlitzChart(); renderBlitzOpenBets(); }
      else if (view === "portfolio") { renderPortfolio(); }
      else if (view === "history") { renderHistoryLists(); }
    });

    MarketEngine.start();
  }

  // Actualiza solo los precios de las watchlists (Mercado y Opciones Blitz) sin re-bindear eventos
  function renderWatchlistPricesOnly() {
    var snapshot = MarketEngine.getSnapshot();
    var bySymbol = {};
    snapshot.forEach(function (t) { bySymbol[t.symbol] = t; });
    $all(".wl-row").forEach(function (row) {
      var t = bySymbol[row.dataset.symbol];
      var instrument = BolsaData.find(row.dataset.symbol);
      if (!t || !instrument) return;
      row.querySelector(".wl-last").textContent = fmtPrice(t.price, instrument.decimals);
      var chEl = row.querySelector(".wl-price span:last-child");
      chEl.textContent = fmtPct(t.changePct);
      chEl.className = "tabular " + pnlClass(t.changePct);
    });
  }

  return { init: init };
})();
