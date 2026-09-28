"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, Home, Images, Mail, Users, Wallet, Wine } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { countdownPhrase } from "@/components/panel/dates";
import type { SeccionesDelPanel } from "@/lib/seccionesDelPanel";
import { textoDeDias, type AccesoDeLaBoda } from "@/lib/accesoDeLaBoda";
import { pistaDelAlbum, type AlbumDelPanel } from "@/components/album/estadoDelAlbum";

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
  /** Cuántos hay en la lista. Cero = lo primero que les toca es hacerla. */
  invitadosTotales: number;
  personasConfirmadas: number;
  dineroPorPagar: number;
  /** Lo contratado. Sin esto no se distingue "todo pagado" de "nada contratado". */
  dineroContratado: number;
  momentos: number;
  hayGuion: boolean;
  /** true si la pareja ya eligió su invitación (weddings.invitacion_id). */
  invitacionLista: boolean;
  /** El álbum de la boda (leerEstadoDelAlbum), o null si todavía no tienen. */
  album: AlbumDelPanel | null;
  /** Tienen el Planner completo, que incluye el álbum aunque aún no exista. */
  albumIncluido: boolean;
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
        e.invitadosTotales === 0
          ? isEnglish
            ? "No list yet"
            : "Aún sin lista"
          : e.invitadosPendientes > 0
            ? isEnglish
              ? `${e.invitadosPendientes} haven't replied`
              : `${e.invitadosPendientes} sin contestar`
            : isEnglish
              ? `${e.personasConfirmadas} people coming`
              : `Van ${e.personasConfirmadas} personas`,
      Icono: Users,
      // Una lista vacía también llama: en una boda recién nacida (una prueba)
      // es lo primero que hay que hacer, y sin el punto Invitados era el único
      // destino que no decía nada.
      llama: paso && (e.invitadosTotales === 0 || e.invitadosPendientes > 0),
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
    {
      // El último a propósito: es lo que viene después de la boda.
      href: "/panel/album",
      nombre: isEnglish ? "Album" : "Álbum",
      pista: pistaDelAlbum(e.album, e.albumIncluido, isEnglish),
      Icono: Images,
      // Desde el día de la boda, un álbum vacío llama: es cuando sus
      // invitados tienen las fotos en el celular.
      llama:
        e.album != null &&
        e.album.fotos === 0 &&
        e.diasRestantes != null &&
        e.diasRestantes <= 0,
    },
  ];
}

function esActivo(pathname: string, href: string): boolean {
  // "/panel" sólo se activa consigo mismo; si no, se quedaría encendido en
  // todas las hijas y el menú dejaría de decir dónde estás.
  return href === "/panel" ? pathname === "/panel" : pathname.startsWith(href);
}

/**
 * La pista de la prueba, al pie del menú de escritorio. Discreta a propósito:
 * la franja de arriba ya lo dice en todas las pantallas (y en el teléfono es
 * la única, porque en la barra de abajo ya van hasta siete destinos y no cabe
 * uno más).
 */
function PistaDePrueba({
  acceso,
  activo,
  isEnglish,
}: {
  acceso: AccesoDeLaBoda;
  activo: boolean;
  isEnglish: boolean;
}) {
  const vencida = acceso.acceso === "prueba_vencida";
  const estado = vencida
    ? isEnglish
      ? "Read-only"
      : "Solo lectura"
    : textoDeDias(acceso, isEnglish);
  return (
    <div className="mt-auto border-t border-linea px-3 pt-3">
      <p className="text-xs leading-snug text-tinta">{estado}</p>
      <Link
        href="/panel/plan"
        aria-current={activo ? "page" : undefined}
        className={`inline-flex min-h-[2.75rem] items-center text-sm text-noche underline decoration-linea-control underline-offset-4 transition-colors duration-150 hover:decoration-noche ${
          activo ? "font-medium decoration-noche" : ""
        }`}
      >
        {isEnglish ? "Choose a plan" : "Elegir plan"}
      </Link>
    </div>
  );
}

