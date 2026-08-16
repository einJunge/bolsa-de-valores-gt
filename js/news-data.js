/* ============================================================
   news-data.js
   Banco de noticias simuladas — BolsaGT
   ------------------------------------------------------------
   Inspirado en patrones REALES de impacto de mercado:
   - Decisiones de tasas de la Fed / bancos centrales
   - Sorpresas de earnings (ej. Apple +5%, Netflix -14%, Infosys +6%)
   - Recortes/aumentos de producción OPEC+
   - Datos de inflación (CPI) y empleo (Nonfarm Payrolls)
   - Tensión geopolítica (activo refugio: oro)
   - Ruido informativo que NO mueve el mercado (a propósito,
     para enseñar al estudiante a distinguir señal de ruido)

   No es un feed de noticias reales en vivo — es un generador de
   escenarios verosímiles con probabilidad e impacto realistas,
   pensado para que el estudiante practique análisis de mercado.
   ============================================================ */

var NewsData = (function () {
  "use strict";

  /* impactProbability: probabilidad de que ESTA noticia, al aparecer,
     efectivamente mueva el precio de forma notoria (no todas las
     noticias importantes se sienten igual, y algunas "ruidosas" casi
     nunca mueven nada — igual que en la vida real). */

  var POOL = [
    /* ---------------- Macro / Fed (impacta índices, forex, oro) ---------------- */
    {
      id: "fed_cut",
      category: "macro",
      sentiment: "positive",
      symbols: ["AAPL", "TSLA", "NVDA", "MSFT", "AMZN", "EURUSD", "XAUUSD", "SPX500", "US30", "NAS100", "SPY", "QQQ", "DIA", "VTI", "GLD"],
      headline: "La Reserva Federal recorta la tasa de interés 25 puntos base",
      body: "El FOMC bajó su tasa de referencia citando enfriamiento de la inflación. Analistas esperan menor costo de financiamiento para empresas y mayor apetito por activos de riesgo.",
      impactProbability: 0.85,
      magnitudeRange: [0.015, 0.045],
      symbolSentiment: { XAUUSD: "positive", EURUSD: "positive", GLD: "positive" }
    },
    {
      id: "fed_hike",
      category: "macro",
      sentiment: "negative",
      symbols: ["AAPL", "TSLA", "NVDA", "MSFT", "AMZN", "EURUSD", "XAUUSD", "SPX500", "US30", "NAS100", "SPY", "QQQ", "DIA", "VTI"],
      headline: "La Reserva Federal sube la tasa de interés de forma inesperada",
      body: "El mercado esperaba una pausa, pero el FOMC subió tasas 25 puntos base para contener la inflación. Los sectores de alto crecimiento (tecnología) suelen ser los más sensibles a este tipo de sorpresas.",
      impactProbability: 0.85,
      magnitudeRange: [0.015, 0.05],
      symbolSentiment: { XAUUSD: "negative", EURUSD: "negative", NAS100: "negative", QQQ: "negative" }
    },
    {
      id: "fed_hold_dovish",
      category: "macro",
      sentiment: "neutral",
      symbols: ["AAPL", "MSFT", "EURUSD", "SPX500", "SPY"],
      headline: "La Fed mantiene tasas sin cambios, pero suaviza su tono",
      body: "Sin sorpresas en la decisión, pero el comunicado sugiere posibles recortes futuros. El impacto inmediato suele ser moderado: el mercado ya lo esperaba en gran parte.",
      impactProbability: 0.35,
      magnitudeRange: [0.005, 0.015]
    },
    {
      id: "cpi_hot",
      category: "macro",
      sentiment: "negative",
      symbols: ["AAPL", "TSLA", "NVDA", "MSFT", "AMZN", "XAUUSD", "SPX500", "US30", "NAS100", "SPY", "QQQ", "DIA", "VTI"],
      headline: "Inflación (CPI) sale más alta de lo esperado",
      body: "El dato de inflación mensual superó las proyecciones de analistas, reavivando temores de que la Fed mantenga tasas altas por más tiempo.",
      impactProbability: 0.75,
      magnitudeRange: [0.01, 0.035],
      symbolSentiment: { XAUUSD: "positive" }
    },
    {
      id: "jobs_report_strong",
      category: "macro",
      sentiment: "neutral",
      symbols: ["AAPL", "MSFT", "AMZN", "SPX500", "US30", "SPY", "DIA", "VTI"],
      headline: "Reporte de empleo (Nonfarm Payrolls) supera expectativas",
      body: "Se crearon más empleos de los previstos. Es una señal mixta: economía fuerte es bueno para ganancias corporativas, pero también puede retrasar recortes de tasas.",
      impactProbability: 0.45,
      magnitudeRange: [0.008, 0.02]
    },
    {
      id: "emerging_markets_selloff",
      category: "macro",
      sentiment: "negative",
      symbols: ["VWO"],
      headline: "Salida de capitales golpea a los mercados emergentes",
      body: "Un dólar fuerte y menor apetito por riesgo global provocan una fuerte salida de capital de bolsas emergentes (China, India, Brasil), presionando los precios a la baja.",
      impactProbability: 0.55,
      magnitudeRange: [0.012, 0.035]
    },
    {
      id: "emerging_markets_rally",
      category: "macro",
      sentiment: "positive",
      symbols: ["VWO"],
      headline: "Mercados emergentes repuntan tras estímulo económico en Asia",
      body: "Nuevas medidas de estímulo en economías emergentes clave impulsan el optimismo de los inversionistas hacia esa región.",
      impactProbability: 0.5,
      magnitudeRange: [0.01, 0.03]
    },

    /* ---------------- Earnings por empresa ---------------- */
    {
      id: "aapl_earnings_beat",
      category: "earnings",
      sentiment: "positive",
      symbols: ["AAPL"],
      headline: "Apple reporta ganancias por encima de lo esperado, impulsado por iPhone",
      body: "Las ventas de iPhone subieron más de lo previsto en el trimestre. Wall Street reaccionó con optimismo, similar a lo ocurrido en julio 2012 cuando Apple subió +5% tras un reporte sorpresa.",
      impactProbability: 0.8,
      magnitudeRange: [0.02, 0.06]
    },
    {
      id: "aapl_supply_delay",
      category: "company",
      sentiment: "negative",
      symbols: ["AAPL"],
      headline: "Apple enfrenta retrasos de producción en su cadena de suministro",
      body: "Reportes indican demoras en fábricas clave, lo que podría afectar la disponibilidad de producto para el próximo lanzamiento.",
      impactProbability: 0.55,
      magnitudeRange: [0.01, 0.03]
    },
    {
      id: "tsla_deliveries_miss",
      category: "earnings",
      sentiment: "negative",
      symbols: ["TSLA"],
      headline: "Tesla reporta entregas trimestrales por debajo de lo esperado",
      body: "La cifra de vehículos entregados no alcanzó el consenso de analistas, generando dudas sobre la demanda en un mercado cada vez más competido.",
      impactProbability: 0.75,
      magnitudeRange: [0.02, 0.07]
    },
    {
      id: "tsla_deliveries_beat",
      category: "earnings",
      sentiment: "positive",
      symbols: ["TSLA"],
      headline: "Tesla sorprende con entregas trimestrales récord",
      body: "La compañía superó las proyecciones de entregas, impulsada por fuerte demanda en mercados internacionales.",
      impactProbability: 0.75,
      magnitudeRange: [0.02, 0.07]
    },
    {
      id: "tsla_ceo_tweet",
      category: "company",
      sentiment: "neutral",
      symbols: ["TSLA"],
      headline: "El CEO de Tesla publica un mensaje ambiguo en redes sociales",
      body: "El mensaje generó especulación entre inversionistas, pero no contiene información financiera concreta. Un ejemplo clásico de 'ruido' que suele diluirse rápido.",
      impactProbability: 0.2,
      magnitudeRange: [0.005, 0.02]
    },
    {
      id: "nvda_ai_demand",
      category: "earnings",
      sentiment: "positive",
      symbols: ["NVDA"],
      headline: "NVIDIA reporta demanda de chips de IA por encima de lo esperado",
      body: "La compañía elevó su proyección de ingresos citando demanda sostenida de centros de datos para inteligencia artificial.",
      impactProbability: 0.8,
      magnitudeRange: [0.025, 0.07]
    },
    {
      id: "nvda_export_restriction",
      category: "regulatory",
      sentiment: "negative",
      symbols: ["NVDA"],
      headline: "Nuevas restricciones de exportación afectan ventas de chips a un mercado clave",
      body: "Reguladores anunciaron límites adicionales a la exportación de semiconductores avanzados, lo que podría reducir ingresos en ese mercado.",
      impactProbability: 0.7,
      magnitudeRange: [0.02, 0.06]
    },
    {
      id: "msft_cloud_growth",
      category: "earnings",
      sentiment: "positive",
      symbols: ["MSFT"],
      headline: "Microsoft reporta crecimiento acelerado en su negocio de nube (Azure)",
      body: "Los ingresos de la división de nube superaron el consenso de analistas, reforzando la narrativa de crecimiento impulsado por IA.",
      impactProbability: 0.7,
      magnitudeRange: [0.015, 0.04]
    },
    {
      id: "amzn_antitrust",
      category: "regulatory",
      sentiment: "negative",
      symbols: ["AMZN"],
      headline: "Reguladores abren investigación antimonopolio contra Amazon",
      body: "La investigación podría tomar años en resolverse. Históricamente, este tipo de anuncios genera caídas moderadas de corto plazo más que colapsos.",
      impactProbability: 0.4,
      magnitudeRange: [0.008, 0.025]
    },
    {
      id: "exec_change_minor",
      category: "company",
      sentiment: "neutral",
      symbols: ["AAPL", "MSFT", "AMZN", "TSLA", "NVDA"],
      headline: "Empresa anuncia cambio en un puesto directivo de nivel medio",
      body: "El cambio no afecta a la alta dirección ni a la estrategia de la compañía. Este tipo de noticias rara vez mueve el precio de forma significativa.",
      impactProbability: 0.08,
      magnitudeRange: [0.002, 0.01]
    },

    /* ---------------- Commodities ---------------- */
    {
      id: "opec_cut",
      category: "commodity",
      sentiment: "positive",
      symbols: ["WTI"],
      headline: "OPEC+ anuncia recorte de producción de petróleo",
      body: "El grupo de países productores acordó reducir la oferta, buscando sostener los precios del crudo.",
      impactProbability: 0.8,
      magnitudeRange: [0.02, 0.06]
    },
    {
      id: "opec_increase",
      category: "commodity",
      sentiment: "negative",
      symbols: ["WTI"],
      headline: "OPEC+ sorprende con aumento de producción de petróleo",
      body: "La decisión busca recuperar cuota de mercado, pero presiona los precios a la baja por mayor oferta disponible.",
      impactProbability: 0.75,
      magnitudeRange: [0.02, 0.06]
    },
    {
      id: "oil_inventory_build",
      category: "commodity",
      sentiment: "negative",
      symbols: ["WTI"],
      headline: "Inventarios de petróleo en EE.UU. suben más de lo esperado",
      body: "El reporte semanal mostró una acumulación de inventarios mayor a la anticipada, sugiriendo menor demanda.",
      impactProbability: 0.55,
      magnitudeRange: [0.01, 0.03]
    },
    {
      id: "geopolitical_tension_oil",
      category: "geopolitical",
      sentiment: "positive",
      symbols: ["WTI", "XAUUSD"],
      headline: "Tensión geopolítica en una región productora de petróleo escala",
      body: "El riesgo de disrupción en el suministro global impulsa al petróleo, mientras inversionistas buscan refugio en oro.",
      impactProbability: 0.8,
      magnitudeRange: [0.02, 0.06],
      symbolSentiment: { XAUUSD: "positive", WTI: "positive" }
    },
    {
      id: "gold_safe_haven",
      category: "geopolitical",
      sentiment: "positive",
      symbols: ["XAUUSD"],
      headline: "Incertidumbre global impulsa la demanda de oro como activo refugio",
      body: "Ante señales de inestabilidad en los mercados, inversionistas rotan capital hacia activos considerados más seguros.",
      impactProbability: 0.6,
      magnitudeRange: [0.01, 0.035]
    },
    {
      id: "usd_strength",
      category: "macro",
      sentiment: "negative",
      symbols: ["XAUUSD", "EURUSD"],
      headline: "El dólar se fortalece frente a las principales divisas",
      body: "Un dólar más fuerte suele presionar a la baja el precio del oro y de otras divisas frente al USD, al hacerlas relativamente más costosas.",
      impactProbability: 0.55,
      magnitudeRange: [0.008, 0.025],
      symbolSentiment: { EURUSD: "negative", XAUUSD: "negative" }
    },

    /* ---------------- Forex / Guatemala ---------------- */
    {
      id: "banguat_decision",
      category: "macro",
      sentiment: "neutral",
      symbols: ["USDGTQ"],
      headline: "Banguat mantiene su tasa líder de política monetaria",
      body: "El Banco de Guatemala decidió mantener sin cambios su tasa de referencia, en línea con las expectativas del mercado local.",
      impactProbability: 0.3,
      magnitudeRange: [0.003, 0.012]
    },
    {
      id: "remesas_record",
      category: "macro",
      sentiment: "positive",
      symbols: ["USDGTQ"],
      headline: "Remesas familiares hacia Guatemala alcanzan un nuevo récord mensual",
      body: "El ingreso de remesas incrementa la oferta de dólares en el mercado local, lo que suele fortalecer ligeramente al quetzal.",
      impactProbability: 0.4,
      magnitudeRange: [0.004, 0.015],
      symbolSentiment: { USDGTQ: "negative" }
    },
    {
      id: "ecb_decision",
      category: "macro",
      sentiment: "positive",
      symbols: ["EURUSD"],
      headline: "El Banco Central Europeo (BCE) señala posibles recortes de tasa",
      body: "El BCE abrió la puerta a una política monetaria más laxa en los próximos meses, lo que generó movimiento en el euro.",
      impactProbability: 0.65,
      magnitudeRange: [0.01, 0.03]
    },

    /* ---------------- Ruido puro (para practicar discernimiento) ---------------- */
    {
      id: "influencer_opinion",
      category: "noise",
      sentiment: "neutral",
      symbols: ["TSLA", "NVDA", "AAPL"],
      headline: "Un analista de redes sociales predice un 'gran movimiento' sin evidencia clara",
      body: "La publicación se volvió popular en redes, pero no aporta datos financieros verificables. Es un buen ejemplo de ruido informativo.",
      impactProbability: 0.05,
      magnitudeRange: [0.002, 0.008]
    },
    {
      id: "rumor_unconfirmed",
      category: "noise",
      sentiment: "neutral",
      symbols: ["AMZN", "MSFT"],
      headline: "Circula un rumor no confirmado sobre una posible fusión",
      body: "Ninguna de las partes ha confirmado la información. Los rumores no verificados generan volatilidad de corto plazo, pero rara vez sostienen una tendencia.",
      impactProbability: 0.15,
      magnitudeRange: [0.005, 0.02]
    }
  ];

  function all() { return POOL; }
  function byId(id) {
    for (var i = 0; i < POOL.length; i++) if (POOL[i].id === id) return POOL[i];
    return null;
  }

  return { all: all, byId: byId };
})();
