"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { ArrowLeft, Download, Minus, Plus, RotateCw, Search, Trash2, X } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { Eyebrow } from "@/components/panel/sections";
import { Titular } from "@/components/marca/Titular";
import { descargarArchivo } from "@/components/panel/descargarArchivo";
import { useRefrescoDelPanel } from "@/components/panel/useRefrescoDelPanel";
import { PlanoDelSalon, type Seleccion } from "@/components/panel/mesas/PlanoDelSalon";
import { parseJsonSafe } from "@/lib/http";
import type { DatosDelSalon } from "@/lib/salon";
import {
  ELEMENTOS,
  ELEMENTOS_MAX,
  FORMAS,
  LUGARES_INICIALES,
  LUGARES_MAX,
  MESAS_DE_UN_JALON,
  SALON_MAX,
  SALON_MIN,
  TIPOS_DE_ELEMENTO,
  colocarFaltantes,
  nombreDeMesa,
  normalizarGiro,
  personasEsperadas,
  planoInicial,
  redondear,
  soloMesasVivas,
  sumarAcomodo,
  type AsientoDelSalon,
  type FormaMesa,
  type GrupoDelSalon,
  type MesaDelSalon,
  type Plano,
  type TipoElemento,
} from "@/lib/plano";

type Guardado = "guardado" | "pendiente" | "guardando" | "error";

/**
 * Alguien que falta por sentar. Dos clases:
 *   - un GRUPO de la lista de invitados al que le faltan personas por sentar
 *     (clave "grupo:<membership>"),
 *   - una FILA del acomodo que está capturada pero sin mesa, casi siempre de
 *     la planner o de alguien a quien quitaron de una mesa ("fila:<id>").
 */
type PorSentar = {
  clave: string;
  nombre: string;
  personas: number;
  /** Sin contestar todavía: se aparta su lugar, pero puede que no venga. */
  sinContestar: boolean;
  dieta: string | null;
};

const FORMA_TEXTO: Record<FormaMesa, { es: string; en: string }> = {
  redonda: { es: "Redonda", en: "Round" },
  rectangular: { es: "Rectangular", en: "Banquet" },
  cuadrada: { es: "Cuadrada", en: "Square" },
};

const chipBase =
  "inline-flex min-h-[2.25rem] items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-[background-color,border-color,color,scale] duration-150 active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 disabled:opacity-50 disabled:active:scale-100";

const chip = `${chipBase} border-linea-control/60 bg-niebla text-noche hover:border-linea-control hover:bg-papel-medio disabled:hover:bg-niebla`;

/** El chip que está puesto: se hunde en papel azul con borde azul noche. */
const chipActivo = `${chipBase} border-noche bg-papel text-noche`;

const chipPeligro = `${chipBase} border-linea-control/60 bg-niebla text-noche hover:border-error hover:bg-error-fondo hover:text-error`;

const botonPrincipal =
  "inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-full bg-noche px-5 py-2 text-sm font-medium text-niebla transition-[background-color,scale] duration-150 hover:bg-noche-suave active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 disabled:opacity-60 disabled:hover:bg-noche disabled:active:scale-100";

const botonIcono =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-linea-control/60 bg-niebla text-noche transition-[background-color,border-color] duration-150 hover:border-linea-control hover:bg-papel-medio disabled:opacity-40 disabled:hover:bg-niebla";

const campo =
  "w-full rounded-xl border border-linea-control/70 bg-papel px-3 py-2 text-sm text-noche outline-none transition-[border-color,box-shadow] duration-150 focus:border-noche focus:ring-2 focus:ring-noche/20 disabled:opacity-60";

const rotuloCampo = "block text-[11px] font-medium uppercase tracking-[0.1em] text-tinta";

function porNombre(a: string, b: string): number {
  return a.localeCompare(b, "es", { sensitivity: "base" });
}

/** "12.5" o "12,5" metros a centímetros; null si no es un número. */
function aCentimetros(texto: string): number | null {
  const n = Number(texto.replace(",", ".").trim());
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

function enMetros(cm: number): string {
  return String(Math.round(cm) / 100);
}

export function PantallaMesas({
  salon,
  conPlanner,
  soloLectura,
}: {
  /** null = el acomodo no está disponible (falta la 0011 o la lectura falló). */
  salon: DatosDelSalon | null;
  conPlanner: boolean;
  soloLectura: boolean;
}) {
  const { isEnglish } = useLanguage();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <Reveal app>
        <header>
          <Link
            href="/panel/invitados"
            className="mb-4 inline-flex min-h-[2.75rem] items-center gap-1.5 text-sm text-noche underline decoration-linea-control underline-offset-4 transition-[text-decoration-color] duration-150 hover:decoration-noche"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.6} />
            {isEnglish ? "Guests" : "Invitados"}
          </Link>
          <Eyebrow>{isEnglish ? "Seating" : "Acomodo"}</Eyebrow>
          <Titular as="h1" tamano="pantalla" alinear="inicio" className="mt-3">
            {isEnglish ? "Your seating plan" : "Su plano de mesas"}
          </Titular>
          <p className="mt-4 max-w-[64ch] text-sm leading-relaxed text-tinta">
            {isEnglish
              ? "Draw your venue, put each table where it goes and seat your guests. Drag each group onto its table, or pick one and tap the table."
              : "Dibujen su salón, pongan cada mesa donde va y sienten a sus invitados. Arrastren a cada grupo a su mesa, o elíjanlo y toquen la mesa."}
            {conPlanner
              ? isEnglish
                ? " Your planner sees this same seating."
                : " Su planner ve este mismo acomodo."
              : ""}
          </p>
        </header>
      </Reveal>

      {salon ? (
        <Salon salon={salon} soloLectura={soloLectura} isEnglish={isEnglish} />
      ) : (
        <Reveal app className="mt-10">
          <div className="panel-card p-6 sm:p-8">
            <p className="text-sm leading-relaxed text-tinta">
              {isEnglish
                ? "The seating plan isn't available right now. Your guest list is safe; try again in a moment."
                : "El plano de mesas no está disponible por ahora. Su lista de invitados está a salvo; inténtenlo en un momento."}
            </p>
          </div>
        </Reveal>
      )}
    </div>
  );
}

