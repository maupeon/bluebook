// Pruebas de la hoja de Google sincronizada (src/lib/hojaSincronizada.ts).
//
//   node --experimental-strip-types --import ./scripts/alias.mjs scripts/probar-hoja-sincronizada.mts
//
// Aquí no hay Google ni base: una tabla en memoria hace de hoja y un arreglo
// hace de Blue Book. Cada caso da una o más vueltas completas (leer, planear,
// aplicar, escribir) y revisa cómo quedan los dos lados.
import assert from "node:assert/strict";
import {
  ENCABEZADOS,
  enBloques,
  escribir,
  hojaNueva,
  leerEnlace,
  leerHoja,
  ligarNuevas,
  planear,
  type Aviso,
  type Base,
  type Bloque,
  type InvitadoDeLaApp,
  type Titulos,
} from "../src/lib/hojaSincronizada.ts";

let ok = 0;
const caso = (nombre: string, fn: () => void) => {
  fn();
  ok++;
  console.log("✓", nombre);
};

/* ---- Una hoja y un Blue Book de mentira ---- */

type Tabla = Array<Array<string | number>>;

function aplicarBloques(tabla: Tabla, bloques: Bloque[]) {
  for (const b of bloques) {
    b.valores.forEach((v, k) => {
      while (tabla.length <= b.f + k) tabla.push([]);
      const fila = tabla[b.f + k];
      while (fila.length <= b.c) fila.push("");
      fila[b.c] = v;
    });
  }
}
function borrarFilas(tabla: Tabla, filas: number[]) {
  for (const i of [...filas].sort((x, y) => y - x)) tabla.splice(i, 1);
}

let serie = 0;
const nuevoId = () => `${(++serie).toString(16).padStart(8, "0")}-0000-4000-8000-000000000000`;
const invitado = (nombre: string, extra: Partial<InvitadoDeLaApp> = {}): InvitadoDeLaApp => ({
  id: nuevoId(),
  nombre,
  telefono: null,
  pases: 1,
  notas: null,
  envio: "pending",
  respuesta: "pending",
  van: 0,
  mesa: null,
  conHistoria: false,
  ...extra,
});

interface Mundo {
  tabla: Tabla;
  app: InvitadoDeLaApp[];
  base: Base;
  /** Los títulos de las columnas como quedaron al ligarla (undefined = todavía no se liga). */
  titulos?: Titulos;
}

/** Una vuelta completa. Hace de servidor: aplica el plan al Blue Book de mentira. */
function vuelta(m: Mundo): { avisos: Aviso[]; escritas: number; agregadas: number; borradas: number; nuevas: number; cambios: number; quitados: number; fuera: string[] } {
  const leida = leerHoja(m.tabla, m.titulos);
  assert.ok(leida.ok, `la hoja no se pudo leer: ${!leida.ok && leida.problema}`);
  const hoja = leida.hoja;
  m.titulos = hoja.titulos;
  const plan = planear(hoja, m.app, m.base);

  for (const c of plan.cambios) {
    const g = m.app.find((x) => x.id === c.id)!;
    if (c.nombre !== undefined) g.nombre = c.nombre;
    if (c.telefono !== undefined) g.telefono = c.telefono;
    if (c.pases !== undefined) g.pases = c.pases;
    if (c.notas !== undefined) g.notas = c.notas;
  }
  m.app = m.app.filter((g) => !plan.quitar.includes(g.id));
  // importar_invitados de mentira: nuevo si no hay nadie con ese teléfono o nombre.
  for (const f of plan.nuevas) {
    const ya = m.app.find((g) =>
      f.telefono ? g.telefono?.slice(-10) === f.telefono.slice(-10) : g.nombre.toLowerCase() === f.nombre.toLowerCase()
    );
    if (!ya) m.app.push(invitado(f.nombre, { telefono: f.telefono, pases: f.pases ?? 1, notas: f.notas }));
  }
  const { ligas } = ligarNuevas(plan.nuevas, m.app, plan.ligas.values());
  const todas = new Map([...plan.ligas, ...ligas]);
  const e = escribir(hoja, m.app, todas, m.base, {
    sinTocar: plan.sinTocar,
    fuera: new Set(plan.fuera),
    filasDeMas: plan.filasDeMas,
  });
  aplicarBloques(m.tabla, e.bloques);
  borrarFilas(m.tabla, e.borrar);
  m.base = e.base;
  return {
    avisos: plan.avisos,
    escritas: e.bloques.reduce((n, b) => n + b.valores.length, 0),
    agregadas: e.filasAgregadas,
    borradas: e.borrar.length,
    nuevas: plan.nuevas.length,
    cambios: plan.cambios.length,
    quitados: plan.quitar.length,
    fuera: plan.fuera,
  };
}

