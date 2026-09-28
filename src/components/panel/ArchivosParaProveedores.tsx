"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, FileSpreadsheet } from "lucide-react";
import type { PanelBundle } from "@/lib/couplePanel";
import type { TipoDeArchivo } from "@/lib/archivosProveedores";
import { useLanguage } from "@/components/LanguageProvider";
import { Eyebrow, SectionTitle } from "@/components/panel/sections";
import { descargarArchivo } from "@/components/panel/descargarArchivo";

interface Archivo {
  tipo: TipoDeArchivo;
  titulo: string;
  para: string;
  /** null = se puede bajar. Si no, por qué todavía no. */
  falta: string | null;
  /**
   * Lo que la pareja puede hacer para destrabarlo, cuando está en su mano.
   * Un "aparece cuando agreguen invitados" sin camino era un callejón: la
   * pareja leía la condición y tenía que ir a buscar dónde cumplirla.
   */
  destrabar?: { href: string; texto: string };
}

/**
 * Los Excel que piden los proveedores, a un clic. Se arman en el momento con
 * lo que hay en el panel, así que nunca están viejos y no hay nada que
 * "sincronizar": la pareja edita en un solo lugar y cada proveedor recibe un
 * archivo con su forma.
 *
 * Un archivo que todavía no tiene de dónde salir (sin mesas, sin guion) se
 * enseña apagado y dice por qué, en vez de bajar un Excel vacío.
 */
