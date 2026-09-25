"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, X } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Rings } from "@/components/marketing/Ink";
import { Watercolor } from "@/components/marketing/Watercolor";
import { DIAS_DE_PRUEBA } from "@/lib/accesoDeLaBoda";
import { SaveTheDate } from "./SaveTheDate";
import {
  BOTON_PRIMARIO,
  BOTON_SECUNDARIO,
  PasoFecha,
  PasoInvitados,
  PasoLugar,
  PasoNombres,
  PasoPresupuesto,
  PasoPrioridades,
  PasoWhatsApp,
} from "./pasos";
import { PasoGuardar } from "./PasoGuardar";
import { borrarBorrador, guardarBorrador, leerBorrador } from "./borrador";
import { cuerpoDe, RESPUESTAS_VACIAS, type Respuestas } from "./respuestas";

const PASOS = [
  "bienvenida",
  "nombres",
  "fecha",
  "lugar",
  "invitados",
  "presupuesto",
  "prioridades",
  "whatsapp",
  "guardar",
] as const;
const ULTIMO = PASOS.length - 1;
/** La bienvenida no cuenta como pregunta: «1 de 8» empieza en los nombres. */
const PREGUNTAS = PASOS.length - 1;

/**
 * - leyendo:   volviendo de Google, todavía sin mirar sessionStorage.
 * - guardando: había respuestas y ya se mandaron; en cuanto contesta, al panel.
 * - perdidas:  volvió con sesión pero sin respuestas (otra pestaña, ventana
 *              privada). No se bloquea: se ofrece contarlas otra vez o guardar así.
 */
type Vuelta = "leyendo" | "guardando" | "perdidas" | null;

/**
 * /comenzar: la prueba de siete días empieza contándole su boda a alguien.
 * Una pregunta por pantalla, cada respuesta devuelve algo, todo se puede
 * saltar (vacío es NULL). Al final entra con Google o con un código y la boda
 * nace en POST /api/prueba.
 */