/** La columna de un encabezado, y la celda de una fila por el nombre del invitado. */
const columna = (m: Mundo, encabezado: string) => m.tabla[0].indexOf(encabezado);
const filaDe = (m: Mundo, nombre: string) => m.tabla.findIndex((f) => f[columna(m, "Nombre")] === nombre);
const celda = (m: Mundo, nombre: string, encabezado: string) => m.tabla[filaDe(m, nombre)]?.[columna(m, encabezado)] ?? "";
const pon = (m: Mundo, nombre: string, encabezado: string, v: string | number) => {
  m.tabla[filaDe(m, nombre)][columna(m, encabezado)] = v;
};
const quieta = (m: Mundo) => {
  const r = vuelta(m);
  assert.equal(r.escritas + r.borradas + r.nuevas + r.cambios + r.quitados, 0, "una vuelta sin cambios no debe tocar nada");
};

/** Tres invitados ya sincronizados en una hoja sencilla. */
function mundoListo(): Mundo {
  const m: Mundo = {
    tabla: [
      ["Nombre", "WhatsApp", "Pases", "Notas"],
      ["Ana Ruiz", "55 1111 1111", 2, ""],
      ["Beto Lara", "55 2222 2222", 4, "vegetariano"],
      ["Abuela Cuca", "", 1, ""],
    ],
    app: [],
    base: {},
  };
  vuelta(m);
  quieta(m);
  return m;
}

/* ---- Casos ---- */

caso("una hoja vacía se llena con la lista y queda quieta", () => {
  assert.deepEqual(leerHoja([]), { ok: false, problema: "vacia" });
  assert.deepEqual(leerHoja([["", ""], []]), { ok: false, problema: "vacia" });
  const app = [invitado("Ana Ruiz", { telefono: "+525511111111", pases: 2 }), invitado("Abuela Cuca")];
  const n = hojaNueva(app);
  const m: Mundo = { tabla: [], app, base: n.base };
  aplicarBloques(m.tabla, n.bloques);
  const leida = leerHoja(m.tabla);
  assert.ok(leida.ok);
  m.titulos = leida.hoja.titulos;
  assert.deepEqual(m.titulos, { nombre: "Nombre", telefono: "WhatsApp", pases: "Pases", notas: "Notas" });
  assert.deepEqual(m.tabla[0], Object.values(ENCABEZADOS));
  assert.equal(m.tabla.length, 3);
  assert.equal(celda(m, "Ana Ruiz", "WhatsApp"), "+525511111111");
  assert.equal(celda(m, "Ana Ruiz", "ID (BlueBook)"), app[0].id.slice(0, 8));
  quieta(m);
});

caso("la primera vez: las filas entran a Blue Book y Blue Book agrega sus columnas", () => {
  const m: Mundo = {
    tabla: [
      ["Nombre", "Celular", "Pases"],
      ["Ana Ruiz", 5511111111, 2],
      ["Beto Lara", "+52 1 55 2222 2222", 4],
    ],
    app: [invitado("Tía Rosa", { telefono: "+525533333333", pases: 3, respuesta: "confirmed", van: 3, envio: "read", mesa: "Mesa 4" })],
    base: {},
  };
  const r = vuelta(m);
  assert.equal(r.nuevas, 2);
  assert.equal(r.agregadas, 1);
  assert.equal(m.app.length, 3);
  assert.equal(m.app.find((g) => g.nombre === "Ana Ruiz")!.telefono, "+525511111111");
  // Las columnas de la pareja no se mueven; las de Blue Book van a la derecha.
  assert.deepEqual(m.tabla[0], ["Nombre", "Celular", "Pases", "Notas", "Invitación (BlueBook)", "Respuesta (BlueBook)", "Van (BlueBook)", "Mesa (BlueBook)", "ID (BlueBook)"]);
  // El teléfono de la hoja se ve distinto pero es el mismo: no se reescribe.
  assert.equal(m.tabla[2][1], "+52 1 55 2222 2222");
  assert.equal(m.tabla[3][0], "Tía Rosa");
  assert.equal(m.tabla[3][1], "+525533333333");
  assert.equal(m.tabla[3][5], "Van");
  assert.equal(m.tabla[3][6], 3);
  assert.equal(m.tabla[3][7], "Mesa 4");
  assert.equal(m.tabla[1][4], "Sin enviar");
  quieta(m);
});

caso("lo que cambia en la hoja llega a Blue Book", () => {
  const m = mundoListo();
  pon(m, "Ana Ruiz", "Pases", 3);
  pon(m, "Beto Lara", "Notas", "");
  pon(m, "Abuela Cuca", "WhatsApp", "55 4444 4444");
  pon(m, "Beto Lara", "Nombre", "Beto y Lucía Lara");
  const r = vuelta(m);
  assert.equal(r.cambios, 3);
  assert.equal(r.avisos.length, 0);
  const de = (n: string) => m.app.find((g) => g.nombre === n)!;
  assert.equal(de("Ana Ruiz").pases, 3);
  assert.equal(de("Beto y Lucía Lara").notas, null);
  assert.equal(de("Abuela Cuca").telefono, "+525544444444");
  quieta(m);
});

