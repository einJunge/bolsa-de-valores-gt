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

  var ETFS = [
    { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", category: "etf", basePrice: 776.34, volatility: 0.0008, drift: 0.00002, exchange: "NYSE Arca", decimals: 2 },
    { symbol: "QQQ", name: "Invesco QQQ Trust", category: "etf", basePrice: 731.94, volatility: 0.0011, drift: 0.00002, exchange: "NASDAQ", decimals: 2 }
  ];

  /* Plan base de la simulación académica: US$50,000, sin apalancamiento. */
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

  var ALL = STOCKS.concat(ETFS, COMMODITIES, FOREX);
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
      case "etf": return "ETF";
      case "commodity": return "Commodity";
      case "forex": return "Forex";
      case "option": return "Opción";
      default: return cat;
    }
  }

  function assumedVolatility(underlying) {
    return IMPLIED_VOL[underlying] || 0.35;
  }

  return {
    STOCKS: STOCKS,
    ETFS: ETFS,
    INVESTMENT_PLAN: INVESTMENT_PLAN,
    COMMODITIES: COMMODITIES,
    FOREX: FOREX,
    ALL: ALL,
    OPTIONABLE_UNDERLYINGS: OPTIONABLE_UNDERLYINGS,
    find: find,
    byCategory: byCategory,
    categoryLabel: categoryLabel,
    assumedVolatility: assumedVolatility
  };
})();
