"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, ExternalLink } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { Eyebrow } from "@/components/panel/sections";
import { Titular } from "@/components/marca/Titular";
import { AdministrarAlbum } from "@/components/album/AdministrarAlbum";
import { MuestraDelAlbum } from "@/components/album/MuestraDelAlbum";
import {
  tieneLimiteDeFotos,
  type AlbumDelPanel,
} from "@/components/album/estadoDelAlbum";
import {
  ALBUM_PLAN_ORDER,
  getLocalizedAlbumPlans,
  isUnlimitedPhotosPlan,
  type AlbumPlan,
  type AlbumPlanId,
} from "@/lib/albumPlans";
import { AGENT_PLAN } from "@/lib/weddingPlans";
import { estaEnPrueba, type AccesoDeLaBoda } from "@/lib/accesoDeLaBoda";
import { urlPublicaDeLaApp } from "@/lib/urlDeLaApp";

/*
 * LA SECCIÓN ÁLBUM DEL PANEL. Dos caras:
 *
 *   - Con álbum: lo administran aquí mismo (AdministrarAlbum, con la sesión y
 *     sin enlace secreto), con el enlace del visor para compartir, su plan y de
 *     dónde salió. Un álbum pagado se edita aunque la prueba del panel haya
 *     vencido: el álbum es suyo para siempre.
 *   - Sin álbum: una muestra de lo que es y cómo tenerlo. En la prueba del
 *     Planner, dos caminos (elegir el plan, que lo incluye Ilimitado, o
 *     comprar sólo el álbum); en «Solo invitaciones», sólo la compra.
 *
 * La compra la abre POST /api/panel/album/comprar (frente C) y vuelve aquí con
 * ?session_id=, que registra el pago en el servidor (page.tsx).
 */

// El botón principal de la marca: azul noche, uno por tarjeta. Responde al
// presionar, no al soltar.
const botonPrincipal =
  "group inline-flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-full bg-noche px-5 py-2.5 text-sm font-medium text-niebla transition-[background-color,scale,opacity] duration-150 hover:bg-noche-suave active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 disabled:opacity-60 disabled:hover:bg-noche disabled:active:scale-100 sm:w-auto";

// El secundario: niebla con borde de campo.
const botonSecundario =
  "inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-full border border-linea-control/60 bg-niebla px-5 py-2.5 text-sm font-medium text-noche transition-[background-color,border-color,scale,opacity] duration-150 hover:border-linea-control hover:bg-papel-medio active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 disabled:opacity-60 disabled:active:scale-100";

// Terciario: noche con el subrayado en azul línea.
const claseEnlace =
  "text-noche underline decoration-linea-control underline-offset-4 transition-[text-decoration-color] duration-150 hover:decoration-noche";

// El precio va en una franja de papel azul a todo lo ancho de la tarjeta,
// como en Su plan: la guía deja el papel azul para lo informativo y los
// precios. La cifra, en Work Sans Light.
const franjaDePrecio = "-mx-6 mt-5 border-y border-linea bg-papel px-6 py-5 sm:-mx-8 sm:px-8";
const claseCifra = "text-5xl font-light leading-none text-noche tabular-nums";

const flecha =
  "h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none";

/** "$2,000": el MXN va aparte, en chico. */
const cifra = (n: number) => `$${n.toLocaleString("es-MX")}`;

/** Un aviso tranquilo arriba de la pantalla: niebla, borde línea, texto noche. */
function Aviso({ children, rol = "status" }: { children: React.ReactNode; rol?: "status" | "alert" }) {
  return (
    <p
      role={rol}
      className="mt-5 max-w-2xl rounded-2xl border border-linea bg-niebla px-5 py-4 text-sm leading-relaxed text-noche"
    >
      {children}
    </p>
  );
}

