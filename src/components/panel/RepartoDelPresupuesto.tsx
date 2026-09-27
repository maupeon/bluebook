"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Heart, Plus, RotateCcw, Trash2 } from "lucide-react";
import { PRIORIDADES, type ClavePrioridad } from "@/components/onboarding/respuestas";
import { Eyebrow, SectionTitle } from "@/components/panel/sections";
import { useRefrescoDelPanel } from "@/components/panel/useRefrescoDelPanel";
import {
  AGREGADAS_MAX,
  FUENTES,
  FUENTES_CONSULTADAS,
  NOMBRE_MAX,
  agregar,
  categoriaDe,
  fijar,
  leerMonto,
  quitar,
  renombrar,
  repartir,
  soltar,
  soltarTodas,
  type ContratadoPorCategoria,
  type PlanReparto,
  type Reparto,
  type RenglonDelReparto,
} from "@/lib/reparto";

type Guardado = "guardado" | "pendiente" | "guardando" | "error";

function pesos(n: number): string {
  return `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("es-MX")}`;
}

/** 11.25 → «11.3%»; 45 → «45%»; 0.5 → «0.5%». */
function porciento(n: number): string {
  const r = Math.round(n * 10) / 10;
  return `${Number.isInteger(r) ? r : r.toFixed(1)}%`;
}

/** «27 de septiembre de 2026» / «September 27, 2026». */
function fechaLarga(iso: string, isEnglish: boolean): string {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d)).toLocaleDateString(isEnglish ? "en-US" : "es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function idNuevo(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 12)
    : Math.random().toString(36).slice(2, 14);
}

/** «La comida» → «la comida»: la etiqueta de la prioridad dentro de una frase. */
function prioridadEnFrase(clave: ClavePrioridad, isEnglish: boolean): string {
  const p = PRIORIDADES.find((x) => x.clave === clave);
  if (!p) return clave;
  const t = isEnglish ? p.en : p.es;
  return t.charAt(0).toLowerCase() + t.slice(1);
}

/**
 * Las prioridades en una frase, cada una entre comillas: «la comida» y «las
 * fotos y el video». Sin comillas, dos prioridades se leían como tres.
 */
function prioridadesEnFrase(claves: readonly ClavePrioridad[], isEnglish: boolean): string {
  const citadas = claves.map((c) =>
    isEnglish ? `“${prioridadEnFrase(c, true)}”` : `«${prioridadEnFrase(c, false)}»`
  );
  return new Intl.ListFormat(isEnglish ? "en" : "es", { type: "conjunction" }).format(citadas);
}

/**
 * Agranda el área que se toca de un enlace o botón de texto chico sin mover
 * nada: un pseudo-elemento invisible de unos 44 px de alto alrededor.
 */
const TOQUE = "relative after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']";

/**
 * La cifra de un renglón.
 *
 * Se escribe como texto («150,000», o «$150,000.00» pegado de una cotización:
 * leerMonto) y se manda al reparto cuando la pareja deja de teclear un
 * momento, no con cada tecla: borrar «51,800» con la tecla de retroceso fijaba
 * la categoría en 5,180, 518, 51 y 5 por el camino.
 *
 * Al salir del campo vacío, o con Escape, vuelve a como estaba al entrar: a la
 * sugerencia si no estaba fijada, o a su cifra si sí. Y pasar por el campo
 * sin escribir (con Tab, o tocándolo) no fija nada: antes, salir de una
 * categoría sugerida la dejaba fijada en la cifra que tenía.
 */
