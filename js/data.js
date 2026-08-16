/* ============================================================
   BolsaGT — Datos de instrumentos (acciones, commodities, forex)
   Sin dependencias, sin build. Se carga como <script> global.
   ============================================================ */

var BolsaData = (function () {
  "use strict";

  var STOCKS = [
    { symbol: "AAPL", name: "Apple Inc.", category: "stock", basePrice: 227.5, volatility: 0.0009, drift: 0.00002, exchange: "NASDAQ", decimals: 2 },
    { symbol: "MSFT", name: "Microsoft Corp.", category: "stock", basePrice: 441.2, volatility: 0.0008, drift: 0.00002, exchange: "NASDAQ", decimals: 2 },
    { symbol: "GOOGL", name: "Alphabet Inc.", category: "stock", basePrice: 178.3, volatility: 0.0011, drift: 0.00001, exchange: "NASDAQ", decimals: 2 },
    { symbol: "AMZN", name: "Amazon.com Inc.", category: "stock", basePrice: 205.9, volatility: 0.0012, drift: 0.00002, exchange: "NASDAQ", decimals: 2 },
    { symbol: "TSLA", name: "Tesla Inc.", category: "stock", basePrice: 258.4, volatility: 0.0025, drift: -0.00001, exchange: "NASDAQ", decimals: 2 },
    { symbol: "NVDA", name: "NVIDIA Corp.", category: "stock", basePrice: 138.7, volatility: 0.0022, drift: 0.00003, exchange: "NASDAQ", decimals: 2 },
    { symbol: "META", name: "Meta Platforms Inc.", category: "stock", basePrice: 612.1, volatility: 0.0013, drift: 0.00001, exchange: "NASDAQ", decimals: 2 },
    { symbol: "NFLX", name: "Netflix Inc.", category: "stock", basePrice: 985.0, volatility: 0.0014, drift: 0.00001, exchange: "NASDAQ", decimals: 2 },
    { symbol: "JPM", name: "JPMorgan Chase & Co.", category: "stock", basePrice: 236.6, volatility: 0.0007, drift: 0.00001, exchange: "NYSE", decimals: 2 },
    { symbol: "V", name: "Visa Inc.", category: "stock", basePrice: 318.4, volatility: 0.0006, drift: 0.00001, exchange: "NYSE", decimals: 2 }
  ];

  var COMMODITIES = [
    { symbol: "XAUUSD", name: "Oro Spot", category: "commodity", basePrice: 2415.3, volatility: 0.0006, drift: 0.00001, exchange: "COMEX", decimals: 2 },
    { symbol: "XAGUSD", name: "Plata Spot", category: "commodity", basePrice: 28.65, volatility: 0.0012, drift: 0.00001, exchange: "COMEX", decimals: 3 },
    { symbol: "WTI", name: "Petróleo WTI", category: "commodity", basePrice: 78.4, volatility: 0.0018, drift: -0.00001, exchange: "NYMEX", decimals: 2 },
    { symbol: "BRENT", name: "Petróleo Brent", category: "commodity", basePrice: 82.1, volatility: 0.0017, drift: -0.00001, exchange: "ICE", decimals: 2 },
    { symbol: "NATGAS", name: "Gas Natural", category: "commodity", basePrice: 2.87, volatility: 0.0035, drift: 0.00002, exchange: "NYMEX", decimals: 3 },
    { symbol: "COPPER", name: "Cobre", category: "commodity", basePrice: 4.52, volatility: 0.0014, drift: 0.00001, exchange: "COMEX", decimals: 3 }
  ];

  var FOREX = [
    { symbol: "EURUSD", name: "Euro / Dólar", category: "forex", basePrice: 1.0842, volatility: 0.0003, drift: 0, exchange: "FX", decimals: 5 },
    { symbol: "GBPUSD", name: "Libra / Dólar", category: "forex", basePrice: 1.2715, volatility: 0.00035, drift: 0, exchange: "FX", decimals: 5 },
    { symbol: "USDJPY", name: "Dólar / Yen", category: "forex", basePrice: 154.32, volatility: 0.0003, drift: 0.00001, exchange: "FX", decimals: 3 },
    { symbol: "USDMXN", name: "Dólar / Peso Mexicano", category: "forex", basePrice: 18.42, volatility: 0.0006, drift: 0.00001, exchange: "FX", decimals: 4 },
    { symbol: "USDGTQ", name: "Dólar / Quetzal", category: "forex", basePrice: 7.72, volatility: 0.00015, drift: 0, exchange: "FX", decimals: 4 },
    { symbol: "AUDUSD", name: "Dólar Australiano / Dólar", category: "forex", basePrice: 0.6524, volatility: 0.00032, drift: 0, exchange: "FX", decimals: 5 }
  ];

  /* Índices bursátiles: no se "compran" acciones individuales de un índice en
     la vida real, pero sí se opera su valor (futuros, CFDs) — aquí se simulan
     como instrumento propio para que el estudiante pueda distribuir capital
     directamente sobre el desempeño agregado del mercado. */
  var INDICES = [
    { symbol: "SPX500", name: "S&P 500 (índice)", category: "index", basePrice: 5815.0, volatility: 0.00045, drift: 0.00001, exchange: "INDEX", decimals: 2, description: "Promedio ponderado de las 500 empresas más grandes de EE.UU. Referencia estándar del mercado accionario estadounidense en su conjunto." },
    { symbol: "US30", name: "Dow Jones Industrial Average (índice)", category: "index", basePrice: 42150.0, volatility: 0.0004, drift: 0.00001, exchange: "INDEX", decimals: 0, description: "Agrupa 30 empresas industriales/blue-chip de EE.UU. Menos diversificado que el S&P 500 por tener menos componentes." },
    { symbol: "NAS100", name: "Nasdaq 100 (índice)", category: "index", basePrice: 20450.0, volatility: 0.0007, drift: 0.00002, exchange: "INDEX", decimals: 0, description: "Las 100 mayores empresas no financieras del Nasdaq, con fuerte peso tecnológico. Más volátil que el S&P 500 por esa concentración sectorial." }
  ];

  /* Fondos cotizados (ETF): a diferencia de una acción individual, cada ETF
     ya reparte el capital entre muchas empresas — es la vía más directa para
     que el estudiante practique diversificación con una sola posición. */
  var ETFS = [
    { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", category: "etf", basePrice: 578.4, volatility: 0.00042, drift: 0.00001, exchange: "NYSEARCA", decimals: 2, description: "Replica el S&P 500. El ETF más líquido del mundo; forma estándar de invertir en 'el mercado' de EE.UU. sin elegir empresas individuales." },
    { symbol: "QQQ", name: "Invesco QQQ Trust (Nasdaq-100)", category: "etf", basePrice: 502.6, volatility: 0.0007, drift: 0.00002, exchange: "NASDAQ", decimals: 2, description: "Replica el Nasdaq 100. Diversifica dentro de tecnología/crecimiento, pero mantiene más riesgo sectorial que un ETF de mercado total." },
    { symbol: "DIA", name: "SPDR Dow Jones Industrial Average ETF", category: "etf", basePrice: 421.7, volatility: 0.00038, drift: 0.00001, exchange: "NYSEARCA", decimals: 2, description: "Replica el Dow Jones. Sesgo hacia empresas industriales y de consumo maduras, con menor peso tecnológico que el S&P 500 o el Nasdaq." },
    { symbol: "VTI", name: "Vanguard Total Stock Market ETF", category: "etf", basePrice: 289.3, volatility: 0.00041, drift: 0.00001, exchange: "NYSEARCA", decimals: 2, description: "Incluye prácticamente todo el mercado accionario de EE.UU. (grandes, medianas y pequeñas empresas). Diversificación amplia con costo bajo." },
    { symbol: "VWO", name: "Vanguard FTSE Emerging Markets ETF", category: "etf", basePrice: 46.8, volatility: 0.0009, drift: 0.00001, exchange: "NYSEARCA", decimals: 2, description: "Empresas de mercados emergentes (China, India, Brasil, entre otros). Mayor riesgo/volatilidad que EE.UU., pero diversifica fuera del dólar y de una sola economía." },
    { symbol: "GLD", name: "SPDR Gold Shares ETF", category: "etf", basePrice: 244.9, volatility: 0.00055, drift: 0.00001, exchange: "NYSEARCA", decimals: 2, description: "Respaldado por oro físico. Suele usarse como cobertura frente a inflación o inestabilidad, con baja correlación histórica con las acciones." }
  ];

  /* Cartera académica recomendada: se carga únicamente cuando el estudiante la solicita. */
  var INVESTMENT_PLAN = [
    {
      symbol: "SPY", allocation: 20000, weight: 40, expectedReturn: 8, risk: "Medio",
      rationale: "ETF núcleo que replica el S&P 500 y distribuye la exposición entre aproximadamente 500 empresas y once sectores.",
      historical: "SPY reportó 15.84% anualizado a 10 años y 10.60% anualizado desde su inicio, a julio de 2026; el rendimiento pasado no garantiza el futuro.",
      factors: "Tasas de interés, inflación, crecimiento de utilidades y concentración de las empresas de mayor capitalización."
    },
    {
      symbol: "QQQ", allocation: 12500, weight: 25, expectedReturn: 10, risk: "Medio-alto",
      rationale: "ETF de crecimiento enfocado en las 100 mayores compañías no financieras del Nasdaq; aporta exposición a tecnología, innovación e inteligencia artificial.",
      historical: "Invesco señala que QQQ ha superado históricamente al S&P 500 en la última década, pero con mayor volatilidad y concentración tecnológica.",
      factors: "Valuaciones elevadas, tasas de interés, gasto en inteligencia artificial y concentración sectorial en tecnología."
    },
    {
      symbol: "MSFT", allocation: 7500, weight: 15, expectedReturn: 9, risk: "Medio-alto",
      rationale: "Acción de gran capitalización con exposición a software, nube y servicios digitales; complementa los ETF con una posición individual de crecimiento.",
      historical: "Se analizará mediante la serie de precios de la simulación; su historial real está sujeto a ciclos de resultados y valuación.",
      factors: "Resultados trimestrales, crecimiento de la nube, inversión en IA, competencia tecnológica y regulación."
    },
    {
      symbol: "JPM", allocation: 5000, weight: 10, expectedReturn: 7, risk: "Medio",
      rationale: "Banco diversificado que incorpora el sector financiero y reduce la concentración exclusiva en tecnología.",
      historical: "Se analizará mediante la serie de precios de la simulación; el comportamiento histórico de bancos suele estar ligado al ciclo crediticio y las tasas.",
      factors: "Curva de tasas, calidad crediticia, regulación bancaria, actividad económica y provisiones por pérdidas."
    },
    {
      symbol: "XAUUSD", allocation: 5000, weight: 10, expectedReturn: 5, risk: "Medio",
      rationale: "Oro spot como activo diversificador y posible cobertura parcial ante inflación, incertidumbre geopolítica o estrés financiero.",
      historical: "Se analizará mediante la serie de precios de la simulación; el oro no genera flujo operativo y su precio depende del entorno macrofinanciero.",
      factors: "Tasas reales, fortaleza del dólar, inflación, compras de bancos centrales y tensiones geopolíticas."
    }
  ];

  var ALL = STOCKS.concat(COMMODITIES, FOREX, INDICES, ETFS);
  var OPTIONABLE_UNDERLYINGS = ["AAPL", "MSFT", "TSLA", "NVDA", "AMZN"];

  var IMPLIED_VOL = { AAPL: 0.28, MSFT: 0.26, TSLA: 0.55, NVDA: 0.5, AMZN: 0.33 };

  function find(symbol) {
    for (var i = 0; i < ALL.length; i++) if (ALL[i].symbol === symbol) return ALL[i];
    return null;
  }

  function byCategory(cat) {
    return ALL.filter(function (i) { return i.category === cat; });
  }

  function categoryLabel(cat) {
    switch (cat) {
      case "stock": return "Acción";
      case "commodity": return "Commodity";
      case "forex": return "Forex";
      case "index": return "Índice bursátil";
      case "etf": return "ETF";
      case "option": return "Opción";
      default: return cat;
    }
  }

  function assumedVolatility(underlying) {
    return IMPLIED_VOL[underlying] || 0.35;
  }

  /* Clasificación de riesgo relativo, en base a la volatilidad del
     instrumento (misma variable que ya alimenta el random walk de precios).
     Es una simplificación pedagógica, no un rating financiero formal:
     Bajo = movimientos diarios típicos suaves (forex de reservas, ETFs
     amplios, índices); Medio = acciones "blue chip" y commodities estables;
     Alto = alta volatilidad histórica/esperada (tech de alto crecimiento,
     energía, forex/commodities más erráticos). */
  function riskLevel(instrument) {
    if (!instrument) return "medium";
    var v = instrument.volatility;
    if (v < 0.0006) return "low";
    if (v < 0.0015) return "medium";
    return "high";
  }

  function riskLabel(level) {
    switch (level) {
      case "low": return "Bajo";
      case "high": return "Alto";
      default: return "Medio";
    }
  }

  /* Rentabilidad esperada: lectura cualitativa del "drift" con el que cada
     instrumento fue calibrado en el motor de simulación (la tendencia de
     fondo del random walk). No es una predicción financiera real — es una
     guía pedagógica para que el estudiante compare instrumentos entre sí,
     igual que compararía la tendencia/momentum de un activo real antes de
     invertir. */
  function expectedReturnLevel(instrument) {
    if (!instrument) return "neutral";
    var d = instrument.drift;
    if (d >= 0.000025) return "high";
    if (d > 0.000005) return "moderate";
    if (d > -0.000005) return "neutral";
    return "negative";
  }

  function expectedReturnLabel(level) {
    switch (level) {
      case "high": return "Crecimiento esperado alto";
      case "moderate": return "Crecimiento esperado moderado";
      case "negative": return "Tendencia bajista esperada";
      default: return "Neutral / estable";
    }
  }

  return {
    STOCKS: STOCKS,
    COMMODITIES: COMMODITIES,
    FOREX: FOREX,
    INDICES: INDICES,
    ETFS: ETFS,
    INVESTMENT_PLAN: INVESTMENT_PLAN,
    ALL: ALL,
    OPTIONABLE_UNDERLYINGS: OPTIONABLE_UNDERLYINGS,
    find: find,
    byCategory: byCategory,
    categoryLabel: categoryLabel,
    assumedVolatility: assumedVolatility,
    riskLevel: riskLevel,
    riskLabel: riskLabel,
    expectedReturnLevel: expectedReturnLevel,
    expectedReturnLabel: expectedReturnLabel
  };
})();
