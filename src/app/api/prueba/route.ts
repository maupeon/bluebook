import { NextResponse, after, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { correoDelPanel } from "@/lib/panelSesion";
import {
  avisarBienvenidaDePrueba,
  avisarNuevaPrueba,
  type DatosDeLaPrueba,
} from "@/lib/avisosDePrueba";
import { etiquetaDePrioridad, limpiarCuerpo } from "@/components/onboarding/respuestas";

// POST /api/prueba — la boda nace aquí: la prueba de siete días, sin tarjeta.
//
// La llama el último paso de /comenzar cuando ya hay sesión (Google o el
// código del correo). El correo sale SIEMPRE de la sesión y nunca del cuerpo:
// empezar_prueba confía en que ya está verificado, y es la llave del panel.

/** Un cuerpo legítimo mide unos cientos de bytes. Más que esto no es una boda. */
const CUERPO_MAX = 8_000;

/**
 * Hoy en México, para el rango de fechas. El servidor corre en UTC, y a las
 * 7 de la noche en la CDMX ya sería mañana: una boda puesta para «dentro de
 * cinco años justos» se descartaría por un día.
 */
function hoyEnMexico(): string {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const de = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  return `${de("year")}-${de("month")}-${de("day")}`;
}

export async function POST(req: NextRequest) {
  const email = await correoDelPanel();
  if (!email) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  let crudo: unknown;
  try {
    const texto = await req.text();
    if (texto.length > CUERPO_MAX) {
      return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
    }
    crudo = texto ? JSON.parse(texto) : {};
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const datos = limpiarCuerpo(crudo, hoyEnMexico());
  if (!datos) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  // Solo lo que se contestó: empezar_prueba convierte lo ausente en NULL, y
  // mandar null explícito daría lo mismo pero ensucia el log de la RPC.
  const pDatos: Record<string, unknown> = { idioma: datos.idioma };
  if (datos.nombre) pDatos.nombre = datos.nombre;
  if (datos.pareja) pDatos.pareja = datos.pareja;
  if (datos.fecha) pDatos.fecha = datos.fecha;
  if (datos.lugar) pDatos.lugar = datos.lugar;
  if (datos.invitados != null) pDatos.invitados = datos.invitados;
  if (datos.presupuesto != null) pDatos.presupuesto = datos.presupuesto;
  if (datos.prioridades.length) pDatos.prioridades = datos.prioridades;
  // Con «+», como el resto de los teléfonos de la base (couple_leads los
  // guarda así desde /api/leads). El emparejamiento del agente usa los
  // últimos diez dígitos, así que el signo no estorba.
  if (datos.telefono) pDatos.telefono = `+${datos.telefono}`;

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("empezar_prueba", {
    p_email: email,
    p_datos: pDatos,
  });

  const res = data as { wedding_id?: string; ya_existia?: boolean; prueba_termina_en?: string } | null;
  if (error || !res?.wedding_id) {
    console.error("[api/prueba] empezar_prueba falló:", error?.message ?? "sin wedding_id");
    return NextResponse.json(
      {
        error:
          datos.idioma === "en"
            ? "We couldn't save your wedding. Please try again."
            : "No pudimos guardar tu boda. Inténtalo de nuevo.",
      },
      { status: 500 }
    );
  }

  const weddingId = res.wedding_id;
  const yaExistia = res.ya_existia === true;

  if (!yaExistia) {
    const aviso: DatosDeLaPrueba = {
      weddingId,
      email: email.trim().toLowerCase(),
      nombre: datos.nombre,
      pareja: datos.pareja,
      fecha: datos.fecha,
      lugar: datos.lugar,
      invitados: datos.invitados,
      presupuesto: datos.presupuesto,
      // En palabras y en español: la lista la lee el equipo en su correo, no
      // una máquina. En la base quedan las claves (couple_leads.priorities).
      prioridades: datos.prioridades.map((p) => etiquetaDePrioridad(p, false)),
      telefono: datos.telefono ? `+${datos.telefono}` : null,
      terminaEn: res.prueba_termina_en ?? new Date(Date.now() + 7 * 86_400_000).toISOString(),
      isEnglish: datos.idioma === "en",
    };
    // Después de responder: que un correo tarde o falle no la deja esperando
    // frente a un botón, ni convierte una boda ya creada en un error.
    after(async () => {
      const resultados = await Promise.allSettled([
        avisarBienvenidaDePrueba(aviso),
        avisarNuevaPrueba(aviso),
      ]);
      for (const r of resultados) {
        if (r.status === "rejected") console.error("[api/prueba] un aviso no salió:", r.reason);
      }
    });
  }

  return NextResponse.json({ weddingId, yaExistia });
}
