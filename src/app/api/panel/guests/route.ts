import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getCoupleWeddingByEmail,
  type GuestConfirmation,
  type PanelGuest,
} from "@/lib/couplePanel";
import { normalizePhone } from "@/lib/phone";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NAME_MAX = 80;
const NOTES_MAX = 500;
const SEATS_MIN = 1;
const SEATS_MAX = 20;

type MembershipRow = {
  id: string;
  guest_name: string | null;
  seats: number | null;
  confirmation: string | null;
  notes: string | null;
  person_id: string;
  people?: unknown;
};

/** El join people(...) puede llegar como objeto o como arreglo: lo normalizamos. */
function personOf(m: { people?: unknown }) {
  const p = m.people;
  const row = Array.isArray(p) ? p[0] : p;
  return (row ?? null) as { name?: string | null; phone?: string | null } | null;
}

function toPanelGuest(m: MembershipRow): PanelGuest {
  const person = personOf(m);
  const confirmation = (
    ["pending", "confirmed", "declined", "maybe"].includes(
      String(m.confirmation)
    )
      ? m.confirmation
      : "pending"
  ) as GuestConfirmation;
  return {
    id: m.id,
    name: (m.guest_name ?? person?.name ?? "").trim(),
    phone: (person?.phone ?? "").trim(),
    seats: m.seats ?? 1,
    confirmation,
    notes: m.notes ?? null,
  };
}

const MEMBERSHIP_SELECT =
  "id, guest_name, seats, confirmation, notes, person_id, people(name, phone)";

/** Valida el nombre: no vacío, recortado a NAME_MAX. */
function parseName(value: unknown): { ok: true; value: string } | { ok: false } {
  if (typeof value !== "string") return { ok: false };
  const trimmed = value.trim();
  if (!trimmed) return { ok: false };
  return { ok: true, value: trimmed.slice(0, NAME_MAX) };
}

/**
 * Valida el teléfono. VACÍO ES VÁLIDO.
 *
 * Antes exigía last10 >= 8 siempre, así que no se podía dar de alta a la abuela
 * que no tiene celular: el formulario bloqueaba el envío y la pareja se
 * quedaba sin poder capturarla. En la boda piloto hay 22 grupos sin teléfono,
 * o sea que el modelo de datos ya lo contempla —people.phone es nullable y
 * phone_last10 sale nulo— y era sólo esta validación la que lo impedía.
 *
 * Un teléfono a medias sí se rechaza: escribir cuatro dígitos y guardar es un
 * error, no una decisión.
 */
function parsePhone(
  value: unknown
): { ok: true; phone: string | null; last10: string | null } | { ok: false } {
  if (value === undefined || value === null) return { ok: true, phone: null, last10: null };
  if (typeof value !== "string") return { ok: false };
  const phone = value.trim();
  if (!phone) return { ok: true, phone: null, last10: null };
  const last10 = normalizePhone(phone).slice(-10);
  if (last10.length < 8) return { ok: false };
  return { ok: true, phone, last10 };
}

/**
 * Valida la respuesta del invitado.
 *
 * Se aceptan sólo tres: van, no pueden, sin contestar. "maybe" existe en la
 * base porque el webhook de WhatsApp lo detecta, pero no se ofrece desde el
 * panel: es un estado que la pareja no necesita poder poner a mano.
 */
const RESPUESTAS = ["confirmed", "declined", "pending"] as const;
type Respuesta = (typeof RESPUESTAS)[number];

function parseConfirmation(
  value: unknown
): { ok: true; value: Respuesta } | { ok: false } {
  if (typeof value !== "string") return { ok: false };
  const v = value.trim() as Respuesta;
  return RESPUESTAS.includes(v) ? { ok: true, value: v } : { ok: false };
}

/** Valida los pases/lugares: entero 1..20, default 1. */
function parseSeats(value: unknown): { ok: true; value: number } | { ok: false } {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: 1 };
  }
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isInteger(n)) return { ok: false };
  if (n < SEATS_MIN || n > SEATS_MAX) return { ok: false };
  return { ok: true, value: n };
}

/** Valida las notas: opcional, recortadas a NOTES_MAX. */
function parseNotes(
  value: unknown
): { ok: true; value: string | null } | { ok: false } {
  if (value === undefined || value === null) return { ok: true, value: null };
  if (typeof value !== "string") return { ok: false };
  const trimmed = value.slice(0, NOTES_MAX);
  return { ok: true, value: trimmed.trim() ? trimmed : null };
}

