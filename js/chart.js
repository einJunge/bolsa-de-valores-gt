/* ============================================================
   BolsaGT — Gráfico de velas dibujado a mano sobre <canvas>
   Sin librerías externas de charting.
   ============================================================ */

var CandleChart = (function () {
  "use strict";

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Array} candles
   * @param {number} decimals
   * @param {{openPrice:number, direction:'up'|'down', openTimeMs:number, expiryMs:number, favorable:boolean} | null} bet
   *        Si hay una apuesta Blitz abierta sobre el símbolo mostrado, dibuja
   *        la línea de entrada + cuenta regresiva hacia el vencimiento.
   */
  function draw(canvas, candles, decimals, bet) {
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    var w = Math.max(rect.width, 100);
    var h = Math.max(rect.height, 100);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    if (!candles || candles.length === 0) {
      ctx.fillStyle = "#3d4f5c";
      ctx.font = "12px 'IBM Plex Mono', monospace";
      ctx.fillText("Esperando datos…", 12, 20);
      return;
    }

    var padding = { top: 14, right: 64, bottom: 24, left: 8 };
    var plotW = w - padding.left - padding.right;
    var plotH = h - padding.top - padding.bottom;

    // Si hay una apuesta abierta, se reserva una franja a la derecha ("zona
    // futura") para la cuenta regresiva, igual que en un terminal de trading
    // cronometrado: las velas quedan más compactas a la izquierda.
    var futureW = bet ? plotW * 0.26 : 0;
    var historyW = plotW - futureW;

    var visible = candles.slice(-120);
    var min = Infinity, max = -Infinity;
    visible.forEach(function (c) {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
    });
    if (bet) { min = Math.min(min, bet.openPrice); max = Math.max(max, bet.openPrice); }
    if (min === max) { min -= 1; max += 1; }
    var margin = (max - min) * 0.08;
    min -= margin; max += margin;

    function yFor(price) {
      return padding.top + plotH - ((price - min) / (max - min)) * plotH;
    }

    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.fillStyle = "#8a97a3";
    ctx.font = "10px 'IBM Plex Mono', monospace";
    ctx.lineWidth = 1;
    var gridLines = 5;
    for (var g = 0; g <= gridLines; g++) {
      var price = min + ((max - min) * g) / gridLines;
      var y = yFor(price);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + plotW, y);
      ctx.stroke();
      ctx.fillText(price.toFixed(decimals), padding.left + plotW + 6, y + 3);
    }

    var slot = historyW / visible.length;
    var bodyW = Math.max(slot * 0.6, 1);

    visible.forEach(function (c, i) {
      var x = padding.left + i * slot + slot / 2;
      var up = c.close >= c.open;
      var color = up ? "#3ecf8e" : "#ef5b5b";
      ctx.strokeStyle = color;
      ctx.fillStyle = color;

      ctx.beginPath();
      ctx.moveTo(x, yFor(c.high));
      ctx.lineTo(x, yFor(c.low));
      ctx.stroke();

      var yOpen = yFor(c.open);
      var yClose = yFor(c.close);
      var bodyTop = Math.min(yOpen, yClose);
      var bodyH = Math.max(Math.abs(yClose - yOpen), 1);
      ctx.fillRect(x - bodyW / 2, bodyTop, bodyW, bodyH);
    });

    ctx.fillStyle = "#8a97a3";
    var step = Math.max(Math.floor(visible.length / 6), 1);
    for (var i2 = 0; i2 < visible.length; i2 += step) {
      var c2 = visible[i2];
      var d = new Date(c2.time * 1000);
      var label = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
      var x2 = padding.left + i2 * slot + slot / 2;
      ctx.fillText(label, x2 - 14, h - 6);
    }

    /* ---------- Overlay de apuesta Blitz activa ---------- */
    if (bet) {
      var boundaryX = padding.left + historyW;
      var usableFutureW = futureW * 0.88;
      var nowMs = Date.now();
      var elapsedFrac = Math.min(Math.max((nowMs - bet.openTimeMs) / (bet.expiryMs - bet.openTimeMs), 0), 1);
      var nowX = boundaryX + elapsedFrac * usableFutureW;
      var expiryX = boundaryX + usableFutureW;

      var accentColor = bet.favorable ? "#3ecf8e" : "#ef5b5b";

      // línea horizontal de precio de entrada
      var entryY = yFor(bet.openPrice);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#e8a33d";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, entryY);
      ctx.lineTo(padding.left + plotW, entryY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#e8a33d";
      ctx.font = "9px 'IBM Plex Mono', monospace";
      ctx.fillText(bet.openPrice.toFixed(decimals), padding.left + plotW + 6, entryY - 4);

      // franja de "zona futura" para diferenciarla visualmente del histórico
      ctx.fillStyle = "rgba(255,255,255,0.02)";
      ctx.fillRect(boundaryX, padding.top, futureW, plotH);

      // línea vertical de "ahora" (avanza hacia el vencimiento)
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.beginPath();
      ctx.moveTo(nowX, padding.top);
      ctx.lineTo(nowX, padding.top + plotH);
      ctx.stroke();

      // línea vertical de vencimiento (fija, al final de la zona futura)
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(expiryX, padding.top);
      ctx.lineTo(expiryX, padding.top + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      // badge de cuenta regresiva, siguiendo la línea de "ahora"
      var remaining = Math.max(0, Math.round((bet.expiryMs - nowMs) / 1000));
      var mm = String(Math.floor(remaining / 60)).padStart(2, "0");
      var ss = String(remaining % 60).padStart(2, "0");
      var badgeText = mm + ":" + ss;
      ctx.font = "bold 11px 'IBM Plex Mono', monospace";
      var badgeW = ctx.measureText(badgeText).width + 12;
      var badgeX = Math.min(Math.max(nowX - badgeW / 2, padding.left), padding.left + plotW - badgeW);
      ctx.fillStyle = accentColor;
      ctx.fillRect(badgeX, padding.top, badgeW, 16);
      ctx.fillStyle = "#06090c";
      ctx.fillText(badgeText, badgeX + 6, padding.top + 12);
    }
  }

  return { draw: draw };
})();
