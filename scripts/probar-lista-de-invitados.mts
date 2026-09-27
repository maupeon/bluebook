// Pruebas del lector de listas de invitados (src/lib/listaDeInvitados.ts).
// Sin framework: node trae assert y quita los tipos solo.
//
//   node --experimental-strip-types scripts/probar-lista-de-invitados.mts
//
// Cada caso salió de una hoja real o de un hallazgo de revisión: la de la
// planner (NUMERO DE BOLETOS…), celdas de Sheets con saltos de línea, Excel en
// notación científica, «Teléfono | Celular», «Adultos | Niños | Total».
import assert from "node:assert/strict";
import { leerLista, leerTabla, normalizarTelefono } from "../src/lib/listaDeInvitados.ts";

let ok = 0;
const caso = (nombre: string, fn: () => void) => {
  fn();
  ok++;
  console.log("✓", nombre);
};
const L = (t: string, o?: { pegado?: boolean }) => leerLista(leerTabla(t, o));

caso("teléfonos", () => {
  const t = (s: string) => normalizarTelefono(s).telefono;
  assert.equal(t("55 1234 5678"), "+525512345678");
  assert.equal(t("+52 1 55 1234 5678"), "+525512345678");
  assert.equal(t("044 55 1234 5678"), "+525512345678");
  assert.equal(t("5512345678.0"), "+525512345678");
  assert.equal(t("5.512345678E+09"), "+525512345678");
  assert.equal(t("55 1234 5678 / 55 8765 4321"), "+525512345678");
  assert.equal(t("+1 (512) 555-0100"), "+15125550100");
  assert.equal(t("612 345 678"), null); // 9 dígitos sin lada: ya no se supone España
  assert.equal(normalizarTelefono("5512345").problema, "incompleto");
  assert.equal(normalizarTelefono("#ERROR!").problema, "ilegible");
  assert.equal(normalizarTelefono("#N/A").problema, "ilegible");
  assert.equal(normalizarTelefono("").problema, "vacio");
});

caso("pegado de Google Sheets con celda de varias líneas y comillas", () => {
  const texto = 'Nombre\tCelular\tPersonas\tNotas\nFamilia López\t55 1234 5678\t4\t"vegano;\nmesa cerca de la pista"\nTía "Tita" Rosa\t5587654321\t2 personas\t\n\t\t\t\nTOTAL\t\t6\t\n';
  const r = leerLista(leerTabla(texto));
  assert.equal(r.filaDeEncabezados, 1);
  assert.equal(r.filas.length, 2);
  assert.deepEqual(r.filas[0], { fila: 2, nombre: "Familia López", telefono: "+525512345678", pases: 4, notas: "mesa cerca de la pista", dieta: "vegano", contacto: null, lado: null });
  assert.equal(r.filas[1].nombre, 'Tía "Tita" Rosa');
  assert.equal(r.filas[1].pases, 2);
});

caso("la hoja real de la planner (CONFIRMACIONES)", () => {
  const texto = [
    "\t\t\t582\t515\t67",
    "NOMBRE DEL INVITADO\tNOMBRE DE CONTACTO\tNUMERO DE CELULAR\tNUMERO DE BOLETOS\tCONFIRMADOS\tCANCELADOS\tESTATUS\tNOTAS",
    "Familia Pérez Gómez\tLuis Pérez\t442 123 4567\t7\t7\t0\t\tMENU VEGANO",
    "Sra. Martha Ruiz\tMartha Ruiz\t#ERROR!\t1\t1\t0\t\t",
  ].join("\n");
  const r = leerLista(leerTabla(texto));
  assert.equal(r.columnas.nombre, 0); assert.equal(r.columnas.contacto, 1); assert.equal(r.columnas.telefono, 2); assert.equal(r.columnas.pases, 3);
  assert.equal(r.filas.length, 2);
  assert.equal(r.filas[0].contacto, "Luis Pérez");
  assert.equal(r.filas[0].dieta, "MENU VEGANO");
  assert.equal(r.filas[1].contacto, null);
  assert.equal(r.filas[1].telefono, null);
  assert.ok(r.avisos.some((a) => a.fila === 4 && a.tipo === "telefono_ilegible"));
});

caso("sin encabezados: se deduce por los valores", () => {
  const r = leerLista(leerTabla("Ana López,55 1111 2222,2\nPedro Díaz,55 3333 4444,1\nLuisa Gómez,,3"));
  assert.equal(r.filaDeEncabezados, null);
  assert.deepEqual([r.columnas.nombre, r.columnas.telefono, r.columnas.pases], [0, 1, 2]);
  assert.equal(r.filas.length, 3);
  assert.equal(r.filas[2].pases, 3);
});

