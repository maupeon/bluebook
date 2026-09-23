"use client";

import { CalendarHeart, MailCheck, Store, Wallet } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { Cake, Sparkle } from "@/components/marketing/Ink";
import { Watercolor } from "@/components/marketing/Watercolor";
import { PlannerNote } from "@/components/marketing/Mockups";
import { Container, Em, Eyebrow, Heading, Lead } from "@/components/marketing/ui";

export function RealPlanner() {
  const { isEnglish: en } = useLanguage();

  const duties = en
    ? [
        { Icon: Wallet, text: "Reviews your budget and your payments" },
        { Icon: Store, text: "Guides you on vendors and timing" },
        { Icon: CalendarHeart, text: "Builds the day's run-of-show with you" },
        { Icon: MailCheck, text: "Checks every invitation before it goes out" },
      ]
    : [
        { Icon: Wallet, text: "Revisa tu presupuesto y tus pagos" },
        { Icon: Store, text: "Te orienta con proveedores y tiempos" },
        { Icon: CalendarHeart, text: "Arma contigo el guion del día" },
        { Icon: MailCheck, text: "Revisa cada invitación antes de que salga" },
      ];

  return (
    <section className="relative overflow-hidden bg-paper py-24 md:py-32">
      <Container>
        <div className="grid items-center gap-14 lg:grid-cols-[1fr_0.9fr] lg:gap-20">
          <div>
            <Reveal>
              <Eyebrow>{en ? "Your planner" : "Tu planner"}</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <Heading className="mt-4">
                {en ? (
                  <>
                    Behind the platform, <Em>a real planner.</Em>
                  </>
                ) : (
                  <>
                    Detrás de la plataforma, <Em>una planner de verdad.</Em>
                  </>
                )}
              </Heading>
            </Reveal>
            <Reveal delay={160}>
              <Lead className="mt-5 max-w-xl">
                {en
                  ? "Blue Book isn't an app that leaves you alone with a list. A professional wedding planner looks after your wedding, and she's one message away."
                  : "Blue Book no es una app que te deja sola con una lista. Una wedding planner profesional cuida tu boda, y está a un mensaje de distancia."}
              </Lead>
            </Reveal>

            <ul className="mt-9 grid gap-3 sm:grid-cols-2">
              {duties.map(({ Icon, text }, i) => (
                <Reveal as="li" key={text} delay={200 + i * 60}>
                  <div className="flex h-full items-center gap-3 rounded-2xl border border-hairline bg-white px-4 py-3.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-wash text-azul-deep">
                      <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <span className="font-body text-sm font-medium text-navy">{text}</span>
                  </div>
                </Reveal>
              ))}
            </ul>

            <Reveal delay={420}>
              <blockquote className="mt-10 border-l-2 border-wash-deep pl-5">
                <p className="font-heading text-2xl font-medium italic leading-snug tracking-[-0.01em] text-navy sm:text-[1.7rem]">
                  {en
                    ? "Nothing reaches your guests without someone reviewing it first."
                    : "Nada le llega a tus invitados sin que alguien lo haya revisado antes."}
                </p>
              </blockquote>
            </Reveal>
          </div>

          <Reveal delay={200} className="relative mx-auto w-full max-w-md">
            <div className="relative flex aspect-[4/5] items-center justify-center">
              <Watercolor className="absolute inset-0 h-full w-full" seed={9} />
              <Cake className="relative w-[68%] text-line" title={en ? "A three-tier wedding cake" : "Un pastel de boda de tres pisos"} />
              <Sparkle className="absolute right-[8%] top-[10%] h-6 w-6 text-line" />
              <p className="absolute inset-x-0 bottom-[6%] text-center font-script text-[26px] leading-tight text-line sm:text-[30px]" aria-hidden="true">
                Save the moments. Not just the day.
              </p>
            </div>
            <PlannerNote en={en} className="absolute left-0 top-[4%] sm:-left-8" />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
