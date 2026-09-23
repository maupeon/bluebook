import "server-only";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCoupleWeddingByEmail, type CoupleWedding } from "@/lib/couplePanel";
import type { EstiloDeInvitacion } from "@/lib/invitacionEstilos";
import { fechaDeInvitacion } from "@/lib/invitacionTexto";

/** Bucket público de lectura (0025). WhatsApp descarga la imagen por URL. */
export const BUCKET_INVITACIONES = "invitaciones";

/**
 * Cuántas invitaciones puede generar con IA una boda. Cada una cuesta dinero
 * en OpenAI y tarda hasta dos minutos; sin tope, una pareja indecisa (o un
 * script) genera sin fin. Las subidas no cuentan.
 */
export const LIMITE_DE_INVITACIONES_IA = 12;

/** Lo que la pantalla sabe de cada invitación. */
export interface InvitacionDeLaBoda {
  id: string;
  origen: "subida" | "ia";
  estilo: string | null;
  url: string;
  createdAt: string;
  elegida: boolean;
}

export function urlPublicaDeInvitacion(path: string): string {
  return createAdminClient().storage.from(BUCKET_INVITACIONES).getPublicUrl(path).data.publicUrl;
}

/**
 * La boda de quien hace la petición, o la respuesta de error lista para
 * devolver. La boda sale SIEMPRE del correo de la sesión, nunca del cuerpo.
 */
export async function bodaDeLaSesion(): Promise<
  { ok: true; wedding: CoupleWedding } | { ok: false; respuesta: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { ok: false, respuesta: NextResponse.json({ error: "No autenticado." }, { status: 401 }) };
  }
  const wedding = await getCoupleWeddingByEmail(user.email);
  if (!wedding) {
    return {
      ok: false,
      respuesta: NextResponse.json({ error: "No encontramos su boda." }, { status: 404 }),
    };
  }
  return { ok: true, wedding };
}

export async function invitacionesDeLaBoda(weddingId: string): Promise<{
  invitaciones: InvitacionDeLaBoda[];
  generadasConIA: number;
}> {
  const admin = createAdminClient();
  const [{ data: filas }, { data: boda }] = await Promise.all([
    admin
      .from("wedding_invitations")
      .select("id, origen, estilo, storage_path, created_at")
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: false }),
    admin.from("weddings").select("invitacion_id").eq("id", weddingId).maybeSingle(),
  ]);

  const elegida = boda?.invitacion_id ?? null;
  const invitaciones = (filas ?? []).map((f) => ({
    id: f.id as string,
    origen: f.origen as "subida" | "ia",
    estilo: (f.estilo as string | null) ?? null,
    url: urlPublicaDeInvitacion(f.storage_path as string),
    createdAt: f.created_at as string,
    elegida: f.id === elegida,
  }));
  return {
    invitaciones,
    generadasConIA: invitaciones.filter((i) => i.origen === "ia").length,
  };
}

/**
 * El prompt de la invitación.
 *
 * El TEXTO lo fija el servidor con los datos de la boda, entre comillas y en
 * español, y el prompt le prohíbe al modelo añadir otro. La pareja solo elige
 * el estilo y puede pedir un detalle, que se aplica a colores, flores u
 * ornamentos, nunca al texto. La propia guía de OpenAI avisa que el modelo
 * todavía puede fallar al colocar texto: por eso la pantalla obliga a revisar
 * nombres, fecha y lugar antes de elegir una.
 */
export function promptDeInvitacion({
  pareja,
  fecha,
  lugar,
  estilo,
  detalles,
}: {
  pareja: string;
  fecha: string;
  lugar: string | null;
  estilo: EstiloDeInvitacion;
  detalles: string | null;
}): string {
  const fechaImpresa = fechaDeInvitacion(fecha) ?? fecha;
  const lineas = [
    `1. "Nos casamos" — small, above the names.`,
    `2. "${pareja}" — the largest text, the focal point of the card.`,
    `3. "${fechaImpresa}"`,
    ...(lugar ? [`4. "${lugar}"`] : []),
  ];
  return [
    "A vertical wedding invitation card in 2:3 format, designed to be shared as an image on WhatsApp.",
    "Show the whole card flat, front view, filling the entire frame: not a photo of a card on a table, no hands, no envelope, no mockup.",
    "",
    `Art direction: ${estilo.direccion}`,
    "",
    "Print exactly this text, in Spanish, in this order, and nothing else. Keep every accent and every ñ exactly as written:",
    ...lineas,
    "",
    "Do not add any other words, dates, numbers, RSVP lines, hashtags, QR codes, logos or watermarks. No people or faces.",
    "Keep all text well inside the margins, centered, with strong contrast, and easy to read on a phone screen.",
    ...(detalles
      ? [
          "",
          `The couple also asked for: ${detalles}. Apply this only to colors, flowers or ornaments; never change, add or remove any text.`,
        ]
      : []),
  ].join("\n");
}

