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

  var ALL = STOCKS.concat(COMMODITIES, FOREX);
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
      case "option": return "Opción";
      default: return cat;
    }
  }

  function assumedVolatility(underlying) {
    return IMPLIED_VOL[underlying] || 0.35;
  }

  return {
    STOCKS: STOCKS,
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