caso("en inglés, con acompañantes y renglón «No.»", () => {
  const r = leerLista(leerTabla("No.\tName\tPhone\tPlus ones\tSide\n1\tJohn Smith\t+1 512 555 0100\t1\tGroom\n2\tJane Roe\t\t0\tBride"));
  assert.equal(r.columnas.nombre, 1); assert.equal(r.columnas.telefono, 2); assert.equal(r.columnas.acompanantes, 3); assert.equal(r.columnas.lado, 4);
  assert.equal(r.filas[0].pases, 2); assert.equal(r.filas[0].lado, "novio");
  assert.equal(r.filas[1].pases, 1); assert.equal(r.filas[1].telefono, null);
});

caso("«Invitados» con nombres y «Pases» aparte", () => {
  const r = leerLista(leerTabla("Invitados;WhatsApp;Pases\nAna;5511112222;2\nBeto;5533334444;1"));
  assert.equal(r.columnas.nombre, 0); assert.equal(r.columnas.pases, 2); assert.equal(r.columnas.telefono, 1);
  assert.equal(r.filas.length, 2);
});

caso("pases imposibles no entran y el nombre largo se recorta con aviso", () => {
  const largo = "A".repeat(90);
  const r = leerLista(leerTabla(`Nombre\tPases\nJuan\t50\n${largo}\t2\nSin nombre?\t\n\t3`));
  assert.equal(r.filas.length, 2);
  assert.ok(r.avisos.some((a) => a.tipo === "pases_fuera_de_rango"));
  assert.ok(r.avisos.some((a) => a.tipo === "nombre_recortado"));
  assert.equal(r.filas[0].nombre.length, 80);
});

caso("la columna elegida a mano manda", () => {
  const tabla = leerTabla("Nombre\tDato raro\nAna\t5511112222");
  const r = leerLista(tabla, { telefono: 1 });
  assert.equal(r.filas[0].telefono, "+525511112222");
  const r2 = leerLista(tabla, { telefono: -1 });
  assert.equal(r2.filas[0].telefono, null);
});


caso("solo nombres, con y sin encabezado", () => {
  const a = leerLista(leerTabla("Nombre\nAna\nBeto"));
  assert.equal(a.filaDeEncabezados, 1); assert.equal(a.filas.length, 2);
  const b = leerLista(leerTabla("Ana\nBeto\nCarla"));
  assert.equal(b.filaDeEncabezados, null); assert.equal(b.filas.length, 3);
  assert.equal(b.avisos.filter((x) => x.tipo === "sin_telefono").length, 3);
});
caso("CSV de Excel con punto y coma y BOM", () => {
  const r = leerLista(leerTabla("﻿Nombre;Teléfono;Boletos\r\nMaría José;55-1234-5678;3\r\n"));
  assert.equal(r.filas[0].nombre, "María José"); assert.equal(r.filas[0].telefono, "+525512345678"); assert.equal(r.filas[0].pases, 3);
});
caso("encabezado repetido a media lista", () => {
  const r = leerLista(leerTabla("Nombre\tCelular\nAna\t5511112222\nNombre\tCelular\nBeto\t5533334444"));
  assert.equal(r.filas.length, 2);
});

console.log(`
${ok} casos bien`);

