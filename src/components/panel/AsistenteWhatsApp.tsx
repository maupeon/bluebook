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
  /** Recibe los recordatorios por WhatsApp (0059); «pausa» los apaga. */
  avisos?: boolean;
}
interface Estado {
  fuera: boolean;
  /** cuota_del_asistente: su plan lo incluye (la prueba sí, Esencial no). */
  incluido?: boolean;
  /** Un admin apagó a Hermes para todas las bodas: no se dan códigos. */
  apagado?: boolean;
  disponible: boolean;
  desde: string;
  whatsapp: string;
  numeros: Numero[];
  /** Qué recordatorios le tocan a la boda (0059): con plan, todos; en la prueba, el del lunes. */
  recordatorios?: "completo" | "resumen" | null;
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

/** "Ahora no" en la tarjeta de Hoy: se esconde una semana, por boda. */
const SEMANA = 7 * 24 * 60 * 60 * 1000;
const claveDeLuego = (weddingId: string) => `bb:asistente-luego:${weddingId}`;

export function AsistenteWhatsApp({
  variante = "completa",
  weddingId,
}: {
  /**
   * "completa" en Su boda: los números, quitar, ligar otro.
   * "hoy" arriba de Hoy, recién salidos del onboarding: sólo mientras no hay
   * ningún número ligado y su plan lo incluye. Es lo primero que se les pide.
   */
  variante?: "completa" | "hoy";
  weddingId?: string;
} = {}) {
  const { isEnglish: en } = useLanguage();
  const [luego, setLuego] = useState(false);
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

  useEffect(() => {
    if (variante !== "hoy" || !weddingId) return;
    try {
      const t = Number(window.localStorage.getItem(claveDeLuego(weddingId)) ?? 0);
      if (t && Date.now() - t < SEMANA) setLuego(true);
    } catch {
      // Sin almacenamiento: la tarjeta sale siempre, que es lo seguro.
    }
  }, [variante, weddingId]);

  function ahoraNo() {
    setLuego(true);
    try {
      if (weddingId) window.localStorage.setItem(claveDeLuego(weddingId), String(Date.now()));
    } catch {
      // nada que guardar
    }
  }

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

  async function alternarAvisos(id: string, avisos: boolean) {
    const cambiar = (valor: boolean) =>
      setEstado((e) => (e ? { ...e, numeros: e.numeros.map((n) => (n.id === id ? { ...n, avisos: valor } : n)) } : e));
    setError(null);
    cambiar(avisos);
    try {
      const r = await fetch("/api/panel/asistente", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, avisos }),
      });
      const d = (await parseJsonSafe<{ numeros?: Numero[]; error?: string }>(r)).data as { numeros?: Numero[]; error?: string } | null;
      if (!r.ok) throw new Error(d?.error || (en ? "We couldn't save it." : "No se pudo guardar."));
      if (d?.numeros) setEstado((e) => (e ? { ...e, numeros: d.numeros ?? [] } : e));
    } catch (e) {
      cambiar(!avisos);
      setError(e instanceof Error ? e.message : String(e));
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

  if (variante === "hoy") {
    // Se queda con el «¡Listo!» a la vista aunque ya haya un número.
    const yaLigado = estado.numeros.length > 0 && !listo;
    if (luego || yaLigado || estado.incluido === false || !estado.disponible) return null;
    return (
      <section
        aria-labelledby="asistente-hoy"
        className="panel-card relative overflow-hidden p-6 sm:p-8"
      >
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="max-w-[60ch]">
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-vino">
              {en ? "First step" : "Lo primero"}
            </p>
            <h2 id="asistente-hoy" className="mt-2 text-xl font-medium text-noche">
              {en ? "Link your WhatsApp to your assistant" : "Liguen su WhatsApp con su asistente"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-tinta">
              {en
                ? "On Mondays it sends you what's due that week, and you can ask it anything about your wedding on WhatsApp. Each of you links your own phone; it takes a minute."
                : "Los lunes les manda lo que toca esa semana, y por WhatsApp le pueden preguntar lo que sea de su boda. Cada quien liga su teléfono; toma un minuto."}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-tinta">
              {en ? "It uses artificial intelligence to answer. " : "Para contestar usa inteligencia artificial. "}
              <Link href="/privacidad" className="underline decoration-linea-control underline-offset-4 transition-colors hover:decoration-noche">
                {en ? "Privacy notice" : "Aviso de privacidad"}
              </Link>
            </p>
          </div>

          <div className="min-w-0 space-y-3 md:min-w-[16rem]">
            {listo ? (
              <p role="status" className="flex items-center gap-2 rounded-xl bg-papel px-4 py-3 text-sm text-noche">
                <Check className="h-4 w-4 text-tinta" strokeWidth={2} />
                {en ? "Done! You can write to it now." : "¡Listo! Ya le pueden escribir."}
              </p>
            ) : codigo ? (
              <div className="rounded-xl border border-linea bg-papel p-4">
                <p className="text-xs text-tinta">{en ? "Your code" : "Su código"}</p>
                <p className="mt-1 font-mono text-xl tracking-widest text-noche">{codigo.codigo}</p>
                <a href={codigo.enlace} target="_blank" rel="noopener noreferrer" className={`${botonPrincipal} mt-3`}>
                  <MessageCircle className="h-4 w-4" strokeWidth={1.8} />
                  {en ? "Open WhatsApp" : "Abrir WhatsApp"}
                </a>
                <p className="mt-2 text-xs leading-relaxed text-tinta">
                  {en
                    ? `Or send it to ${codigo.whatsapp} from the phone you want to link. It expires in 30 minutes.`
                    : `O mándenlo al ${codigo.whatsapp} desde el teléfono que quieren ligar. Vence en 30 minutos.`}
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" disabled={trabajando} onClick={pedirCodigo} className={botonPrincipal}>
                  <MessageCircle className="h-4 w-4" strokeWidth={1.8} />
                  {en ? "Link my WhatsApp" : "Ligar mi WhatsApp"}
                </button>
                <button
                  type="button"
                  onClick={ahoraNo}
                  className="min-h-[2.75rem] px-2 text-sm text-tinta underline decoration-linea-control underline-offset-4 hover:text-noche hover:decoration-noche"
                >
                  {en ? "Not now" : "Ahora no"}
                </button>
              </div>
            )}
            {error ? (
              <p role="alert" className="rounded-xl border border-error/30 bg-error-fondo px-4 py-3 text-sm text-error">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

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
        {estado.apagado ? (
          <p className="text-sm text-noche">
            {en
              ? "Your assistant is switched off for now. Whatever you write on WhatsApp reaches our team."
              : "Su asistente está apagado por ahora. Lo que escriban por WhatsApp le llega a nuestro equipo."}
          </p>
        ) : !estado.disponible ? (
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
                    {estado.recordatorios && n.avisos !== undefined && quitando !== n.id ? (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={n.avisos}
                        aria-label={
                          en ? `Reminders for the number ending in ${n.terminacion}` : `Recordatorios al número que termina en ${n.terminacion}`
                        }
                        onClick={() => alternarAvisos(n.id, !n.avisos)}
                        className="inline-flex min-h-[2.75rem] items-center gap-2 text-sm text-tinta transition-colors hover:text-noche"
                      >
                        {en ? "Reminders" : "Recordatorios"}
                        <span
                          aria-hidden="true"
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150 ${
                            n.avisos ? "bg-noche" : "bg-linea-control"
                          }`}
                        >
                          <span
                            className="absolute left-0.5 h-4 w-4 rounded-full bg-niebla shadow-sm transition-transform duration-150 ease-out motion-reduce:transition-none"
                            style={{ transform: n.avisos ? "translateX(1rem)" : "translateX(0)" }}
                          />
                        </span>
                      </button>
                    ) : null}
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

            {estado.numeros.length > 0 && estado.recordatorios ? (
              <p className="text-xs leading-relaxed text-tinta">
                {estado.recordatorios === "completo"
                  ? en
                    ? "On Mondays it sends you what's coming up that week, and a heads-up when a payment, an appointment or a to-do is close. To stop them, turn them off here or write “pausa” on WhatsApp."
                    : "Los lunes les manda lo que viene en la semana, y un aviso cuando se acerca un pago, una cita o un pendiente. Para dejar de recibirlos, apáguenlos aquí o escriban «pausa» por WhatsApp."
                  : en
                    ? "On Mondays it sends you what's coming up that week. To stop it, turn it off here or write “pausa” on WhatsApp."
                    : "Los lunes les manda lo que viene en la semana. Para dejar de recibirlo, apáguenlo aquí o escriban «pausa» por WhatsApp."}
              </p>
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
