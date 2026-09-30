"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { parseJsonSafe } from "@/lib/http";
import { llenarMensaje, mensajeDeInvitacion, valoresDeEjemplo } from "@/lib/invitacionTexto";
import type { MensajesDeUnMomento, Momento } from "@/lib/mensajesDeLaPareja";

/**
 * El mensaje de WhatsApp de un momento (la invitación, pedir la confirmación):
 * cómo le llega a un invitado y, si hay más de una redacción aprobada, cuál
 * quieren usar (0049).
 *
 * La pareja no escribe el texto: Meta sólo deja mandar plantillas que ya
 * aprobó. Escoge, se guarda al momento, y se manda cuando quieran. El texto
 * viene de Meta a través del admin (/api/panel/mensajes), así que lo que se ve
 * aquí es lo que sale.
 *
 * Si el catálogo no contesta, la invitación enseña el texto de siempre
 * (invitacionTexto.ts) y no se puede escoger: nunca se queda sin vista previa.
 */

// Una sola petición para toda la pantalla: la invitación y la confirmación
// piden el mismo catálogo al montarse.
let pendiente: Promise<MensajesDeUnMomento[]> | null = null;
function pedirCatalogo(): Promise<MensajesDeUnMomento[]> {
  if (!pendiente) {
    pendiente = fetch("/api/panel/mensajes", { cache: "no-store" })
      .then((res) => parseJsonSafe<{ mensajes?: MensajesDeUnMomento[] }>(res))
      .then(({ data }) => data?.mensajes ?? [])
      .catch(() => []);
    // El catálogo cambia cuando Meta aprueba una redacción: no se guarda entre visitas.
    void pendiente.finally(() => setTimeout(() => (pendiente = null), 5000));
  }
  return pendiente;
}

export function MensajeDeLaPareja({
  momento,
  pareja,
  fecha,
  lugar,
  soloLectura,
}: {
  momento: Momento;
  pareja: string;
  fecha: string | null;
  lugar: string | null;
  soloLectura: boolean;
}) {
  const { isEnglish } = useLanguage();
  const [mensajes, setMensajes] = useState<MensajesDeUnMomento | null>(null);
  const [cargado, setCargado] = useState(false);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    void pedirCatalogo().then((todos) => {
      if (!vivo) return;
      setMensajes(todos.find((m) => m.momento === momento) ?? null);
      setCargado(true);
    });
    return () => {
      vivo = false;
    };
  }, [momento]);

  async function elegir(plantilla: string) {
    if (!mensajes || plantilla === mensajes.elegida || guardando) return;
    const antes = mensajes;
    setError(null);
    setGuardando(plantilla);
    setMensajes({ ...mensajes, elegida: plantilla });
    try {
      const res = await fetch("/api/panel/mensajes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ momento, plantilla }),
      });
      const { data } = await parseJsonSafe<{ mensajes?: MensajesDeUnMomento[]; error?: string }>(res);
      if (!res.ok || !data?.mensajes) {
        throw new Error(data?.error || (isEnglish ? "We couldn't save your choice." : "No pudimos guardar su elección."));
      }
      setMensajes(data.mensajes.find((m) => m.momento === momento) ?? antes);
      // Lo que quedó guardado ya no es lo que trae el catálogo en memoria.
      pendiente = null;
    } catch (err) {
      setMensajes(antes);
      setError(err instanceof Error ? err.message : null);
    } finally {
      setGuardando(null);
    }
  }

  const valores = valoresDeEjemplo({ invitado: "María", pareja, fecha, lugar, pases: 2 });
  const elegida = mensajes?.opciones.find((o) => o.plantilla === mensajes.elegida) ?? null;
  // Sin catálogo: la invitación cae al texto de siempre; la confirmación no
  // tiene copia local y no enseña nada.
  const texto = elegida
    ? llenarMensaje(elegida.cuerpo, valores)
    : momento === "invitacion"
      ? mensajeDeInvitacion({ invitado: "María", pareja, fecha, lugar, pases: 2 })
      : null;

  if (!texto) {
    return cargado ? null : <div className="h-40 max-w-md rounded-2xl bg-papel motion-safe:animate-pulse" aria-hidden />;
  }

  const opciones = mensajes?.opciones ?? [];

  return (
    <div>
      {opciones.length > 1 ? (
        <fieldset className="mb-4" disabled={soloLectura}>
          <legend className="text-sm text-tinta">
            {isEnglish ? "Choose how it's worded" : "Escojan cómo lo dice"}
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {opciones.map((o) => {
              const activa = o.plantilla === mensajes?.elegida;
              return (
                <button
                  key={o.plantilla}
                  type="button"
                  aria-pressed={activa}
                  onClick={() => void elegir(o.plantilla)}
                  className={`inline-flex min-h-[2.75rem] items-center rounded-full border px-4 py-2 text-sm transition-[background-color,border-color,color,scale] duration-150 active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 disabled:opacity-50 disabled:active:scale-100 ${
                    activa
                      ? "border-noche bg-noche font-medium text-niebla"
                      : "border-linea-control/60 bg-niebla text-noche hover:border-linea-control hover:bg-papel-medio"
                  }`}
                >
                  {isEnglish ? o.nombreEn : o.nombre}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <div className="max-w-md rounded-2xl rounded-tl-sm bg-papel px-4 py-3 text-sm leading-relaxed text-noche">
        <p className="whitespace-pre-line">{texto}</p>
        {elegida && elegida.botones.length > 0 ? (
          <div className="mt-3 grid gap-1.5">
            {elegida.botones.map((b) => (
              <span key={b} className="rounded-xl border border-linea bg-niebla px-3 py-2 text-center text-sm text-noche">
                {b}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
