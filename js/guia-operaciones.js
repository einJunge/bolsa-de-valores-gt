/* =========================================================
   guia-operaciones.js
   Guía de uso de operaciones para nuevos usuarios
   Sistema: bolsagt-vanilla
   Componente 100% vanilla JS (sin dependencias)
   ========================================================= */

(function () {
  "use strict";

  const STORAGE_KEY = "bolsagt_guia_vista";

  const SECCIONES = [
    {
      id: "intro",
      titulo: "Bienvenida",
      icono: "👋",
      contenido: `
        <h3>Bienvenido a BolsaGT</h3>
        <p>Esta plataforma simula un mercado de valores completo: acciones, commodities y
        opciones, con un mapa de operaciones en tiempo real y reportes de resultados.</p>
        <ul>
          <li><strong>Dashboard:</strong> resumen de tu cartera, saldo disponible y rendimiento.</li>
          <li><strong>Mercado:</strong> lista de instrumentos (acciones, commodities, opciones).</li>
          <li><strong>Mapa de operaciones:</strong> visualización en vivo de tus posiciones abiertas.</li>
          <li><strong>Reportes:</strong> descarga de pérdidas y ganancias en PDF o CSV.</li>
        </ul>
        <p>Usa el botón <em>“?”</em> en cualquier momento para volver a abrir esta guía.</p>
      `,
    },
    {
      id: "acciones",
      titulo: "Comprar / Vender acciones",
      icono: "📈",
      contenido: `
        <h3>Operar acciones</h3>
        <ol>
          <li>Selecciona el instrumento en la lista de <strong>Mercado</strong>.</li>
          <li>Elige <strong>Comprar</strong> (posición larga) o <strong>Vender</strong> (posición corta).</li>
          <li>Define la cantidad de unidades o el monto a invertir.</li>
          <li>Confirma la orden: se ejecuta al precio de mercado vigente.</li>
          <li>La posición aparece de inmediato en tu <strong>Dashboard</strong> y en el <strong>Mapa de operaciones</strong>.</li>
        </ol>
        <p><strong>Cerrar posición:</strong> desde “Mis posiciones”, selecciona la operación y pulsa
        <em>Cerrar</em> para materializar la ganancia o pérdida.</p>
      `,
    },
    {
      id: "commodities",
      titulo: "Commodities",
      icono: "🛢️",
      contenido: `
        <h3>Operar commodities</h3>
        <p>Los commodities (oro, petróleo, granos, etc.) se operan igual que las acciones, pero
        suelen tener mayor volatilidad y requieren margen.</p>
        <ol>
          <li>Ve a la pestaña <strong>Commodities</strong> dentro del Mercado.</li>
          <li>Revisa el precio spot y la tendencia reciente antes de operar.</li>
          <li>Define tamaño de la posición y, si aplica, el apalancamiento.</li>
          <li>Confirma la orden; el margen requerido se descuenta de tu saldo disponible.</li>
        </ol>
        <p><strong>Recomendación:</strong> usa órdenes de stop-loss cuando el instrumento sea volátil.</p>
      `,
    },
    {
      id: "opciones",
      titulo: "Opciones (corto/largo plazo)",
      icono: "⏱️",
      contenido: `
        <h3>Trading de opciones</h3>
        <p>Las opciones te permiten apostar por la dirección del precio en un plazo definido.</p>
        <ul>
          <li><strong>Corto plazo:</strong> vencimientos en minutos/horas; ideal para movimientos rápidos.</li>
          <li><strong>Largo plazo:</strong> vencimientos en días/semanas; permite estrategias de tendencia.</li>
        </ul>
        <ol>
          <li>Selecciona el activo subyacente.</li>
          <li>Elige dirección: <strong>Sube (Call)</strong> o <strong>Baja (Put)</strong>.</li>
          <li>Define el monto invertido y el tiempo de expiración.</li>
          <li>Al vencer, el sistema liquida automáticamente ganancia o pérdida según el resultado.</li>
        </ol>
      `,
    },
    {
      id: "mapa",
      titulo: "Mapa de operaciones",
      icono: "🗺️",
      contenido: `
        <h3>Mapa de operaciones en tiempo real</h3>
        <p>Visualiza todas tus posiciones abiertas como puntos sobre el mapa/gráfico en vivo,
        similar a plataformas como MetaTrader o IQ Option.</p>
        <ul>
          <li><span style="color:#2ecc71">Verde</span>: operación en ganancia.</li>
          <li><span style="color:#e74c3c">Rojo</span>: operación en pérdida.</li>
          <li>El tamaño del punto/línea refleja el monto invertido.</li>
          <li>Haz clic sobre una operación en el mapa para ver su detalle o cerrarla directamente.</li>
        </ul>
      `,
    },
    {
      id: "reportes",
      titulo: "Reportes P&L",
      icono: "📄",
      contenido: `
        <h3>Reportes de pérdidas y ganancias</h3>
        <ol>
          <li>Ve a la sección <strong>Reportes</strong>.</li>
          <li>Selecciona el rango de fechas y, si quieres, el tipo de instrumento.</li>
          <li>Elige el formato de descarga: <strong>PDF</strong> (resumen visual) o <strong>CSV</strong> (datos detallados).</li>
          <li>Descarga el archivo generado con el detalle de cada operación cerrada.</li>
        </ol>
        <p>Usa estos reportes para llevar control de tu desempeño y ajustar tu estrategia.</p>
      `,
    },
  ];

  function crearEstilos() {
    const style = document.createElement("style");
    style.textContent = `
      #bolsagt-guia-btn {
        position: fixed; bottom: 20px; right: 20px; z-index: 99998;
        width: 48px; height: 48px; border-radius: 50%;
        background: #1abc9c; color: #fff; font-size: 22px; font-weight: bold;
        border: none; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,.4);
        display: flex; align-items: center; justify-content: center;
      }
      #bolsagt-guia-btn:hover { background: #16a085; }
      #bolsagt-guia-overlay {
        position: fixed; inset: 0; background: rgba(0,0,0,.65);
        z-index: 99999; display: flex; align-items: center; justify-content: center;
        font-family: 'Segoe UI', Arial, sans-serif;
      }
      #bolsagt-guia-modal {
        background: #10151c; color: #e8ecf1; width: 90%; max-width: 780px;
        max-height: 85vh; border-radius: 10px; overflow: hidden;
        display: flex; flex-direction: column; box-shadow: 0 10px 40px rgba(0,0,0,.6);
        border: 1px solid #1abc9c33;
      }
      #bolsagt-guia-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 16px 20px; border-bottom: 1px solid #223;
        background: #0d1117;
      }
      #bolsagt-guia-header h2 { margin: 0; font-size: 18px; color: #1abc9c; }
      #bolsagt-guia-close {
        background: none; border: none; color: #aab; font-size: 22px; cursor: pointer;
      }
      #bolsagt-guia-tabs {
        display: flex; flex-wrap: wrap; gap: 6px; padding: 12px 16px;
        background: #0d1117; border-bottom: 1px solid #223;
      }
      .bolsagt-tab {
        background: #182230; color: #cbd3dd; border: 1px solid #223;
        padding: 6px 12px; border-radius: 20px; font-size: 13px; cursor: pointer;
      }
      .bolsagt-tab.activo { background: #1abc9c; color: #05201a; font-weight: 600; }
      #bolsagt-guia-body { padding: 20px 24px; overflow-y: auto; line-height: 1.5; }
      #bolsagt-guia-body h3 { color: #1abc9c; margin-top: 0; }
      #bolsagt-guia-body ul, #bolsagt-guia-body ol { padding-left: 20px; }
      #bolsagt-guia-footer {
        display: flex; align-items: center; justify-content: space-between;
        padding: 12px 20px; border-top: 1px solid #223; background: #0d1117;
        font-size: 13px; color: #9aa4b2;
      }
      #bolsagt-guia-footer label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
    `;
    document.head.appendChild(style);
  }

  function crearBotonFlotante() {
    const btn = document.createElement("button");
    btn.id = "bolsagt-guia-btn";
    btn.title = "Guía de uso de operaciones";
    btn.textContent = "?";
    btn.addEventListener("click", () => abrirGuia());
    document.body.appendChild(btn);
  }

  function renderSeccion(id) {
    const seccion = SECCIONES.find((s) => s.id === id) || SECCIONES[0];
    const body = document.getElementById("bolsagt-guia-body");
    if (body) body.innerHTML = seccion.contenido;
    document.querySelectorAll(".bolsagt-tab").forEach((tab) => {
      tab.classList.toggle("activo", tab.dataset.id === id);
    });
  }

  function abrirGuia() {
    if (document.getElementById("bolsagt-guia-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "bolsagt-guia-overlay";

    const tabsHtml = SECCIONES.map(
      (s, i) =>
        `<button class="bolsagt-tab${i === 0 ? " activo" : ""}" data-id="${s.id}">${s.icono} ${s.titulo}</button>`
    ).join("");

    overlay.innerHTML = `
      <div id="bolsagt-guia-modal">
        <div id="bolsagt-guia-header">
          <h2>📘 Guía de operaciones — BolsaGT</h2>
          <button id="bolsagt-guia-close">&times;</button>
        </div>
        <div id="bolsagt-guia-tabs">${tabsHtml}</div>
        <div id="bolsagt-guia-body"></div>
        <div id="bolsagt-guia-footer">
          <label>
            <input type="checkbox" id="bolsagt-guia-no-mostrar" />
            No mostrar automáticamente de nuevo
          </label>
          <span>Puedes reabrir esta guía con el botón "?"</span>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    renderSeccion(SECCIONES[0].id);

    document.querySelectorAll(".bolsagt-tab").forEach((tab) => {
      tab.addEventListener("click", () => renderSeccion(tab.dataset.id));
    });

    document.getElementById("bolsagt-guia-close").addEventListener("click", cerrarGuia);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cerrarGuia();
    });

    const noMostrar = document.getElementById("bolsagt-guia-no-mostrar");
    noMostrar.checked = localStorage.getItem(STORAGE_KEY) === "true";
    noMostrar.addEventListener("change", () => {
      localStorage.setItem(STORAGE_KEY, noMostrar.checked ? "true" : "false");
    });
  }

  function cerrarGuia() {
    const overlay = document.getElementById("bolsagt-guia-overlay");
    if (overlay) overlay.remove();
  }

  function init() {
    crearEstilos();
    crearBotonFlotante();
    const yaVista = localStorage.getItem(STORAGE_KEY) === "true";
    if (!yaVista) {
      setTimeout(abrirGuia, 600);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.BolsaGTGuia = { abrir: abrirGuia, cerrar: cerrarGuia };
})();
