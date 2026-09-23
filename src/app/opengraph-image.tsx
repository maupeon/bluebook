import { ImageResponse } from "next/og";

/*
 * La tarjeta que aparece al pegar un enlace de bluebook.mx en WhatsApp,
 * Instagram o iMessage. Antes todas las páginas apuntaban a /og-image.jpg, que
 * nunca existió: el enlace salía sin imagen.
 *
 * Se genera al compilar. Las fuentes se piden a Google Fonts; si no hay red,
 * sale con la fuente por defecto en vez de romper el build.
 */

export const alt = "Blue Book — Tu boda en un solo lugar. Tú, tranquila.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function googleFont(family: string, weight: number, italic = false): Promise<ArrayBuffer | null> {
  try {
    const axis = italic ? `ital,wght@1,${weight}` : `wght@${weight}`;
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:${axis}`, {
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
  const [serif, serifItalic, script] = await Promise.all([
    googleFont("Cormorant Garamond", 500),
    googleFont("Cormorant Garamond", 500, true),
    googleFont("Sacramento", 400),
  ]);

  const fonts = [
    serif && { name: "Cormorant", data: serif, weight: 500 as const, style: "normal" as const },
    serifItalic && { name: "Cormorant", data: serifItalic, weight: 500 as const, style: "italic" as const },
    script && { name: "Sacramento", data: script, weight: 400 as const, style: "normal" as const },
  ].filter(Boolean) as { name: string; data: ArrayBuffer; weight: 400 | 500; style: "normal" | "italic" }[];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 84px",
          background: "#f6f5f2",
          backgroundImage:
            "radial-gradient(ellipse 560px 420px at 88% 20%, #dbe5f3 0%, rgba(225,233,245,0) 70%), radial-gradient(ellipse 420px 300px at 8% 100%, #e6edf7 0%, rgba(225,233,245,0) 70%)",
          color: "#1c2d4f",
          fontFamily: "Cormorant",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 30, letterSpacing: 6, textTransform: "uppercase", color: "#345e8f" }}>
          Blue Book
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, lineHeight: 1, letterSpacing: -2 }}>Tu boda en un solo lugar.</div>
          <div style={{ fontSize: 96, lineHeight: 1.1, letterSpacing: -2, fontStyle: "italic", color: "#4a76a8" }}>
            Tú, tranquila.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ fontSize: 30, color: "#56657f", maxWidth: 640, lineHeight: 1.3 }}>
            Proveedores, pagos, pendientes, invitaciones y confirmaciones, con una wedding planner real.
          </div>
          <div style={{ fontFamily: "Sacramento", fontSize: 58, color: "#3a5282", whiteSpace: "nowrap", flexShrink: 0 }}>Something blue.</div>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined }
  );
}
