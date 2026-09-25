"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { DatosDeLaBoda } from "@/components/panel/DatosDeLaBoda";
import { useRefrescoDelPanel } from "@/components/panel/useRefrescoDelPanel";
import { parseJsonSafe } from "@/lib/http";
import { MENSAJE_ENVIO_EN_PRUEBA } from "@/lib/accesoDeLaBoda";

interface Revision {
  puede: boolean;
  rechazo?: { motivo: string; mensaje: string };
  porEnviar?: number;
  fallidas?: number;
  sinTelefono?: number;
  yaEnviadas?: number;
  sinTelefonoNombres?: string[];
}

interface Lote {
  enviadas: number;
  fallidas: number;
  restantes: number;
  errores: Array<{ nombre: string; error: string }>;
}

const botonPrincipal =
  "inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-full border border-ink bg-ink px-5 py-2 font-body text-sm text-white transition-[background-color,scale] duration-150 hover:bg-ink-soft active:scale-[0.98] disabled:opacity-50";
const botonSecundario =
  "inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-full border border-sand bg-white px-5 py-2 font-body text-sm text-ink transition-colors hover:bg-bone disabled:opacity-50";

/**
 * Mandar la invitación elegida a los invitados, por WhatsApp.
 *
 * Todo pasa por /api/panel/invitacion/enviar, que llama al admin. Las reglas
 * (si la planner ya lleva el envío, si la boda pasó, si Meta aprobó la
 * plantilla) las decide el admin; aquí solo se enseña lo que conteste.
 *
 * Se envía por lotes (40 por petición): la pantalla vuelve a pedir hasta que
 * no quede nadie, y así puede enseñar el avance. Se detiene si un lote no
 * avanza, para no quedarse dando vueltas con números que siempre fallan.
 *
 * En la prueba no se envía (cada mensaje cuesta en Meta): en vez de la
 * interfaz de envío va un aviso tranquilo. La ruta igual lo rechaza con 402.
 */
export function EnvioDeInvitaciones({
  elegidaId,
  puedeEnviar,
  fecha,
  lugar,
}: {
  elegidaId: string;
  puedeEnviar: boolean;
  fecha: string | null;
  lugar: string | null;
}) {
  if (!puedeEnviar) return <EnvioEnPrueba />;
  return <EnvioActivo elegidaId={elegidaId} fecha={fecha} lugar={lugar} />;
}

/**
 * Lo que ven en la prueba. Informa y señala el camino, sin candado ni culpa:
 * la invitación ya está hecha y el trabajo que sí pueden adelantar es tener a
 * cada invitado con su WhatsApp, para que el día que la manden salga a todos.
 */
function EnvioEnPrueba() {
  const { isEnglish } = useLanguage();
  return (
    <div className="rounded-xl bg-wash-soft px-5 py-4">
      <p className="font-body text-sm leading-relaxed text-ink">
        {isEnglish ? MENSAJE_ENVIO_EN_PRUEBA.en : MENSAJE_ENVIO_EN_PRUEBA.es}
      </p>
      <p className="mt-1 max-w-[60ch] font-body text-sm leading-relaxed text-ink-muted">
        {isEnglish
          ? "Meanwhile, make sure each guest has their WhatsApp in Guests: when you send it, it reaches everyone at once."
          : "Mientras, dejen a cada invitado con su WhatsApp en Invitados: el día que la manden, les llega a todos de una vez."}
      </p>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
        <Link
          href="/panel/plan"
          className="inline-flex min-h-[2.75rem] items-center font-body text-sm font-medium text-azul-deep underline underline-offset-4 transition-colors hover:text-ink"
        >
          {isEnglish ? "See the plans" : "Ver los planes"}
        </Link>
        <Link
          href="/panel/invitados"
          className="inline-flex min-h-[2.75rem] items-center font-body text-sm text-azul-deep underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          {isEnglish ? "Go to Guests" : "Ir a Invitados"}
        </Link>
      </div>
    </div>
  );
}