function CampoMonto({
  valor,
  aMano,
  onCambio,
  onRestaurar,
  etiqueta,
  describe,
  deshabilitado,
  registrar,
}: {
  valor: number;
  aMano: boolean;
  onCambio: (n: number) => void;
  /** Volver a como estaba al entrar: si estaba fijada, y su cifra. */
  onRestaurar: (estabaFijada: boolean, cifra: number) => void;
  etiqueta: string;
  describe?: string;
  deshabilitado?: boolean;
  registrar?: (el: HTMLInputElement | null) => void;
}) {
  const mostrar = (n: number) => n.toLocaleString("es-MX");
  const [texto, setTexto] = useState(mostrar(valor));
  const [anterior, setAnterior] = useState(valor);
  const [enFoco, setEnFoco] = useState(false);
  const alEntrar = useRef({ valor, aMano });
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Si la pareja escribió algo desde que entró al campo.
  const escribio = useRef(false);

  // Si la cifra cambió DESDE FUERA (la movió otra categoría), el texto la
  // sigue; lo que la pareja está tecleando se deja como lo escribió.
  if (valor !== anterior) {
    setAnterior(valor);
    if (!enFoco) setTexto(mostrar(valor));
  }

  useEffect(
    () => () => {
      if (espera.current) clearTimeout(espera.current);
    },
    []
  );

  const cancelarEspera = () => {
    if (espera.current) clearTimeout(espera.current);
    espera.current = null;
  };

  const restaurar = () => {
    cancelarEspera();
    onRestaurar(alEntrar.current.aMano, alEntrar.current.valor);
    setTexto(mostrar(alEntrar.current.valor));
  };

  const confirmar = (t: string) => {
    cancelarEspera();
    if (!escribio.current) {
      setTexto(mostrar(valor));
      return;
    }
    escribio.current = false;
    if (t.trim() === "") return restaurar();
    const n = leerMonto(t);
    if (n == null) {
      setTexto(mostrar(valor));
      return;
    }
    if (n !== valor || !aMano) onCambio(n);
    setTexto(mostrar(n));
  };

  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-body text-sm text-ink-muted"
      >
        $
      </span>
      <input
        ref={registrar}
        type="text"
        inputMode="decimal"
        aria-label={etiqueta}
        aria-describedby={describe}
        value={texto}
        disabled={deshabilitado}
        onFocus={() => {
          alEntrar.current = { valor, aMano };
          escribio.current = false;
          setEnFoco(true);
        }}
        onChange={(e) => {
          const t = e.target.value.replace(/[^\d.,\s$]/g, "").slice(0, 16);
          escribio.current = true;
          setTexto(t);
          cancelarEspera();
          const n = leerMonto(t);
          if (n != null && (n !== valor || !aMano)) {
            espera.current = setTimeout(() => {
              espera.current = null;
              onCambio(n);
            }, 450);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            confirmar(texto);
          } else if (e.key === "Escape") {
            escribio.current = false;
            restaurar();
          }
        }}
        onBlur={() => {
          setEnFoco(false);
          confirmar(texto);
        }}
        className="w-full rounded-xl border border-sand bg-white py-2.5 pl-7 pr-3 text-right font-body text-sm text-ink tabular-nums outline-none transition-colors focus:border-azul focus:ring-2 focus:ring-azul/20 disabled:bg-bone disabled:text-ink-muted"
      />
    </div>
  );
}

