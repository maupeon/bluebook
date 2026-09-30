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
  porPedir?: number;
  yaPedidas?: number;
  sinInvitacion?: number;
  contestaron?: number;
}

interface Lote {
  enviadas: number;
  fallidas: number;
  restantes: number;
  errores: Array<{ nombre: string; error: string }>;
  fallaron: string[];
}

const botonPrincipal =
  "inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-full bg-noche px-5 py-2 text-sm font-medium text-niebla transition-[background-color,scale] duration-150 hover:bg-noche-suave active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 disabled:opacity-50 disabled:hover:bg-noche disabled:active:scale-100";
const botonSecundario =
  "inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-full border border-linea-control/60 bg-niebla px-5 py-2 text-sm font-medium text-noche transition-[background-color,border-color,scale] duration-150 hover:border-linea-control hover:bg-papel-medio active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 disabled:opacity-50 disabled:active:scale-100";
const claseEnlace =
  "text-noche underline decoration-linea-control underline-offset-4 transition-[text-decoration-color] duration-150 hover:decoration-noche";

/**
 * Pedirles la confirmación a los invitados, por WhatsApp.
 *
 * Hermano de EnvioDeInvitaciones: todo pasa por /api/panel/confirmacion, que
 * llama al admin. A quién se le puede preguntar (ya recibió la invitación, no
 * ha contestado y nadie le ha preguntado) lo decide el admin; aquí sólo se
 * enseña lo que conteste. Va por lotes de 40; los que fallan en un lote se le
 * mandan de vuelta al siguiente para que no los repita.
 *
 * En la prueba no se envía: va el mismo aviso tranquilo que en la invitación.
 */
export function EnvioDeConfirmaciones({
  puedeEnviar,
  fecha,
  lugar,
}: {
  puedeEnviar: boolean;
  fecha: string | null;
  lugar: string | null;
}) {
  const { isEnglish } = useLanguage();
  if (!puedeEnviar) {
    return (
      <div className="rounded-xl bg-papel px-5 py-4">
        <p className="text-sm leading-relaxed text-noche">
          {isEnglish ? MENSAJE_ENVIO_EN_PRUEBA.en : MENSAJE_ENVIO_EN_PRUEBA.es}
        </p>
        <Link href="/panel/plan" className={`mt-1 inline-flex min-h-[2.75rem] items-center text-sm font-medium ${claseEnlace}`}>
          {isEnglish ? "See the plans" : "Ver los planes"}
        </Link>
      </div>
    );
  }
  return <Activo fecha={fecha} lugar={lugar} />;
}

