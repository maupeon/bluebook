"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, FileText, Plus, Scale } from "lucide-react";
import type { PanelBundle } from "@/lib/couplePanel";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { Titular } from "@/components/marca/Titular";
import { BudgetSection, ChecklistSection, Eyebrow } from "@/components/panel/sections";
import { RepartoDelPresupuesto } from "@/components/panel/RepartoDelPresupuesto";
import { useRefrescoDelPanel } from "@/components/panel/useRefrescoDelPanel";
import { formatShortDate, daysUntil } from "@/components/panel/dates";
import { createClient } from "@/lib/supabase/client";
import { parseJsonSafe } from "@/lib/http";
import { formatMXN } from "@/lib/weddingPlans";
import type { ClavePrioridad } from "@/components/onboarding/respuestas";
import { contratadoPorCategoria, type PlanReparto } from "@/lib/reparto";
import type { DatosDeProveedores } from "@/lib/proveedoresServidor";
import {
  GRUPOS,
  cuentasDe,
  esperaRespuesta,
  grupoDe,
  nombreDeTipo,
  type DecisionDeLaPareja,
  type EstadoDeProveedor,
  type PagoDelPanel,
  type ProveedorDelPanel,
} from "@/lib/proveedores";
import { FormularioProveedor, datosDe, type DatosDelFormulario } from "@/components/panel/proveedores/FormularioProveedor";
import { DetalleDelProveedor, type AccionesDelProveedor } from "@/components/panel/proveedores/DetalleDelProveedor";
import { chip, enlace, pesos } from "@/components/panel/proveedores/estilos";

const BUCKET_CONTRATOS = "contratos";

/**
 * «PROVEEDORES»: lo que antes era «Dinero».
 *
 * Arriba cada proveedor en su categoría, de la primera cotización al último
 * pago, con su contacto y su contrato. Luego lo que vence. Y al final el
 * dinero de siempre: el presupuesto, cómo se reparte y, con planner, el
 * checklist de pagos partida por partida. El dinero es la consecuencia de los
 * proveedores, así que va debajo de ellos y no al revés.
 *
 * La pareja captura lo suyo; lo de la planner se ve firmado y no se toca.
 */
export function PantallaProveedores({
  bundle,
  datos,
  planReparto,
  prioridades,
  soloLectura,
}: {
  bundle: PanelBundle;
  /** null = la lectura falló: se enseña el dinero y un aviso. */
  datos: DatosDeProveedores | null;
  planReparto: PlanReparto;
  prioridades: ClavePrioridad[];
  soloLectura: boolean;
}) {
  const { isEnglish } = useLanguage();
  const { budget, wedding, guests, seating } = bundle;
  const conPlanner = wedding.tienePlanner;
  const hayReparto = budget.budgetTotal != null && budget.budgetTotal > 0;

  // «Por invitado» del reparto: los que imaginan, o los de su lista.
  const personasDeLaLista = seating.unavailable ? guests.attending : seating.confirmedPeople + seating.pendingPeople;
  const personas =
    wedding.invitadosEstimados != null && wedding.invitadosEstimados > 0
      ? wedding.invitadosEstimados
      : personasDeLaLista > 0
        ? personasDeLaLista
        : null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      {datos ? (
        <Proveedores datos={datos} bundle={bundle} soloLectura={soloLectura} isEnglish={isEnglish} />
      ) : (
        <Reveal app>
          <header>
            <Eyebrow>{isEnglish ? "Your vendors" : "Sus proveedores"}</Eyebrow>
            <Titular as="h1" tamano="pantalla" alinear="inicio" className="mt-3">
              {isEnglish ? "Your vendors" : "Sus proveedores"}
            </Titular>
            <p className="mt-4 max-w-[60ch] text-sm leading-relaxed text-tinta">
              {isEnglish
                ? "We couldn't load your vendors right now. Your money below is up to date; try again in a moment."
                : "No pudimos cargar a sus proveedores por ahora. Su dinero, abajo, está al día; inténtenlo en un momento."}
            </p>
          </header>
        </Reveal>
      )}

      <Reveal app className="mt-12">
        <h2 className="text-xl font-medium text-noche">{isEnglish ? "Your money" : "Su dinero"}</h2>
      </Reveal>
      <Reveal app className="mt-4">
        <BudgetSection budget={budget} isEnglish={isEnglish} conPlanner={conPlanner} />
      </Reveal>

      {hayReparto ? (
        <Reveal app className="mt-8">
          <RepartoDelPresupuesto
            total={budget.budgetTotal!}
            prioridades={prioridades}
            planGuardado={planReparto}
            personas={personas}
            personasDeLaLista={wedding.invitadosEstimados == null || wedding.invitadosEstimados <= 0}
            contratado={contratadoPorCategoria(bundle.checklist.categories, bundle.vendors)}
            isEnglish={isEnglish}
            soloLectura={soloLectura}
          />
        </Reveal>
      ) : null}

      {/* El checklist partida por partida sólo existe cuando la planner lo
          captura: sin partidas, lo mismo ya se ve proveedor por proveedor. */}
      {!bundle.checklist.unavailable && bundle.checklist.itemCount > 0 ? (
        <Reveal app className="mt-8 mb-4">
          <ChecklistSection
            checklist={bundle.checklist}
            unlinkedPaid={budget.unlinkedPaid}
            isEnglish={isEnglish}
            conPlanner={conPlanner}
          />
        </Reveal>
      ) : null}
    </div>
  );
}

