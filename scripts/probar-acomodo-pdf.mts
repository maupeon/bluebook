// Pruebas de src/lib/acomodoEnPdf.ts: el PDF que el asistente manda por WhatsApp.
//
//   node --experimental-strip-types --import ./scripts/alias.mjs scripts/probar-acomodo-pdf.mts
//
// Lee el texto de cada PDF con pdftotext (poppler); sin él, sólo revisa que
// abra. Con GUARDAR=<carpeta> deja ahí los PDF para verlos.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { acomodoEnPdf, type AcomodoParaPdf } from "@/lib/acomodoEnPdf";
import {
  colocarFaltantes,
  planoInicial,
  sumarAcomodo,
  type AsientoDelSalon,
  type GrupoDelSalon,
  type MesaDelSalon,
  type Plano,
} from "@/lib/plano";

const carpeta = process.env.GUARDAR || mkdtempSync(join(tmpdir(), "acomodo-"));
let pdftotext = true;
try {
  execFileSync("pdftotext", ["-v"], { stdio: "ignore" });
} catch {
  pdftotext = false;
}

async function hacer(nombre: string, a: AcomodoParaPdf) {
  const r = await acomodoEnPdf(a);
  const ruta = join(carpeta, `${nombre}.pdf`);
  writeFileSync(ruta, r.pdf);
  const doc = await PDFDocument.load(r.pdf);
  const texto = pdftotext ? execFileSync("pdftotext", ["-layout", ruta, "-"]).toString() : "";
  const primera = pdftotext ? execFileSync("pdftotext", ["-f", "1", "-l", "1", ruta, "-"]).toString() : "";
  return { ...r, doc, texto, primera, ruta };
}

let ok = 0;
const caso = async (nombre: string, fn: () => Promise<void>) => {
  await fn();
  ok++;
  console.log("✓", nombre);
};

// ----- Datos de prueba -----

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function boda(nMesas: number, porMesa: number, extras?: Partial<AcomodoParaPdf>): AcomodoParaPdf {
  const mesas: MesaDelSalon[] = Array.from({ length: nMesas }, (_, i) => ({
    id: uuid(i + 1),
    label: String(i + 1),
    capacity: 10,
    zone: null,
  }));
  const asientos: AsientoDelSalon[] = [];
  const grupos: GrupoDelSalon[] = [];
  let k = 1000;
  for (const m of mesas) {
    for (let j = 0; j < porMesa; j++) {
      const membershipId = uuid(++k);
      grupos.push({
        membershipId,
        nombre: `Invitado ${k}`,
        confirmation: "confirmed",
        boletos: 1,
        confirmadas: 1,
        canceladas: 0,
        lado: null,
        dieta: "Sin gluten (celiaquía)",
      });
      asientos.push({ id: uuid(++k), tableId: m.id, nombre: `Invitado ${k - 1}`, pax: 1, membershipId, silla: null });
    }
  }
  const { porMesa: pax } = sumarAcomodo(asientos);
  const plano = colocarFaltantes(
    planoInicial(mesas.length),
    mesas.map((m) => ({ id: m.id, capacity: m.capacity, pax: pax.get(m.id) ?? 0 }))
  );
  return {
    boda: { nombre: "Lu & Toño", detalle: "14 mar 2027 · Hacienda Los Arcos" },
    hoy: "30 de septiembre de 2026",
    plano,
    planoDibujado: false,
    mesas,
    asientos,
    grupos,
    ...extras,
  };
}

await caso("una boda chica: el plano, quién va en cada mesa y la puerta, sin dietas", async () => {
  const a = boda(3, 4);
  const r = await hacer("chica", a);
  assert.equal(r.resumen.mesas, 3);
  assert.equal(r.resumen.lugares, 30);
  assert.equal(r.resumen.sentadas, 12);
  assert.equal(r.resumen.porSentar, 0);
  assert.equal(r.doc.getPageCount(), 3);
  assert.equal(r.resumen.paginas, 3);
  const [ancho, alto] = [r.doc.getPage(0).getWidth(), r.doc.getPage(0).getHeight()];
  assert.ok(ancho > alto, "el plano va en hoja horizontal");
  assert.ok(r.doc.getPage(1).getHeight() > r.doc.getPage(1).getWidth(), "las listas, en vertical");
  if (pdftotext) {
    assert.match(r.primera, /PLANO DE MESAS/);
    assert.match(r.primera, /Lu & Toño/);
    assert.match(r.primera, /3 mesas · 30 lugares/);
    assert.match(r.primera, /12 personas sentadas/);
    assert.match(r.primera, /Al 30 de septiembre de 2026/);
    assert.match(r.primera, /Todavía no dibujan su salón/);
    assert.match(r.primera, /PISTA DE BAILE/);
    assert.match(r.primera, /4\/10/);
    assert.match(r.texto, /Quién va en cada mesa/);
    assert.match(r.texto, /Mesa 2/);
    assert.match(r.texto, /Lista de la puerta/);
    assert.match(r.texto, /Página 3 de 3/);
    assert.doesNotMatch(r.texto, /gluten|celiaqu/i, "la dieta no viaja por WhatsApp");
  }
});

