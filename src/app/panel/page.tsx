import { datosDeLaPantalla } from "@/lib/panelSesion";
import { tituloDelPanel } from "@/lib/panelTitulo";
import { PantallaHoy } from "@/components/panel/pantallas/PantallaHoy";
import { leerSuscripcion } from "@/lib/suscripcion";
import { leerAcceso } from "@/lib/acceso";
import { incluidoEnSuPlan, leerEstadoDelAlbum } from "@/app/panel/album/leerEstadoDelAlbum";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return tituloDelPanel("Panel", "Panel");
}

export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}) {
  const datos = await datosDeLaPantalla();
  // Sin boda el layout ya enseña NoWedding; aquí no hay nada que pintar.
  if (!datos) return null;
  const weddingId = datos.bundle.wedding.id;
  // Cacheadas por petición: lo que el layout ya pidió no cuesta otro viaje.
  const [suscripcion, acceso, album, params] = await Promise.all([
    leerSuscripcion(weddingId),
    leerAcceso(weddingId),
    leerEstadoDelAlbum(weddingId),
    searchParams,
  ]);
  // El onboarding aterriza aquí con ?bienvenida=1 la primera vez.
  const bienvenida = params.bienvenida === "1";
  return (
    <PantallaHoy
      bundle={datos.bundle}
      diasRestantes={datos.diasRestantes}
      suscripcion={suscripcion}
      acceso={acceso}
      bienvenida={bienvenida}
      album={album}
      // El Planner completo (el plan mensual) trae el álbum Ilimitado.
      albumIncluido={incluidoEnSuPlan(suscripcion)}
    />
  );
}