caso("lo que cambia en Blue Book llega a la hoja", () => {
  const m = mundoListo();
  const ana = m.app.find((g) => g.nombre === "Ana Ruiz")!;
  ana.pases = 5;
  ana.notas = "llega tarde";
  ana.respuesta = "confirmed";
  ana.van = 4;
  ana.envio = "delivered";
  ana.mesa = "Mesa 2";
  const r = vuelta(m);
  assert.equal(r.cambios, 0);
  assert.equal(celda(m, "Ana Ruiz", "Pases"), 5);
  assert.equal(celda(m, "Ana Ruiz", "Notas"), "llega tarde");
  assert.equal(celda(m, "Ana Ruiz", "Respuesta (BlueBook)"), "Van");
  assert.equal(celda(m, "Ana Ruiz", "Van (BlueBook)"), 4);
  assert.equal(celda(m, "Ana Ruiz", "Invitación (BlueBook)"), "Entregada");
  assert.equal(celda(m, "Ana Ruiz", "Mesa (BlueBook)"), "Mesa 2");
  quieta(m);
  // Un invitado nuevo en Blue Book se agrega al final de la hoja.
  m.app.push(invitado("Primo Luis", { telefono: "+525555555555", pases: 2 }));
  assert.equal(vuelta(m).agregadas, 1);
  assert.equal(celda(m, "Primo Luis", "Pases"), 2);
  quieta(m);
});

caso("si cambian las dos, queda lo de Blue Book y se avisa", () => {
  const m = mundoListo();
  pon(m, "Ana Ruiz", "Pases", 3);
  m.app.find((g) => g.nombre === "Ana Ruiz")!.pases = 6;
  const r = vuelta(m);
  assert.equal(r.cambios, 0);
  assert.deepEqual(r.avisos.map((a) => [a.tipo, a.campo, a.valor]), [["los_dos_cambiaron", "pases", "3"]]);
  assert.equal(celda(m, "Ana Ruiz", "Pases"), 6);
  quieta(m);
  // Si las dos cambian a LO MISMO no hay pleito.
  pon(m, "Ana Ruiz", "Pases", 2);
  m.app.find((g) => g.nombre === "Ana Ruiz")!.pases = 2;
  assert.equal(vuelta(m).avisos.length, 0);
});

caso("lo que no se entiende ni se guarda ni se borra de la hoja", () => {
  const m = mundoListo();
  pon(m, "Ana Ruiz", "WhatsApp", "55 1234");
  pon(m, "Beto Lara", "Pases", "dos o tres");
  pon(m, "Abuela Cuca", "Pases", 40);
  let r = vuelta(m);
  assert.deepEqual(r.avisos.map((a) => a.tipo).sort(), ["pases_fuera_de_rango", "pases_ilegibles", "telefono_incompleto"]);
  assert.equal(r.cambios, 0);
  assert.equal(celda(m, "Ana Ruiz", "WhatsApp"), "55 1234");
  assert.equal(celda(m, "Beto Lara", "Pases"), "dos o tres");
  assert.equal(m.app.find((g) => g.nombre === "Ana Ruiz")!.telefono, "+525511111111");
  // Sigue avisando mientras no se corrija.
  r = vuelta(m);
  assert.equal(r.avisos.length, 3);
  assert.equal(r.escritas, 0);
  // Si Blue Book cambia ese dato después, se corrige sola y deja de avisar.
  m.app.find((g) => g.nombre === "Ana Ruiz")!.telefono = "+525599999999";
  r = vuelta(m);
  assert.equal(celda(m, "Ana Ruiz", "WhatsApp"), "+525599999999");
  assert.equal(r.avisos.length, 2);
  // Y si la pareja la corrige en la hoja, entra.
  pon(m, "Beto Lara", "Pases", 3);
  pon(m, "Abuela Cuca", "Pases", "");
  r = vuelta(m);
  assert.equal(r.avisos.length, 0);
  assert.equal(m.app.find((g) => g.nombre === "Beto Lara")!.pases, 3);
  // Los pases vacíos no son un cambio: se vuelven a llenar con lo de Blue Book.
  assert.equal(celda(m, "Abuela Cuca", "Pases"), 1);
  quieta(m);
});

caso("un nombre borrado en una fila con ID no borra al invitado", () => {
  const m = mundoListo();
  const i = filaDe(m, "Ana Ruiz");
  m.tabla[i][0] = "";
  const r = vuelta(m);
  assert.deepEqual(r.avisos.map((a) => a.tipo), ["sin_nombre"]);
  assert.equal(m.app.length, 3);
  assert.equal(m.tabla[i][0], "");
});

