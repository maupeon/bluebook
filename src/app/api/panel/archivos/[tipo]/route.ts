import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPanelDataByEmail } from "@/lib/couplePanel";
import {
  NOMBRE_DE_ARCHIVO,
  esTipoDeArchivo,
  leerInvitados,
  libroBanquete,
  libroBarra,
  libroInvitados,
  libroMesas,
  libroMinuta,
} from "@/lib/archivosProveedores";
import { leerPlanBarra } from "@/lib/barraGuardada";
import { planInicial } from "@/lib/barra";
import { nombreDeArchivo, respuestaXlsx } from "@/lib/excel/libro";

export const dynamic = "force-dynamic";

// GET /api/panel/archivos/{invitados|banquete|mesas|minuta|barra}
//
// El Excel que cada proveedor pide, armado en el momento con lo que hay en la
// base. La boda sale del correo de la sesión, nunca de la URL.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tipo: string }> }
) {
  const { tipo } = await params;
  if (!esTipoDeArchivo(tipo)) {
    return NextResponse.json({ error: "Ese archivo no existe." }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const datos = await getPanelDataByEmail(user.email);
  if (!datos) {
    return NextResponse.json({ error: "No encontramos su boda." }, { status: 404 });
  }
  const { wedding, bundle } = datos;

  try {
    let libro;
    if (tipo === "invitados") {
      libro = libroInvitados(wedding, bundle, await leerInvitados(wedding.id));
    } else if (tipo === "banquete") {
      libro = libroBanquete(wedding, bundle, await leerInvitados(wedding.id));
    } else if (tipo === "mesas") {
      if (bundle.seating.unavailable) {
        return NextResponse.json({ error: "Todavía no hay mesas acomodadas." }, { status: 404 });
      }
      libro = libroMesas(wedding, bundle);
    } else if (tipo === "minuta") {
      if (bundle.runOfShow.unavailable || bundle.runOfShow.blocks.length === 0) {
        return NextResponse.json({ error: "Todavía no hay minuta." }, { status: 404 });
      }
      libro = libroMinuta(wedding, bundle);
    } else {
      // Sin nada guardado baja la receta tal cual, para sus confirmados.
      const guardado = await leerPlanBarra(wedding.id);
      libro = libroBarra(wedding, guardado?.plan ?? planInicial(bundle.guests.attending));
    }
    return await respuestaXlsx(libro, nombreDeArchivo(NOMBRE_DE_ARCHIVO[tipo], wedding.coupleName));
  } catch (err) {
    console.error(`[archivos] no se pudo armar ${tipo} de ${wedding.id}:`, err);
    return NextResponse.json({ error: "No pudimos armar el archivo. Inténtenlo otra vez." }, { status: 500 });
  }
}
