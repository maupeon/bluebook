import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { getCoupleWeddingByEmail } from "@/lib/couplePanel";
import { sesionDeComenzar } from "./sesion";

export const metadata: Metadata = {
  title: { absolute: "Empieza tu boda | Blue Book" },
  description:
    "Cuéntanos de tu boda en dos minutos y prueba tu panel siete días gratis, sin tarjeta.",
  robots: { index: false },
};

// Los enlaces viejos traen ?servicio= y ?express= (Plans.tsx, correos ya
// enviados). Ya no eligen nada: el plan se decide al terminar la prueba. Se
// ignoran sin romper la página.
export default async function ComenzarPage() {
  const sesion = await sesionDeComenzar();

  // Quien ya tiene boda no vuelve a contarla: entra a la suya.
  if (sesion && (await getCoupleWeddingByEmail(sesion.correo))) {
    redirect("/panel");
  }

  return (
    <Onboarding
      modo="nuevo"
      correoDeSesion={sesion?.correo ?? null}
      nombreDeGoogle={sesion?.nombreDeGoogle ?? null}
    />
  );
}
