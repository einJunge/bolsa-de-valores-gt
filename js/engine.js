/* ============================================================
   BolsaGT — Motor de mercado, pricing de opciones y órdenes
   Todo corre en el navegador. Estado del portafolio en localStorage.
   ============================================================ */

/* ---------- Black-Scholes simplificado ---------- */
var BlackScholes = (function () {
  "use strict";
  var RISK_FREE_RATE = 0.045;

  function erf(x) {
    var sign = x < 0 ? -1 : 1;
    var ax = Math.abs(x);
    var a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    var t = 1 / (1 + p * ax);
    var y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
    return sign * y;
  }

  function normCdf(x) {
    return 0.5 * (1 + erf(x / Math.SQRT2));
  }

  function priceOption(spot, strike, yearsToExpiry, volatility, optionType) {
    var t = Math.max(yearsToExpiry, 1 / 365 / 24);
    var sqrtT = Math.sqrt(t);
    var d1 = (Math.log(spot / strike) + (RISK_FREE_RATE + (volatility * volatility) / 2) * t) / (volatility * sqrtT);
    var d2 = d1 - volatility * sqrtT;
    var price;
    if (optionType === "call") {
      price = spot * normCdf(d1) - strike * Math.exp(-RISK_FREE_RATE * t) * normCdf(d2);
    } else {
      price = strike * Math.exp(-RISK_FREE_RATE * t) * normCdf(-d2) - spot * normCdf(-d1);
    }
    return Math.max(Math.round(price * 100) / 100, 0.01);
  }

  return { priceOption: priceOption };
})();

