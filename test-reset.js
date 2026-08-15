import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const store = new Map();
const localStorage = {
  getItem(key) { return store.has(key) ? store.get(key) : null; },
  setItem(key, value) { store.set(key, String(value)); },
  removeItem(key) { store.delete(key); },
};

const context = vm.createContext({
  console,
  localStorage,
  window: {},
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  Date,
  Math,
  JSON,
});

["js/data.js", "js/engine.js", "js/analytics.js"].forEach((file) => {
  vm.runInContext(readFileSync(new URL(file, import.meta.url), "utf8"), context, { filename: file });
});

const { Portfolio, PortfolioAnalytics, BolsaData } = context;

localStorage.setItem("bolsagt_portfolio_v2", JSON.stringify({
  cash: 125,
  startingBalance: 50000,
  positions: [],
  orders: [{ id: "old-order", status: "filled" }],
  bets: [{ id: "old-bet", status: "won" }],
}));

await Portfolio.init();
PortfolioAnalytics.addDecision({ symbol: "QQQ", action: "Comprar", amount: 2500, reason: "Prueba" });
assert.equal(PortfolioAnalytics.getDecisions().length, 1, "La bitácora debe contener el dato de prueba antes del reinicio.");

await Portfolio.reset();
PortfolioAnalytics.reset();

const summary = Portfolio.getSummary();
const stored = JSON.parse(localStorage.getItem("bolsagt_portfolio_v2"));

assert.equal(summary.startingBalance, 50000, "El capital inicial debe volver a US$50,000.");
assert.equal(summary.cash, 50000, "El reinicio debe dejar US$50,000 en efectivo.");
assert.equal(summary.positions.length, 0, "El reinicio no debe restaurar posiciones automáticamente.");
assert.equal(Portfolio.getOrders().length, 0, "El historial de órdenes debe eliminarse.");
assert.equal(Portfolio.getBetHistory().length, 0, "El historial Blitz debe eliminarse.");
assert.equal(stored.orders.length, 0, "La versión persistida no debe conservar órdenes previas.");
assert.equal(stored.bets.length, 0, "La versión persistida no debe conservar apuestas previas.");
assert.equal(localStorage.getItem("bolsagt_decisions_v1"), null, "La bitácora persistida debe eliminarse.");

await Portfolio.loadRecommendedPlan();
const planned = Portfolio.getSummary();
assert.equal(planned.cash, 0, "La cartera recomendada debe invertir el efectivo al cargarse manualmente.");
assert.equal(planned.positions.length, BolsaData.INVESTMENT_PLAN.length, "La cartera recomendada debe cargarse solo mediante la acción manual.");

console.log("✓ Reinicio de BolsaGT validado: cuenta vacía; cartera recomendada disponible solo bajo acción manual.");
