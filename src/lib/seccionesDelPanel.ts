import type { PanelBundle } from "@/lib/couplePanel";

export interface SeccionesDelPanel {
  /** /panel/proveedores: proveedores, sus pagos y contratos, y el presupuesto. */
  proveedores: boolean;
  /** /panel/dia: el guion del día. */
  dia: boolean;
  /**
   * /panel/album: el álbum digital. Siempre: con álbum lo administran; sin él
   * la sección enseña cómo se ve y cómo tenerlo (el Planner completo lo
   * incluye, o se compra solo). A nadie le promete algo que no puede tener.
   */
  album: boolean;
}

/**
 * Qué destinos del panel se enseñan. UNA definición: la usan el menú, la
 * pantalla "Hoy" y las propias rutas, que redirigen a /panel si la sección no
 * toca. Si cada uno decidiera por su cuenta, el menú podría esconder algo a
 * lo que la tarjeta de Hoy sigue enlazando.
 *
 * Proveedores y El día son del Planner (con planner o en prueba). Para una
 * boda de solo invitaciones son pantallas que no contrataron: desde la 0040 la
 * pareja captura sus proveedores, pero eso es parte del Planner, no de la
 * invitación. Pero NO se decide solo
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
    proveedores: conPlanner || hayDinero,
    dia: conPlanner || hayGuion,
    album: true,
  };
}
