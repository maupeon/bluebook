import { Hero } from "@/components/Hero";
// Comentado temporalmente - funcionalidades de invitaciones
// import { ServicesGrid } from "@/components/ServicesGrid";
// import { PricingTable } from "@/components/PricingTable";
// import { Testimonials } from "@/components/Testimonials";
import { FAQ } from "@/components/FAQ";
import { CTA } from "@/components/CTA";

export default function Home() {
  return (
    <>
      <Hero />
      {/* Comentado temporalmente - funcionalidades de invitaciones */}
      {/* <ServicesGrid /> */}
      {/* <PricingTable /> */}
      {/* <Testimonials /> */}
      <FAQ />
      <CTA />
    </>
  );
}