export function RepartoDelPresupuesto({
  total,
  prioridades,
  planGuardado,
  personas,
  personasDeLaLista = false,
  contratado,
  isEnglish,
  soloLectura = false,
}: {
  total: number;
  prioridades: ClavePrioridad[];
  planGuardado: PlanReparto;
  /** Los invitados con los que se lee «por persona». null = no se sabe. */
  personas: number | null;
  /** true = `personas` sale de su lista y no de los invitados que imaginan. */
  personasDeLaLista?: boolean;
  /** Lo contratado por categoría (contratadoPorCategoria). */
  contratado: ContratadoPorCategoria;
  isEnglish: boolean;
  /**
   * Prueba vencida (0030): se ve, pero las cifras no se editan. El servidor
   * rechazaría el guardado, y un «No se pudo guardar» con «Reintentar» que
   * nunca va a funcionar es peor que un campo quieto.
   */
  soloLectura?: boolean;
}) {
  const refrescar = useRefrescoDelPanel();
  const router = useRouter();
  // Lo guardado llega UNA vez, al montar. Mientras la pantalla está abierta,
  // lo que hay aquí ES lo guardado (lo acaba de guardar ella misma): tomar lo
  // que regresa el servidor tras refrescar borraba el renglón recién
  // agregado (el servidor descarta uno sin nombre ni cifra), le quitaba el
  // espacio final al nombre a media palabra, y un refresco atrasado podía
  // regresar una cifra vieja. Al volver con Atrás la pantalla se monta de
  // nuevo con lo del servidor, porque refrescar() invalidó el Router Cache.
  const [plan, setPlan] = useState<PlanReparto>(planGuardado);
  const [guardado, setGuardado] = useState<Guardado>("guardado");
  const [mensaje, setMensaje] = useState<string | null>(null);
  // La prueba puede vencer con la pestaña abierta: el servidor contesta 402 y
  // desde ahí la tarjeta se queda quieta, como si hubiera cargado así.
  const [cerrado, setCerrado] = useState(false);
  const bloqueado = soloLectura || cerrado;
  const reparto = useMemo(() => repartir(total, prioridades, plan), [total, prioridades, plan]);

  // ----- Guardado automático, como la barra -----
  const inicial = useRef(plan);
  const ultimo = useRef(plan);
  // true mientras haya un cambio que todavía no llega a la base, incluido uno
  // que el servidor rechazó.
  const sucio = useRef(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enVuelo = useRef<Promise<boolean> | null>(null);
  // Si esta pantalla ya guardó algo: al salir hay que invalidar el Router
  // Cache aunque el refresco con respiro de 300 ms no haya alcanzado a salir.
  const guardoAlgo = useRef(false);

  const guardar = useCallback(async (): Promise<boolean> => {
    if (temporizador.current) {
      clearTimeout(temporizador.current);
      temporizador.current = null;
    }
    setGuardado("guardando");
    // En fila: dos PUT a la vez podrían llegar al revés y el viejo pisaría al nuevo.
    const previo = enVuelo.current;
    const promesa = (async () => {
      if (previo) await previo;
      const aGuardar = ultimo.current;
      try {
        const res = await fetch("/api/panel/reparto", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(aGuardar),
        });
        if (!res.ok) {
          const cuerpo = (await res.json().catch(() => null)) as { error?: string } | null;
          if (res.status === 402) {
            // La prueba venció: no hay reintento que sirva.
            setCerrado(true);
            sucio.current = false;
            setGuardado("guardado");
            return false;
          }
          setMensaje(cuerpo?.error ?? null);
          // 409: ya no hay presupuesto (lo quitaron en otra pestaña). Se
          // refresca el panel y la tarjeta se va con él.
          if (res.status === 409) refrescar();
          setGuardado("error");
          return false;
        }
        setMensaje(null);
        guardoAlgo.current = true;
        if (ultimo.current === aGuardar) {
          sucio.current = false;
          setGuardado("guardado");
        } else {
          setGuardado("pendiente");
        }
        // Atrás restaura el panel del Router Cache sin volver a pedirlo: sin
        // esto, volver a «Dinero» enseñaba el reparto de la primera carga y el
        // siguiente cambio pisaba lo guardado (ver useRefrescoDelPanel).
        refrescar();
        return true;
      } catch {
        setMensaje(null);
        setGuardado("error");
        return false;
      }
    })();
    enVuelo.current = promesa;
    return promesa;
  }, [refrescar]);

  useEffect(() => {
    ultimo.current = plan;
    if (plan === inicial.current || bloqueado) return;
    sucio.current = true;
    setGuardado("pendiente");
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => void guardar(), 800);
  }, [plan, guardar, bloqueado]);

  // Salir a otra pantalla del panel con algo sin guardar (en espera, o que
  // el servidor rechazó): se manda al salir, EN FILA detrás del guardado que
  // vaya en camino (dos PUT a la vez podrían llegar al revés), y luego se
  // invalida el Router Cache para que Atrás no enseñe lo de antes.
  const bloqueadoRef = useRef(bloqueado);
  bloqueadoRef.current = bloqueado;
  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
      const pendiente = sucio.current && !bloqueadoRef.current;
      if (!pendiente) {
        if (guardoAlgo.current) setTimeout(() => router.refresh(), 0);
        return;
      }
      const aGuardar = ultimo.current;
      void (enVuelo.current ?? Promise.resolve(true))
        .then(() =>
          fetch("/api/panel/reparto", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(aGuardar),
            keepalive: true,
          })
        )
        .catch(() => {})
        .finally(() => router.refresh());
    },
    [router]
  );

  // Cerrar la pestaña con algo sin guardar pide confirmación, también si el
  // servidor lo rechazó (antes el aviso se quitaba justo en ese momento).
  useEffect(() => {
    if (guardado === "guardado" || bloqueado) return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [guardado, bloqueado]);

  // ----- Foco -----
  // Los botones que desaparecen al usarse («Volver a lo sugerido», «Quitar»,
  // «Todo a lo sugerido») dejaban el foco en <body>: el siguiente Tab
  // arrancaba desde arriba de la página.
  const campos = useRef(new Map<string, HTMLInputElement>());
  const botonAgregar = useRef<HTMLButtonElement | null>(null);
  const [nuevo, setNuevo] = useState<string | null>(null);
  const enfocar = (el: () => HTMLElement | null | undefined) => {
    requestAnimationFrame(() => el()?.focus());
  };

  // ----- El anuncio para lector de pantalla -----
  // Uno solo, cuando la pareja deja de mover cifras: si cuadra, si sobra o si
  // se pasan. La lista ya no es una región viva que leía números sueltos con
  // cada tecla.
  const [anuncio, setAnuncio] = useState("");
  const textoCuadre = cuadreEnTexto(reparto, isEnglish);
  const planAnunciado = useRef(plan);
  useEffect(() => {
    if (plan === planAnunciado.current) return;
    planAnunciado.current = plan;
    // Un espacio duro que alterna: una región viva solo habla si su texto
    // cambia, y lo común es que el total siga cuadrando igual.
    const t = setTimeout(() => setAnuncio((a) => textoCuadre + (a.endsWith("\u00a0") ? "" : "\u00a0")), 900);
    return () => clearTimeout(t);
  }, [plan, textoCuadre]);

  const categorias = reparto.renglones.filter((r) => r.clave);
  const agregadas = reparto.renglones.filter((r) => !r.clave);
  const hayFijadas = categorias.some((r) => r.aMano);
  const puedeAgregar = !bloqueado && agregadas.length < AGREGADAS_MAX;

  // Las barras no van de 0 a 100%: la categoría más grande ronda la mitad del
  // presupuesto y las chicas se perderían. Van de 0 al mayor entre 50% y la
  // parte más grande de hoy, igual para todos los renglones, y la leyenda lo
  // dice.
  const escala = Math.max(
    50,
    ...reparto.renglones.map((r) => (reparto.total > 0 ? (r.monto / reparto.total) * 100 : 0))
  );

  const estadoGuardado = bloqueado
    ? isEnglish
      ? "Read-only: changes aren't saved"
      : "Solo lectura: los cambios no se guardan"
    : guardado === "guardado"
      ? isEnglish
        ? "Saved"
        : "Guardado"
      : guardado === "error"
        ? (mensaje ?? (isEnglish ? "Couldn't save" : "No se pudo guardar"))
        : isEnglish
          ? "Saving…"
          : "Guardando…";
  // «Reintentar» se queda montado mientras reintenta (deshabilitado): si
  // desapareciera al tocarlo, el foco caería a <body>.
  const [reintentando, setReintentando] = useState(false);
  const estadoRef = useRef<HTMLParagraphElement | null>(null);
  if (reintentando && guardado !== "guardando" && guardado !== "error") setReintentando(false);
  // Reintentar salió bien y el botón se va: el foco pasa al renglón de estado
  // («Guardado») en vez de caer a <body>.
  const veniaDeReintentar = useRef(false);
  useEffect(() => {
    if (reintentando) veniaDeReintentar.current = true;
    else if (veniaDeReintentar.current && guardado === "guardado") {
      veniaDeReintentar.current = false;
      estadoRef.current?.focus();
    }
  }, [reintentando, guardado]);
  const verReintentar = !bloqueado && (guardado === "error" || (reintentando && guardado === "guardando"));

  const empujadas = prioridadesEnFrase(reparto.prioridadesQueEmpujan, isEnglish);

  return (
    <div className="panel-card @container overflow-hidden">
      <div className="p-6 sm:p-8 @2xl:px-10 @2xl:pt-10">
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
          <div>
            <Eyebrow>{isEnglish ? "The split" : "El reparto"}</Eyebrow>
            <SectionTitle>{isEnglish ? "Where your budget goes" : "A dónde va su presupuesto"}</SectionTitle>
          </div>
          <p
            ref={estadoRef}
            tabIndex={-1}
            role="status"
            className={`max-w-[40ch] pt-1 font-body text-xs outline-none ${guardado === "error" && !bloqueado ? "text-terra-deep" : "text-ink-muted"}`}
          >
            {estadoGuardado}
            {bloqueado ? (
              <Link href="/panel/plan" className={`ml-2 text-azul-deep underline underline-offset-4 hover:text-ink ${TOQUE}`}>
                {isEnglish ? "Choose a plan" : "Elegir plan"}
              </Link>
            ) : verReintentar ? (
              <button
                type="button"
                aria-disabled={guardado === "guardando"}
                onClick={() => {
                  if (guardado === "guardando") return;
                  setReintentando(true);
                  void guardar();
                }}
                className={`ml-2 text-azul-deep underline underline-offset-4 hover:text-ink aria-disabled:cursor-wait aria-disabled:opacity-60 ${TOQUE}`}
              >
                {isEnglish ? "Try again" : "Reintentar"}
              </button>
            ) : null}
          </p>
        </div>

        <p className="mt-4 max-w-[62ch] font-body text-sm leading-relaxed text-ink-muted">
          {isEnglish
            ? "What we suggest sits inside the range Bodas.com.mx recommends for each part of the wedding. "
            : "Lo que sugerimos queda dentro del rango que Bodas.com.mx recomienda para cada parte de la boda. "}
          {empujadas ? (
            <>
              {isEnglish ? "Since you care most about " : "Como lo que más les importa es "}
              <span className="text-ink">{empujadas}</span>
              {isEnglish
                ? ", that goes toward the top of its range (marked with a heart) and the rest stays closer to the bottom. "
                : ", eso va hacia el tope de su rango (lo marcamos con un corazón) y lo demás se queda más cerca del mínimo. "}
            </>
          ) : null}
          {isEnglish
            ? "Change any amount: what you haven't touched adjusts so it still adds up to your budget, inside its range whenever it fits."
            : "Cambien cualquier cifra: lo que no hayan tocado se acomoda para que siga sumando su presupuesto, dentro de su rango mientras quepa."}
        </p>

        {/* Las leyendas, una vez y no en cada renglón. Para lector de pantalla
            sobran: cada barra dice su porcentaje y su rango. */}
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-body text-xs text-ink-muted" aria-hidden="true">
          <p className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-6 rounded-b-[2px] border-x-[1.5px] border-b-[1.5px] border-ink-muted" />
            {isEnglish ? "Recommended range" : "El rango recomendado"}
          </p>
          <p className="flex items-center gap-2">
            <span className="inline-block h-2 w-6 rounded-full bg-azul" />
            {isEnglish ? "Suggested" : "Lo sugerido"}
          </p>
          <p className="flex items-center gap-2">
            <span className="inline-block h-2 w-6 rounded-full bg-navy" />
            {isEnglish ? "Your amount" : "Su cifra"}
          </p>
          <p>
            {isEnglish
              ? `A full bar is ${porciento(escala)} of the budget.`
              : `La barra llena es el ${porciento(escala)} del presupuesto.`}
          </p>
        </div>
        {personas != null ? (
          <p className="mt-2 font-body text-xs text-ink-muted">
            {isEnglish
              ? `“Per guest” counts ${personas} ${personas === 1 ? "guest" : "guests"}${personasDeLaLista ? " from your list" : ", the ones you pictured"}.`
              : `«Por invitado» cuenta ${personas} ${personas === 1 ? "invitado" : "invitados"}${personasDeLaLista ? " de su lista" : ", los que imaginan"}.`}
          </p>
        ) : null}
      </div>

      <ul aria-label={isEnglish ? "Budget split by category" : "Reparto por categoría"} className="border-t border-sand">
        {categorias.map((r) => (
          <Renglon
            key={r.id}
            r={r}
            total={reparto.total}
            personas={personas}
            contratado={contratado.porCategoria.get(r.clave!) ?? 0}
            escala={escala}
            prioridades={prioridades}
            isEnglish={isEnglish}
            soloLectura={bloqueado}
            registrar={(el) => {
              if (el) campos.current.set(r.id, el);
              else campos.current.delete(r.id);
            }}
            onMonto={(n) => setPlan((p) => fijar(p, r.id, n))}
            onRestaurar={(estabaFijada, cifra) =>
              setPlan((p) => (estabaFijada ? fijar(p, r.id, cifra) : soltar(p, r.clave!)))
            }
            onSoltar={() => {
              setPlan((p) => soltar(p, r.clave!));
              enfocar(() => campos.current.get(r.id));
            }}
          />
        ))}
        {agregadas.map((r) => (
          <Renglon
            key={r.id}
            r={r}
            total={reparto.total}
            personas={null}
            contratado={0}
            escala={escala}
            prioridades={prioridades}
            isEnglish={isEnglish}
            soloLectura={bloqueado}
            enfocarNombre={nuevo === r.id}
            registrar={(el) => {
              if (el) campos.current.set(r.id, el);
              else campos.current.delete(r.id);
            }}
            onMonto={(n) => setPlan((p) => fijar(p, r.id, n))}
            onRestaurar={(_, cifra) => setPlan((p) => fijar(p, r.id, cifra))}
            onNombre={(t) => setPlan((p) => renombrar(p, r.id, t))}
            onQuitar={() => {
              setPlan((p) => quitar(p, r.id));
              enfocar(() => botonAgregar.current);
            }}
          />
        ))}
      </ul>

      <div className="border-t border-sand px-6 py-5 sm:px-8 @2xl:px-10">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            {puedeAgregar ? (
              <button
                ref={botonAgregar}
                type="button"
                onClick={() => {
                  const id = idNuevo();
                  setNuevo(id);
                  setPlan((p) => agregar(p, id));
                }}
                className="inline-flex min-h-[2.75rem] items-center gap-1.5 font-body text-sm font-medium text-azul-deep underline-offset-4 hover:text-ink hover:underline"
              >
                <Plus className="h-4 w-4" strokeWidth={1.8} />
                {isEnglish ? "Add something else" : "Agregar algo más"}
              </button>
            ) : null}
            {hayFijadas && !bloqueado ? (
              <button
                type="button"
                onClick={() => {
                  setPlan((p) => soltarTodas(p));
                  enfocar(() => botonAgregar.current ?? campos.current.values().next().value);
                }}
                className="inline-flex min-h-[2.75rem] items-center gap-1.5 font-body text-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline"
              >
                <RotateCcw className="h-4 w-4" strokeWidth={1.6} />
                {isEnglish ? "Everything back to the suggestion" : "Todo a lo sugerido"}
              </button>
            ) : null}
          </div>

          <Cuadre reparto={reparto} isEnglish={isEnglish} />
        </div>
        {puedeAgregar ? (
          <p className="mt-1 max-w-[62ch] font-body text-xs leading-relaxed text-ink-muted">
            {isEnglish
              ? "Rings and transport, which the guide leaves without a percentage, or the honeymoon: add them here if you'll pay for them."
              : "Anillos y transporte, que la guía deja sin porcentaje, o la luna de miel: agréguenlos aquí si los van a pagar."}
          </p>
        ) : null}
        <p className="sr-only" role="status" aria-live="polite">
          {anuncio}
        </p>

        {contratado.sinCategoria.length > 0 ? (
          <p className="mt-4 font-body text-xs leading-relaxed text-ink-muted">
            {isEnglish ? "Also contracted, outside these categories: " : "También contratado, fuera de estas categorías: "}
            {contratado.sinCategoria.map((x, i) => (
              <span key={x.llave}>
                {i > 0 ? ", " : ""}
                {x.generico && isEnglish ? "Other" : x.rotulo} <span className="tabular-nums">{pesos(x.monto)}</span>
              </span>
            ))}
            .
          </p>
        ) : null}

        <div className="mt-5 space-y-1 font-body text-[11px] leading-relaxed text-ink-muted">
          <p>
            {isEnglish ? "Ranges: " : "Los rangos: "}
            <a href={FUENTES.reparto.url} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-ink">
              {isEnglish ? FUENTES.reparto.en : FUENTES.reparto.es}
            </a>
            {isEnglish ? "; ceremony and unexpected costs: " : "; ceremonia e imprevistos: "}
            <a
              href={FUENTES.presupuestador.url}
              target="_blank"
              rel="noopener"
              className="underline underline-offset-2 hover:text-ink"
            >
              {isEnglish ? FUENTES.presupuestador.en : FUENTES.presupuestador.es}
            </a>
            {isEnglish
              ? `. Checked on ${fechaLarga(FUENTES_CONSULTADAS, true)}.`
              : `. Consultados el ${fechaLarga(FUENTES_CONSULTADAS, false)}.`}
          </p>
          <p>
            {isEnglish
              ? "They're Bodas.com.mx's recommendations, not an average of what couples spend. Where each amount lands inside its range is our calculator's rule, the one described above."
              : "Son recomendaciones de Bodas.com.mx, no un promedio de lo que gastan las parejas. En qué punto de su rango queda cada cifra es la regla de nuestra calculadora, la que se cuenta arriba."}
          </p>
        </div>
      </div>
    </div>
  );
}

