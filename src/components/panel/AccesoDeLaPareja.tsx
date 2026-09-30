"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { parseJsonSafe } from "@/lib/http";

/**
 * «Quién entra a su panel»: los dos correos con los que se abre esta boda.
 * Quien abrió la cuenta agrega aquí el correo de su pareja (o lo cambia, o lo
 * quita); la otra persona entra en /acceso con ese correo y le llega su
 * código. Antes esto sólo se podía al registrarse o desde el admin.
 */

interface Estado {
  yo: string;
  principal: string | null;
  pareja: string | null;
  puedeCambiar: boolean;
}

const inputClass =
  "w-full rounded-xl border border-linea-control/70 bg-papel px-4 py-3 text-sm text-noche outline-none transition-[border-color,box-shadow] focus:border-noche focus:ring-2 focus:ring-noche/20 disabled:border-linea disabled:bg-niebla disabled:text-tinta";
const botonPrincipal =
  "inline-flex min-h-[2.75rem] items-center gap-2 rounded-full border border-noche bg-noche px-6 py-2 text-sm font-medium text-niebla transition-[background-color,border-color,scale] duration-150 hover:border-noche-suave hover:bg-noche-suave active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:opacity-50";
const botonSecundario =
  "inline-flex min-h-[2.75rem] items-center rounded-full border border-linea-control/60 bg-niebla px-5 py-2 text-sm font-medium text-noche transition-[background-color,border-color,scale] duration-150 hover:border-linea-control hover:bg-papel-medio active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:opacity-50";
const enlace = "text-sm text-tinta underline decoration-linea-control underline-offset-4 transition-colors hover:text-noche hover:decoration-noche";

export function AccesoDeLaPareja() {
  const { isEnglish: en } = useLanguage();
  const [estado, setEstado] = useState<Estado | null>(null);
  const [correo, setCorreo] = useState("");
  const [editando, setEditando] = useState(false);
  const [quitando, setQuitando] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/panel/acceso", { cache: "no-store" })
      .then(async (r) => (r.ok ? ((await parseJsonSafe<Estado>(r)).data as Estado | null) : null))
      .then((d) => d && setEstado(d))
      .catch(() => {});
  }, []);

  async function guardar(valor: string | null) {
    setTrabajando(true);
    setError(null);
    setListo(false);
    try {
      const r = await fetch("/api/panel/acceso", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: valor }),
      });
      const d = (await parseJsonSafe<Estado & { error?: string }>(r)).data as (Estado & { error?: string }) | null;
      if (!r.ok || !d) throw new Error(d?.error || (en ? "We couldn't save the change." : "No pudimos guardar el cambio."));
      setEstado(d);
      setEditando(false);
      setQuitando(false);
      setCorreo("");
      setListo(valor !== null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setTrabajando(false);
    }
  }

  if (!estado) return null;
  const pidiendo = estado.puedeCambiar && (!estado.pareja || editando);

  return (
    <section className="panel-card grid gap-4 p-6 sm:p-8 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] md:gap-10 md:p-10">
      <div>
        <h2 className="text-xl font-medium text-noche">{en ? "Who can sign in" : "Quién entra a su panel"}</h2>
        <p className="mt-2 text-sm leading-relaxed text-tinta">
          {en
            ? "Each of you signs in with your own email and sees the same wedding. Account notices (your trial and your charges) go to both."
            : "Cada quien entra con su propio correo y ven la misma boda. Los avisos de su cuenta (su prueba y sus cobros) les llegan a los dos."}
        </p>
      </div>

      <div className="min-w-0 space-y-4">
        <ul className="divide-y divide-linea rounded-xl border border-linea bg-niebla">
          {estado.principal ? (
            <li className="flex flex-wrap items-center gap-3 px-4 py-3">
              <p className="min-w-0 flex-1 text-sm text-noche [overflow-wrap:anywhere]">{estado.principal}</p>
              <span className="text-sm text-tinta">{en ? "Opened the account" : "Abrió la cuenta"}</span>
            </li>
          ) : null}
          {estado.pareja ? (
            <li className="flex flex-wrap items-center gap-3 px-4 py-3">
              <p className="min-w-0 flex-1 text-sm text-noche [overflow-wrap:anywhere]">{estado.pareja}</p>
              {estado.puedeCambiar ? (
                quitando ? (
                  <span className="flex items-center gap-3">
                    <button type="button" disabled={trabajando} onClick={() => guardar(null)} className={botonSecundario}>
                      {en ? "Yes, remove it" : "Sí, quitarlo"}
                    </button>
                    <button type="button" onClick={() => setQuitando(false)} className={enlace}>
                      {en ? "Cancel" : "Cancelar"}
                    </button>
                  </span>
                ) : (
                  <span className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setCorreo(estado.pareja ?? "");
                        setEditando(true);
                        setListo(false);
                      }}
                      aria-label={en ? `Change the email ${estado.pareja}` : `Cambiar el correo ${estado.pareja}`}
                      className={enlace}
                    >
                      {en ? "Change" : "Cambiar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuitando(true)}
                      aria-label={en ? `Remove access for ${estado.pareja}` : `Quitar el acceso de ${estado.pareja}`}
                      className={enlace}
                    >
                      {en ? "Remove" : "Quitar"}
                    </button>
                  </span>
                )
              ) : null}
            </li>
          ) : null}
        </ul>

        {listo && estado.pareja ? (
          <p role="status" className="rounded-xl bg-papel px-4 py-3 text-sm text-noche">
            {en
              ? "Done. They can sign in at bluebook.mx/acceso with that email; a code will be sent to it."
              : "Listo. Ya puede entrar en bluebook.mx/acceso con ese correo; ahí le llega su código."}
          </p>
        ) : null}

        {pidiendo ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              guardar(correo.trim());
            }}
            className="space-y-3"
          >
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-noche">{en ? "Your partner's email" : "Correo de su pareja"}</span>
              <input
                type="email"
                required
                maxLength={160}
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder={en ? "name@example.com" : "nombre@ejemplo.com"}
                autoComplete="off"
                className={inputClass}
              />
            </label>
            <div className="flex flex-wrap items-center gap-4">
              <button type="submit" disabled={trabajando || !correo.trim()} className={botonPrincipal}>
                {estado.pareja ? (en ? "Save" : "Guardar") : en ? "Give access" : "Dar acceso"}
              </button>
              {editando ? (
                <button type="button" onClick={() => setEditando(false)} className={enlace}>
                  {en ? "Cancel" : "Cancelar"}
                </button>
              ) : null}
            </div>
          </form>
        ) : null}

        {!estado.puedeCambiar ? (
          <p className="text-sm text-tinta">
            {en
              ? "Only the person who opened the account can change the other email."
              : "El otro correo sólo lo cambia quien abrió la cuenta."}
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="rounded-xl border border-error/30 bg-error-fondo px-4 py-3 text-sm text-error">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
