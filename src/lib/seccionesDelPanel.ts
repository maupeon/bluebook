import type { PanelBundle } from "@/lib/couplePanel";

export interface SeccionesDelPanel {
  /** /panel/dinero: presupuesto, pagos, checklist y proveedores. */
  dinero: boolean;
  /** /panel/dia: el guion del día. */
  dia: boolean;
}

/**
 * Qué destinos del panel se enseñan. UNA definición: la usan el menú, la
 * pantalla "Hoy" y las propias rutas, que redirigen a /panel si la sección no
 * toca. Si cada uno decidiera por su cuenta, el menú podría esconder algo a
 * lo que la tarjeta de Hoy sigue enlazando.
 *
 * Dinero y El día solo los llena una planner. Para una boda de solo
 * invitaciones son pantallas vacías para siempre ("Su planner aún no define el
 * presupuesto") que prometen algo que no contrataron. Pero NO se decide solo
 * por weddings.tier: las 8 bodas de hoy dicen 'invitations', incluida la piloto
 * con todo su dinero y su guion capturados. Esconderle eso sería peor que
 * enseñar de más. Regla: se enseña si la boda es con planner o si ya hay algo
 * que ver.
 *
 * La barra no está aquí: es una calculadora que no depende de nadie, y a una
 * pareja que organiza sola le sirve igual.
 *
 * Pura y sin dependencias de servidor: la importan componentes cliente.
 */
export function seccionesDelPanel(bundle: PanelBundle): SeccionesDelPanel {
  const conPlanner = bundle.wedding.tier === "full";

  const hayDinero =
    bundle.budget.budgetTotal != null ||
    bundle.budget.contracted > 0 ||
    bundle.vendors.length > 0 ||
    bundle.payments.length > 0 ||
    bundle.checklist.itemCount > 0;

  const hayGuion = !bundle.runOfShow.unavailable && bundle.runOfShow.blocks.length > 0;

  return {
    dinero: conPlanner || hayDinero,
    dia: conPlanner || hayGuion,
  };
}
