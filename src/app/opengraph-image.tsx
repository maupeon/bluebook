import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/*
 * La tarjeta que aparece al pegar un enlace de bluebook.mx en WhatsApp,
 * Instagram o iMessage. Se genera al compilar.
 *
 * Es una pieza de la marca de Blu: crema plana, el logotipo «blue book» en
 * azul, el titular en DynaPuff vino con «con Blu» en Playpen Sans y su trazo
 * de mantequilla, y Blu a la derecha. Las fuentes se piden a Google Fonts; si
 * no hay red, sale con la fuente por defecto en vez de romper el build.
 * satori no lee WebP: Blu va en PNG (src/assets/blu-og.png).
 */

export const alt = "Blue Book — Planea tu boda con Blu";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// satori no lee variables CSS: son los valores de globals.css. Si cambian
// allá, cambian aquí.
const PAPEL = "#f8f1e8";
const TINTA = "#5b6175";
const NOCHE = "#46516f";
const VINO = "#69000f";
const AZUL = "#2f5487";
const CIELO_CLARO = "#e4e9f3";
const MANTEQUILLA = "#f2d65a";

// Con &text= Google entrega sólo esas letras, y sin las tablas de ligaduras
// contextuales (GSUB tipo 7) que satori todavía no sabe leer.
async function googleFont(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}&text=${encodeURIComponent(text)}`, {
        // Sin navegador moderno en el User-Agent, Google entrega TTF, que es
        // lo que ImageResponse sabe leer (no woff2).
        headers: { "User-Agent": "Mozilla/5.0 (compatible; og-image)" },
      })
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const [titular, frase, apoyo, blu] = await Promise.all([
    googleFont("DynaPuff", 600, "blue bookPlanea tu boda"),
    googleFont("Playpen Sans", 600, "con Blu"),
    googleFont("Poppins", 400, "Proveedores, pagos, invitaciones y confirmaciones en un solo lugar."),
    readFile(join(process.cwd(), "src/assets/blu-og.png")).then((b) => `data:image/png;base64,${b.toString("base64")}`),
  ]);

  const fonts = [
    titular && { name: "DynaPuff", data: titular, weight: 600 as const, style: "normal" as const },
    frase && { name: "Playpen Sans", data: frase, weight: 600 as const, style: "normal" as const },
    apoyo && { name: "Poppins", data: apoyo, weight: 400 as const, style: "normal" as const },
  ].filter(Boolean) as { name: string; data: ArrayBuffer; weight: 400 | 600; style: "normal" }[];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "0 50px 0 76px",
          background: PAPEL,
          fontFamily: "Poppins",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", fontFamily: "DynaPuff", fontSize: 44, color: AZUL, letterSpacing: -1 }}>
            blue book
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 34,
              fontFamily: "DynaPuff",
              fontSize: 74,
              lineHeight: 1.04,
              letterSpacing: -1.5,
              color: NOCHE,
            }}
          >
            <div>Planea tu boda</div>
            <div style={{ display: "flex", flexDirection: "column", alignSelf: "flex-start" }}>
              <div style={{ fontFamily: "Playpen Sans", color: VINO }}>con Blu</div>
              <div style={{ height: 12, marginTop: -8, borderRadius: 8, background: MANTEQUILLA }} />
            </div>
          </div>
          <div style={{ marginTop: 30, fontSize: 27, lineHeight: 1.4, color: TINTA, maxWidth: 560 }}>
            Proveedores, pagos, invitaciones y confirmaciones en un solo lugar.
          </div>
        </div>

        <div style={{ display: "flex", position: "relative", width: 430, height: 470, alignItems: "flex-end", justifyContent: "center" }}>
          <div
            style={{
              position: "absolute",
              left: 10,
              right: 10,
              top: 90,
              bottom: 10,
              borderRadius: "48% 52% 46% 54% / 55% 50% 50% 45%",
              background: CIELO_CLARO,
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={blu} width={396} height={430} alt="" style={{ position: "relative" }} />
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined }
  );
}