function EnvioActivo({
  elegidaId,
  fecha,
  lugar,
}: {
  elegidaId: string;
  fecha: string | null;
  lugar: string | null;
}) {
  const { isEnglish } = useLanguage();
  const refrescar = useRefrescoDelPanel();
  const [revision, setRevision] = useState<Revision | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [progreso, setProgreso] = useState<{ enviadas: number; fallidas: number; total: number } | null>(null);
  const [errores, setErrores] = useState<Lote["errores"]>([]);
  const [error, setError] = useState<string | null>(null);

  const revisar = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/panel/invitacion/enviar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "revisar" }),
    });
    const { data } = await parseJsonSafe<Revision & { error?: string }>(res);
    if (!res.ok || !data) {
      setError(data?.error || (isEnglish ? "Couldn't check your guests." : "No pudimos revisar sus invitados."));
      return;
    }
    setRevision(data);
  }, [isEnglish]);

  // Se revisa otra vez al cambiar de invitación ("hay invitación") o al poner
  // fecha y lugar aquí mismo ("faltan datos"): las dos reglas las decide el servidor.
  useEffect(() => {
    void revisar();
  }, [revisar, elegidaId, fecha, lugar]);

  async function enviar(accion: "enviar" | "reintentar", total: number) {
    setConfirmando(false);
    setEnviando(true);
    setError(null);
    setErrores([]);
    let enviadas = 0;
    let fallidas = 0;
    setProgreso({ enviadas, fallidas, total });
    try {
      for (;;) {
        const res = await fetch("/api/panel/invitacion/enviar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accion }),
        });
        const { data } = await parseJsonSafe<Lote & { error?: string; rechazo?: { mensaje: string } }>(res);
        if (!res.ok || !data) {
          throw new Error(
            data?.rechazo?.mensaje ||
              data?.error ||
              (isEnglish ? "Sending stopped. Try again." : "El envío se detuvo. Inténtenlo otra vez.")
          );
        }
        enviadas += data.enviadas;
        fallidas += data.fallidas;
        setProgreso({ enviadas, fallidas, total });
        if (data.errores.length) setErrores((prev) => [...prev, ...data.errores]);
        // Termina cuando no queda nadie, o cuando un lote no mandó ninguna:
        // reintentar números que siempre fallan sería no terminar nunca.
        if (data.restantes === 0 || data.enviadas === 0) break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : null);
    } finally {
      setEnviando(false);
      await revisar();
      refrescar();
    }
  }

  if (!revision) {
    return (
      <p className="font-body text-sm text-ink-muted">
        {error ?? (isEnglish ? "Checking your guests…" : "Revisando a sus invitados…")}
      </p>
    );
  }

  const porEnviar = revision.porEnviar ?? 0;
  const fallidas = revision.fallidas ?? 0;
  const sinTelefono = revision.sinTelefono ?? 0;
  const yaEnviadas = revision.yaEnviadas ?? 0;

  return (
    <div className="space-y-4">
      {revision.rechazo ? (
        <div className="rounded-xl border border-sand bg-bone px-4 py-3 font-body text-sm text-ink">
          <p>{revision.rechazo.mensaje}</p>
          {/* Aquí mismo, no en Hoy: mandarlas a otra pantalla cortaba el envío
              justo cuando ya tenían la invitación elegida. */}
          {revision.rechazo.motivo === "faltan_datos" ? (
            <DatosDeLaBoda weddingDate={fecha} venue={lugar} />
          ) : null}
        </div>
      ) : null}

      <ul className="grid gap-2 font-body text-sm text-ink sm:grid-cols-3">
        <li className="rounded-xl border border-sand bg-white px-4 py-3">
          <span className="block font-heading text-2xl">{porEnviar}</span>
          {isEnglish ? "ready to receive it" : "listos para recibirla"}
        </li>
        <li className="rounded-xl border border-sand bg-white px-4 py-3">
          <span className="block font-heading text-2xl">{yaEnviadas}</span>
          {isEnglish ? "already received it" : "ya la recibieron"}
        </li>
        <li className="rounded-xl border border-sand bg-white px-4 py-3">
          <span className="block font-heading text-2xl">{sinTelefono}</span>
          {isEnglish ? "without WhatsApp" : "sin WhatsApp"}
        </li>
      </ul>

      {sinTelefono > 0 ? (
        <p className="font-body text-xs leading-relaxed text-ink-muted">
          {isEnglish ? "Missing WhatsApp: " : "Les falta el WhatsApp: "}
          {(revision.sinTelefonoNombres ?? []).join(", ")}
          {sinTelefono > (revision.sinTelefonoNombres?.length ?? 0) ? "…" : ""}{" "}
          <Link href="/panel/invitados" className="text-azul-deep underline underline-offset-4 hover:text-ink">
            {isEnglish ? "Add it in Guests" : "Agréguenlo en Invitados"}
          </Link>
        </p>
      ) : null}

      {progreso ? (
        <p role="status" className="font-body text-sm text-ink">
          {enviando
            ? isEnglish
              ? `Sending… ${progreso.enviadas} of ${progreso.total} sent`
              : `Enviando… ${progreso.enviadas} de ${progreso.total} enviadas`
            : isEnglish
              ? `Done: ${progreso.enviadas} sent${progreso.fallidas ? `, ${progreso.fallidas} failed` : ""}.`
              : `Listo: ${progreso.enviadas} enviadas${progreso.fallidas ? `, ${progreso.fallidas} fallaron` : ""}.`}
        </p>
      ) : null}

      {errores.length > 0 ? (
        <ul className="space-y-1 font-body text-xs text-terra-deep">
          {errores.slice(0, 10).map((e, i) => (
            <li key={`${e.nombre}-${i}`}>
              {e.nombre}: {e.error}
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p role="alert" className="font-body text-sm text-terra-deep">
          {error}
        </p>
      ) : null}

      {revision.puede && !enviando ? (
        confirmando ? (
          <div className="rounded-xl border border-ink bg-white p-4">
            <p className="font-body text-sm text-ink">
              {isEnglish
                ? `The invitation goes out on WhatsApp to ${porEnviar} guests right now. It can't be undone.`
                : `La invitación sale por WhatsApp a ${porEnviar} invitados en este momento. No se puede deshacer.`}
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button type="button" onClick={() => enviar("enviar", porEnviar)} className={botonPrincipal}>
                <Send className="h-4 w-4" strokeWidth={1.6} />
                {isEnglish ? "Yes, send it" : "Sí, enviarla"}
              </button>
              <button type="button" onClick={() => setConfirmando(false)} className={botonSecundario}>
                {isEnglish ? "Cancel" : "Cancelar"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {porEnviar > 0 ? (
              <button type="button" onClick={() => setConfirmando(true)} className={botonPrincipal}>
                <Send className="h-4 w-4" strokeWidth={1.6} />
                {isEnglish ? `Send to ${porEnviar} guests` : `Enviar a ${porEnviar} invitados`}
              </button>
            ) : (
              <p className="font-body text-sm text-ink-muted">
                {isEnglish
                  ? "Everyone with WhatsApp already has it."
                  : "Todos los que tienen WhatsApp ya la recibieron."}
              </p>
            )}
            {fallidas > 0 ? (
              <button type="button" onClick={() => enviar("reintentar", fallidas)} className={botonSecundario}>
                {isEnglish ? `Retry the ${fallidas} that failed` : `Reintentar las ${fallidas} que fallaron`}
              </button>
            ) : null}
          </div>
        )
      ) : null}
    </div>
  );
}
