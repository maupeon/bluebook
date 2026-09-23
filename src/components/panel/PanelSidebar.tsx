"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, Home, Mail, Users, Wallet, Wine } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { countdownPhrase } from "@/components/panel/dates";
import type { SeccionesDelPanel } from "@/lib/seccionesDelPanel";

/**
 * Lo que el menú necesita saber para GUIAR, no sólo para enlazar.
 *
 * Se calcula en el servidor a partir del mismo bundle que pintan las pantallas,
 * para que el menú y la pantalla no puedan contradecirse. Ya pasó cuatro veces
 * en este proyecto que un número se recalcula en dos lados y diverge.
 */
export interface EstadoDelMenu {
  diasRestantes: number | null;
  invitadosPendientes: number;
  personasConfirmadas: number;
  dineroPorPagar: number;
  /** Lo contratado. Sin esto no se distingue "todo pagado" de "nada contratado". */
  dineroContratado: number;
  momentos: number;
  hayGuion: boolean;
  /** true si la pareja ya eligió su invitación (weddings.invitacion_id). */
  invitacionLista: boolean;
}

const pesos = (n: number) =>
  `$${Math.round(n).toLocaleString("es-MX")}`;

type Destino = {
  href: string;
  nombre: string;
  pista: string;
  Icono: typeof Home;
  /** true = hay algo que les toca ver aquí. Pinta el punto. */
  llama: boolean;
};

function destinos(e: EstadoDelMenu, isEnglish: boolean): Destino[] {
  const paso = e.diasRestantes == null || e.diasRestantes >= 0;

  const pistaHoy = countdownPhrase(e.diasRestantes, isEnglish);

  return [
    {
      href: "/panel",
      nombre: isEnglish ? "Today" : "Hoy",
      pista: pistaHoy,
      Icono: Home,
      llama: false,
    },
    {
      href: "/panel/invitados",
      nombre: isEnglish ? "Guests" : "Invitados",
      pista:
        e.invitadosPendientes > 0
          ? isEnglish
            ? `${e.invitadosPendientes} haven't replied`
            : `${e.invitadosPendientes} sin contestar`
          : isEnglish
            ? `${e.personasConfirmadas} people coming`
            : `Van ${e.personasConfirmadas} personas`,
      Icono: Users,
      llama: paso && e.invitadosPendientes > 0,
    },
    {
      href: "/panel/invitacion",
      nombre: isEnglish ? "Invitation" : "Invitación",
      pista: e.invitacionLista
        ? isEnglish
          ? "Ready to send"
          : "Lista para enviar"
        : isEnglish
          ? "Not chosen yet"
          : "Aún sin elegir",
      Icono: Mail,
      llama: paso && !e.invitacionLista,
    },
    {
      href: "/panel/dinero",
      nombre: isEnglish ? "Money" : "Dinero",
      // "Todo pagado" con cero contratado es mentira: no han pagado nada, es
      // que todavía no hay nada que pagar. Son dos estados distintos y una
      // pareja que apenas empieza merece ver el suyo.
      pista:
        e.dineroContratado <= 0
          ? isEnglish
            ? "Nothing contracted yet"
            : "Aún sin contratar"
          : e.dineroPorPagar > 0
            ? isEnglish
              ? `${pesos(e.dineroPorPagar)} to pay`
              : `${pesos(e.dineroPorPagar)} por pagar`
            : isEnglish
              ? "All paid up"
              : "Todo pagado",
      Icono: Wallet,
      llama: paso && e.dineroContratado > 0 && e.dineroPorPagar > 0,
    },
    {
      href: "/panel/dia",
      nombre: isEnglish ? "The day" : "El día",
      pista: e.hayGuion
        ? isEnglish
          ? `${e.momentos} moments`
          : `${e.momentos} momentos`
        : isEnglish
          ? "Not planned yet"
          : "Aún sin armar",
      Icono: CalendarClock,
      llama: false,
    },
    {
      href: "/panel/barra",
      nombre: isEnglish ? "The bar" : "La barra",
      pista: isEnglish ? "What to buy" : "Qué comprar",
      Icono: Wine,
      llama: false,
    },
  ];
}

