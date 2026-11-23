"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertCircle, MessageCircle, Send, UserRound, X } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { createClient } from "@/lib/supabase/client";
import { parseJsonSafe } from "@/lib/http";
import type { ElChat, MensajeDelChat } from "@/lib/chatDelPanel";

/**
 * LA BURBUJA DEL CHAT, abajo a la derecha en todas las pantallas del panel
 * (en el teléfono, arriba de la barra de abajo, y abierta ocupa la pantalla).
 *
 * Una sola conversación con tres voces: ustedes, el asistente (con su nombre)
 * y su planner (o alguien del equipo). Contesta el asistente si su plan lo
 * incluye; «Hablar con una persona» (o pedirlo con palabras) la pasa a su
 * planner. Todo se lee de /api/panel/chat; lo nuevo llega por Realtime
 * (couple_messages y chat_del_panel, con su RLS) y, si Realtime no conecta,
 * preguntando cada pocos segundos mientras está abierta.
 *
 * El punto de «nuevo» es por navegador (localStorage): lo último que ESTE
 * navegador ya vio del asistente o del equipo.
 */

const campo =
  "w-full rounded-xl border border-linea-control/70 bg-papel text-sm text-noche outline-none transition-[border-color,box-shadow] focus:border-noche focus:ring-2 focus:ring-noche/20";

const claveVisto = (weddingId: string) => `bluebook:chat-visto:${weddingId}`;
/** Si no llega respuesta en este tiempo, se quita el «escribiendo…» que se puso al enviar. */
const ESPERA_MAX_MS = 45_000;

function leerVisto(weddingId: string): string | null {
  try {
    return window.localStorage.getItem(claveVisto(weddingId));
  } catch {
    return null;
  }
}

function guardarVisto(weddingId: string, cuando: string) {
  try {
    window.localStorage.setItem(claveVisto(weddingId), cuando);
  } catch {
    // Sin almacenamiento (ventana privada): el punto vuelve a salir. No pasa nada.
  }
}

// ----- El texto de un mensaje: *negritas*, listas con «- » y enlaces, como en WhatsApp -----

const EN_LINEA = /(https?:\/\/[^\s<>]+[^\s<>.,;:!?)\]'"»])|\*([^*\n]+)\*/g;

function Enlace({ url }: { url: string }) {
  let href = url;
  let interno = false;
  try {
    const u = new URL(url);
    // Un enlace a su propio panel se abre aquí mismo, sin otra pestaña.
    if (/(^|\.)bluebook\.mx$/i.test(u.hostname) && u.pathname.startsWith("/panel")) {
      href = `${u.pathname}${u.search}${u.hash}`;
      interno = true;
    }
  } catch {
    // No es una URL válida: se deja como texto enlazado tal cual.
  }
  return interno ? (
    <Link href={href} className="break-all underline underline-offset-4">
      {url.replace(/^https?:\/\/(www\.)?/, "")}
    </Link>
  ) : (
    <a href={href} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-4">
      {url}
    </a>
  );
}

function enLinea(texto: string, clave: string): ReactNode[] {
  const partes: ReactNode[] = [];
  const re = new RegExp(EN_LINEA.source, "g");
  let ultimo = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto))) {
    if (m.index > ultimo) partes.push(texto.slice(ultimo, m.index));
    if (m[1]) partes.push(<Enlace key={`${clave}-${i++}`} url={m[1]} />);
    else
      partes.push(
        <strong key={`${clave}-${i++}`} className="font-medium">
          {m[2]}
        </strong>
      );
    ultimo = m.index + m[0].length;
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo));
  return partes;
}

function Formato({ texto }: { texto: string }) {
  const bloques: ReactNode[] = [];
  let lista: string[] = [];
  const cerrarLista = (clave: string) => {
    if (!lista.length) return;
    const items = lista;
    bloques.push(
      <ul key={clave} className="list-disc space-y-0.5 pl-5">
        {items.map((l, i) => (
          <li key={i}>{enLinea(l, `${clave}-${i}`)}</li>
        ))}
      </ul>
    );
    lista = [];
  };
  texto.split("\n").forEach((linea, i) => {
    const item = /^\s*[-•*]\s+(.*)$/.exec(linea);
    if (item) {
      lista.push(item[1]);
      return;
    }
    cerrarLista(`ul${i}`);
    bloques.push(linea.trim() ? <p key={i}>{enLinea(linea, `l${i}`)}</p> : <div key={i} aria-hidden="true" className="h-1.5" />);
  });
  cerrarLista("ul-fin");
  return <div className="space-y-0.5 break-words text-sm leading-relaxed">{bloques}</div>;
}

