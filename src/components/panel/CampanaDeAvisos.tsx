"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { parseJsonSafe } from "@/lib/http";
import { haceCuanto, type AvisoDelPanel } from "@/lib/avisosDelPanel";

/**
 * LA CAMPANA del panel: lo que pasó y lo que se acerca.
 *
 * Lo que pasó lo escribe la base en el momento (su planner les escribió,
 * contestó un proveedor, confirmaron invitados, el asistente cambió algo); lo
 * que se acerca, el cron de cada mañana (un pago, una cita, una tarea, los
 * días que faltan). La campana sólo lee: /api/panel/avisos.
 *
 * El número es lo que ESTA persona no ha visto. Al abrir se marcan como vistos,
 * pero los nuevos siguen resaltados mientras la hoja esté abierta: si se
 * apagaran al instante no se sabría cuáles eran.
 */

const CADA = 2 * 60 * 1000;

export function CampanaDeAvisos({ isEnglish }: { isEnglish: boolean }) {
  const [avisos, setAvisos] = useState<AvisoDelPanel[] | null>(null);
  const [sinVer, setSinVer] = useState(0);
  const [abierta, setAbierta] = useState(false);
  // Los que eran nuevos al abrir: siguen resaltados hasta cerrar, aunque una
  // recarga (cada 2 min, al volver a la pestaña) ya los traiga como vistos.
  const [resaltados, setResaltados] = useState<Set<string>>(new Set());
  const abiertaRef = useRef(false);
  const raiz = useRef<HTMLDivElement | null>(null);
  const boton = useRef<HTMLButtonElement | null>(null);

  const marcarVistos = useCallback((nuevos: AvisoDelPanel[]) => {
    if (!nuevos.length) return;
    setResaltados((prev) => new Set([...Array.from(prev), ...nuevos.map((a) => a.id)]));
    setSinVer(0);
    fetch("/api/panel/avisos", { method: "POST" }).catch(() => {});
  }, []);

  const cargar = useCallback(async (): Promise<AvisoDelPanel[] | null> => {
    try {
      const r = await fetch("/api/panel/avisos", { cache: "no-store" });
      if (!r.ok) return null;
      const { data } = await parseJsonSafe<{ avisos: AvisoDelPanel[]; sinVer: number }>(r);
      if (!data) return null;
      setAvisos(data.avisos);
      // Con la hoja abierta, lo que llegue se ve en ese momento.
      if (abiertaRef.current) marcarVistos(data.avisos.filter((a) => a.nuevo));
      else setSinVer(data.sinVer);
      return data.avisos;
    } catch {
      // Sin red: la campana se queda como estaba.
      return null;
    }
  }, [marcarVistos]);

  useEffect(() => {
    cargar();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") cargar();
    }, CADA);
    const alVolver = () => {
      if (document.visibilityState === "visible") cargar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [cargar]);

  useEffect(() => {
    if (!abierta) return;
    const cerrar = () => {
      setAbierta(false);
      abiertaRef.current = false;
      setResaltados(new Set());
      setAvisos((prev) => prev?.map((a) => ({ ...a, nuevo: false })) ?? prev);
    };
    const fuera = (e: PointerEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) cerrar();
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cerrar();
        boton.current?.focus();
      }
    };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierta]);

  async function alternar() {
    const abrir = !abierta;
    setAbierta(abrir);
    abiertaRef.current = abrir;
    if (abrir) {
      const lista = avisos ?? (await cargar()) ?? [];
      marcarVistos(lista.filter((a) => a.nuevo));
    } else {
      // Al cerrar, lo que estaba nuevo ya se vio.
      setResaltados(new Set());
      setAvisos((prev) => prev?.map((a) => ({ ...a, nuevo: false })) ?? prev);
    }
  }

  const etiqueta =
    sinVer > 0
      ? isEnglish
        ? `Notifications, ${sinVer} new`
        : `Avisos, ${sinVer} ${sinVer === 1 ? "nuevo" : "nuevos"}`
      : isEnglish
        ? "Notifications"
        : "Avisos";

  return (
    <div ref={raiz} className="relative">
      <button
        ref={boton}
        type="button"
        onClick={alternar}
        aria-expanded={abierta}
        aria-haspopup="dialog"
        aria-label={etiqueta}
        title={etiqueta}
        className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full text-noche transition-[background-color,scale] duration-150 hover:bg-papel-medio active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 ${
          abierta ? "bg-papel-medio" : ""
        }`}
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.6} />
        {sinVer > 0 ? (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-vino px-1 text-[10.5px] font-medium leading-none text-niebla tabular-nums"
          >
            {sinVer > 9 ? "9+" : sinVer}
          </span>
        ) : null}
      </button>

      {abierta ? (
        <div
          role="dialog"
          aria-label={isEnglish ? "Notifications" : "Avisos"}
          className="animate-step-in fixed inset-x-3 top-[4.25rem] z-30 max-h-[70vh] overflow-y-auto rounded-2xl border border-linea bg-niebla shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+0.5rem)] sm:w-[24rem]"
        >
          <div className="sticky top-0 border-b border-linea bg-niebla px-5 py-4">
            <p className="text-sm font-medium text-noche">{isEnglish ? "Notifications" : "Avisos"}</p>
          </div>

          {avisos == null ? (
            <p className="px-5 py-6 text-sm text-tinta">{isEnglish ? "Loading…" : "Cargando…"}</p>
          ) : avisos.length === 0 ? (
            <p className="px-5 py-6 text-sm leading-relaxed text-tinta">
              {isEnglish
                ? "Nothing yet. When your planner writes, a vendor replies or a date gets close, you'll see it here."
                : "Nada por ahora. Cuando les escriban, conteste un proveedor o se acerque una fecha, va a aparecer aquí."}
            </p>
          ) : (
            <ul>
              {avisos.map((a) => {
                const nuevo = a.nuevo || resaltados.has(a.id);
                const contenido = (
                  <>
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${nuevo ? "bg-vino" : "bg-transparent"}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2">
                        <span className={`text-sm ${nuevo ? "font-medium text-noche" : "text-noche"}`}>
                          {a.titulo}
                        </span>
                        {a.urgente ? (
                          <span className="rounded-full bg-aviso-fondo px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-aviso">
                            {isEnglish ? "Soon" : "Pronto"}
                          </span>
                        ) : null}
                      </span>
                      {a.detalle ? (
                        <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-tinta">{a.detalle}</span>
                      ) : null}
                      <span className="mt-1 block text-[11px] text-tinta">
                        {haceCuanto(a.cuando, isEnglish)}
                        {nuevo ? <span className="sr-only">{isEnglish ? ", new" : ", nuevo"}</span> : null}
                      </span>
                    </span>
                  </>
                );
                const clase = "flex w-full items-start gap-3 border-b border-linea px-5 py-3.5 text-left last:border-b-0";
                return (
                  <li key={a.id}>
                    {a.enlace ? (
                      <Link
                        href={a.enlace}
                        onClick={() => {
                          setAbierta(false);
                          abiertaRef.current = false;
                          setResaltados(new Set());
                        }}
                        className={`${clase} transition-colors hover:bg-papel-medio`}
                      >
                        {contenido}
                      </Link>
                    ) : (
                      <div className={clase}>{contenido}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
