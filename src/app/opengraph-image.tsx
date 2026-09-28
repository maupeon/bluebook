import { ImageResponse } from "next/og";

/*
 * La tarjeta que aparece al pegar un enlace de bluebook.mx en WhatsApp,
 * Instagram o iMessage. Antes todas las páginas apuntaban a /og-image.jpg, que
 * nunca existió: el enlace salía sin imagen.
 *
 * Se genera al compilar. Las fuentes se piden a Google Fonts; si no hay red,
 * sale con la fuente por defecto en vez de romper el build.
 *
 * Es una pieza de la marca como las del Instagram: papel azul plano (nunca un
 * degradado), el titular en el marcador (Caveat Brush), en mayúsculas, azul
 * noche y centrado, con su estrellita y su corazón a los lados; el texto de
 * apoyo en Work Sans Light, y el cierre en la frase (Sacramento). Caveat Brush
 * y Sacramento son los «equivalentes digitales» de la guía: satori no lee el
 * woff2 de BELLABOO ni el de Lazy Dog que usa el sitio.
 */

export const alt = "Blue Book — Tu boda en un solo lugar. Tú, tranquila.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// satori no lee variables CSS: son los valores de --papel, --tinta y --noche
// de globals.css. Si cambian allá, cambian aquí.
const PAPEL = "#e8edf8";
const TINTA = "#55688c";
const NOCHE = "#2e3a55";

async function googleFont(family: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}`, {
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

/* Los mismos adornos que .adornado en globals.css: estrellas a la izquierda,
   corazón a la derecha, en tinta y a la mitad del alto de la letra. */
function Estrellas({ tam }: { tam: number }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 32 32" fill="none" stroke={TINTA} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 8.5C19.5 15 21.4 17.2 28.5 18.2C21.5 19.1 19.6 21.4 18.9 28.5C18.3 21.5 16.2 19.3 9.5 18.3C16.3 17.3 18.4 15.1 19 8.5Z" />
      <path d="M6.5 3C6.8 5.6 7.6 6.3 10 6.6C7.6 6.9 6.8 7.7 6.4 10.2C6.1 7.7 5.3 6.9 3 6.6C5.4 6.3 6.2 5.5 6.5 3Z" />
    </svg>
  );
}

function Corazon({ tam }: { tam: number }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 32 32" fill="none" stroke={TINTA} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 27.5C6.2 22.4 3.4 18 4.6 13.4C5.8 9.2 10.6 8.6 13.4 12.4C16.4 8.3 21.6 8.9 22.7 13.1C23.9 17.8 20.6 22.3 13.5 27.5Z" />
      <path d="M26.5 3.5C26.8 5.9 27.5 6.6 29.6 6.9C27.5 7.2 26.8 7.9 26.4 10.2C26.1 7.9 25.4 7.2 23.4 6.9C25.4 6.6 26.2 5.9 26.5 3.5Z" />
    </svg>
  );
}

export default async function OpengraphImage() {
  const [marcador, apoyo, frase] = await Promise.all([
    googleFont("Caveat Brush", 400),
    googleFont("Work Sans", 300),
    googleFont("Sacramento", 400),
  ]);

  const fonts = [
    marcador && { name: "Caveat Brush", data: marcador, weight: 400 as const, style: "normal" as const },
    apoyo && { name: "Work Sans", data: apoyo, weight: 300 as const, style: "normal" as const },
    frase && { name: "Sacramento", data: frase, weight: 400 as const, style: "normal" as const },
  ].filter(Boolean) as { name: string; data: ArrayBuffer; weight: 300 | 400; style: "normal" }[];

  // El titular: 74px, dos líneas. A ≈0.48em por carácter, «TU BODA EN UN
  // SOLO LUGAR.» mide ~890px; con los adornos (~115px) queda en ~1000, dentro
  // de los 1056 que deja el margen.
  const TITULAR = 74;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "64px 72px 56px",
          background: PAPEL,
          color: NOCHE,
          fontFamily: "Work Sans",
          fontWeight: 300,
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "Caveat Brush",
            fontSize: 40,
            textTransform: "uppercase",
            color: NOCHE,
          }}
        >
          Blue Book
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: TITULAR * 0.28 }}>
          <div style={{ display: "flex", marginTop: -TITULAR * 0.12 }}>
            <Estrellas tam={TITULAR * 0.5} />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              fontFamily: "Caveat Brush",
              fontSize: TITULAR,
              lineHeight: 1.02,
              letterSpacing: TITULAR * 0.015,
              textTransform: "uppercase",
              textAlign: "center",
            }}
          >
            <div style={{ color: NOCHE }}>Tu boda en un solo lugar.</div>
            <div style={{ color: TINTA }}>Tú, tranquila.</div>
          </div>
          <div style={{ display: "flex", marginTop: TITULAR * 0.08 }}>
            <Corazon tam={TITULAR * 0.5} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ fontSize: 28, color: TINTA, maxWidth: 820, lineHeight: 1.35, textAlign: "center" }}>
            Proveedores, pagos, pendientes, invitaciones y confirmaciones, con una wedding planner real.
          </div>
          <div style={{ marginTop: 10, fontFamily: "Sacramento", fontSize: 54, color: NOCHE }}>Something blue.</div>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined }
  );
}