function Salon({
  salon,
  soloLectura,
  isEnglish,
}: {
  salon: DatosDelSalon;
  soloLectura: boolean;
  isEnglish: boolean;
}) {
  const refrescar = useRefrescoDelPanel();
  const grupos = salon.grupos;

  const [mesas, setMesas] = useState<MesaDelSalon[]>(salon.mesas);
  const [asientos, setAsientos] = useState<AsientoDelSalon[]>(salon.asientos);
  const [plano, setPlano] = useState<Plano>(() => {
    const { porMesa } = sumarAcomodo(salon.asientos);
    return colocarFaltantes(
      salon.plano ?? planoInicial(salon.mesas.length),
      salon.mesas.map((m) => ({ id: m.id, capacity: m.capacity, pax: porMesa.get(m.id) ?? 0 }))
    );
  });
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null);
  /** La clave de quien se eligió para sentar con un toque en una mesa. */
  const [elegido, setElegido] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [trabajando, setTrabajando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const { porMesa, porGrupo } = useMemo(() => sumarAcomodo(asientos), [asientos]);

  // ----- Guardado automático del dibujo -----
  // Igual que la barra: 800 ms después del último cambio se manda el plano
  // entero, en fila, para que un PUT viejo nunca pise a uno nuevo.
  const guardable = salon.planoGuardable && !soloLectura;
  const [guardado, setGuardado] = useState<Guardado>("guardado");
  const inicial = useRef(plano);
  const ultimo = useRef(plano);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enVuelo = useRef<Promise<boolean> | null>(null);

  const guardarPlano = useCallback(async (): Promise<boolean> => {
    if (temporizador.current) {
      clearTimeout(temporizador.current);
      temporizador.current = null;
    }
    setGuardado("guardando");
    const previo = enVuelo.current;
    const promesa = (async () => {
      if (previo) await previo;
      const aGuardar = ultimo.current;
      try {
        const res = await fetch("/api/panel/mesas/plano", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(aGuardar),
        });
        if (!res.ok) throw new Error();
        setGuardado(ultimo.current === aGuardar ? "guardado" : "pendiente");
        return true;
      } catch {
        setGuardado("error");
        return false;
      }
    })();
    enVuelo.current = promesa;
    return promesa;
  }, []);

  useEffect(() => {
    ultimo.current = plano;
    if (plano === inicial.current || !guardable) return;
    setGuardado("pendiente");
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => void guardarPlano(), 800);
  }, [plano, guardarPlano, guardable]);

  useEffect(() => {
    if (guardado !== "pendiente" && guardado !== "guardando") return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [guardado]);

  // Escape suelta lo elegido: primero a quien se iba a sentar, luego la mesa.
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (elegido) setElegido(null);
      else setSeleccion(null);
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [elegido]);

  // ----- Quién falta por sentar -----
  const porSentar = useMemo<PorSentar[]>(() => {
    const deGrupos: PorSentar[] = [];
    for (const g of grupos) {
      const faltan = personasEsperadas(g) - (porGrupo.get(g.membershipId) ?? 0);
      if (faltan <= 0) continue;
      deGrupos.push({
        clave: `grupo:${g.membershipId}`,
        nombre: g.nombre || (isEnglish ? "Guest" : "Invitado"),
        personas: faltan,
        sinContestar: g.confirmation !== "confirmed",
        dieta: g.dieta,
      });
    }
    const sinMesa: PorSentar[] = asientos
      .filter((a) => a.tableId == null && a.pax > 0)
      .map((a) => ({ clave: `fila:${a.id}`, nombre: a.nombre, personas: a.pax, sinContestar: false, dieta: null }));
    // Primero quienes ya dijeron que sí; los que no contestan, al final.
    return [...deGrupos, ...sinMesa].sort(
      (a, b) => Number(a.sinContestar) - Number(b.sinContestar) || porNombre(a.nombre, b.nombre)
    );
  }, [grupos, asientos, porGrupo, isEnglish]);

  const buscado = busqueda.trim().toLowerCase();
  const visibles = buscado
    ? porSentar.filter((p) =>
        p.nombre
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .toLowerCase()
          .includes(buscado.normalize("NFD").replace(/[̀-ͯ]/g, ""))
      )
    : porSentar;

  // ----- Números -----
  const idsDeMesas = useMemo(() => new Set(mesas.map((m) => m.id)), [mesas]);
  const lugares = mesas.reduce((s, m) => s + (m.capacity ?? 0), 0);
  const sentadas = asientos.reduce((s, a) => s + (a.tableId && idsDeMesas.has(a.tableId) ? a.pax : 0), 0);
  const faltanPersonas = porSentar.reduce((s, p) => s + p.personas, 0);
  const enSobrecupo = mesas.filter((m) => m.capacity != null && (porMesa.get(m.id) ?? 0) > m.capacity).length;
  const esperadasEnTotal =
    grupos.reduce((s, g) => s + personasEsperadas(g), 0) +
    asientos.filter((a) => !a.membershipId).reduce((s, a) => s + a.pax, 0);

  // ----- Pedidos a la API -----
  const pedir = useCallback(
    async <T,>(url: string, method: string, body: unknown): Promise<T> => {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const { data } = await parseJsonSafe<T & { error?: string }>(res);
      if (!res.ok || !data) {
        throw new Error(
          data?.error ?? (isEnglish ? "Something went wrong. Please try again." : "Algo falló. Inténtenlo otra vez.")
        );
      }
      return data;
    },
    [isEnglish]
  );

  /** Corre un pedido a la API. false = falló, y el aviso ya salió bajo el plano. */
  const hacer = useCallback(
    async (trabajo: () => Promise<void>): Promise<boolean> => {
      setTrabajando(true);
      setAviso(null);
      try {
        await trabajo();
        refrescar();
        return true;
      } catch (err) {
        setAviso(err instanceof Error ? err.message : null);
        return false;
      } finally {
        setTrabajando(false);
      }
    },
    [refrescar]
  );

  function ponerMesas(nuevas: MesaDelSalon[], forma: FormaMesa) {
    const todas = [...mesas, ...nuevas];
    setMesas(todas);
    setPlano((p) =>
      colocarFaltantes(
        // Las primeras mesas en un salón que nadie ha tocado: el salón de
        // arranque se mide para ellas, en vez de alargar uno de 20 x 15.
        mesas.length === 0 && !salon.plano && p === inicial.current ? planoInicial(todas.length) : p,
        todas.map((m) => ({ id: m.id, capacity: m.capacity, pax: porMesa.get(m.id) ?? 0 })),
        forma
      )
    );
  }

  const agregarMesa = (forma: FormaMesa) =>
    hacer(async () => {
      const { mesas: nuevas } = await pedir<{ mesas: MesaDelSalon[] }>("/api/panel/mesas", "POST", {
        lugares: forma === "cuadrada" ? 8 : LUGARES_INICIALES,
      });
      ponerMesas(nuevas, forma);
      if (nuevas[0]) setSeleccion({ tipo: "mesa", id: nuevas[0].id });
    });

  const ponerVarias = (cantidad: number, lugaresPorMesa: number) =>
    hacer(async () => {
      const { mesas: nuevas } = await pedir<{ mesas: MesaDelSalon[] }>("/api/panel/mesas", "POST", {
        cantidad,
        lugares: lugaresPorMesa,
      });
      ponerMesas(nuevas, "redonda");
    });

  const cambiarMesa = (id: string, cambio: { label?: string; lugares?: number }) =>
    hacer(async () => {
      const { mesa } = await pedir<{ mesa: MesaDelSalon }>("/api/panel/mesas", "PATCH", { id, ...cambio });
      setMesas((ms) => ms.map((m) => (m.id === id ? mesa : m)));
    });

  const borrarMesa = (id: string) =>
    hacer(async () => {
      await pedir<{ ok: true }>("/api/panel/mesas", "DELETE", { id });
      const quedan = mesas.filter((m) => m.id !== id);
      setMesas(quedan);
      // La base deja a quien estaba sentado sin mesa (ON DELETE SET NULL).
      setAsientos((as) => as.map((a) => (a.tableId === id ? { ...a, tableId: null } : a)));
      setPlano((p) => soloMesasVivas(p, quedan.map((m) => m.id)));
      setSeleccion(null);
    });

  const sentar = (clave: string, tableId: string) =>
    hacer(async () => {
      if (clave.startsWith("grupo:")) {
        const { asiento } = await pedir<{ asiento: AsientoDelSalon }>("/api/panel/mesas/asientos", "POST", {
          membershipId: clave.slice("grupo:".length),
          tableId,
        });
        setAsientos((as) => [...as, asiento]);
      } else if (clave.startsWith("fila:")) {
        const id = clave.slice("fila:".length);
        const { asiento } = await pedir<{ asiento: AsientoDelSalon }>("/api/panel/mesas/asientos", "PATCH", {
          id,
          tableId,
        });
        setAsientos((as) => as.map((a) => (a.id === id ? asiento : a)));
      }
      setElegido(null);
    });

  const cambiarAsiento = (id: string, cambio: { tableId?: null; pax?: number }) =>
    hacer(async () => {
      const { asiento } = await pedir<{ asiento: AsientoDelSalon }>("/api/panel/mesas/asientos", "PATCH", {
        id,
        ...cambio,
      });
      setAsientos((as) => as.map((a) => (a.id === id ? asiento : a)));
    });

  // ----- El dibujo (local; se guarda solo) -----
  const mover = (cosa: Seleccion, x: number, y: number) =>
    setPlano((p) =>
      cosa.tipo === "mesa"
        ? p.mesas[cosa.id]
          ? { ...p, mesas: { ...p.mesas, [cosa.id]: { ...p.mesas[cosa.id], x, y } } }
          : p
        : { ...p, elementos: p.elementos.map((e) => (e.id === cosa.id ? { ...e, x, y } : e)) }
    );

  const empujar = (cosa: Seleccion, dx: number, dy: number) =>
    setPlano((p) => {
      const dentro = (x: number, y: number) => ({
        x: Math.min(p.ancho, Math.max(0, x + dx)),
        y: Math.min(p.largo, Math.max(0, y + dy)),
      });
      if (cosa.tipo === "mesa") {
        const m = p.mesas[cosa.id];
        return m ? { ...p, mesas: { ...p.mesas, [cosa.id]: { ...m, ...dentro(m.x, m.y) } } } : p;
      }
      return { ...p, elementos: p.elementos.map((e) => (e.id === cosa.id ? { ...e, ...dentro(e.x, e.y) } : e)) };
    });

  const girar = (cosa: Seleccion) =>
    setPlano((p) =>
      cosa.tipo === "mesa"
        ? p.mesas[cosa.id]
          ? { ...p, mesas: { ...p.mesas, [cosa.id]: { ...p.mesas[cosa.id], giro: normalizarGiro(p.mesas[cosa.id].giro + 45) } } }
          : p
        : { ...p, elementos: p.elementos.map((e) => (e.id === cosa.id ? { ...e, giro: normalizarGiro(e.giro + 45) } : e)) }
    );

  const cambiarForma = (id: string, forma: FormaMesa) =>
    setPlano((p) =>
      p.mesas[id] ? { ...p, mesas: { ...p.mesas, [id]: { ...p.mesas[id], forma, giro: forma === "redonda" ? 0 : p.mesas[id].giro } } } : p
    );

  const agregarElemento = (tipo: TipoElemento) => {
    const base = ELEMENTOS[tipo];
    let n = 1;
    while (plano.elementos.some((e) => e.id === `${tipo}-${n}`)) n += 1;
    const id = `${tipo}-${n}`;
    setPlano((p) => ({
      ...p,
      elementos: [
        ...p.elementos,
        {
          id,
          tipo,
          // Al centro: a la vista, para que lo lleven a donde va.
          x: redondear(p.ancho / 2),
          y: redondear(p.largo / 2),
          ancho: Math.min(base.ancho, p.ancho),
          largo: Math.min(base.largo, p.largo),
          giro: 0,
        },
      ],
    }));
    setSeleccion({ tipo: "elemento", id });
  };

  const quitarElemento = (id: string) => {
    setPlano((p) => ({ ...p, elementos: p.elementos.filter((e) => e.id !== id) }));
    setSeleccion(null);
  };

  const medirElemento = (id: string, medidas: { ancho?: number; largo?: number }) =>
    setPlano((p) => ({ ...p, elementos: p.elementos.map((e) => (e.id === id ? { ...e, ...medidas } : e)) }));

  const medirSalon = (medidas: { ancho?: number; largo?: number }) =>
    setPlano((p) => {
      const ancho = Math.min(SALON_MAX, Math.max(SALON_MIN, medidas.ancho ?? p.ancho));
      const largo = Math.min(SALON_MAX, Math.max(SALON_MIN, medidas.largo ?? p.largo));
      // Achicar el salón no pierde nada: lo que queda fuera se mete a la orilla.
      const dentro = <T extends { x: number; y: number }>(c: T): T => ({
        ...c,
        x: Math.min(c.x, ancho),
        y: Math.min(c.y, largo),
      });
      return {
        ancho,
        largo,
        mesas: Object.fromEntries(Object.entries(p.mesas).map(([id, m]) => [id, dentro(m)])),
        elementos: p.elementos.map(dentro),
      };
    });

  // ----- Toques en el plano -----
  function tocar(cosa: Seleccion) {
    if (cosa.tipo === "mesa" && elegido && !soloLectura) {
      void sentar(elegido, cosa.id);
      return;
    }
    setSeleccion((actual) => (actual?.tipo === cosa.tipo && actual.id === cosa.id ? null : cosa));
  }

  const mesaElegida = seleccion?.tipo === "mesa" ? mesas.find((m) => m.id === seleccion.id) ?? null : null;
  const elementoElegido =
    seleccion?.tipo === "elemento" ? plano.elementos.find((e) => e.id === seleccion.id) ?? null : null;
  const aSentar = elegido ? porSentar.find((p) => p.clave === elegido) ?? null : null;

  // Si quien estaba elegido ya se sentó (o desapareció), se suelta solo.
  useEffect(() => {
    if (elegido && !porSentar.some((p) => p.clave === elegido)) setElegido(null);
  }, [elegido, porSentar]);

  const [bajando, setBajando] = useState(false);
  async function descargar() {
    setBajando(true);
    setAviso(null);
    try {
      await descargarArchivo("mesas");
    } catch (err) {
      setAviso(err instanceof Error ? err.message : null);
    } finally {
      setBajando(false);
    }
  }

  const estadoGuardado = soloLectura
    ? isEnglish
      ? "Read-only"
      : "Solo lectura"
    : !salon.planoGuardable
      ? isEnglish
        ? "Seating is saved; table positions aren't yet"
        : "El acomodo se guarda; el lugar de las mesas todavía no"
      : guardado === "guardado"
        ? isEnglish
          ? "Saved"
          : "Guardado"
        : guardado === "error"
          ? isEnglish
            ? "Couldn't save the plan"
            : "No se pudo guardar el plano"
          : isEnglish
            ? "Saving…"
            : "Guardando…";

  return (
    <>
      {/* Los números del acomodo, en una línea. */}
      <Reveal app className="mt-6">
        <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-tinta tabular-nums">
          <span>
            <span className="font-medium text-noche">{mesas.length}</span>{" "}
            {isEnglish ? (mesas.length === 1 ? "table" : "tables") : mesas.length === 1 ? "mesa" : "mesas"}
          </span>
          {lugares > 0 ? (
            <span>
              <span className="font-medium text-noche">{lugares}</span> {isEnglish ? "seats" : "lugares"}
            </span>
          ) : null}
          <span>
            <span className="font-medium text-noche">{sentadas}</span>{" "}
            {isEnglish ? "people seated" : sentadas === 1 ? "persona sentada" : "personas sentadas"}
          </span>
          <span>
            <span className="font-medium text-noche">{faltanPersonas}</span> {isEnglish ? "still to seat" : "por sentar"}
          </span>
          {enSobrecupo > 0 ? (
            <span className="font-medium text-error">
              {isEnglish
                ? `${enSobrecupo} ${enSobrecupo === 1 ? "table" : "tables"} over capacity`
                : `${enSobrecupo} ${enSobrecupo === 1 ? "mesa" : "mesas"} en sobrecupo`}
            </span>
          ) : null}
        </p>
      </Reveal>

      {soloLectura ? (
        <Reveal app className="mt-4">
          <p className="text-sm text-tinta">
            {isEnglish
              ? "Your trial ended: you can look at your plan, but not change it. "
              : "Su prueba terminó: pueden ver su plano, pero no cambiarlo. "}
            <Link
              href="/panel/plan"
              className="text-noche underline decoration-linea-control underline-offset-4 transition-[text-decoration-color] duration-150 hover:decoration-noche"
            >
              {isEnglish ? "Choose a plan" : "Elegir plan"}
            </Link>
          </p>
        </Reveal>
      ) : null}

      {/* grid-cols-1 y min-w-0 en el teléfono: una columna "auto" se estira al
          ancho mínimo del plano (640 px) y la tarjeta entera se salía de la
          pantalla. Con minmax(0, 1fr) el que desplaza es el plano, no la página. */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        {/* ----- El plano ----- */}
        <Reveal app className="min-w-0">
          <div className="panel-card overflow-hidden">
            {!soloLectura ? (
              <div className="flex flex-col gap-3 border-b border-linea px-4 py-3 sm:px-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-xs text-tinta">{isEnglish ? "Add a table:" : "Agregar mesa:"}</span>
                  {FORMAS.map((forma) => (
                    <button
                      key={forma}
                      type="button"
                      disabled={trabajando}
                      onClick={() => void agregarMesa(forma)}
                      className={chip}
                    >
                      <FormaIcono forma={forma} />
                      {isEnglish ? FORMA_TEXTO[forma].en : FORMA_TEXTO[forma].es}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-xs text-tinta">{isEnglish ? "Add:" : "Agregar:"}</span>
                  {TIPOS_DE_ELEMENTO.map((tipo) => (
                    <button
                      key={tipo}
                      type="button"
                      disabled={plano.elementos.length >= ELEMENTOS_MAX}
                      onClick={() => agregarElemento(tipo)}
                      className={chip}
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
                      {isEnglish ? ELEMENTOS[tipo].en : ELEMENTOS[tipo].es}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {aSentar ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-linea bg-papel px-4 py-3 sm:px-5" role="status">
                <p className="text-sm text-noche">
                  {isEnglish ? "Tap the table for " : "Toquen la mesa de "}
                  <span className="font-medium">{aSentar.nombre}</span>
                  <span className="text-tinta">
                    {" "}
                    · {aSentar.personas} {isEnglish ? (aSentar.personas === 1 ? "person" : "people") : aSentar.personas === 1 ? "persona" : "personas"}
                  </span>
                </p>
                <button type="button" onClick={() => setElegido(null)} className={chip}>
                  <X className="h-3.5 w-3.5" strokeWidth={1.8} />
                  {isEnglish ? "Cancel" : "Cancelar"}
                </button>
              </div>
            ) : null}

            {mesas.length === 0 ? (
              <PrimerasMesas
                esperadas={esperadasEnTotal}
                soloLectura={soloLectura}
                trabajando={trabajando}
                isEnglish={isEnglish}
                onPoner={(cantidad, porMesa) => void ponerVarias(cantidad, porMesa)}
              />
            ) : null}

            <div className="max-h-[72vh] overflow-auto bg-papel p-2 sm:p-3">
              <PlanoDelSalon
                plano={plano}
                mesas={mesas}
                paxPorMesa={porMesa}
                seleccion={seleccion}
                soloLectura={soloLectura}
                sentando={aSentar != null}
                zoom={zoom}
                isEnglish={isEnglish}
                onMover={mover}
                onEmpujar={empujar}
                onTocar={tocar}
                onFondo={() => setSeleccion(null)}
                onSoltarEnMesa={(tableId, clave) => void sentar(clave, tableId)}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-linea px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100))}
                  disabled={zoom <= 0.5}
                  aria-label={isEnglish ? "Zoom out" : "Alejar"}
                  className={botonIcono}
                >
                  <Minus className="h-4 w-4" strokeWidth={1.6} />
                </button>
                <span className="w-12 text-center text-xs text-tinta tabular-nums" aria-live="polite">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100))}
                  disabled={zoom >= 3}
                  aria-label={isEnglish ? "Zoom in" : "Acercar"}
                  className={botonIcono}
                >
                  <Plus className="h-4 w-4" strokeWidth={1.6} />
                </button>
              </div>
              <MedidasDelSalon plano={plano} soloLectura={soloLectura} isEnglish={isEnglish} onCambio={medirSalon} />
              <p role="status" className={`text-xs ${guardado === "error" ? "text-error" : "text-tinta"}`}>
                {estadoGuardado}
                {guardado === "error" && guardable ? (
                  <button
                    type="button"
                    onClick={() => void guardarPlano()}
                    className="ml-2 text-noche underline decoration-linea-control underline-offset-4 transition-[text-decoration-color] duration-150 hover:decoration-noche"
                  >
                    {isEnglish ? "Try again" : "Reintentar"}
                  </button>
                ) : null}
              </p>
            </div>
          </div>

          {!soloLectura ? (
            <p className="mt-3 text-xs leading-relaxed text-tinta">
              {isEnglish
                ? "Tip: drag tables to move them, or select one and use the arrow keys (Shift moves further). Esc lets go of what's selected."
                : "Tip: arrastren las mesas para moverlas, o elijan una y usen las flechas del teclado (con Shift se mueve más). Esc suelta lo elegido."}
            </p>
          ) : null}

          {aviso ? (
            <p role="alert" className="mt-3 text-sm text-error">
              {aviso}
            </p>
          ) : null}
        </Reveal>

        {/* ----- La columna: lo elegido y quién falta ----- */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-6">
          {mesaElegida ? (
            <DetalleDeMesa
              key={mesaElegida.id}
              mesa={mesaElegida}
              forma={plano.mesas[mesaElegida.id]?.forma ?? "redonda"}
              asientos={asientos.filter((a) => a.tableId === mesaElegida.id)}
              pax={porMesa.get(mesaElegida.id) ?? 0}
              grupos={grupos}
              porGrupo={porGrupo}
              porSentar={porSentar}
              soloLectura={soloLectura}
              trabajando={trabajando}
              isEnglish={isEnglish}
              onCerrar={() => setSeleccion(null)}
              onCambiar={(cambio) => cambiarMesa(mesaElegida.id, cambio)}
              onForma={(forma) => cambiarForma(mesaElegida.id, forma)}
              onGirar={() => girar({ tipo: "mesa", id: mesaElegida.id })}
              onBorrar={() => void borrarMesa(mesaElegida.id)}
              onSentar={(clave) => void sentar(clave, mesaElegida.id)}
              onQuitar={(id) => void cambiarAsiento(id, { tableId: null })}
              onPax={(id, pax) => void cambiarAsiento(id, { pax })}
            />
          ) : null}

          {elementoElegido ? (
            <DetalleDeElemento
              key={elementoElegido.id}
              tipo={elementoElegido.tipo}
              ancho={elementoElegido.ancho}
              largo={elementoElegido.largo}
              soloLectura={soloLectura}
              isEnglish={isEnglish}
              onCerrar={() => setSeleccion(null)}
              onMedidas={(m) => medirElemento(elementoElegido.id, m)}
              onGirar={() => girar({ tipo: "elemento", id: elementoElegido.id })}
              onQuitar={() => quitarElemento(elementoElegido.id)}
            />
          ) : null}

          <section className="panel-card p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-base font-medium text-noche">{isEnglish ? "Still to seat" : "Por sentar"}</h2>
              <p className="text-xs text-tinta tabular-nums">
                {faltanPersonas} {isEnglish ? (faltanPersonas === 1 ? "person" : "people") : faltanPersonas === 1 ? "persona" : "personas"}
              </p>
            </div>

            {porSentar.length === 0 ? (
              <p className="mt-3 text-sm leading-relaxed text-tinta">
                {grupos.length === 0
                  ? isEnglish
                    ? "Your guest list is empty. Add your guests first and they'll show up here to seat."
                    : "Su lista está vacía. Agreguen a sus invitados y aquí aparecen para sentarlos."
                  : isEnglish
                    ? "Everyone has a seat."
                    : "Todos tienen lugar."}
                {grupos.length === 0 ? (
                  <>
                    {" "}
                    <Link
                      href="/panel/invitados"
                      className="text-noche underline decoration-linea-control underline-offset-4 transition-[text-decoration-color] duration-150 hover:decoration-noche"
                    >
                      {isEnglish ? "Go to guests" : "Ir a invitados"}
                    </Link>
                  </>
                ) : null}
              </p>
            ) : (
              <>
                {!soloLectura ? (
                  <p className="mt-1 text-xs leading-relaxed text-tinta">
                    {isEnglish
                      ? "Drag a group onto its table, or tap it and then tap the table."
                      : "Arrastren a un grupo a su mesa, o tóquenlo y luego toquen la mesa."}
                  </p>
                ) : null}
                {porSentar.length > 8 ? (
                  <label className="relative mt-3 block">
                    <span className="sr-only">{isEnglish ? "Search" : "Buscar"}</span>
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tinta" strokeWidth={1.6} />
                    <input
                      type="search"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      placeholder={isEnglish ? "Search by name" : "Buscar por nombre"}
                      className={`${campo} pl-9`}
                    />
                  </label>
                ) : null}
                <ul className="mt-3 max-h-[52vh] space-y-1.5 overflow-y-auto pr-1">
                  {visibles.map((p) => {
                    const activo = elegido === p.clave;
                    return (
                      <li key={p.clave}>
                        <button
                          type="button"
                          draggable={!soloLectura}
                          disabled={soloLectura}
                          aria-pressed={activo}
                          onDragStart={(e: DragEvent<HTMLButtonElement>) => {
                            e.dataTransfer.setData("text/plain", p.clave);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onClick={() => setElegido((actual) => (actual === p.clave ? null : p.clave))}
                          className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-[background-color,border-color,scale] duration-150 active:scale-[0.985] active:duration-100 motion-reduce:active:scale-100 disabled:cursor-default disabled:active:scale-100 ${
                            activo
                              ? "border-noche bg-papel"
                              : "border-linea bg-niebla hover:border-linea-control hover:bg-papel-medio disabled:hover:border-linea disabled:hover:bg-niebla"
                          } ${soloLectura ? "" : "cursor-grab"}`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm text-noche">{p.nombre}</span>
                            {p.sinContestar || p.dieta ? (
                              <span className="block truncate text-xs text-tinta">
                                {[p.sinContestar ? (isEnglish ? "Hasn't replied" : "Sin contestar") : null, p.dieta]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                            ) : null}
                          </span>
                          <span className="shrink-0 text-xs text-tinta tabular-nums">{p.personas}</span>
                        </button>
                      </li>
                    );
                  })}
                  {visibles.length === 0 ? (
                    <li className="px-1 py-2 text-sm text-tinta">
                      {isEnglish ? "No one by that name." : "Nadie con ese nombre."}
                    </li>
                  ) : null}
                </ul>
              </>
            )}
          </section>

          <div>
            <button type="button" onClick={descargar} disabled={bajando} className={botonPrincipal}>
              <Download className="h-4 w-4" strokeWidth={1.6} />
              {bajando
                ? isEnglish
                  ? "Preparing…"
                  : "Armándolo…"
                : isEnglish
                  ? "Download tables and door list"
                  : "Descargar mesas y lista de la puerta"}
            </button>
            <p className="mt-2 text-xs leading-relaxed text-tinta">
              {isEnglish
                ? "An Excel for the venue and the host: who sits at each table, and everyone in alphabetical order to check them in."
                : "Un Excel para el salón y la hostess: quién va en cada mesa, y todos en orden alfabético para recibirlos en la puerta."}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

/** El dibujito de cada forma, en los botones de «Agregar mesa». */
function FormaIcono({ forma }: { forma: FormaMesa }) {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      {forma === "redonda" ? (
        <circle cx={8} cy={8} r={5.5} fill="none" stroke="currentColor" strokeWidth={1.5} />
      ) : forma === "cuadrada" ? (
        <rect x={2.5} y={2.5} width={11} height={11} rx={1.5} fill="none" stroke="currentColor" strokeWidth={1.5} />
      ) : (
        <rect x={1} y={5} width={14} height={6} rx={1.5} fill="none" stroke="currentColor" strokeWidth={1.5} />
      )}
    </svg>
  );
}

/**
 * Sin mesas todavía. Con la lista hecha, se sugiere cuántas hacen falta: las
 * personas que se esperan entre diez, que es la redonda más común. Se puede
 * cambiar antes de ponerlas.
 */
function PrimerasMesas({
  esperadas,
  soloLectura,
  trabajando,
  isEnglish,
  onPoner,
}: {
  esperadas: number;
  soloLectura: boolean;
  trabajando: boolean;
  isEnglish: boolean;
  onPoner: (cantidad: number, porMesa: number) => void;
}) {
  const [porMesa, setPorMesa] = useState(LUGARES_INICIALES);
  const sugeridas = esperadas > 0 ? Math.ceil(esperadas / porMesa) : 10;
  const [cantidad, setCantidad] = useState<number | null>(null);
  const n = Math.min(MESAS_DE_UN_JALON, Math.max(1, cantidad ?? sugeridas));

  return (
    <div className="border-b border-linea px-4 py-5 sm:px-5">
      <p className="text-sm font-medium text-noche">{isEnglish ? "No tables yet" : "Todavía no hay mesas"}</p>
      <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-tinta">
        {soloLectura
          ? isEnglish
            ? "When there are tables, you'll see them here."
            : "Cuando haya mesas, aquí las van a ver."
          : esperadas > 0
            ? isEnglish
              ? `You're expecting about ${esperadas} people. With ${porMesa} per table you need ${sugeridas}.`
              : `Esperan unas ${esperadas} personas. Con ${porMesa} por mesa les hacen falta ${sugeridas}.`
            : isEnglish
              ? "Start with a few and add more as your list grows."
              : "Empiecen con unas cuantas y agreguen más conforme crezca su lista."}
      </p>
      {!soloLectura ? (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label>
            <span className={rotuloCampo}>{isEnglish ? "Tables" : "Mesas"}</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={MESAS_DE_UN_JALON}
              value={n}
              onChange={(e) => setCantidad(Number(e.target.value) || null)}
              className={`${campo} mt-1 w-24 tabular-nums`}
            />
          </label>
          <label>
            <span className={rotuloCampo}>{isEnglish ? "Seats each" : "Lugares c/u"}</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={LUGARES_MAX}
              value={porMesa}
              onChange={(e) => setPorMesa(Math.min(LUGARES_MAX, Math.max(1, Number(e.target.value) || 1)))}
              className={`${campo} mt-1 w-24 tabular-nums`}
            />
          </label>
          <button type="button" disabled={trabajando} onClick={() => onPoner(n, porMesa)} className={botonPrincipal}>
            {isEnglish ? `Add ${n} ${n === 1 ? "table" : "tables"}` : `Poner ${n} ${n === 1 ? "mesa" : "mesas"}`}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Ancho y largo del salón, en metros. Se aplican al salir del campo. */
function MedidasDelSalon({
  plano,
  soloLectura,
  isEnglish,
  onCambio,
}: {
  plano: Plano;
  soloLectura: boolean;
  isEnglish: boolean;
  onCambio: (m: { ancho?: number; largo?: number }) => void;
}) {
  const [ancho, setAncho] = useState(enMetros(plano.ancho));
  const [largo, setLargo] = useState(enMetros(plano.largo));
  const [antes, setAntes] = useState({ ancho: plano.ancho, largo: plano.largo });
  if (antes.ancho !== plano.ancho || antes.largo !== plano.largo) {
    setAntes({ ancho: plano.ancho, largo: plano.largo });
    setAncho(enMetros(plano.ancho));
    setLargo(enMetros(plano.largo));
  }

  const aplicar = (cual: "ancho" | "largo", texto: string) => {
    const cm = aCentimetros(texto);
    if (cm == null) {
      if (cual === "ancho") setAncho(enMetros(plano.ancho));
      else setLargo(enMetros(plano.largo));
      return;
    }
    onCambio({ [cual]: redondear(cm) });
  };

  if (soloLectura) {
    return (
      <p className="text-xs text-tinta tabular-nums">
        {isEnglish ? "Venue" : "Salón"}: {enMetros(plano.ancho)} × {enMetros(plano.largo)} m
      </p>
    );
  }

  const medida = (cual: "ancho" | "largo", valor: string, setValor: (v: string) => void, etiqueta: string) => (
    <input
      type="text"
      inputMode="decimal"
      value={valor}
      aria-label={etiqueta}
      onChange={(e) => setValor(e.target.value)}
      onBlur={(e) => aplicar(cual, e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className="w-14 rounded-lg border border-linea-control/70 bg-papel px-2 py-1.5 text-center text-xs text-noche tabular-nums outline-none transition-[border-color] duration-150 focus:border-noche"
    />
  );

  return (
    <div className="flex items-center gap-1.5 text-xs text-tinta">
      <span>{isEnglish ? "Venue" : "Salón"}</span>
      {medida("ancho", ancho, setAncho, isEnglish ? "Venue width in meters" : "Ancho del salón en metros")}
      <span aria-hidden="true">×</span>
      {medida("largo", largo, setLargo, isEnglish ? "Venue length in meters" : "Largo del salón en metros")}
      <span>m</span>
    </div>
  );
}

function DetalleDeMesa({
  mesa,
  forma,
  asientos,
  pax,
  grupos,
  porGrupo,
  porSentar,
  soloLectura,
  trabajando,
  isEnglish,
  onCerrar,
  onCambiar,
  onForma,
  onGirar,
  onBorrar,
  onSentar,
  onQuitar,
  onPax,
}: {
  mesa: MesaDelSalon;
  forma: FormaMesa;
  asientos: AsientoDelSalon[];
  pax: number;
  grupos: GrupoDelSalon[];
  porGrupo: Map<string, number>;
  porSentar: PorSentar[];
  soloLectura: boolean;
  trabajando: boolean;
  isEnglish: boolean;
  onCerrar: () => void;
  /** Resuelve false si la base lo rechazó (p. ej. un nombre repetido). */
  onCambiar: (cambio: { label?: string; lugares?: number }) => Promise<boolean>;
  onForma: (forma: FormaMesa) => void;
  onGirar: () => void;
  onBorrar: () => void;
  onSentar: (clave: string) => void;
  onQuitar: (asientoId: string) => void;
  onPax: (asientoId: string, pax: number) => void;
}) {
  const [nombre, setNombre] = useState(mesa.label);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const sobrecupo = mesa.capacity != null && pax > mesa.capacity;
  const libres = mesa.capacity != null ? mesa.capacity - pax : null;
  const porId = useMemo(() => new Map(grupos.map((g) => [g.membershipId, g])), [grupos]);

  // Cuántos más caben en un renglón: los que ya tiene más los que a su grupo
  // le faltan por sentar. Un renglón sin grupo (de la planner) no tiene tope
  // que deducir aquí; el servidor le pone el de siempre.
  const topeDe = (a: AsientoDelSalon): number => {
    if (!a.membershipId) return LUGARES_MAX;
    const g = porId.get(a.membershipId);
    if (!g) return a.pax;
    return a.pax + Math.max(0, personasEsperadas(g) - (porGrupo.get(a.membershipId) ?? 0));
  };

  const guardarNombre = () => {
    const limpio = nombre.trim();
    if (!limpio) {
      setNombre(mesa.label);
      return;
    }
    if (limpio === mesa.label) return;
    // Si la base lo rechaza, el campo regresa al nombre que la mesa sí tiene:
    // dejar escrito «novios» junto a un aviso de repetido parecía guardado.
    void onCambiar({ label: limpio }).then((ok) => {
      if (!ok) setNombre(mesa.label);
    });
  };

  return (
    <section className="panel-card p-5" aria-label={nombreDeMesa(mesa.label, isEnglish)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-medium text-noche">{nombreDeMesa(mesa.label, isEnglish)}</h2>
          <p className={`mt-0.5 text-xs tabular-nums ${sobrecupo ? "font-medium text-error" : "text-tinta"}`}>
            {mesa.capacity != null
              ? isEnglish
                ? `${pax} of ${mesa.capacity} seats${sobrecupo ? " · over capacity" : libres === 0 ? " · full" : ""}`
                : `${pax} de ${mesa.capacity} lugares${sobrecupo ? " · sobrecupo" : libres === 0 ? " · llena" : ""}`
              : isEnglish
                ? `${pax} seated · no seat count yet`
                : `${pax} sentados · sin lugares anotados`}
          </p>
          {mesa.zone ? <p className="mt-0.5 text-xs text-tinta">{mesa.zone}</p> : null}
        </div>
        <button type="button" onClick={onCerrar} aria-label={isEnglish ? "Close" : "Cerrar"} className={botonIcono}>
          <X className="h-4 w-4" strokeWidth={1.6} />
        </button>
      </div>

      {!soloLectura ? (
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-3">
          <label className="min-w-0">
            <span className={rotuloCampo}>{isEnglish ? "Name or number" : "Nombre o número"}</span>
            <input
              type="text"
              value={nombre}
              maxLength={30}
              disabled={trabajando}
              onChange={(e) => setNombre(e.target.value)}
              onBlur={guardarNombre}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              className={`${campo} mt-1`}
            />
          </label>
          <div>
            <span className={rotuloCampo}>{isEnglish ? "Seats" : "Lugares"}</span>
            <div className="mt-1 flex items-center gap-1.5">
              <button
                type="button"
                disabled={trabajando || (mesa.capacity ?? 1) <= 1}
                onClick={() => void onCambiar({ lugares: Math.max(1, (mesa.capacity ?? pax) - 1) })}
                aria-label={isEnglish ? "One seat less" : "Un lugar menos"}
                className={botonIcono}
              >
                <Minus className="h-4 w-4" strokeWidth={1.6} />
              </button>
              <span className="w-7 text-center text-sm font-medium text-noche tabular-nums">{mesa.capacity ?? "—"}</span>
              <button
                type="button"
                disabled={trabajando || (mesa.capacity ?? 0) >= LUGARES_MAX}
                onClick={() => void onCambiar({ lugares: Math.min(LUGARES_MAX, (mesa.capacity ?? pax) + 1) })}
                aria-label={isEnglish ? "One more seat" : "Un lugar más"}
                className={botonIcono}
              >
                <Plus className="h-4 w-4" strokeWidth={1.6} />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!soloLectura ? (
        <div className="mt-4 flex flex-wrap items-center gap-2" role="radiogroup" aria-label={isEnglish ? "Shape" : "Forma"}>
          {FORMAS.map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={forma === f}
              onClick={() => onForma(f)}
              className={forma === f ? chipActivo : chip}
            >
              <FormaIcono forma={f} />
              {isEnglish ? FORMA_TEXTO[f].en : FORMA_TEXTO[f].es}
            </button>
          ))}
          {forma !== "redonda" ? (
            <button type="button" onClick={onGirar} className={chip}>
              <RotateCw className="h-3.5 w-3.5" strokeWidth={1.8} />
              {isEnglish ? "Rotate" : "Girar"}
            </button>
          ) : null}
        </div>
      ) : null}

      <h3 className="mt-5 text-[11px] font-medium uppercase tracking-[0.1em] text-tinta">
        {isEnglish ? "Seated here" : "Sentados aquí"}
      </h3>
      {asientos.length === 0 ? (
        <p className="mt-2 text-sm text-tinta">{isEnglish ? "No one yet." : "Todavía nadie."}</p>
      ) : (
        <ul className="mt-2 divide-y divide-linea border-y border-linea">
          {asientos.map((a) => {
            const tope = topeDe(a);
            return (
              <li
                key={a.id}
                draggable={!soloLectura}
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", `fila:${a.id}`);
                  e.dataTransfer.effectAllowed = "move";
                }}
                className={`flex items-center gap-2 py-2 ${soloLectura ? "" : "cursor-grab"}`}
              >
                <span className="min-w-0 flex-1 truncate text-sm text-noche">{a.nombre}</span>
                {soloLectura ? (
                  <span className="text-xs text-tinta tabular-nums">{a.pax}</span>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={trabajando || a.pax <= 1}
                      onClick={() => onPax(a.id, a.pax - 1)}
                      aria-label={isEnglish ? `One less from ${a.nombre}` : `Uno menos de ${a.nombre}`}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-tinta transition-colors hover:bg-papel-medio hover:text-noche disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      <Minus className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </button>
                    <span className="w-5 text-center text-xs text-noche tabular-nums">{a.pax}</span>
                    <button
                      type="button"
                      disabled={trabajando || a.pax >= tope}
                      onClick={() => onPax(a.id, a.pax + 1)}
                      aria-label={isEnglish ? `One more from ${a.nombre}` : `Uno más de ${a.nombre}`}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-tinta transition-colors hover:bg-papel-medio hover:text-noche disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      disabled={trabajando}
                      onClick={() => onQuitar(a.id)}
                      aria-label={isEnglish ? `Take ${a.nombre} off this table` : `Quitar a ${a.nombre} de esta mesa`}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-tinta transition-colors hover:bg-error-fondo hover:text-error"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!soloLectura && porSentar.length > 0 ? (
        <label className="mt-4 block">
          <span className={rotuloCampo}>{isEnglish ? "Seat someone here" : "Sentar aquí a…"}</span>
          <select
            value=""
            disabled={trabajando}
            onChange={(e) => {
              if (e.target.value) onSentar(e.target.value);
            }}
            className={`${campo} mt-1 cursor-pointer`}
          >
            <option value="">{isEnglish ? "Choose from your list…" : "Elegir de su lista…"}</option>
            {porSentar.map((p) => (
              <option key={p.clave} value={p.clave}>
                {`${p.nombre} · ${p.personas}${p.sinContestar ? (isEnglish ? " · hasn't replied" : " · sin contestar") : ""}`}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {!soloLectura ? (
        <div className="mt-5 border-t border-linea pt-4">
          {confirmarBorrado ? (
            <div className="rounded-xl border border-error/25 bg-error-fondo p-3">
              <p className="text-sm text-noche">
                {asientos.length > 0
                  ? isEnglish
                    ? "Remove this table? Whoever is seated here goes back to the list."
                    : "¿Quitar esta mesa? Quienes están sentados aquí regresan a la lista."
                  : isEnglish
                    ? "Remove this table?"
                    : "¿Quitar esta mesa?"}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={trabajando}
                  onClick={onBorrar}
                  className="inline-flex min-h-[2.25rem] items-center gap-1.5 rounded-full bg-error px-4 py-1.5 text-xs font-medium text-niebla transition-[opacity,scale] duration-150 hover:opacity-90 active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                  {isEnglish ? "Remove" : "Quitar"}
                </button>
                <button type="button" onClick={() => setConfirmarBorrado(false)} className={chip}>
                  {isEnglish ? "Keep it" : "Dejarla"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmarBorrado(true)}
              className="inline-flex min-h-[2.25rem] items-center gap-1.5 text-xs text-tinta transition-colors hover:text-error"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.6} />
              {isEnglish ? "Remove table" : "Quitar mesa"}
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}

function DetalleDeElemento({
  tipo,
  ancho,
  largo,
  soloLectura,
  isEnglish,
  onCerrar,
  onMedidas,
  onGirar,
  onQuitar,
}: {
  tipo: TipoElemento;
  ancho: number;
  largo: number;
  soloLectura: boolean;
  isEnglish: boolean;
  onCerrar: () => void;
  onMedidas: (m: { ancho?: number; largo?: number }) => void;
  onGirar: () => void;
  onQuitar: () => void;
}) {
  const [textoAncho, setTextoAncho] = useState(enMetros(ancho));
  const [textoLargo, setTextoLargo] = useState(enMetros(largo));
  const nombre = isEnglish ? ELEMENTOS[tipo].en : ELEMENTOS[tipo].es;

  const aplicar = (cual: "ancho" | "largo", texto: string) => {
    const cm = aCentimetros(texto);
    if (cm == null) {
      if (cual === "ancho") setTextoAncho(enMetros(ancho));
      else setTextoLargo(enMetros(largo));
      return;
    }
    onMedidas({ [cual]: Math.min(SALON_MAX, Math.max(40, redondear(cm))) });
  };

  return (
    <section className="panel-card p-5" aria-label={nombre}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-medium text-noche">{nombre}</h2>
          <p className="mt-0.5 text-xs text-tinta tabular-nums">
            {enMetros(ancho)} × {enMetros(largo)} m
          </p>
        </div>
        <button type="button" onClick={onCerrar} aria-label={isEnglish ? "Close" : "Cerrar"} className={botonIcono}>
          <X className="h-4 w-4" strokeWidth={1.6} />
        </button>
      </div>

      {!soloLectura ? (
        <>
          <div className="mt-4 flex items-end gap-2">
            <label>
              <span className={rotuloCampo}>{isEnglish ? "Width (m)" : "Ancho (m)"}</span>
              <input
                type="text"
                inputMode="decimal"
                value={textoAncho}
                onChange={(e) => setTextoAncho(e.target.value)}
                onBlur={(e) => aplicar("ancho", e.target.value)}
                className={`${campo} mt-1 w-24 tabular-nums`}
              />
            </label>
            <span className="pb-2.5 text-sm text-tinta" aria-hidden="true">
              ×
            </span>
            <label>
              <span className={rotuloCampo}>{isEnglish ? "Length (m)" : "Largo (m)"}</span>
              <input
                type="text"
                inputMode="decimal"
                value={textoLargo}
                onChange={(e) => setTextoLargo(e.target.value)}
                onBlur={(e) => aplicar("largo", e.target.value)}
                className={`${campo} mt-1 w-24 tabular-nums`}
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={onGirar} className={chip}>
              <RotateCw className="h-3.5 w-3.5" strokeWidth={1.8} />
              {isEnglish ? "Rotate" : "Girar"}
            </button>
            <button type="button" onClick={onQuitar} className={chipPeligro}>
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
              {isEnglish ? "Remove" : "Quitar"}
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
