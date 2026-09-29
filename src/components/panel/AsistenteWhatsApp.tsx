"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, MessageCircle } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { parseJsonSafe } from "@/lib/http";
import { ASISTENTE } from "@/lib/asistente";

// Fase 2 (0046): también hace los cambios que le piden, con su «sí».
const CAMBIA = ASISTENTE.activo && ASISTENTE.pareja && ASISTENTE.parejaCambia;

/**
 * «Su asistente por WhatsApp» (0044): la pareja liga su teléfono con un
 * código y le pregunta a su asistente lo de su boda. Cada quien liga el suyo
 * (hasta 4 por boda). Mientras el código está en pantalla, se revisa cada
 * pocos segundos si ya llegó, para decirles «listo» sin recargar.
 *
 * No se enseña en una boda «fuera del asistente» (0043).
 */

interface Numero {
  id: string;
  terminacion: string;
  ligadoEn: string;
}
interface Estado {
  fuera: boolean;
  disponible: boolean;
  desde: string;
  whatsapp: string;
  numeros: Numero[];
}
interface Codigo {
  codigo: string;
  expiraEn: string;
  enlace: string;
  whatsapp: string;
}

const botonPrincipal =
  "inline-flex min-h-[2.75rem] items-center gap-2 rounded-full border border-noche bg-noche px-6 py-2 text-sm font-medium text-niebla transition-[background-color,border-color,scale] duration-150 hover:border-noche-suave hover:bg-noche-suave active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:opacity-50";
const botonSecundario =
  "inline-flex min-h-[2.75rem] items-center rounded-full border border-linea-control/60 bg-niebla px-5 py-2 text-sm font-medium text-noche transition-[background-color,border-color,scale] duration-150 hover:border-linea-control hover:bg-papel-medio active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:opacity-50";