caso("borrar una fila quita al invitado sólo si no tiene historia", () => {
  const m = mundoListo();
  const beto = m.app.find((g) => g.nombre === "Beto Lara")!;
  beto.conHistoria = true;
  beto.envio = "sent";
  vuelta(m);
  m.tabla.splice(filaDe(m, "Ana Ruiz"), 1);
  m.tabla.splice(filaDe(m, "Beto Lara"), 1);
  let r = vuelta(m);
  assert.equal(r.quitados, 1);
  assert.deepEqual(r.fuera, [beto.id]);
  assert.deepEqual(m.app.map((g) => g.nombre).sort(), ["Abuela Cuca", "Beto Lara"]);
  // Mientras no se decida, Beto no vuelve a la hoja ni se quita.
  r = vuelta(m);
  assert.equal(r.agregadas, 0);
  assert.deepEqual(r.fuera, [beto.id]);
  assert.equal(m.base[beto.id].f, 1);
  // «Regresarlo a la hoja» es olvidar su recuerdo: entra como fila nueva.
  delete m.base[beto.id];
  r = vuelta(m);
  assert.equal(r.agregadas, 1);
  assert.equal(celda(m, "Beto Lara", "Invitación (BlueBook)"), "Enviada");
  quieta(m);
});

caso("si la fila vuelve (deshacer en la hoja), deja de estar pendiente", () => {
  const m = mundoListo();
  const beto = m.app.find((g) => g.nombre === "Beto Lara")!;
  beto.conHistoria = true;
  const guardada = [...m.tabla[filaDe(m, "Beto Lara")]];
  m.tabla.splice(filaDe(m, "Beto Lara"), 1);
  assert.deepEqual(vuelta(m).fuera, [beto.id]);
  m.tabla.push(guardada);
  const r = vuelta(m);
  assert.deepEqual(r.fuera, []);
  assert.equal(m.base[beto.id].f, undefined);
  assert.equal(m.app.length, 3);
});

caso("muchas filas menos de golpe: no se quita a nadie", () => {
  const m: Mundo = { tabla: [["Nombre", "WhatsApp", "Pases"]], app: [], base: {} };
  for (let k = 0; k < 10; k++) m.tabla.push([`Invitado ${k}`, `55 1000 00${k}0`, 2]);
  vuelta(m);
  assert.equal(m.app.length, 10);
  m.tabla.splice(1, 6);
  const r = vuelta(m);
  assert.equal(r.quitados, 0);
  assert.equal(r.fuera.length, 6);
  assert.deepEqual(r.avisos.map((a) => [a.tipo, a.cuantas]), [["muchas_filas_menos", 6]]);
  assert.equal(m.app.length, 10);
});

caso("quitar a alguien en Blue Book borra su fila de la hoja", () => {
  const m = mundoListo();
  m.app = m.app.filter((g) => g.nombre !== "Beto Lara");
  const r = vuelta(m);
  assert.equal(r.borradas, 1);
  assert.equal(filaDe(m, "Beto Lara"), -1);
  assert.equal(m.tabla.length, 3);
  assert.equal(Object.keys(m.base).length, 2);
  quieta(m);
});

caso("ordenar o mover filas no cambia nada", () => {
  const m = mundoListo();
  const [enc, ...filas] = m.tabla;
  m.tabla = [enc, ...filas.reverse()];
  m.tabla.splice(2, 0, []);
  quieta(m);
});

caso("una fila copiada con su ID es un invitado nuevo, esté arriba o abajo", () => {
  for (const arriba of [true, false]) {
    const m = mundoListo();
    const copia = [...m.tabla[filaDe(m, "Ana Ruiz")]];
    copia[0] = "Carla Ruiz";
    copia[1] = "55 7777 7777";
    if (arriba) m.tabla.splice(1, 0, copia);
    else m.tabla.push(copia);
    const r = vuelta(m);
    assert.equal(r.nuevas, 1);
    assert.equal(r.cambios, 0);
    assert.deepEqual(m.app.map((g) => g.nombre).sort(), ["Abuela Cuca", "Ana Ruiz", "Beto Lara", "Carla Ruiz"]);
    assert.notEqual(celda(m, "Carla Ruiz", "ID (BlueBook)"), celda(m, "Ana Ruiz", "ID (BlueBook)"));
    quieta(m);
  }
});

caso("si se borra la columna de ID, cada quien sigue siendo quien era", () => {
  for (const cuantos of [3, 12]) {
    const m: Mundo = { tabla: [["Nombre", "WhatsApp", "Pases", "Notas"]], app: [], base: {} };
    for (let k = 0; k < cuantos; k++) m.tabla.push([`Invitado ${k}`, k % 3 === 2 ? "" : `55 1000 00${String(k).padStart(2, "0")}`, 2, ""]);
    vuelta(m);
    quieta(m);
    const antes = m.app.map((g) => g.id).sort();
    m.app[0].notas = "sólo en Blue Book";
    const c = columna(m, "ID (BlueBook)");
    for (const f of m.tabla) f.splice(c, 1);
    // De paso, un cambio en la hoja: tiene que entrar, no perderse.
    pon(m, "Invitado 1", "Pases", 5);
    const r = vuelta(m);
    assert.equal(r.quitados, 0);
    assert.equal(r.nuevas, 0);
    assert.deepEqual(r.fuera, []);
    assert.deepEqual(r.avisos, []);
    assert.deepEqual(m.app.map((g) => g.id).sort(), antes);
    assert.equal(m.app.find((g) => g.nombre === "Invitado 1")!.pases, 5);
    assert.equal(celda(m, "Invitado 0", "Notas"), "sólo en Blue Book");
    assert.equal(celda(m, "Invitado 0", "ID (BlueBook)"), m.app[0].id.slice(0, 8));
    quieta(m);
  }
});

