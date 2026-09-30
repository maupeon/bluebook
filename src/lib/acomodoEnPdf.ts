import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import {
  ELEMENTOS,
  SILLA,
  lugaresParaDibujar,
  medidasDeMesa,
  nombreDeMesa,
  ocupacionDeSillas,
  personasEsperadas,
  sillasDeMesa,
  sumarAcomodo,
  type AsientoDelSalon,
  type GrupoDelSalon,
  type MesaDelSalon,
  type Plano,
} from "@/lib/plano";

/**
 * EL ACOMODO DE MESAS EN PDF: lo que el asistente le manda a la pareja por
 * WhatsApp cuando pide su acomodo.
 *
 * Es la misma hoja que «Imprimir el plano» (PlanoParaImprimir.tsx), dibujada
 * del lado del servidor: el plano del salón en una hoja horizontal, quién va
 * en cada mesa y la lista de la puerta. Las sillas, la ocupación y el
 * sobrecupo salen de las mismas funciones de lib/plano.ts que la pantalla:
 * el PDF nunca dice algo distinto de lo que ella ve.
 *
 * Sin las restricciones para el menú: la hoja impresa las lleva porque se
 * queda en su casa; ésta viaja por WhatsApp y el proveedor de mensajes guarda
 * una copia. Pueden revelar salud.
 *
 * Módulo puro: recibe los datos y devuelve los bytes (acomodoDeLaBoda.ts los
 * lee de la base). La letra es Helvetica, que trae todo el español; lo que
 * no cabe en ella (emojis, otros alfabetos) se quita en vez de tronar.
 */

export interface AcomodoParaPdf {
  boda: {
    nombre: string;
    /** «14 mar 2026 · Hacienda Los Arcos», ya armado. */
    detalle: string | null;
  };
  /** «30 de septiembre de 2026»: el acomodo cambia hasta el último día. */
  hoy: string;
  /** Con todas las mesas ya colocadas (colocarFaltantes). */
  plano: Plano;
  /** false = no han dibujado su salón: el plano es el acomodo automático. */
  planoDibujado: boolean;
  mesas: MesaDelSalon[];
  asientos: AsientoDelSalon[];
  grupos: GrupoDelSalon[];
}

export interface ResumenDelAcomodo {
  mesas: number;
  lugares: number;
  sentadas: number;
  porSentar: number;
  paginas: number;
}

// ----- La marca (globals.css) -----

function hex(h: string): RGB {
  return rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
}

const COLOR = {
  papel: hex("#e8edf8"),
  niebla: hex("#f4f5f6"),
  tinta: hex("#55688c"),
  noche: hex("#2e3a55"),
  linea: hex("#c6d0e4"),
  papelMedio: hex("#eef1f7"),
  lineaControl: hex("#7788a8"),
  error: hex("#9a4b37"),
};

/** Carta, en puntos. */
const HORIZONTAL: [number, number] = [792, 612];
const VERTICAL: [number, number] = [612, 792];
const MARGEN = 36;
/** Margen alrededor del salón, en cm: para las sillas de la orilla y las cotas (igual que la pantalla). */
const AIRE = 90;