/** El renglón del total en palabras, para el anuncio del lector de pantalla. */
function cuadreEnTexto(reparto: Reparto, isEnglish: boolean): string {
  if (reparto.excedido > 0) {
    return isEnglish
      ? `What you set goes over your budget by ${pesos(reparto.excedido)}.`
      : `Lo que fijaron se pasa del presupuesto por ${pesos(reparto.excedido)}.`;
  }
  if (reparto.sinRepartir > 0) {
    return isEnglish
      ? `Left unassigned: ${pesos(reparto.sinRepartir)}.`
      : `Les quedan sin repartir ${pesos(reparto.sinRepartir)}.`;
  }
  return isEnglish ? `All of it, split: ${pesos(reparto.total)}.` : `Repartido completo: ${pesos(reparto.total)}.`;
}

/** El renglón del total: si cuadra, si sobra o si se pasan. */
function Cuadre({ reparto, isEnglish }: { reparto: Reparto; isEnglish: boolean }) {
  if (reparto.excedido > 0) {
    return (
      <p className="max-w-[46ch] font-body text-sm text-terra-deep">
        {isEnglish ? (
          <>
            What you set goes over your budget by <strong className="tabular-nums">{pesos(reparto.excedido)}</strong>.
            Lower an amount or raise the budget in{" "}
            <Link href="/panel/boda" className={`underline underline-offset-2 ${TOQUE}`}>
              Your wedding
            </Link>
            .
          </>
        ) : (
          <>
            Lo que fijaron se pasa del presupuesto por <strong className="tabular-nums">{pesos(reparto.excedido)}</strong>.
            Bajen alguna cifra o suban el presupuesto en{" "}
            <Link href="/panel/boda" className={`underline underline-offset-2 ${TOQUE}`}>
              Su boda
            </Link>
            .
          </>
        )}
      </p>
    );
  }
  if (reparto.sinRepartir > 0) {
    return (
      <p className="font-body text-sm text-ink">
        {isEnglish ? "Left unassigned: " : "Les quedan sin repartir "}
        <strong className="tabular-nums">{pesos(reparto.sinRepartir)}</strong>
      </p>
    );
  }
  return (
    <p className="font-body text-sm text-ink-muted">
      {isEnglish ? "All of it, split: " : "Repartido completo: "}
      <span className="font-medium text-ink tabular-nums">{pesos(reparto.total)}</span>
    </p>
  );
}

