import { redirect } from "next/navigation";
import { datosDeLaPantalla } from "@/lib/panelSesion";
import { seccionesDelPanel } from "@/lib/seccionesDelPanel";
import { tituloDelPanel } from "@/lib/panelTitulo";
import { leerAcceso } from "@/lib/acceso";
import { leerPlanReparto, leerPrioridades } from "@/lib/repartoGuardado";
import { PLAN_VACIO } from "@/lib/reparto";
import { leerProveedores } from "@/lib/proveedoresServidor";
import { PantallaProveedores } from "@/components/panel/pantallas/PantallaProveedores";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return tituloDelPanel("Proveedores", "Vendors");
}

export default async function Pagina() {
  const datos = await datosDeLaPantalla();
  // Sin boda el layout ya enseña NoWedding; aquí no hay nada que pintar.
  if (!datos) return null;
  // Sin planner y sin nada capturado no hay pantalla que enseñar; el menú ya
  // no la ofrece, esto cubre al que llega por el enlace directo.
  if (!seccionesDelPanel(datos.bundle).proveedores) redirect("/panel");

  // El reparto solo existe con presupuesto: sin cifra no se lee nada.
  const { wedding } = datos.bundle;
  const conPresupuesto = wedding.budgetTotal != null && wedding.budgetTotal > 0;
  const [acceso, proveedores, plan, prioridades] = await Promise.all([
    leerAcceso(wedding.id),
    // Si la lectura falla, la pantalla enseña el dinero y un aviso: el
    // presupuesto no debe caerse porque falte una columna o un bucket.
    leerProveedores(wedding.id, datos.bundle.checklist).catch((err: unknown) => {
      console.error(`[proveedores] no se pudieron leer los de ${wedding.id}:`, err);
      return null;
    }),
    conPresupuesto ? leerPlanReparto(wedding.id) : Promise.resolve(PLAN_VACIO),
    conPresupuesto ? leerPrioridades(wedding.id) : Promise.resolve([]),
  ]);

  return (
    <PantallaProveedores
      bundle={datos.bundle}
      datos={proveedores}
      planReparto={plan}
      prioridades={prioridades}
      soloLectura={!acceso.puedeEditar}
    />
  );
}