caso("una fila reescrita a mano (sin ID) de alguien que ya estaba no lo duplica ni lo quita", () => {
  const m = mundoListo();
  const beto = m.app.find((g) => g.nombre === "Beto Lara")!;
  beto.conHistoria = true;
  m.tabla.splice(filaDe(m, "Beto Lara"), 1);
  m.tabla.push(["Beto Lara", "+52 55 2222 2222", 4, "vegetariano"]);
  const r = vuelta(m);
  assert.equal(r.nuevas + r.quitados + r.fuera.length, 0);
  assert.equal(m.app.length, 3);
  assert.equal(celda(m, "Beto Lara", "ID (BlueBook)"), beto.id.slice(0, 8));
  quieta(m);
});

caso("un ID que no es de esta boda se trata como fila nueva", () => {
  const m = mundoListo();
  m.tabla.push(["Invitada de otra boda", "55 8888 8888", 2, "", "", "", "", "", "deadbeef"]);
  const r = vuelta(m);
  assert.equal(r.nuevas, 1);
  assert.equal(r.borradas, 0);
  assert.notEqual(celda(m, "Invitada de otra boda", "ID (BlueBook)"), "deadbeef");
});

caso("filas nuevas: sin nombre, totales y pases imposibles no entran", () => {
  const m = mundoListo();
  m.tabla.push(["", "55 6666 6666", 2]);
  m.tabla.push(["TOTAL", "", 7]);
  m.tabla.push(["Familia Enorme", "55 6666 0000", 50]);
  m.tabla.push(["Sin Cel", "no tiene", ""]);
  const r = vuelta(m);
  assert.deepEqual(r.avisos.map((a) => a.tipo).sort(), ["pases_fuera_de_rango", "sin_nombre", "telefono_ilegible"]);
  assert.deepEqual(m.app.map((g) => g.nombre).sort(), ["Abuela Cuca", "Ana Ruiz", "Beto Lara", "Sin Cel"]);
  // La fila nueva que entró sin teléfono conserva lo que la pareja escribió.
  assert.equal(celda(m, "Sin Cel", "WhatsApp"), "no tiene");
  assert.equal(celda(m, "Sin Cel", "Pases"), 1);
});

caso("las columnas de la pareja no se tocan: su «Mesa» y su «Confirmados» son suyas", () => {
  const m: Mundo = {
    tabla: [
      ["Invitado", "Tel", "Confirmados", "Mesa", "Lado"],
      ["Ana Ruiz", "5511111111", 2, "7", "novia"],
    ],
    app: [],
    base: {},
  };
  vuelta(m);
  assert.deepEqual(m.tabla[0].slice(0, 6), ["Invitado", "Tel", "Confirmados", "Mesa", "Lado", "Pases"]);
  assert.deepEqual(m.tabla[1].slice(0, 6), ["Ana Ruiz", "5511111111", 2, "7", "novia", 1]);
  assert.equal(m.app[0].pases, 1);
  assert.equal(m.tabla[0].includes("Mesa (BlueBook)"), true);
  quieta(m);
});

caso("una lista con otra forma no se sincroniza tal cual", () => {
  const forma = (t: Tabla) => {
    const r = leerHoja(t);
    return r.ok ? "ok" : r.problema;
  };
  assert.equal(forma([["Nombre", "Apellido", "Celular"], ["Ana", "Ruiz", "5511111111"]]), "otra_forma");
  assert.equal(forma([["Nombre", "Celular", "Acompañantes"], ["Ana", "5511111111", 1]]), "otra_forma");
  assert.equal(forma([["Nombre", "Adultos", "Niños"], ["Ana", 2, 1]]), "otra_forma");
  assert.equal(forma([["Ana Ruiz", "5511111111", 2], ["Beto Lara", "5522222222", 4]]), "sin_encabezados");
  assert.equal(forma([["Lista de la boda"], [], ["Nombre", "Celular", "Pases"], ["Ana", "5511111111", 2]]), "ok");
});

caso("los encabezados pueden no estar en la primera fila", () => {
  const m: Mundo = {
    tabla: [["Boda de Ana y Beto"], [], ["Nombre", "Celular", "Pases"], ["Ana Ruiz", "5511111111", 2]],
    app: [invitado("Tía Rosa")],
    base: {},
  };
  vuelta(m);
  assert.equal(m.tabla[2][8], "ID (BlueBook)");
  assert.equal(m.tabla[4][0], "Tía Rosa");
  assert.equal(m.tabla.length, 5);
});

