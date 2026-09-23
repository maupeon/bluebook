import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { AGENT_PLAN, getInvitationTier, type CoupleService } from "@/lib/weddingPlans";
import { sendLeadNotificationEmail } from "@/lib/email";

const PHONE_RE = /^\+\d{11,13}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const BUDGET_IDS = new Set(["lt100k", "100to200k", "200to400k", "gt400k", "na"]);

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

function cleanString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, 12);
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return badRequest("Solicitud inválida.");
  }

  // --- Service ---
  const service = body.service;
  if (service !== "planner" && service !== "invitations") {
    return badRequest("Elijan un servicio válido.");
  }

  // --- Names ---
  const partner1Name = cleanString(body.partner1Name, 80);
  if (!partner1Name) {
    return badRequest("Necesitamos al menos un nombre.");
  }
  const partner2Name = cleanString(body.partner2Name, 80);

  // --- Phones ---
  const partner1Phone = cleanString(body.partner1Phone, 20);
  if (!partner1Phone || !PHONE_RE.test(partner1Phone)) {
    return badRequest("Revisen el número de WhatsApp principal.");
  }
  const partner2Phone = cleanString(body.partner2Phone, 20);
  if (service === "planner" && (!partner2Phone || !PHONE_RE.test(partner2Phone))) {
    return badRequest("Para el planner necesitamos los dos números de WhatsApp.");
  }
  if (partner2Phone && !PHONE_RE.test(partner2Phone)) {
    return badRequest("Revisen el segundo número de WhatsApp.");
  }

  // --- Email ---
  // Obligatorio: es la llave del panel. Pagar sin correo dejaba a la pareja
  // sin forma de entrar (weddings.contact_email sale de aquí, ver 0022).
  const email = cleanString(body.email, 160);
  if (!email) {
    return badRequest("Necesitamos un correo: con él entran a su panel.");
  }
  if (!EMAIL_RE.test(email)) {
    return badRequest("Revisen el correo electrónico.");
  }
  const partner2Email = cleanString(body.partner2Email, 160);
  if (partner2Email && !EMAIL_RE.test(partner2Email)) {
    return badRequest("Revisen el segundo correo electrónico.");
  }

  // --- Wedding date ---
  let weddingDate: string | null = null;
  if (body.weddingDate !== null && body.weddingDate !== undefined && body.weddingDate !== "") {
    if (
      typeof body.weddingDate !== "string" ||
      !DATE_RE.test(body.weddingDate) ||
      Number.isNaN(Date.parse(body.weddingDate))
    ) {
      return badRequest("La fecha de la boda no es válida.");
    }
    weddingDate = body.weddingDate;
  }
  const noDateYet = body.noDateYet === true;

  // --- City ---
  const city = cleanString(body.city, 120);

  // --- Guest count ---
  let guestCount: number | null = null;
  if (body.guestCount !== null && body.guestCount !== undefined) {
    if (
      typeof body.guestCount !== "number" ||
      !Number.isInteger(body.guestCount) ||
      body.guestCount < 1 ||
      body.guestCount > 1000
    ) {
      return badRequest("El número de invitados no es válido.");
    }
    guestCount = body.guestCount;
  }

  // --- Chips ---
  const styles = cleanStringArray(body.styles);
  const priorities = cleanStringArray(body.priorities);

  let budgetRange: string | null = null;
  if (typeof body.budgetRange === "string" && BUDGET_IDS.has(body.budgetRange)) {
    budgetRange = body.budgetRange;
  }

  const language = body.language === "en" ? "en" : "es";

  // --- Quoted price (server-side, never trust the client) ---
  let quotedPriceMx: number | null = null;
  if (service === "planner") {
    quotedPriceMx = AGENT_PLAN.priceMxMonthly;
  } else if (guestCount !== null) {
    quotedPriceMx = getInvitationTier(guestCount).priceMx;
  }

  const validated = {
    service: service as CoupleService,
    partner1Name,
    partner1Phone,
    partner2Name,
    partner2Phone,
    email,
    partner2Email,
    weddingDate,
    noDateYet,
    city,
    guestCount,
    styles,
    priorities,
    budgetRange,
    quotedPriceMx,
    language,
  };

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: lead, error } = await supabase
    .from("couple_leads")
    .insert({
      service: validated.service,
      partner1_name: validated.partner1Name,
      partner1_phone: validated.partner1Phone,
      partner2_name: validated.partner2Name,
      partner2_phone: validated.partner2Phone,
      email: validated.email,
      partner2_email: validated.partner2Email,
      wedding_date: validated.weddingDate,
      no_date_yet: validated.noDateYet,
      city: validated.city,
      guest_count: validated.guestCount,
      budget_range: validated.budgetRange,
      styles: validated.styles,
      priorities: validated.priorities,
      quoted_price_mx: validated.quotedPriceMx,
      language: validated.language,
      details: validated,
    })
    .select("id")
    .single();

  if (error || !lead) {
    console.error("Error inserting couple lead:", error);
    return NextResponse.json(
      { error: "No pudimos guardar su solicitud" },
      { status: 500 }
    );
  }

  // Notify the team; never fail the request because of the email.
  try {
    await sendLeadNotificationEmail({ lead: validated });
  } catch (emailError) {
    console.error("Error sending lead notification email:", emailError);
  }

  return NextResponse.json({ ok: true, leadId: lead.id }, { status: 201 });
}