function Activo({ fecha, lugar }: { fecha: string | null; lugar: string | null }) {
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
    const res = await fetch("/api/panel/confirmacion", {
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

  // Otra vez al poner fecha y lugar aquí mismo: esa regla la decide el servidor.
  useEffect(() => {
    void revisar();
  }, [revisar, fecha, lugar]);

  async function enviar(total: number) {
    setConfirmando(false);
    setEnviando(true);
    setError(null);
    setErrores([]);
    let enviadas = 0;
    let fallidas = 0;
    const saltar: string[] = [];
    setProgreso({ enviadas, fallidas, total });
    try {
      for (;;) {
        const res = await fetch("/api/panel/confirmacion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accion: "enviar", saltar }),
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
        saltar.push(...data.fallaron);
        setProgreso({ enviadas, fallidas, total });
        if (data.errores.length) setErrores((prev) => [...prev, ...data.errores]);
        // Termina cuando no queda nadie, o cuando un lote no mandó ni falló
        // ninguna (otra pestaña se los llevó): nunca se queda dando vueltas.
        if (data.restantes === 0 || data.enviadas + data.fallidas === 0) break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : null);
    } finally {
      // Primero las cifras nuevas y luego el botón: si no, por un instante se
      // vería otra vez «Preguntarle a N» con los de antes.
      await revisar();
      setEnviando(false);
      refrescar();
    }
  }

  if (!revision) {
    return <p className="text-sm text-tinta">{error ?? (isEnglish ? "Checking your guests…" : "Revisando a sus invitados…")}</p>;
  }

  const porPedir = revision.porPedir ?? 0;
  const yaPedidas = revision.yaPedidas ?? 0;
  const contestaron = revision.contestaron ?? 0;
  const sinInvitacion = revision.sinInvitacion ?? 0;

  return (
    <div className="space-y-4">
      {revision.rechazo ? (
        <div className="rounded-xl border border-linea bg-papel px-4 py-3 text-sm text-noche">
          <p>{revision.rechazo.mensaje}</p>
          {revision.rechazo.motivo === "faltan_datos" ? <DatosDeLaBoda weddingDate={fecha} venue={lugar} /> : null}
        </div>
      ) : (
        <ul className="grid gap-2 text-sm text-noche sm:grid-cols-3">
          <li className="rounded-xl bg-papel px-4 py-3">
            <span className="block text-2xl font-light tabular-nums">{porPedir}</span>
            {isEnglish ? "haven't been asked" : "sin preguntarles"}
          </li>
          <li className="rounded-xl bg-papel px-4 py-3">
            <span className="block text-2xl font-light tabular-nums">{yaPedidas}</span>
            {isEnglish ? "asked, no reply yet" : "ya se les preguntó y falta su respuesta"}
          </li>
          <li className="rounded-xl bg-papel px-4 py-3">
            <span className="block text-2xl font-light tabular-nums">{contestaron}</span>
            {isEnglish ? "already replied" : "ya contestaron"}
          </li>
        </ul>
      )}

      {!revision.rechazo && sinInvitacion > 0 ? (
        <p className="text-xs leading-relaxed text-tinta">
          {isEnglish
            ? `${sinInvitacion} ${sinInvitacion === 1 ? "hasn't" : "haven't"} received the invitation yet, so ${sinInvitacion === 1 ? "isn't" : "aren't"} asked.`
            : sinInvitacion === 1
              ? "A 1 todavía no le llega la invitación, así que no se le pregunta."
              : `A ${sinInvitacion} todavía no les llega la invitación, así que no se les pregunta.`}
        </p>
      ) : null}

      {progreso ? (
        <p role="status" className="text-sm text-noche tabular-nums">
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
        <ul className="space-y-1 text-xs text-error">
          {errores.slice(0, 10).map((e, i) => (
            <li key={`${e.nombre}-${i}`}>
              {e.nombre}: {e.error}
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}

      {revision.puede && !enviando ? (
        confirmando ? (
          <div className="rounded-xl border border-noche bg-niebla p-4">
            <p className="text-sm text-noche">
              {isEnglish
                ? `The question goes out on WhatsApp to ${porPedir} ${porPedir === 1 ? "guest" : "guests"} right now. It can't be undone.`
                : `La pregunta sale por WhatsApp a ${porPedir} ${porPedir === 1 ? "invitado" : "invitados"} en este momento. No se puede deshacer.`}
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button type="button" onClick={() => void enviar(porPedir)} className={botonPrincipal}>
                <Send className="h-4 w-4" strokeWidth={1.6} />
                {isEnglish ? "Yes, ask them" : "Sí, preguntarles"}
              </button>
              <button type="button" onClick={() => setConfirmando(false)} className={botonSecundario}>
                {isEnglish ? "Cancel" : "Cancelar"}
              </button>
            </div>
          </div>
        ) : porPedir > 0 ? (
          <button type="button" onClick={() => setConfirmando(true)} className={botonPrincipal}>
            <Send className="h-4 w-4" strokeWidth={1.6} />
            {isEnglish ? `Ask ${porPedir} ${porPedir === 1 ? "guest" : "guests"}` : `Preguntarle a ${porPedir} ${porPedir === 1 ? "invitado" : "invitados"}`}
          </button>
        ) : (
          <p className="max-w-[60ch] text-sm leading-relaxed text-tinta">
            {isEnglish
              ? "There's no one to ask right now. We ask those who already received the invitation and haven't replied."
              : "Por ahora no hay a quién preguntarle. Se les pregunta a quienes ya recibieron la invitación y no han contestado."}
          </p>
        )
      ) : null}
    </div>
  );
}
