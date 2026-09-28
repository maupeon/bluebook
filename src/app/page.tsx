import type { Metadata } from "next";
import { HomeHero } from "@/components/home/HomeHero";
import { ChaosToOrder } from "@/components/home/ChaosToOrder";
import { AllInOne } from "@/components/home/AllInOne";
import { Steps } from "@/components/home/Steps";
import { RealPlanner } from "@/components/home/RealPlanner";
import { HomeFaq } from "@/components/home/HomeFaq";
import { Versus } from "@/components/marketing/Versus";
import { Plans } from "@/components/marketing/Plans";
import { ClosingCTA } from "@/components/marketing/ClosingCTA";

export const metadata: Metadata = {
  title: { absolute: "Blue Book | Toda tu boda en un solo lugar" },
  description:
    "Proveedores, pagos, pendientes, invitaciones y confirmaciones en una plataforma que compartes con tu pareja. Pruébalo 7 días gratis, sin tarjeta; después, $1,000 MXN al mes con una wedding planner real, o invitaciones con confirmaciones desde $990 MXN en un solo pago.",
};

// El orden sigue lo que ella necesita oír: qué es (hero), qué le quita de
// encima (el caos), cómo se ve (todo en un lugar), por qué no una planner
// presencial (lado a lado), qué tan fácil es empezar, quién está detrás,
// cuánto cuesta, sus dudas y la decisión.
// La página anterior del álbum digital vive en /album-digital.
//
// Los fondos alternan los dos papeles de la marca: papel azul (hero,
// comparación, planner, preguntas) y niebla (el caos, todo en un lugar, los
// pasos, los planes). Donde la sección es niebla, lo dibujado y los precios
// van en tarjetas de papel azul; el cierre es una tarjeta niebla sobre papel.
export default function Home() {
  return (
    <div className="bg-papel">
      <HomeHero />
      <ChaosToOrder />
      <AllInOne />
      <Versus id="diferencia" />
      <Steps />
      <RealPlanner />
      <Plans id="precios-boda" />
      <HomeFaq />
      <ClosingCTA />
    </div>
  );
}
