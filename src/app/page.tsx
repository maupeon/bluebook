import { Hero } from "@/components/Hero";
import { ServicesGrid } from "@/components/ServicesGrid";
import { PricingTable } from "@/components/PricingTable";
import { Testimonials } from "@/components/Testimonials";
import { FAQ } from "@/components/FAQ";
import { CTA } from "@/components/CTA";

export default function Home() {
  return (
    <>
      <Hero />
      <ServicesGrid />
      <PricingTable />
      <Testimonials />
      <FAQ />
      <CTA />
    </>
  );
}
