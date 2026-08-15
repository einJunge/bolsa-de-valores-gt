import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const writes = [];
const oldRemoteState = {
  cash: 900,
  startingBalance: 50000,
  positions: [],
  orders: [{ id: "remote-order", status: "filled" }],
  bets: [{ id: "remote-bet", status: "won" }],
};
const client = {
  from(table) {
    assert.equal(table, "user_portfolios", "El reinicio debe usar la tabla existente.");
    return {
      select() { return { eq() { return { maybeSingle() { return Promise.resolve({ data: { data: oldRemoteState }, error: null }); } }; } }; },
      upsert(payload) { writes.push(JSON.parse(JSON.stringify(payload))); return Promise.resolve({ error: null }); },
    };
  },
};
const localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
const context = vm.createContext({ console, localStorage, Promise, Date, Math, setTimeout, clearTimeout, Auth: { getClient() { return client; } } });

["js/data.js", "js/engine.js"].forEach((file) => {
  vm.runInContext(readFileSync(new URL(file, import.meta.url), "utf8"), context, { filename: file });
});

await context.Portfolio.init("user-42");
await context.Portfolio.reset();

const saved = writes.at(-1);
assert.equal(saved.user_id, "user-42", "El reinicio debe conservar el usuario activo.");
assert.equal(saved.data.startingBalance, 50000, "El reinicio remoto debe restaurar US$50,000.");
assert.equal(saved.data.cash, 50000, "El reinicio remoto debe dejar el capital en efectivo.");
assert.equal(saved.data.orders.length, 0, "El reinicio remoto debe eliminar órdenes previas.");
assert.equal(saved.data.bets.length, 0, "El reinicio remoto debe eliminar apuestas previas.");
assert.equal(saved.data.positions.length, 0, "El reinicio remoto no debe restaurar posiciones automáticamente.");

await context.Portfolio.loadRecommendedPlan();
const planned = writes.at(-1);
assert.equal(planned.data.cash, 0, "La carga manual debe invertir el efectivo de la cuenta.");
assert.equal(planned.data.positions.length, context.BolsaData.INVESTMENT_PLAN.length, "La carga manual debe aplicar la cartera recomendada.");

console.log("✓ Reinicio Supabase validado: user_portfolios queda vacío y la cartera se aplica solo manualmente.");