export function ArchivosParaProveedores({ bundle }: { bundle: PanelBundle }) {
  const { isEnglish } = useLanguage();
  const [bajando, setBajando] = useState<TipoDeArchivo | null>(null);
  const [error, setError] = useState<{ tipo: TipoDeArchivo; mensaje: string } | null>(null);

  const hayInvitados = bundle.guests.total > 0;
  const hayMesas =
    !bundle.seating.unavailable &&
    (bundle.seating.tables.length > 0 || bundle.seating.unassigned.length > 0);
  const hayMinuta = !bundle.runOfShow.unavailable && bundle.runOfShow.blocks.length > 0;
  const sinInvitados = isEnglish ? "Shows up once you add guests." : "Aparece cuando agreguen invitados.";
  const agregarInvitados = hayInvitados
    ? undefined
    : {
        href: "/panel/invitados",
        texto: isEnglish ? "Add guests" : "Agregar invitados",
      };

  const archivos: Archivo[] = [
    {
      tipo: "banquete",
      titulo: isEnglish ? "Catering" : "Banquete",
      para: isEnglish
        ? "Headcount, tables and special meals. No phone numbers."
        : "El número de personas, las mesas y los menús especiales. Sin teléfonos.",
      falta: hayInvitados ? null : sinInvitados,
      destrabar: agregarInvitados,
    },
    {
      tipo: "mesas",
      titulo: isEnglish ? "Tables and door list" : "Mesas y lista de la puerta",
      para: isEnglish
        ? "Table by table for rentals, and A to Z for the hostess."
        : "Mesa por mesa para el mobiliario, y en orden alfabético para la hostess.",
      falta: hayMesas
        ? null
        : isEnglish
          ? "Shows up once the tables are set."
          : "Aparece cuando haya mesas acomodadas.",
    },
    {
      tipo: "minuta",
      titulo: isEnglish ? "Run of show" : "Minuta del día",
      para: isEnglish
        ? "Hour by hour, with vendor and place. For the DJ, photo and catering."
        : "Hora por hora, con proveedor y lugar. Para el DJ, la foto y el banquete.",
      // Sin planner nadie tiene encargado el guion: se dice de dónde sale el
      // archivo, sin prometer quién lo va a armar.
      falta: hayMinuta
        ? null
        : bundle.wedding.tienePlanner
          ? isEnglish
            ? "Shows up once your planner builds the schedule."
            : "Aparece cuando su planner arme el guion."
          : isEnglish
            ? "It comes from the day's schedule, which doesn't exist yet."
            : "Sale del guion del día, que todavía no existe.",
    },
    {
      tipo: "invitados",
      titulo: isEnglish ? "Guest list" : "Lista de invitados",
      para: isEnglish
        ? "For your coordinator: replies, table, diet and WhatsApp."
        : "Para su coordinación: respuesta, mesa, dieta y WhatsApp.",
      falta: hayInvitados ? null : sinInvitados,
      destrabar: agregarInvitados,
    },
    {
      tipo: "barra",
      titulo: isEnglish ? "Bar shopping list" : "Lista de la barra",
      para: isEnglish
        ? "What to buy, with brands and prices."
        : "Lo que van a comprar, con marcas y precios.",
      falta: null,
    },
  ];

  async function bajar(tipo: TipoDeArchivo) {
    setBajando(tipo);
    setError(null);
    try {
      await descargarArchivo(tipo);
    } catch (err) {
      setError({ tipo, mensaje: err instanceof Error ? err.message : "" });
    } finally {
      setBajando(null);
    }
  }

  return (
    <div className="panel-card p-6 sm:p-8">
      <Eyebrow>{isEnglish ? "For your vendors" : "Para sus proveedores"}</Eyebrow>
      {/* Título de tarjeta, no titular: el mismo que las demás secciones de Hoy. */}
      <SectionTitle>{isEnglish ? "The spreadsheets they ask for" : "Los Excel que les piden"}</SectionTitle>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-tinta">
        {isEnglish
          ? "Built on the spot from what's in your panel, so they're never out of date. Open them, check them and send them."
          : "Se arman en el momento con lo que hay en su panel, así que nunca están viejos. Ábranlos, revísenlos y mándenlos."}
      </p>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {archivos.map((a) => {
          const apagado = a.falta != null;
          return (
            <li
              key={a.tipo}
              className={`flex flex-col rounded-xl border border-linea p-4 ${apagado ? "bg-papel" : "bg-niebla"}`}
            >
              <div className="flex items-start gap-3">
                <FileSpreadsheet
                  className={`mt-0.5 h-5 w-5 shrink-0 ${apagado ? "text-tinta/70" : "text-tinta"}`}
                  strokeWidth={1.5}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-noche">{a.titulo}</p>
                  <p className="mt-1 text-xs leading-relaxed text-tinta">{a.para}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-1 flex-wrap items-end gap-x-4 gap-y-2">
                {apagado ? (
                  <p className="text-xs text-tinta">
                    {a.falta}
                    {a.destrabar ? (
                      <>
                        {" "}
                        <Link
                          href={a.destrabar.href}
                          className="inline-block py-2 font-medium text-noche underline decoration-linea-control underline-offset-4 transition-[text-decoration-color] duration-150 hover:decoration-noche"
                        >
                          {a.destrabar.texto}
                        </Link>
                      </>
                    ) : null}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => bajar(a.tipo)}
                    disabled={bajando != null}
                    className="inline-flex min-h-[2.5rem] items-center gap-2 rounded-full border border-linea-control/60 bg-niebla px-4 py-2 text-sm font-medium text-noche transition-[background-color,border-color,scale] duration-150 hover:border-linea-control hover:bg-papel-medio active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 disabled:opacity-60 disabled:active:scale-100"
                  >
                    <Download className="h-4 w-4" strokeWidth={1.6} />
                    {bajando === a.tipo
                      ? isEnglish
                        ? "Preparing…"
                        : "Armándolo…"
                      : isEnglish
                        ? "Download Excel"
                        : "Descargar Excel"}
                  </button>
                )}
                {a.tipo === "barra" ? (
                  <Link
                    href="/panel/barra"
                    className="pb-2 text-sm text-noche underline decoration-linea-control underline-offset-4 transition-[text-decoration-color] duration-150 hover:decoration-noche"
                  >
                    {isEnglish ? "Build it" : "Armarla"}
                  </Link>
                ) : null}
              </div>
              {error?.tipo === a.tipo ? (
                <p role="alert" className="mt-2 text-xs text-error">
                  {error.mensaje}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
