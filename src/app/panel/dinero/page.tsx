import { redirect } from "next/navigation";

// «Dinero» ahora es «Proveedores»: el presupuesto vive debajo de ellos. Esto
// cuida los enlaces viejos (correos, marcadores, la barra del teléfono ya
// abierta antes de publicar).
export default function Pagina() {
  redirect("/panel/proveedores");
}
