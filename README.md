# Bolsa de Valores GT — versión HTML/CSS/JS puro

Misma interfaz y funcionalidades que la versión con backend (React + Node +
Postgres), pero sin ninguna de esas piezas: **solo 3 tipos de archivo — `.html`,
`.css`, `.js` — sin Node, sin build, sin servidor, sin base de datos.**

## Cómo usarlo

**Opción más simple:** doble clic en `index.html`. Ya está — abre en tu
navegador y funciona completo (precios en vivo simulados, compra/venta,
opciones, portafolio, historial, informe PDF).

**Si prefieres verlo por un servidor local** (opcional, no es necesario):
```bash
npx serve .
# o
python3 -m http.server 8000
```

## Qué incluye

- **Motor de precios en vivo**: random walk en el navegador (`setInterval`
  cada 1s), igual que el motor del backend — acciones, commodities y forex.
- **Mercado (Inversión)**: compra/venta real de acciones, commodities y forex
  a corto y largo plazo — órdenes market y limit, posiciones que se mantienen
  y acumulan P&L mientras las sostengas. Es el modo "comprar y mantener".
- **Opciones Blitz (sube/baja cronometrado)**: modo de apuesta con cuenta
  regresiva, al estilo de las plataformas de opciones binarias — eliges un
  instrumento, un monto, una duración (15s a 5m) y predices si el precio
  sube o baja antes de que termine el conteo. Si aciertas, ganas el % de
  beneficio pactado; si no, pierdes lo invertido. El gráfico dibuja la línea
  de entrada y la cuenta regresiva en tiempo real, y hay un botón de "cerrar
  ahora" con un valor de recompra estimado. Es un modo independiente del de
  Mercado: no genera posiciones ni afecta tus acciones/commodities/forex.