export function Onboarding({
  modo,
  correoDeSesion,
  nombreDeGoogle,
}: {
  /** "volviendo" = /comenzar/guardar, la vuelta de Google o del enlace del correo. */
  modo: "nuevo" | "volviendo";
  correoDeSesion: string | null;
  /** El nombre de pila de la cuenta de Google, para no preguntarle lo que ya dijo. */
  nombreDeGoogle: string | null;
}) {
  const { language, isEnglish } = useLanguage();
  const [r, setR] = useState<Respuestas>(RESPUESTAS_VACIAS);
  const [indice, setIndice] = useState(0);
  const [sesion, setSesion] = useState<string | null>(correoDeSesion);
  const [guardando, setGuardando] = useState(false);
  const [errorAlGuardar, setErrorAlGuardar] = useState<string | null>(null);
  const [vuelta, setVuelta] = useState<Vuelta>(modo === "volviendo" ? "leyendo" : null);
  const [listo, setListo] = useState(false);

  const raiz = useRef<HTMLDivElement>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const primeraVez = useRef(true);
  const yaLeido = useRef(false);

  // La página vive encima del sitio (fixed): el navbar y el footer siguen en
  // el DOM debajo. Se sacan del orden de tabulación y del árbol de
  // accesibilidad, y el fondo deja de desplazarse detrás.
  useEffect(() => {
    const root = raiz.current;
    const html = document.documentElement;
    const body = document.body;
    const antesHtml = html.style.overflow;
    const antesBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    const inertes: Element[] = [];
    for (const el of Array.from(body.children)) {
      if (root && (el === root || el.contains(root))) continue;
      if (el.hasAttribute("inert")) continue;
      el.setAttribute("inert", "");
      inertes.push(el);
    }
    return () => {
      html.style.overflow = antesHtml;
      body.style.overflow = antesBody;
      for (const el of inertes) el.removeAttribute("inert");
    };
  }, []);

  /** true si la boda quedó guardada (y el navegador ya va al panel). */
  const guardar = useCallback(
    async (respuestas: Respuestas): Promise<boolean> => {
      setGuardando(true);
      setErrorAlGuardar(null);
      try {
        const res = await fetch("/api/prueba", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cuerpoDe(respuestas, language)),
        });
        if (res.status === 401) {
          // La sesión caducó o la cerraron en otra pestaña: de vuelta a entrar.
          setSesion(null);
          setVuelta(null);
          setIndice(ULTIMO);
          setErrorAlGuardar(
            isEnglish
              ? "Your session closed. Sign in again to save your wedding."
              : "Tu sesión se cerró. Entra otra vez para guardar tu boda."
          );
          setGuardando(false);
          return false;
        }
        const body = (await res.json().catch(() => null)) as {
          weddingId?: string;
          yaExistia?: boolean;
          error?: string;
        } | null;
        if (!res.ok || !body?.weddingId) {
          setErrorAlGuardar(
            body?.error ||
              (isEnglish
                ? "I couldn't save your wedding. Please try again."
                : "No pude guardar tu boda. Inténtalo de nuevo.")
          );
          setGuardando(false);
          return false;
        }
        borrarBorrador();
        // Navegación dura: el panel se pinta en el servidor y tiene que leer
        // la sesión recién escrita. Si la boda ya existía (una prueba por
        // correo) no hay bienvenida que dar: entra a la suya.
        window.location.assign(body.yaExistia ? "/panel" : "/panel?bienvenida=1");
        return true;
      } catch {
        setErrorAlGuardar(
          isEnglish
            ? "Connection problem. Please try again."
            : "Hubo un problema de conexión. Inténtalo de nuevo."
        );
        setGuardando(false);
        return false;
      }
    },
    [language, isEnglish]
  );

  // Retomar: el borrador de esta pestaña (una recarga, o la vuelta de Google).
  // En un efecto y no al inicializar el estado: sessionStorage no existe en el
  // servidor y el primer render tiene que coincidir con el suyo.
  useEffect(() => {
    // StrictMode monta dos veces en desarrollo: sin esto, la vuelta de Google
    // mandaría dos POST (inofensivo por el candado de empezar_prueba, pero
    // el segundo contestaría ya_existia y se perdería la bienvenida).
    if (yaLeido.current) return;
    yaLeido.current = true;

    const borrador = leerBorrador();
    const conNombre = (x: Respuestas): Respuestas =>
      x.nombre.trim() || !nombreDeGoogle ? x : { ...x, nombre: nombreDeGoogle };

    if (modo === "volviendo") {
      if (borrador) {
        const respuestas = conNombre(borrador.respuestas);
        setR(respuestas);
        setIndice(ULTIMO);
        if (correoDeSesion) {
          setVuelta("guardando");
          void guardar(respuestas).then((ok) => {
            if (!ok) setVuelta(null);
          });
        } else {
          setVuelta(null);
        }
      } else {
        setR(conNombre(RESPUESTAS_VACIAS));
        setVuelta("perdidas");
      }
    } else if (borrador) {
      setR(conNombre(borrador.respuestas));
      setIndice(Math.min(Math.max(borrador.paso, 0), ULTIMO));
    } else if (nombreDeGoogle) {
      setR(conNombre(RESPUESTAS_VACIAS));
    }
    setListo(true);
  }, [modo, correoDeSesion, nombreDeGoogle, guardar]);

  // Cada cambio queda en el borrador: una recarga no le borra lo que contó.
  useEffect(() => {
    if (!listo || vuelta !== null) return;
    guardarBorrador({ respuestas: r, paso: indice });
  }, [r, indice, listo, vuelta]);

  // Al cambiar de pantalla: arriba del todo, y el foco al título para que un
  // lector de pantalla anuncie la pregunta nueva. En la primera pintura no:
  // robarle el foco a quien acaba de llegar es desorientarla.
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    raiz.current?.scrollTo({ top: 0 });
    // Un fotograma después: el título nuevo se monta con la pantalla (key).
    const id = requestAnimationFrame(() => tituloRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(id);
  }, [indice, vuelta]);

  const cambiar = useCallback((parcial: Partial<Respuestas>) => {
    setR((prev) => ({ ...prev, ...parcial }));
  }, []);

  const avanzar = useCallback((parcial?: Partial<Respuestas>) => {
    if (parcial) setR((prev) => ({ ...prev, ...parcial }));
    setIndice((i) => Math.min(i + 1, ULTIMO));
  }, []);

  const paso = PASOS[indice];
  const enPregunta = indice > 0 && vuelta === null;
  const propsDePaso = { r, cambiar, avanzar, tituloRef, isEnglish };

  let contenido: ReactNode;
  if (vuelta === "leyendo" || vuelta === "guardando") {
    contenido = (
      <div role="status" className="flex flex-1 flex-col items-center justify-center pb-16 text-center">
        <div className="relative mx-auto h-36 w-52">
          <Watercolor seed={4} className="absolute inset-0 h-full w-full" />
          <Rings className="relative mx-auto h-32 w-auto text-line" />
        </div>
        <h1
          ref={tituloRef}
          tabIndex={-1}
          className="mt-6 font-heading text-4xl font-medium tracking-[-0.02em] text-navy outline-none"
        >
          {isEnglish ? "Saving your wedding…" : "Guardando tu boda…"}
        </h1>
        <p className="mt-3 font-body text-[15px] text-navy-muted">
          {isEnglish ? "One moment and you're in your panel." : "Un momento y entras a tu panel."}
        </p>
      </div>
    );
  } else if (vuelta === "perdidas") {
    contenido = (
      <div className="flex flex-1 flex-col justify-center pb-16">
        <h1
          ref={tituloRef}
          tabIndex={-1}
          className="font-heading text-[2.35rem] font-medium leading-[1.05] tracking-[-0.02em] text-navy text-balance outline-none sm:text-5xl"
        >
          {isEnglish
            ? `You're in${r.nombre ? `, ${r.nombre}` : ""}. Your answers got lost on the way.`
            : `Ya entraste${r.nombre ? `, ${r.nombre}` : ""}. Solo se me perdieron tus respuestas en el camino.`}
        </h1>
        <p className="mt-4 max-w-[46ch] font-body text-[15px] leading-relaxed text-navy-muted">
          {isEnglish
            ? "It happens sometimes when coming back from Google. Tell me again? It takes two minutes. Or save it like this and fill it in from your panel."
            : "A veces pasa al volver de Google. ¿Me las cuentas otra vez? Son dos minutos. O guárdala así y lo llenas desde tu panel."}
        </p>
        {errorAlGuardar ? (
          <p role="alert" className="mt-6 rounded-xl bg-terra-light px-4 py-3 font-body text-sm text-terra-deep">
            {errorAlGuardar}
          </p>
        ) : null}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className={BOTON_PRIMARIO}
            disabled={guardando}
            onClick={() => {
              setVuelta(null);
              setIndice(1);
            }}
          >
            {isEnglish ? "Tell you again" : "Contártelas otra vez"}
          </button>
          <button type="button" className={BOTON_SECUNDARIO} disabled={guardando} onClick={() => void guardar(r)}>
            {guardando
              ? isEnglish
                ? "Saving…"
                : "Guardando…"
              : isEnglish
                ? "Save as is and enter"
                : "Guardar así y entrar"}
          </button>
        </div>
      </div>
    );
  } else if (paso === "bienvenida") {
    contenido = (
      <div className="flex flex-1 flex-col items-center justify-center pb-10 text-center">
        <div className="relative mx-auto h-40 w-60">
          <Watercolor seed={4} className="absolute inset-0 h-full w-full" />
          <Rings className="relative mx-auto h-36 w-auto text-line" />
        </div>
        <p aria-hidden="true" className="mt-4 font-script text-[2rem] leading-none text-line">
          Something blue
        </p>
        <h1
          ref={tituloRef}
          tabIndex={-1}
          className="mt-3 font-heading text-[2.9rem] font-medium leading-[1.02] tracking-[-0.02em] text-navy text-balance outline-none sm:text-6xl"
        >
          {isEnglish ? "Tell me about your wedding." : "Cuéntame de tu boda."}
        </h1>
        <p className="mt-5 max-w-[36ch] font-body text-base leading-relaxed text-navy-muted text-pretty sm:text-lg">
          {isEnglish
            ? "It takes two minutes, and you can change everything later."
            : "Son dos minutos, y todo se puede cambiar después."}
        </p>
        <button type="button" onClick={() => setIndice(1)} className={`${BOTON_PRIMARIO} mt-9 w-full sm:w-auto sm:px-12`}>
          {isEnglish ? "Start" : "Empezar"}
        </button>
        <p className="mt-4 font-body text-sm text-navy-muted">
          {isEnglish
            ? `${DIAS_DE_PRUEBA} days to try everything. No card.`
            : `${DIAS_DE_PRUEBA} días para probarlo todo. Sin tarjeta.`}
        </p>
        <p className="mt-12 font-body text-sm text-navy-muted">
          {isEnglish ? "Already have your panel? " : "¿Ya tienes tu panel? "}
          <Link
            href="/acceso"
            className="inline-flex min-h-[44px] items-center font-semibold text-azul-deep underline-offset-4 hover:text-navy hover:underline"
          >
            {isEnglish ? "Sign in" : "Entrar"}
          </Link>
        </p>
      </div>
    );
  } else if (paso === "guardar") {
    contenido = (
      <>
        <PasoGuardar
          tituloRef={tituloRef}
          correoDeSesion={sesion}
          alCambiarSesion={setSesion}
          guardar={() => void guardar(r)}
          guardando={guardando}
          errorAlGuardar={errorAlGuardar}
          antesDeSalir={() => guardarBorrador({ respuestas: r, paso: indice })}
          isEnglish={isEnglish}
        />
        <div className="mx-auto mt-16 w-full max-w-sm px-6 lg:hidden">
          <SaveTheDate
            nombre={r.nombre}
            pareja={r.pareja}
            fecha={r.fecha}
            sinFecha={r.sinFecha}
            lugar={r.lugar}
            isEnglish={isEnglish}
          />
        </div>
      </>
    );
  } else if (paso === "nombres") {
    contenido = <PasoNombres {...propsDePaso} />;
  } else if (paso === "fecha") {
    contenido = <PasoFecha {...propsDePaso} />;
  } else if (paso === "lugar") {
    contenido = <PasoLugar {...propsDePaso} />;
  } else if (paso === "invitados") {
    contenido = <PasoInvitados {...propsDePaso} />;
  } else if (paso === "presupuesto") {
    contenido = <PasoPresupuesto {...propsDePaso} />;
  } else if (paso === "prioridades") {
    contenido = <PasoPrioridades {...propsDePaso} />;
  } else {
    contenido = <PasoWhatsApp {...propsDePaso} />;
  }

  return (
    <div
      ref={raiz}
      // panel-sb además de sb: SeparadorO y el hook de acceso vienen del
      // formulario de /acceso, que pinta con los neutros del panel (sand,
      // ink). panel-sb los vuelve azules aquí también.
      className="sb panel-sb fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden overscroll-contain bg-paper"
    >
      <header className="mx-auto grid h-16 w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-h-[44px] items-center gap-2.5 justify-self-start">
          <Image src="/icon.png" alt="" width={28} height={28} />
          {/* Debajo de 400px el nombre se partía en dos renglones junto a los
              puntos del progreso. Ahí basta el ícono; el nombre se queda para
              lectores de pantalla (es el nombre del enlace). */}
          <span className="whitespace-nowrap font-round text-base uppercase leading-none tracking-[0.04em] text-navy max-[399px]:sr-only">
            Blue Book
          </span>
        </Link>
        {enPregunta ? <Puntos actual={indice} total={PREGUNTAS} isEnglish={isEnglish} /> : <span />}
        <Link
          href="/"
          aria-label={isEnglish ? "Leave" : "Salir"}
          className="flex h-11 w-11 items-center justify-center justify-self-end rounded-full text-navy-muted transition-colors hover:bg-wash-soft hover:text-navy"
        >
          <X className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
        </Link>
      </header>

      <main
        className={`mx-auto w-full px-4 sm:px-6 lg:px-8 ${
          enPregunta
            ? "max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)] lg:gap-24"
            : "max-w-2xl"
        }`}
      >
        <section className="flex min-h-[calc(100dvh-4rem)] min-w-0 flex-col pb-12 pt-4 sm:pt-10">
          {enPregunta ? (
            <button
              type="button"
              onClick={() => setIndice((i) => Math.max(i - 1, 0))}
              disabled={guardando}
              className="-ml-3 mb-4 inline-flex min-h-[44px] items-center gap-1 self-start rounded-full px-3 font-body text-sm text-navy-muted transition-colors hover:text-navy disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              {isEnglish ? "Back" : "Atrás"}
            </button>
          ) : null}
          {/* key: cada pantalla se monta de nuevo y repite la entrada (240ms,
              8px, ease-out; con movimiento reducido solo el fundido). */}
          <div
            key={vuelta === "leyendo" ? "guardando" : (vuelta ?? paso)}
            className="animate-step-in flex flex-1 flex-col"
            style={{ animationDuration: "240ms" }}
          >
            {contenido}
          </div>
        </section>

        {enPregunta ? (
          <aside className="hidden lg:block">
            <div className="sticky top-10 pt-24">
              <SaveTheDate
                nombre={r.nombre}
                pareja={r.pareja}
                fecha={r.fecha}
                sinFecha={r.sinFecha}
                lugar={r.lugar}
                isEnglish={isEnglish}
              />
            </div>
          </aside>
        ) : null}
      </main>
    </div>
  );
}

/**
 * Dónde va, sin barra de progreso: ocho puntos y el actual un poco más largo.
 * El texto «3 de 8» va para lectores de pantalla; a la vista basta la forma.
 */
function Puntos({ actual, total, isEnglish }: { actual: number; total: number; isEnglish: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="sr-only">
        {isEnglish ? `Question ${actual} of ${total}` : `Pregunta ${actual} de ${total}`}
      </span>
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        return (
          <span
            key={n}
            aria-hidden="true"
            className={`h-1.5 rounded-full transition-[width,background-color] duration-200 motion-reduce:transition-none ${
              n === actual ? "w-4 bg-navy" : n < actual ? "w-1.5 bg-azul/60" : "w-1.5 bg-wash-deep"
            }`}
          />
        );
      })}
    </div>
  );
}
