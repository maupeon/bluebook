import { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { CheckCircle } from "lucide-react";
import { registrarPagoDeAlbum } from "@/lib/albumPagado";
import { correoDelPanel } from "@/lib/panelSesion";
import { getCoupleWeddingByEmail } from "@/lib/couplePanel";
import { LANGUAGE_COOKIE, parseLanguage } from "@/lib/language";
import { Titular } from "@/components/marca/Titular";
import { ButtonAnchor, ButtonLink } from "@/components/marketing/ui";

export const metadata: Metadata = {
  title: "Tu álbum ya está en tu panel",
  robots: { index: false, follow: false },
};

// Cada visita pregunta a Stripe y a la base: nada de esto se puede cachear.
export const dynamic = "force-dynamic";

/*
 * La vuelta de Stripe tras comprar el álbum en /album-digital.
 *
 * El pago se registra aquí también, no sólo en el webhook: la novia llega
 * segundos después de pagar y el webhook puede no haber llegado (o no llegar
 * nunca, en local). registrarPagoDeAlbum es idempotente: el que llegue
 * segundo, webhook o página, encuentra el pago hecho.
 *
 * Desde la 0036 el álbum vive en el panel de su boda y se entra con el correo:
 * esta página ya no redirige al enlace secreto de administración ni lo
 * muestra. Pantalla de un solo foco, centrada, como la de la boda.
 */
export default async function CheckoutSuccessAlbumPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const cookieStore = await cookies();
  const isEnglish = parseLanguage(cookieStore.get(LANGUAGE_COOKIE)?.value) === "en";
  const { session_id: sessionId } = await searchParams;

  if (!sessionId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-papel px-4 pt-20">
        <div className="panel-card w-full max-w-lg p-8 text-center">
          <Titular as="h1" tamano="hoja" className="mb-3">
            {isEnglish ? "Session not found" : "No encontramos tu sesión"}
          </Titular>
          <p className="mb-6 text-tinta">
            {isEnglish
              ? "We could not find your session. Please go back to the digital album and try checkout again."
              : "Regresa al álbum digital y vuelve a intentar el checkout."}
          </p>
          <ButtonLink href="/album-digital" size="md">
            {isEnglish ? "Back to digital album" : "Volver a álbum digital"}
          </ButtonLink>
        </div>
      </div>
    );
  }

  const pagado = await registrarPagoDeAlbum(sessionId);

  if (!pagado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-papel px-4 pt-20">
        <div className="panel-card w-full max-w-lg p-8 text-center">
          <Titular as="h1" tamano="hoja" className="mb-3">
            {isEnglish ? "We are finishing your album" : "Estamos terminando tu álbum"}
          </Titular>
          <p className="mb-6 text-tinta">
            {isEnglish
              ? "We could not create your album automatically on this attempt. Please try again in a few seconds."
              : "No fue posible crear el álbum automáticamente en este intento. Reintenta en unos segundos."}
          </p>
          <ButtonAnchor href={`/checkout/success-album?session_id=${encodeURIComponent(sessionId)}`} size="md">
            {isEnglish ? "Retry now" : "Reintentar ahora"}
          </ButtonAnchor>
        </div>
      </div>
    );
  }

  // Si ya tiene sesión en el panel de ESTA boda, entra directo al álbum. Si
  // no, /acceso le pide el código y la deja en /panel/album.
  const correoActual = await correoDelPanel();
  const bodaActual = correoActual ? await getCoupleWeddingByEmail(correoActual) : null;
  const hrefDelPanel =
    bodaActual?.id === pagado.weddingId ? "/panel/album" : "/acceso?next=/panel/album";

  return (
    <div className="min-h-screen bg-papel">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-noche">
          <CheckCircle className="h-8 w-8 text-niebla" strokeWidth={1.5} aria-hidden="true" />
        </div>

        <p className="rotulo mt-8">{isEnglish ? "Payment received" : "Pago recibido"}</p>

        <Titular as="h1" tamano="pantalla" className="mt-4">
          {isEnglish ? "Your album is in your panel" : "Tu álbum ya está en tu panel"}
        </Titular>

        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-tinta">
          {pagado.correo ? (
            <>
              {isEnglish ? "Sign in with " : "Entra con "}
              <span className="font-medium text-noche">{pagado.correo}</span>
              {isEnglish
                ? ": we'll send you a code, no password needed. There you upload your photos, share the QR with your guests and arrange everything."
                : ": te mandamos un código, sin contraseña. Ahí subes tus fotos, compartes el QR con tus invitados y ordenas todo."}
            </>
          ) : isEnglish ? (
            "Sign in with the email you paid with: we'll send you a code, no password needed. There you upload your photos, share the QR with your guests and arrange everything."
          ) : (
            "Entra con el correo con el que pagaste: te mandamos un código, sin contraseña. Ahí subes tus fotos, compartes el QR con tus invitados y ordenas todo."
          )}
        </p>

        {/* El regalo de la compra suelta: la boda nació con ella, y con sus 7
            días del panel completo. Hoja niebla sobre el papel azul. */}
        {pagado.bodaNueva && (
          <div className="panel-card mt-8 w-full max-w-md p-5 text-left">
            <p className="rotulo">{isEnglish ? "A gift for you" : "De regalo"}</p>
            <p className="mt-2 text-sm leading-relaxed text-noche">
              {isEnglish
                ? "You also get 7 days of the full Blue Book panel to plan your wedding: your guest list, your budget and your to-dos. No card needed."
                : "Además tienes 7 días del panel completo de Blue Book para organizar tu boda: tu lista de invitados, tu presupuesto y tus pendientes. Sin tarjeta."}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-tinta">
              {isEnglish
                ? "When they end, your album stays complete: you keep editing it and your guests keep uploading photos."
                : "Cuando terminen, tu álbum sigue completo: lo sigues editando y tus invitados siguen subiendo fotos."}
            </p>
          </div>
        )}

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <ButtonLink href={hrefDelPanel} arrow>
            {isEnglish ? "Open my panel" : "Entrar a mi panel"}
          </ButtonLink>
        </div>

        <Link
          href="/"
          className="mt-8 inline-flex min-h-11 items-center text-sm font-medium text-noche underline decoration-linea-control underline-offset-4 transition-colors hover:decoration-noche"
        >
          {isEnglish ? "Back to home" : "Volver al inicio"}
        </Link>
      </div>
    </div>
  );
}
