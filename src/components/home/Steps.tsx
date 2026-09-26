"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { Envelopes, PlannerBook, Rings, Toast } from "@/components/marketing/Ink";
import { Watercolor } from "@/components/marketing/Watercolor";
import { Container, Em, Eyebrow, Heading } from "@/components/marketing/ui";
import { DIAS_DE_PRUEBA } from "@/lib/accesoDeLaBoda";
import { AGENT_PLAN, formatMXN } from "@/lib/weddingPlans";
// Misma bandera que el botón de LoginForm: mientras el proveedor de Google no
// esté dado de alta en Supabase, el sitio no puede prometer que se entra con
// Google.
import { GOOGLE_ACTIVO as CON_GOOGLE } from "@/lib/entrarConGoogle";

const price = formatMXN(AGENT_PLAN.priceMxMonthly);

// El recorrido de la prueba, en el orden en que ella lo vive. Antes el segundo
// paso prometía que «tu planner te escribe en menos de 24 horas»: durante la
// prueba la boda no tiene planner, así que lo inmediato que sí se puede
// prometer es el panel ya armado.
const STEPS = [
  {
    Art: PlannerBook,
    es: {
      title: "Nos cuentas de tu boda",
      body: "Dos minutos, una pregunta a la vez: la fecha si ya la tienes, cuántos invitados esperas, qué te importa más. Lo que todavía no sepas se queda para después.",
    },
    en: {
      title: "Tell us about your wedding",
      body: "Two minutes, one question at a time: your date if you have one, how many guests you expect, what matters most. Whatever you don't know yet can wait.",
    },
  },
  {
    Art: Envelopes,
    es: CON_GOOGLE
      ? {
          title: "Entras con Google o con tu correo",
          body: "Sin contraseñas: con tu cuenta de Google o con un código que te llega al correo.",
        }
      : {
          title: "Entras con tu correo",
          body: "Sin contraseñas: te llega un código al correo y con eso entras.",
        },
    en: CON_GOOGLE
      ? {
          title: "Sign in with Google or your email",
          body: "No passwords: with your Google account or a code sent to your email.",
        }
      : {
          title: "Sign in with your email",
          body: "No passwords: a code arrives in your email and that's all it takes.",
        },
  },
  {
    Art: Toast,
    es: {
      title: "Tu panel ya está listo",
      body: `Lo que nos contaste ya está en su lugar, y tienes ${DIAS_DE_PRUEBA} días para usarlo completo, sin tarjeta.`,
    },
    en: {
      title: "Your dashboard is ready",
      body: `What you told us is already in place, and you have ${DIAS_DE_PRUEBA} days to use all of it, no card.`,
    },
  },
  {
    Art: Rings,
    es: {
      title: `A los ${DIAS_DE_PRUEBA} días, eliges`,
      body: `El plan mensual de ${price} o un solo pago por tus invitaciones. Si todavía no eliges, tu panel se queda para consulta y nada se borra.`,
    },
    en: {
      title: `On day ${DIAS_DE_PRUEBA}, you choose`,
      body: `The ${price} monthly plan or a single payment for your invitations. If you don't choose yet, your dashboard stays open to read and nothing is deleted.`,
    },
  },
];

export function Steps() {
  const { isEnglish: en } = useLanguage();

  return (
    <section id="como-funciona" className="scroll-mt-16 bg-white py-24 md:py-32">
      <Container>
        <div className="max-w-3xl">
          <Reveal>
            <Eyebrow>{en ? "How it works" : "Cómo funciona"}</Eyebrow>
          </Reveal>
          <Reveal delay={80}>
            <Heading className="mt-4">
              {en ? (
                <>
                  You start today, <Em>in two minutes.</Em>
                </>
              ) : (
                <>
                  Empiezas hoy, <Em>en dos minutos.</Em>
                </>
              )}
            </Heading>
          </Reveal>
        </div>

        <ol className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ Art, es, en: english }, i) => {
            const copy = en ? english : es;
            return (
              <Reveal as="li" key={es.title} delay={i * 100}>
                <div className="relative flex h-full flex-col overflow-hidden rounded-3xl bg-paper p-6 sm:p-8 lg:p-6">
                  <div className="relative flex h-44 items-center justify-center">
                    <Watercolor className="absolute inset-0 h-full w-full" seed={i * 4 + 1} />
                    <Art className="relative h-36 w-auto max-w-[80%] text-line" />
                  </div>
                  <p className="mt-6 font-script text-[34px] leading-none text-azul">{i + 1}.</p>
                  <h3 className="mt-1 font-heading text-2xl font-medium tracking-[-0.01em] text-navy">{copy.title}</h3>
                  <p className="mt-2 font-body text-sm leading-relaxed text-navy-muted">{copy.body}</p>
                </div>
              </Reveal>
            );
          })}
        </ol>
      </Container>
    </section>
  );
}