function esActivo(pathname: string, href: string): boolean {
  // "/panel" sólo se activa consigo mismo; si no, se quedaría encendido en
  // todas las hijas y el menú dejaría de decir dónde estás.
  return href === "/panel" ? pathname === "/panel" : pathname.startsWith(href);
}

export function PanelSidebar({
  estado,
  secciones,
}: {
  estado: EstadoDelMenu;
  /** Qué destinos se enseñan. Ver seccionesDelPanel: la misma regla que Hoy y las rutas. */
  secciones: SeccionesDelPanel;
}) {
  const { isEnglish } = useLanguage();
  const pathname = usePathname();
  const items = destinos(estado, isEnglish).filter(
    ({ href }) =>
      (href !== "/panel/dinero" || secciones.dinero) &&
      (href !== "/panel/dia" || secciones.dia)
  );

  return (
    <>
      {/* Escritorio: columna a la izquierda */}
      <nav
        aria-label={isEnglish ? "Panel sections" : "Secciones del panel"}
        className="hidden w-64 shrink-0 flex-col gap-1 border-r border-sand bg-sand-soft/50 p-3 md:flex"
      >
        {items.map(({ href, nombre, pista, Icono, llama }) => {
          const activo = esActivo(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={activo ? "page" : undefined}
              className={`group flex min-h-[3.5rem] items-center gap-3 rounded-xl border px-3 py-2 transition-[background-color,border-color,scale] duration-150 active:scale-[0.985] ${
                activo
                  ? "border-sand bg-white shadow-[0_1px_3px_rgba(29,46,75,0.07)]"
                  : "border-transparent hover:bg-white/60"
              }`}
            >
              <Icono
                className={`h-[18px] w-[18px] shrink-0 ${activo ? "text-terra-deep" : "text-ink-muted"}`}
                strokeWidth={1.6}
              />
              <span className="flex min-w-0 flex-col">
                <span
                  className={`font-body text-sm ${activo ? "font-semibold text-ink" : "text-ink-soft"}`}
                >
                  {nombre}
                </span>
                <span className="truncate font-body text-[11.5px] text-ink-muted">
                  {pista}
                </span>
              </span>
              {llama ? (
                <span
                  aria-hidden="true"
                  className="ml-auto h-[7px] w-[7px] shrink-0 rounded-full bg-terra"
                />
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* Teléfono: el mismo menú, abajo. No cabe una columna en 375 px. */}
      <nav
        aria-label={isEnglish ? "Panel sections" : "Secciones del panel"}
        className="fixed inset-x-0 bottom-0 z-20 flex gap-1 border-t border-sand bg-sand-soft/85 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden"
      >
        {items.map(({ href, nombre, pista, Icono, llama }) => {
          const activo = esActivo(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={activo ? "page" : undefined}
              className={`relative flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-1 rounded-xl border transition-[background-color,border-color,scale] duration-150 active:scale-[0.97] ${
                activo ? "border-sand bg-white" : "border-transparent"
              }`}
            >
              <Icono
                className={`h-[18px] w-[18px] ${activo ? "text-terra-deep" : "text-ink-muted"}`}
                strokeWidth={1.6}
              />
              <span
                className={`font-body text-[10.5px] leading-none ${activo ? "font-semibold text-ink" : "text-ink-muted"}`}
              >
                {nombre}
              </span>
              {llama ? (
                <>
                  <span
                    aria-hidden="true"
                    className="absolute right-3 top-2 h-[6px] w-[6px] rounded-full bg-terra-deep"
                  />
                  {/* En escritorio la pista ("36 sin contestar") se lee sola.
                      Aquí no cabe, así que el punto era la única señal — y era
                      aria-hidden, o sea que para un lector no existía. */}
                  <span className="sr-only">{pista}</span>
                </>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