function Proveedores({
  datos,
  bundle,
  soloLectura,
  isEnglish,
}: {
  datos: DatosDeProveedores;
  bundle: PanelBundle;
  soloLectura: boolean;
  isEnglish: boolean;
}) {
  const refrescar = useRefrescoDelPanel();
  const [proveedores, setProveedores] = useState<ProveedorDelPanel[]>(datos.proveedores);
  const [pagos, setPagos] = useState<PagoDelPanel[]>(datos.pagos);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [agregandoEn, setAgregandoEn] = useState<string | null>(null);
  const [comparando, setComparando] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  // ----- Pedidos a la API -----
  const pedir = useCallback(
    async <T,>(url: string, method: string, body: unknown): Promise<T> => {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const { data } = await parseJsonSafe<T & { error?: string }>(res);
      if (!res.ok || !data) {
        throw new Error(data?.error ?? (isEnglish ? "Something went wrong. Please try again." : "Algo falló. Inténtenlo otra vez."));
      }
      return data;
    },
    [isEnglish]
  );

  /** Corre un pedido. false = falló, y el aviso ya salió. */
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

  const integrar = (nuevos: ProveedorDelPanel[]) =>
    setProveedores((ps) => {
      const porId = new Map(nuevos.map((p) => [p.id, p]));
      const ya = new Set(ps.map((p) => p.id));
      // Lo contratado en partidas lo pone el servidor al leer; una respuesta de
      // la API no lo trae y no debe borrarlo.
      return [
        ...ps.map((p) => {
          const n = porId.get(p.id);
          return n ? { ...n, contratadoEnPartidas: p.contratadoEnPartidas } : p;
        }),
        ...nuevos.filter((p) => !ya.has(p.id)),
      ];
    });

  const cuerpoDe = (d: DatosDelFormulario) => ({
    nombre: d.nombre,
    tipo: d.tipo,
    contacto: d.contacto,
    telefono: d.telefono,
    correo: d.correo,
    enlace: d.enlace,
    cotizacion: d.cotizacion,
    notas: d.notas,
  });

  const crear = (d: DatosDelFormulario) =>
    hacer(async () => {
      const { proveedor } = await pedir<{ proveedor: ProveedorDelPanel }>("/api/panel/proveedores", "POST", cuerpoDe(d));
      integrar([proveedor]);
      setAgregandoEn(null);
      setAbierto(proveedor.id);
    });

  const accionesDe = (p: ProveedorDelPanel): AccionesDelProveedor => ({
    editar: (d) =>
      hacer(async () => {
        const { proveedor } = await pedir<{ proveedor: ProveedorDelPanel }>("/api/panel/proveedores", "PATCH", {
          id: p.id,
          ...cuerpoDe(d),
        });
        integrar([proveedor]);
      }),
    cambiarEstado: (estado: EstadoDeProveedor) =>
      hacer(async () => {
        const { proveedor } = await pedir<{ proveedor: ProveedorDelPanel }>("/api/panel/proveedores", "PATCH", {
          id: p.id,
          estado,
        });
        integrar([proveedor]);
      }),
    cambiarContratado: (monto) =>
      hacer(async () => {
        const { proveedor } = await pedir<{ proveedor: ProveedorDelPanel }>("/api/panel/proveedores", "PATCH", {
          id: p.id,
          montoContratado: monto,
        });
        integrar([proveedor]);
      }),
    borrar: () =>
      hacer(async () => {
        await pedir<{ ok: true }>("/api/panel/proveedores", "DELETE", { id: p.id });
        setProveedores((ps) => ps.filter((x) => x.id !== p.id));
        // Sus pagos de la pareja se fueron con él; los de la planner no existen aquí.
        setPagos((xs) => xs.filter((x) => x.proveedorId !== p.id || !x.esDeLaPareja));
        setAbierto(null);
      }),
    crearPago: (d) =>
      hacer(async () => {
        const { pago } = await pedir<{ pago: PagoDelPanel }>("/api/panel/proveedores/pagos", "POST", {
          proveedorId: p.id,
          concepto: d.concepto,
          monto: d.monto,
          fecha: d.fecha,
          pagado: d.pagado,
          tipo: pagos.some((x) => x.proveedorId === p.id) ? "parcialidad" : "anticipo",
        });
        setPagos((xs) => [...xs, pago]);
      }),
    marcarPagado: (pagoId, pagado) =>
      hacer(async () => {
        const { pago } = await pedir<{ pago: PagoDelPanel }>("/api/panel/proveedores/pagos", "PATCH", { id: pagoId, pagado });
        setPagos((xs) => xs.map((x) => (x.id === pagoId ? pago : x)));
      }),
    borrarPago: (pagoId) =>
      hacer(async () => {
        await pedir<{ ok: true }>("/api/panel/proveedores/pagos", "DELETE", { id: pagoId });
        setPagos((xs) => xs.filter((x) => x.id !== pagoId));
      }),
    subirContrato: (archivo) =>
      hacer(async () => {
        // 1. URL firmada: el PDF va directo a Storage, sin pasar por Vercel.
        const destino = await pedir<{ path: string; token: string }>("/api/panel/proveedores/contrato", "POST", {
          proveedorId: p.id,
        });
        const { error } = await createClient()
          .storage.from(BUCKET_CONTRATOS)
          .uploadToSignedUrl(destino.path, destino.token, archivo, { contentType: "application/pdf" });
        if (error) throw new Error(isEnglish ? "We couldn't upload the PDF." : "No pudimos subir el PDF.");
        // 2. Darlo de alta.
        const { proveedor } = await pedir<{ proveedor: ProveedorDelPanel }>("/api/panel/proveedores/contrato", "PUT", {
          proveedorId: p.id,
          path: destino.path,
          nombre: archivo.name,
        });
        integrar([proveedor]);
      }),
    quitarContrato: () =>
      hacer(async () => {
        const { proveedor } = await pedir<{ proveedor: ProveedorDelPanel }>("/api/panel/proveedores/contrato", "DELETE", {
          proveedorId: p.id,
        });
        integrar([proveedor]);
      }),
    decidir: (decision, nota) => decidir(p, decision, nota),
  });

  /** Contestarle a la planner una cotización suya: no contrata, le avisa. */
  const decidir = (p: ProveedorDelPanel, decision: DecisionDeLaPareja, nota: string) =>
    hacer(async () => {
      const { proveedor } = await pedir<{ proveedor: ProveedorDelPanel }>("/api/panel/proveedores/decision", "POST", {
        proveedorId: p.id,
        decision,
        nota,
      });
      integrar([proveedor]);
    });

  /** Abre un proveedor y lo trae a la vista. */
  const abrirYMostrar = (id: string) => {
    setAbierto(id);
    requestAnimationFrame(() =>
      document.getElementById(`proveedor-${id}`)?.scrollIntoView({ block: "start", behavior: "smooth" })
    );
  };

  // El enlace del correo o del chat (/panel/proveedores#proveedor-<id>) abre
  // ese proveedor. El hash se quita al usarlo: si no, cada refresco del panel
  // lo volvería a abrir y a mover la pantalla.
  useEffect(() => {
    const abrirDelHash = () => {
      const m = /^#proveedor-([0-9a-f-]{36})$/i.exec(window.location.hash);
      if (!m || !datos.proveedores.some((x) => x.id === m[1])) return;
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
      abrirYMostrar(m[1]);
    };
    abrirDelHash();
    // En una navegación del cliente el hash puede llegar un instante después.
    const t = window.setTimeout(abrirDelHash, 120);
    window.addEventListener("hashchange", abrirDelHash);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("hashchange", abrirDelHash);
    };
  }, [datos.proveedores]);

  const elegir = (p: ProveedorDelPanel) =>
    hacer(async () => {
      const { proveedores: cambiados } = await pedir<{ proveedores: ProveedorDelPanel[] }>("/api/panel/proveedores", "PATCH", {
        id: p.id,
        accion: "elegir",
      });
      integrar(cambiados);
      setComparando(null);
      setAbierto(p.id);
    });

  // ----- Números -----
  const activos = proveedores.filter((p) => p.estado !== "descartado");
  const porContestar = proveedores.filter(esperaRespuesta);
  const contratados = activos.filter((p) => p.estado === "contratado");
  const porGrupo = useMemo(() => {
    const m = new Map<string, ProveedorDelPanel[]>();
    for (const p of proveedores) {
      const g = grupoDe(p.tipo);
      m.set(g, [...(m.get(g) ?? []), p]);
    }
    // Contratados primero, luego cotizando y al final los descartados.
    const orden: Record<EstadoDeProveedor, number> = { contratado: 0, cotizando: 1, descartado: 2 };
    for (const lista of m.values()) lista.sort((a, b) => orden[a.estado] - orden[b.estado]);
    return m;
  }, [proveedores]);

  // Lo que viene: pagos sin pagar con fecha, el más cercano primero.
  const nombreDe = new Map(proveedores.map((p) => [p.id, p.nombre]));
  const porVenir = pagos
    .filter((x) => !x.pagadoEn && x.fecha && x.tipo !== "honorarios")
    .sort((a, b) => (a.fecha! < b.fecha! ? -1 : 1));

  const { budget } = bundle;
  const cifra = (n: number) => (
    <span className="font-sans font-light normal-case tracking-[-0.01em] tabular-nums">{n}</span>
  );
  const titular =
    activos.length === 0
      ? isEnglish
        ? "Your vendors start here"
        : "Aquí van sus proveedores"
      : isEnglish
        ? <>{cifra(contratados.length)} of {cifra(activos.length)} booked</>
        : <>{cifra(contratados.length)} de {cifra(activos.length)} contratados</>;

  const bajada =
    activos.length === 0
      ? isEnglish
        ? "Write each vendor down from the first quote: their contact and what they quoted. When you book them, their contract and payments."
        : "Anoten a cada proveedor desde la primera cotización: su contacto y lo que les cotizó. Cuando lo contraten, su contrato y sus pagos."
      : budget.contracted <= 0
        ? isEnglish
          ? "Nothing is booked yet."
          : "Todavía no hay nada contratado."
        : isEnglish
          ? `${formatMXN(budget.contracted)} booked · ${formatMXN(budget.paid)} paid · ${formatMXN(Math.max(0, budget.balance))} left.`
          : `${formatMXN(budget.contracted)} contratados · ${formatMXN(budget.paid)} pagados · faltan ${formatMXN(Math.max(0, budget.balance))}.`;

  return (
    <>
      <Reveal app>
        <header>
          <Eyebrow>{isEnglish ? "Your vendors" : "Sus proveedores"}</Eyebrow>
          <Titular as="h1" tamano="pantalla" alinear="inicio" className="mt-3">
            {titular}
          </Titular>
          <p className="mt-4 max-w-[64ch] text-sm leading-relaxed text-tinta">{bajada}</p>
          {soloLectura ? (
            <p className="mt-2 text-sm text-tinta">
              {isEnglish
                ? "Your trial ended: you can see everything, but not change it."
                : "Su prueba terminó: pueden ver todo, pero no cambiarlo."}
            </p>
          ) : null}
        </header>
      </Reveal>

      {porContestar.length > 0 ? (
        <Reveal app className="mt-8">
          <section className="panel-card p-5 sm:p-6" aria-labelledby="por-contestar">
            <h2 id="por-contestar" className="text-base font-medium text-noche">
              {porContestar.length === 1
                ? isEnglish
                  ? "Your planner sent you a quote"
                  : "Su planner les mandó una cotización"
                : isEnglish
                  ? `Your planner sent you ${porContestar.length} quotes`
                  : `Su planner les mandó ${porContestar.length} cotizaciones`}
            </h2>
            <p className="mt-1 text-sm text-tinta">
              {isEnglish ? "Take a look and tell them what you think." : "Véanlas y díganle qué les parece."}
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {porContestar.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => abrirYMostrar(p.id)} className={chip}>
                    {p.nombre}
                    {p.cotizacion != null ? <span className="text-tinta tabular-nums">· {pesos(p.cotizacion)}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </Reveal>
      ) : null}

      {porVenir.length > 0 ? (
        <Reveal app className="mt-8">
          <section className="panel-card p-5 sm:p-6">
            <h2 className="text-base font-medium text-noche">{isEnglish ? "Coming up" : "Lo que viene"}</h2>
            <ul className="mt-3 divide-y divide-linea">
              {porVenir.slice(0, 6).map((x) => {
                const dias = daysUntil(x.fecha) ?? 0;
                return (
                  <li key={x.id} className="flex items-center justify-between gap-4 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-noche">
                        {x.concepto}
                        {x.proveedorId && nombreDe.get(x.proveedorId) ? (
                          <span className="text-tinta"> · {nombreDe.get(x.proveedorId)}</span>
                        ) : null}
                      </span>
                      <span className={`block text-xs ${dias < 0 ? "font-medium text-error" : dias <= 7 ? "font-medium text-aviso" : "text-tinta"}`}>
                        {dias < 0
                          ? isEnglish
                            ? `Overdue since ${formatShortDate(x.fecha!, true)}`
                            : `Vencido desde el ${formatShortDate(x.fecha!, false)}`
                          : dias === 0
                            ? isEnglish
                              ? "Due today"
                              : "Vence hoy"
                            : dias <= 7
                              ? isEnglish
                                ? `Due this week · ${formatShortDate(x.fecha!, true)}`
                                : `Vence esta semana · ${formatShortDate(x.fecha!, false)}`
                              : isEnglish
                                ? `Due ${formatShortDate(x.fecha!, true)}`
                                : `Vence el ${formatShortDate(x.fecha!, false)}`}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm text-noche tabular-nums">{pesos(x.monto)}</span>
                  </li>
                );
              })}
            </ul>
            {porVenir.length > 6 ? (
              <p className="mt-2 text-xs text-tinta">
                {isEnglish ? `And ${porVenir.length - 6} more.` : `Y ${porVenir.length - 6} más.`}
              </p>
            ) : null}
          </section>
        </Reveal>
      ) : null}

      <Reveal app className="mt-8">
        <div className="flex flex-col gap-4">
          {GRUPOS.map((g) => {
            const lista = porGrupo.get(g.clave) ?? [];
            const cotizando = lista.filter((p) => p.estado === "cotizando");
            const contratadosAqui = lista.filter((p) => p.estado === "contratado").length;
            // «Otros» vacío no se enseña: es para lo que no cae en ninguna.
            if (g.clave === "otros" && lista.length === 0 && agregandoEn !== g.clave) return null;
            // Vacía, la categoría es un renglón con su botón: para quien empieza
            // la pantalla es la lista de lo que falta, no ocho tarjetas altas.
            if (lista.length === 0 && agregandoEn !== g.clave) {
              return (
                <section
                  key={g.clave}
                  className="panel-card flex items-center justify-between gap-4 px-4 py-3 sm:px-5"
                  aria-labelledby={`grupo-${g.clave}`}
                >
                  <span className="min-w-0">
                    <h2 id={`grupo-${g.clave}`} className="text-base font-medium text-noche">
                      {isEnglish ? g.en : g.es}
                    </h2>
                    <span className="block text-xs text-tinta">{isEnglish ? "No vendor yet" : "Aún sin proveedor"}</span>
                  </span>
                  {!soloLectura ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAgregandoEn(g.clave);
                        setComparando(null);
                      }}
                      className={`${chip} shrink-0`}
                      aria-label={isEnglish ? `Add a vendor to ${g.en}` : `Agregar proveedor en ${g.es}`}
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
                      {isEnglish ? "Add" : "Agregar"}
                    </button>
                  ) : null}
                </section>
              );
            }
            return (
              <section key={g.clave} className="panel-card overflow-hidden" aria-labelledby={`grupo-${g.clave}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 pt-4 sm:px-5">
                  <h2 id={`grupo-${g.clave}`} className="text-base font-medium text-noche">
                    {isEnglish ? g.en : g.es}
                  </h2>
                  <p className="text-xs text-tinta">
                    {lista.length === 0
                      ? isEnglish
                        ? "New vendor"
                        : "Nuevo proveedor"
                      : [
                          contratadosAqui > 0
                            ? isEnglish
                              ? `${contratadosAqui} booked`
                              : `${contratadosAqui} ${contratadosAqui === 1 ? "contratado" : "contratados"}`
                            : null,
                          cotizando.length > 0
                            ? isEnglish
                              ? `${cotizando.length} getting quotes`
                              : `${cotizando.length} cotizando`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                  </p>
                </div>

                {lista.length > 0 ? (
                  <ul className="mt-3 border-t border-linea">
                    {lista.map((p) => {
                      const abiertoAqui = abierto === p.id;
                      const suyos = pagos.filter((x) => x.proveedorId === p.id);
                      const cuentas = cuentasDe(p, suyos);
                      return (
                        <li key={p.id} id={`proveedor-${p.id}`} className="scroll-mt-6 border-b border-linea last:border-b-0">
                          <button
                            type="button"
                            aria-expanded={abiertoAqui}
                            onClick={() => setAbierto(abiertoAqui ? null : p.id)}
                            className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-papel-medio sm:px-5 ${
                              p.estado === "descartado" ? "opacity-70" : ""
                            }`}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2">
                                <span className={`truncate text-sm ${p.estado === "descartado" ? "text-tinta line-through" : "font-medium text-noche"}`}>
                                  {p.nombre}
                                </span>
                                {p.contrato ? (
                                  <FileText
                                    className="h-3.5 w-3.5 shrink-0 text-tinta"
                                    strokeWidth={1.8}
                                    aria-label={isEnglish ? "Has a contract" : "Tiene contrato"}
                                  />
                                ) : null}
                              </span>
                              <span className="block truncate text-xs text-tinta">
                                {[
                                  nombreDeTipo(p.tipo, isEnglish),
                                  !p.esDeLaPareja ? (isEnglish ? "from your planner" : "lo lleva su planner") : null,
                                  esperaRespuesta(p)
                                    ? isEnglish
                                      ? "waiting for your answer"
                                      : "espera su respuesta"
                                    : !p.esDeLaPareja && p.estado === "cotizando" && p.decision
                                      ? p.decision.tipo === "la_queremos"
                                        ? isEnglish
                                          ? "you'll go with this one"
                                          : "se quedan con este"
                                        : isEnglish
                                          ? "not convinced"
                                          : "no les convence"
                                      : null,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                            </span>
                            <span className="shrink-0 text-right">
                              <Etiqueta estado={p.estado} isEnglish={isEnglish} />
                              <span className="mt-1 block text-xs text-tinta tabular-nums">
                                {p.estado === "contratado"
                                  ? cuentas.porPagar > 0
                                    ? isEnglish
                                      ? `${pesos(cuentas.porPagar)} left`
                                      : `Faltan ${pesos(cuentas.porPagar)}`
                                    : cuentas.contratado > 0
                                      ? isEnglish
                                        ? "Paid in full"
                                        : "Liquidado"
                                      : ""
                                  : p.cotizacion != null
                                    ? isEnglish
                                      ? `Quoted ${pesos(p.cotizacion)}`
                                      : `Cotizó ${pesos(p.cotizacion)}`
                                    : ""}
                              </span>
                            </span>
                            <ChevronDown
                              className={`h-4 w-4 shrink-0 text-tinta transition-transform duration-150 motion-reduce:transition-none ${abiertoAqui ? "rotate-180" : ""}`}
                              strokeWidth={1.5}
                            />
                          </button>
                          {abiertoAqui ? (
                            <DetalleDelProveedor
                              proveedor={p}
                              pagos={suyos}
                              tiposSugeridos={g.tipos}
                              soloLectura={soloLectura}
                              trabajando={trabajando}
                              conContratos={datos.conContratos}
                              isEnglish={isEnglish}
                              acciones={accionesDe(p)}
                            />
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}

                {comparando === g.clave ? (
                  <Comparar
                    proveedores={cotizando}
                    soloLectura={soloLectura}
                    trabajando={trabajando}
                    isEnglish={isEnglish}
                    onElegir={(p) => void elegir(p)}
                    onDecidir={(p) => void decidir(p, "la_queremos", p.decision?.nota ?? "")}
                    onCerrar={() => setComparando(null)}
                  />
                ) : null}

                {agregandoEn === g.clave ? (
                  <div className={`border-t border-linea px-4 py-4 sm:px-5 ${lista.length === 0 ? "mt-3" : ""}`}>
                    <FormularioProveedor
                      inicial={datosDe(null, g.tipos[0] ?? "otro")}
                      tiposSugeridos={g.tipos}
                      trabajando={trabajando}
                      isEnglish={isEnglish}
                      textoGuardar={isEnglish ? "Add vendor" : "Agregar proveedor"}
                      onGuardar={crear}
                      onCancelar={() => setAgregandoEn(null)}
                    />
                  </div>
                ) : !soloLectura || cotizando.length >= 2 ? (
                  <div className="flex flex-wrap gap-2 px-4 pb-4 pt-3 sm:px-5">
                    {!soloLectura ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAgregandoEn(g.clave);
                          setComparando(null);
                        }}
                        className={chip}
                      >
                        <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
                        {lista.length === 0
                          ? isEnglish
                            ? "Add vendor"
                            : "Agregar proveedor"
                          : isEnglish
                            ? "Add another"
                            : "Agregar otro"}
                      </button>
                    ) : null}
                    {cotizando.length >= 2 && comparando !== g.clave ? (
                      <button
                        type="button"
                        onClick={() => {
                          setComparando(g.clave);
                          setAgregandoEn(null);
                        }}
                        className={chip}
                      >
                        <Scale className="h-3.5 w-3.5" strokeWidth={1.8} />
                        {isEnglish ? `Compare ${cotizando.length} quotes` : `Comparar ${cotizando.length} cotizaciones`}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
        {!soloLectura && !(porGrupo.get("otros")?.length) && agregandoEn !== "otros" ? (
          <p className="mt-3 text-xs text-tinta">
            {isEnglish ? "Something that doesn't fit? " : "¿Algo que no cabe en ninguna? "}
            <button type="button" onClick={() => setAgregandoEn("otros")} className={enlace}>
              {isEnglish ? "Add it under Other" : "Agréguenlo en «Otros»"}
            </button>
          </p>
        ) : null}
        {aviso ? (
          <p role="alert" className="mt-3 text-sm text-error">
            {aviso}
          </p>
        ) : null}
        {!soloLectura ? (
          // Lo mismo que «Su boda» dice del presupuesto: son datos sobre su
          // dinero y la ley pide su permiso expreso, dicho donde se escriben.
          <p className="mt-4 max-w-[70ch] text-xs leading-relaxed text-tinta">
            {isEnglish
              ? "Amounts and payments are data about your money: by saving them here you allow us to keep them for your panel, and you can delete them whenever you want. "
              : "Los montos y pagos son datos sobre su dinero: al guardarlos aquí nos autorizan a guardarlos para su panel, y los pueden borrar cuando quieran. "}
            <Link href="/privacidad" className={enlace}>
              {isEnglish ? "Privacy notice" : "Aviso de privacidad"}
            </Link>
          </p>
        ) : null}
      </Reveal>
    </>
  );
}

function Etiqueta({ estado, isEnglish }: { estado: EstadoDeProveedor; isEnglish: boolean }) {
  // Tres pesos, como en el resto del panel: contratado lleno en azul noche,
  // cotizando en papel (sigue abierto) y descartado sólo el texto.
  const { texto, cls } =
    estado === "contratado"
      ? { texto: isEnglish ? "Booked" : "Contratado", cls: "border-noche bg-noche text-niebla" }
      : estado === "descartado"
        ? { texto: isEnglish ? "Dropped" : "Descartado", cls: "border-transparent text-tinta" }
        : { texto: isEnglish ? "Quoting" : "Cotizando", cls: "border-linea bg-papel text-noche" };
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] ${cls}`}>
      {texto}
    </span>
  );
}

/**
 * Las cotizaciones de una categoría, lado a lado: cuánto, qué incluye y la
 * liga para volver a verlas. «Elegir este» lo contrata y descarta a los demás.
 */
function Comparar({
  proveedores,
  soloLectura,
  trabajando,
  isEnglish,
  onElegir,
  onDecidir,
  onCerrar,
}: {
  proveedores: ProveedorDelPanel[];
  soloLectura: boolean;
  trabajando: boolean;
  isEnglish: boolean;
  onElegir: (p: ProveedorDelPanel) => void;
  /** Una cotización de la planner: «Nos quedamos con este» le avisa, no contrata. */
  onDecidir: (p: ProveedorDelPanel) => void;
  onCerrar: () => void;
}) {
  const conMonto = proveedores.filter((p) => p.cotizacion != null).map((p) => p.cotizacion!);
  const masBarato = conMonto.length > 1 ? Math.min(...conMonto) : null;
  return (
    <div className="border-t border-linea bg-papel px-4 py-4 sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-noche">{isEnglish ? "Side by side" : "Lado a lado"}</h3>
        <button type="button" onClick={onCerrar} className={chip}>
          {isEnglish ? "Close" : "Cerrar"}
        </button>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {proveedores.map((p) => (
          <div key={p.id} className="flex flex-col rounded-xl border border-linea bg-niebla p-4">
            <p className="text-sm font-medium text-noche">{p.nombre}</p>
            <p className="text-xs text-tinta">{nombreDeTipo(p.tipo, isEnglish)}</p>
            <p className="mt-3 text-2xl font-light text-noche tabular-nums">
              {p.cotizacion != null ? pesos(p.cotizacion) : "—"}
            </p>
            {p.cotizacion != null && masBarato != null && p.cotizacion === masBarato ? (
              <p className="text-[11px] uppercase tracking-[0.08em] text-tinta">{isEnglish ? "Lowest quote" : "La más baja"}</p>
            ) : null}
            {p.notas ? <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-tinta">{p.notas}</p> : null}
            {p.enlace ? (
              <a href={p.enlace} target="_blank" rel="noopener noreferrer" className={`mt-2 text-xs ${enlace}`}>
                {isEnglish ? "See their page" : "Ver su página"}
              </a>
            ) : null}
            {!soloLectura && p.esDeLaPareja ? (
              <button type="button" disabled={trabajando} onClick={() => onElegir(p)} className={`${chip} mt-4 self-start`}>
                {isEnglish ? "Choose this one" : "Elegir este"}
              </button>
            ) : !p.esDeLaPareja && p.decision?.tipo === "la_queremos" ? (
              <p className="mt-4 flex items-center gap-1.5 text-xs font-medium text-noche">
                {isEnglish ? "You told your planner: this one" : "Le dijeron a su planner: este"}
              </p>
            ) : !soloLectura && !p.esDeLaPareja && p.enviadaEn ? (
              <button type="button" disabled={trabajando} onClick={() => onDecidir(p)} className={`${chip} mt-4 self-start`}>
                {isEnglish ? "We'll go with this one" : "Nos quedamos con este"}
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-tinta">
        {isEnglish
          ? "Choosing one of yours books it and drops the others you were quoting here. You can undo it in each vendor."
          : "Elegir uno de los suyos lo contrata y descarta a los demás que cotizaban aquí. Se puede deshacer en cada proveedor."}
        {proveedores.some((p) => !p.esDeLaPareja)
          ? isEnglish
            ? " On your planner's quotes, “We'll go with this one” lets them know; they confirm the booking."
            : " En las cotizaciones de su planner, «Nos quedamos con este» le avisa y su planner confirma la contratación."
          : ""}
      </p>
    </div>
  );
}
