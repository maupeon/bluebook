// Configuración de precios de los servicios para parejas (planner + invitaciones).
// Cambiar precios aquí: es la única fuente de verdad para landing, onboarding y API.

import type { Language } from "@/lib/language";

export type CoupleService = "planner" | "invitations";

// El nombre viaja a los checkouts nuevos de Stripe (checkoutDeBoda) y al resumen
// del onboarding. Antes decía «Planner con IA» y «Tu wedding planner en
// WhatsApp»: no hay IA que planee ni una planner que conteste por WhatsApp, y
// el nombre de lo que se cobra no puede prometer lo que no existe.
export const AGENT_PLAN = {
  id: "planner_monthly",
  priceMxMonthly: 1000,
  es: {
    name: "Planner completo",
    period: "al mes",
    description:
      "Toda tu boda en un panel que compartes con tu pareja: proveedores, pagos, pendientes, invitaciones y confirmaciones, con una wedding planner real cuidándola contigo.",
  },
  en: {
    name: "Full planner",
    period: "per month",
    description:
      "Your whole wedding in one dashboard you share with your partner: vendors, payments, to-dos, invitations and RSVPs, with a real wedding planner looking after it with you.",
  },
} as const;

// ---------------------------------------------------------------------------
// LOS TRES PLANES (desde el 13-nov-2026). Pago único por boda, sin cobros
// posteriores. Reemplazan al mensual de arriba, que ya no se vende: AGENT_PLAN
// se queda sólo para leer suscripciones viejas (al 13-nov no había ninguna).
//
// Lo que cuesta cada uno y por qué estos precios: memoria
// «planes-y-costo-del-asistente» (asistente ~MXN 0.40 por respuesta, más
// WhatsApp de invitaciones y el tiempo del equipo en Acompañamiento).
//
// Los límites del asistente (respuestas al mes) viven en la base, en
// public.cuota_del_asistente (migración 0053), porque los aplica el admin.
// Si cambian aquí, cambian allá: TURNOS_AL_MES es la copia que enseña el panel.
// ---------------------------------------------------------------------------

export type PlanId = "esencial" | "asistente" | "acompanamiento";

export interface PlanDeBoda {
  id: PlanId;
  priceMx: number;
  /** Orden para subir de plan: sólo se puede ir hacia arriba. */
  rango: number;
  /** El asistente por WhatsApp que cambia su panel con su «sí». */
  asistente: boolean;
  /** Respuestas del asistente al mes (uso justo). 0 = sin asistente. */
  turnosAlMes: number;
  /** Invitaciones por WhatsApp incluidas (una por invitado o grupo). */
  invitaciones: number;
  /** Asesorías de 45 minutos con el equipo. */
  asesorias: number;
  /** Incluye el álbum digital Ilimitado (para siempre). */
  album: boolean;
  /** Pedir cotizaciones a proveedores por correo desde el panel. */
  cotizaciones: boolean;
  recomendado?: boolean;
  es: { name: string; tagline: string; incluye: string[] };
  en: { name: string; tagline: string; incluye: string[] };
}

/** Meses después de la boda en que el asistente sigue contestando. */
export const MESES_DE_ASISTENTE_TRAS_LA_BODA = 3;

