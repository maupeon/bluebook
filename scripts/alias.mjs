// Para probar con node los módulos puros que importan con «@/…»:
//
//   node --experimental-strip-types --import ./scripts/alias.mjs scripts/probar-….mts
//
// Resuelve «@/lib/x» a src/lib/x.ts, como hace el alias de tsconfig.json.
import { register } from "node:module";

register(
  "data:text/javascript," +
    encodeURIComponent(`
      const raiz = new URL("../src/", ${JSON.stringify(import.meta.url)});
      export function resolve(especificador, contexto, siguiente) {
        if (especificador.startsWith("@/")) {
          return siguiente(new URL(especificador.slice(2) + ".ts", raiz).href, contexto);
        }
        return siguiente(especificador, contexto);
      }
    `)
);
