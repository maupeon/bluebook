"use client";

import { ShieldCheck } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Blu, Burbuja, Garabatos } from "@/components/marketing/Blu";
import { RsvpToast } from "@/components/marketing/Mockups";
import { ButtonLink, Container, Display, Em, Lead } from "@/components/marketing/ui";
import { DIAS_DE_PRUEBA } from "@/lib/accesoDeLaBoda";
import { PLANES, formatMXN } from "@/lib/weddingPlans";

/*
 * LA PORTADA. Blu primero.
 *
 * Antes, en el teléfono la portada era sólo texto: el teléfono de muestra
 * quedaba hasta abajo y los avisos que lo acompañaban se escondían debajo de
 * 640px. Ahora Blu abre la página en cualquier ancho: arriba del titular en el
 * teléfono, a la derecha en la compu.
 *
 * El movimiento es UNA entrada coreografiada, la única «escena» del sitio
 * (clases .entrada-*, globals.css): la mancha azul se infla, Blu sube desde
 * ella, los garabatos y el aviso de confirmación aparecen después, cada uno
 * desde su lado. Sin ciclos infinitos ni flotación: la calma es la marca.
 * Con «Reducir movimiento» todo aparece con un fundido corto.
 */
export function HomeHero() {
  const { isEnglish: en } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-papel pb-20 pt-[4.25rem] sm:pt-28 lg:pb-28 lg:pt-32">
      <Container>
        <div className="grid items-center gap-y-5 sm:gap-y-6 lg:grid-cols-[1.05fr_1fr] lg:gap-x-10">
          {/* Blu. En el teléfono va primero (order) y mide lo que la pantalla
              permite sin empujar los botones fuera de la primera vista
              (12.5rem: caben hasta en un iPhone SE con la barra de Safari). */}
          <div className="relative mx-auto w-full max-w-[12.5rem] sm:max-w-[22rem] lg:order-2 lg:max-w-[34rem]">
            <Burbuja className="entrada-mancha absolute inset-x-[2%] bottom-[2%] top-[14%]" />
            <Garabatos className="entrada-garabato pointer-events-none absolute inset-0" />
            <Blu
              pose="hero"
              priority
              sizes="(min-width: 1024px) 34rem, (min-width: 640px) 22rem, 12.5rem"
              className="entrada-blu relative"
              alt={
                en
                  ? "Blu, Blue Book's wedding planner, daydreaming at her laptop"
                  : "Blu, la wedding planner de Blue Book, soñando despierta frente a su laptop"
              }
            />
            {/* El aviso de confirmación, pegado a la orilla del dibujo. En el
                teléfono, más chico y encimado a la laptop, para que se vea el
                producto desde el primer vistazo. */}
            <div className="entrada-aviso absolute -bottom-3 -left-2 origin-bottom-left scale-[0.82] sm:-left-10 sm:scale-95 lg:-left-16 lg:bottom-6 lg:scale-100">
              <RsvpToast en={en} />
            </div>
          </div>

          {/* En el teléfono los botones van justo debajo del titular, para que
              se vean sin bajar: titular → botones → la explicación. En la compu
              vuelve el orden de lectura de siempre (titular → texto → botones).
              El orden lo pone `order` en una columna flex; el DOM conserva el
              orden de lectura de la compu. */}
          <div className="flex flex-col text-center lg:order-1 lg:text-left">
            <p className="entrada-texto rotulo inline-flex items-center gap-2 self-center rounded-full bg-niebla px-3.5 py-1.5 ring-1 ring-linea max-sm:hidden lg:self-start">
              {en ? "Your wedding planning friend" : "Tu amiga wedding planner"}
            </p>

            <Display className="entrada-texto sm:mt-5 lg:text-left" style={{ "--entrada": "90ms" } as React.CSSProperties}>
              {en ? (
                <>
                  Plan your wedding <Em>with Blu</Em>
                </>
              ) : (
                <>
                  Planea tu boda <Em>con Blu</Em>
                </>
              )}
            </Display>

            <div className="entrada-texto max-sm:order-2" style={{ "--entrada": "180ms" } as React.CSSProperties}>
              <Lead className="mx-auto mt-5 max-w-[34rem] lg:mx-0">
                {en
                  ? "Vendors, payments, to-dos, invitations and RSVPs in one platform you share with your partner. Blu keeps you organized, step by step, from the first idea to the big day."
                  : "Proveedores, pagos, pendientes, invitaciones y confirmaciones en una plataforma que compartes con tu pareja. Blu te mantiene organizada, paso a paso, de la primera idea al gran día."}
              </Lead>
            </div>

            <div className="entrada-texto max-sm:order-1" style={{ "--entrada": "150ms" } as React.CSSProperties}>
              <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:mt-8 sm:flex-row sm:items-center lg:justify-start">
                <ButtonLink href="/comenzar" arrow>
                  {en ? "Start planning" : "Empieza a planear"}
                </ButtonLink>
                <ButtonLink href="#conoce-a-blu" variant="secondary">
                  {en ? "Meet Blu" : "Conoce a Blu"}
                </ButtonLink>
              </div>
              {/* Lo que pasa después de la prueba, dicho antes de que lo pregunte. */}
              <p className="mx-auto mt-3 max-w-[34rem] text-sm text-tinta sm:mt-4 lg:mx-0">
                {en
                  ? `${DIAS_DE_PRUEBA} days free, no card. Then one payment for your wedding, from ${formatMXN(PLANES.esencial.priceMx)}.`
                  : `${DIAS_DE_PRUEBA} días gratis, sin tarjeta. Después, un solo pago por tu boda, desde ${formatMXN(PLANES.esencial.priceMx)}.`}
              </p>
            </div>

            <div className="entrada-texto max-sm:order-2" style={{ "--entrada": "240ms" } as React.CSSProperties}>
              <p className="mt-6 inline-flex items-start gap-2.5 border-t border-linea pt-5 text-left text-sm text-noche">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-vino" strokeWidth={1.75} aria-hidden="true" />
                {/* Antes prometía «una wedding planner real» con el plan
                    mensual. Desde el 13-nov-2026 los planes son de pago único
                    y ninguno trae una planner asignada: lo que sí se promete
                    es que no hay cobros después. */}
                {en
                  ? "You pay once per wedding: no monthly fees and nothing charged later."
                  : "Pagas una vez por tu boda: sin mensualidades ni cobros después."}
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