export function PanelSidebar({
  estado,
  secciones,
  acceso = null,
}: {
  estado: EstadoDelMenu;
  /** Qué destinos se enseñan. Ver seccionesDelPanel: la misma regla que Hoy y las rutas. */
  secciones: SeccionesDelPanel;
  /** De v_acceso_de_la_boda (leerAcceso). Solo pinta algo en prueba o vencida. */
  acceso?: AccesoDeLaBoda | null;
}) {
  const { isEnglish } = useLanguage();
  const pathname = usePathname();
  const items = destinos(estado, isEnglish).filter(
    ({ href }) =>
      (href !== "/panel/dinero" || secciones.dinero) &&
      (href !== "/panel/dia" || secciones.dia) &&
      (href !== "/panel/album" || secciones.album)
  );
  // Con los siete destinos (boda con planner), la barra del teléfono se
  // aprieta: menos hueco entre botones y la letra medio punto más chica, para
  // que «Invitación» quepa en 375px sin cortarse. Con seis o menos, como era.
  const apretada = items.length > 6;

  return (
    <>
      {/* Escritorio: columna a la izquierda. Es una superficie, así que es
          niebla con su regla en azul línea, como las tarjetas.
          El destino activo se hunde en papel azul y lleva una pestaña azul
          noche en el borde, el nombre en Medium y el trazo del icono más
          grueso: tres señales que no dependen de distinguir dos azules
          claros. (Un bloque azul noche lo habría dicho más fuerte, pero
          competía con el botón principal de cada pantalla.) */}
      <nav
        aria-label={isEnglish ? "Panel sections" : "Secciones del panel"}
        className="hidden w-64 shrink-0 flex-col gap-1 border-r border-linea bg-niebla p-3 md:flex"
      >
        {items.map(({ href, nombre, pista, Icono, llama }) => {
          const activo = esActivo(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={activo ? "page" : undefined}
              className={`group relative flex min-h-[3.5rem] items-center gap-3 rounded-xl border px-3 py-2 transition-[background-color,border-color,scale] duration-150 active:scale-[0.985] active:duration-100 motion-reduce:active:scale-100 ${
                activo
                  ? "border-linea bg-papel"
                  : "border-transparent hover:bg-papel-medio"
              }`}
            >
              {activo ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-noche"
                />
              ) : null}
              <Icono
                className={`h-[18px] w-[18px] shrink-0 ${activo ? "text-noche" : "text-tinta"}`}
                strokeWidth={activo ? 2 : 1.6}
              />
              <span className="flex min-w-0 flex-col">
                <span
                  className={`text-sm ${activo ? "font-medium text-noche" : "text-tinta"}`}
                >
                  {nombre}
                </span>
                <span className="truncate text-xs text-tinta">
                  {pista}
                </span>
              </span>
              {llama ? (
                <span
                  aria-hidden="true"
                  className="ml-auto h-[7px] w-[7px] shrink-0 rounded-full bg-tinta"
                />
              ) : null}
            </Link>
          );
        })}
        {acceso && (acceso.acceso === "prueba" || acceso.acceso === "prueba_vencida") ? (
          <PistaDePrueba
            acceso={acceso}
            activo={pathname.startsWith("/panel/plan")}
            isEnglish={isEnglish}
          />
        ) : null}
      </nav>

      {/* Teléfono: el mismo menú, abajo. No cabe una columna en 375 px.
          Niebla sólida, como la columna de escritorio: el único material
          translúcido del panel es la barra de arriba. */}
      <nav
        aria-label={isEnglish ? "Panel sections" : "Secciones del panel"}
        className={`fixed inset-x-0 bottom-0 z-20 flex border-t border-linea bg-niebla pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 md:hidden ${
          apretada ? "gap-0.5 px-1" : "gap-1 px-2"
        }`}
      >
        {items.map(({ href, nombre, pista, Icono, llama }) => {
          const activo = esActivo(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={activo ? "page" : undefined}
              className={`relative flex min-h-[3.25rem] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl border transition-[background-color,border-color,scale] duration-150 active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 ${
                activo ? "border-linea bg-papel" : "border-transparent"
              }`}
            >
              <Icono
                className={`h-[18px] w-[18px] ${activo ? "text-noche" : "text-tinta"}`}
                strokeWidth={activo ? 2 : 1.6}
              />
              {/* max-w-full + truncate: en un teléfono de 320px con siete
                  destinos, el nombre se recorta en vez de empujar a los demás
                  fuera de la pantalla. El recorte esconde lo que sale de la
                  caja: con leading-none se comería el acento de «Álbum» y la
                  cola de la «y» de «Hoy», por eso el interlineado un poco más
                  alto. */}
              <span
                className={`max-w-full truncate leading-[1.25] ${apretada ? "text-[10px]" : "text-[10.5px]"} ${
                  activo ? "font-medium text-noche" : "font-normal text-tinta"
                }`}
              >
                {nombre}
              </span>
              {llama ? (
                <>
                  <span
                    aria-hidden="true"
                    className="absolute right-3 top-2 h-[6px] w-[6px] rounded-full bg-tinta"
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
