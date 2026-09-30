// Cifrar lo que se guarda en la base y no debe poder usarse con sólo leerla:
// hoy, el permiso de Google de la pareja (googleDeLaBoda.ts).
//
// AES-256-GCM con una llave derivada (HKDF-SHA256) de un secreto que vive
// sólo en el entorno del servidor. El resultado lleva su versión, el vector y
// la etiqueta: «v1:<base64url(iv | etiqueta | cifrado)>». Si alguien altera el
// valor en la base, o el secreto cambia, descifrar devuelve null: nunca un
// texto a medias.
//
// Puro (sólo node:crypto): se prueba con scripts/probar-cifrado.mts.
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

const VERSION = "v1";

function llave(secreto: string, para: string): Buffer {
  return Buffer.from(hkdfSync("sha256", secreto, "bluebook", para, 32));
}

/** `para` separa usos: lo cifrado para una cosa no se descifra como otra. */
export function cifrar(texto: string, secreto: string, para: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", llave(secreto, para), iv);
  const cifrado = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return `${VERSION}:${Buffer.concat([iv, c.getAuthTag(), cifrado]).toString("base64url")}`;
}

export function descifrar(valor: string, secreto: string, para: string): string | null {
  const [version, cuerpo] = valor.split(":");
  if (version !== VERSION || !cuerpo) return null;
  try {
    const bytes = Buffer.from(cuerpo, "base64url");
    if (bytes.length < 12 + 16 + 1) return null;
    const d = createDecipheriv("aes-256-gcm", llave(secreto, para), bytes.subarray(0, 12));
    d.setAuthTag(bytes.subarray(12, 28));
    return Buffer.concat([d.update(bytes.subarray(28)), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}