/* ---------- Motor de mercado ---------- */
var MarketEngine = (function () {
  "use strict";

  var TICK_INTERVAL_MS = 1000;
  var CANDLE_BUCKET_SECONDS = 60;
  var MAX_CANDLES = 300;

  var state = {};   // symbol -> { instrument, price, prevClose, spreadBps }
  var candles = {}; // symbol -> [{time, open, high, low, close}]
  var listeners = [];
  var timer = null;
  var optionChainCache = null; // se regenera al cargar la página (equivalente a "reinicio del servidor")

  BolsaData.ALL.forEach(function (instrument) {
    state[instrument.symbol] = {
      instrument: instrument,
      price: instrument.basePrice,
      prevClose: instrument.basePrice,
      spreadBps: instrument.category === "forex" ? 1.5 : 4
    };
    candles[instrument.symbol] = [];
  });

  function buildOptionChains() {
    var now = new Date();
    var chains = {};
    BolsaData.OPTIONABLE_UNDERLYINGS.forEach(function (underlying) {
      var instrument = BolsaData.find(underlying);
      if (!instrument) return;
      var strikeStep = instrument.basePrice > 500 ? 25 : instrument.basePrice > 150 ? 5 : 2.5;
      var strikeOffsets = [-2, -1, 0, 1, 2];
      var terms = [
        { days: 21, term: "short" },
        { days: 45, term: "short" },
        { days: 210, term: "long" },
        { days: 365, term: "long" }
      ];
      var list = [];
      terms.forEach(function (t) {
        var expiry = new Date(now.getTime() + t.days * 24 * 3600 * 1000).toISOString().slice(0, 10);
        strikeOffsets.forEach(function (offset) {
          var strike = Math.round((instrument.basePrice + offset * strikeStep) / strikeStep) * strikeStep;
          ["call", "put"].forEach(function (optionType) {
            list.push({
              symbol: underlying + "-" + expiry + "-" + optionType[0].toUpperCase() + strike,
              underlying: underlying,
              optionType: optionType,
              strike: strike,
              expiry: expiry,
              term: t.term
            });
          });
        });
      });
      chains[underlying] = list;
    });
    return chains;
  }
  optionChainCache = buildOptionChains();

  function tick() {
    var ts = Date.now();
    var ticks = [];
    Object.keys(state).forEach(function (symbol) {
      var s = state[symbol];
      var instrument = s.instrument;
      var shock = (Math.random() - 0.5) * 2;
      var pctChange = instrument.drift + shock * instrument.volatility;
      var minPrice = instrument.decimals >= 4 ? 0.0001 : 0.01;
      s.price = Math.max(s.price * (1 + pctChange), minPrice);
      s.price = Number(s.price.toFixed(instrument.decimals));

      var spread = s.price * (s.spreadBps / 10000);
      var bid = Number((s.price - spread / 2).toFixed(instrument.decimals));
      var ask = Number((s.price + spread / 2).toFixed(instrument.decimals));
      var changePct = ((s.price - s.prevClose) / s.prevClose) * 100;

      ticks.push({
        symbol: symbol, category: instrument.category, price: s.price, prevClose: s.prevClose,
        changePct: Number(changePct.toFixed(3)), bid: bid, ask: ask, ts: ts
      });

      updateCandle(symbol, s.price, ts);
    });
    listeners.forEach(function (cb) { cb(ticks); });
  }

  function updateCandle(symbol, price, ts) {
    var bucketTime = Math.floor(ts / 1000 / CANDLE_BUCKET_SECONDS) * CANDLE_BUCKET_SECONDS;
    var list = candles[symbol];
    var last = list[list.length - 1];
    if (last && last.time === bucketTime) {
      last.high = Math.max(last.high, price);
      last.low = Math.min(last.low, price);
      last.close = price;
    } else {
      list.push({ time: bucketTime, open: price, high: price, low: price, close: price });
      if (list.length > MAX_CANDLES) list.shift();
    }
  }

  function start() {
    if (timer) return;
    timer = setInterval(tick, TICK_INTERVAL_MS);
  }

  function onTick(cb) { listeners.push(cb); }

  function getSnapshot() {
    var now = Date.now();
    return Object.keys(state).map(function (symbol) {
      var s = state[symbol];
      var spread = s.price * (s.spreadBps / 10000);
      var changePct = ((s.price - s.prevClose) / s.prevClose) * 100;
      return {
        symbol: symbol, category: s.instrument.category, price: s.price, prevClose: s.prevClose,
        changePct: Number(changePct.toFixed(3)),
        bid: Number((s.price - spread / 2).toFixed(s.instrument.decimals)),
        ask: Number((s.price + spread / 2).toFixed(s.instrument.decimals)),
        ts: now
      };
    });
  }

  function getState(symbol) { return state[symbol]; }
  function getCandles(symbol) { return candles[symbol] || []; }

  function getOptionPriceByParams(underlying, strike, expiry, optionType) {
    var s = state[underlying];
    if (!s) return 0;
    var now = new Date();
    var expiryDate = new Date(expiry);
    var yearsToExpiry = Math.max((expiryDate.getTime() - now.getTime()) / (365 * 24 * 3600 * 1000), 0);
    return BlackScholes.priceOption(s.price, strike, yearsToExpiry, BolsaData.assumedVolatility(underlying), optionType);
  }

  function getOptionContract(symbol) {
    var underlying = symbol.split("-")[0];
    var chain = optionChainCache[underlying] || [];
    for (var i = 0; i < chain.length; i++) if (chain[i].symbol === symbol) return chain[i];
    return null;
  }

  function getOptionChain(underlying) {
    return (optionChainCache[underlying] || []).map(function (c) {
      return Object.assign({}, c, { price: getOptionPriceByParams(c.underlying, c.strike, c.expiry, c.optionType) });
    });
  }

  return {
    start: start,
    onTick: onTick,
    getSnapshot: getSnapshot,
    getState: getState,
    getCandles: getCandles,
    getOptionChain: getOptionChain,
    getOptionContract: getOptionContract,
    getOptionPriceByParams: getOptionPriceByParams
  };
})();

