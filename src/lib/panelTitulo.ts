import "server-only";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { LANGUAGE_COOKIE, parseLanguage } from "@/lib/language";

/**
 * El título de la pestaña, en el idioma de la pareja.
 *
 * Las cinco rutas lo tenían estático y sólo en español, así que una pareja con
 * el panel en inglés leía "El día" en la pestaña mientras la pantalla decía
 * "Your day, hour by hour". Es lo único del panel que no se traducía.
 *
 * Va en su propio módulo porque generateMetadata corre en el servidor y no
 * puede usar useLanguage, que es un hook de cliente.
 */
export async function tituloDelPanel(es: string, en: string): Promise<Metadata> {
  const cookieStore = await cookies();
  const isEnglish = parseLanguage(cookieStore.get(LANGUAGE_COOKIE)?.value) === "en";
  return {
    title: isEnglish ? en : es,
    robots: { index: false, follow: false },
  };
}
