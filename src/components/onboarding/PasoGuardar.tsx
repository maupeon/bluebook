"use client";

import { useState, type RefObject } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  GOOGLE_ACTIVO,
  LogoGoogle,
  MAX_CODIGO,
  MIN_CODIGO,
  SeparadorO,
  abrirGoogle,
  useCodigoPorCorreo,
} from "@/components/panel/LoginForm";
import { DIAS_DE_PRUEBA } from "@/lib/accesoDeLaBoda";
import { BOTON_PRIMARIO, BOTON_SECUNDARIO } from "./pasos";

/**
 * A dónde vuelve quien entra con Google (o con el enlace del correo en esta
 * misma pestaña). Esa página lee las respuestas de sessionStorage, las manda y
 * entra al panel. Ver app/comenzar/guardar.
 */
export const RUTA_DE_VUELTA = "/comenzar/guardar";

function Spinner({ claro = true }: { claro?: boolean }) {
  // animate-spin se queda con movimiento reducido: sin él parece colgado.
  return (
    <span
      aria-hidden="true"
      className={`h-4 w-4 animate-spin rounded-full border-2 ${
        claro ? "border-white/30 border-t-white" : "border-navy/20 border-t-navy"
      }`}
    />
  );
}

function AvisoDeError({ children }: { children: string }) {
  return (
    <div role="alert" className="mt-6 rounded-xl bg-terra-light px-4 py-3">
      <p className="font-body text-sm leading-relaxed text-terra-deep">{children}</p>
    </div>
  );
}

/**
 * El último paso: guardar y entrar. Tres caminos, según haya sesión o no:
 *  - con sesión: un botón, «Guardar y entrar».
 *  - Google: sale y vuelve a RUTA_DE_VUELTA (las respuestas esperan en sessionStorage).
 *  - código por correo: los dos pasos de /acceso, en esta misma pantalla. Al
 *    verificar ya hay sesión y se guarda sin salir de aquí.
 */
