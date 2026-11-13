import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { recibirRespuesta, type CorreoRecibido } from "@/lib/cotizacionesPorCorreo";
import { pedirAlAdmin } from "@/lib/adminInterno";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/webhooks/correo-entrante — Resend Receiving (evento
// email.received) avisa que llegó un correo al dominio de respuestas (0054).
// Si va a cot-<clave>@…, es la respuesta de un proveedor a una cotización: se
// guarda con sus PDF (cotizacionesPorCorreo.ts) y, si la pidió el asistente,
// el admin le avisa a la pareja por WhatsApp.
//
// La firma se revisa con RESEND_WEBHOOK_SECRET (Svix). Sin secreto no entra
// nada. Lo que no es de una cotización se contesta 200 y se ignora: Resend no
// debe reintentarlo.

export async function POST(req: NextRequest) {
  const secreto = process.env.RESEND_WEBHOOK_SECRET;
  if (!secreto) return NextResponse.json({ error: "No configurado." }, { status: 503 });

  const payload = await req.text();
  let evento: { type?: string; data?: CorreoRecibido };
  try {
    // verify no llama a la API: la llave sólo hace falta para crear el cliente.
    evento = new Resend(process.env.RESEND_API_KEY || "re_sin_llave").webhooks.verify({
      payload,
      headers: {
        id: req.headers.get("svix-id") ?? "",
        timestamp: req.headers.get("svix-timestamp") ?? "",
        signature: req.headers.get("svix-signature") ?? "",
      },
      webhookSecret: secreto,
    }) as { type?: string; data?: CorreoRecibido };
  } catch {
    return NextResponse.json({ error: "Firma inválida." }, { status: 401 });
  }

  if (evento.type !== "email.received" || !evento.data?.email_id) {
    return NextResponse.json({ ok: true, ignorado: evento.type ?? "sin_tipo" });
  }

  try {
    const r = await recibirRespuesta(evento.data);
    console.log("[correo-entrante]", r.resultado, r.cotizacionId ?? "");
    if (r.resultado === "sin_lectura") {
      // Falta la llave de lectura o Resend falló: que lo reintente.
      return NextResponse.json({ error: "No se pudo leer el correo." }, { status: 503 });
    }
    if (r.resultado === "guardada" && r.avisarPorWhatsApp && r.cotizacionId) {
      const aviso = await pedirAlAdmin<{ resultado?: string }>("cotizaciones", { accion: "respondio", cotizacionId: r.cotizacionId }, 15_000);
      if (!aviso.ok) console.error("[correo-entrante] el admin no avisó por WhatsApp:", aviso.motivo);
    }
    return NextResponse.json({ ok: true, resultado: r.resultado });
  } catch (e) {
    console.error("[correo-entrante]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  }
}
