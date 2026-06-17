import type { Metadata } from "next";
import { PlannerHero } from "@/components/planner/PlannerHero";
import { CapabilitiesSection } from "@/components/planner/CapabilitiesSection";
import { HowItWorksSection } from "@/components/planner/HowItWorksSection";
import { PathsSection } from "@/components/planner/PathsSection";
import { HumanSection } from "@/components/planner/HumanSection";
import { PlannerFAQ } from "@/components/planner/PlannerFAQ";
import { FinalCTA } from "@/components/planner/FinalCTA";

export const metadata: Metadata = {
  title: { absolute: "Blue Book | Tu wedding planner en WhatsApp" },
  description:
    "Blue Book es su wedding planner en WhatsApp: envía las invitaciones, confirma invitados, vigila el presupuesto y las fechas de pago, y les recuerda cada pendiente. IA supervisada por una wedding planner real, desde $1,000 MXN al mes. Invitaciones con confirmaciones desde $990 MXN por evento.",
};

// La página anterior del álbum digital vive en /album-digital.
export default function Home() {
  return (
    <div className="bg-bone">
      <PlannerHero />
      <CapabilitiesSection />
      <HowItWorksSection />
      <PathsSection />
      <HumanSection />
      <PlannerFAQ />
      <FinalCTA />
    </div>
  );
}
