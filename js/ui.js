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
      tabsEl.innerHTML = ["stock", "commodity", "forex"].map(function (c) {
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
      '<div class="est-row"><span>Precio est.</span><span class="tabular">' + (estPrice ? fmtPrice(estPrice, instrument.decimals) : "—") + '</span></div>' +
      '<button id="otSubmit" class="submit-btn ' + side + '">' + (side === "buy" ? "Comprar " + dashboardSymbol : "Vender " + dashboardSymbol) + '</button>' +
      '<p id="otFeedback" class="feedback"></p>';

    $("#otQty", el).addEventListener("input", function () { el.dataset.qty = this.value; });
    var limitInput = $("#otLimit", el);
    if (limitInput) limitInput.addEventListener("input", function () { el.dataset.limit = this.value; });

    $all(".side-btn", el).forEach(function (b) { b.addEventListener("click", function () { el.dataset.side = b.dataset.side; renderOrderTicket(); }); });
    $all(".kind-btn", el).forEach(function (b) { b.addEventListener("click", function () { el.dataset.kind = b.dataset.kind; renderOrderTicket(); }); });

    $("#otSubmit", el).addEventListener("click", function () {
      var qty = Number($("#otQty", el).value) || 0;
      var limitVal = limitInput ? Number(limitInput.value) : undefined;
      var fb = $("#otFeedback", el);
      try {
        var order = Portfolio.placeOrder({ symbol: dashboardSymbol, side: side, kind: kind, quantity: qty, limitPrice: limitVal });
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
      tabsEl.innerHTML = ["stock", "commodity", "forex"].map(function (c) {
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

    var posEl = $("#positionsTable");
    if (summary.positions.length === 0) {
      posEl.innerHTML = '<div class="panel muted-mono center-pad">No tienes posiciones abiertas. Coloca una orden desde Mercado u Opciones para empezar.</div>';
      return;
    }
    posEl.innerHTML = '<table class="data-table"><thead><tr>' +
      "<th>Símbolo</th><th>Tipo</th><th class='right'>Cantidad</th><th class='right'>Precio prom.</th>" +
      "<th class='right'>Precio actual</th><th class='right'>Valor de mercado</th><th class='right'>P&amp;L no realizado</th>" +
      "</tr></thead><tbody>" + summary.positions.map(function (p) {
        return "<tr><td class='white'>" + p.symbol + (p.optionType ? ' <span class="muted-mono small">' + (p.optionType === "call" ? "CALL" : "PUT") + " " + p.strike + " · " + p.expiry + "</span>" : "") + "</td>" +
          "<td class='muted-mono'>" + BolsaData.categoryLabel(p.category) + "</td>" +
          "<td class='right tabular white'>" + p.quantity + "</td>" +
          "<td class='right tabular muted-mono'>" + fmtPrice(p.avgPrice, 4) + "</td>" +
          "<td class='right tabular white'>" + fmtPrice(p.currentPrice, 4) + "</td>" +
          "<td class='right tabular white'>" + fmtMoney(p.marketValue) + "</td>" +
          "<td class='right tabular " + pnlClass(p.unrealizedPnl) + "'>" + fmtMoney(p.unrealizedPnl) + ' <span class="small">(' + fmtPct(p.unrealizedPnlPct) + ")</span></td></tr>";
      }).join("") + "</tbody></table>";
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
        '<button id="reportSubmit" class="submit-btn amber full">Descargar informe PDF</button>' +
        '<p id="reportFeedback" class="feedback"></p></div>' : "");

    $("#reportToggle").addEventListener("click", function () { reportPanelOpen = !reportPanelOpen; renderReportPanel(); });

    if (reportPanelOpen) {
      $("#reportSubmit").addEventListener("click", function () {
        var meta = {
          reportTitle: val("reportTitle") || "Informe de Análisis y Entrega de Inversiones",
          university: val("university"), course: val("course"), professor: val("professor"),
          section: val("section"), studentName: val("studentName"), studentId: val("studentId")
        };
        var fb = $("#reportFeedback");
        try {
          InvestmentReport.generate(meta);
          fb.textContent = "Informe descargado correctamente.";
          fb.className = "feedback ok";
        } catch (err) {
          fb.textContent = "No se pudo generar el informe: " + err.message;
          fb.className = "feedback err";
        }
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
    $all(".nav-btn").forEach(function (b) {
      b.addEventListener("click", function () { setView(b.dataset.view); });
    });
    var resetBtn = $("#resetSimBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        if (confirm("¿Reiniciar la simulación? Esto borra tu portafolio, posiciones e historial y vuelve a $100,000 de balance inicial.")) {
          Portfolio.reset();
          renderCurrentView();
        }
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
