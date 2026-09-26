import Link from "next/link";
import type { ReactNode } from "react";
import { RESPONSABLE } from "@/lib/legal";

/**
 * El marco de los textos legales (Términos y Aviso de privacidad). Una sola
 * forma para los dos: índice con anclas, secciones con título, y una medida de
 * lectura cómoda. Letra del mismo tamaño que el resto del sitio: la LFPC (art.
 * 85) no deja esconder condiciones en letra pequeña.
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
  intro,
  secciones,
  isEnglish,
}: {
  eyebrow: string;
  titulo: string;
  /** Fecha legible de la última actualización. */
  actualizado: string;
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
    <div className="sb bg-paper pt-16">
      <header className="mx-auto w-full max-w-6xl px-4 pb-10 pt-14 sm:px-6 sm:pt-20 lg:px-8">
        <p className="font-body text-xs font-semibold uppercase tracking-[0.18em] text-azul-deep">{eyebrow}</p>
        <h1 className="mt-4 max-w-3xl font-heading text-[2.6rem] font-medium leading-[1.04] tracking-[-0.02em] text-navy text-balance sm:text-6xl">
          {titulo}
        </h1>
        <p className="mt-4 font-body text-sm text-navy-muted">
          {isEnglish ? "Last updated: " : "Última actualización: "}
          {actualizado}
        </p>
        {recordatorio ? (
          <p className="mt-6 max-w-3xl rounded-xl bg-pale-yellow px-4 py-3 font-body text-sm text-pale-yellow-ink">
            {isEnglish ? "Development only — missing in lib/legal.ts: " : "Solo en desarrollo — falta en lib/legal.ts: "}
            {faltan.join(", ")}.
          </p>
        ) : null}
        <div className="mt-6 max-w-[68ch] font-body text-base leading-relaxed text-navy-muted text-pretty sm:text-lg">
          {intro}
        </div>
        {isEnglish ? (
          <p className="mt-4 max-w-[68ch] font-body text-sm italic text-navy-muted">
            This is a courtesy translation. If the English and Spanish versions differ, the Spanish version prevails.
          </p>
        ) : null}
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16 lg:px-8">
        <nav aria-label={isEnglish ? "Contents" : "Contenido"} className="mb-10 lg:mb-0">
          <div className="lg:sticky lg:top-24">
            <p className="font-body text-xs font-semibold uppercase tracking-[0.18em] text-navy-muted">
              {isEnglish ? "Contents" : "Contenido"}
            </p>
            <ol className="mt-4 space-y-1.5 border-l border-line/25 pl-4">
              {secciones.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="font-body text-sm leading-snug text-navy-muted transition-colors hover:text-navy"
                  >
                    {i + 1}. {s.titulo}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <article className="max-w-[68ch]">
          {secciones.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24 border-t border-line/15 pt-10 first:border-t-0 first:pt-0 [&+section]:mt-10">
              <h2 className="font-heading text-2xl font-medium leading-tight tracking-[-0.01em] text-navy sm:text-3xl">
                {i + 1}. {s.titulo}
              </h2>
              <div className="mt-4 space-y-4 font-body text-[15px] leading-relaxed text-navy-soft">{s.cuerpo}</div>
            </section>
          ))}

          <div className="mt-16 border-t border-line/15 pt-8">
            <Link href="/" className="font-body text-sm text-azul-deep underline-offset-4 hover:text-navy hover:underline">
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
  return <ul className="list-disc space-y-2 pl-5 marker:text-azul/60">{children}</ul>;
}

/** Un enlace dentro del texto legal. */
export function Enlace({ href, children }: { href: string; children: ReactNode }) {
  const externo = /^(https?:|mailto:|tel:)/.test(href);
  return externo ? (
    <a href={href} className="text-azul-deep underline underline-offset-2 hover:text-navy">
      {children}
    </a>
  ) : (
    <Link href={href} className="text-azul-deep underline underline-offset-2 hover:text-navy">
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
          <tr className="border-b border-line/25">
            {encabezados.map((h) => (
              <th key={h} scope="col" className="py-2 pr-4 font-semibold text-navy">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, i) => (
            <tr key={i} className="border-b border-line/10 align-top">
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