/**
 * Un renglón del reparto. Con la tarjeta angosta (teléfono, o tableta con el
 * menú lateral) va en dos columnas: nombre y cifra arriba, y debajo, a todo lo
 * ancho, lo que se sabe, la barra y su porcentaje. Con la tarjeta ancha, en
 * cuatro: nombre, barra, porcentaje y cifra.
 *
 * El cambio lo decide el ANCHO DE LA TARJETA (@container), no el de la
 * pantalla: a 768 px el menú lateral se lleva 257 px, y con cuatro columnas el
 * nombre quedaba en 48 px.
 *
 * En el DOM la cifra va justo después del nombre, para que Tab siga el orden
 * en que se ve.
 */
function Renglon({
  r,
  total,
  personas,
  contratado,
  escala,
  prioridades,
  isEnglish,
  soloLectura,
  enfocarNombre = false,
  registrar,
  onMonto,
  onRestaurar,
  onSoltar,
  onNombre,
  onQuitar,
}: {
  r: RenglonDelReparto;
  total: number;
  personas: number | null;
  contratado: number;
  /** El porcentaje que ocupa la barra entera (ver `escala` arriba). */
  escala: number;
  prioridades: ClavePrioridad[];
  isEnglish: boolean;
  soloLectura: boolean;
  /** Recién agregado: el foco va a su nombre. */
  enfocarNombre?: boolean;
  registrar: (el: HTMLInputElement | null) => void;
  onMonto: (n: number) => void;
  onRestaurar: (estabaFijada: boolean, cifra: number) => void;
  onSoltar?: () => void;
  onNombre?: (t: string) => void;
  onQuitar?: () => void;
}) {
  const idMeta = useId();
  const nombreRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (enfocarNombre) nombreRef.current?.focus();
  }, [enfocarNombre]);

  const c = r.clave ? categoriaDe(r.clave) : undefined;
  const nombre = c ? (isEnglish ? c.en : c.es) : r.nombre;
  const parte = total > 0 ? (r.monto / total) * 100 : 0;
  const enBarra = (pct: number) => Math.min(100, Math.max(0, (pct / escala) * 100));
  const porPersona = c?.porPersona && personas != null && personas > 0 ? r.monto / personas : null;
  // El precio de mercado solo se enseña cuando no alcanza: si alcanza, es ruido.
  const referencia =
    c?.referenciaPorPersona && porPersona != null && porPersona < c.referenciaPorPersona.monto
      ? c.referenciaPorPersona
      : null;
  const [min, max] = c?.rango ?? [0, 0];
  const rangoTexto = c ? (min === max ? porciento(min) : `${porciento(min)}–${porciento(max)}`) : null;
  const seLeEmpuja = c ? c.empujan.filter((p) => prioridades.includes(p)) : [];
  const excedeContrato = contratado > r.monto;
  const etiqueta = isEnglish ? `Amount for ${nombre || "this item"}` : `Cifra para ${nombre || "esto"}`;
  const parteTexto = rangoTexto
    ? isEnglish
      ? `${porciento(parte)} · recommended ${rangoTexto}`
      : `${porciento(parte)} · se recomienda ${rangoTexto}`
    : isEnglish
      ? `${porciento(parte)} of the budget`
      : `${porciento(parte)} del presupuesto`;

  const hayMeta = porPersona != null || contratado !== 0 || Boolean(c && r.aMano) || Boolean(c?.enlace);

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-x-4 gap-y-2 border-b border-sand-soft px-6 py-4 last:border-b-0 sm:px-8 @2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_4.5rem_9.5rem] @2xl:gap-y-1 @2xl:px-10">
      {/* 1. El nombre (y lo que incluye) */}
      <div className="col-start-1 row-start-1 min-w-0 self-center">
        {c ? (
          <>
            <p className="flex items-center gap-1.5 font-body text-[15px] font-medium text-ink">
              {nombre}
              {r.empujada ? (
                <>
                  <Heart aria-hidden="true" className="h-3.5 w-3.5 shrink-0 fill-azul text-azul" strokeWidth={1.6} />
                  <span className="sr-only">
                    {isEnglish
                      ? ` (toward the top of its range, because of ${prioridadesEnFrase(seLeEmpuja, true)})`
                      : ` (hacia el tope de su rango, por ${prioridadesEnFrase(seLeEmpuja, false)})`}
                  </span>
                </>
              ) : null}
            </p>
            {c.incluye ? (
              <p className="font-body text-xs text-ink-muted">{isEnglish ? c.incluye.en : c.incluye.es}</p>
            ) : null}
          </>
        ) : (
          <div className="flex items-center gap-1">
            <input
              ref={nombreRef}
              type="text"
              value={r.nombre}
              maxLength={NOMBRE_MAX}
              disabled={soloLectura}
              onChange={(e) => onNombre?.(e.target.value)}
              placeholder={isEnglish ? "What is it?" : "¿Qué es?"}
              aria-label={isEnglish ? "What it is" : "Qué es"}
              className="w-full min-w-0 border-b border-sand bg-transparent pb-1 font-body text-[15px] font-medium text-ink outline-none placeholder:font-normal placeholder:text-ink-muted focus:border-azul disabled:text-ink-muted"
            />
            {!soloLectura ? (
              <button
                type="button"
                onClick={onQuitar}
                aria-label={isEnglish ? `Remove ${r.nombre || "this row"}` : `Quitar ${r.nombre || "este renglón"}`}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-bone hover:text-terra-deep"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.6} />
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* 2. La cifra, justo después del nombre en el DOM */}
      <div className={`col-start-2 row-start-1 self-center @2xl:col-start-4 @2xl:row-start-1 ${hayMeta ? "@2xl:row-span-2" : ""}`}>
        <CampoMonto
          valor={r.monto}
          aMano={r.aMano}
          onCambio={onMonto}
          onRestaurar={onRestaurar}
          etiqueta={etiqueta}
          describe={hayMeta ? idMeta : undefined}
          deshabilitado={soloLectura}
          registrar={registrar}
        />
      </div>

      {/* 3. Lo que se sabe: por invitado, lo contratado, si es su cifra */}
      {hayMeta ? (
        <div
          id={idMeta}
          className="col-span-2 row-start-2 flex flex-wrap gap-x-4 gap-y-1 font-body text-xs leading-relaxed text-ink-muted @2xl:col-span-1 @2xl:col-start-1"
        >
          {porPersona != null ? (
            <span className="tabular-nums">
              {isEnglish ? `≈ ${pesos(porPersona)} per guest` : `≈ ${pesos(porPersona)} por invitado`}
            </span>
          ) : null}
          {contratado !== 0 ? (
            <span className={excedeContrato ? "text-terra-deep" : undefined}>
              {isEnglish ? "Contracted " : "Contratado "}
              <span className="tabular-nums">{pesos(contratado)}</span>
              {excedeContrato
                ? isEnglish
                  ? ` — ${pesos(contratado - r.monto)} over`
                  : ` — se pasa por ${pesos(contratado - r.monto)}`
                : null}
            </span>
          ) : null}
          {c && r.aMano ? (
            <span>
              {r.monto === 0
                ? isEnglish
                  ? "You don't need it"
                  : "No lo necesitan"
                : isEnglish
                  ? "Your amount"
                  : "Su cifra"}
            </span>
          ) : null}
          {c && r.aMano && !soloLectura ? (
            <button
              type="button"
              onClick={onSoltar}
              className={`text-left text-azul-deep underline-offset-2 hover:text-ink hover:underline ${TOQUE}`}
            >
              {isEnglish ? "Back to the suggestion" : "Volver a lo sugerido"}
            </button>
          ) : null}
          {c?.enlace ? (
            <Link
              href={c.enlace.href}
              className={`text-azul-deep underline-offset-2 hover:text-ink hover:underline ${TOQUE}`}
            >
              {isEnglish ? c.enlace.en : c.enlace.es}
            </Link>
          ) : null}
        </div>
      ) : null}

      {/* 4. La barra: su parte del presupuesto, con el rango recomendado como
          corchete debajo (no detrás: detrás, la barra lo tapaba justo cuando
          caía dentro). */}
      <div
        className={`col-span-2 ${hayMeta ? "row-start-3 @2xl:row-span-2" : "row-start-2"} @2xl:col-span-1 @2xl:col-start-2 @2xl:row-start-1 @2xl:self-center`}
      >
        <div
          className="relative mb-2 h-2.5 w-full rounded-full bg-sand-soft"
          role="img"
          aria-label={
            rangoTexto
              ? isEnglish
                ? `${porciento(parte)} of the budget; recommended ${rangoTexto}`
                : `${porciento(parte)} del presupuesto; se recomienda ${rangoTexto}`
              : isEnglish
                ? `${porciento(parte)} of the budget`
                : `${porciento(parte)} del presupuesto`
          }
        >
          <span
            aria-hidden="true"
            className={`absolute inset-y-0 left-0 rounded-full ${r.aMano ? "bg-navy" : "bg-azul"}`}
            style={{ width: `${enBarra(parte)}%` }}
          />
          {c ? (
            max > min ? (
              <span
                aria-hidden="true"
                className="absolute top-full mt-0.5 h-1.5 rounded-b-[2px] border-x-[1.5px] border-b-[1.5px] border-ink-muted"
                style={{ left: `${enBarra(min)}%`, width: `${enBarra(max) - enBarra(min)}%` }}
              />
            ) : (
              // Un rango de una sola cifra (ceremonia, imprevistos) es una marca.
              <span
                aria-hidden="true"
                className="absolute top-full mt-0.5 h-1.5 w-[1.5px] bg-ink-muted"
                style={{ left: `${enBarra(min)}%` }}
              />
            )
          ) : null}
        </div>
        <p aria-hidden="true" className="font-body text-[11px] text-ink-muted tabular-nums @2xl:hidden">
          {parteTexto}
        </p>
      </div>

      {/* 5. El porcentaje, solo con la tarjeta ancha (en angosta va bajo la barra) */}
      <div
        aria-hidden="true"
        className={`hidden text-right @2xl:col-start-3 @2xl:row-start-1 @2xl:block @2xl:self-center ${hayMeta ? "@2xl:row-span-2" : ""}`}
      >
        <p className="font-body text-xs text-ink tabular-nums">{porciento(parte)}</p>
        {rangoTexto ? <p className="font-body text-[11px] text-ink-muted tabular-nums">{rangoTexto}</p> : null}
      </div>

      {/* 6. A todo lo ancho del renglón: en la columna del nombre quedaba en
          siete renglones angostos. Es una referencia y no una alerta: la
          cifra es de la Ciudad de México y la boda puede ser en otra parte. */}
      {referencia ? (
        <p
          className={`col-span-2 ${hayMeta ? "row-start-4" : "row-start-3"} max-w-[70ch] font-body text-xs leading-relaxed text-ink-muted @2xl:col-span-4 @2xl:row-start-3`}
        >
          {isEnglish
            ? "For reference: in Mexico City the wedding menu alone averages "
            : "Como referencia: en la Ciudad de México, solo el menú del banquete anda en "}
          <a
            href={FUENTES[referencia.fuente].url}
            target="_blank"
            rel="noopener"
            className={`underline underline-offset-2 hover:text-ink ${TOQUE}`}
          >
            {isEnglish ? `${pesos(referencia.monto)} per person` : `${pesos(referencia.monto)} por persona`}
          </a>
          {isEnglish
            ? ` (Bodas.com.mx average, checked on ${fechaLarga(FUENTES_CONSULTADAS, true)}), and the venue and drinks come out of this row too.`
            : ` (precio medio en Bodas.com.mx, consultado el ${fechaLarga(FUENTES_CONSULTADAS, false)}), y de este renglón también salen el lugar y la bebida.`}
        </p>
      ) : null}
    </li>
  );
}