function acotar(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function metros(cm: number): string {
  return `${(cm / 100).toLocaleString("es-MX", { maximumFractionDigits: 1 })} m`;
}

function comparable(nombre: string): string {
  return nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function porNombre(a: string, b: string): number {
  return a.localeCompare(b, "es", { sensitivity: "base" });
}

// ----- La letra -----

/** Letras con trazo que no se descomponen en letra + acento. */
const SIN_TRAZO: Record<string, string> = {
  Ł: "L",
  ł: "l",
  Ø: "O",
  ø: "o",
  Đ: "D",
  đ: "d",
  Ħ: "H",
  ħ: "h",
  ı: "i",
};

class Letra {
  readonly normal: PDFFont;
  readonly negrita: PDFFont;
  private permitidos: Set<number>;

  constructor(normal: PDFFont, negrita: PDFFont) {
    this.normal = normal;
    this.negrita = negrita;
    this.permitidos = new Set(normal.getCharacterSet());
  }

  /** Sólo lo que Helvetica sabe dibujar: «Ñoño» sí, un emoji o un salto de renglón no. */
  /** `respaldo`: lo que va si no queda nada que dibujar (una mesa que se llama «💍»). */
  limpiar(texto: string, respaldo?: string): string {
    let fuera = "";
    for (const c of (texto ?? "").normalize("NFC")) {
      if (this.permitidos.has(c.codePointAt(0) ?? 0)) {
        fuera += c;
        continue;
      }
      // «ș» o «Ł»: la letra sin su marca antes que perderla.
      const base = SIN_TRAZO[c] ?? c.normalize("NFD").replace(/[̀-ͯ]/g, "");
      if (base && [...base].every((b) => this.permitidos.has(b.codePointAt(0) ?? 0))) fuera += base;
      else if (/\s/.test(c)) fuera += " ";
    }
    const limpio = fuera.replace(/\s+/g, " ").trim();
    // Un nombre escrito todo en otro alfabeto no se queda en blanco en la lista.
    return limpio || respaldo || (/\p{L}/u.test(texto ?? "") ? "(otro alfabeto)" : "");
  }

  ancho(texto: string, tam: number, negrita = false): number {
    return (negrita ? this.negrita : this.normal).widthOfTextAtSize(texto, tam);
  }

  /** Corta con «…» lo que no cabe en `max` puntos. */
  ajustar(texto: string, tam: number, max: number, negrita = false): string {
    if (this.ancho(texto, tam, negrita) <= max) return texto;
    let corto = texto;
    while (corto.length > 1 && this.ancho(`${corto}…`, tam, negrita) > max) corto = corto.slice(0, -1);
    return `${corto.trimEnd()}…`;
  }
}

function escribir(
  page: PDFPage,
  letra: Letra,
  texto: string,
  x: number,
  y: number,
  o: { tam: number; color?: RGB; negrita?: boolean; alinear?: "inicio" | "centro" | "fin"; max?: number }
): void {
  let t = letra.limpiar(texto);
  if (!t) return;
  if (o.max) t = letra.ajustar(t, o.tam, o.max, o.negrita);
  const ancho = letra.ancho(t, o.tam, o.negrita);
  const dx = o.alinear === "centro" ? -ancho / 2 : o.alinear === "fin" ? -ancho : 0;
  page.drawText(t, {
    x: x + dx,
    y,
    size: o.tam,
    font: o.negrita ? letra.negrita : letra.normal,
    color: o.color ?? COLOR.noche,
  });
}

function pie(page: PDFPage, letra: Letra, boda: string, n: number, total: number): void {
  const ancho = page.getWidth();
  escribir(page, letra, `BlueBook · ${boda}`, MARGEN, 20, { tam: 7, color: COLOR.tinta, max: ancho / 2 });
  escribir(page, letra, `Página ${n} de ${total}`, ancho - MARGEN, 20, { tam: 7, color: COLOR.tinta, alinear: "fin" });
}

// ----- Hoja 1: el plano -----

/** Un punto del plano (cm, y hacia abajo) girado `giro` grados como lo gira el SVG. */
function girar(x: number, y: number, giro: number): { x: number; y: number } {
  const a = (giro * Math.PI) / 180;
  return { x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) };
}

/** El contorno de un rectángulo centrado en (cx, cy) y girado, como trazo de SVG en cm. */
function rectanguloGirado(cx: number, cy: number, ancho: number, largo: number, giro: number): string {
  const esquinas = [
    [-ancho / 2, -largo / 2],
    [ancho / 2, -largo / 2],
    [ancho / 2, largo / 2],
    [-ancho / 2, largo / 2],
  ].map(([x, y]) => girar(x, y, giro));
  return (
    esquinas.map((p, i) => `${i === 0 ? "M" : "L"} ${(cx + p.x).toFixed(1)} ${(cy + p.y).toFixed(1)}`).join(" ") + " Z"
  );
}

function dibujarPlano(
  page: PDFPage,
  letra: Letra,
  caja: { x: number; y: number; ancho: number; alto: number },
  a: AcomodoParaPdf,
  paxPorMesa: Map<string, number>,
  asientosPorMesa: Map<string, AsientoDelSalon[]>
): void {
  const { ancho, largo } = a.plano;
  const vista = { ancho: ancho + AIRE * 2, largo: largo + AIRE * 2 };
  const s = Math.min(caja.ancho / vista.ancho, caja.alto / vista.largo);
  // Dónde cae el (0, 0) del salón en la hoja: el dibujo va centrado en la caja.
  const x0 = caja.x + (caja.ancho - vista.ancho * s) / 2 + AIRE * s;
  const yArriba = caja.y + caja.alto - (caja.alto - vista.largo * s) / 2 - AIRE * s;
  const P = (x: number, y: number) => ({ x: x0 + x * s, y: yArriba - y * s });
  /** Un trazo de SVG en cm: pdf-lib lo escala; el grosor se da en puntos de la hoja. */
  const trazo = (d: string, o: { relleno?: RGB; borde?: RGB; grosor?: number; guiones?: number[] }) =>
    page.drawSvgPath(d, {
      x: x0,
      y: yArriba,
      scale: s,
      ...(o.relleno ? { color: o.relleno } : {}),
      ...(o.borde ? { borderColor: o.borde, borderWidth: (o.grosor ?? 0.75) / s } : { borderWidth: 0 }),
      ...(o.guiones ? { borderDashArray: o.guiones.map((g) => g / s) } : {}),
    });
  const centrado = (texto: string, x: number, y: number, tam: number, color: RGB, negrita = false) => {
    const p = P(x, y);
    escribir(page, letra, texto, p.x, p.y - tam * 0.35, { tam, color, negrita, alinear: "centro" });
  };

  // El salón con su cuadrícula de un metro.
  trazo(`M 0 0 L ${ancho} 0 L ${ancho} ${largo} L 0 ${largo} Z`, { relleno: COLOR.niebla });
  let rejilla = "";
  for (let x = 100; x < ancho; x += 100) rejilla += `M ${x} 0 L ${x} ${largo} `;
  for (let y = 100; y < largo; y += 100) rejilla += `M 0 ${y} L ${ancho} ${y} `;
  if (rejilla) trazo(rejilla, { borde: COLOR.linea, grosor: 0.3 });
  trazo(`M 0 0 L ${ancho} 0 L ${ancho} ${largo} L 0 ${largo} Z`, { borde: COLOR.tinta, grosor: 1 });

  // Cotas: el ancho arriba, el largo a la izquierda y la escala de un metro.
  const tamCota = acotar(34 * s, 6, 9);
  centrado(metros(ancho), ancho / 2, -30, tamCota, COLOR.tinta);
  {
    const p = P(-30, largo / 2);
    const t = metros(largo);
    page.drawText(t, {
      x: p.x + tamCota * 0.35,
      y: p.y - letra.ancho(t, tamCota) / 2,
      size: tamCota,
      font: letra.normal,
      color: COLOR.tinta,
      rotate: degrees(90),
    });
  }
  trazo(`M 0 ${largo + 45} L 100 ${largo + 45}`, { borde: COLOR.tinta, grosor: 1 });
  {
    const p = P(115, largo + 45);
    escribir(page, letra, "1 m", p.x, p.y - tamCota * 0.35, { tam: tamCota, color: COLOR.tinta });
  }

  // Lo que no es mesa, debajo.
  for (const el of a.plano.elementos) {
    trazo(rectanguloGirado(el.x, el.y, el.ancho, el.largo, el.giro), {
      relleno: el.tipo === "pista" ? COLOR.papel : COLOR.papelMedio,
      borde: COLOR.lineaControl,
      grosor: 0.6,
      guiones: el.tipo === "pista" ? [3, 2] : undefined,
    });
    const tam = acotar(Math.min(el.ancho, el.largo) * 0.2, 22, 56) * s;
    centrado(ELEMENTOS[el.tipo].es.toUpperCase(), el.x, el.y, tam, COLOR.tinta, true);
  }

  // Las mesas, encima.
  for (const mesa of a.mesas) {
    const lugar = a.plano.mesas[mesa.id];
    if (!lugar) continue;
    const pax = paxPorMesa.get(mesa.id) ?? 0;
    const lugares = lugaresParaDibujar(mesa.capacity, pax);
    const m = medidasDeMesa(lugar.forma, lugares);
    const sobrecupo = mesa.capacity != null && pax > mesa.capacity;
    const { sillas: ocupadas } = ocupacionDeSillas(lugares, asientosPorMesa.get(mesa.id) ?? []);

    sillasDeMesa(lugar.forma, lugares).forEach((silla, i) => {
      const o = ocupadas[i];
      const llena = o?.asientoId != null;
      const g = girar(silla.x, silla.y, lugar.giro);
      const p = P(lugar.x + g.x, lugar.y + g.y);
      page.drawCircle({
        x: p.x,
        y: p.y,
        size: (SILLA / 2) * s,
        color: llena ? (sobrecupo ? COLOR.error : o.fija ? COLOR.noche : COLOR.tinta) : COLOR.niebla,
        borderColor: sobrecupo ? COLOR.error : COLOR.tinta,
        borderWidth: 0.4,
      });
    });

    const borde = sobrecupo ? COLOR.error : COLOR.tinta;
    if (lugar.forma === "redonda") {
      const p = P(lugar.x, lugar.y);
      page.drawCircle({
        x: p.x,
        y: p.y,
        size: (m.ancho / 2) * s,
        color: COLOR.niebla,
        borderColor: borde,
        borderWidth: sobrecupo ? 1.2 : 0.8,
      });
    } else {
      trazo(rectanguloGirado(lugar.x, lugar.y, m.ancho, m.largo, lugar.giro), {
        relleno: COLOR.niebla,
        borde,
        grosor: sobrecupo ? 1.2 : 0.8,
      });
    }

    // El texto no gira con la mesa: siempre se lee derecho.
    const tamBase = acotar(Math.min(m.ancho, m.largo) * 0.26, 26, 56);
    const etiqueta = letra.limpiar(/^\d+$/.test(mesa.label) ? mesa.label : [...mesa.label].slice(0, 10).join(""), "?");
    const anchoALaVista =
      lugar.giro % 180 === 0 ? m.ancho : lugar.giro % 180 === 90 ? m.largo : Math.min(m.ancho, m.largo);
    const tamNombre = Math.min(tamBase, (anchoALaVista * 0.84) / Math.max(1, etiqueta.length * 0.58));
    centrado(etiqueta, lugar.x, lugar.y - tamNombre * 0.28, tamNombre * s, COLOR.noche, true);
    centrado(
      mesa.capacity != null ? `${pax}/${mesa.capacity}` : String(pax),
      lugar.x,
      lugar.y + tamBase * 0.62,
      tamBase * 0.58 * s,
      sobrecupo ? COLOR.error : COLOR.tinta,
      sobrecupo
    );
  }
}

// ----- Las listas, en tres columnas -----

const RENGLON = 11;
const COLUMNAS = 3;
const ENTRE_COLUMNAS = 18;

class Columnas {
  private page!: PDFPage;
  private columna = 0;
  y = 0;
  readonly anchoColumna: number;
  private readonly arriba: number;
  private readonly abajo = MARGEN + 16;
  private readonly doc: PDFDocument;
  private readonly letra: Letra;
  private readonly titulo: string;
  private readonly subtitulo: string;

  constructor(doc: PDFDocument, letra: Letra, titulo: string, subtitulo: string) {
    this.doc = doc;
    this.letra = letra;
    this.titulo = titulo;
    this.subtitulo = subtitulo;
    this.anchoColumna = (VERTICAL[0] - MARGEN * 2 - ENTRE_COLUMNAS * (COLUMNAS - 1)) / COLUMNAS;
    this.arriba = VERTICAL[1] - MARGEN - 44;
    this.nuevaHoja(false);
  }

  private nuevaHoja(sigue: boolean): void {
    this.page = this.doc.addPage(VERTICAL);
    const tope = VERTICAL[1] - MARGEN;
    escribir(this.page, this.letra, sigue ? `${this.titulo} (sigue)` : this.titulo, MARGEN, tope - 14, {
      tam: 15,
      negrita: true,
    });
    escribir(this.page, this.letra, this.subtitulo, MARGEN, tope - 28, {
      tam: 8.5,
      color: COLOR.tinta,
      max: VERTICAL[0] - MARGEN * 2,
    });
    this.columna = 0;
    this.y = this.arriba;
  }

  get x(): number {
    return MARGEN + this.columna * (this.anchoColumna + ENTRE_COLUMNAS);
  }

  get hoja(): PDFPage {
    return this.page;
  }

  get altoDeColumna(): number {
    return this.arriba - this.abajo;
  }

  cabe(alto: number): boolean {
    return this.y - alto >= this.abajo;
  }

  siguienteColumna(): void {
    if (this.columna < COLUMNAS - 1) {
      this.columna += 1;
      this.y = this.arriba;
    } else {
      this.nuevaHoja(true);
    }
  }
}

function listaPorMesa(
  doc: PDFDocument,
  letra: Letra,
  a: AcomodoParaPdf,
  paxPorMesa: Map<string, number>,
  asientosPorMesa: Map<string, AsientoDelSalon[]>,
  porSentar: { nombre: string; personas: number; sinContestar: boolean }[]
): void {
  const c = new Columnas(doc, letra, "Quién va en cada mesa", a.boda.nombre);
  const encabezado = (nombre: string, derecha: string, rojo: boolean) => {
    const anchoDerecha = letra.ancho(letra.limpiar(derecha), 8, rojo);
    escribir(c.hoja, letra, nombre, c.x, c.y - 9, { tam: 9.5, negrita: true, max: c.anchoColumna - anchoDerecha - 6 });
    escribir(c.hoja, letra, derecha, c.x + c.anchoColumna, c.y - 9, {
      tam: 8,
      color: rojo ? COLOR.error : COLOR.tinta,
      negrita: rojo,
      alinear: "fin",
    });
    c.hoja.drawLine({
      start: { x: c.x, y: c.y - 13 },
      end: { x: c.x + c.anchoColumna, y: c.y - 13 },
      thickness: 0.6,
      color: COLOR.noche,
    });
    c.y -= 17;
  };
  /** Con sillas elegidas en la mesa, todos los nombres se alinean después del número. */
  const renglon = (silla: number | null, nombre: string, derecha: string, conSillas: boolean) => {
    const base = c.y - 8;
    const sangria = conSillas ? 14 : 0;
    if (silla != null) {
      escribir(c.hoja, letra, String(silla), c.x + 9, base, { tam: 7.5, color: COLOR.tinta, alinear: "fin" });
    }
    const anchoDerecha = letra.ancho(letra.limpiar(derecha), 7.5);
    escribir(c.hoja, letra, nombre, c.x + sangria, base, {
      tam: 8,
      max: c.anchoColumna - sangria - anchoDerecha - 6,
    });
    escribir(c.hoja, letra, derecha, c.x + c.anchoColumna, base, { tam: 7.5, color: COLOR.tinta, alinear: "fin" });
    c.y -= RENGLON;
  };

  const bloque = (
    titulo: string,
    derecha: string,
    rojo: boolean,
    zona: string | null,
    filas: { silla: number | null; nombre: string; derecha: string }[],
    vacio: string
  ) => {
    const alto = 17 + (zona ? 10 : 0) + Math.max(1, filas.length) * RENGLON;
    const conSillas = filas.some((f) => f.silla != null);
    // Un bloque que cabe en una columna no se parte (break-inside-avoid).
    if (!c.cabe(alto) && alto <= c.altoDeColumna) c.siguienteColumna();
    if (!c.cabe(17 + RENGLON)) c.siguienteColumna();
    encabezado(titulo, derecha, rojo);
    if (zona) {
      escribir(c.hoja, letra, zona, c.x, c.y - 7, { tam: 7, color: COLOR.tinta, max: c.anchoColumna });
      c.y -= 10;
    }
    if (filas.length === 0) {
      escribir(c.hoja, letra, vacio, c.x, c.y - 8, { tam: 8, color: COLOR.tinta });
      c.y -= RENGLON;
    }
    for (const f of filas) {
      if (!c.cabe(RENGLON)) {
        c.siguienteColumna();
        encabezado(`${titulo} (sigue)`, "", false);
      }
      renglon(f.silla, f.nombre, f.derecha, conSillas);
    }
    c.y -= 10;
  };

  for (const m of a.mesas) {
    const pax = paxPorMesa.get(m.id) ?? 0;
    const sobrecupo = m.capacity != null && pax > m.capacity;
    const aqui = asientosPorMesa.get(m.id) ?? [];
    bloque(
      letra.limpiar(nombreDeMesa(m.label, false), "Mesa sin nombre"),
      `${m.capacity != null ? `${pax}/${m.capacity}` : pax}${sobrecupo ? " · sobrecupo" : ""}`,
      sobrecupo,
      m.zone?.trim() || null,
      aqui.map((s) => ({ silla: s.silla, nombre: s.nombre, derecha: String(s.pax) })),
      "Vacía"
    );
  }

  if (porSentar.length > 0) {
    bloque(
      "Todavía sin mesa",
      String(porSentar.reduce((s, p) => s + p.personas, 0)),
      false,
      null,
      porSentar.map((p) => ({
        silla: null,
        nombre: p.sinContestar ? `${p.nombre} · sin contestar` : p.nombre,
        derecha: String(p.personas),
      })),
      ""
    );
  }
}

function listaDeLaPuerta(doc: PDFDocument, letra: Letra, a: AcomodoParaPdf): void {
  const idsDeMesas = new Set(a.mesas.map((m) => m.id));
  const nombreDeMesaDe = new Map(a.mesas.map((m) => [m.id, letra.limpiar(nombreDeMesa(m.label, false), "Mesa sin nombre")]));
  const puerta = [...a.asientos]
    .filter((s) => s.pax > 0)
    .sort((x, y) => comparable(x.nombre).localeCompare(comparable(y.nombre), "es"));
  if (puerta.length === 0) return;

  const c = new Columnas(doc, letra, "Lista de la puerta", "En orden alfabético, con su mesa, para recibirlos en la entrada.");
  for (const s of puerta) {
    if (!c.cabe(RENGLON + 2)) c.siguienteColumna();
    const mesa = s.tableId && idsDeMesas.has(s.tableId) ? nombreDeMesaDe.get(s.tableId) : null;
    const derecha =
      (mesa ?? "Sin mesa") + (mesa && s.silla != null ? `, silla ${s.silla}` : "") + (s.pax > 1 ? ` · ${s.pax}` : "");
    const base = c.y - 8;
    const anchoDerecha = letra.ancho(letra.limpiar(derecha), 7.5);
    escribir(c.hoja, letra, s.nombre, c.x, base, { tam: 8, max: c.anchoColumna - anchoDerecha - 6 });
    escribir(c.hoja, letra, derecha, c.x + c.anchoColumna, base, { tam: 7.5, color: COLOR.tinta, alinear: "fin" });
    c.hoja.drawLine({
      start: { x: c.x, y: c.y - RENGLON - 1 },
      end: { x: c.x + c.anchoColumna, y: c.y - RENGLON - 1 },
      thickness: 0.3,
      color: COLOR.linea,
    });
    c.y -= RENGLON + 2;
  }
}

// ----- Todo junto -----

export async function acomodoEnPdf(a: AcomodoParaPdf): Promise<{ pdf: Uint8Array; resumen: ResumenDelAcomodo }> {
  const doc = await PDFDocument.create();
  const nombre = a.boda.nombre.trim() || "Nuestra boda";
  doc.setTitle(`Acomodo de mesas · ${nombre}`);
  doc.setAuthor("BlueBook");
  doc.setCreator("BlueBook");
  doc.setProducer("BlueBook");
  doc.setLanguage("es-MX");
  const letra = new Letra(
    await doc.embedFont(StandardFonts.Helvetica),
    await doc.embedFont(StandardFonts.HelveticaBold)
  );

  // Los mismos cálculos que la pantalla (PantallaMesas.tsx).
  const { porMesa, porGrupo } = sumarAcomodo(a.asientos);
  const asientosPorMesa = new Map<string, AsientoDelSalon[]>();
  for (const s of a.asientos) {
    if (!s.tableId) continue;
    const lista = asientosPorMesa.get(s.tableId) ?? [];
    lista.push(s);
    asientosPorMesa.set(s.tableId, lista);
  }
  for (const lista of asientosPorMesa.values()) {
    lista.sort((x, y) => (x.silla ?? 99) - (y.silla ?? 99) || porNombre(x.nombre, y.nombre));
  }
  const porSentar = [
    ...a.grupos
      .map((g: GrupoDelSalon) => ({
        nombre: g.nombre || "Invitado",
        personas: personasEsperadas(g) - (porGrupo.get(g.membershipId) ?? 0),
        sinContestar: g.confirmation !== "confirmed",
      }))
      .filter((p) => p.personas > 0),
    ...a.asientos
      .filter((s) => s.tableId == null && s.pax > 0)
      .map((s) => ({ nombre: s.nombre, personas: s.pax, sinContestar: false })),
  ].sort((x, y) => Number(x.sinContestar) - Number(y.sinContestar) || porNombre(x.nombre, y.nombre));

  const idsDeMesas = new Set(a.mesas.map((m) => m.id));
  const lugares = a.mesas.reduce((s, m) => s + (m.capacity ?? 0), 0);
  const sentadas = a.asientos.reduce((s, x) => s + (x.tableId && idsDeMesas.has(x.tableId) ? x.pax : 0), 0);
  const faltan = porSentar.reduce((s, p) => s + p.personas, 0);
  const personas = (n: number) => `${n} ${n === 1 ? "persona" : "personas"}`;

  // Hoja 1: el plano, horizontal.
  const plano = doc.addPage(HORIZONTAL);
  const [ancho, alto] = HORIZONTAL;
  const tope = alto - MARGEN;
  escribir(plano, letra, "PLANO DE MESAS", MARGEN, tope - 8, { tam: 7.5, color: COLOR.tinta, negrita: true });
  escribir(plano, letra, nombre, MARGEN, tope - 30, { tam: 20, negrita: true, max: ancho - MARGEN * 2 - 220 });
  if (a.boda.detalle) {
    escribir(plano, letra, a.boda.detalle, MARGEN, tope - 44, { tam: 9, color: COLOR.tinta, max: ancho - MARGEN * 2 - 220 });
  }
  const derecha = [
    `${a.mesas.length} ${a.mesas.length === 1 ? "mesa" : "mesas"} · ${lugares} lugares`,
    `${personas(sentadas)} ${sentadas === 1 ? "sentada" : "sentadas"}${faltan > 0 ? ` · ${faltan} por sentar` : ""}`,
    `Al ${a.hoy}`,
  ];
  derecha.forEach((t, i) =>
    escribir(plano, letra, t, ancho - MARGEN, tope - 12 - i * 12, { tam: 9, color: COLOR.tinta, alinear: "fin" })
  );
  plano.drawLine({
    start: { x: MARGEN, y: tope - 52 },
    end: { x: ancho - MARGEN, y: tope - 52 },
    thickness: 0.5,
    color: COLOR.linea,
  });
  let abajoDelPlano = MARGEN + 12;
  if (!a.planoDibujado) {
    escribir(
      plano,
      letra,
      "Todavía no dibujan su salón: las mesas están en un acomodo automático. En su panel pueden moverlas y poner las medidas reales.",
      MARGEN,
      MARGEN + 12,
      { tam: 7.5, color: COLOR.tinta, max: ancho - MARGEN * 2 }
    );
    abajoDelPlano += 12;
  }
  dibujarPlano(
    plano,
    letra,
    { x: MARGEN, y: abajoDelPlano, ancho: ancho - MARGEN * 2, alto: tope - 60 - abajoDelPlano },
    a,
    porMesa,
    asientosPorMesa
  );

  listaPorMesa(doc, letra, a, porMesa, asientosPorMesa, porSentar);
  listaDeLaPuerta(doc, letra, a);

  const paginas = doc.getPages();
  paginas.forEach((p, i) => pie(p, letra, nombre, i + 1, paginas.length));

  return {
    pdf: await doc.save(),
    resumen: { mesas: a.mesas.length, lugares, sentadas, porSentar: faltan, paginas: paginas.length },
  };
}
