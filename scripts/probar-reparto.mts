// Pruebas del reparto del presupuesto (src/lib/reparto.ts).
// Sin framework: node trae assert y quita los tipos solo.
//
//   node --experimental-strip-types scripts/probar-reparto.mts
//
// La regla que manda sobre todas: el reparto SIEMPRE suma el presupuesto
// (salvo que lo fijado a mano se pase, y entonces lo dice). Una pantalla que
// reparte $180,000 y suma $179,900 se contradice sola.
import assert from "node:assert/strict";
import type { ClavePrioridad } from "../src/components/onboarding/respuestas.ts";
import {
  CATEGORIAS,
  FUENTES,
  FUENTES_CONSULTADAS,
  agregar,
  categoriaDeRotulo,
  contratadoPorCategoria,
  quitar,
  renombrar,
  repartir,
  soltar,
  soltarTodas,
  PLAN_VACIO,
  type PlanReparto,
} from "../src/lib/reparto.ts";

let ok = 0;
const caso = (nombre: string, fn: () => void) => {
  fn();
  ok++;
  console.log("✓", nombre);
};
const suma = (xs: number[]) => xs.reduce((a, x) => a + x, 0);
const montoDe = (r: ReturnType<typeof repartir>, id: string) => r.renglones.find((x) => x.id === id)!.monto;

const PRIORIDADES: ClavePrioridad[] = ["comida", "fiesta", "fotos", "lugar", "decoracion", "presupuesto", "familia", "calma"];
/** Todas las combinaciones de prioridades (2^8), para barrer la regla completa. */
const COMBINACIONES: ClavePrioridad[][] = Array.from({ length: 1 << PRIORIDADES.length }, (_, m) =>
  PRIORIDADES.filter((_, i) => m & (1 << i))
);
const cerca = (a: number, b: number) => Math.abs(a - b) < 1e-9;

