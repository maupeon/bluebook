"use client";

import { useState, type RefObject } from "react";
import { ArrowLeft } from "lucide-react";
import { AvisoSimplificado } from "@/components/legal/AvisoSimplificado";
import { CasillaDeTerminos } from "@/components/legal/CasillaDeTerminos";
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
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, TituloDePantalla } from "./pasos";

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
        claro ? "border-niebla/30 border-t-niebla" : "border-noche/20 border-t-noche"
      }`}
    />
  );
}

function AvisoDeError({ children }: { children: string }) {
  return (
    <div role="alert" className="mx-auto mt-6 w-full max-w-md rounded-xl bg-error-fondo px-4 py-3 text-center">
      <p className="text-sm leading-relaxed text-error">{children}</p>
    </div>
  );
}

/**
 * El último paso: guardar y entrar. Tres caminos, según haya sesión o no:
 *  - con sesión: un botón, «Guardar y entrar».
 *  - Google: sale y vuelve a RUTA_DE_VUELTA (las respuestas esperan en sessionStorage).
 *  - código por correo: los dos pasos de /acceso, en esta misma pantalla. Al
 *    verificar ya hay sesión y se guarda sin salir de aquí.
 *
 * Como las preguntas, va centrado: el titular, la entrada y una columna de
 * max-w-md con los botones a lo ancho. El aviso de privacidad se queda a la
 * izquierda: son seis renglones de letra chica y centrados no se leen.
 */
export function PasoGuardar({
  tituloRef,
  correoDeSesion,
  alCambiarSesion,
  guardar,
  guardando,
  errorAlGuardar,
  antesDeSalir,
  aceptaTerminos,
  alAceptarTerminos,
  isEnglish,
}: {
  tituloRef: RefObject<HTMLHeadingElement | null>;
  correoDeSesion: string | null;
  alCambiarSesion: (correo: string | null) => void;
  guardar: () => void;
  guardando: boolean;
  errorAlGuardar: string | null;
  /** Deja las respuestas para la vuelta antes de irse a Google o al correo (ver borrador.ts). */
  antesDeSalir: () => void;
  /** La casilla de los Términos. Vive en las respuestas: viaja en el borrador. */
  aceptaTerminos: boolean;
  alAceptarTerminos: (valor: boolean) => void;
  isEnglish: boolean;
}) {
  const acceso = useCodigoPorCorreo({ destino: RUTA_DE_VUELTA, voz: "tu" });
  const [conGoogle, setConGoogle] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const ocupado = guardando || acceso.loading || conGoogle || cerrando;
  // Todo lo que crea la boda o sale a iniciar sesión espera a la casilla.
  const bloqueado = ocupado || !aceptaTerminos;

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
      <TituloDePantalla tituloRef={tituloRef}>
        {isEnglish
          ? `Your ${DIAS_DE_PRUEBA}-day trial starts today.`
          : `Tu prueba de ${DIAS_DE_PRUEBA} días empieza hoy.`}
      </TituloDePantalla>
      <p className="mx-auto mt-4 max-w-[46ch] text-center text-[15px] leading-relaxed text-tinta text-pretty">
        {isEnglish
          ? "No card. Save your wedding and step into your panel: everything you told me is waiting there."
          : "Sin tarjeta. Guarda tu boda y entra a tu panel: ahí te espera todo lo que me contaste."}
      </p>

      {error ? <AvisoDeError>{error}</AvisoDeError> : null}

      <div className="mx-auto mt-9 w-full max-w-md">
        <CasillaDeTerminos
          className="mb-6 justify-center"
          aceptada={aceptaTerminos}
          alCambiar={alAceptarTerminos}
          isEnglish={isEnglish}
        />
        {correoDeSesion ? (
          <>
            <button type="button" onClick={guardar} disabled={bloqueado} className={`${BOTON_PRIMARIO} w-full`}>
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
            <p className="mt-4 text-center text-sm leading-relaxed text-tinta">
              {isEnglish ? "It's saved with " : "Se guarda con "}
              <span className="font-medium text-noche">{correoDeSesion}</span>.{" "}
              <button
                type="button"
                onClick={noSoyYo}
                disabled={ocupado}
                className="inline-flex min-h-[44px] items-center font-medium text-noche underline decoration-linea-control underline-offset-4 transition-[text-decoration-color] hover:decoration-noche disabled:opacity-50"
              >
                {isEnglish ? "Not you?" : "¿No eres tú?"}
              </button>
            </p>
          </>
        ) : acceso.paso === "codigo" ? (
          <>
            <p className="text-center text-[15px] leading-relaxed text-tinta">
              {isEnglish ? "I sent a code to " : "Te mandé un código a "}
              <span className="font-medium text-noche">{acceso.correo}</span>
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
                className="min-h-[60px] w-full rounded-2xl border border-linea-control/70 bg-niebla px-4 text-center text-2xl tracking-[0.25em] text-noche tabular-nums outline-none transition-[border-color,box-shadow] focus:border-noche focus:ring-2 focus:ring-noche/20 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={bloqueado || acceso.codigo.length < MIN_CODIGO}
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
            <div className="mt-5 flex flex-col items-center gap-1">
              <button
                type="button"
                disabled={ocupado || acceso.espera > 0}
                onClick={() => acceso.enviarCodigo(true)}
                className="inline-flex min-h-[44px] items-center text-sm font-medium text-noche underline decoration-linea-control underline-offset-4 transition-[text-decoration-color,color] hover:decoration-noche disabled:cursor-not-allowed disabled:text-tinta disabled:no-underline"
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
                className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-tinta transition-colors hover:text-noche"
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
                <button type="button" onClick={irConGoogle} disabled={bloqueado} className={`${BOTON_SECUNDARIO} w-full`}>
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
                className="block text-center text-xs font-medium uppercase tracking-[0.16em] text-tinta"
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
                // Una línea escrita, como los nombres: al enfocarla pasa a azul
                // noche y engorda a 2px (su anillo de foco).
                className="mt-1 min-h-[56px] w-full border-b border-linea-control bg-transparent pb-1 text-center text-lg text-noche outline-none transition-[border-color,box-shadow] focus:border-noche focus:shadow-[0_1px_0_var(--noche)] disabled:opacity-60"
              />
              <button type="submit" disabled={bloqueado} className={`${BOTON_PRIMARIO} mt-6 w-full`}>
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
              <p className="mt-3 text-center text-xs leading-relaxed text-tinta">
                {isEnglish
                  ? "No password: every time you come back, you sign in with a code."
                  : "Sin contraseñas: cada vez que vuelvas, entras con un código."}
              </p>
            </form>
          </>
        )}

        {/* El simplificado: la ley pide mostrarlo antes de que los datos
            lleguen al servidor, y es aquí donde llegan (LFPDPPP art. 16). */}
        <AvisoSimplificado isEnglish={isEnglish} className="mt-10" />
      </div>
    </div>
  );
}
