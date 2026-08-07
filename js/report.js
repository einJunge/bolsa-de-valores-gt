/* ============================================================
   BolsaGT — Informe de inversión en PDF (jsPDF vía CDN)
   Réplica del diseño del informe universitario de la versión backend.
   ============================================================ */

var InvestmentReport = (function () {
  "use strict";

  var INK = [14, 21, 27];
  var INK_SOFT = [61, 79, 92];
  var LINE = [201, 210, 216];
  var GAIN = [31, 143, 95];
  var LOSS = [194, 59, 59];
  var AMBER = [184, 121, 31];
  var MARGIN = 40;

  function money(n) {
    var sign = n < 0 ? "-" : "";
    return sign + "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function pct(n) {
    var sign = n > 0 ? "+" : "";
    return sign + n.toFixed(2) + "%";
  }
  function catLabel(c) { return BolsaData.categoryLabel(c); }

  /* ---------- Variación de redacción (mismos datos, distinta forma de decirlo) ---------- */

  function hashSeed(str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
  }

  /** PRNG determinístico (mulberry32) — cada informe usa una semilla distinta
   *  (fecha/hora + aleatorio), así que la redacción varía en cada descarga,
   *  aunque los datos numéricos sean siempre los reales del portafolio. */
  function makeRng(seed) {
    var s = seed >>> 0;
    return function () {
      s |= 0; s = (s + 0x6d2b79f5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(rng, arr) {
    return arr[Math.floor(rng() * arr.length) % arr.length];
  }

  function sectionHeader(doc, title, y) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.text(title, MARGIN, y);
    doc.setDrawColor(AMBER[0], AMBER[1], AMBER[2]);
    doc.setLineWidth(1.2);
    doc.line(MARGIN, y + 5, doc.internal.pageSize.getWidth() - MARGIN, y + 5);
    return y + 22;
  }

  function subheading(doc, title, y) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.text(title, MARGIN, y);
    return y + 16;
  }

  function paragraph(doc, text, y, width) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(INK_SOFT[0], INK_SOFT[1], INK_SOFT[2]);
    var lines = doc.splitTextToSize(text, width);
    doc.text(lines, MARGIN, y);
    return y + lines.length * 13;
  }

  function bullets(doc, items, y, width) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(INK_SOFT[0], INK_SOFT[1], INK_SOFT[2]);
    items.forEach(function (item) {
      var lines = doc.splitTextToSize(item, width - 12);
      doc.circle(MARGIN + 2, y - 3, 1.4, "F");
      doc.text(lines, MARGIN + 10, y);
      y += lines.length * 13 + 3;
    });
    return y;
  }

  function kpiGrid(doc, items, y, width) {
    var cols = 2, gap = 10, cardW = (width - gap) / cols, cardH = 38;
    items.forEach(function (item, idx) {
      var col = idx % cols, row = Math.floor(idx / cols);
      var x = MARGIN + col * (cardW + gap);
      var cy = y + row * (cardH + gap);
      doc.setFillColor(244, 246, 247);
      doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
      doc.roundedRect(x, cy, cardW, cardH, 3, 3, "FD");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(INK_SOFT[0], INK_SOFT[1], INK_SOFT[2]);
      doc.text(item.label.toUpperCase(), x + 8, cy + 13);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11.5);
      var color = item.color || INK;
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(item.value, x + 8, cy + 28);
    });
    var rows = Math.ceil(items.length / cols);
    return y + rows * (cardH + gap);
  }

  function horizontalBars(doc, data, y, width) {
    var rowH = 18, labelW = 100, barMaxW = width - labelW - 46;
    data.forEach(function (d) {
      var barW = Math.max((d.value / 100) * barMaxW, 1);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(INK_SOFT[0], INK_SOFT[1], INK_SOFT[2]);
      doc.text(d.label, MARGIN, y + 8);
      doc.setFillColor(232, 236, 239);
      doc.rect(MARGIN + labelW, y, barMaxW, 10, "F");
      doc.setFillColor(d.color[0], d.color[1], d.color[2]);
      doc.rect(MARGIN + labelW, y, barW, 10, "F");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(INK[0], INK[1], INK[2]);
      doc.text(d.value.toFixed(1) + "%", MARGIN + labelW + barMaxW + 4, y + 8);
      y += rowH;
    });
    return y;
  }

  function divergingBars(doc, data, y, width) {
    var rowH = 18, labelW = 80, chartW = width - labelW - 60;
    var centerX = MARGIN + labelW + chartW / 2;
    var maxAbs = Math.max.apply(null, data.map(function (d) { return Math.abs(d.value); }).concat([1]));

    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.line(centerX, y, centerX, y + rowH * data.length);

    data.forEach(function (d) {
      var halfW = (Math.abs(d.value) / maxAbs) * (chartW / 2 - 4);
      var color = d.value >= 0 ? GAIN : LOSS;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(INK_SOFT[0], INK_SOFT[1], INK_SOFT[2]);
      doc.text(d.label, MARGIN, y + 8);
      doc.setFillColor(color[0], color[1], color[2]);
      if (d.value >= 0) doc.rect(centerX, y, halfW, 10, "F");
      else doc.rect(centerX - halfW, y, halfW, 10, "F");
      var valueLabel = money(d.value);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(color[0], color[1], color[2]);
      var tw = doc.getTextWidth(valueLabel);
      var lx = d.value >= 0 ? centerX + halfW + 4 : centerX - halfW - 4 - tw;
      doc.text(valueLabel, lx, y + 8);
      y += rowH;
    });
    return y;
  }

  function buildAllocation(summary) {
    var byCategory = {};
    summary.positions.forEach(function (p) {
      var key = catLabel(p.category);
      byCategory[key] = (byCategory[key] || 0) + p.marketValue;
    });
    var colors = [[79, 209, 197], [232, 163, 61], [124, 156, 255], [224, 123, 208]];
    var entries = Object.keys(byCategory).map(function (label, i) {
      return { label: label, value: summary.totalValue > 0 ? (byCategory[label] / summary.totalValue) * 100 : 0, color: colors[i % colors.length] };
    });
    entries.push({ label: "Efectivo", value: summary.totalValue > 0 ? (summary.cash / summary.totalValue) * 100 : 0, color: [138, 151, 163] });
    entries.sort(function (a, b) { return b.value - a.value; });
    return entries;
  }

  function findings(rng, summary) {
    var sorted = summary.positions.slice().sort(function (a, b) { return b.unrealizedPnlPct - a.unrealizedPnlPct; });
    var best = sorted[0], worst = sorted[sorted.length - 1];
    var winners = summary.positions.filter(function (p) { return p.unrealizedPnl > 0; }).length;
    var winRate = summary.positions.length > 0 ? (winners / summary.positions.length) * 100 : 0;
    var categories = {};
    summary.positions.forEach(function (p) { categories[p.category] = true; });
    var nCats = Object.keys(categories).length;

    var bestVariants = [
      "Mejor posición: " + best.symbol + " con " + pct(best.unrealizedPnlPct) + " (" + money(best.unrealizedPnl) + ").",
      "La posición con mejor desempeño fue " + best.symbol + ", con una variación de " + pct(best.unrealizedPnlPct) + " (" + money(best.unrealizedPnl) + ").",
      best.symbol + " lidera el portafolio en rendimiento, con " + pct(best.unrealizedPnlPct) + " (" + money(best.unrealizedPnl) + ") de ganancia no realizada.",
      "Entre todas las posiciones, " + best.symbol + " muestra el resultado más favorable: " + pct(best.unrealizedPnlPct) + " (" + money(best.unrealizedPnl) + ")."
    ];
    var worstVariants = [
      "Posición con mayor rezago: " + worst.symbol + " con " + pct(worst.unrealizedPnlPct) + " (" + money(worst.unrealizedPnl) + ").",
      "La posición de menor desempeño es " + worst.symbol + ", con " + pct(worst.unrealizedPnlPct) + " (" + money(worst.unrealizedPnl) + ").",
      worst.symbol + " presenta el resultado más débil del portafolio, con una variación de " + pct(worst.unrealizedPnlPct) + " (" + money(worst.unrealizedPnl) + ").",
      "El mayor rezago se concentra en " + worst.symbol + ", con " + pct(worst.unrealizedPnlPct) + " (" + money(worst.unrealizedPnl) + ")."
    ];
    var winRateVariants = [
      winners + " de " + summary.positions.length + " posiciones (" + winRate.toFixed(0) + "%) muestran ganancia no realizada al cierre de este informe.",
      "Del total de posiciones abiertas, " + winners + " de " + summary.positions.length + " (" + winRate.toFixed(0) + "%) se encuentran en terreno positivo.",
      "El " + winRate.toFixed(0) + "% de las posiciones (" + winners + " de " + summary.positions.length + ") registra ganancia no realizada a la fecha de corte.",
      "Al cierre de este informe, " + winners + " de las " + summary.positions.length + " posiciones abiertas (" + winRate.toFixed(0) + "%) reportan utilidad no realizada."
    ];
    var diversificationVariants = [
      "El portafolio mantiene " + summary.positions.length + " posiciones abiertas distribuidas en " + nCats + " clase(s) de activo distinta(s).",
      "Actualmente el portafolio está compuesto por " + summary.positions.length + " posiciones, repartidas en " + nCats + " clase(s) de activo.",
      "La cartera abarca " + summary.positions.length + " posiciones abiertas en " + nCats + " clase(s) de activo diferentes.",
      "Se registran " + summary.positions.length + " posiciones activas, diversificadas en " + nCats + " clase(s) de activo."
    ];

    return [
      pick(rng, bestVariants), pick(rng, worstVariants), pick(rng, winRateVariants), pick(rng, diversificationVariants)
    ];
  }

  function introParagraph(rng, summary) {
    var start = money(summary.startingBalance), total = money(summary.totalValue);
    var p = pct(summary.totalPnlPct), pnl = money(summary.totalPnl);
    var variants = [
      "Este informe documenta el estado y desempeño de un portafolio de inversión simulado, gestionado a través de la plataforma BolsaGT. El portafolio inició con un balance virtual de " + start + " y, a la fecha de este informe, registra un valor total de " + total + ", lo que representa un rendimiento acumulado de " + p + " (" + pnl + ").",
      "El presente documento resume la evolución de un portafolio de inversión simulado dentro de la plataforma BolsaGT. Partiendo de un capital inicial de " + start + ", la cuenta alcanza en la actualidad un valor de " + total + " — una variación acumulada de " + pnl + " (" + p + ") desde su apertura.",
      "A continuación se presenta el análisis de desempeño del portafolio simulado gestionado en BolsaGT. Con un capital de arranque de " + start + ", el valor actual de la cuenta asciende a " + total + ", lo que equivale a un cambio de " + p + " (" + pnl + ") sobre el monto invertido originalmente.",
      "El siguiente reporte describe el comportamiento de un portafolio de inversión simulado, administrado mediante BolsaGT. El capital inicial fue de " + start + "; al momento de este corte, la cuenta registra " + total + " en valor total, es decir, un resultado acumulado de " + pnl + " (" + p + ").",
      "Este documento presenta un resumen del rendimiento obtenido por un portafolio simulado en BolsaGT durante el periodo analizado. Se comenzó con " + start + " de capital y, a la fecha, el valor total de la cuenta es de " + total + ", reflejando un cambio neto de " + pnl + " (" + p + ")."
    ];
    return pick(rng, variants);
  }

  function blitzSummarySentence(rng, betStats) {
    var extras = "";
    if (betStats.tied > 0) extras += ", " + betStats.tied + " en empate";
    if (betStats.closedEarly > 0) extras += ", " + betStats.closedEarly + " cerradas anticipadamente";
    var rate = betStats.winRate.toFixed(1), net = money(betStats.netPnl);
    var variants = [
      "Se registraron " + betStats.total + " operaciones Blitz liquidadas: " + betStats.won + " ganadas, " + betStats.lost + " perdidas" + extras + ". Tasa de acierto: " + rate + "%. Resultado neto: " + net + ".",
      "En total se liquidaron " + betStats.total + " operaciones Blitz durante el periodo: " + betStats.won + " resultaron ganadoras y " + betStats.lost + " perdedoras" + extras + ", para una tasa de acierto de " + rate + "% y un resultado neto de " + net + ".",
      "El historial de operaciones Blitz muestra " + betStats.total + " apuestas liquidadas (" + betStats.won + " ganadas, " + betStats.lost + " perdidas" + extras + "), con una efectividad del " + rate + "% y un balance neto de " + net + ".",
      "De las " + betStats.total + " operaciones Blitz cerradas, " + betStats.won + " terminaron a favor y " + betStats.lost + " en contra" + extras + " — una tasa de acierto de " + rate + "% y un resultado neto acumulado de " + net + "."
    ];
    return pick(rng, variants);
  }

  function methodologyBullets(rng) {
    return [
      pick(rng, [
        "Los precios utilizados provienen del motor de simulación de mercado de BolsaGT (movimiento aleatorio calibrado por instrumento) y no representan cotizaciones reales de mercado.",
        "Todos los precios reflejados en este informe son generados por el motor de simulación de BolsaGT mediante un modelo de movimiento aleatorio calibrado por instrumento; no corresponden a cotizaciones de mercado reales.",
        "El motor de precios de BolsaGT simula el comportamiento del mercado con un modelo de movimiento aleatorio propio de cada instrumento — los valores no provienen de una fuente de mercado real."
      ]),
      pick(rng, [
        "Las órdenes de mercado se ejecutan al precio bid/ask simulado vigente; las órdenes límite se ejecutan cuando el precio cruza el límite especificado.",
        "Toda orden de mercado se liquida al precio bid/ask simulado del momento; las órdenes límite quedan pendientes hasta que el precio alcanza el nivel definido.",
        "Las compras/ventas a mercado toman el precio bid/ask simulado vigente en el instante de la orden; las órdenes límite esperan a que el precio cruce el umbral indicado."
      ]),
      pick(rng, [
        "Las operaciones Blitz son apuestas cronometradas sobre la dirección del precio (sube/baja): si al vencer el cronómetro el precio se movió a favor de la dirección elegida, se paga la inversión más el porcentaje de beneficio pactado; si no, se pierde la inversión. El cierre anticipado calcula un valor de recompra estimado, no un precio de mercado real.",
        "Las operaciones Blitz consisten en predecir, dentro de un tiempo determinado, si el precio subirá o bajará: acertar paga la inversión más el beneficio pactado, mientras que fallar implica la pérdida del monto apostado. El cierre anticipado ofrece un valor estimado de recompra, sin ser un precio real de mercado."
      ]),
      pick(rng, [
        "La estrategia del portafolio de inversión (Mercado) es long-only: no se permite venta en corto ni apalancamiento (margen). Las operaciones Blitz son independientes de esa estrategia y no generan posiciones.",
        "El módulo de inversión (Mercado) opera bajo un esquema long-only, sin ventas en corto ni apalancamiento. Las apuestas Blitz son independientes de esta lógica y no generan posiciones en el portafolio."
      ]),
      pick(rng, [
        "El P&L no realizado de las posiciones de inversión se calcula como (precio actual − precio promedio de compra) × cantidad.",
        "El cálculo del P&L no realizado de cada posición corresponde a la diferencia entre el precio actual y el precio promedio de compra, multiplicada por la cantidad de unidades."
      ])
    ];
  }

  function coverSubtitle(rng) {
    return pick(rng, [
      "Entrega de análisis de portafolio de inversión simulado",
      "Análisis y resultados de un portafolio de inversión simulado",
      "Reporte de desempeño de un portafolio de inversión simulado",
      "Documento de entrega — análisis de portafolio simulado"
    ]);
  }

  function emptyPositionsText(rng) {
    return pick(rng, [
      "El portafolio no tiene posiciones abiertas al momento de generar este informe.",
      "A la fecha de este informe, el portafolio no registra posiciones abiertas."
    ]);
  }
  function emptyOrdersText(rng) {
    return pick(rng, [
      "No hay operaciones registradas todavía.",
      "Aún no se han registrado operaciones en este portafolio."
    ]);
  }
  function emptyBetsText(rng) {
    return pick(rng, [
      "No se registraron operaciones Blitz en este portafolio.",
      "Este portafolio no registra operaciones Blitz a la fecha."
    ]);
  }
  function emptyPositionsAnalysisText(rng) {
    return pick(rng, [
      "No hay posiciones abiertas para analizar.",
      "No se cuenta con posiciones abiertas para este análisis."
    ]);
  }

  function conclusionText(rng, summary) {
    var direction = summary.totalPnl >= 0 ? "una ganancia" : "una pérdida";
    var hasPositions = summary.positions.length > 0;
    var diversification = hasPositions
      ? "el portafolio distribuye su capital entre " + summary.positions.length + " instrumento(s)"
      : "el portafolio no mantiene posiciones abiertas al momento de este corte";
    var diversificationCap = hasPositions
      ? "El portafolio distribuye su capital entre " + summary.positions.length + " instrumento(s)"
      : "El portafolio no mantiene posiciones abiertas al momento de este corte";
    var investedPct = ((summary.equityValue / Math.max(summary.totalValue, 1)) * 100).toFixed(1);
    var absPnl = money(Math.abs(summary.totalPnl)), p = pct(summary.totalPnlPct), start = money(summary.startingBalance), cash = money(summary.cash);

    var variants = [
      "Al cierre de este informe, el portafolio simulado presenta " + direction + " acumulada de " + absPnl + " (" + p + ") respecto al balance inicial de " + start + ". Actualmente, " + diversification + ", con un " + investedPct + "% del valor total de la cuenta invertido y el remanente (" + cash + ") disponible como efectivo. Este resultado corresponde a un entorno de simulación con fines educativos y no debe interpretarse como asesoría financiera ni como garantía de resultados en mercados reales.",
      "En síntesis, el portafolio simulado cierra con " + direction + " de " + absPnl + " (" + p + ") frente al capital inicial de " + start + ". " + diversificationCap + ", manteniendo un " + investedPct + "% de la cuenta invertido y " + cash + " disponibles en efectivo. Cabe recordar que estos resultados provienen de un entorno educativo de simulación y no constituyen asesoría financiera ni garantía de desempeño en mercados reales.",
      "Como conclusión, el rendimiento acumulado del portafolio simulado es de " + absPnl + " (" + p + "), representando " + direction + " respecto al balance inicial de " + start + ". " + diversificationCap + "; el " + investedPct + "% del capital total permanece invertido, mientras que " + cash + " se mantienen líquidos. Se reitera que este informe es producto de una simulación con fines educativos, sin validez como recomendación de inversión ni garantía de resultados reales.",
      "El portafolio simulado registra, a la fecha, " + direction + " neta de " + absPnl + " (" + p + ") sobre el balance inicial de " + start + ". " + diversificationCap + ", con " + investedPct + "% del capital invertido y " + cash + " en efectivo disponible. Es importante señalar que los resultados aquí presentados corresponden a un ejercicio de simulación educativa y no representan asesoría financiera profesional ni aseguran resultados similares en un mercado real."
    ];
    return pick(rng, variants);
  }

  function drawCover(doc, meta, summary, rng) {
    var w = doc.internal.pageSize.getWidth();
    var h = doc.internal.pageSize.getHeight();

    doc.setFillColor(INK[0], INK[1], INK[2]);
    doc.rect(0, 0, w, 120, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text("BOLSA GT — SIMULADOR BURSÁTIL", MARGIN, 50);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(201, 210, 216);
    doc.text("Plataforma de simulación de inversiones con datos en tiempo real", MARGIN, 66);

    var y = 170;
    if (meta.university) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(INK[0], INK[1], INK[2]);
      doc.text(meta.university.toUpperCase(), w / 2, y, { align: "center", maxWidth: w - MARGIN * 2 });
      y += 20;
    }
    if (meta.course) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(INK_SOFT[0], INK_SOFT[1], INK_SOFT[2]);
      doc.text(meta.course, w / 2, y, { align: "center" });
      y += 40;
    } else {
      y += 30;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    var titleLines = doc.splitTextToSize(meta.reportTitle, w - MARGIN * 2);
    doc.text(titleLines, w / 2, y, { align: "center" });
    y += titleLines.length * 26 + 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(INK_SOFT[0], INK_SOFT[1], INK_SOFT[2]);
    doc.text(coverSubtitle(rng), w / 2, y, { align: "center" });

    var infoY = h - 220;
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.line(MARGIN, infoY, w - MARGIN, infoY);

    var rows = [];
    if (meta.studentName) rows.push(["Estudiante", meta.studentName]);
    if (meta.studentId) rows.push(["Carné", meta.studentId]);
    if (meta.professor) rows.push(["Catedrático", meta.professor]);
    if (meta.section) rows.push(["Sección", meta.section]);
    rows.push(["Fecha de entrega", new Date().toLocaleDateString("es-GT", { year: "numeric", month: "long", day: "numeric" })]);
    rows.push(["Valor total del portafolio", money(summary.totalValue)]);
    rows.push(["Rendimiento acumulado", pct(summary.totalPnlPct)]);

    var ry = infoY + 24;
    rows.forEach(function (row) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(INK_SOFT[0], INK_SOFT[1], INK_SOFT[2]);
      doc.text(row[0] + ":", MARGIN, ry);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(INK[0], INK[1], INK[2]);
      doc.text(row[1], MARGIN + 160, ry);
      ry += 18;
    });
  }

  function drawFooter(doc, page, total) {
    var w = doc.internal.pageSize.getWidth();
    var h = doc.internal.pageSize.getHeight();
    var y = h - 34;
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, y, w - MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(INK_SOFT[0], INK_SOFT[1], INK_SOFT[2]);
    doc.text("Generado por BolsaGT · Simulador Bursátil · " + new Date().toLocaleDateString("es-GT"), MARGIN, y + 12);
    doc.text("Página " + page + " de " + total, w - MARGIN, y + 12, { align: "right" });
  }

  function generate(meta) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error("No se pudo cargar la librería de PDF (jsPDF). Verifica tu conexión a internet — este informe requiere el CDN de jsPDF la primera vez que se genera.");
    }
    var summary = Portfolio.getSummary();
    var orders = Portfolio.getOrders({});
    var bets = Portfolio.getBetHistory({}).filter(function (b) { return b.status !== "open"; });
    var betStats = Portfolio.getBetStats();
    var rng = makeRng(hashSeed(String(Date.now()) + "|" + Math.random() + "|" + (meta.studentName || "") + "|" + (meta.studentId || "")));
    var jsPDFCtor = window.jspdf.jsPDF;
    var doc = new jsPDFCtor({ unit: "pt", format: "letter" });
    var pageWidth = doc.internal.pageSize.getWidth();
    var contentWidth = pageWidth - MARGIN * 2;

    // ---------- Portada ----------
    drawCover(doc, meta, summary, rng);

    // ---------- Resumen ejecutivo ----------
    doc.addPage();
    var y = sectionHeader(doc, "1. Resumen Ejecutivo", 56);
    y = paragraph(doc, introParagraph(rng, summary), y + 6, contentWidth);
    y += 12;

    y = kpiGrid(doc, [
      { label: "Balance inicial", value: money(summary.startingBalance) },
      { label: "Efectivo disponible", value: money(summary.cash) },
      { label: "Valor en posiciones", value: money(summary.equityValue) },
      { label: "Valor total de cuenta", value: money(summary.totalValue) },
      { label: "P&L total", value: money(summary.totalPnl) + " (" + pct(summary.totalPnlPct) + ")", color: summary.totalPnl >= 0 ? GAIN : LOSS },
      { label: "P&L del día", value: money(summary.dayPnl), color: summary.dayPnl >= 0 ? GAIN : LOSS },
      { label: "Posiciones abiertas", value: String(summary.positions.length) },
      { label: "Operaciones registradas", value: String(orders.length) },
      { label: "Apuestas Blitz abiertas", value: money(summary.openBetStake) },
      { label: "Resultado neto Blitz", value: money(betStats.netPnl), color: betStats.netPnl >= 0 ? GAIN : LOSS }
    ], y, contentWidth);

    // ---------- Composición del portafolio ----------
    y += 16;
    y = sectionHeader(doc, "2. Composición del Portafolio", y);

    if (summary.positions.length === 0) {
      y = paragraph(doc, emptyPositionsText(rng), y, contentWidth);
    } else {
      y = subheading(doc, "2.1 Asignación de capital por clase de activo", y);
      y = horizontalBars(doc, buildAllocation(summary), y + 4, contentWidth) + 12;

      y = subheading(doc, "2.2 Detalle de posiciones", y);
      doc.autoTable({
        startY: y,
        margin: { left: MARGIN, right: MARGIN },
        head: [["Símbolo", "Tipo", "Cant.", "Prom.", "Actual", "Valor mkt.", "P&L"]],
        body: summary.positions.map(function (p) {
          return [p.symbol, catLabel(p.category), String(p.quantity), p.avgPrice.toFixed(4), p.currentPrice.toFixed(4), money(p.marketValue), money(p.unrealizedPnl)];
        }),
        styles: { font: "helvetica", fontSize: 8, textColor: INK_SOFT, cellPadding: 4 },
        headStyles: { fillColor: INK, textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [244, 246, 247] },
        didParseCell: function (data) {
          if (data.section === "body" && data.column.index === 6) {
            var val = summary.positions[data.row.index].unrealizedPnl;
            data.cell.styles.textColor = val >= 0 ? GAIN : LOSS;
            data.cell.styles.fontStyle = "bold";
          }
        }
      });
      y = doc.lastAutoTable.finalY + 16;
    }

    // ---------- Análisis de rendimiento ----------
    doc.addPage();
    y = sectionHeader(doc, "3. Análisis de Rendimiento por Posición", 56);
    if (summary.positions.length === 0) {
      y = paragraph(doc, emptyPositionsAnalysisText(rng), y, contentWidth);
    } else {
      y = subheading(doc, "3.1 P&L no realizado por instrumento", y);
      y = divergingBars(doc, summary.positions.map(function (p) { return { label: p.symbol, value: p.unrealizedPnl }; }), y + 4, contentWidth) + 16;

      y = subheading(doc, "3.2 Hallazgos", y);
      y = bullets(doc, findings(rng, summary), y + 2, contentWidth) + 8;
    }

    // ---------- Historial de operaciones ----------
    doc.addPage();
    y = sectionHeader(doc, "4. Historial de Operaciones", 56);
    if (orders.length === 0) {
      paragraph(doc, emptyOrdersText(rng), y, contentWidth);
    } else {
      doc.autoTable({
        startY: y,
        margin: { left: MARGIN, right: MARGIN },
        head: [["Fecha", "Símbolo", "Lado", "Tipo", "Cant.", "Precio", "Estado"]],
        body: orders.map(function (o) {
          return [
            new Date(o.createdAt).toLocaleString("es-GT"), o.symbol, o.side === "buy" ? "Compra" : "Venta",
            o.kind === "market" ? "Market" : "Limit", String(o.quantity), o.filledPrice != null ? Number(o.filledPrice).toFixed(4) : "—", o.status
          ];
        }),
        styles: { font: "helvetica", fontSize: 8, textColor: INK_SOFT, cellPadding: 4 },
        headStyles: { fillColor: INK, textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [244, 246, 247] }
      });
    }
    y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : y + 20;

    // ---------- Operaciones Blitz (sube/baja) ----------
    if (y > doc.internal.pageSize.getHeight() - 160) { doc.addPage(); y = 56; }
    y = subheading(doc, "4.1 Operaciones Blitz (sube/baja cronometradas)", y);
    if (bets.length === 0) {
      y = paragraph(doc, emptyBetsText(rng), y, contentWidth);
    } else {
      y = paragraph(doc, blitzSummarySentence(rng, betStats), y, contentWidth) + 8;

      doc.autoTable({
        startY: y,
        margin: { left: MARGIN, right: MARGIN },
        head: [["Fecha", "Símbolo", "Dirección", "Duración", "Inversión", "Resultado", "P/L"]],
        body: bets.slice(0, 60).map(function (b) {
          var durLabel = b.durationSeconds >= 60 ? (b.durationSeconds / 60) + "m" : b.durationSeconds + "s";
          var resultLabel = { won: "Ganada", lost: "Perdida", tied: "Empate", closed_early: "Cerrada antic." }[b.status] || b.status;
          return [
            new Date(b.openTime).toLocaleString("es-GT"), b.symbol, b.direction === "up" ? "Sube" : "Baja",
            durLabel, money(b.investment), resultLabel, b.profit != null ? money(b.profit) : "—"
          ];
        }),
        styles: { font: "helvetica", fontSize: 8, textColor: INK_SOFT, cellPadding: 4 },
        headStyles: { fillColor: INK, textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [244, 246, 247] },
        didParseCell: function (data) {
          if (data.section === "body" && data.column.index === 6) {
            var val = bets[data.row.index] ? bets[data.row.index].profit : null;
            if (val != null) {
              data.cell.styles.textColor = val >= 0 ? GAIN : LOSS;
              data.cell.styles.fontStyle = "bold";
            }
          }
        }
      });
    }

    // ---------- Metodología y conclusiones ----------
    doc.addPage();
    y = sectionHeader(doc, "5. Metodología y Notas", 56);
    y = bullets(doc, methodologyBullets(rng), y + 4, contentWidth) + 12;

    y = sectionHeader(doc, "6. Conclusiones", y);
    paragraph(doc, conclusionText(rng, summary), y, contentWidth);

    // ---------- Footer con numeración ----------
    var totalPages = doc.internal.getNumberOfPages();
    for (var p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      drawFooter(doc, p, totalPages);
    }

    var filename = "informe-inversiones-bolsagt-" + new Date().toISOString().slice(0, 10) + ".pdf";
    doc.save(filename);
  }

  return { generate: generate };
})();
