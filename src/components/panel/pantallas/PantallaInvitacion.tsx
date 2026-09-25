"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Check, ImageUp, Palette } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { Eyebrow } from "@/components/panel/sections";
import { EnvioDeInvitaciones } from "@/components/panel/EnvioDeInvitaciones";
import { useRefrescoDelPanel } from "@/components/panel/useRefrescoDelPanel";
import { createClient } from "@/lib/supabase/client";
import { parseJsonSafe } from "@/lib/http";
import { LIMITE_IA_PAGADA, MENSAJE_SOLO_LECTURA } from "@/lib/accesoDeLaBoda";
import { formatLongDate } from "@/components/panel/dates";
import { ESTILOS_DE_INVITACION, estiloPorId } from "@/lib/invitacionEstilos";
import { fechaDeInvitacion, mensajeDeInvitacion } from "@/lib/invitacionTexto";
import type { InvitacionDeLaBoda } from "@/lib/invitaciones";

const BUCKET = "invitaciones";
const MAX_BYTES = 5 * 1024 * 1024;

const botonPrincipal =
  "inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-full border border-ink bg-ink px-5 py-2 font-body text-sm text-white transition-[background-color,scale] duration-150 hover:bg-ink-soft active:scale-[0.98] disabled:opacity-50";
const botonSecundario =
  "inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-full border border-sand bg-white px-5 py-2 font-body text-sm text-ink transition-colors hover:bg-bone disabled:opacity-50";

/**
 * La invitación que reciben los invitados: UNA imagen por boda, y los pases en
 * el texto del mensaje (plantilla wedding_invitation_imagen).
 *
 * Dos caminos: subir la que ya tienen, o generarla con IA eligiendo uno de los
 * estilos propuestos. Todo lo que suben o generan se guarda como borrador y
 * eligen una. Una hecha por IA solo se puede elegir después de confirmar que
 * nombres, fecha y lugar están bien escritos: el modelo todavía puede fallar
 * al escribir texto, y esa imagen le llega a todos sus invitados.
 *
 * En la prueba se pueden crear menos con IA y no se envía. Con la prueba
 * vencida (soloLectura) se ve todo pero no se crea, sube ni elige: los
 * botones se apagan con una nota, y las rutas lo rechazan igual (402).
 */
