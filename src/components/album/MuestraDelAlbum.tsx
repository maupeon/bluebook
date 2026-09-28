import { Cake, DiscoBall, Envelopes, Heart, Polaroid, Rings, Sparkle, Toast } from "@/components/marketing/Ink";
import { Watercolor } from "@/components/marketing/Watercolor";

/*
 * LA MUESTRA DEL ÁLBUM, para quien todavía no lo tiene: la portada con el
 * nombre de la pareja, unas páginas de fotos y el QR que escanean los
 * invitados. Dibujada en HTML y con la tinta de la marca, no una captura: se
 * traduce sola, se ve nítida y no promete una foto que no es suya. Las «fotos»
 * son las ilustraciones de la marca, a propósito: nadie confunde un dibujo con
 * su álbum.
 *
 * Es decorativa de principio a fin (aria-hidden); lo que enseña se dice en
 * texto en el figcaption.
 */

const DIBUJOS = [
  { clave: "anillos", Dibujo: Rings },
  { clave: "pastel", Dibujo: Cake },
  { clave: "brindis", Dibujo: Toast },
  { clave: "pista", Dibujo: DiscoBall },
  { clave: "camara", Dibujo: Polaroid },
  { clave: "sobres", Dibujo: Envelopes },
] as const;

/*
 * Un QR de mentira: las tres esquinas de un QR de verdad y el resto de módulos
 * salidos de un generador con semilla fija. Determinista, así que el servidor y
 * el navegador pintan lo mismo (sin saltos al hidratar). No lleva a ningún
 * lado, a propósito: es la muestra.
 */
const LADO_QR = 25;

function modulosDelQr(): string {
  // Congruencial lineal en 32 bits (Math.imul): el mismo resultado en
  // cualquier motor, sin depender de la precisión de los flotantes.
  let semilla = 20260928;
  const azar = () => {
    semilla = (Math.imul(semilla, 1103515245) + 12345) >>> 0;
    return semilla / 4294967296;
  };
  // Las tres esquinas (7×7) con su margen de un módulo.
  const enEsquina = (x: number, y: number) =>
    (x < 8 && y < 8) || (x >= LADO_QR - 8 && y < 8) || (x < 8 && y >= LADO_QR - 8);
  const partes: string[] = [];
  const cuadro = (x: number, y: number) => partes.push(`M${x} ${y}h1v1h-1z`);

  for (let y = 0; y < LADO_QR; y++) {
    for (let x = 0; x < LADO_QR; x++) {
      if (enEsquina(x, y)) continue;
      if (azar() < 0.46) cuadro(x, y);
    }
  }
  // Cada esquina: anillo de 7, hueco de 5 y ojo de 3.
  for (const [ox, oy] of [
    [0, 0],
    [LADO_QR - 7, 0],
    [0, LADO_QR - 7],
  ]) {
    partes.push(`M${ox} ${oy}h7v7h-7z M${ox + 1} ${oy + 1}v5h5v-5z M${ox + 2} ${oy + 2}h3v3h-3z`);
  }
  return partes.join(" ");
}

const D_DEL_QR = modulosDelQr();

function QrDeMuestra({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`-1 -1 ${LADO_QR + 2} ${LADO_QR + 2}`}
      className={className}
      aria-hidden="true"
      focusable="false"
      shapeRendering="crispEdges"
    >
      <rect x={-1} y={-1} width={LADO_QR + 2} height={LADO_QR + 2} fill="var(--niebla)" />
      {/* evenodd: el hueco de cada esquina queda vacío. */}
      <path d={D_DEL_QR} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

/** «2027-02-14» → «14 · 02 · 2027». Sin fecha, nada. */
function fechaDePortada(fecha: string | null): string | null {
  const m = fecha ? /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha) : null;
  return m ? `${m[3]} · ${m[2]} · ${m[1]}` : null;
}

export function MuestraDelAlbum({
  pareja,
  fecha,
  isEnglish,
}: {
  /** El nombre de la boda. Sin él, una pareja de ejemplo. */
  pareja: string | null;
  fecha: string | null;
  isEnglish: boolean;
}) {
  const nombre = pareja?.trim() || (isEnglish ? "Sofía & Diego" : "Sofía y Diego");
  const fechaTexto = fechaDePortada(fecha);

  return (
    <figure className="panel-card overflow-hidden">
      <div aria-hidden="true" className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* La portada, en papel azul: lo dibujado va sobre papel. */}
        <div className="relative flex items-center justify-center border-b border-linea bg-papel px-6 py-10 md:border-b-0 md:border-r sm:px-10">
          <Watercolor tone="linea" opacity={0.45} seed={11} className="absolute inset-4 h-[calc(100%-2rem)] w-[calc(100%-2rem)]" />
          <div className="relative flex aspect-[4/5] w-full max-w-[16rem] flex-col items-center justify-center rounded-2xl border border-linea bg-niebla px-6 py-8 text-center shadow-[0_1px_2px_rgb(46_58_85/0.05),0_16px_36px_-18px_rgb(46_58_85/0.3)]">
            <Sparkle className="absolute left-4 top-4 h-5 w-5 text-tinta" />
            <Heart className="absolute bottom-4 right-4 h-5 w-5 text-tinta" />
            {/* Nota a mano junto a la portada: la frase sólo adorna, el
                nombre y la fecha se leen solos. */}
            <p className="frase text-[28px] leading-none text-tinta">
              {isEnglish ? "our wedding" : "nuestra boda"}
            </p>
            <p className="titular mt-3 max-w-full break-words text-[1.625rem] leading-[1.05] text-balance">
              {nombre}
            </p>
            {fechaTexto ? (
              <p className="mt-4 text-xs tracking-[0.18em] text-tinta tabular-nums">{fechaTexto}</p>
            ) : null}
          </div>
        </div>

        {/* Las páginas: fotos y el QR. */}
        <div className="p-6 sm:p-8">
          <p className="rotulo">{isEnglish ? "Inside" : "Por dentro"}</p>
          <ul className="mt-4 grid grid-cols-3 gap-3">
            {DIBUJOS.map(({ clave, Dibujo }) => (
              <li
                key={clave}
                className="flex aspect-square items-center justify-center rounded-xl border border-linea bg-papel p-3"
              >
                <Dibujo className="h-full w-full text-tinta" />
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center gap-4 rounded-xl border border-linea bg-papel p-4">
            <QrDeMuestra className="h-20 w-20 shrink-0 rounded-md text-noche" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-noche">
                {isEnglish ? "The QR for your guests" : "El QR para sus invitados"}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-tinta">
                {isEnglish
                  ? "They scan it at the party and upload their photos from their phones."
                  : "Lo escanean en la fiesta y suben sus fotos desde su celular."}
              </p>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="sr-only">
        {isEnglish
          ? `An example of the album: a cover with ${nombre}, pages of photos and the QR guests scan to upload theirs.`
          : `Un ejemplo del álbum: una portada con ${nombre}, páginas de fotos y el QR que escanean los invitados para subir las suyas.`}
      </figcaption>
    </figure>
  );
}