caso("notación científica: solo si es exacta", () => {
  assert.equal(normalizarTelefono("5.21551E+12").problema, "recortado");
  assert.equal(normalizarTelefono("5.25512E+11").problema, "recortado");
  assert.equal(normalizarTelefono("5.512345678E+09").telefono, "+525512345678");
});
caso("errores de dedo no se vuelven otro país", () => {
  for (const x of ["55123456789", "044 55 1234 567", "81 1234 567", "612 345 678"]) assert.equal(normalizarTelefono(x).telefono, null, x);
  assert.equal(normalizarTelefono("01 33 3612 3456").telefono, "+523336123456");
  assert.equal(normalizarTelefono("+52 55 1234 5678 ext 12").telefono, "+525512345678");
  assert.equal(normalizarTelefono("34 612 345 678").telefono, "+34612345678");
  assert.equal(normalizarTelefono("44 7911 123456").telefono, "+447911123456");
  assert.equal(normalizarTelefono("49 151 12345678").telefono, "+4915112345678");
  assert.equal(normalizarTelefono("+57 300 123 4567").telefono, "+573001234567");
});
caso("WhatsApp gana a Celular y Celular a Teléfono; el fijo nunca", () => {
  const r = leerLista(leerTabla("Nombre\tTeléfono\tCelular\tPases\nAna\t4421234567\t5511112222\t2"));
  assert.equal(r.columnas.telefono, 2); assert.equal(r.filas[0].telefono, "+525511112222");
  assert.ok(r.notas.some((n) => n.tipo === "varios_telefonos"));
  const r2 = leerLista(leerTabla("Nombre\tTeléfono fijo\tWhatsApp\nAna\t4421234567\t5511112222"));
  assert.equal(r2.columnas.telefono, 2);
});
caso("pases: «No. de personas», «# de pases», «Total de pases», «Núm. de invitados»", () => {
  for (const h of ["No. de personas", "# de pases", "Total de pases", "Núm. de invitados", "N° de pases", "Cantidad de pases", "No. Pases"]) {
    const r = leerLista(leerTabla(`Nombre\tCelular\t${h}\nAna\t5511112222\t4`));
    assert.equal(r.filas[0].pases, 4, h);
  }
});
caso("Total gana a Adultos; Adultos + Niños sin total se suman", () => {
  const r = leerLista(leerTabla("Nombre\tTeléfono\tAdultos\tNiños\tTotal\nFam\t5511112222\t2\t3\t5"));
  assert.equal(r.filas[0].pases, 5);
  const r2 = leerLista(leerTabla("Nombre\tTeléfono\tAdultos\tNiños\nFam\t5511112222\t2\t3"));
  assert.equal(r2.filas[0].pases, 5); assert.ok(r2.notas.some((n) => n.tipo === "adultos_mas_ninos"));
  const r3 = leerLista(leerTabla("Nombre\tAsistentes\tCelular\tPases\nFam\t2\t5511112222\t4"));
  assert.equal(r3.filas[0].pases, 4);
});
caso("nombre: «Nombre» antes que «Grupo»; «Apellido» se une", () => {
  const r = leerLista(leerTabla("Grupo\tNombre\tCelular\nAmigos novia\tAna Ruiz\t5511112222"));
  assert.equal(r.filas[0].nombre, "Ana Ruiz");
  const r2 = leerLista(leerTabla("Nombre\tApellido\tCelular\nMaría\tLópez\t5511112222"));
  assert.equal(r2.filas[0].nombre, "María López");
});
caso("«Contacto» lleno de celulares es el teléfono", () => {
  const r = leerLista(leerTabla("Nombre\tContacto\tPases\nAna\t5511112222\t2\nBeto\t5533334444\t1"));
  assert.equal(r.columnas.telefono, 1); assert.equal(r.columnas.contacto, -1);
  assert.equal(r.filas[0].telefono, "+525511112222");
});
caso("pegar una sola columna con comas no parte los nombres", () => {
  const r = leerLista(leerTabla("Nombre\nPérez López, Juan\nFamilia Ruiz (Ana, Luis y Pedro)", { pegado: true }));
  assert.deepEqual(r.filas.map((f) => f.nombre), ["Pérez López, Juan", "Familia Ruiz (Ana, Luis y Pedro)"]);
  const csv = leerLista(leerTabla("Nombre,Celular\nAna,5511112222\nBeto,5533334444", { pegado: true }));
  assert.equal(csv.filas[1].telefono, "+525533334444");
});
caso("sin encabezados, el número de renglón no son los pases", () => {
  const filas = Array.from({ length: 25 }, (_, i) => `${i + 1}\tInvitado ${i + 1}\t55${String(10000000 + i)}\t2`).join("\n");
  const r = leerLista(leerTabla(filas));
  assert.equal(r.columnas.pases, 3); assert.equal(r.filas.length, 25); assert.ok(r.filas.every((f) => f.pases === 2));
});
caso("aviso cuando no hay columna de pases", () => {
  const r = leerLista(leerTabla("Nombre\tCelular\nAna\t5511112222"));
  assert.ok(r.notas.some((n) => n.tipo === "sin_columna_de_pases"));
});