function Incluye({ cosas }: { cosas: string[] }) {
  return (
    <ul className="mt-6 space-y-3 border-t border-linea pt-6">
      {cosas.map((cosa) => (
        <li key={cosa} className="flex gap-3 text-sm leading-relaxed text-tinta">
          <Check aria-hidden="true" className="mt-[3px] h-4 w-4 shrink-0 text-tinta" strokeWidth={1.8} />
          <span>{cosa}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Abrir el pago de un álbum. La ruta la hace el frente C:
 * 200 { url } · 401 sin sesión · 404 sin boda · 409 { error } si ya tienen
 * ese plan o uno mayor.
 */
function useComprarAlbum(isEnglish: boolean) {
  const [enviando, setEnviando] = useState<AlbumPlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function comprar(planId: AlbumPlanId) {
    setEnviando(planId);
    setError(null);
    try {
      const res = await fetch("/api/panel/album/comprar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!res.ok || !data?.url) {
        const porDefecto = isEnglish ? "We couldn't open the payment. Try again." : "No pudimos abrir el pago. Intenten de nuevo.";
        const mensaje =
          res.status === 401
            ? isEnglish
              ? "Your session ended. Sign in to your panel again to continue."
              : "Su sesión terminó. Vuelvan a entrar a su panel para seguir."
            : res.status === 409
              ? data?.error ||
                (isEnglish
                  ? "Your album already has this plan or a bigger one."
                  : "Su álbum ya tiene este plan o uno mayor.")
              : data?.error || porDefecto;
        throw new Error(mensaje);
      }
      // Se queda en «Abriendo…» mientras el navegador se va a Stripe.
      window.location.assign(data.url);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : isEnglish
            ? "We couldn't open the payment. Try again."
            : "No pudimos abrir el pago. Intenten de nuevo."
      );
      setEnviando(null);
    }
  }

  return { comprar, enviando, error };
}

/** «Hasta 200 fotos» / «Fotos ilimitadas». */
function textoDelLimite(limite: number, isEnglish: boolean): string {
  if (isUnlimitedPhotosPlan(limite)) return isEnglish ? "Unlimited photos" : "Fotos ilimitadas";
  return isEnglish ? `Up to ${limite} photos` : `Hasta ${limite} fotos`;
}

export function PantallaAlbum({
  album,
  pareja,
  fecha,
  acceso,
  incluido,
  diasRestantes,
  listo,
  pagoEnCamino,
}: {
  album: AlbumDelPanel | null;
  /** Para la portada de la muestra. */
  pareja: string | null;
  fecha: string | null;
  acceso: AccesoDeLaBoda;
  /** La boda tiene el Planner completo, que trae el álbum Ilimitado. */
  incluido: boolean;
  /** Resuelto en el servidor, como en Hoy. */
  diasRestantes: number | null;
  /** Volvieron de Stripe y el pago del álbum quedó registrado (?listo=1). */
  listo: boolean;
  /** Volvieron de Stripe pero el pago todavía no se ve. */
  pagoEnCamino: boolean;
}) {
  const { isEnglish } = useLanguage();
  const yaFue = diasRestantes != null && diasRestantes < 0;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <Reveal app>
        <header>
          <Eyebrow>{isEnglish ? "Your album" : "Su álbum"}</Eyebrow>
          {/* El <em> no se inclina: dentro del titular cambia a tinta. */}
          <Titular as="h1" tamano="pantalla" alinear="inicio" className="mt-3">
            {album ? (
              yaFue ? (
                <>
                  {isEnglish ? "Your wedding " : "Sus fotos de la "}
                  <em>{isEnglish ? "photos" : "boda"}</em>
                </>
              ) : (
                <>
                  {isEnglish ? "Your wedding " : "Su álbum de "}
                  <em>{isEnglish ? "album" : "boda"}</em>
                </>
              )
            ) : (
              <>
                {isEnglish ? "All your photos, " : "Todas sus fotos, "}
                <em>{isEnglish ? "in one album" : "en un álbum"}</em>
              </>
            )}
          </Titular>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-tinta">
            {album
              ? isEnglish
                ? "Upload your photos, put them in order and create the QR codes so your guests can upload theirs from their phones, no account needed. The album is yours for good."
                : "Suban sus fotos, ordénenlas y creen los QR para que sus invitados suban las suyas desde el celular, sin crear cuenta. El álbum es suyo para siempre."
              : isEnglish
                ? "A digital album where you and your guests gather the wedding photos: they upload from their phones with a QR, no account needed, and you share it all with one link. It looks like this:"
                : "Un álbum digital donde ustedes y sus invitados juntan las fotos de la boda: ellos suben desde su celular con un QR, sin crear cuenta, y ustedes lo comparten con un enlace. Se ve así:"}
          </p>
          {listo ? (
            <Aviso>
              {isEnglish
                ? "Done: your album is yours. Share the QR with your guests whenever you like."
                : "Listo: su álbum ya es suyo. Compartan el QR con sus invitados cuando quieran."}
            </Aviso>
          ) : null}
          {pagoEnCamino ? (
            <Aviso>
              {isEnglish
                ? "If you already paid, your album will show up here in a few minutes. There's no need to pay again."
                : "Si ya pagaron, en unos minutos su álbum aparece aquí. No hace falta pagar otra vez."}
            </Aviso>
          ) : null}
          {/* Con la prueba vencida no hace falta aviso aquí: en esta ruta la
              franja de arriba ya dice que el álbum sigue abierto y lo demás
              queda en solo lectura (FranjaDePrueba). */}
        </header>
      </Reveal>

      {album ? (
        <ConAlbum album={album} acceso={acceso} incluido={incluido} isEnglish={isEnglish} />
      ) : (
        <SinAlbum
          pareja={pareja}
          fecha={fecha}
          acceso={acceso}
          incluido={incluido}
          isEnglish={isEnglish}
        />
      )}
    </div>
  );
}

// ----- Con álbum -----

function ConAlbum({
  album,
  acceso,
  incluido,
  isEnglish,
}: {
  album: AlbumDelPanel;
  acceso: AccesoDeLaBoda;
  incluido: boolean;
  isEnglish: boolean;
}) {
  const [copiado, setCopiado] = useState(false);
  const planes = getLocalizedAlbumPlans(isEnglish ? "en" : "es");
  const plan = album.plan ? planes.find((p) => p.id === album.plan) ?? null : null;
  const ruta = `/album/${album.slug}`;
  // El visor vive en este mismo sitio. Para enseñarlo se usa la URL pública
  // configurada (si la hay) sin el protocolo; al copiar, el origen real del
  // navegador, que siempre es el correcto.
  const rutaVisible = `${urlPublicaDeLaApp().replace(/^https?:\/\//, "")}${ruta}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(new URL(ruta, window.location.origin).toString());
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso para el portapapeles: el enlace sigue a la vista para
      // copiarlo a mano.
    }
  }

  const nombreDelPlan = plan
    ? plan.name
    : isUnlimitedPhotosPlan(album.limiteDeFotos)
      ? isEnglish
        ? "Unlimited"
        : "Ilimitado"
      : isEnglish
        ? "Album"
        : "Álbum";
  const origen =
    album.origen === "plan"
      ? isEnglish
        ? "Included in your Full planner"
        : "Incluido en su Planner completo"
      : album.origen === "compra"
        ? isEnglish
          ? "Purchased"
          : "Comprado"
        : null;

  // Subir de plan: sólo si hoy tiene tope. Los planes que siguen, en orden.
  const conTope = tieneLimiteDeFotos(album.limiteDeFotos);
  const mayores: AlbumPlan[] = conTope
    ? planes.filter((p) =>
        album.plan
          ? ALBUM_PLAN_ORDER.indexOf(p.id) > ALBUM_PLAN_ORDER.indexOf(album.plan)
          : p.maxPhotos > album.limiteDeFotos
      )
    : [];

  return (
    <>
      <Reveal app className="mt-8">
        <section
          aria-label={isEnglish ? "About your album" : "Sobre su álbum"}
          className="panel-card p-5 sm:p-6"
        >
          {/* Datos y botones lado a lado sólo en pantallas anchas: con la barra
              lateral, a 1024px «Incluido en su Planner completo» se partiría
              en tres renglones. */}
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <dl className="grid gap-5 sm:grid-cols-3">
              <div>
                <dt className="rotulo">Plan</dt>
                <dd className="mt-1.5 text-lg font-medium text-noche">{nombreDelPlan}</dd>
              </div>
              {origen ? (
                <div>
                  <dt className="rotulo">{isEnglish ? "How you got it" : "Cómo lo tienen"}</dt>
                  <dd className="mt-1.5 text-lg font-medium text-noche">{origen}</dd>
                </div>
              ) : null}
              <div>
                <dt className="rotulo">{isEnglish ? "Photo limit" : "Límite de fotos"}</dt>
                <dd className="mt-1.5 text-lg font-medium text-noche tabular-nums">
                  {textoDelLimite(album.limiteDeFotos, isEnglish)}
                </dd>
              </div>
            </dl>

            <div className="min-w-0">
              <div className="flex flex-col gap-2 sm:flex-row">
                <a href={ruta} target="_blank" rel="noopener noreferrer" className={botonPrincipal}>
                  {isEnglish ? "View your album" : "Ver su álbum"}
                  <ExternalLink aria-hidden="true" className="h-4 w-4" strokeWidth={1.6} />
                </a>
                <button type="button" onClick={copiar} className={botonSecundario}>
                  {copiado ? (
                    <Check aria-hidden="true" className="h-4 w-4 text-tinta" strokeWidth={1.8} />
                  ) : (
                    <Copy aria-hidden="true" className="h-4 w-4" strokeWidth={1.6} />
                  )}
                  <span aria-live="polite">
                    {copiado
                      ? isEnglish
                        ? "Link copied"
                        : "Enlace copiado"
                      : isEnglish
                        ? "Copy the link"
                        : "Copiar el enlace"}
                  </span>
                </button>
              </div>
              <p className="mt-2 break-all text-xs text-tinta xl:text-right">{rutaVisible}</p>
            </div>
          </div>

          {mayores.length > 0 ? (
            <MasFotos
              mayores={mayores}
              enPrueba={estaEnPrueba(acceso) && !incluido}
              isEnglish={isEnglish}
            />
          ) : null}
        </section>
      </Reveal>

      {/* Sin Reveal alrededor: sus hojas son position:fixed y no deben
          quedar dentro de un bloque que se anima. */}
      <div className="mt-8">
        <AdministrarAlbum slug={album.slug} enPanel />
      </div>
    </>
  );
}

/** Subir de plan cuando el álbum tiene tope. La compra reemplaza, nunca baja. */
function MasFotos({
  mayores,
  enPrueba,
  isEnglish,
}: {
  mayores: AlbumPlan[];
  enPrueba: boolean;
  isEnglish: boolean;
}) {
  const { comprar, enviando, error } = useComprarAlbum(isEnglish);
  return (
    <div className="mt-6 border-t border-linea pt-5">
      <p className="text-sm font-medium text-noche">
        {isEnglish ? "Need more photos?" : "¿Necesitan más fotos?"}
      </p>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-tinta">
        {isEnglish
          ? "Move up a plan with a single payment. Everything already in your album stays."
          : "Suban de plan con un solo pago. Todo lo que ya está en su álbum se queda."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {mayores.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => comprar(p.id)}
            disabled={enviando != null}
            className={botonSecundario}
          >
            {enviando === p.id
              ? isEnglish
                ? "Opening…"
                : "Abriendo…"
              : `${p.maxPhotosLabel} · ${cifra(p.priceMx)} MXN`}
          </button>
        ))}
      </div>
      {enPrueba ? (
        <p className="mt-3 text-xs leading-relaxed text-tinta">
          {isEnglish ? "Or choose the Full planner, which includes it unlimited: " : "O elijan el Planner completo, que lo incluye ilimitado: "}
          <Link href="/panel/plan" className={`font-medium ${claseEnlace}`}>
            {isEnglish ? "choose a plan" : "elegir plan"}
          </Link>
          .
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

// ----- Sin álbum -----

function SinAlbum({
  pareja,
  fecha,
  acceso,
  incluido,
  isEnglish,
}: {
  pareja: string | null;
  fecha: string | null;
  acceso: AccesoDeLaBoda;
  incluido: boolean;
  isEnglish: boolean;
}) {
  // En la prueba el Planner completo es un camino; con «Solo invitaciones»
  // (o una boda sin prueba) /panel/plan ya no ofrece nada que elegir.
  const enPrueba = estaEnPrueba(acceso);

  return (
    <>
      <Reveal app className="mt-10">
        <MuestraDelAlbum pareja={pareja} fecha={fecha} isEnglish={isEnglish} />
      </Reveal>

      {incluido && !enPrueba ? (
        // Tienen el Planner completo y el álbum todavía no aparece: la
        // página intentó crearlo y no pudo. No se les vende lo que ya pagaron.
        <Reveal app className="mt-8">
          <p
            role="status"
            className="max-w-2xl rounded-2xl border border-linea bg-niebla px-5 py-4 text-sm leading-relaxed text-noche"
          >
            {isEnglish
              ? "Your album comes with your Full planner, and we're getting it ready. Reload in a moment; if it doesn't show up, write to us from the chat in "
              : "Su álbum viene incluido en su Planner completo y lo estamos preparando. Recarguen en un momento; si no aparece, escríbannos desde el chat de "}
            <Link href="/panel" className={`font-medium ${claseEnlace}`}>
              {isEnglish ? "Today" : "Hoy"}
            </Link>
            .
          </p>
        </Reveal>
      ) : (
        <div className={`mt-8 grid items-stretch gap-6 ${enPrueba ? "md:grid-cols-2" : "max-w-2xl"}`}>
          {enPrueba ? (
            <Reveal app className="h-full">
              <ConSuPlan isEnglish={isEnglish} />
            </Reveal>
          ) : null}
          <Reveal app className="h-full">
            <SoloElAlbum enPrueba={enPrueba} isEnglish={isEnglish} />
          </Reveal>
        </div>
      )}
    </>
  );
}

/** El camino del plan: el Planner completo trae el álbum Ilimitado. */
function ConSuPlan({ isEnglish }: { isEnglish: boolean }) {
  return (
    <section aria-labelledby="album-con-su-plan" className="panel-card flex h-full flex-col p-6 sm:p-8">
      <Eyebrow>{isEnglish ? "Included" : "Incluido"}</Eyebrow>
      <h2 id="album-con-su-plan" className="mt-3 text-2xl font-medium text-noche">
        {isEnglish ? AGENT_PLAN.en.name : AGENT_PLAN.es.name}
      </h2>
      <div className={franjaDePrecio}>
        <p className="flex min-h-[3rem] flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className={claseCifra}>{isEnglish ? "Unlimited" : "Ilimitado"}</span>
          <span className="text-sm text-tinta">{isEnglish ? "album included" : "álbum incluido"}</span>
        </p>
      </div>
      <p className="mt-5 text-sm leading-relaxed text-tinta">
        {isEnglish
          ? "The unlimited album comes with your plan, along with the whole panel and your wedding planner."
          : "El álbum Ilimitado viene con su plan, junto con todo el panel y su wedding planner."}
      </p>
      <Incluye
        cosas={
          isEnglish
            ? [
                "Unlimited photos, from you and your guests.",
                "The QR for your guests, no account needed.",
                "If you ever cancel the plan, the album stays yours.",
              ]
            : [
                "Fotos ilimitadas, suyas y de sus invitados.",
                "El QR para sus invitados, sin crear cuenta.",
                "Si un día cancelan el plan, el álbum se queda con ustedes.",
              ]
        }
      />
      <div className="mt-auto pt-8">
        <Link href="/panel/plan" className={botonPrincipal}>
          {isEnglish ? "Choose a plan" : "Elegir plan"}
          <ArrowRight aria-hidden="true" className={flecha} strokeWidth={1.6} />
        </Link>
      </div>
    </section>
  );
}

/** El camino de la compra suelta: los tres planes del álbum. */
function SoloElAlbum({ enPrueba, isEnglish }: { enPrueba: boolean; isEnglish: boolean }) {
  const planes = getLocalizedAlbumPlans(isEnglish ? "en" : "es");
  // El de en medio de entrada: es el más elegido en /album-digital.
  const [planId, setPlanId] = useState<AlbumPlanId>("album_200");
  const plan = planes.find((p) => p.id === planId) ?? planes[0];
  const { comprar, enviando, error } = useComprarAlbum(isEnglish);

  return (
    <section aria-labelledby="album-solo" className="panel-card flex h-full flex-col p-6 sm:p-8">
      <Eyebrow>{isEnglish ? "One payment" : "Un solo pago"}</Eyebrow>
      <h2 id="album-solo" className="mt-3 text-2xl font-medium text-noche">
        {isEnglish ? "Just the album" : "Sólo el álbum"}
      </h2>
      <div className={franjaDePrecio}>
        <p className="flex min-h-[3rem] items-baseline gap-2" aria-live="polite">
          <span className={claseCifra}>{cifra(plan.priceMx)}</span>
          <span className="text-sm text-tinta">{isEnglish ? "MXN, once" : "MXN, una vez"}</span>
        </p>
      </div>

      <fieldset className="mt-5">
        <legend className="text-[11px] font-medium uppercase tracking-[0.1em] text-tinta">
          {isEnglish ? "How many photos" : "Cuántas fotos"}
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {planes.map((p) => {
            const elegido = p.id === planId;
            return (
              <label
                key={p.id}
                // Lo elegido se marca con borde noche (el anillo lo engruesa
                // sin mover nada), no con fondo oscuro. Como los tramos de
                // Su plan.
                className={`inline-flex min-h-[2.75rem] cursor-pointer items-center rounded-full border px-4 text-sm transition-[background-color,border-color,color,box-shadow] duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-noche/40 ${
                  elegido
                    ? "border-noche bg-papel text-noche ring-1 ring-noche"
                    : "border-linea-control/60 bg-niebla text-tinta hover:border-linea-control hover:bg-papel-medio hover:text-noche"
                }`}
              >
                <input
                  type="radio"
                  name="plan-del-album"
                  value={p.id}
                  checked={elegido}
                  onChange={() => setPlanId(p.id)}
                  className="sr-only"
                />
                {p.maxPhotosLabel}
              </label>
            );
          })}
        </div>
      </fieldset>

      <Incluye
        cosas={
          isEnglish
            ? [
                isUnlimitedPhotosPlan(plan.maxPhotos)
                  ? "Unlimited photos, from you and your guests."
                  : `Up to ${plan.maxPhotos} photos, from you and your guests.`,
                "The QR for your guests, no account needed.",
                "One link to share the whole album.",
                "Yours for good. Nothing renews.",
              ]
            : [
                isUnlimitedPhotosPlan(plan.maxPhotos)
                  ? "Fotos ilimitadas, suyas y de sus invitados."
                  : `Hasta ${plan.maxPhotos} fotos, suyas y de sus invitados.`,
                "El QR para sus invitados, sin crear cuenta.",
                "Un enlace para compartir todo el álbum.",
                "Es suyo para siempre. Nada se renueva.",
              ]
        }
      />

      <div className="mt-auto pt-8">
        <button
          type="button"
          onClick={() => comprar(plan.id)}
          disabled={enviando != null}
          className={botonPrincipal}
        >
          {enviando
            ? isEnglish
              ? "Opening…"
              : "Abriendo…"
            : isEnglish
              ? `Buy the album · ${cifra(plan.priceMx)}`
              : `Comprar el álbum · ${cifra(plan.priceMx)}`}
          {enviando ? null : <ArrowRight aria-hidden="true" className={flecha} strokeWidth={1.6} />}
        </button>
        {/* Comprar el álbum no toca el plan de la boda (vive aparte, en
            pagos_de_album): la prueba sigue igual, y hay que decirlo. */}
        {enPrueba ? (
          <p className="mt-3 text-xs leading-relaxed text-tinta">
            {isEnglish
              ? "Buying the album doesn't change your plan: your trial carries on as it is."
              : "Comprar el álbum no cambia su plan: su prueba sigue igual."}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-3 text-sm text-error">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
