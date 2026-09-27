import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCoupleWeddingByEmail } from "@/lib/couplePanel";
import { exigirEdicion } from "@/lib/acceso";
import { LANGUAGE_COOKIE, parseLanguage } from "@/lib/language";
import { normalizarPlanReparto } from "@/lib/reparto";
import { borrarPlanReparto, guardarPlanReparto } from "@/lib/repartoGuardado";
import { createAdminClient } from "@/lib/supabase/admin";

// PUT /api/panel/reparto — guarda cómo reparte la pareja su presupuesto.
//
// La pantalla manda el plan entero en cada guardado (se guarda solo al dejar
// de escribir): solo las categorías en las que la pareja puso su cifra y las
// que agregó. Lo demás es la sugerencia, que no se guarda.
export async function PUT(req: NextRequest) {
  const en = parseLanguage(req.cookies.get(LANGUAGE_COOKIE)?.value) === "en";
  const t = (es: string, eng: string) => (en ? eng : es);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: t("No autenticado.", "Not signed in.") }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: t("Solicitud inválida.", "Invalid request.") }, { status: 400 });
  }

  const limpio = normalizarPlanReparto(body);
  if ("error" in limpio) {
    return NextResponse.json({ error: en ? limpio.error.en : limpio.error.es }, { status: 400 });
  }

  // La boda sale del correo de la sesión, nunca del cuerpo.
  const wedding = await getCoupleWeddingByEmail(user.email);
  if (!wedding) {
    return NextResponse.json({ error: t("No encontramos su boda.", "We couldn't find your wedding.") }, { status: 404 });
  }

  const cerrado = await exigirEdicion(wedding.id, en);
  if (cerrado) return cerrado;

  // Sin presupuesto no hay qué repartir, y guardar cifras por categoría sería
  // guardar el dato patrimonial sin el permiso que va con la cifra total. La
  // misma condición con la que «Su dinero» enseña el reparto.
  if (wedding.budgetTotal == null || wedding.budgetTotal <= 0) {
    return NextResponse.json(
      { error: t("Primero escriban su presupuesto en «Su boda».", "First set your budget in “Your wedding”.") },
      { status: 409 }
    );
  }

  const res = await guardarPlanReparto(wedding.id, limpio.plan);
  if ("error" in res) {
    return NextResponse.json({ error: t(res.error, "We couldn't save your split.") }, { status: 500 });
  }

  // Si la otra mitad de la pareja quitó el presupuesto mientras este guardado
  // viajaba, su borrado pudo llegar antes que este upsert y el reparto
  // renacería sin cifra ni permiso. Se vuelve a mirar y, si ya no hay
  // presupuesto, se deshace lo que se acaba de guardar.
  // Si la relectura FALLA no se deshace nada: borrar el reparto de la pareja
  // por un error de red, con un «ya no hay presupuesto» falso, era peor que la
  // carrera que esto cuida.
  const { data: ahora, error: errorAlReleer } = await createAdminClient()
    .from("weddings")
    .select("budget_total")
    .eq("id", wedding.id)
    .maybeSingle();
  if (errorAlReleer) {
    console.error(`[reparto] no se pudo releer el presupuesto de ${wedding.id}: ${errorAlReleer.message}`);
    return NextResponse.json({ guardadoEn: res.guardadoEn });
  }
  if (!ahora || ahora.budget_total == null || Number(ahora.budget_total) <= 0) {
    await borrarPlanReparto(wedding.id);
    return NextResponse.json(
      { error: t("Ya no hay presupuesto que repartir.", "There's no budget to split anymore.") },
      { status: 409 }
    );
  }
  return NextResponse.json({ guardadoEn: res.guardadoEn });
}