caso("«Total confirmados» no le gana a «Pases»", () => {
  assert.equal(L("Nombre\tCelular\tPases\tTotal confirmados\nAna\t5511112222\t4\t2").filas[0].pases, 4);
  assert.equal(L("Nombre\tCelular\tBoletos\tTotal asistentes\nAna\t5511112222\t4\t2").filas[0].pases, 4);
  assert.equal(L("Nombre\tCelular\tPases\tTotal adultos\tTotal niños\nAna\t5511112222\t4\t2\t2").filas[0].pases, 4);
  assert.equal(L("Nombre\tCelular\tTotal de pases\tPases\nAna\t5511112222\t5\t4").filas[0].pases, 5);
});
caso("sin encabezados: pases no es la mesa, los niños ni los cancelados", () => {
  const r = L("Ana\t5511112222\t2\t5\nBeto\t5533334444\t3\t7\nCarla\t5544445555\t1\t2\nDani\t5566667777\t4\t9");
  assert.deepEqual(r.filas.map((f) => f.pases), [2, 3, 1, 4]);
  assert.ok(r.notas.some((n) => n.tipo === "varias_columnas_de_pases"));
  const planner = L("Fam A\tLuis\t4421111111\t4\t4\t0\nFam B\tAna\t4422222222\t3\t2\t1\nFam C\tSol\t4423333333\t1\t0\t1\nFam D\tJuan\t4424444444\t4\t4\t0");
  assert.deepEqual(planner.filas.map((f) => f.pases), [4, 3, 1, 4]);
});
caso("listas chicas sin encabezado conservan sus pases", () => {
  assert.equal(L("Ana\t5511112222\t3").filas[0].pases, 3);
  assert.deepEqual(L("Ana\t5511112222\t1\nBeto\t5533334444\t2").filas.map((f) => f.pases), [1, 2]);
});
caso("«Cantidad» y «¿Cuántos?» vuelven a ser pases", () => {
  assert.equal(L("Nombre\tCelular\tCantidad\nAna\t5511112222\t4").filas[0].pases, 4);
  assert.equal(L("Nombre\tCelular\t¿Cuántos?\nAna\t5511112222\t4").filas[0].pases, 4);
});
caso("una columna pegada respeta comillas y saltos de línea", () => {
  const r = L('Nombre\n"Tía ""Tita"" Rosa"\n"Familia López\n(Ana y Luis)"', { pegado: true });
  assert.deepEqual(r.filas.map((f) => f.nombre), ['Tía "Tita" Rosa', "Familia López (Ana y Luis)"]);
});
caso("CSV pegado con una fila incompleta o con título arriba", () => {
  const r = L("Nombre,Celular,Pases\nAna,5511112222,2\nBeto,5533334444", { pegado: true });
  assert.equal(r.filas[1].telefono, "+525533334444");
  const t = L("Mi lista de invitados\nNombre,Celular,Pases\nAna,5511112222,2", { pegado: true });
  assert.equal(t.filas[0].telefono, "+525511112222");
});
caso("teléfonos: variantes de celular y fijos fuera", () => {
  for (const h of ["Teléfono\tTeléfono celular", "Teléfono\tCelulares", "Tel.\tTel. celular", "Phone\tCellphone"]) {
    const r = L(`Nombre\t${h}\nAna\t4421234567\t5511112222`);
    assert.equal(r.filas[0].telefono, "+525511112222", h);
  }
  assert.equal(L("Nombre\tTeléfono fijo\tNúmero\nAna\t4421234567\t5511112222").filas[0].telefono, "+525511112222");
});
caso("sin «+», un dígito de más no se vuelve otro país", () => {
  for (const x of ["81 1234 56789", "998 123 45678", "33 1234 56789", "56 1234 56789"]) assert.equal(normalizarTelefono(x).telefono, null, x);
  assert.equal(normalizarTelefono("+33 6 12 34 56 78").telefono, "+33612345678");
  for (const x of ["55 1234 5678 ext12", "55-1234-5678ext12", "55 1234 5678 x 12", "55 1234 5678 extensión 3"]) assert.equal(normalizarTelefono(x).telefono, "+525512345678", x);
});
caso("«Invitados» con nombres le gana a «Grupo»", () => {
  const r = L("Grupo\tInvitados\tCelular\tPases\nAmigos novia\tAna Ruiz\t5511112222\t2");
  assert.equal(r.filas[0].nombre, "Ana Ruiz"); assert.equal(r.filas[0].pases, 2);
});
caso("siguen igual: planner real, inglés, punto y coma", () => {
  const p = L("NOMBRE DEL INVITADO\tNOMBRE DE CONTACTO\tNUMERO DE CELULAR\tNUMERO DE BOLETOS\tCONFIRMADOS\tCANCELADOS\tESTATUS\tNOTAS\nFam Pérez\tLuis Pérez\t442 123 4567\t7\t7\t0\t\tMENU VEGANO");
  assert.equal(p.filas[0].pases, 7); assert.equal(p.filas[0].telefono, "+524421234567"); assert.equal(p.filas[0].contacto, "Luis Pérez");
  const e = L("No.\tName\tPhone\tPlus ones\tSide\n1\tJohn Smith\t+1 512 555 0100\t1\tGroom");
  assert.equal(e.filas[0].pases, 2); assert.equal(e.filas[0].telefono, "+15125550100");
  assert.equal(L("Invitados;WhatsApp;Pases\nAna;5511112222;2").filas[0].pases, 2);
  assert.equal(normalizarTelefono("34 612 345 678").telefono, "+34612345678");
  assert.equal(normalizarTelefono("44 7911 123456").telefono, "+447911123456");
});

console.log(`\n${ok} casos bien`);
