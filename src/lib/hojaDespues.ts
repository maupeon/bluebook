import "server-only";
import { after } from "next/server";
import { sincronizarPronto } from "@/lib/hojaDeGoogle";

/**
 * Algo cambió en los invitados de esta boda: si tiene su hoja de Google
 * ligada (0048), que la hoja lo reciba. Corre DESPUÉS de contestar (after), así
 * que quien guardó no espera ni se entera si Google tarda o falla; la hoja se
 * pone al día de todos modos en la siguiente vuelta.
 *
 * Las rutas que lo llaman necesitan maxDuration de sobra: la vuelta puede
 * esperar su turno hasta 20 segundos antes de empezar.
 */
export function avisarALaHoja(weddingId: string): void {
  after(async () => {
    try {
      await sincronizarPronto(weddingId);
    } catch (error) {
      console.error("[hoja] no se pudo sincronizar después del cambio:", error);
    }
  });
}