- **Portafolio y P&L en tiempo real**, historial de operaciones (incluye una
  tabla aparte para las apuestas Blitz), y el mismo **informe de inversión en
  PDF** (portada personalizable, KPIs, gráficas de asignación y P&L, tablas,
  metodología y conclusiones — ahora también con una sección de resultados
  Blitz) — generado en el navegador con [jsPDF](https://github.com/parallax/jsPDF) vía CDN.
  **Los datos (números, símbolos, operaciones) son siempre los reales del
  portafolio, pero la redacción del texto (resumen ejecutivo, hallazgos,
  conclusiones, metodología, subtítulo de portada) se arma combinando varias
  formas distintas de decir lo mismo — cada descarga produce una redacción
  distinta, para que dos estudiantes con resultados parecidos no entreguen
  informes con el texto idéntico.** Ver `js/report.js` (banco de frases al
  inicio del archivo) si quieres agregar más variantes.
- **Gráfico de velas** dibujado a mano sobre `<canvas>`, sin librerías de
  charting.

## Cómo se guarda el estado

**En modo demo local** (por defecto), todo el portafolio (cash, posiciones,
historial de órdenes, apuestas Blitz) vive en `localStorage` del navegador,
bajo la clave `bolsagt_portfolio_v2`. Eso significa:
- Persiste entre recargas de página, en ese mismo navegador/dispositivo.
- **No** se sincroniza entre dispositivos ni navegadores distintos (no hay
  cuenta de usuario en este modo — es intencional, para mantenerlo simple).
- Hay un botón **Reiniciar** en la esquina superior derecha para borrar todo
  y volver a empezar con $100,000 virtuales.

**Para persistencia real por estudiante, sincronizada en la nube**, activa
el modo institución con Supabase — ver la sección
[Modo demo local vs. modo institución](#modo-demo-local-vs-modo-institución-login--supabase)
más abajo.

## Dependencias externas

Tres, cargadas por `<script>`/`<link>` desde CDN (no hay `npm install`):
- Google Fonts (IBM Plex Mono, Inter, Space Grotesk) — puramente visual.
- [jsPDF](https://cdnjs.com/libraries/jspdf) + jspdf-autotable — solo se usan
  al generar el informe PDF.
- [supabase-js](https://github.com/supabase/supabase-js) — solo se usa si
  configuras `js/config.js` (ver sección siguiente). Sin configurar, la app
  no la necesita y corre 100% local.

Si no tienes internet, la app funciona igual en modo demo local (precios,
órdenes, portafolio), excepto la descarga del PDF y, obviamente, el login
por Supabase — ambos necesitan red.

## Modo demo local vs. modo institución (login + Supabase)

La app tiene dos modos, controlados por un solo archivo: `js/config.js`.

**Modo demo local (por defecto, `js/config.js` vacío):** sin login, todo en
`localStorage` del navegador — tal como se describe arriba. Ideal para
probar la app o para uso individual.

**Modo institución (con Supabase configurado):** cada estudiante inicia
sesión con su correo (código de 6 dígitos, sin contraseña) y su portafolio
completo — cash, posiciones, historial de órdenes, apuestas Blitz — se
guarda en la nube, aislado del resto de estudiantes. Así puedes dar el mismo
link a todo el curso y cada quien ve solo lo suyo.

### Cómo activar el modo institución

**1. Crea un proyecto en Supabase**
[supabase.com](https://supabase.com) → New Project (el plan gratuito alcanza
perfectamente para esto).

**2. Corre el esquema SQL**
Dashboard de tu proyecto → **SQL Editor** → New query → pega todo el
contenido de [`supabase-schema.sql`](./supabase-schema.sql) (incluido en este
proyecto) → **Run**. Esto crea la tabla `user_portfolios` con Row Level
Security, que es lo que garantiza que cada estudiante solo pueda leer/escribir
su propia fila — el aislamiento real vive en la base de datos, no en el
frontend.

**3. Configura que el correo envíe un código, no un link mágico**
Por defecto, Supabase envía un link para hacer clic. Para que sea un
**código que el estudiante escribe** (como pediste), hay que ajustar la
plantilla de correo:
- Dashboard → **Authentication** → **Email Templates** → **Magic Link**
- En el cuerpo del correo, asegúrate de que aparezca `{{ .Token }}` (el
  código de 6 dígitos) de forma visible — puedes editar el HTML de la
  plantilla para mostrarlo en grande y quitar o dejar el link, como
  prefieras. Ejemplo mínimo de cuerpo:
  ```html
  <h2>Tu código de acceso a BolsaGT</h2>
  <p style="font-size:32px; letter-spacing:6px;"><strong>{{ .Token }}</strong></p>
  <p>Este código expira en 60 minutos.</p>
  ```
- Guarda los cambios.

**4. Copia tu URL y anon key**
Dashboard → **Project Settings** → **API** → copia **Project URL** y la key
**anon public**. Pégalas en `js/config.js`:
```js
var SUPABASE_CONFIG = {
  url: "https://tuproyecto.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
};
```

**5. Listo.** Recarga la app — ahora pide login por código antes de mostrar
nada, y cada estudiante que entre por primera vez arranca automáticamente
con $100,000 virtuales, guardados ya en su propia fila de Supabase.

### Notas sobre el modo institución

- **Guardado con debounce:** las acciones del estudiante (comprar, vender,
  apostar) se reflejan al instante en su pantalla, y se sincronizan a
  Supabase ~0.7s después (para no saturar la API si hace varias acciones
  seguidas muy rápido). También se fuerza un guardado inmediato al cambiar
  de pestaña o cerrar el navegador, como mejor esfuerzo.
- **Límite de correos del plan gratuito:** el SMTP por defecto de Supabase
  tiene un límite bajo de correos por hora, pensado para pruebas. Para un
  curso completo usándolo el mismo día, considera configurar tu propio SMTP
  (Dashboard → Authentication → SMTP Settings — Gmail, SendGrid, etc. sirven)
  para no toparte con el límite.
- **Vista para el catedrático:** el esquema SQL incluye una vista
  `admin_class_overview` que puedes consultar desde el SQL Editor de
  Supabase (con tu propio usuario, no expuesta a los estudiantes) para ver
  de un vistazo el cash, posiciones y operaciones de todo el curso.
- Si más adelante quieres quitar el login (volver a modo demo local), basta
  con vaciar de nuevo `js/config.js`.

## Dónde subirlo para que quede en la web

Sigue siendo un sitio 100% estático (Supabase se llama desde el navegador vía
CDN, no necesitas tu propio servidor) — cualquiera de estas opciones sirve,
arrastrando la carpeta completa:
- **[Netlify Drop](https://app.netlify.com/drop)** — arrastra la carpeta, listo, sin cuenta.
- **GitHub Pages** — sube estos archivos/carpeta a un repo, actívalo en
  Settings → Pages.
- **Vercel / Cloudflare Pages** — importa el repo, sin build command (es
  contenido estático).

Si vas a usar el modo institución, completa `js/config.js` con tus
credenciales de Supabase **antes** de subir/desplegar (o edítalo directo en
el hosting después). No necesitas Fly.io ni Railway — solo Supabase para
auth + base de datos, y cualquiera de los hostings de arriba para los
archivos estáticos.

## Diferencias intencionales vs. la versión con backend

- En modo demo local: sin multiusuario/autenticación, sin persistencia
  compartida entre dispositivos (localStorage es por navegador). En modo
  institución (Supabase configurado) sí hay login y persistencia por
  estudiante, aislada vía Row Level Security — ver la sección de arriba.
- Los datos de mercado son simulados igual que en la versión con backend
  (no hay conexión a una API real de mercado en ninguna de las dos
  versiones, por ahora).
