import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { seguirCotizaciones } from "@/lib/cotizacionesPorCorreo";
import { pedirAlAdmin } from "@/lib/adminInterno";

// GET /api/cron/cotizaciones — una vuelta al día (0054): recordatorio a los
// proveedores que no contestaron en 3 días (a lo mucho 2) y «sin_respuesta»
// después. Sólo las que pidió el asistente. Las de WhatsApp (0055) las sigue el
// admin, que tiene el número de proveedores: aquí sólo se le pide.
// Lo llama Vercel Cron (vercel.json)
// con «Authorization: Bearer <CRON_SECRET>».

export const maxDuration = 300;

function autorizado(req: NextRequest): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return false;
  const recibido = req.headers.get("authorization") ?? "";
  const huella = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(huella(recibido), huella(`Bearer ${secreto}`));
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const [correo, whatsapp] = await Promise.all([
    seguirCotizaciones(),
    pedirAlAdmin<{ recordadas: number; sinRespuesta: number; fallaron: number }>("cotizaciones", { accion: "seguir_whatsapp" }, 240_000),
  ]);
  const r = { correo, whatsapp: whatsapp.ok ? whatsapp.datos : { error: whatsapp.motivo } };
  console.log("[cron cotizaciones]", JSON.stringify(r));
  return NextResponse.json(r);
}