export function PantallaInvitacion({
  pareja,
  fecha,
  lugar,
  invitacionesIniciales,
  generadasConIA,
  limiteIA,
  enPrueba,
  puedeEnviar,
  soloLectura,
}: {
  pareja: string;
  fecha: string | null;
  lugar: string | null;
  invitacionesIniciales: InvitacionDeLaBoda[];
  generadasConIA: number;
  limiteIA: number;
  enPrueba: boolean;
  puedeEnviar: boolean;
  soloLectura: boolean;
}) {
  const { isEnglish } = useLanguage();
  const refrescar = useRefrescoDelPanel();
  const [invitaciones, setInvitaciones] = useState(invitacionesIniciales);
  const [generadas, setGeneradas] = useState(generadasConIA);
  const [estilo, setEstilo] = useState(ESTILOS_DE_INVITACION[0].id);
  const [detalles, setDetalles] = useState("");
  const [generando, setGenerando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [revisado, setRevisado] = useState(false);
  // La fecha que pusieron aquí mismo, mientras el refresco trae la del servidor.
  const [fechaNueva, setFechaNueva] = useState<string | null>(null);
  const archivoRef = useRef<HTMLInputElement>(null);

  const fechaDeLaBoda = fecha ?? fechaNueva;
  const elegida = invitaciones.find((i) => i.elegida) ?? null;
  const quedan = Math.max(0, limiteIA - generadas);
  const ocupado = generando || subiendo;
  const apagado = ocupado || soloLectura;

  async function elegir(id: string, conRevision: boolean) {
    setError(null);
    const res = await fetch("/api/panel/invitacion", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, revisado: conRevision }),
    });
    const { data } = await parseJsonSafe<{ error?: string }>(res);
    if (!res.ok) {
      setError(data?.error || (isEnglish ? "Couldn't choose it." : "No pudimos elegirla."));
      return;
    }
    setInvitaciones((prev) => prev.map((i) => ({ ...i, elegida: i.id === id })));
    setConfirmando(null);
    setRevisado(false);
    refrescar();
  }

  async function subir(archivo: File) {
    setError(null);
    if (archivo.type !== "image/jpeg" && archivo.type !== "image/png") {
      setError(isEnglish ? "Upload it as a JPG or PNG image." : "Súbanla como imagen JPG o PNG.");
      return;
    }
    if (archivo.size > MAX_BYTES) {
      setError(isEnglish ? "It must be 5 MB or less." : "Tiene que pesar 5 MB o menos.");
      return;
    }
    setSubiendo(true);
    try {
      // 1. URL firmada: el archivo va directo a Storage, sin pasar por Vercel.
      const firma = await fetch("/api/panel/invitacion/subida", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: archivo.type }),
      });
      const { data: destino } = await parseJsonSafe<{ path?: string; token?: string; error?: string }>(firma);
      if (!firma.ok || !destino?.path || !destino.token) {
        throw new Error(destino?.error);
      }
      const { error: errorSubida } = await createClient()
        .storage.from(BUCKET)
        .uploadToSignedUrl(destino.path, destino.token, archivo, { contentType: archivo.type });
      if (errorSubida) throw new Error();

      // 2. Darla de alta.
      const alta = await fetch("/api/panel/invitacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: destino.path }),
      });
      const { data } = await parseJsonSafe<{ invitacion?: InvitacionDeLaBoda; error?: string }>(alta);
      if (!alta.ok || !data?.invitacion) throw new Error(data?.error);

      setInvitaciones((prev) => [data.invitacion!, ...prev]);
      // La que suben es su diseño: queda elegida de una vez.
      await elegir(data.invitacion.id, false);
    } catch (err) {
      setError(
        (err instanceof Error && err.message) ||
          (isEnglish ? "Couldn't upload it. Try again." : "No pudimos subirla. Inténtenlo otra vez.")
      );
    } finally {
      setSubiendo(false);
      if (archivoRef.current) archivoRef.current.value = "";
    }
  }

  async function generar() {
    setError(null);
    setGenerando(true);
    try {
      const res = await fetch("/api/panel/invitacion/ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estilo, detalles: detalles.trim() || null }),
      });
      const { data } = await parseJsonSafe<{ invitacion?: InvitacionDeLaBoda; error?: string }>(res);
      if (!res.ok || !data?.invitacion) {
        throw new Error(data?.error);
      }
      setInvitaciones((prev) => [data.invitacion!, ...prev]);
      setGeneradas((n) => n + 1);
      setConfirmando(data.invitacion.id);
      setRevisado(false);
    } catch (err) {
      setError(
        (err instanceof Error && err.message) ||
          (isEnglish ? "Couldn't create it. Try again." : "No pudimos crearla. Inténtenlo otra vez.")
      );
    } finally {
      setGenerando(false);
    }
  }

  const nombreDeEstilo = (id: string | null) => {
    const e = id ? estiloPorId(id) : null;
    return e ? (isEnglish ? e.nombre.en : e.nombre.es) : null;
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <Reveal app>
        <header>
          <Eyebrow>{isEnglish ? "Your invitation" : "Su invitación"}</Eyebrow>
          <h1 className="mt-3 font-heading text-4xl font-medium tracking-[-0.02em] text-ink md:text-5xl">
            {isEnglish ? "What your guests " : "Lo que van a "}
            <em className="italic text-azul">{isEnglish ? "will receive" : "recibir sus invitados"}</em>
          </h1>
          <p className="mt-4 max-w-[60ch] font-body text-sm leading-relaxed text-ink-muted">
            {isEnglish
              ? "One image for everyone. The number of passes goes in the WhatsApp message, so each guest reads how many people their invitation covers."
              : "Una sola imagen para todos. Los pases van en el mensaje de WhatsApp: cada invitado lee para cuántas personas es la suya."}
          </p>
        </header>
      </Reveal>

      {soloLectura ? (
        <p className="mt-6 max-w-[60ch] rounded-xl bg-wash-soft px-4 py-3 font-body text-sm leading-relaxed text-ink">
          {isEnglish ? MENSAJE_SOLO_LECTURA.en : MENSAJE_SOLO_LECTURA.es}{" "}
          <Link
            href="/panel/plan"
            className="font-medium text-azul-deep underline underline-offset-4 transition-colors hover:text-ink"
          >
            {isEnglish ? "See the plans" : "Ver los planes"}
          </Link>
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="mt-6 rounded-xl border border-terra-light bg-white px-4 py-3 font-body text-sm text-terra-deep">
          {error}
        </p>
      ) : null}

      {/* La elegida, como la verá un invitado */}
      <Reveal app className="mt-10">
        {elegida ? (
          <section className="grid gap-6 panel-card p-6 md:grid-cols-[minmax(0,18rem)_1fr]">
            {/* eslint-disable-next-line @next/next/no-img-element -- URL de Storage, dinámica */}
            <img
              src={elegida.url}
              alt={isEnglish ? "Your chosen invitation" : "Su invitación elegida"}
              className="w-full rounded-xl border border-sand object-cover"
            />
            <div>
              <p className="font-body text-xs font-medium uppercase tracking-[0.2em] text-pale-green-ink">
                {isEnglish ? "Chosen" : "Elegida"}
              </p>
              <p className="mt-2 font-heading text-2xl font-medium tracking-[-0.015em] text-ink">
                {isEnglish ? "This is how it arrives" : "Así les llega"}
              </p>
              <div className="mt-4 max-w-md whitespace-pre-line rounded-2xl rounded-tl-sm bg-pale-green px-4 py-3 font-body text-sm leading-relaxed text-ink">
                {mensajeDeInvitacion({ invitado: "María", pareja, fecha: fechaDeLaBoda, lugar, pases: 2 })}
              </div>
              <p className="mt-3 max-w-md font-body text-xs leading-relaxed text-ink-muted">
                {isEnglish
                  ? "Example for a guest with 2 passes. Each guest sees their own name and passes."
                  : "Ejemplo para una invitada con 2 pases. Cada invitado ve su nombre y sus pases."}
              </p>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-sand bg-white p-6 font-body text-sm text-ink-muted">
            {soloLectura
              ? isEnglish
                ? "You didn't choose an invitation during the trial."
                : "En la prueba no eligieron invitación."
              : isEnglish
                ? "You haven't chosen your invitation yet. Upload yours or create one with AI below."
                : "Aún no eligen su invitación. Suban la suya o créenla con IA aquí abajo."}
          </section>
        )}
      </Reveal>

      {elegida ? (
        <Reveal app className="mt-8">
          <section className="panel-card p-6">
            <h2 className="font-heading text-2xl font-medium tracking-[-0.015em] text-ink">
              {isEnglish ? "Send it to your guests" : "Mándenla a sus invitados"}
            </h2>
            <p className="mt-2 mb-5 max-w-[60ch] font-body text-sm leading-relaxed text-ink-muted">
              {isEnglish
                ? "It goes out on WhatsApp from Blue Book's number, only to guests who haven't received it. Their replies show up in Guests."
                : "Sale por WhatsApp desde el número de Blue Book, solo a quien todavía no la ha recibido. Sus respuestas aparecen en Invitados."}
            </p>
            <EnvioDeInvitaciones
              elegidaId={elegida.id}
              puedeEnviar={puedeEnviar}
              fecha={fechaDeLaBoda}
              lugar={lugar}
            />
          </section>
        </Reveal>
      ) : null}

      {/* Los dos caminos */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Reveal app>
          <section className="h-full panel-card p-6">
            <ImageUp className="h-6 w-6 text-azul" strokeWidth={1.5} />
            <h2 className="mt-3 font-heading text-2xl font-medium tracking-[-0.015em] text-ink">
              {isEnglish ? "We already have one" : "Ya la tenemos"}
            </h2>
            <p className="mt-2 font-body text-sm leading-relaxed text-ink-muted">
              {isEnglish
                ? "Upload it as an image (JPG or PNG, up to 5 MB). If you have it as a PDF, export the page as an image first."
                : "Súbanla como imagen (JPG o PNG, hasta 5 MB). Si la tienen en PDF, exporten la página como imagen primero."}
            </p>
            <input
              ref={archivoRef}
              type="file"
              accept="image/jpeg,image/png"
              className="sr-only"
              id="invitacion-archivo"
              onChange={(e) => {
                const archivo = e.target.files?.[0];
                if (archivo) void subir(archivo);
              }}
              disabled={apagado}
            />
            {/* Es un label, no un botón: `disabled` no lo apaga. Se apaga a mano,
                y el input de arriba ya está deshabilitado de verdad. */}
            <label
              htmlFor="invitacion-archivo"
              aria-disabled={apagado || undefined}
              className={`${botonSecundario} mt-5 ${apagado ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
            >
              {subiendo
                ? isEnglish
                  ? "Uploading…"
                  : "Subiendo…"
                : isEnglish
                  ? "Upload image"
                  : "Subir imagen"}
            </label>
          </section>
        </Reveal>

        <Reveal app>
          <section className="panel-card p-6">
            <Palette className="h-6 w-6 text-azul" strokeWidth={1.5} />
            <h2 className="mt-3 font-heading text-2xl font-medium tracking-[-0.015em] text-ink">
              {isEnglish ? "Create it with AI" : "Háganla con IA"}
            </h2>
            {/* Siempre montado: un aviso que aparece junto con su región no
                siempre lo lee el lector de pantalla. */}
            <div role="status">
              {fechaNueva ? (
                <p className="mt-2 font-body text-sm leading-relaxed text-ink">
                  {isEnglish
                    ? `Saved: ${formatLongDate(fechaNueva, true)}. Your plan's dates moved with it.`
                    : `Guardada: ${formatLongDate(fechaNueva, false)}. Las fechas de su plan ya se acomodaron.`}
                </p>
              ) : null}
            </div>
            {!fechaDeLaBoda ? (
              soloLectura ? (
                <p className="mt-2 font-body text-sm leading-relaxed text-ink-muted">
                  {isEnglish
                    ? "It needs the wedding date, which is printed on the invitation."
                    : "Necesita la fecha de la boda, que va impresa en la invitación."}
                </p>
              ) : (
                <FechaAquiMismo alGuardar={setFechaNueva} />
              )
            ) : (
              <>
                <p className="mt-2 font-body text-sm leading-relaxed text-ink-muted">
                  {isEnglish
                    ? "Pick a style. The text is printed from your wedding details: "
                    : "Elijan un estilo. El texto sale de los datos de su boda: "}
                  <span className="text-ink">
                    {pareja}
                    {" · "}
                    {fechaDeInvitacion(fechaDeLaBoda)}
                    {lugar ? ` · ${lugar}` : ""}
                  </span>
                  .
                </p>

                <fieldset className="mt-5" disabled={apagado}>
                  <legend className="sr-only">{isEnglish ? "Style" : "Estilo"}</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {ESTILOS_DE_INVITACION.map((e) => {
                      const activo = e.id === estilo;
                      return (
                        <label
                          key={e.id}
                          className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors ${
                            activo ? "border-ink bg-bone" : "border-sand bg-white hover:bg-bone"
                          }`}
                        >
                          <input
                            type="radio"
                            name="estilo"
                            value={e.id}
                            checked={activo}
                            onChange={() => setEstilo(e.id)}
                            className="sr-only"
                          />
                          <span className="flex shrink-0 overflow-hidden rounded-md border border-sand" aria-hidden>
                            {e.muestra.map((color) => (
                              <span key={color} className="h-10 w-3" style={{ backgroundColor: color }} />
                            ))}
                          </span>
                          <span>
                            <span className="block font-body text-sm font-medium text-ink">
                              {isEnglish ? e.nombre.en : e.nombre.es}
                            </span>
                            <span className="block font-body text-xs leading-snug text-ink-muted">
                              {isEnglish ? e.descripcion.en : e.descripcion.es}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  <label htmlFor="invitacion-detalles" className="mt-5 block font-body text-sm font-medium text-ink">
                    {isEnglish ? "A detail of your own" : "Un detalle suyo"}{" "}
                    <span className="font-normal text-ink-muted">({isEnglish ? "optional" : "opcional"})</span>
                  </label>
                  <input
                    id="invitacion-detalles"
                    type="text"
                    maxLength={200}
                    value={detalles}
                    onChange={(e) => setDetalles(e.target.value)}
                    placeholder={
                      isEnglish ? "e.g. lilac and gold, with marigolds" : "p. ej. lila y dorado, con cempasúchil"
                    }
                    className="mt-2 w-full rounded-xl border border-sand bg-white px-4 py-3 font-body text-sm text-ink outline-none transition-colors placeholder:text-ink-soft/60 focus:border-azul focus:ring-2 focus:ring-azul/20"
                  />
                </fieldset>

                <div className="mt-5 flex flex-wrap items-center gap-4">
                  <button type="button" onClick={generar} disabled={apagado || quedan === 0} className={botonPrincipal}>
                    {generando
                      ? isEnglish
                        ? "Creating… (up to 2 minutes)"
                        : "Creando… (hasta 2 minutos)"
                      : isEnglish
                        ? "Create invitation"
                        : "Crear invitación"}
                  </button>
                  <span className="font-body text-xs text-ink-muted">
                    {isEnglish ? `${quedan} of ${limiteIA} left` : `Les quedan ${quedan} de ${limiteIA}`}
                    {enPrueba ? (isEnglish ? " in the trial" : " en la prueba") : null}
                  </span>
                </div>
                {/* En la prueba el tope es más bajo; se dice cuánto sube, sin apurar. */}
                {enPrueba && !soloLectura ? (
                  <p className="mt-3 max-w-[60ch] font-body text-xs leading-relaxed text-ink-muted">
                    {quedan === 0
                      ? isEnglish
                        ? `You used the ones included in the trial. With your plan you can create up to ${LIMITE_IA_PAGADA}; meanwhile, choose one of your drafts or upload yours.`
                        : `Ya usaron las de la prueba. Con su plan pueden crear hasta ${LIMITE_IA_PAGADA}; mientras, elijan uno de sus borradores o suban la suya.`
                      : isEnglish
                        ? `With your plan, up to ${LIMITE_IA_PAGADA}.`
                        : `Con su plan, hasta ${LIMITE_IA_PAGADA}.`}{" "}
                    {quedan === 0 ? (
                      <Link
                        href="/panel/plan"
                        className="text-azul-deep underline underline-offset-4 transition-colors hover:text-ink"
                      >
                        {isEnglish ? "See the plans" : "Ver los planes"}
                      </Link>
                    ) : null}
                  </p>
                ) : null}
              </>
            )}
          </section>
        </Reveal>
      </div>

      {/* Borradores */}
      {invitaciones.length > 0 ? (
        <Reveal app className="mt-10">
          <h2 className="font-heading text-2xl font-medium tracking-[-0.015em] text-ink">
            {isEnglish ? "Your drafts" : "Sus borradores"}
          </h2>
          <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {invitaciones.map((inv) => (
              <li key={inv.id} className="flex flex-col panel-card p-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- URL de Storage, dinámica */}
                <img
                  src={inv.url}
                  alt={isEnglish ? "Invitation draft" : "Borrador de invitación"}
                  className="aspect-[2/3] w-full rounded-lg border border-sand object-cover"
                  loading="lazy"
                />
                <p className="mt-3 font-body text-xs text-ink-muted">
                  {inv.origen === "ia"
                    ? `${isEnglish ? "AI" : "IA"} · ${nombreDeEstilo(inv.estilo) ?? ""}`
                    : isEnglish
                      ? "Uploaded"
                      : "Subida"}
                </p>

                {inv.elegida ? (
                  <p className="mt-2 inline-flex items-center gap-1.5 font-body text-sm font-medium text-pale-green-ink">
                    <Check className="h-4 w-4" strokeWidth={2} />
                    {isEnglish ? "Chosen" : "Elegida"}
                  </p>
                ) : inv.origen === "ia" && confirmando === inv.id ? (
                  <div className="mt-2 space-y-2">
                    <label className="flex items-start gap-2 font-body text-xs leading-snug text-ink">
                      <input
                        type="checkbox"
                        checked={revisado}
                        disabled={soloLectura}
                        onChange={(e) => setRevisado(e.target.checked)}
                        className="mt-0.5"
                      />
                      {isEnglish
                        ? "We checked that names, date and venue are spelled right."
                        : "Revisamos que nombres, fecha y lugar estén bien escritos."}
                    </label>
                    <button
                      type="button"
                      disabled={!revisado || soloLectura}
                      onClick={() => elegir(inv.id, true)}
                      className={`${botonPrincipal} w-full`}
                    >
                      {isEnglish ? "Choose this one" : "Elegir esta"}
                    </button>
                  </div>
                ) : soloLectura ? null : (
                  <button
                    type="button"
                    onClick={() => {
                      if (inv.origen === "ia") {
                        setConfirmando(inv.id);
                        setRevisado(false);
                      } else {
                        void elegir(inv.id, false);
                      }
                    }}
                    className={`${botonSecundario} mt-2 w-full`}
                  >
                    {isEnglish ? "Choose this one" : "Elegir esta"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Reveal>
      ) : null}
    </div>
  );
}

/**
 * La fecha de la boda, pedida donde hace falta.
 *
 * Antes era un enlace a Hoy que no abría nada: la pareja llegaba con ganas de
 * ver su invitación y se quedaba buscando dónde se ponía la fecha. Es la misma
 * PUT /api/panel/boda que usa DatosDeLaBoda, solo con la fecha: el lugar no
 * es necesario para crearla, y preguntar una cosa a la vez cuesta menos.
 */
function FechaAquiMismo({ alGuardar }: { alGuardar: (fecha: string) => void }) {
  const { isEnglish } = useLanguage();
  const refrescar = useRefrescoDelPanel();
  const [valor, setValor] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!valor) return;
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch("/api/panel/boda", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weddingDate: valor }),
      });
      const { data } = await parseJsonSafe<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(data?.error || (isEnglish ? "Couldn't save it." : "No pudimos guardarla."));
      }
      alGuardar(valor);
      // La fecha también vive en la barra de arriba y en las tareas del plan.
      refrescar();
    } catch (err) {
      setError(err instanceof Error ? err.message : null);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="mt-2">
      <p className="font-body text-sm leading-relaxed text-ink-muted">
        {isEnglish
          ? "The date is printed on the invitation, so it goes first."
          : "La fecha va impresa en la invitación, así que va primero."}
      </p>
      <label htmlFor="invitacion-fecha" className="mt-5 block font-body text-sm font-medium text-ink">
        {isEnglish ? "When is the wedding?" : "¿Qué día es la boda?"}
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <input
          id="invitacion-fecha"
          type="date"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          aria-describedby="invitacion-fecha-nota"
          className="min-h-[2.75rem] rounded-xl border border-sand bg-white px-4 py-2 font-body text-sm text-ink outline-none transition-colors focus:border-azul focus:ring-2 focus:ring-azul/20"
        />
        <button type="submit" disabled={!valor || guardando} className={botonPrincipal}>
          {guardando ? (isEnglish ? "Saving…" : "Guardando…") : isEnglish ? "Save date" : "Guardar fecha"}
        </button>
      </div>
      <p id="invitacion-fecha-nota" className="mt-2 font-body text-xs leading-relaxed text-ink-muted">
        {isEnglish
          ? "Not sure yet? No problem: you can upload the one you have, or come back when you know."
          : "¿Todavía no la saben? No pasa nada: pueden subir la que ya tienen, o volver cuando la sepan."}
      </p>
      {error ? (
        <p role="alert" className="mt-2 font-body text-sm text-terra-deep">
          {error}
        </p>
      ) : null}
    </form>
  );
}