caso("ligar filas nuevas: por teléfono, por nombre, y nunca dos a uno", () => {
  const app = [invitado("Ana Ruiz", { telefono: "+525511111111" }), invitado("Abuela Cuca"), invitado("Juan Pérez"), invitado("Juan Pérez")];
  const f = (i: number, nombre: string, telefono: string | null = null) => ({ i, nombre, telefono, pases: null, notas: null });
  const r = ligarNuevas(
    [f(1, "Anita", "+525511111111"), f(2, "abuela  cuca"), f(3, "Juan Pérez"), f(4, "Ana R.", "+5215511111111"), f(5, "Nadie")],
    app,
    []
  );
  assert.deepEqual([...r.ligas], [[1, app[0].id], [2, app[1].id]]);
  assert.deepEqual(r.repetidas.map((x) => x.i), [4]);
  // Quien ya tiene fila no se liga a otra.
  assert.equal(ligarNuevas([f(9, "Abuela Cuca")], app, [app[1].id]).ligas.size, 0);
});

caso("las celdas se mandan en tramos seguidos", () => {
  const b = enBloques([
    { f: 3, c: 1, v: "c" },
    { f: 1, c: 1, v: "a" },
    { f: 2, c: 1, v: "b" },
    { f: 5, c: 1, v: "e" },
    { f: 1, c: 0, v: "x" },
  ]);
  assert.deepEqual(b, [
    { f: 1, c: 0, valores: ["x"] },
    { f: 1, c: 1, valores: ["a", "b", "c"] },
    { f: 5, c: 1, valores: ["e"] },
  ]);
});

caso("ordenar la hoja con todo y títulos no quita a nadie", () => {
  for (const cuantos of [4, 12, 60]) {
    const m: Mundo = { tabla: [["Nombre", "WhatsApp", "Pases"]], app: [], base: {} };
    for (let k = 0; k < cuantos; k++) m.tabla.push([`${k % 2 ? "Zoe" : "Ana"} ${String(k).padStart(2, "0")}`, `55 1000 00${String(k).padStart(2, "0")}`, 2]);
    vuelta(m);
    quieta(m);
    const antes = m.app.map((g) => g.id).sort();
    // «Ordenar hoja A→Z» con todo y títulos: «Nombre» queda a media lista.
    m.tabla.sort((x, y) => String(x[0]).localeCompare(String(y[0])));
    assert.equal(m.tabla.findIndex((f) => f[0] === "Nombre"), cuantos / 2);
    const r = vuelta(m);
    assert.equal(r.quitados + r.nuevas + r.cambios + r.borradas, 0);
    assert.deepEqual(r.fuera, []);
    assert.deepEqual(m.app.map((g) => g.id).sort(), antes);
    // Y uno nuevo en Blue Book se agrega sin pisar a nadie.
    m.app.push(invitado("Zacarías Nuevo", { telefono: "+525599990000" }));
    assert.equal(vuelta(m).agregadas, 1);
    assert.equal(m.tabla[m.tabla.length - 1][0], "Zacarías Nuevo");
    quieta(m);
  }
});

caso("una fila de invitado arriba de los títulos no se toma por los títulos", () => {
  const m = mundoListo();
  // Beto queda arriba de la fila de títulos, con unas notas que parecen encabezado.
  const beto = m.tabla.splice(filaDe(m, "Beto Lara"), 1)[0];
  beto[0] = "Familia Lara";
  beto[3] = "Alergia al gluten";
  m.tabla.unshift(beto);
  const r = vuelta(m);
  assert.equal(r.quitados + r.nuevas, 0);
  assert.equal(r.cambios, 1);
  assert.deepEqual(m.app.map((g) => g.nombre).sort(), ["Abuela Cuca", "Ana Ruiz", "Familia Lara"]);
  assert.equal(m.app.find((g) => g.nombre === "Familia Lara")!.notas, "Alergia al gluten");
  // Una fila NUEVA arriba de los títulos no se lee, y se avisa.
  m.tabla.unshift(["Colado Arriba", "55 9999 0000", 2]);
  const r2 = vuelta(m);
  assert.equal(r2.nuevas, 0);
  assert.deepEqual(r2.avisos.map((a) => [a.tipo, a.cuantas]), [["filas_arriba", 1]]);
});

caso("una columna nueva no le quita el lugar a la que ya se sincronizaba", () => {
  const m: Mundo = {
    tabla: [
      ["Nombre", "Teléfono", "Pases", "Notas"],
      ["Ana Ruiz", "55 1111 1111", 2, "llega tarde"],
      ["Beto Lara", "55 2222 2222", 4, ""],
    ],
    app: [],
    base: {},
  };
  vuelta(m);
  quieta(m);
  assert.equal(m.titulos!.telefono, "Teléfono");
  const foto = JSON.stringify(m.app);
  // La pareja agrega «WhatsApp» (gana a «Teléfono» al detectar), «Total» (gana
  // a «Pases») y «Menú» (se lee como notas), todas vacías y a la izquierda.
  for (const f of m.tabla) f.splice(1, 0, ...(f === m.tabla[0] ? ["WhatsApp", "Total", "Menú"] : ["", "", ""]));
  const r = vuelta(m);
  assert.equal(r.cambios + r.nuevas + r.quitados, 0);
  assert.equal(JSON.stringify(m.app), foto);
  assert.equal(celda(m, "Ana Ruiz", "WhatsApp"), "");
  quieta(m);
});

