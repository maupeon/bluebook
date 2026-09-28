import { redirect } from "next/navigation";
import { datosDeLaPantalla } from "@/lib/panelSesion";
import { tituloDelPanel } from "@/lib/panelTitulo";
import { seccionesDelPanel } from "@/lib/seccionesDelPanel";
import { leerAcceso } from "@/lib/acceso";
import { leerSuscripcion } from "@/lib/suscripcion";
import { asegurarAlbumDeLaBoda, PLAN_DE_ALBUM_DEL_PLANNER } from "@/lib/albumDeLaBoda";
import { registrarPagoDeAlbum } from "@/lib/albumPagado";
import { incluidoEnSuPlan, leerAlbumDelPanel, leerEstadoDelAlbum } from "./leerEstadoDelAlbum";
import { PantallaAlbum } from "./PantallaAlbum";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return tituloDelPanel("Álbum", "Album");
}

/** Lo que Stripe pone en {CHECKOUT_SESSION_ID}. Lo demás ni se le pregunta. */
const SESION_RE = /^cs_[A-Za-z0-9_]{8,}$/;

/**
 * Al volver de Stripe, el pago del álbum se registra AQUÍ y no sólo en el
 * webhook, como en /panel/plan: el webhook puede tardar (o no llegar, en local)
 * y la pareja vería «Aún no lo tienen» justo después de pagar.
 * registrarPagoDeAlbum (frente C) es idempotente: el que llegue segundo lo
 * encuentra hecho.
 *
 * - 'registrado': el álbum ya es de ESTA boda.
 * - 'en_camino':  Stripe aún no lo da por pagado o algo falló; el webhook sigue
 *                 su curso y la pantalla lo dice sin alarmar.
 * - null:         la sesión es de otra boda, o no hay nada que hacer.
 */
async function registrarAlVolver(
  sessionId: string,
  weddingId: string
): Promise<"registrado" | "en_camino" | null> {
  if (!SESION_RE.test(sessionId)) return null;
  try {
    const pagado = await registrarPagoDeAlbum(sessionId);
    if (!pagado) return "en_camino";
    // Que el álbum pagado sea de ESTA boda. Pegar aquí el session_id de otra
    // pareja no le hace nada a nadie (el registro es idempotente y va a la
    // boda de la metadata), pero esta pantalla no debe anunciar un pago ajeno.
    if (pagado.weddingId !== weddingId) {
      console.error(`[album] la sesión ${sessionId} no es de la boda ${weddingId}`);
      return null;
    }
    return "registrado";
  } catch (err) {
    console.error(`[album] no se pudo registrar el pago al volver de Stripe (${sessionId}):`, err);
    return "en_camino";
  }
}

export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; listo?: string }>;
}) {
  const datos = await datosDeLaPantalla();
  // Sin boda el layout ya enseña NoWedding; aquí no hay nada que pintar.
  if (!datos) return null;
  // La misma regla que el menú (hoy, para toda boda).
  if (!seccionesDelPanel(datos.bundle).album) redirect("/panel");

  const { wedding } = datos.bundle;
  const { session_id: sessionId, listo } = await searchParams;

  let pagoEnCamino = false;
  if (sessionId) {
    const resultado = await registrarAlVolver(sessionId, wedding.id);
    // El layout ya leyó el álbum ANTES del pago (cacheado por petición): en
    // esta misma petición el menú seguiría diciendo «Aún no lo tienen». Otra
    // petición lo lee fresco, y de paso el session_id sale de la barra de
    // direcciones y recargar no vuelve a registrar nada.
    // (redirect lanza: va fuera del try de registrarAlVolver a propósito.)
    if (resultado === "registrado") redirect("/panel/album?listo=1");
    pagoEnCamino = resultado === "en_camino";
  }

  // Las tres cacheadas por petición: el layout ya las pidió.
  const [acceso, suscripcion, albumLeido] = await Promise.all([
    leerAcceso(wedding.id),
    leerSuscripcion(wedding.id),
    leerEstadoDelAlbum(wedding.id),
  ]);
  let album = albumLeido;
  const incluido = incluidoEnSuPlan(suscripcion);

  // El Planner completo (el plan mensual) incluye el álbum Ilimitado. Nace al
  // pagar el plan (registrarPagoDeBoda) y suscripcion.ts lo reintenta en cada
  // evento; si una boda con el plan pagado llega aquí sin álbum —pagó antes de
  // esto, o aquellos pasos fallaron— se crea ahora en vez de venderle lo que
  // ya pagó. asegurar_album_de_la_boda es idempotente: si el álbum apareció
  // entre tanto, no crea otro. La lectura de después va sin caché: la
  // cacheada devolvería el null de hace un momento. (El título, como en
  // /api/panel/album/comprar: el nombre de la boda; sin él, el de la RPC.)
  if (!album && incluido) {
    try {
      await asegurarAlbumDeLaBoda({
        weddingId: wedding.id,
        plan: PLAN_DE_ALBUM_DEL_PLANNER,
        origen: "plan",
        titulo: (wedding.displayName || wedding.coupleName || "").trim().slice(0, 100) || null,
      });
      album = await leerAlbumDelPanel(wedding.id);
    } catch (err) {
      console.error(`[album] no se pudo crear el álbum incluido de la boda ${wedding.id}:`, err);
    }
  }

  return (
    <PantallaAlbum
      album={album}
      pareja={wedding.coupleName || null}
      fecha={wedding.weddingDate}
      acceso={acceso}
      incluido={incluido}
      diasRestantes={datos.diasRestantes}
      listo={listo === "1" && album != null}
      pagoEnCamino={pagoEnCamino}
    />
  );
}
