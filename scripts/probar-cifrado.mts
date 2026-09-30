// Pruebas de src/lib/cifrado.ts.
//
//   node --experimental-strip-types scripts/probar-cifrado.mts
import assert from "node:assert/strict";
import { cifrar, descifrar } from "../src/lib/cifrado.ts";

let ok = 0;
const caso = (nombre: string, fn: () => void) => {
  fn();
  ok++;
  console.log("✓", nombre);
};

const SECRETO = "un-secreto-de-prueba-que-no-es-de-nadie";
const PERMISO = "1//0gEjemploDePermisoDeGoogle-con_guiones.y.puntos-áé";

caso("lo cifrado se descifra con el mismo secreto y el mismo uso", () => {
  const c = cifrar(PERMISO, SECRETO, "google");
  assert.match(c, /^v1:[A-Za-z0-9_-]+$/);
  assert.equal(c.includes(PERMISO), false);
  assert.equal(descifrar(c, SECRETO, "google"), PERMISO);
});

caso("dos veces lo mismo no da el mismo cifrado", () => {
  assert.notEqual(cifrar(PERMISO, SECRETO, "google"), cifrar(PERMISO, SECRETO, "google"));
});

caso("con otro secreto, otro uso o un valor alterado no sale nada", () => {
  const c = cifrar(PERMISO, SECRETO, "google");
  assert.equal(descifrar(c, SECRETO + "x", "google"), null);
  assert.equal(descifrar(c, SECRETO, "otra-cosa"), null);
  const alterado = c.slice(0, -2) + (c.endsWith("AA") ? "BB" : "AA");
  assert.equal(descifrar(alterado, SECRETO, "google"), null);
  assert.equal(descifrar("v2:" + c.slice(3), SECRETO, "google"), null);
  assert.equal(descifrar("", SECRETO, "google"), null);
  assert.equal(descifrar("v1:corto", SECRETO, "google"), null);
  assert.equal(descifrar(PERMISO, SECRETO, "google"), null);
});

console.log(`\n${ok} casos bien`);
