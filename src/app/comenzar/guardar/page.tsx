import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { getCoupleWeddingByEmail } from "@/lib/couplePanel";
import { sesionDeComenzar } from "../sesion";

export const metadata: Metadata = {
  title: { absolute: "Guardando tu boda | Blue Book" },
  robots: { index: false, follow: false },
};

/**
 * La vuelta de Google (y del enlace del correo, si lo abre en esta misma
 * pestaña): /auth/callback?next=/comenzar/guardar trae aquí con la sesión ya
 * creada. Las respuestas esperan en sessionStorage; el cliente las lee, las
 * manda a /api/prueba y entra al panel. Nada personal viajó en la URL.
 */
export default async function GuardarPage() {
  const sesion = await sesionDeComenzar();

  // Sin sesión aquí no hay nada que guardar (Google falló o alguien escribió
  // la dirección a mano). /comenzar retoma el borrador de esta pestaña.
  if (!sesion) redirect("/comenzar");

  // Ya tenía boda: el correo de Google era el de una boda que ya existe.
  if (await getCoupleWeddingByEmail(sesion.correo)) redirect("/panel");

  return (
    <Onboarding modo="volviendo" correoDeSesion={sesion.correo} nombreDeGoogle={sesion.nombreDeGoogle} />
  );
}
