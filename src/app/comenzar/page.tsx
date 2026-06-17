import type { Metadata } from "next";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import type { CoupleService } from "@/lib/weddingPlans";

export const metadata: Metadata = {
  title: { absolute: "Comenzar | Blue Book" },
  description:
    "Cuéntennos de su boda en dos minutos y su planner les escribe por WhatsApp en menos de 24 horas.",
  robots: { index: false },
};

export default async function ComenzarPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { servicio, express } = await searchParams;
  const value = Array.isArray(servicio) ? servicio[0] : servicio;

  const initialService: CoupleService | null =
    value === "planner"
      ? "planner"
      : value === "invitaciones" || value === "invitations"
        ? "invitations"
        : null;

  const expressValue = Array.isArray(express) ? express[0] : express;
  const isExpress = expressValue === "1" || expressValue === "true";

  return <OnboardingWizard initialService={initialService} express={isExpress} />;
}