function hora(iso: string, isEnglish: boolean): string {
  const d = new Date(iso);
  const locale = isEnglish ? "en-US" : "es-MX";
  const hoy = new Date();
  const mismoDia = d.toDateString() === hoy.toDateString();
  const h = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(d);
  return mismoDia ? h : `${new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(d)} · ${h}`;
}

// ----- La burbuja -----

export function ChatDelPanel({ weddingId }: { weddingId: string }) {
  const { isEnglish } = useLanguage();
  const t = useCallback((es: string, en: string) => (isEnglish ? en : es), [isEnglish]);
  const pathname = usePathname();

  const [abierto, setAbierto] = useState(false);
  const [chat, setChat] = useState<ElChat | null>(null);
  const [optimistas, setOptimistas] = useState<MensajeDelChat[]>([]);
  const [borrador, setBorrador] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pidiendo, setPidiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** El mensaje que acaban de mandar al asistente: hasta que conteste, «escribiendo…». */
  const [esperandoTras, setEsperandoTras] = useState<string | null>(null);
  const [visto, setVisto] = useState<string | null>(null);
  const [vistoListo, setVistoListo] = useState(false);

  const enVivo = useRef(false);
  const ultimaCarga = useRef(0);
  const abiertoRef = useRef(false);
  const ocupadoRef = useRef(false);
  const temporizador = useRef<number | null>(null);
  const hilo = useRef<HTMLDivElement | null>(null);
  const campoRef = useRef<HTMLTextAreaElement | null>(null);
  const botonRef = useRef<HTMLButtonElement | null>(null);

  const cargar = useCallback(async () => {
    ultimaCarga.current = Date.now();
    try {
      const r = await fetch("/api/panel/chat", { cache: "no-store" });
      if (!r.ok) return;
      const { data } = await parseJsonSafe<ElChat>(r);
      if (data?.estado) setChat(data);
    } catch {
      // Sin red: se queda lo que había y se reintenta en la siguiente vuelta.
    }
  }, []);

  // Varios avisos de Realtime juntos (el mensaje y el cambio de quién atiende) = una sola carga.
  const pedirCarga = useCallback(() => {
    if (temporizador.current) window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => {
      temporizador.current = null;
      cargar();
    }, 150);
  }, [cargar]);

  // Primera carga y lo visto en este navegador.
  useEffect(() => {
    setVisto(leerVisto(weddingId));
    setVistoListo(true);
    cargar();
  }, [weddingId, cargar]);

  // En vivo: lo que escriban el asistente o su planner, y quién atiende.
  useEffect(() => {
    const supabase = createClient();
    const filtro = `wedding_id=eq.${weddingId}`;
    let canal: ReturnType<typeof supabase.channel> | null = null;
    let vivo = true;
    (async () => {
      // Primero el token de su sesión. Sin esto, realtime-js (2.93) deja en cola
      // el «join» antes de tenerlo y, aunque luego lo consigue, manda la copia
      // vieja: Realtime trata el canal como anónimo, contesta SUBSCRIBED y la
      // RLS no deja pasar ni un aviso. Visto en el socket el 23-nov.
      try {
        await supabase.realtime.setAuth();
      } catch {
        // Sin token se suscribe igual; lo cubre la consulta de respaldo.
      }
      if (!vivo) return;
      // Un nombre nuevo en cada montaje: supabase.channel() devuelve el canal que
      // ya exista con ese nombre, y uno que se está cerrando (el modo estricto de
      // React monta dos veces) ya no se vuelve a suscribir.
      canal = supabase
        .channel(`chat-del-panel:${weddingId}:${Math.random().toString(36).slice(2, 10)}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "couple_messages", filter: filtro }, pedirCarga)
        .on("postgres_changes", { event: "*", schema: "public", table: "chat_del_panel", filter: filtro }, pedirCarga)
        .subscribe((estado) => {
          const conectado = estado === "SUBSCRIBED";
          // Al reconectar puede haberse perdido algo: se vuelve a leer.
          if (conectado && !enVivo.current) pedirCarga();
          enVivo.current = conectado;
        });
    })();
    return () => {
      vivo = false;
      if (canal) supabase.removeChannel(canal);
      enVivo.current = false;
      if (temporizador.current) window.clearTimeout(temporizador.current);
    };
  }, [weddingId, pedirCarga]);

  // Por si Realtime no conecta (o se pierde un aviso): preguntar, más seguido
  // con el chat abierto o mientras el asistente escribe.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const cada = !enVivo.current
        ? abiertoRef.current
          ? 4_000
          : 30_000
        : ocupadoRef.current
          ? 6_000
          : 90_000;
      if (Date.now() - ultimaCarga.current >= cada) cargar();
    }, 2_000);
    const alVolver = () => {
      if (document.visibilityState === "visible") cargar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [cargar]);

  const abrir = useCallback(() => {
    setAbierto(true);
    abiertoRef.current = true;
    cargar();
  }, [cargar]);

  const cerrar = useCallback(() => {
    setAbierto(false);
    abiertoRef.current = false;
    botonRef.current?.focus();
  }, []);

  // Los avisos y correos llevan a /panel#chat (o al viejo #mensajes): abre la burbuja.
  useEffect(() => {
    const h = window.location.hash;
    if (h === "#chat" || h === "#mensajes") {
      abrir();
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);
    }
  }, [pathname, abrir]);

  useEffect(() => {
    const alClic = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      const href = a?.getAttribute("href") ?? "";
      if (!/^(\/panel)?#(chat|mensajes)$/.test(href)) return;
      e.preventDefault();
      abrir();
    };
    const alHash = () => {
      if (window.location.hash === "#chat" || window.location.hash === "#mensajes") abrir();
    };
    document.addEventListener("click", alClic, true);
    window.addEventListener("hashchange", alHash);
    return () => {
      document.removeEventListener("click", alClic, true);
      window.removeEventListener("hashchange", alHash);
    };
  }, [abrir]);

  // Escape cierra; al abrir en computadora, el cursor va al campo.
  useEffect(() => {
    if (!abierto) return;
    if (window.matchMedia("(min-width: 768px)").matches) campoRef.current?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [abierto, cerrar]);

  const estado = chat?.estado ?? null;

  // Los optimistas que ya llegaron de verdad se dejan de enseñar.
  const mensajes = useMemo(() => {
    const reales = chat?.mensajes ?? [];
    const pendientes = optimistas.filter(
      (o) =>
        !reales.some(
          (m) => m.author === "couple" && m.body === o.body && Date.parse(m.createdAt) > Date.parse(o.createdAt) - 120_000
        )
    );
    return [...reales, ...pendientes];
  }, [chat, optimistas]);

  // ¿Ya contestó? Comparando horas del servidor con horas del servidor.
  useEffect(() => {
    if (!esperandoTras || !chat) return;
    if (chat.estado.modo !== "asistente") {
      setEsperandoTras(null);
      return;
    }
    const enviado = chat.mensajes.find((m) => m.id === esperandoTras);
    if (enviado && chat.mensajes.some((m) => m.author !== "couple" && m.createdAt > enviado.createdAt)) setEsperandoTras(null);
  }, [chat, esperandoTras]);

  useEffect(() => {
    if (!esperandoTras) return;
    const id = window.setTimeout(() => setEsperandoTras(null), ESPERA_MAX_MS);
    return () => window.clearTimeout(id);
  }, [esperandoTras]);

  const escribiendo = estado?.modo === "asistente" && (estado.escribiendo || esperandoTras != null);
  useEffect(() => {
    ocupadoRef.current = escribiendo;
  }, [escribiendo]);

  // El punto de «nuevo»: lo último del asistente o del equipo que este navegador no ha visto.
  const ultimoDeEllos = useMemo(() => {
    for (let i = mensajes.length - 1; i >= 0; i--) if (mensajes[i].author !== "couple") return mensajes[i].createdAt;
    return null;
  }, [mensajes]);
  const hayNuevo = vistoListo && !abierto && ultimoDeEllos != null && (!visto || ultimoDeEllos > visto);

  useEffect(() => {
    if (abierto && ultimoDeEllos && ultimoDeEllos !== visto) {
      guardarVisto(weddingId, ultimoDeEllos);
      setVisto(ultimoDeEllos);
    }
  }, [abierto, ultimoDeEllos, visto, weddingId]);

  // Abajo del todo al abrir y cuando llega algo.
  useEffect(() => {
    if (!abierto) return;
    const el = hilo.current;
    if (!el) return;
    const id = window.requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => window.cancelAnimationFrame(id);
  }, [abierto, mensajes.length, escribiendo]);

  function ajustarAltura(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }

  async function enviar(fijo?: string) {
    const body = (fijo ?? borrador).trim();
    if (!body || enviando) return;
    setError(null);
    setEnviando(true);
    const optimista: MensajeDelChat = {
      id: `optimista-${Date.now()}`,
      author: "couple",
      body,
      createdAt: new Date().toISOString(),
      vendorId: null,
      plannerNombre: null,
      cambioId: null,
    };
    setOptimistas((prev) => [...prev, optimista]);
    if (fijo == null) {
      setBorrador("");
      if (campoRef.current) campoRef.current.style.height = "auto";
    }
    try {
      const r = await fetch("/api/panel/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const { data } = await parseJsonSafe<ElChat & { enviado?: string; error?: string }>(r);
      if (!r.ok || !data?.estado) {
        throw new Error(data?.error || t("No pudimos enviar el mensaje.", "We couldn't send your message."));
      }
      setChat(data);
      setEsperandoTras(data.estado.modo === "asistente" && data.enviado ? data.enviado : null);
    } catch (e) {
      if (fijo == null) setBorrador(body);
      setError(e instanceof Error ? e.message : t("No pudimos enviar el mensaje.", "We couldn't send your message."));
    } finally {
      setOptimistas((prev) => prev.filter((m) => m.id !== optimista.id));
      setEnviando(false);
    }
  }

  async function pedirUnaPersona() {
    if (pidiendo) return;
    setError(null);
    setPidiendo(true);
    try {
      const r = await fetch("/api/panel/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "persona" }),
      });
      const { data } = await parseJsonSafe<ElChat & { error?: string }>(r);
      if (!r.ok || !data?.estado) throw new Error(data?.error || t("No se pudo avisar.", "We couldn't let them know."));
      setChat(data);
      setEsperandoTras(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("No se pudo avisar.", "We couldn't let them know."));
    } finally {
      setPidiendo(false);
    }
  }

  // ----- Textos -----

  const nombreAsistente = estado?.asistenteNombre ?? null;
  const conPlanner = estado?.conPlanner ?? true;
  const titulo =
    estado?.modo === "asistente"
      ? nombreAsistente ?? t("Su asistente", "Your assistant")
      : conPlanner
        ? estado?.plannerNombre ?? t("Su planner", "Your planner")
        : t("Equipo Blue Book", "The Blue Book team");
  const subtitulo =
    estado?.modo === "asistente"
      ? conPlanner
        ? t("Les contesta al momento. Su planner ve esta conversación.", "Replies right away. Your planner sees this conversation.")
        : t("Les contesta al momento. El equipo ve esta conversación.", "Replies right away. The team sees this conversation.")
      : conPlanner
        ? t("Su planner les contesta aquí.", "Your planner replies here.")
        : t("Una persona del equipo les contesta aquí.", "Someone from the team replies here.");

  const quien = (m: MensajeDelChat): string => {
    if (m.author === "asistente") {
      return nombreAsistente ? `${nombreAsistente} · ${t("asistente", "assistant")}` : t("Asistente de Blue Book", "Blue Book assistant");
    }
    if (m.author === "planner") {
      if (!m.plannerNombre) return t("Equipo Blue Book", "The Blue Book team");
      const suya = conPlanner && m.plannerNombre === estado?.plannerNombre;
      return `${m.plannerNombre} · ${suya ? t("su planner", "your planner") : t("equipo Blue Book", "Blue Book team")}`;
    }
    return "";
  };

  const ultimo = mensajes[mensajes.length - 1] ?? null;
  const conPropuesta =
    estado?.modo === "asistente" &&
    estado.propuesta != null &&
    ultimo?.author === "asistente" &&
    ultimo.cambioId === estado.propuesta;
  // Pasó a una persona y todavía no contesta nadie: que se sepa que ya se le avisó.
  const yaSeAviso =
    estado?.conAsistente && estado.atiende === "persona" && ultimo != null && ultimo.author !== "planner";

  const etiquetaBoton = hayNuevo
    ? t("Abrir el chat, hay un mensaje nuevo", "Open chat, new message")
    : t("Abrir el chat", "Open chat");

  return (
    <div className="print:hidden">
      {/* La burbuja. En el teléfono, arriba de la barra de abajo; con el chat abierto ahí, se esconde. */}
      <button
        ref={botonRef}
        type="button"
        onClick={() => (abierto ? cerrar() : abrir())}
        aria-expanded={abierto}
        aria-haspopup="dialog"
        aria-label={abierto ? t("Cerrar el chat", "Close chat") : etiquetaBoton}
        title={abierto ? t("Cerrar el chat", "Close chat") : t("Chat", "Chat")}
        className={`fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-30 h-14 w-14 items-center justify-center rounded-full bg-noche text-niebla shadow-lg transition-[background-color,scale] duration-150 hover:bg-noche-suave active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 md:bottom-6 md:right-6 ${
          abierto ? "hidden md:flex" : "flex"
        }`}
      >
        {abierto ? <X className="h-5 w-5" strokeWidth={1.6} /> : <MessageCircle className="h-6 w-6" strokeWidth={1.5} />}
        {hayNuevo ? (
          <span aria-hidden="true" className="absolute right-0.5 top-0.5 h-3.5 w-3.5 rounded-full border-2 border-niebla bg-vino" />
        ) : null}
      </button>

      {abierto ? (
        <div
          role="dialog"
          aria-label={t("Chat", "Chat")}
          className="animate-step-in fixed inset-0 z-40 flex h-[100dvh] flex-col bg-niebla md:inset-auto md:bottom-24 md:right-6 md:h-[min(40rem,calc(100dvh-8rem))] md:w-[25rem] md:overflow-hidden md:rounded-2xl md:border md:border-linea md:shadow-xl"
        >
          {/* Encabezado: quién contesta. */}
          <div className="flex items-start gap-3 border-b border-linea px-5 pb-3.5 pt-[max(0.875rem,env(safe-area-inset-top))] md:pt-3.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-medium text-noche">{titulo}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-tinta">{subtitulo}</p>
            </div>
            <button
              type="button"
              onClick={cerrar}
              aria-label={t("Cerrar el chat", "Close chat")}
              className="-mr-2 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-noche transition-colors duration-150 hover:bg-papel-medio"
            >
              <X className="h-5 w-5" strokeWidth={1.6} />
            </button>
          </div>

          {/* La conversación. */}
          <div ref={hilo} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4" aria-live="polite">
            {chat == null ? (
              <p className="px-1 py-6 text-sm text-tinta">{t("Cargando…", "Loading…")}</p>
            ) : !chat.disponible ? (
              <p className="px-1 py-6 text-sm leading-relaxed text-tinta">
                {t("El chat estará disponible muy pronto.", "Chat will be available very soon.")}
              </p>
            ) : mensajes.length === 0 ? (
              <p className="px-1 py-6 text-sm leading-relaxed text-tinta">
                {estado?.modo === "asistente"
                  ? t(
                      "Pregúntenle lo que quieran de su boda o pídanle cambios: quién falta por confirmar, cuánto llevan pagado, mover a alguien de mesa. Nada cambia sin su «sí».",
                      "Ask anything about your wedding or ask for changes: who hasn't replied, how much you've paid, moving someone to another table. Nothing changes without your “yes”."
                    )
                  : t(
                      "Escríbannos lo que necesiten, por pequeño que sea.",
                      "Write to us about anything you need, however small."
                    )}
              </p>
            ) : (
              <ol className="space-y-2.5">
                {mensajes.map((m, i) => {
                  const suyo = m.author === "couple";
                  const anterior = mensajes[i - 1];
                  // El nombre sólo cuando cambia quién habla.
                  const rotulo = !suyo && (!anterior || anterior.author !== m.author || anterior.plannerNombre !== m.plannerNombre);
                  return (
                    <li key={m.id} className={`flex flex-col ${suyo ? "items-end" : "items-start"}`}>
                      {rotulo ? (
                        <p className="mb-1 flex items-center gap-1 px-1 text-[11px] font-medium text-tinta">
                          {m.author === "planner" ? <UserRound className="h-3 w-3" strokeWidth={1.8} aria-hidden="true" /> : null}
                          {quien(m)}
                        </p>
                      ) : null}
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                          suyo
                            ? "rounded-br-md bg-noche text-niebla"
                            : m.author === "planner"
                              ? "rounded-bl-md border border-noche/15 bg-cielo-claro text-noche"
                              : "rounded-bl-md border border-linea bg-papel text-noche"
                        } ${m.id.startsWith("optimista-") ? "opacity-70" : ""}`}
                      >
                        <Formato texto={m.body} />
                        {m.vendorId ? (
                          <Link
                            href={`/panel/proveedores#proveedor-${m.vendorId}`}
                            onClick={cerrar}
                            className={`mt-1.5 inline-block text-xs font-medium underline underline-offset-4 ${
                              suyo ? "text-niebla decoration-niebla/50" : "text-noche decoration-linea-control"
                            }`}
                          >
                            {t("Verlo en Proveedores", "See it in Vendors")}
                          </Link>
                        ) : null}
                        <p
                          suppressHydrationWarning
                          className={`mt-1 text-right text-[10px] tabular-nums ${suyo ? "text-niebla" : "text-tinta"}`}
                        >
                          {hora(m.createdAt, isEnglish)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            {conPropuesta ? (
              <div className="mt-3 flex gap-2 pl-1">
                <button
                  type="button"
                  onClick={() => enviar(t("Sí", "Yes"))}
                  disabled={enviando}
                  className="rounded-full bg-noche px-5 py-2 text-sm font-medium text-niebla transition-[background-color,scale] duration-150 hover:bg-noche-suave active:scale-[0.97] disabled:opacity-50"
                >
                  {t("Sí", "Yes")}
                </button>
                <button
                  type="button"
                  onClick={() => enviar("No")}
                  disabled={enviando}
                  className="rounded-full border border-linea-control/70 px-5 py-2 text-sm font-medium text-noche transition-[background-color,scale] duration-150 hover:bg-papel-medio active:scale-[0.97] disabled:opacity-50"
                >
                  No
                </button>
              </div>
            ) : null}

            {escribiendo ? (
              <div className="mt-3 flex items-center gap-2 pl-1" role="status">
                <span className="inline-flex items-center gap-1 rounded-2xl rounded-bl-md border border-linea bg-papel px-3.5 py-3">
                  {[0, 1, 2].map((n) => (
                    <span
                      key={n}
                      aria-hidden="true"
                      className="h-1.5 w-1.5 animate-pulse rounded-full bg-tinta motion-reduce:animate-none"
                      style={{ animationDelay: `${n * 180}ms` }}
                    />
                  ))}
                </span>
                <span className="text-xs text-tinta">
                  {nombreAsistente
                    ? t(`${nombreAsistente} está escribiendo…`, `${nombreAsistente} is typing…`)
                    : t("Escribiendo…", "Typing…")}
                </span>
              </div>
            ) : null}

            {yaSeAviso ? (
              <p className="mx-auto mt-4 max-w-[30ch] text-center text-xs leading-relaxed text-tinta">
                {conPlanner
                  ? t("Ya le avisamos a su planner. Les contesta aquí mismo.", "We let your planner know. They'll reply right here.")
                  : t("Ya le avisamos al equipo. Una persona les contesta aquí mismo.", "We let the team know. Someone will reply right here.")}
              </p>
            ) : null}
          </div>

          {/* Escribir. */}
          {chat?.disponible !== false ? (
            <div className="border-t border-linea px-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-3">
              {error ? (
                <div className="mb-2.5 flex items-start gap-2 rounded-xl border border-error/30 bg-error-fondo px-3 py-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-error" strokeWidth={1.5} />
                  <p className="text-xs text-error">{error}</p>
                </div>
              ) : null}
              {estado?.modo === "asistente" ? (
                <button
                  type="button"
                  onClick={pedirUnaPersona}
                  disabled={pidiendo}
                  className="mb-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium text-noche underline-offset-4 transition-colors duration-150 hover:underline disabled:opacity-50"
                >
                  <UserRound className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
                  {t("Hablar con una persona", "Talk to a person")}
                </button>
              ) : null}
              <div className="flex items-end gap-2">
                <textarea
                  ref={campoRef}
                  value={borrador}
                  onChange={(e) => {
                    setBorrador(e.target.value);
                    ajustarAltura(e.target);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      enviar();
                    }
                  }}
                  rows={1}
                  maxLength={2000}
                  aria-label={t("Mensaje", "Message")}
                  placeholder={t("Escriban un mensaje…", "Write a message…")}
                  className={`max-h-32 min-h-[2.75rem] flex-1 resize-none ${campo} px-4 py-2.5`}
                />
                <button
                  type="button"
                  onClick={() => enviar()}
                  disabled={enviando || !borrador.trim()}
                  aria-label={t("Enviar", "Send")}
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-noche text-niebla transition-[background-color,scale] duration-150 hover:bg-noche-suave active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {enviando ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-niebla/30 border-t-niebla" />
                  ) : (
                    <Send className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