caso("al ligar (sin recuerdo), una columna vacía no borra lo que Blue Book sabe", () => {
  const app = [
    invitado("Ana Ruiz", { telefono: "+525511111111", pases: 3, notas: "llega tarde" }),
    invitado("Beto Lara", { telefono: "+525522222222", pases: 2 }),
  ];
  const id = (g: InvitadoDeLaApp) => g.id.slice(0, 8);
  // Una hoja que ya estuvo ligada (trae sus ID) y a la que le agregaron
  // «WhatsApp», «Total» y «Menú» vacías: al volver a ligarla se detectan de nuevo.
  const m: Mundo = {
    tabla: [
      ["Nombre", "WhatsApp", "Total", "Menú", "Teléfono", "Pases", "Notas", "ID (BlueBook)"],
      ["Ana Ruiz", "", "", "", "55 1111 1111", 3, "llega tarde", id(app[0])],
      ["Beto Lara", "", "", "", "55 2222 2222", 4, "", id(app[1])],
    ],
    app,
    base: {},
  };
  const r = vuelta(m);
  // Se ligan las columnas que SÍ traen datos.
  assert.deepEqual(m.titulos, { nombre: "Nombre", telefono: "Teléfono", pases: "Pases", notas: "Notas" });
  assert.equal(r.cambios, 1); // sólo los pases de Beto, que la hoja sí dice
  assert.equal(app[0].telefono, "+525511111111");
  assert.equal(app[0].notas, "llega tarde");
  assert.equal(app[1].pases, 4);
  quieta(m);

  // Y aunque la columna ligada esté vacía de verdad (no hay otra), lo vacío no
  // borra: se llena con lo de Blue Book.
  const m2: Mundo = {
    tabla: [["Nombre", "WhatsApp", "Notas", "ID (BlueBook)"], ["Ana Ruiz", "", "", id(app[0])]],
    app: [app[0]],
    base: {},
  };
  assert.equal(vuelta(m2).cambios, 0);
  assert.equal(app[0].telefono, "+525511111111");
  assert.equal(celda(m2, "Ana Ruiz", "WhatsApp"), "+525511111111");
  assert.equal(celda(m2, "Ana Ruiz", "Notas"), "llega tarde");
  // Con recuerdo, borrar la celda SÍ es borrar el dato.
  pon(m2, "Ana Ruiz", "Notas", "");
  assert.equal(vuelta(m2).cambios, 1);
  assert.equal(app[0].notas, null);
});

caso("si le cambian el título a una columna de la lista, no se adivina otra", () => {
  const m: Mundo = { tabla: [["Nombre", "Celular", "Pases"], ["Ana Ruiz", "55 1111 1111", 2]], app: [], base: {} };
  vuelta(m);
  m.tabla[0][1] = "Contacto";
  assert.deepEqual(leerHoja(m.tabla, m.titulos), { ok: false, problema: "sin_columna", detalle: "Celular" });
  // Se compara sin acentos ni mayúsculas: «CELULAR» sigue siendo la misma.
  m.tabla[0][1] = "CELULAR";
  assert.equal(leerHoja(m.tabla, m.titulos).ok, true);
  m.tabla[0][1] = "Celular";
  m.tabla[0][0] = "Quién";
  const r = leerHoja(m.tabla, m.titulos);
  assert.equal(!r.ok && r.problema, "sin_encabezados");
  // La que puso Blue Book con su título de siempre sí se vuelve a poner.
  m.tabla[0][0] = "Nombre";
  const notas = columna(m, "Notas");
  for (const f of m.tabla) f.splice(notas, 1);
  m.app[0].notas = "se quedó en Blue Book";
  vuelta(m);
  assert.equal(celda(m, "Ana Ruiz", "Notas"), "se quedó en Blue Book");
});

caso("sin columna de ID y con homónimos, nadie se quita ni se duplica", () => {
  const m: Mundo = {
    tabla: [
      ["Nombre", "WhatsApp", "Pases"],
      ["Familia García", "", 4],
      ["Familia García", "", 2],
      ["Familia García", "55 3333 3333", 3],
      ["Ana Ruiz", "55 1111 1111", 2],
    ],
    app: [],
    base: {},
  };
  // Tres homónimos no entran juntos por importar_invitados: se dan de alta en Blue Book.
  m.tabla.splice(1, 3);
  m.app.push(invitado("Familia García", { pases: 4 }), invitado("Familia García", { pases: 2 }), invitado("Familia García", { telefono: "+525533333333", pases: 3 }));
  vuelta(m);
  quieta(m);
  assert.equal(m.app.length, 4);
  const antes = JSON.stringify(m.app.map((g) => [g.id, g.nombre, g.pases]).sort());
  const c = columna(m, "ID (BlueBook)");
  for (const f of m.tabla) f.splice(c, 1);
  const r = vuelta(m);
  assert.equal(r.quitados + r.nuevas, 0);
  assert.deepEqual(r.fuera, []);
  assert.equal(JSON.stringify(m.app.map((g) => [g.id, g.nombre, g.pases]).sort()), antes);
  // Cada homónimo recuperó SU fila (la de sus pases), no la del otro.
  for (const g of m.app) {
    const fila = m.tabla.find((f) => f[columna(m, "ID (BlueBook)")] === g.id.slice(0, 8))!;
    assert.equal(fila[columna(m, "Pases")], g.pases);
  }
  quieta(m);
});

