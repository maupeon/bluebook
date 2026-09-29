import Link from "next/link";
import type { ReactNode } from "react";
import { Titular } from "@/components/marca/Titular";
import { RESPONSABLE } from "@/lib/legal";

/**
 * El marco de los textos legales (Términos y Aviso de privacidad). Una sola
 * forma para los dos: índice con anclas, secciones con título, y una medida de
 * lectura cómoda. Letra del mismo tamaño que el resto del sitio: la LFPC (art.
 * 85) no deja esconder condiciones en letra pequeña.
 *
 * La portada lleva el titular de la marca, centrado. El texto largo va en
 * Work Sans Light a 17px, con interlineado de 1.7 y una medida de ~65
 * caracteres: es lo que se lee sin cansarse. Los títulos de cada sección van
 * en Work Sans Medium, no en marcador: son muchos y llevan número.
 */
export interface SeccionLegal {
  id: string;
  titulo: string;
  cuerpo: ReactNode;
}

export function DocumentoLegal({
  eyebrow,
  titulo,
  actualizado,
  vigente,
  anuncio,
  intro,
  secciones,
  isEnglish,
}: {
  eyebrow: string;
  titulo: string;
  /** Fecha legible de la última actualización. */
  actualizado: string;
  /** Si el texto rige desde otro día que el de su publicación. */
  vigente?: string;
  /** Un cambio que viene: se enseña arriba, antes de la introducción. */
  anuncio?: ReactNode;
  intro: ReactNode;
  secciones: SeccionLegal[];
  isEnglish: boolean;
}) {
  // Lo que falta capturar en lib/legal.ts. Solo se avisa en desarrollo: en
  // producción la frase que lo lleva simplemente se omite.
  const faltan = [
    RESPONSABLE.nombre == null && (isEnglish ? "name" : "nombre"),
    RESPONSABLE.rfc == null && "RFC",
    RESPONSABLE.domicilio == null && (isEnglish ? "address" : "domicilio"),
  ].filter(Boolean);
  const recordatorio = process.env.NODE_ENV !== "production" && faltan.length > 0;

  return (
    <div className="bg-papel pt-16">
      <header className="mx-auto w-full max-w-4xl px-4 pb-12 pt-14 text-center sm:px-6 sm:pt-20 lg:px-8">
        <p className="rotulo">{eyebrow}</p>
        <Titular as="h1" tamano="portada" className="mt-4">
          {titulo}
        </Titular>
        <p className="mt-5 text-sm text-tinta">
          {isEnglish ? "Last updated: " : "Última actualización: "}
          {actualizado}
          {vigente ? (
            <>
              <br />
              {isEnglish ? "In effect from: " : "Vigente desde: "}
              {vigente}
            </>
          ) : null}
        </p>
        {anuncio ? (
          <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-linea bg-niebla px-5 py-4 text-left text-sm leading-relaxed text-noche text-pretty">
            {anuncio}
          </div>
        ) : null}
        {recordatorio ? (
          <p className="mx-auto mt-6 max-w-2xl rounded-xl bg-aviso-fondo px-4 py-3 text-sm text-aviso">
            {isEnglish ? "Development only — missing in lib/legal.ts: " : "Solo en desarrollo — falta en lib/legal.ts: "}
            {faltan.join(", ")}.
          </p>
        ) : null}
        <div className="mx-auto mt-6 max-w-[60ch] text-base leading-relaxed text-tinta text-pretty sm:text-lg">
          {intro}
        </div>
        {/* Sin cursiva: Work Sans se cargó sin ella y el navegador la falsea. */}
        {isEnglish ? (
          <p className="mx-auto mt-4 max-w-[60ch] text-sm text-tinta">
            This is a courtesy translation. If the English and Spanish versions differ, the Spanish version prevails.
          </p>
        ) : null}
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16 lg:px-8">
        <nav aria-label={isEnglish ? "Contents" : "Contenido"} className="mb-10 lg:mb-0">
          <div className="lg:sticky lg:top-24">
            <p className="rotulo">
              {isEnglish ? "Contents" : "Contenido"}
            </p>
            <ol className="mt-4 space-y-1.5 border-l border-linea pl-4">
              {secciones.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="text-sm leading-snug text-tinta transition-colors hover:text-noche"
                  >
                    {i + 1}. {s.titulo}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <article className="max-w-[65ch]">
          {secciones.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24 border-t border-linea pt-10 first:border-t-0 first:pt-0 [&+section]:mt-10">
              <h2 className="text-xl font-medium leading-snug text-noche sm:text-2xl">
                {i + 1}. {s.titulo}
              </h2>
              {/* Lo que pesa dentro del texto (<strong>) va en Medium y en
                  noche: el énfasis es peso y color, nunca bold. */}
              <div className="mt-4 space-y-4 text-base font-light leading-[1.7] text-tinta sm:text-[17px] [&_strong]:font-medium [&_strong]:text-noche">
                {s.cuerpo}
              </div>
            </section>
          ))}

          <div className="mt-16 border-t border-linea pt-8">
            <Link
              href="/"
              className="text-sm font-medium text-noche underline decoration-linea-control underline-offset-4 transition-colors hover:decoration-noche"
            >
              {isEnglish ? "← Back to home" : "← Volver al inicio"}
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}

/** Lista con viñeta discreta, para enumeraciones dentro de una sección. */
export function Lista({ children }: { children: ReactNode }) {
  // Viñeta en el azul de las líneas, en su versión de 3:1 para que se vea
  // sobre el papel azul (la de las reglas, a 1.3:1, se perdía).
  return <ul className="list-disc space-y-2 pl-5 marker:text-linea-control">{children}</ul>;
}

/** Un enlace dentro del texto legal: noche y subrayado, que es lo que lo
 *  distingue de la tinta del cuerpo. */
const ENLACE =
  "font-normal text-noche underline decoration-linea-control underline-offset-4 transition-colors hover:decoration-noche";

export function Enlace({ href, children }: { href: string; children: ReactNode }) {
  const externo = /^(https?:|mailto:|tel:)/.test(href);
  return externo ? (
    <a href={href} className={ENLACE}>
      {children}
    </a>
  ) : (
    <Link href={href} className={ENLACE}>
      {children}
    </Link>
  );
}

/** Una tabla de dos o más columnas (precios, proveedores). Se desplaza sola en teléfono. */
export function Tabla({ encabezados, filas }: { encabezados: string[]; filas: ReactNode[][] }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-linea-control">
            {encabezados.map((h) => (
              <th key={h} scope="col" className="py-2 pr-4 font-medium text-noche">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, i) => (
            <tr key={i} className="border-b border-linea align-top">
              {fila.map((celda, j) => (
                <td key={j} className="py-2.5 pr-4">
                  {celda}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
