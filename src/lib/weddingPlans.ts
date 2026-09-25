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