caso("la lista: rangos de la fuente que pueden sumar 100, claves únicas y fuentes", () => {
  assert.ok(CATEGORIAS.length >= 8, "muy pocas categorías");
  assert.equal(new Set(CATEGORIAS.map((c) => c.clave)).size, CATEGORIAS.length);
  const minimos = suma(CATEGORIAS.map((c) => c.rango[0]));
  const topes = suma(CATEGORIAS.map((c) => c.rango[1]));
  assert.ok(minimos <= 100 && topes >= 100, `los rangos no pueden sumar 100: ${minimos}–${topes}`);
  for (const c of CATEGORIAS) {
    assert.ok(c.rango[0] > 0 && c.rango[1] >= c.rango[0], `${c.clave}: rango ${c.rango}`);
    assert.ok(c.es && c.en, `${c.clave} sin nombre`);
    assert.ok(/^[a-z_]+$/.test(c.clave), c.clave);
    assert.ok(c.fuente in FUENTES, `${c.clave}: fuente ${c.fuente}`);
    for (const a of c.alias) assert.ok(/^[a-z0-9]+$/.test(a), `${c.clave}: alias «${a}» no es una palabra normalizada`);
  }
  for (const f of Object.values(FUENTES)) assert.ok(f.es && f.en && /^https:\/\//.test(f.url));
  assert.match(FUENTES_CONSULTADAS, /^\d{4}-\d{2}-\d{2}$/);
  // Las cifras de la fuente, tal cual (c6444 y c9103, 27-sep-2026).
  const r = (clave: string) => CATEGORIAS.find((c) => c.clave === clave)!.rango;
  assert.deepEqual(r("lugar_banquete"), [45, 50]);
  assert.deepEqual(r("foto_video"), [10, 15]);
  assert.deepEqual(r("vestuario"), [10, 15]);
  assert.deepEqual(r("decoracion"), [8, 10]);
  assert.deepEqual(r("musica"), [5, 10]);
  assert.deepEqual(r("recuerdos"), [3, 5]);
  assert.deepEqual(r("invitaciones"), [2, 4]);
  assert.deepEqual(r("ceremonia"), [0.5, 0.5]);
  assert.deepEqual(r("imprevistos"), [10, 10]);
});

caso("porcentajes: con cualquier combinación de prioridades suman 100 y no salen de su rango", () => {
  for (const pr of COMBINACIONES) {
    const pct = porcentajes(pr);
    assert.ok(cerca(suma([...pct.values()]), 100), `${pr}: suman ${suma([...pct.values()])}`);
    for (const c of CATEGORIAS) {
      const x = pct.get(c.clave)!;
      assert.ok(x >= c.rango[0] - 1e-9 && x <= c.rango[1] + 1e-9, `${pr} → ${c.clave} ${x} fuera de ${c.rango}`);
    }
  }
});

caso("porcentajes: sin prioridades, todas a la misma altura de su rango", () => {
  const pct = porcentajes([]);
  const alturas = CATEGORIAS.filter((c) => c.rango[1] > c.rango[0]).map(
    (c) => (pct.get(c.clave)! - c.rango[0]) / (c.rango[1] - c.rango[0])
  );
  for (const a of alturas) assert.ok(cerca(a, alturas[0]), `alturas distintas: ${alturas}`);
  assert.ok(cerca(pct.get("foto_video")!, 11.25));
  assert.ok(cerca(pct.get("lugar_banquete")!, 46.25));
});

caso("porcentajes: lo prioritario sube primero al tope; lo demás, a su mínimo si no alcanza", () => {
  // Solo las fotos: caben al tope (15) y lo demás sube parejo con lo que queda.
  const fotos = porcentajes(["fotos"]);
  assert.ok(cerca(fotos.get("foto_video")!, 15));
  assert.ok(fotos.get("lugar_banquete")! > 45 && fotos.get("lugar_banquete")! < 46.25);
  // Comida y fotos: juntas piden 10 puntos y solo hay 6.5; suben parejo y lo demás queda en su mínimo.
  const dos = porcentajes(["comida", "fotos"]);
  assert.ok(cerca(dos.get("lugar_banquete")!, 45 + 5 * 0.65));
  assert.ok(cerca(dos.get("foto_video")!, 10 + 5 * 0.65));
  assert.ok(cerca(dos.get("vestuario")!, 10));
  assert.ok(cerca(dos.get("musica")!, 5));
  // Una prioridad sin categoría con rango («presupuesto», «calma») no mueve nada.
  assert.deepEqual([...porcentajes(["presupuesto", "calma"]).entries()], [...porcentajes([]).entries()]);
});

caso("partirEnteros suma exacto, en cientos, y no da negativos", () => {
  for (const cantidad of [0, 1, 99, 100, 101, 9_999, 10_000, 180_000, 180_050, 1_235_538, 50_000_000]) {
    for (const pesos of [[1], [1, 1, 1], [3, 2, 1], [0.1, 99.9], [0, 0, 5], [7.2, 1.3, 1.3, 0.05]]) {
      const unidad = cantidad >= 10_000 ? 100 : 1;
      const r = partirEnteros(cantidad, pesos, unidad);
      assert.equal(r.length, pesos.length);
      assert.equal(suma(r), cantidad, `${cantidad} en ${pesos}: ${r}`);
      assert.ok(r.every((x) => x >= 0 && Number.isInteger(x)));
      // Solo el de más peso puede no ser múltiplo de la unidad (se lleva lo que sobra).
      const noMultiplos = r.filter((x) => x % unidad !== 0).length;
      assert.ok(noMultiplos <= 1);
    }
  }
  assert.deepEqual(partirEnteros(1000, [0, 0], 1), [0, 0]);
  assert.deepEqual(partirEnteros(1000, [], 1), []);
  // Proporcional: con pesos 3:1 no puede darle más al de peso 1.
  const [a, b] = partirEnteros(100_000, [3, 1], 100);
  assert.equal(a, 75_000);
  assert.equal(b, 25_000);
});

caso("sin nada fijado: suma el presupuesto exacto y sigue los porcentajes", () => {
  for (const total of [30_000, 180_000, 250_000, 1_235_538]) {
    const r = repartir(total, [], PLAN_VACIO);
    assert.equal(r.repartido, total);
    assert.equal(r.sinRepartir, 0);
    assert.equal(r.excedido, 0);
    const pct = porcentajes([]);
    for (const c of CATEGORIAS) {
      const m = montoDe(r, c.clave);
      const ideal = (total * pct.get(c.clave)!) / 100;
      // Redondeo a cientos: a lo más una unidad de diferencia con el ideal (más
      // lo que sobra de la unidad, que va al de más peso).
      assert.ok(Math.abs(m - ideal) <= 200, `${c.clave}: ${m} vs ${ideal}`);
    }
    assert.ok(r.renglones.every((x) => !x.aMano && !x.empujada));
  }
});

caso("las prioridades suben lo suyo y lo demás baja, sin cambiar el total", () => {
  const conEmpuje = CATEGORIAS.filter((c) => c.empujan.length > 0 && c.rango[1] > c.rango[0]);
  assert.ok(conEmpuje.length >= 3, "casi ninguna categoría responde a prioridades");
  const base = repartir(200_000, [], PLAN_VACIO);
  for (const c of conEmpuje) {
    for (const p of c.empujan) {
      const r = repartir(200_000, [p], PLAN_VACIO);
      assert.equal(r.repartido, 200_000);
      assert.ok(montoDe(r, c.clave) > montoDe(base, c.clave), `${p} no sube ${c.clave}`);
      assert.ok(r.renglones.find((x) => x.id === c.clave)!.empujada);
      assert.deepEqual(r.prioridadesQueEmpujan, [p]);
      const otra = CATEGORIAS.find((x) => !x.empujan.includes(p) && x.rango[1] > x.rango[0])!;
      assert.ok(montoDe(r, otra.clave) < montoDe(base, otra.clave), `${otra.clave} debió bajar`);
    }
  }
  // Las prioridades que no mueven nada no se presumen en la pantalla.
  const r = repartir(200_000, ["presupuesto", "calma", "fotos"], PLAN_VACIO);
  assert.deepEqual(r.prioridadesQueEmpujan, ["fotos"]);
  // Fijada a mano, la categoría ya no «sube»: se dice solo de lo que se movió.
  const fijada = repartir(200_000, ["fotos"], fijar(PLAN_VACIO, "foto_video", 30_000));
  assert.equal(fijada.renglones.find((x) => x.id === "foto_video")!.empujada, false);
  assert.deepEqual(fijada.prioridadesQueEmpujan, []);
});

caso("lo fijado a mano no se mueve y lo demás se reparte lo que queda", () => {
  const [a, b] = CATEGORIAS;
  let plan = fijar(PLAN_VACIO, a.clave, 50_000);
  plan = fijar(plan, b.clave, 0);
  const r = repartir(200_000, ["comida"], plan);
  assert.equal(montoDe(r, a.clave), 50_000);
  assert.equal(montoDe(r, b.clave), 0);
  assert.ok(r.renglones.find((x) => x.id === a.clave)!.aMano);
  assert.equal(r.repartido, 200_000);
  // Cambiar el presupuesto mueve lo sugerido y deja lo fijado.
  const r2 = repartir(300_000, ["comida"], plan);
  assert.equal(montoDe(r2, a.clave), 50_000);
  assert.equal(r2.repartido, 300_000);
  // Soltarla la regresa a la sugerencia.
  const r3 = repartir(200_000, ["comida"], soltar(plan, a.clave));
  assert.equal(r3.renglones.find((x) => x.id === a.clave)!.aMano, false);
  assert.equal(soltarTodas(plan).partidas.length, 0);
});

caso("lo que no se fijó se queda dentro de su rango mientras quepa", () => {
  const total = 250_000;
  const enRango = (r: ReturnType<typeof repartir>) =>
    r.renglones
      .filter((x) => x.clave && !x.aMano)
      .every((x) => {
        const c = CATEGORIAS.find((k) => k.clave === x.clave)!;
        const pct = (x.monto / total) * 100;
        return pct >= c.rango[0] - 0.05 && pct <= c.rango[1] + 0.05; // tolerancia del redondeo a cientos
      });
  // Sin vestido que comprar (lo rentan): lo demás absorbe el 10–15% sin salirse.
  const sinVestido = repartir(total, ["fotos"], fijar(PLAN_VACIO, "vestuario", 0));
  assert.equal(sinVestido.repartido, total);
  assert.ok(enRango(sinVestido), "algo se salió de su rango sin necesidad");
  // Fotos a $50,000 (20%): ya no caben los mínimos; todo baja parejo y nada «sube».
  const fotoCara = repartir(total, ["comida"], fijar(PLAN_VACIO, "foto_video", 50_000));
  assert.equal(fotoCara.repartido, total);
  assert.deepEqual(fotoCara.prioridadesQueEmpujan, []);
  const lugar = montoDe(fotoCara, "lugar_banquete");
  const musica = montoDe(fotoCara, "musica");
  assert.ok(Math.abs(lugar / musica - 45 / 5) < 0.05, `no bajaron parejo: ${lugar} / ${musica}`);
  // Lugar en cero (la boda es en casa): todo lo demás llega a su tope y lo que
  // sobra se reparte en proporción, porque el presupuesto tiene que quedar completo.
  const enCasa = repartir(total, [], fijar(PLAN_VACIO, "lugar_banquete", 0));
  assert.equal(enCasa.repartido, total);
  assert.equal(enCasa.sinRepartir, 0);
  for (const x of enCasa.renglones.filter((r) => r.clave && !r.aMano)) {
    const c = CATEGORIAS.find((k) => k.clave === x.clave)!;
    assert.ok((x.monto / total) * 100 >= c.rango[1] - 0.05, `${x.clave} debió llegar a su tope`);
  }
});

caso("si lo fijado se pasa, se dice cuánto y lo demás queda en cero", () => {
  const [a] = CATEGORIAS;
  const r = repartir(100_000, [], fijar(PLAN_VACIO, a.clave, 130_000));
  assert.equal(r.excedido, 30_000);
  assert.equal(r.sinRepartir, 0);
  assert.ok(r.renglones.filter((x) => !x.aMano).every((x) => x.monto === 0));
});

caso("si todo está fijado y no llega, lo que sobra se dice", () => {
  let plan: PlanReparto = PLAN_VACIO;
  for (const c of CATEGORIAS) plan = fijar(plan, c.clave, 1_000);
  const r = repartir(100_000, [], plan);
  assert.equal(r.sinRepartir, 100_000 - 1_000 * CATEGORIAS.length);
  assert.equal(r.excedido, 0);
});

caso("las agregadas cuentan como fijadas y van al final", () => {
  let plan = agregar(PLAN_VACIO, "luna1", "Luna de miel");
  plan = fijar(plan, "luna1", 40_000);
  const r = repartir(200_000, [], plan);
  const ultima = r.renglones[r.renglones.length - 1];
  assert.equal(ultima.id, "luna1");
  assert.equal(ultima.nombre, "Luna de miel");
  assert.equal(ultima.monto, 40_000);
  assert.equal(r.repartido, 200_000);
  assert.equal(suma(r.renglones.filter((x) => x.clave).map((x) => x.monto)), 160_000);
  assert.equal(renombrar(plan, "luna1", "Viaje").partidas[0].nombre, "Viaje");
  // renombrar no toca categorías; quitar no borra categorías.
  const conCategoria = fijar(plan, CATEGORIAS[0].clave, 5);
  assert.equal(quitar(conCategoria, CATEGORIAS[0].clave).partidas.length, 2);
  assert.equal(quitar(plan, "luna1").partidas.length, 0);
});

caso("sin cambios, el mismo plan (no dispara un guardado para nada)", () => {
  const plan = fijar(PLAN_VACIO, "musica", 10_000);
  assert.equal(soltar(plan, "foto_video"), plan);
  assert.equal(fijar(plan, "musica", 10_000), plan);
  assert.notEqual(fijar(plan, "musica", 10_001), plan);
});

caso("fijar redondea, no acepta negativos y no inventa categorías", () => {
  const c = CATEGORIAS[0].clave;
  assert.equal(fijar(PLAN_VACIO, c, 1234.6).partidas[0].monto, 1235);
  assert.equal(fijar(PLAN_VACIO, c, -5).partidas[0].monto, 0);
  assert.equal(fijar(PLAN_VACIO, "no-existe", 100).partidas.length, 0);
});

caso("normalizarPlanReparto: lo que manda el navegador, limpio", () => {
  const c = CATEGORIAS[1].clave;
  const bien = normalizarPlanReparto({
    partidas: [
      { id: "zzz", clave: null, nombre: "  Luna\nde   miel ", monto: "40000" },
      { id: c, clave: c, nombre: "ignorado", monto: 10 },
      { id: c, clave: c, monto: 20 }, // la misma dos veces: manda la última
      { id: "vacia", clave: null, nombre: "", monto: 0 }, // abierta y nunca llenada
    ],
  });
  assert.ok("plan" in bien);
  if ("plan" in bien) {
    assert.deepEqual(bien.plan.partidas, [
      { id: c, clave: c, nombre: "", monto: 20 },
      { id: "zzz", clave: null, nombre: "Luna de miel", monto: 40_000 },
    ]);
  }
  assert.ok("error" in normalizarPlanReparto(null));
  assert.ok("error" in normalizarPlanReparto({ partidas: "x" }));
  assert.ok("error" in normalizarPlanReparto({ partidas: [{ clave: "no-existe", monto: 1 }] }));
  assert.ok("error" in normalizarPlanReparto({ partidas: [{ clave: c, monto: -1 }] }));
  assert.ok("error" in normalizarPlanReparto({ partidas: [{ clave: c, monto: 60_000_000 }] }));
  assert.ok("error" in normalizarPlanReparto({ partidas: [{ id: c, clave: null, nombre: "x", monto: 1 }] }));
  assert.ok("error" in normalizarPlanReparto({ partidas: Array.from({ length: 41 }, (_, i) => ({ id: `a${i}`, clave: null, nombre: "x", monto: 1 })) }));
  assert.ok("error" in normalizarPlanReparto({ partidas: Array.from({ length: 21 }, (_, i) => ({ id: `a${i}`, clave: null, nombre: "x", monto: 1 })) }));
  // Tolerante (al leer lo guardado): lo que no sirve se cae y lo demás se queda.
  const leido = normalizarPlanReparto(
    { partidas: [{ clave: "categoria-vieja", monto: 1 }, { clave: c, monto: 5 }, { clave: c, monto: "x" }] },
    { tolerante: true }
  );
  assert.ok("plan" in leido && leido.plan.partidas.length === 1 && leido.plan.partidas[0].monto === 5);
});

caso("lo contratado por categoría suma lo mismo que el total contratado del panel", () => {
  const checklist = [
    { category: "Lugar", contracted: 101_145, vendors: [{ vendorId: "v1" }] },
    { category: "Banquete", contracted: 480_000, vendors: [{ vendorId: "v2" }] },
    { category: "Foto", contracted: 45_000, vendors: [{ vendorId: "v3" }] },
    { category: "Video", contracted: 34_900, vendors: [{ vendorId: "v4" }] },
    { category: "Música", contracted: 21_250, vendors: [{ vendorId: "v5" }] },
    { category: "Flores", contracted: 163_750, vendors: [{ vendorId: "v6" }] },
    { category: "Invitaciones", contracted: 15_635, vendors: [{ vendorId: "v7" }] },
    { category: "Maquillaje", contracted: 7_500, vendors: [{ vendorId: "v8" }] },
    { category: "Ambulancia", contracted: 4_500, vendors: [{ vendorId: "v9" }] },
  ];
  const proveedores = [
    { id: "v2", category: "catering", status: "contratado", contractedAmount: 999 }, // ya tiene partida: no cuenta
    { id: "v10", category: "musica", status: "contratado", contractedAmount: 8_000 },
    { id: "v11", category: "foto_video", status: "cotizado", contractedAmount: 50_000 }, // cotizado: no
  ];
  const { porCategoria: r, sinCategoria } = contratadoPorCategoria(checklist, proveedores);
  const totalPanel = suma(checklist.map((c) => c.contracted)) + 8_000;
  assert.equal(suma([...r.values()]) + suma(sinCategoria.map((x) => x.monto)), totalPanel);
  assert.equal(r.get("lugar_banquete"), 101_145 + 480_000);
  assert.equal(r.get("foto_video"), 45_000 + 34_900);
  assert.equal(r.get("musica"), 21_250 + 8_000);
  assert.equal(r.get("decoracion"), 163_750);
  assert.equal(r.get("vestuario"), 7_500);
  // La ambulancia no es de ninguna categoría: se enseña aparte, con su nombre,
  // y no se come los imprevistos.
  assert.deepEqual(sinCategoria, [{ llave: "ambulancia", rotulo: "Ambulancia", monto: 4_500, generico: false }]);
  assert.equal(r.get("imprevistos"), undefined);
});

caso("los rótulos de la planner caen en su categoría", () => {
  // Los de la hoja real (Checklist I B + A.xlsx) y los slugs de vendors.category.
  const esperado: Record<string, string | null> = {};
  for (const c of CATEGORIAS) {
    for (const a of c.alias) esperado[a] = c.clave;
  }
  for (const [rotulo, clave] of Object.entries(esperado)) assert.equal(categoriaDeRotulo(rotulo), clave, rotulo);
  // Los rótulos de la hoja real, tal cual.
  const real: Record<string, string | null> = {
    "Lugar": "lugar_banquete",
    "Banquete": "lugar_banquete",
    "Foto": "foto_video",
    "Video": "foto_video",
    "Música": "musica",
    "Ceremonia": "ceremonia",
    "Flores": "decoracion",
    "Mobiliario ": "lugar_banquete", // c9103: «alquiler del espacio y mobiliario» va con el lugar
    "Invitaciones": "invitaciones",
    "Maquillaje": "vestuario",
    "Iluminacion": "decoracion",
    "Entelado": "decoracion",
    "Flores Iglesia": "decoracion", // flores, no ceremonia: gana la primera palabra
    "Pista / Estrado": "decoracion",
    "Ambulancia": null,
    "Papelitos": null,
  };
  for (const [rotulo, clave] of Object.entries(real)) assert.equal(categoriaDeRotulo(rotulo), clave, rotulo);
  // Los slugs de vendors.category (pantalla de proveedores del admin).
  const slugs: Record<string, string | null> = {
    venue: "lugar_banquete",
    catering: "lugar_banquete",
    foto_video: "foto_video",
    musica: "musica",
    flores: "decoracion",
    vestuario: "vestuario",
    invitaciones: "invitaciones",
    otro: null,
  };
  for (const [rotulo, clave] of Object.entries(slugs)) assert.equal(categoriaDeRotulo(rotulo), clave, rotulo);
  assert.equal(categoriaDeRotulo("Renta de salón"), "lugar_banquete"); // segunda vuelta
  assert.equal(categoriaDeRotulo(""), null);
  assert.equal(categoriaDeRotulo(null), null);
});

caso("leerMonto: lo que se teclea o se pega de una cotización", () => {
  assert.equal(leerMonto("150000"), 150_000);
  assert.equal(leerMonto("150,000"), 150_000);
  assert.equal(leerMonto("$150,000.00"), 150_000);
  assert.equal(leerMonto("150000.50"), 150_001); // centavos redondeados, nunca ×100
  assert.equal(leerMonto("1,500.5"), 1_501);
  assert.equal(leerMonto(" 150 000 "), 150_000);
  assert.equal(leerMonto("$ 150,000 MXN"), 150_000);
  assert.equal(leerMonto("$1,234,567.89"), 1_234_568);
  // Lo que antes se pegaba en un número que nadie escribió:
  assert.equal(leerMonto("3 $15,000"), null); // «3 pagos de $15,000» → no 315,000
  assert.equal(leerMonto("3 pagos de $15,000"), null);
  assert.equal(leerMonto("12 34"), null);
  assert.equal(leerMonto("150 mil"), null);
  assert.equal(leerMonto("1.5 millones"), null);
  assert.equal(leerMonto("1.234"), null); // punto de miles europeo: no se adivina
  assert.equal(leerMonto("0"), 0);
  assert.equal(leerMonto(""), null);
  assert.equal(leerMonto("1,50"), null); // coma mal puesta: no se adivina
  assert.equal(leerMonto("12.345.678"), null);
  assert.equal(leerMonto("abc"), null);
  assert.equal(leerMonto("1e5"), null);
  assert.equal(leerMonto("-5"), null);
});

caso("la ceremonia no se redondea a $0 con presupuestos chicos", () => {
  for (const total of [10_000, 12_345, 15_000, 19_999, 20_000]) {
    const r = repartir(total, [], PLAN_VACIO);
    assert.equal(r.repartido, total);
    assert.ok(montoDe(r, "ceremonia") > 0, `${total}: ceremonia en $0`);
  }
});

caso("sin corazón cuando todo quedó en su tope", () => {
  // Lugar fijado muy abajo: lo demás llega a su tope y sobra; ya nada «sube» más que lo demás.
  const r = repartir(200_000, ["fotos"], fijar(PLAN_VACIO, "lugar_banquete", 60_000));
  assert.deepEqual(r.prioridadesQueEmpujan, []);
  assert.ok(r.renglones.every((x) => !x.empujada));
  assert.equal(r.repartido, 200_000);
});

caso("«Otros», una sola vez aunque venga escrito de tres formas", () => {
  const r = contratadoPorCategoria(
    [
      { category: "Otros", contracted: 12_000, vendors: [{ vendorId: "a" }] },
      { category: "otro", contracted: 3_000, vendors: [{ vendorId: "b" }] },
      { category: "Other", contracted: 1_000, vendors: [{ vendorId: "c" }] },
    ],
    [{ id: "d", category: "otro", status: "contratado", contractedAmount: 2_000 }]
  );
  assert.deepEqual(r.sinCategoria, [{ llave: "otros", rotulo: "Otros", monto: 18_000, generico: true }]);
});

caso("el corazón solo donde la prioridad movió algo", () => {
  // Con lo demás fijado, a lo prioritario ya no le toca más que sin prioridades.
  let plan = fijar(PLAN_VACIO, "vestuario", 25_000);
  plan = fijar(plan, "recuerdos", 6_000);
  plan = fijar(plan, "invitaciones", 4_000);
  plan = fijar(plan, "decoracion", 18_000);
  const con = repartir(200_000, ["comida", "fotos", "fiesta"], plan);
  const sin = repartir(200_000, [], plan);
  const iguales = con.renglones.every((x, i) => x.monto === sin.renglones[i].monto);
  if (iguales) {
    assert.deepEqual(con.prioridadesQueEmpujan, []);
    assert.ok(con.renglones.every((x) => !x.empujada));
  }
  // Y cuando sí mueve, el corazón está.
  assert.deepEqual(repartir(200_000, ["fotos"], PLAN_VACIO).prioridadesQueEmpujan, ["fotos"]);
});

caso("un descuento en negativo se resta en su categoría", () => {
  const r = contratadoPorCategoria(
    [
      { category: "Banquete", contracted: 100_000, vendors: [{ vendorId: "a" }] },
      { category: "Descuento", contracted: -20_000, vendors: [{ vendorId: "b" }] },
    ],
    []
  );
  assert.equal(suma([...r.porCategoria.values()]) + suma(r.sinCategoria.map((x) => x.monto)), 80_000);
  assert.deepEqual(r.sinCategoria, [{ llave: "descuento", rotulo: "Descuento", monto: -20_000, generico: false }]);
});

caso("rótulos que engañan y los que faltaban", () => {
  const esperado: Record<string, string | null> = {
    "Protección civil": null,
    "Video DJ": "musica",
    "Ramo de novia": "decoracion",
    "Mesa de dulces": "lugar_banquete",
    "Pastel": "lugar_banquete",
    "Candy bar": "lugar_banquete",
    "Renta de mobiliario": "lugar_banquete",
    "Transporte": null,
    "Anillos": null,
    "Seguro de responsabilidad civil": null,
    "Transporte iglesia": null,
    "Traslado a la iglesia": null,
    "Argollas": null,
    "Despedida de soltera": "imprevistos",
    "Salón de belleza": "vestuario",
    "Flores mesa de dulces": "decoracion",
    "Decoración mesa de dulces": "decoracion",
    "Detalles de decoración": "decoracion",
    "Mariachis": "musica",
    "Músicos": "musica",
    "Fotógrafa": "foto_video",
    "Videógrafo": "foto_video",
    "Pastelería": "lugar_banquete",
    "Taquiza": "lugar_banquete",
    "Tornaboda": "lugar_banquete",
    "Save the date": "invitaciones",
    "Arreglos florales": "decoracion",
    "Centro de mesa": "decoracion",
    "Florista": "decoracion",
    "Maquillista": "vestuario",
    "Souvenirs": "recuerdos",
    "Servicios religiosos": "ceremonia",
    "Registro civil": "ceremonia",
    "Mixología": "lugar_banquete",
    "Coctelería": "lugar_banquete",
    "Vinos": "lugar_banquete",
    "Descorche": "lugar_banquete",
    "Mantelería": "lugar_banquete",
    "Centros de mesa": "decoracion",
    "Carpa": "lugar_banquete",
    "Orquesta": "musica",
    "Sonorización": "musica",
  };
  for (const [rotulo, clave] of Object.entries(esperado)) assert.equal(categoriaDeRotulo(rotulo), clave, rotulo);
});

console.log(`\n${ok} casos, todos bien.`);