export function PasoGuardar({
  tituloRef,
  correoDeSesion,
  alCambiarSesion,
  guardar,
  guardando,
  errorAlGuardar,
  antesDeSalir,
  isEnglish,
}: {
  tituloRef: RefObject<HTMLHeadingElement | null>;
  correoDeSesion: string | null;
  alCambiarSesion: (correo: string | null) => void;
  guardar: () => void;
  guardando: boolean;
  errorAlGuardar: string | null;
  /** Deja las respuestas en sessionStorage antes de irse a Google. */
  antesDeSalir: () => void;
  isEnglish: boolean;
}) {
  const acceso = useCodigoPorCorreo({ destino: RUTA_DE_VUELTA, voz: "tu" });
  const [conGoogle, setConGoogle] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const ocupado = guardando || acceso.loading || conGoogle || cerrando;

  const irConGoogle = async () => {
    if (ocupado) return;
    acceso.setError(null);
    antesDeSalir();
    setConGoogle(true);
    if (!(await abrirGoogle(RUTA_DE_VUELTA))) {
      acceso.setError(
        isEnglish
          ? "I couldn't open Google. Try with your email instead."
          : "No pude abrir Google. Prueba con tu correo."
      );
      setConGoogle(false);
    }
  };

  const verificar = async () => {
    if (await acceso.verificarCodigo()) {
      // La sesión ya está en las cookies: se guarda sin salir de la pantalla.
      // El hook deja `loading` encendido al verificar (piensa en quien navega);
      // aquí se apaga, o un fallo al guardar dejaría el botón de reintentar
      // deshabilitado para siempre. `guardando` toma el relevo en el mismo render.
      acceso.setLoading(false);
      alCambiarSesion(acceso.correo);
      guardar();
    }
  };

  /** Una computadora compartida: la sesión abierta puede ser de otra persona. */
  const noSoyYo = async () => {
    setCerrando(true);
    try {
      await createClient().auth.signOut();
      alCambiarSesion(null);
    } finally {
      setCerrando(false);
    }
  };

  const error = errorAlGuardar ?? acceso.error;

  return (
    <div className="flex flex-1 flex-col">
      <h1
        ref={tituloRef}
        tabIndex={-1}
        className="font-heading text-[2.35rem] font-medium leading-[1.05] tracking-[-0.02em] text-navy text-balance outline-none sm:text-5xl"
      >
        {isEnglish
          ? `Your ${DIAS_DE_PRUEBA}-day trial starts today.`
          : `Tu prueba de ${DIAS_DE_PRUEBA} días empieza hoy.`}
      </h1>
      <p className="mt-4 max-w-[46ch] font-body text-[15px] leading-relaxed text-navy-muted text-pretty">
        {isEnglish
          ? "No card. Save your wedding and step into your panel: everything you told me is waiting there."
          : "Sin tarjeta. Guarda tu boda y entra a tu panel: ahí te espera todo lo que me contaste."}
      </p>

      {error ? <AvisoDeError>{error}</AvisoDeError> : null}

      <div className="mt-9 max-w-md">
        {correoDeSesion ? (
          <>
            <button type="button" onClick={guardar} disabled={ocupado} className={`${BOTON_PRIMARIO} w-full`}>
              {guardando ? (
                <>
                  <Spinner />
                  {isEnglish ? "Saving your wedding…" : "Guardando tu boda…"}
                </>
              ) : isEnglish ? (
                "Save and enter"
              ) : (
                "Guardar y entrar"
              )}
            </button>
            <p className="mt-4 font-body text-sm leading-relaxed text-navy-muted">
              {isEnglish ? "It's saved with " : "Se guarda con "}
              <span className="font-medium text-navy">{correoDeSesion}</span>.{" "}
              <button
                type="button"
                onClick={noSoyYo}
                disabled={ocupado}
                className="inline-flex min-h-[44px] items-center font-medium text-azul-deep underline-offset-4 hover:text-navy hover:underline disabled:opacity-50"
              >
                {isEnglish ? "Not you?" : "¿No eres tú?"}
              </button>
            </p>
          </>
        ) : acceso.paso === "codigo" ? (
          <>
            <p className="font-body text-[15px] leading-relaxed text-navy-soft">
              {isEnglish ? "I sent a code to " : "Te mandé un código a "}
              <span className="font-medium text-navy">{acceso.correo}</span>
              {isEnglish ? ". Type it here." : ". Escríbelo aquí."}
            </p>
            <form
              noValidate
              className="mt-6"
              onSubmit={(e) => {
                e.preventDefault();
                void verificar();
              }}
            >
              <label htmlFor="codigo" className="sr-only">
                {isEnglish ? "Code" : "Código"}
              </label>
              <input
                ref={acceso.inputCodigo}
                id="codigo"
                type="text"
                inputMode="numeric"
                // one-time-code deja que iOS y Android lo rellenen solos.
                autoComplete="one-time-code"
                maxLength={MAX_CODIGO}
                value={acceso.codigo}
                onChange={(e) => acceso.setCodigo(e.target.value)}
                placeholder="········"
                disabled={ocupado}
                className="min-h-[60px] w-full rounded-2xl border border-hairline bg-white px-4 text-center font-body text-2xl tracking-[0.25em] text-navy tabular-nums placeholder:text-navy-muted/35 outline-none transition-colors focus:border-azul focus:ring-2 focus:ring-azul/20 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={ocupado || acceso.codigo.length < MIN_CODIGO}
                className={`${BOTON_PRIMARIO} mt-4 w-full`}
              >
                {ocupado ? (
                  <>
                    <Spinner />
                    {isEnglish ? "Saving your wedding…" : "Guardando tu boda…"}
                  </>
                ) : isEnglish ? (
                  "Save and enter"
                ) : (
                  "Guardar y entrar"
                )}
              </button>
            </form>
            <div className="mt-5 flex flex-col items-start gap-1">
              <button
                type="button"
                disabled={ocupado || acceso.espera > 0}
                onClick={() => acceso.enviarCodigo(true)}
                className="inline-flex min-h-[44px] items-center font-body text-sm font-medium text-azul-deep transition-colors hover:text-navy disabled:cursor-not-allowed disabled:text-navy-muted"
              >
                {acceso.espera > 0
                  ? isEnglish
                    ? `Resend code in ${acceso.espera}s`
                    : `Reenviar código en ${acceso.espera}s`
                  : isEnglish
                    ? "Resend code"
                    : "Reenviar código"}
              </button>
              <button
                type="button"
                onClick={acceso.volverAlCorreo}
                disabled={ocupado}
                className="inline-flex min-h-[44px] items-center gap-2 font-body text-sm font-medium text-navy-muted transition-colors hover:text-navy"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                {isEnglish ? "Use another email" : "Usar otro correo"}
              </button>
            </div>
          </>
        ) : (
          <>
            {GOOGLE_ACTIVO ? (
              <>
                <button type="button" onClick={irConGoogle} disabled={ocupado} className={`${BOTON_SECUNDARIO} w-full`}>
                  {conGoogle ? <Spinner claro={false} /> : <LogoGoogle />}
                  {isEnglish ? "Continue with Google" : "Continuar con Google"}
                </button>
                <SeparadorO className="my-6" />
              </>
            ) : null}

            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                // Por si abre el enlace del correo en esta pestaña en vez de teclear el código.
                antesDeSalir();
                void acceso.pedirCodigo();
              }}
            >
              <label
                htmlFor="correo"
                className="block font-body text-[11px] font-semibold uppercase tracking-[0.16em] text-navy-muted"
              >
                {isEnglish ? "Your email" : "Tu correo"}
              </label>
              <input
                id="correo"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={acceso.email}
                onChange={(e) => acceso.setEmail(e.target.value)}
                placeholder={isEnglish ? "you@email.com" : "tu@correo.com"}
                disabled={ocupado}
                className="mt-1 min-h-[56px] w-full border-b border-wash-deep bg-transparent pb-1 font-body text-lg text-navy placeholder:text-navy-muted/40 outline-none transition-colors focus:border-azul disabled:opacity-60"
              />
              <button type="submit" disabled={ocupado} className={`${BOTON_PRIMARIO} mt-6 w-full`}>
                {acceso.loading ? (
                  <>
                    <Spinner />
                    {isEnglish ? "Sending…" : "Enviando…"}
                  </>
                ) : isEnglish ? (
                  "Send me a code"
                ) : (
                  "Mándame un código"
                )}
              </button>
              <p className="mt-3 font-body text-xs leading-relaxed text-navy-muted">
                {isEnglish
                  ? "No password: every time you come back, you sign in with a code."
                  : "Sin contraseñas: cada vez que vuelvas, entras con un código."}
              </p>
            </form>
          </>
        )}

        <p className="mt-10 font-body text-xs leading-relaxed text-navy-muted">
          {isEnglish ? "By saving you accept the " : "Al guardar aceptas los "}
          <Link href="/terminos" target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-navy">
            {isEnglish ? "Terms" : "Términos"}
          </Link>
          {isEnglish ? " and the " : " y el "}
          <Link href="/privacidad" target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-navy">
            {isEnglish ? "Privacy notice" : "Aviso de privacidad"}
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