async function readBody(
  req: NextRequest
): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// POST — agregar invitado
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // 1. Sesión
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  // 2. Boda propia (nunca confiamos en un wedding id del cliente)
  const wedding = await getCoupleWeddingByEmail(user.email);
  if (!wedding) {
    return NextResponse.json(
      { error: "No encontramos su boda." },
      { status: 404 }
    );
  }

  // 3. Body
  const body = await readBody(req);
  if (!body) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const name = parseName(body.name);
  if (!name.ok) {
    return NextResponse.json(
      { error: "El nombre del invitado es obligatorio." },
      { status: 400 }
    );
  }
  const phone = parsePhone(body.phone);
  if (!phone.ok) {
    return NextResponse.json(
      {
        error:
          "Ese teléfono no está completo. Si no lo tienen, déjenlo en blanco.",
      },
      { status: 400 }
    );
  }
  const seats = parseSeats(body.seats);
  if (!seats.ok) {
    return NextResponse.json(
      { error: "Los pases deben ser un número entre 1 y 20." },
      { status: 400 }
    );
  }
  const notes = parseNotes(body.notes);
  if (!notes.ok) {
    return NextResponse.json({ error: "Las notas no son válidas." }, { status: 400 });
  }

  const admin = createAdminClient();

  // 4. Encontrar o crear la persona global.
  //
  //    La deduplicación es POR TELÉFONO (people.phone_last10). Sin teléfono no
  //    hay llave, así que no se busca: se crea una persona nueva. Dos invitados
  //    sin teléfono y con el mismo nombre serían dos personas distintas, y está
  //    bien — adivinar que son la misma sería peor.
  let personId: string | undefined;

  if (phone.last10) {
    const { data: existingPerson } = await admin
      .from("people")
      .select("id")
      .eq("phone_last10", phone.last10)
      .maybeSingle();
    personId = existingPerson?.id as string | undefined;
  }

  if (!personId) {
    const { data: newPerson, error: personError } = await admin
      .from("people")
      .insert({ phone: phone.phone, name: name.value })
      .select("id")
      .single();
    if (personError || !newPerson) {
      return NextResponse.json(
        { error: "No pudimos guardar al invitado." },
        { status: 500 }
      );
    }
    personId = newPerson.id;
  }

  // 5. ¿Ya está en esta boda?
  const { data: existingMembership } = await admin
    .from("memberships")
    .select("id")
    .eq("wedding_id", wedding.id)
    .eq("person_id", personId)
    .maybeSingle();

  if (existingMembership) {
    return NextResponse.json(
      { error: "Ese teléfono ya está en su lista de invitados." },
      { status: 409 }
    );
  }

  // 6. Crear la membership
  const { data: inserted, error: insertError } = await admin
    .from("memberships")
    .insert({
      person_id: personId,
      wedding_id: wedding.id,
      guest_name: name.value,
      seats: seats.value,
      plus_ones_allowed: 0,
      notes: notes.value,
      confirmation: "pending",
      send_status: "pending",
      role: "guest",
      stage: "not_started",
    })
    .select(MEMBERSHIP_SELECT)
    .single();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: "No pudimos guardar al invitado." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { guest: toPanelGuest(inserted as MembershipRow) },
    { status: 201 }
  );
}

// ---------------------------------------------------------------------------
// PUT — editar invitado (por uuid de la membership)
// ---------------------------------------------------------------------------