/** Lo que la pareja escribe como detalle: una línea, sin comillas, corta. */
export function limpiarDetalles(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.replace(/["“”\n\r]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
  return limpio || null;
}

/** Error con un mensaje que SÍ se le puede enseñar a la pareja. */
export class ErrorDeInvitacion extends Error {
  constructor(
    public readonly mensaje: string,
    public readonly status: number,
    detalle?: string
  ) {
    super(detalle ?? mensaje);
  }
}

/**
 * Genera la imagen con OpenAI (Image API, generations).
 *
 * Sin SDK: es una sola llamada, y así la app no gana una dependencia para
 * esto. El modelo se puede cambiar con OPENAI_IMAGE_MODEL sin tocar código.
 * 1024x1536 es el vertical nativo del modelo (2:3); JPEG porque es lo que
 * WhatsApp acepta en un encabezado de imagen y pesa mucho menos que PNG.
 */
export async function generarImagenDeInvitacion(prompt: string): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new ErrorDeInvitacion(
      "La creación con IA todavía no está disponible. Mientras tanto pueden subir la suya.",
      503,
      "Falta OPENAI_API_KEY"
    );
  }

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2.5-flare",
        prompt,
        size: "1024x1536",
        quality: "high",
        output_format: "jpeg",
        output_compression: 90,
        n: 1,
      }),
      // La guía avisa de hasta dos minutos; la ruta tiene maxDuration de 180.
      signal: AbortSignal.timeout(170_000),
    });
  } catch (error) {
    throw new ErrorDeInvitacion(
      "La IA tardó demasiado en responder. Inténtenlo otra vez.",
      504,
      error instanceof Error ? error.message : String(error)
    );
  }

  const cuerpo = (await res.json().catch(() => null)) as {
    data?: Array<{ b64_json?: string }>;
    error?: { message?: string; code?: string };
  } | null;

  if (!res.ok) {
    const codigo = cuerpo?.error?.code ?? "";
    if (codigo === "moderation_blocked" || /safety|moderation/i.test(cuerpo?.error?.message ?? "")) {
      throw new ErrorDeInvitacion(
        "La IA no quiso generar esa imagen. Prueben otro estilo o cambien el detalle que pidieron.",
        422,
        cuerpo?.error?.message
      );
    }
    throw new ErrorDeInvitacion(
      "No pudimos generar la invitación. Inténtenlo otra vez en un momento.",
      502,
      `OpenAI ${res.status}: ${cuerpo?.error?.message ?? "sin detalle"}`
    );
  }

  const b64 = cuerpo?.data?.[0]?.b64_json;
  if (!b64) {
    throw new ErrorDeInvitacion(
      "No pudimos generar la invitación. Inténtenlo otra vez en un momento.",
      502,
      "OpenAI respondió sin b64_json"
    );
  }
  return Buffer.from(b64, "base64");
}

/** Guarda la imagen en el bucket y devuelve su ruta. */
export async function guardarImagenDeInvitacion(
  weddingId: string,
  imagen: Buffer,
  contentType: "image/jpeg" | "image/png"
): Promise<string> {
  const extension = contentType === "image/png" ? "png" : "jpg";
  const path = `${weddingId}/${randomUUID()}.${extension}`;
  const { error } = await createAdminClient()
    .storage.from(BUCKET_INVITACIONES)
    .upload(path, imagen, { contentType, upsert: false });
  if (error) {
    throw new ErrorDeInvitacion(
      "No pudimos guardar la invitación. Inténtenlo otra vez.",
      500,
      `Storage: ${error.message}`
    );
  }
  return path;
}