export function AsistenteWhatsApp() {
  const { isEnglish: en } = useLanguage();
  const [estado, setEstado] = useState<Estado | null>(null);
  const [codigo, setCodigo] = useState<Codigo | null>(null);
  const [listo, setListo] = useState(false);
  const [quitando, setQuitando] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cuantosAntes = useRef(0);

  const fecha = (iso: string) =>
    new Date(iso).toLocaleDateString(en ? "en-US" : "es-MX", { day: "numeric", month: "long" });

  async function cargar(): Promise<Estado | null> {
    const r = await fetch("/api/panel/asistente", { cache: "no-store" });
    if (!r.ok) return null;
    const d = (await parseJsonSafe<Estado>(r)).data as Estado | null;
    if (d) setEstado(d);
    return d;
  }

  useEffect(() => {
    cargar().catch(() => {});
  }, []);

  // Con un código en pantalla: ¿ya llegó el WhatsApp?
  useEffect(() => {
    if (!codigo) return;
    const vence = Date.parse(codigo.expiraEn);
    const id = setInterval(async () => {
      if (Date.now() > vence) {
        setCodigo(null);
        return;
      }
      const d = await cargar().catch(() => null);
      if (d && d.numeros.length > cuantosAntes.current) {
        setCodigo(null);
        setListo(true);
      }
    }, 4000);
    return () => clearInterval(id);
  }, [codigo]);

  async function pedirCodigo() {
    setTrabajando(true);
    setError(null);
    setListo(false);
    try {
      const r = await fetch("/api/panel/asistente", { method: "POST" });
      const d = (await parseJsonSafe<Codigo & { error?: string }>(r)).data as (Codigo & { error?: string }) | null;
      if (!r.ok || !d?.codigo) throw new Error(d?.error || (en ? "We couldn't create the code." : "No se pudo crear el código."));
      cuantosAntes.current = estado?.numeros.length ?? 0;
      setCodigo(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setTrabajando(false);
    }
  }

  async function quitar(id: string) {
    setTrabajando(true);
    setError(null);
    try {
      const r = await fetch(`/api/panel/asistente?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const d = (await parseJsonSafe<{ numeros?: Numero[]; error?: string }>(r)).data as { numeros?: Numero[]; error?: string } | null;
      if (!r.ok) throw new Error(d?.error || (en ? "We couldn't remove it." : "No se pudo quitar."));
      setEstado((e) => (e ? { ...e, numeros: d?.numeros ?? [] } : e));
      setQuitando(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setTrabajando(false);
    }
  }

  if (!estado || estado.fuera) return null;

  return (
    <section className="panel-card grid gap-4 p-6 sm:p-8 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] md:gap-10 md:p-10">
      <div>
        <h2 className="text-xl font-medium text-noche">{en ? "Your WhatsApp assistant" : "Su asistente por WhatsApp"}</h2>
        <p className="mt-2 text-sm leading-relaxed text-tinta">
          {en
            ? CAMBIA
              ? "Ask it on WhatsApp about your wedding: who has RSVPed, who's missing, your tables, your vendors and your payments. You can also ask it for changes (confirm someone, change seats or tables, add a to-do or a payment): it first tells you exactly what will change, and only does it if you reply \u201cs\u00ed\u201d. If something went wrong, write \u201cdeshacer\u201d. Each of you links your own phone."
              : "Ask it on WhatsApp about your wedding: who has RSVPed, who's missing, your tables, your vendors and your payments. It answers with the details in your panel and doesn't change anything. Each of you links your own phone."
            : CAMBIA
              ? "Pregúntenle por WhatsApp lo de su boda: quién ha confirmado, quién falta, sus mesas, sus proveedores y sus pagos. También le pueden pedir cambios (confirmar a alguien, cambiar pases o mesas, apuntar un pendiente o un pago): antes les dice exactamente qué va a cambiar, y sólo lo hace si contestan «sí». Si algo salió mal, escriban «deshacer». Cada quien liga su propio teléfono."
              : "Pregúntenle por WhatsApp lo de su boda: quién ha confirmado, quién falta, sus mesas, sus proveedores y sus pagos. Contesta con los datos de su panel y no cambia nada. Cada quien liga su propio teléfono."}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-tinta">
          {en ? "It uses artificial intelligence to answer. " : "Para contestar usa inteligencia artificial. "}
          <Link href="/privacidad" className="underline decoration-linea-control underline-offset-4 transition-colors hover:decoration-noche">
            {en ? "Privacy notice" : "Aviso de privacidad"}
          </Link>
        </p>
      </div>

      <div className="min-w-0 space-y-4">
        {!estado.disponible ? (
          <p className="text-sm text-noche">
            {en
              ? `Available from ${new Date(`${estado.desde}T12:00:00`).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}.`
              : `Disponible desde el ${new Date(`${estado.desde}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}.`}
          </p>
        ) : (
          <>
            {estado.numeros.length > 0 ? (
              <ul className="divide-y divide-linea rounded-xl border border-linea bg-niebla">
                {estado.numeros.map((n) => (
                  <li key={n.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <p className="min-w-0 flex-1 text-sm text-noche">
                      •••• {n.terminacion}{" "}
                      <span className="text-tinta">· {en ? `since ${fecha(n.ligadoEn)}` : `desde el ${fecha(n.ligadoEn)}`}</span>
                    </p>
                    {quitando === n.id ? (
                      <span className="flex items-center gap-2">
                        <button type="button" disabled={trabajando} onClick={() => quitar(n.id)} className={botonSecundario}>
                          {en ? "Yes, remove it" : "Sí, quitarlo"}
                        </button>
                        <button type="button" onClick={() => setQuitando(null)} className="text-sm text-tinta underline underline-offset-4">
                          {en ? "Cancel" : "Cancelar"}
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setQuitando(n.id)}
                        aria-label={en ? `Remove the number ending in ${n.terminacion}` : `Quitar el número que termina en ${n.terminacion}`}
                        className="text-sm text-tinta underline decoration-linea-control underline-offset-4 transition-colors hover:text-noche hover:decoration-noche"
                      >
                        {en ? "Remove" : "Quitar"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}

            {listo ? (
              <p role="status" className="flex items-center gap-2 rounded-xl bg-papel px-4 py-3 text-sm text-noche">
                <Check className="h-4 w-4 text-tinta" strokeWidth={2} />
                {en ? "Done! You can write to it now." : "¡Listo! Ya le pueden escribir."}
              </p>
            ) : null}

            {codigo ? (
              <div className="rounded-xl border border-linea bg-niebla p-5">
                <p className="text-sm text-tinta">{en ? "Your code" : "Su código"}</p>
                <p className="mt-1 font-mono text-2xl tracking-widest text-noche">{codigo.codigo}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <a href={codigo.enlace} target="_blank" rel="noopener noreferrer" className={botonPrincipal}>
                    <MessageCircle className="h-4 w-4" strokeWidth={1.8} />
                    {en ? "Open WhatsApp" : "Abrir WhatsApp"}
                  </a>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-tinta">
                  {en
                    ? `Or send it from the phone you want to link to ${codigo.whatsapp}. It expires in 30 minutes and works once.`
                    : `O mándenlo desde el teléfono que quieren ligar al ${codigo.whatsapp}. Vence en 30 minutos y sirve una vez.`}
                </p>
              </div>
            ) : estado.numeros.length < 4 ? (
              <button type="button" disabled={trabajando} onClick={pedirCodigo} className={botonPrincipal}>
                <MessageCircle className="h-4 w-4" strokeWidth={1.8} />
                {estado.numeros.length === 0
                  ? en
                    ? "Link my WhatsApp"
                    : "Ligar mi WhatsApp"
                  : en
                    ? "Link another WhatsApp"
                    : "Ligar otro WhatsApp"}
              </button>
            ) : (
              <p className="text-sm text-tinta">{en ? "You already have 4 numbers linked." : "Ya tienen 4 números ligados."}</p>
            )}
          </>
        )}

        {error ? (
          <p role="alert" className="rounded-xl border border-error/30 bg-error-fondo px-4 py-3 text-sm text-error">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