export async function PUT(req: NextRequest) {
  // 1. Sesión
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  // 2. Boda propia
  const wedding = await getCoupleWeddingByEmail(user.email);
  if (!wedding) {
    return NextResponse.json(
      { error: "No encontramos su boda." },
      { status: 404 }
    );
  }

  // 3. Body
  const body = await readBody(req);
  if (!body) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const id = body.id;
  if (typeof id !== "string" || !id) {
    return NextResponse.json(
      { error: "Falta el identificador del invitado." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // 4. Resolver la boda de la membership y autorizar (anti-IDOR)
  const { data: membership, error: lookupError } = await admin
    .from("memberships")
    .select("id, wedding_id, person_id, people(phone)")
    .eq("id", id)
    .maybeSingle();

  if (lookupError || !membership) {
    return NextResponse.json(
      { error: "No encontramos a ese invitado." },
      { status: 404 }
    );
  }
  if (membership.wedding_id !== wedding.id) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  // 5. Allowlist de campos de la membership (jamás wedding_id)
  const update: Record<string, unknown> = {};

  if ("name" in body) {
    const name = parseName(body.name);
    if (!name.ok) {
      return NextResponse.json(
        { error: "El nombre del invitado es obligatorio." },
        { status: 400 }
      );
    }
    update.guest_name = name.value;
  }

  if ("seats" in body) {
    const seats = parseSeats(body.seats);
    if (!seats.ok) {
      return NextResponse.json(
        { error: "Los pases deben ser un número entre 1 y 20." },
        { status: 400 }
      );
    }
    update.seats = seats.value;
  }

  if ("notes" in body) {
    const notes = parseNotes(body.notes);
    if (!notes.ok) {
      return NextResponse.json(
        { error: "Las notas no son válidas." },
        { status: 400 }
      );
    }
    update.notes = notes.value;
  }

  // CONFIRMAR A MANO.
  //
  // Hasta ahora la respuesta sólo podía entrar por WhatsApp, y el panel se lo
  // decía a la pareja ("las etiquetas se actualizan solas"). Pero un tío que
  // confirma por teléfono, o en la calle, no tenía dónde apuntarse.
  //
  // El desglose manda sobre la etiqueta: v_invitados calcula
  //   personas_confirmadas = seats_confirmed  (si no es NULL)
  //                        = derivado de confirmation  (si lo es)
  // así que cambiar `confirmation` y dejar un desglose viejo debajo no movería
  // el conteo — es el mismo bug de "el valor derivado se congela" que ya
  // apareció antes en este proyecto. Por eso se limpia lo que CONTRADICE a la
  // respuesta nueva, y sólo eso:
  //   - "van"          -> se borra seats_declined; seats_confirmed se respeta,
  //                       porque si la planner registró "vienen 3 de 4", esa
  //                       sigue siendo la respuesta más fina y no la contradice.
  //   - "no pueden"    -> se borra seats_confirmed: sí la contradice.
  //   - "sin contestar"-> se borran los dos: no hay respuesta que desglosar.
  if ("confirmation" in body) {
    const respuesta = parseConfirmation(body.confirmation);
    if (!respuesta.ok) {
      return NextResponse.json(
        { error: "Esa respuesta no es válida." },
        { status: 400 }
      );
    }
    update.confirmation = respuesta.value;
    if (respuesta.value === "confirmed") {
      update.seats_declined = null;
    } else if (respuesta.value === "declined") {
      update.seats_confirmed = null;
    } else {
      update.seats_confirmed = null;
      update.seats_declined = null;
    }
  }

  // 6. Si cambió el teléfono: NUNCA mutamos en sitio la fila global `people`
  //    cuando es compartida por otras bodas (es deduplicada por phone_last10),
  //    porque eso reescribiría el contacto/destino de invitación de otra pareja.
  //    En su lugar: buscar-o-crear la persona del nuevo teléfono y repuntar
  //    ESTA membership hacia ella. Solo actualizamos en sitio cuando esta
  //    membership es la única referencia a la persona.
  if ("phone" in body) {
    const phone = parsePhone(body.phone);
    if (!phone.ok) {
      return NextResponse.json(
        {
          error:
            "Ese teléfono no está completo. Si no lo tienen, déjenlo en blanco.",
        },
        { status: 400 }
      );
    }

    const currentPhone = (personOf(membership)?.phone ?? "").trim();
    const newLast10 = phone.last10;
    const currentLast10 = normalizePhone(currentPhone).slice(-10);

    // No-op real: mismo contacto (mismo phone_last10). No tocamos nada.
    if (newLast10 !== currentLast10) {
      // ¿La persona actual es compartida por otra boda?
      const { data: otherRefs, error: refsError } = await admin
        .from("memberships")
        .select("id")
        .eq("person_id", membership.person_id)
        .neq("wedding_id", wedding.id)
        .limit(1);
      if (refsError) {
        return NextResponse.json(
          { error: "No pudimos actualizar el teléfono." },
          { status: 500 }
        );
      }
      const personIsShared = (otherRefs ?? []).length > 0;

      // ¿Existe ya una persona con el nuevo phone_last10? (dedup global)
      //
      // Sólo tiene sentido buscar si HAY teléfono nuevo. Al borrarlo,
      // newLast10 es null y `.eq("phone_last10", null)` no casa con las filas
      // nulas en PostgREST —eso se pide con `is.null`—, así que la consulta
      // devolvería vacío por el motivo equivocado. Sin llave no hay dedup:
      // se cae a las ramas de abajo, que crean o actualizan una persona sin
      // teléfono, que es justo lo que se quiere.
      let targetPersonId: string | undefined;

      if (newLast10) {
        const { data: existingPerson, error: existingError } = await admin
          .from("people")
          .select("id")
          .eq("phone_last10", newLast10)
          .maybeSingle();
        if (existingError) {
          return NextResponse.json(
            { error: "No pudimos actualizar el teléfono." },
            { status: 500 }
          );
        }
        targetPersonId = existingPerson?.id as string | undefined;
      }

      if (targetPersonId) {
        // (b) Reusar la persona existente del nuevo teléfono y repuntar.
        if (targetPersonId !== membership.person_id) {
          const { error: repointError } = await admin
            .from("memberships")
            .update({ person_id: targetPersonId, updated_by: "couple" })
            .eq("id", id);
          if (repointError) {
            return NextResponse.json(
              { error: "No pudimos actualizar el teléfono." },
              { status: 500 }
            );
          }
        }
      } else if (personIsShared) {
        // (a) Persona compartida y el nuevo teléfono no existe: crear una
        //     persona NUEVA y repuntar esta membership, dejando intacta la global.
        const { data: newPerson, error: createError } = await admin
          .from("people")
          .insert({ phone: phone.phone })
          .select("id")
          .single();
        if (createError || !newPerson) {
          return NextResponse.json(
            { error: "No pudimos actualizar el teléfono." },
            { status: 500 }
          );
        }
        targetPersonId = newPerson.id;
        const { error: repointError } = await admin
          .from("memberships")
          .update({ person_id: targetPersonId, updated_by: "couple" })
          .eq("id", id);
        if (repointError) {
          return NextResponse.json(
            { error: "No pudimos actualizar el teléfono." },
            { status: 500 }
          );
        }
      } else {
        // (c) Esta membership es la única referencia y el nuevo teléfono no
        //     existe: actualizar en sitio es seguro (no afecta a otras bodas).
        const { error: personError } = await admin
          .from("people")
          .update({ phone: phone.phone })
          .eq("id", membership.person_id);
        if (personError) {
          return NextResponse.json(
            { error: "No pudimos actualizar el teléfono." },
            { status: 500 }
          );
        }
      }
    }
  }

  // 7. Aplicar cambios de la membership (si los hay) y devolver el invitado
  if (Object.keys(update).length > 0) {
    // updated_by importa más que created_by en una fila que vive mucho: lo que
    // cambia una respuesta de "sin contestar" a "van" lo escribe alguien
    // distinto de quien dio de alta al invitado.
    update.updated_by = "couple";
    const { error: updateError } = await admin
      .from("memberships")
      .update(update)
      .eq("id", id);
    if (updateError) {
      return NextResponse.json(
        { error: "No pudimos guardar el cambio." },
        { status: 500 }
      );
    }
  }

  const { data: fresh, error: freshError } = await admin
    .from("memberships")
    .select(MEMBERSHIP_SELECT)
    .eq("id", id)
    .single();

  if (freshError || !fresh) {
    return NextResponse.json(
      { error: "No pudimos guardar el cambio." },
      { status: 500 }
    );
  }

  return NextResponse.json({ guest: toPanelGuest(fresh as MembershipRow) });
}

// ---------------------------------------------------------------------------
// DELETE — quitar invitado (solo la membership, la persona global se conserva)
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest) {
  // 1. Sesión
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  // 2. Boda propia
  const wedding = await getCoupleWeddingByEmail(user.email);
  if (!wedding) {
    return NextResponse.json(
      { error: "No encontramos su boda." },
      { status: 404 }
    );
  }

  // 3. Body
  const body = await readBody(req);
  if (!body) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const id = body.id;
  if (typeof id !== "string" || !id) {
    return NextResponse.json(
      { error: "Falta el identificador del invitado." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // 4. Resolver la boda de la membership y autorizar (anti-IDOR)
  const { data: membership, error: lookupError } = await admin
    .from("memberships")
    .select("id, wedding_id")
    .eq("id", id)
    .maybeSingle();

  if (lookupError || !membership) {
    return NextResponse.json(
      { error: "No encontramos a ese invitado." },
      { status: 404 }
    );
  }
  if (membership.wedding_id !== wedding.id) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  // 5. Borrar únicamente la membership (la persona global permanece)
  const { error: deleteError } = await admin
    .from("memberships")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json(
      { error: "No pudimos quitar al invitado." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
