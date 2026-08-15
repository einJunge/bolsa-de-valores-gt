/*
   BolsaGT — Analítica de portafolio, escenarios y bitácora de decisiones
   Todo funciona en el navegador y usa los datos de la simulación.
   ============================================================ */

var PortfolioAnalytics = (function () {
  "use strict";

  var DECISIONS_KEY = "bolsagt_decisions_v1";
  var selectedScenario = "baseline";
  var SCENARIOS = {
    baseline: {
      label: "Escenario base",
      description: "Sin cambio adicional en los precios actuales.",
      shocks: {}
    },
    tech_correction: {
      label: "Corrección tecnológica",
      description: "Caída de valuaciones tecnológicas y de empresas vinculadas con IA.",
      shocks: { SPY: -0.10, QQQ: -0.18, MSFT: -0.20, JPM: -0.04, XAUUSD: 0.05 }
    },
    inflation_stress: {
      label: "Inflación persistente",
      description: "Presión sobre acciones de crecimiento y fortalecimiento del oro.",
      shocks: { SPY: -0.06, QQQ: -0.12, MSFT: -0.10, JPM: -0.03, XAUUSD: 0.12 }
    },
    recession: {
      label: "Recesión",
      description: "Contracción de utilidades, crédito y consumo, con demanda defensiva de oro.",
      shocks: { SPY: -0.15, QQQ: -0.20, MSFT: -0.18, JPM: -0.25, XAUUSD: 0.08 }
    },
    rates_up: {
      label: "Tasas al alza",
      description: "Aumento de tasas reales que presiona valuaciones y oro, pero puede favorecer márgenes financieros.",
      shocks: { SPY: -0.08, QQQ: -0.16, MSFT: -0.14, JPM: 0.05, XAUUSD: -0.05 }
    }
  };

  function readDecisions() {
    try {
      var raw = localStorage.getItem(DECISIONS_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveDecisions(items) {
    localStorage.setItem(DECISIONS_KEY, JSON.stringify(items));
  }

  function planRows(summary) {
    var total = Math.max(summary.totalValue, 1);
    var bySymbol = {};
    summary.positions.forEach(function (p) { bySymbol[p.symbol] = p; });
    return BolsaData.INVESTMENT_PLAN.map(function (plan) {
      var p = bySymbol[plan.symbol];
      var actualValue = p ? p.marketValue : 0;
      var actualWeight = (actualValue / total) * 100;
      return {
        symbol: plan.symbol,
        targetValue: plan.allocation,
        targetWeight: plan.weight,
        actualValue: actualValue,
        actualWeight: actualWeight,
        deviation: actualWeight - plan.weight,
        currentPrice: p ? p.currentPrice : (BolsaData.find(plan.symbol) || {}).basePrice,
        pnl: p ? p.unrealizedPnl : 0,
        pnlPct: p ? p.unrealizedPnlPct : 0
      };
    });
  }

  function getMetrics(summary) {
    var rows = planRows(summary);
    var largest = rows.reduce(function (best, row) { return row.actualWeight > best.actualWeight ? row : best; }, { symbol: "—", actualWeight: 0 });
    var techExposure = rows.filter(function (row) { return row.symbol === "QQQ" || row.symbol === "MSFT"; })
      .reduce(function (sum, row) { return sum + row.actualWeight; }, 0);
    var totalAbsDeviation = rows.reduce(function (sum, row) { return sum + Math.abs(row.deviation); }, 0);
    var score = 0;
    if (largest.actualWeight > 45) score += 2;
    else if (largest.actualWeight > 30) score += 1;
    if (techExposure > 45) score += 2;
    else if (techExposure > 30) score += 1;
    if (summary.totalPnlPct < -10) score += 2;
    else if (summary.totalPnlPct < 0) score += 1;
    var riskLevel = score >= 4 ? "Alto" : score >= 2 ? "Medio-alto" : "Medio";
    return {
      rows: rows,
      investedPct: summary.totalValue > 0 ? (summary.equityValue / summary.totalValue) * 100 : 0,
      cashPct: summary.totalValue > 0 ? (summary.cash / summary.totalValue) * 100 : 0,
      largestSymbol: largest.symbol,
      largestWeight: largest.actualWeight,
      techExposure: techExposure,
      totalAbsDeviation: totalAbsDeviation,
      riskLevel: riskLevel,
      scenarioWorstPct: scenarioResults(summary).reduce(function (min, item) { return Math.min(min, item.changePct); }, 0)
    };
  }

  function scenarioResults(summary) {
    var rows = planRows(summary);
    return Object.keys(SCENARIOS).map(function (key) {
      var scenario = SCENARIOS[key];
      var change = rows.reduce(function (sum, row) {
        var shock = scenario.shocks[row.symbol] || 0;
        return sum + row.actualValue * shock;
      }, 0);
      var total = summary.totalValue + change;
      return {
        key: key,
        label: scenario.label,
        description: scenario.description,
        change: Number(change.toFixed(2)),
        value: Number(total.toFixed(2)),
        changePct: summary.totalValue > 0 ? Number(((change / summary.totalValue) * 100).toFixed(2)) : 0
      };
    });
  }

  function addDecision(record) {
    var items = readDecisions();
    items.unshift({
      id: "d_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7),
      date: new Date().toISOString(),
      symbol: record.symbol,
      action: record.action,
      amount: Number(record.amount || 0),
      expected: record.expected || "",
      reason: record.reason || "",
      scenario: record.scenario || "baseline"
    });
    saveDecisions(items.slice(0, 100));
    return items[0];
  }

  function removeDecision(id) {
    saveDecisions(readDecisions().filter(function (item) { return item.id !== id; }));
  }

  function exportDecisionsCSV() {
    var rows = readDecisions();
    var header = ["Fecha", "Símbolo", "Acción", "Monto", "Expectativa", "Motivo", "Escenario"];
    var lines = [header].concat(rows.map(function (item) {
      return [new Date(item.date).toLocaleString("es-GT"), item.symbol, item.action, item.amount.toFixed(2), item.expected, item.reason, item.scenario];
    })).map(function (row) {
      return row.map(function (value) { return '"' + String(value == null ? "" : value).replace(/"/g, '""') + '"'; }).join(",");
    });
    var blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "bitacora-decisiones-bolsagt.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function reset() {
    selectedScenario = "baseline";
    localStorage.removeItem(DECISIONS_KEY);
  }

  return {
    SCENARIOS: SCENARIOS,
    planRows: planRows,
    getMetrics: getMetrics,
    scenarioResults: scenarioResults,
    getSelectedScenario: function () { return selectedScenario; },
    setSelectedScenario: function (key) { selectedScenario = SCENARIOS[key] ? key : "baseline"; },
    getDecisions: readDecisions,
    addDecision: addDecision,
    removeDecision: removeDecision,
    exportDecisionsCSV: exportDecisionsCSV,
    reset: reset
  };
})();