await caso("un plano dibujado: mesas giradas, rectangular, elementos, silla elegida y sobrecupo", async () => {
  const a = boda(4, 3);
  const [m1, m2, m3, m4] = a.mesas;
  m2.label = "Novios";
  m2.capacity = 4;
  m3.zone = "Terraza";
  m4.capacity = 2; // tres personas en una de dos: sobrecupo
  a.asientos.find((s) => s.tableId === m1.id)!.silla = 1;
  const plano: Plano = {
    ancho: 1800,
    largo: 1200,
    mesas: {
      [m1.id]: { x: 300, y: 300, forma: "redonda", giro: 0 },
      [m2.id]: { x: 900, y: 200, forma: "rectangular", giro: 0 },
      [m3.id]: { x: 1400, y: 700, forma: "cuadrada", giro: 45 },
      [m4.id]: { x: 400, y: 900, forma: "rectangular", giro: 90 },
    },
    elementos: [
      { id: "pista-1", tipo: "pista", x: 900, y: 650, ancho: 500, largo: 500, giro: 0 },
      { id: "barra-1", tipo: "barra", x: 1650, y: 250, ancho: 400, largo: 100, giro: 90 },
      { id: "entrada-1", tipo: "entrada", x: 900, y: 1180, ancho: 250, largo: 40, giro: 0 },
    ],
  };
  const r = await hacer("dibujado", { ...a, plano, planoDibujado: true });
  if (pdftotext) {
    assert.doesNotMatch(r.primera, /Todavía no dibujan/);
    assert.match(r.primera, /18 m/);
    assert.match(r.primera, /12 m/);
    assert.match(r.primera, /Novios/);
    assert.match(r.primera, /3\/2/);
    assert.match(r.primera, /BARRA/);
    assert.match(r.texto, /sobrecupo/);
    assert.match(r.texto, /Terraza/);
    assert.match(r.texto, /Novios/);
    assert.match(r.texto, /silla 1/);
  }
});

await caso("quien falta por sentar sale al final, primero los que ya dijeron que sí", async () => {
  const a = boda(2, 2);
  a.grupos.push(
    { membershipId: uuid(1), nombre: "Zoe Ruiz", confirmation: "confirmed", boletos: 2, confirmadas: 2, canceladas: 0, lado: null, dieta: null },
    { membershipId: uuid(2), nombre: "Ana Pérez", confirmation: "pending", boletos: 3, confirmadas: 0, canceladas: 1, lado: null, dieta: null }
  );
  a.asientos.push({ id: uuid(3), tableId: null, nombre: "Tía Rosa · 1", pax: 1, membershipId: null, silla: null });
  const r = await hacer("por-sentar", a);
  assert.equal(r.resumen.porSentar, 5);
  if (pdftotext) {
    assert.match(r.primera, /4 personas sentadas · 5 por sentar/);
    assert.match(r.texto, /Todavía sin mesa/);
    const zoe = r.texto.indexOf("Zoe Ruiz");
    const ana = r.texto.indexOf("Ana Pérez · sin contestar");
    assert.ok(zoe > 0 && ana > zoe, "confirmados antes de los que no contestan");
    assert.match(r.texto, /Sin mesa/);
  }
});

await caso("nombres con emojis, saltos de renglón y otros alfabetos no truenan", async () => {
  const a = boda(1, 3);
  a.boda.nombre = "Lu 💍 Toño\nboda";
  a.asientos[0].nombre = "Łukasz Ștefan 🎉";
  a.asientos[1].nombre = "李雷";
  a.asientos[2].nombre = "Ñoño Güero «el Chato»";
  a.mesas[0].label = "Mesa 🌸 VIP";
  const r = await hacer("raros", a);
  if (pdftotext) {
    assert.match(r.texto, /Lukasz Stefan/);
    assert.match(r.texto, /Ñoño Güero «el Chato»/);
    assert.match(r.texto, /\(otro alfabeto\)/);
    assert.match(r.primera, /Lu Toño boda/);
    assert.doesNotMatch(r.texto, /💍|🎉|🌸/u);
  }
});

await caso("una mesa que se llama sólo con emojis no se queda sin nombre", async () => {
  const a = boda(2, 1);
  a.mesas[0].label = "💍";
  a.mesas[1].label = "🌸🌸";
  const r = await hacer("mesa-emoji", a);
  if (pdftotext) {
    assert.match(r.texto, /Mesa sin nombre/);
    assert.match(r.primera, /\?/);
  }
});

await caso("un nombre larguísimo se corta con «…» en vez de encimarse", async () => {
  const a = boda(1, 1);
  a.asientos[0].nombre = "María de los Ángeles Guadalupe Fernández de la Concepción y Santibáñez Ortiz";
  const r = await hacer("largo", a);
  if (pdftotext) assert.match(r.texto, /María de los Ángeles.*…/);
});

await caso("una boda grande pasa a varias hojas y las numera", async () => {
  const a = boda(60, 10);
  const r = await hacer("grande", a);
  assert.equal(r.resumen.sentadas, 600);
  assert.ok(r.doc.getPageCount() >= 6, `hojas: ${r.doc.getPageCount()}`);
  if (pdftotext) {
    assert.match(r.texto, /Mesa 60/);
    assert.match(r.texto, /Quién va en cada mesa \(sigue\)/);
    assert.match(r.texto, /Lista de la puerta \(sigue\)/);
    assert.match(r.texto, new RegExp(`Página ${r.doc.getPageCount()} de ${r.doc.getPageCount()}`));
  }
});

await caso("una mesa con más gente de la que cabe en una columna se parte con «(sigue)»", async () => {
  const a = boda(1, 0);
  a.mesas[0].capacity = null;
  for (let i = 0; i < 80; i++) {
    a.asientos.push({ id: uuid(5000 + i), tableId: a.mesas[0].id, nombre: `Persona ${i + 1}`, pax: 1, membershipId: null, silla: null });
  }
  const r = await hacer("mesa-enorme", a);
  if (pdftotext) {
    assert.match(r.texto, /Mesa 1 \(sigue\)/);
    assert.match(r.texto, /Persona 80/);
  }
});

if (!process.env.GUARDAR) rmSync(carpeta, { recursive: true, force: true });
console.log(`\n${ok} casos bien${pdftotext ? "" : " (sin pdftotext: sólo se revisó que abran)"}`);
