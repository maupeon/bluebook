import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizarPlano, soloMesasVivas } from "@/lib/plano";
import { bodaParaEscribir, guardarPlano, leerCuerpo } from "@/lib/salon";

// PUT /api/panel/mesas/plano — guarda el dibujo del salón, entero.
//
// La pantalla lo manda completo cada vez (se guarda solo al dejar de mover
// cosas), igual que la lista de la barra. Las mesas del plano se filtran
// contra las de la boda: un id que no es suyo, o de una mesa ya borrada, no
// se guarda.
export async function PUT(req: NextRequest) {
  const r = await bodaParaEscribir();
  if ("respuesta" in r) return r.respuesta;
  const { wedding } = r;

  const body = await leerCuerpo(req);
  if (!body) return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });

  const limpio = normalizarPlano(body);
  if ("error" in limpio) return NextResponse.json({ error: limpio.error }, { status: 400 });

  const { data: mesas, error } = await createAdminClient()
    .from("wedding_tables")
    .select("id")
    .eq("wedding_id", wedding.id);
  if (error) return NextResponse.json({ error: "No pudimos guardar su plano." }, { status: 500 });

  const plano = soloMesasVivas(
    limpio.plano,
    ((mesas ?? []) as { id: string }[]).map((m) => m.id.toLowerCase())
  );
  const res = await guardarPlano(wedding.id, plano);
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json({ guardadoEn: res.guardadoEn });
}