caso("si los homónimos no cuadran con las filas, se pregunta en vez de quitar", () => {
  const m: Mundo = { tabla: [["Nombre", "WhatsApp", "Pases"], ["Ana Ruiz", "55 1111 1111", 2]], app: [], base: {} };
  m.app.push(invitado("Familia García", { pases: 4 }), invitado("Familia García", { pases: 2 }));
  vuelta(m);
  quieta(m);
  // Se pierden los ID de las dos filas y además se borra una.
  const c = columna(m, "ID (BlueBook)");
  for (const f of m.tabla) if (f[0] === "Familia García") f[c] = "";
  m.tabla.splice(filaDe(m, "Familia García"), 1);
  const r = vuelta(m);
  assert.equal(r.quitados, 0);
  assert.equal(r.fuera.length, 2);
  assert.equal(m.app.length, 3);
});

caso("una fila nueva con el WhatsApp o el nombre de alguien que ya tiene fila no lo cambia", () => {
  const m = mundoListo();
  const foto = JSON.stringify(m.app);
  m.tabla.push(["Luis Ruiz", "55 1111 1111", 3]); // el número de Ana
  m.tabla.push(["Abuela Cuca", "", 2]); // el nombre de quien no tiene teléfono
  m.tabla.push(["abuela cuca", "55 8888 0000", 2]); // le pondría teléfono a la que ya tiene fila
  const r = vuelta(m);
  assert.equal(r.nuevas, 0);
  assert.deepEqual(r.avisos.map((a) => [a.tipo, a.fila]), [["fila_repetida", 5], ["fila_repetida", 6], ["fila_repetida", 7]]);
  assert.equal(JSON.stringify(m.app), foto);
  // Un homónimo con OTRO teléfono de alguien que sí tiene teléfono lo decide importar_invitados (no lo toca).
  m.tabla.splice(4, 3);
  m.tabla.push(["Ana Ruiz", "55 7777 0000", 1]);
  assert.equal(vuelta(m).nuevas, 1);
});

caso("al copiar una fila y cambiar las dos, sigue siendo quien era la del mismo nombre", () => {
  const m = mundoListo();
  const ana = m.app.find((g) => g.nombre === "Ana Ruiz")!;
  ana.conHistoria = true;
  ana.respuesta = "confirmed";
  vuelta(m);
  const copia = [...m.tabla[filaDe(m, "Ana Ruiz")]];
  copia[0] = "Sofía Ruiz";
  copia[1] = "55 6666 6666";
  pon(m, "Ana Ruiz", "Pases", 1);
  m.tabla.splice(1, 0, copia); // la copia queda ARRIBA de la original
  vuelta(m);
  assert.equal(m.app.find((g) => g.id === ana.id)!.nombre, "Ana Ruiz");
  assert.equal(m.app.find((g) => g.id === ana.id)!.pases, 1);
  assert.equal(m.app.find((g) => g.nombre === "Sofía Ruiz")!.respuesta, "pending");
});

caso("un nombre o unas notas muy largos no se recortan en Blue Book", () => {
  const m = mundoListo();
  const largo = "Familia " + "Pérez ".repeat(20).trim();
  const notas = "Alergia. ".repeat(80).trim();
  assert.ok(largo.length > 80 && notas.length > 500);
  m.app.push(invitado(largo, { notas }));
  vuelta(m);
  const r = vuelta(m);
  assert.equal(r.cambios + r.escritas, 0);
  assert.equal(m.app[m.app.length - 1].nombre, largo);
  assert.equal(m.app[m.app.length - 1].notas, notas);
});

caso("el enlace de la hoja", () => {
  const id = "1AbC_dEfGhIjKlMnOpQrStUvWxYz0123456789-_abcd";
  assert.deepEqual(leerEnlace(`https://docs.google.com/spreadsheets/d/${id}/edit?gid=123#gid=123`), { id, gid: 123 });
  assert.deepEqual(leerEnlace(`https://docs.google.com/spreadsheets/d/${id}/edit#gid=0`), { id, gid: 0 });
  assert.deepEqual(leerEnlace(`https://docs.google.com/spreadsheets/u/1/d/${id}/edit?usp=sharing`), { id, gid: null });
  assert.deepEqual(leerEnlace(`  ${id} `), { id, gid: null });
  assert.equal(leerEnlace("https://docs.google.com/document/d/abc/edit"), null);
  assert.equal(leerEnlace("mi hoja de invitados"), null);
  assert.equal(leerEnlace(""), null);
});

console.log(`\n${ok} casos bien`);
