/* ============================================================
   BolsaGT — Configuración de Supabase
   ============================================================
   Deja ambos campos vacíos ("") para correr en MODO DEMO LOCAL:
   sin login, todo en localStorage del navegador (como antes).

   Complétalos con los datos de tu proyecto de Supabase para activar
   el MODO INSTITUCIÓN: login por código enviado al correo + cada
   estudiante ve solo su propio portafolio, persistido en la nube.

   Dónde encontrarlos: en tu proyecto de Supabase →
   Project Settings → API → "Project URL" y "anon public" key.
   (La anon key es pública/segura de exponer en el frontend: el
   aislamiento real de datos lo da Row Level Security en la base,
   no el secreto de esta key — por eso NO se necesita backend propio.)
   ============================================================ */

var SUPABASE_CONFIG = {
  url: "https://cgigqgsonhxyofvcfedf.supabase.co",      // p.ej. ""
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnaWdxZ3Nvbmh4eW9mdmNmZWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2OTY4NTUsImV4cCI6MjA5OTI3Mjg1NX0.K-3E1HFYseJc3ohQi2u-MCT7aEcxzOS0CKF50rc1IdU"   // p.ej. ""
};