/* ---------- Portafolio + motor de órdenes (local o Supabase) ---------- */
var Portfolio = (function () {
  "use strict";

  var STORAGE_KEY = "bolsagt_portfolio_v2";
  var STARTING_BALANCE = 100000;
  var SAVE_DEBOUNCE_MS = 700;

  var db = null;
  var backendMode = "local"; // "local" | "supabase"
  var supabaseUserId = null;
  var saveTimer = null;

  function defaultState() {
    return { cash: STARTING_BALANCE, startingBalance: STARTING_BALANCE, positions: [], orders: [], bets: [] };
  }

  function normalize(parsed) {
    if (!parsed || typeof parsed.cash !== "number") return defaultState();
    if (!Array.isArray(parsed.bets)) parsed.bets = [];
    if (!Array.isArray(parsed.positions)) parsed.positions = [];
    if (!Array.isArray(parsed.orders)) parsed.orders = [];
    return parsed;
  }

  function loadLocal() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? normalize(JSON.parse(raw)) : defaultState();
    } catch (e) {
      return defaultState();
    }
  }

  function saveLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  function loadSupabase(userId) {
    var client = Auth.getClient();
    return client.from("user_portfolios").select("data").eq("user_id", userId).maybeSingle()
      .then(function (res) {
        if (res.error) throw res.error;
        return res.data ? normalize(res.data.data) : defaultState();
      });
  }

  function saveSupabaseNow() {
    if (backendMode !== "supabase" || !supabaseUserId || !db) return;
    var client = Auth.getClient();
    client.from("user_portfolios")
      .upsert({ user_id: supabaseUserId, data: db, updated_at: new Date().toISOString() })
      .then(function (res) {
        if (res.error) console.error("[BolsaGT] error guardando en Supabase:", res.error.message);
      });
  }

  /**
   * Inicializa el portafolio: modo Supabase (userId presente, carga/crea el
   * registro del estudiante) o modo local (userId null, usa localStorage).
   * Debe esperarse (Promise) antes de usar cualquier otro método de Portfolio.
   */
  function init(userId) {
    if (userId) {
      backendMode = "supabase";
      supabaseUserId = userId;
      return loadSupabase(userId).then(function (state) {
        db = state;
        saveSupabaseNow(); // asegura que exista el registro desde el primer login
      });
    }
    backendMode = "local";
    supabaseUserId = null;
    db = loadLocal();
    return Promise.resolve();
  }

  function save() {
    if (!db) return;
    if (backendMode === "local") {
      saveLocal();
      return;
    }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveSupabaseNow, SAVE_DEBOUNCE_MS);
  }

  /** Guardado inmediato sin debounce — se usa antes de cerrar sesión o la pestaña. */
  function flush() {
    clearTimeout(saveTimer);
    if (backendMode === "supabase") saveSupabaseNow();
    else if (backendMode === "local" && db) saveLocal();
  }

  function reset() {
    db = defaultState();
    save();
  }

  function multiplierFor(category) { return category === "option" ? 100 : 1; }

  function currentPriceFor(symbol, category, optionMeta) {
    if (category === "option") {
      var price = MarketEngine.getOptionPriceByParams(
        symbol.split("-")[0], optionMeta.strike, optionMeta.expiry, optionMeta.optionType
      );
      return { price: price, prevClose: price };
    }
    var s = MarketEngine.getState(symbol);
    if (!s) return { price: 0, prevClose: 0 };
    return { price: s.price, prevClose: s.prevClose };
  }

  function resolveExecutionPrice(symbol, side, category, optionMeta) {
    if (category === "option") {
      return MarketEngine.getOptionPriceByParams(
        symbol.split("-")[0], optionMeta.strike, optionMeta.expiry, optionMeta.optionType
      );
    }
    var s = MarketEngine.getState(symbol);
    if (!s) throw new Error("Instrumento no encontrado: " + symbol);
    var spread = s.price * (s.spreadBps / 10000);
    return side === "buy"
      ? Number((s.price + spread / 2).toFixed(s.instrument.decimals))
      : Number((s.price - spread / 2).toFixed(s.instrument.decimals));
  }

  function findPosition(symbol) {
    for (var i = 0; i < db.positions.length; i++) if (db.positions[i].symbol === symbol) return db.positions[i];
    return null;
  }

  function applyFill(params) {
    var multiplier = multiplierFor(params.category);
    var notional = params.price * params.quantity * multiplier;
    var pos = findPosition(params.symbol);

    if (params.side === "buy") {
      if (db.cash < notional) {
        throw new Error("Fondos insuficientes: necesitas $" + notional.toFixed(2) + " y tienes $" + db.cash.toFixed(2));
      }
      db.cash -= notional;
      if (pos) {
        var newQty = pos.quantity + params.quantity;
        pos.avgPrice = (pos.quantity * pos.avgPrice + params.quantity * params.price) / newQty;
        pos.quantity = newQty;
      } else {
        db.positions.push({
          symbol: params.symbol, category: params.category, quantity: params.quantity, avgPrice: params.price,
          optionType: params.optionType || null, strike: params.strike != null ? params.strike : null,
          expiry: params.expiry || null
        });
      }
    } else {
      var heldQty = pos ? pos.quantity : 0;
      if (!pos || heldQty < params.quantity) {
        throw new Error("No tienes suficiente posición en " + params.symbol + " para vender " + params.quantity + " (tienes " + heldQty + ")");
      }
      var remaining = heldQty - params.quantity;
      if (remaining <= 0.000001) {
        db.positions = db.positions.filter(function (p) { return p !== pos; });
      } else {
        pos.quantity = remaining;
      }
      db.cash += notional;
    }
  }

  function placeOrder(input) {
    var instrument = BolsaData.find(input.symbol);
    var optionContract = !instrument ? MarketEngine.getOptionContract(input.symbol) : null;
    var category = instrument ? instrument.category : (optionContract ? "option" : null);
    if (!category) throw new Error("Símbolo desconocido: " + input.symbol);

    var order = {
      id: "o_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8),
      symbol: input.symbol, category: category, side: input.side, kind: input.kind,
      quantity: input.quantity, limitPrice: input.kind === "limit" ? input.limitPrice : null,
      filledPrice: null, status: "pending",
      optionType: input.optionType || (optionContract ? optionContract.optionType : null),
      strike: input.strike != null ? input.strike : (optionContract ? optionContract.strike : null),
      expiry: input.expiry || (optionContract ? optionContract.expiry : null),
      createdAt: new Date().toISOString(), filledAt: null
    };

    if (input.kind === "market") {
      try {
        var price = resolveExecutionPrice(input.symbol, input.side, category, {
          strike: order.strike, expiry: order.expiry, optionType: order.optionType
        });
        applyFill({
          symbol: input.symbol, category: category, side: input.side, quantity: input.quantity, price: price,
          optionType: order.optionType, strike: order.strike, expiry: order.expiry
        });
        order.status = "filled";
        order.filledPrice = price;
        order.filledAt = new Date().toISOString();
      } catch (err) {
        order.status = "rejected";
        db.orders.unshift(order);
        save();
        throw err;
      }
    }

    db.orders.unshift(order);
    save();
    return order;
  }

  function cancelOrder(orderId) {
    var order = db.orders.find(function (o) { return o.id === orderId; });
    if (!order) throw new Error("Orden no encontrada");
    if (order.status !== "pending") throw new Error("Solo se pueden cancelar órdenes pendientes");
    order.status = "cancelled";
    save();
    return order;
  }

  function runLimitMatching() {
    var changed = false;
    db.orders.forEach(function (order) {
      if (order.status !== "pending" || order.kind !== "limit") return;
      var category = order.category;
      var currentAsk, currentBid;
      if (category === "option") {
        var p = MarketEngine.getOptionPriceByParams(order.symbol.split("-")[0], order.strike, order.expiry, order.optionType);
        currentAsk = p; currentBid = p;
      } else {
        var s = MarketEngine.getState(order.symbol);
        if (!s) return;
        var spread = s.price * (s.spreadBps / 10000);
        currentAsk = s.price + spread / 2;
        currentBid = s.price - spread / 2;
      }
      var shouldFill = (order.side === "buy" && currentAsk <= order.limitPrice) ||
        (order.side === "sell" && currentBid >= order.limitPrice);
      if (!shouldFill) return;

      var fillPrice = order.side === "buy" ? currentAsk : currentBid;
      try {
        applyFill({
          symbol: order.symbol, category: category, side: order.side, quantity: order.quantity, price: fillPrice,
          optionType: order.optionType, strike: order.strike, expiry: order.expiry
        });
        order.status = "filled";
        order.filledPrice = fillPrice;
        order.filledAt = new Date().toISOString();
      } catch (err) {
        order.status = "rejected";
      }
      changed = true;
    });
    if (changed) save();
    return changed;
  }

  function getSummary() {
    var equityValue = 0, dayPnl = 0;
    var positions = db.positions.map(function (p) {
      var multiplier = multiplierFor(p.category);
      var priced = currentPriceFor(p.symbol, p.category, { strike: p.strike, expiry: p.expiry, optionType: p.optionType });
      var marketValue = priced.price * p.quantity * multiplier;
      var costBasis = p.avgPrice * p.quantity * multiplier;
      var unrealizedPnl = marketValue - costBasis;
      var unrealizedPnlPct = costBasis !== 0 ? (unrealizedPnl / costBasis) * 100 : 0;
      equityValue += marketValue;
      if (p.category !== "option") dayPnl += (priced.price - priced.prevClose) * p.quantity * multiplier;
      return {
        symbol: p.symbol, category: p.category, quantity: p.quantity, avgPrice: p.avgPrice,
        currentPrice: priced.price, marketValue: Number(marketValue.toFixed(2)),
        unrealizedPnl: Number(unrealizedPnl.toFixed(2)), unrealizedPnlPct: Number(unrealizedPnlPct.toFixed(2)),
        optionType: p.optionType, strike: p.strike, expiry: p.expiry
      };
    });
    var totalValue = db.cash + equityValue;
    var totalPnl = totalValue - db.startingBalance;
    var totalPnlPct = db.startingBalance !== 0 ? (totalPnl / db.startingBalance) * 100 : 0;
    var openBetStake = db.bets.filter(function (b) { return b.status === "open"; })
      .reduce(function (sum, b) { return sum + b.investment; }, 0);
    return {
      cash: Number(db.cash.toFixed(2)), equityValue: Number(equityValue.toFixed(2)),
      totalValue: Number(totalValue.toFixed(2)), startingBalance: db.startingBalance,
      totalPnl: Number(totalPnl.toFixed(2)), totalPnlPct: Number(totalPnlPct.toFixed(2)),
      dayPnl: Number(dayPnl.toFixed(2)), positions: positions,
      openBetStake: Number(openBetStake.toFixed(2))
    };
  }

  function getOrders(filter) {
    var list = db.orders;
    if (filter && filter.status) list = list.filter(function (o) { return o.status === filter.status; });
    if (filter && filter.symbol) list = list.filter(function (o) { return o.symbol === filter.symbol; });
    return list;
  }

  function getOpenOrders() {
    return db.orders.filter(function (o) { return o.status === "pending"; });
  }

  /* ---------- Apuestas Blitz (sube/baja cronometradas) ---------- */

  function findBet(id) {
    for (var i = 0; i < db.bets.length; i++) if (db.bets[i].id === id) return db.bets[i];
    return null;
  }

  function placeBet(input) {
    var state = MarketEngine.getState(input.symbol);
    if (!state) throw new Error("Instrumento no encontrado: " + input.symbol);
    if (input.investment <= 0) throw new Error("El monto a invertir debe ser mayor a 0");
    if (db.cash < input.investment) {
      throw new Error("Fondos insuficientes: necesitas $" + input.investment.toFixed(2) + " y tienes $" + db.cash.toFixed(2));
    }
    var now = Date.now();
    var bet = {
      id: "b_" + now.toString(36) + "_" + Math.random().toString(36).slice(2, 8),
      symbol: input.symbol,
      direction: input.direction, // "up" | "down"
      investment: input.investment,
      durationSeconds: input.durationSeconds,
      payoutPct: input.payoutPct,
      openPrice: state.price,
      openTime: new Date(now).toISOString(),
      expiryTime: new Date(now + input.durationSeconds * 1000).toISOString(),
      status: "open",
      closePrice: null,
      profit: null,
      settledAt: null
    };
    db.cash -= input.investment;
    db.bets.unshift(bet);
    save();
    return bet;
  }

  function closeBetEarly(betId) {
    var bet = findBet(betId);
    if (!bet || bet.status !== "open") throw new Error("La apuesta ya no está abierta");
    var state = MarketEngine.getState(bet.symbol);
    if (!state) throw new Error("Instrumento no encontrado: " + bet.symbol);

    var elapsedMs = Date.now() - new Date(bet.openTime).getTime();
    var totalMs = new Date(bet.expiryTime).getTime() - new Date(bet.openTime).getTime();
    var timeFrac = Math.min(Math.max(elapsedMs / totalMs, 0), 1);
    var priceMovePct = (state.price - bet.openPrice) / bet.openPrice;
    var directionSign = bet.direction === "up" ? 1 : -1;
    var favorability = Math.min(Math.max(priceMovePct * directionSign * 40, -1), 1);
    var raw = bet.investment * (1 + bet.payoutPct * favorability * timeFrac);
    var cashOutValue = Math.min(Math.max(raw, bet.investment * 0.05), bet.investment * (1 + bet.payoutPct));
    cashOutValue = Math.round(cashOutValue * 100) / 100;

    db.cash += cashOutValue;
    bet.status = "closed_early";
    bet.closePrice = state.price;
    bet.profit = Number((cashOutValue - bet.investment).toFixed(2));
    bet.settledAt = new Date().toISOString();
    save();
    return bet;
  }

  function settleExpiredBets() {
    var now = Date.now();
    var changed = false;
    db.bets.forEach(function (bet) {
      if (bet.status !== "open") return;
      if (now < new Date(bet.expiryTime).getTime()) return;
      var state = MarketEngine.getState(bet.symbol);
      var closePrice = state ? state.price : bet.openPrice;
      var outcome = closePrice > bet.openPrice ? "up" : closePrice < bet.openPrice ? "down" : "tie";

      if (outcome === "tie") {
        db.cash += bet.investment;
        bet.status = "tied";
        bet.profit = 0;
      } else if (outcome === bet.direction) {
        var payout = bet.investment * (1 + bet.payoutPct);
        db.cash += payout;
        bet.status = "won";
        bet.profit = Number((bet.investment * bet.payoutPct).toFixed(2));
      } else {
        bet.status = "lost";
        bet.profit = Number((-bet.investment).toFixed(2));
      }
      bet.closePrice = closePrice;
      bet.settledAt = new Date().toISOString();
      changed = true;
    });
    if (changed) save();
    return changed;
  }

  function getOpenBets() {
    return db.bets.filter(function (b) { return b.status === "open"; });
  }

  function getBetHistory(filter) {
    var list = db.bets;
    if (filter && filter.status) list = list.filter(function (b) { return b.status === filter.status; });
    return list;
  }

  function getBetStats() {
    var settled = db.bets.filter(function (b) { return b.status !== "open"; });
    var won = settled.filter(function (b) { return b.status === "won"; }).length;
    var lost = settled.filter(function (b) { return b.status === "lost"; }).length;
    var netPnl = settled.reduce(function (sum, b) { return sum + (b.profit || 0); }, 0);
    return {
      total: settled.length, won: won, lost: lost,
      tied: settled.filter(function (b) { return b.status === "tied"; }).length,
      closedEarly: settled.filter(function (b) { return b.status === "closed_early"; }).length,
      winRate: settled.length > 0 ? (won / (won + lost || 1)) * 100 : 0,
      netPnl: Number(netPnl.toFixed(2)),
      openStake: getOpenBets().reduce(function (sum, b) { return sum + b.investment; }, 0)
    };
  }

  return {
    init: init, flush: flush, isReady: function () { return !!db; },
    placeOrder: placeOrder, cancelOrder: cancelOrder, runLimitMatching: runLimitMatching,
    getSummary: getSummary, getOrders: getOrders, getOpenOrders: getOpenOrders, reset: reset,
    placeBet: placeBet, closeBetEarly: closeBetEarly, settleExpiredBets: settleExpiredBets,
    getOpenBets: getOpenBets, getBetHistory: getBetHistory, getBetStats: getBetStats
  };
})();

/* Duraciones disponibles para las apuestas Blitz (sube/baja cronometradas).
   El payout crece un poco con la duración — es una simulación, no refleja
   pricing real de ningún bróker. */
var BLITZ_DURATIONS = [
  { seconds: 15, label: "15s", payoutPct: 0.75 },
  { seconds: 30, label: "30s", payoutPct: 0.80 },
  { seconds: 60, label: "1m", payoutPct: 0.85 },
  { seconds: 120, label: "2m", payoutPct: 0.87 },
  { seconds: 300, label: "5m", payoutPct: 0.90 }
];