export const PLANES: Record<PlanId, PlanDeBoda> = {
  esencial: {
    id: "esencial",
    priceMx: 2990,
    rango: 1,
    asistente: false,
    turnosAlMes: 0,
    invitaciones: 0,
    asesorias: 0,
    album: false,
    cotizaciones: false,
    es: {
      name: "Esencial",
      tagline: "Todo tu panel, a tu ritmo.",
      incluye: [
        "Pendientes y fechas de toda tu boda",
        "Presupuesto, proveedores, pagos y contratos",
        "Lista de invitados y plano de mesas",
        "El guion del día",
      ],
    },
    en: {
      name: "Essential",
      tagline: "Your whole dashboard, at your pace.",
      incluye: [
        "To-dos and dates for your whole wedding",
        "Budget, vendors, payments and contracts",
        "Guest list and seating chart",
        "The day's run of show",
      ],
    },
  },
  asistente: {
    id: "asistente",
    priceMx: 5990,
    rango: 2,
    asistente: true,
    turnosAlMes: 300,
    invitaciones: 0,
    asesorias: 0,
    album: true,
    cotizaciones: false,
    recomendado: true,
    es: {
      name: "Con asistente",
      tagline: "Escríbele por WhatsApp y tu panel se actualiza.",
      incluye: [
        "Todo lo de Esencial",
        "Tu asistente por WhatsApp: pregúntale y pídele cambios; los hace con tu «sí»",
        "Notas de voz y PDF de cotizaciones o contratos",
        "Álbum digital ilimitado para tus invitados",
      ],
    },
    en: {
      name: "With assistant",
      tagline: "Message it on WhatsApp and your dashboard updates.",
      incluye: [
        "Everything in Essential",
        "Your WhatsApp assistant: ask it anything and request changes; it makes them on your «yes»",
        "Voice notes and PDFs of quotes or contracts",
        "Unlimited digital album for your guests",
      ],
    },
  },
  acompanamiento: {
    id: "acompanamiento",
    priceMx: 13990,
    rango: 3,
    asistente: true,
    turnosAlMes: 600,
    invitaciones: 200,
    asesorias: 3,
    album: true,
    cotizaciones: true,
    es: {
      name: "Acompañamiento",
      tagline: "Tu asistente y nuestro equipo, contigo.",
      incluye: [
        "Todo lo de Con asistente",
        "3 asesorías de 45 minutos: presupuesto, cronograma y propuestas",
        "Pide cotizaciones a proveedores por correo desde tu panel",
        "Invitaciones y confirmaciones por WhatsApp hasta 200 invitaciones",
      ],
    },
    en: {
      name: "Guided",
      tagline: "Your assistant and our team, with you.",
      incluye: [
        "Everything in With assistant",
        "3 45-minute sessions: budget, timeline and proposals",
        "Request vendor quotes by email from your dashboard",
        "WhatsApp invitations and RSVPs for up to 200 invitations",
      ],
    },
  },
};

export const PLAN_IDS: PlanId[] = ["esencial", "asistente", "acompanamiento"];

export function esPlanId(valor: unknown): valor is PlanId {
  return typeof valor === "string" && (PLAN_IDS as string[]).includes(valor);
}

/**
 * Lo que se cobra por pasar de `actual` a `nuevo`: la diferencia (pago único).
 * null si no es subir (mismo plan o uno menor).
 */
export function precioDeCambio(actual: PlanId | null, nuevo: PlanId): number | null {
  if (!actual) return PLANES[nuevo].priceMx;
  if (PLANES[nuevo].rango <= PLANES[actual].rango) return null;
  return PLANES[nuevo].priceMx - PLANES[actual].priceMx;
}

export interface InvitationTier {
  id: string;
  maxGuests: number | null; // null = cotización personalizada
  priceMx: number | null; // null = cotización personalizada
}

// Precio único por evento según número de invitados.
export const INVITATION_TIERS: InvitationTier[] = [
  { id: "inv_50", maxGuests: 50, priceMx: 990 },
  { id: "inv_100", maxGuests: 100, priceMx: 1490 },
  { id: "inv_150", maxGuests: 150, priceMx: 1990 },
  { id: "inv_200", maxGuests: 200, priceMx: 2490 },
  { id: "inv_custom", maxGuests: null, priceMx: null },
];

export const MIN_GUESTS = 10;
export const MAX_GUESTS_SLIDER = 250;

export function getInvitationTier(guestCount: number): InvitationTier {
  for (const tier of INVITATION_TIERS) {
    if (tier.maxGuests !== null && guestCount <= tier.maxGuests) {
      return tier;
    }
  }
  return INVITATION_TIERS[INVITATION_TIERS.length - 1];
}

export function formatMXN(amount: number): string {
  return `$${amount.toLocaleString("es-MX")} MXN`;
}

export function describeInvitationPrice(
  guestCount: number,
  language: Language
): string {
  const tier = getInvitationTier(guestCount);
  if (tier.priceMx === null) {
    return language === "en" ? "Custom quote" : "Cotización personalizada";
  }
  return formatMXN(tier.priceMx);
}
