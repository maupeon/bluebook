"use client";

import type { ReactNode } from "react";
import { CalendarClock, ListChecks, Mail, Store, UserCheck, Wallet, Wine } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import {
  BarMock,
  BudgetMock,
  InvitationMock,
  RsvpMock,
  TasksMock,
  TimelineMock,
  VendorsMock,
} from "@/components/marketing/Mockups";
import { Container, Em, Eyebrow, Heading, Lead } from "@/components/marketing/ui";

function Tile({
  icon: Icon,
  title,
  body,
  children,
  className = "",
  delay = 0,
}: {
  icon: typeof Wallet;
  title: string;
  body: string;
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <Reveal delay={delay} className={className}>
      <article className="flex h-full flex-col rounded-3xl bg-paper p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-azul-deep ring-1 ring-hairline">
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} aria-hidden="true" />
          </span>
          <h3 className="font-heading text-2xl font-medium tracking-[-0.01em] text-navy">{title}</h3>
        </div>
        <p className="mt-3 max-w-[46ch] font-body text-sm leading-relaxed text-navy-muted">{body}</p>
        <div className="mt-6 flex-1 content-end">{children}</div>
      </article>
    </Reveal>
  );
}

export function AllInOne() {
  const { isEnglish: en } = useLanguage();

  return (
    <section id="todo-en-un-lugar" className="scroll-mt-16 bg-white pb-24 pt-4 md:pb-32">
      <Container>
        <div className="max-w-3xl">
          <Reveal>
            <Eyebrow>{en ? "All in one place" : "Todo en un solo lugar"}</Eyebrow>
          </Reveal>
          <Reveal delay={80}>
            <Heading className="mt-4">
              {en ? (
                <>
                  Everything you no longer <Em>carry on your own.</Em>
                </>
              ) : (
                <>
                  Todo lo que ya no <Em>cargas tú sola.</Em>
                </>
              )}
            </Heading>
          </Reveal>
          <Reveal delay={160}>
            <Lead className="mt-5 max-w-2xl">
              {en
                ? "You, your partner and your planner sign in with your email and see exactly the same thing, from your phone or your laptop. No passwords, no forwarding screenshots."
                : "Tú, tu pareja y tu planner entran con su correo y ven exactamente lo mismo, desde el celular o la compu. Sin contraseñas y sin reenviar capturas."}
            </Lead>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-6">
          <Tile
            className="lg:col-span-3"
            icon={Store}
            title={en ? "Vendors" : "Proveedores"}
            body={
              en
                ? "Every vendor with their contact, contract and what's pending. You know who's booked and who needs a nudge."
                : "Cada proveedor con su contacto, su contrato y lo que falta. Sabes quién ya está y a quién hay que perseguir."
            }
          >
            <VendorsMock en={en} />
          </Tile>

          <Tile
            className="lg:col-span-3"
            delay={80}
            icon={Wallet}
            title={en ? "Budget and payments" : "Presupuesto y pagos"}
            body={
              en
                ? "What you've spent, what's left and what's due this week. No deposit slips by."
                : "Cuánto llevas, cuánto falta y qué vence esta semana. Ningún anticipo se te pasa."
            }
          >
            <BudgetMock en={en} />
          </Tile>

          <Tile
            className="lg:col-span-2"
            icon={Mail}
            title={en ? "Invitations" : "Invitaciones"}
            body={
              en
                ? "Your digital invitation, with the date and the venue, reaches every guest on WhatsApp."
                : "Tu invitación digital, con la fecha y el lugar, le llega a cada invitado por WhatsApp."
            }
          >
            <InvitationMock en={en} />
          </Tile>

          <Tile
            className="lg:col-span-2"
            delay={80}
            icon={UserCheck}
            title={en ? "RSVPs" : "Confirmaciones"}
            body={
              en
                ? "Who's coming, how many, and who hasn't replied, as it happens. The ones missing get a reminder."
                : "Quién viene, cuántos son y quién no ha contestado, al momento. A los que faltan les llega un recordatorio."
            }
          >
            <RsvpMock en={en} />
          </Tile>

          <Tile
            className="lg:col-span-2"
            delay={160}
            icon={ListChecks}
            title={en ? "To-dos" : "Pendientes"}
            body={
              en
                ? "Your checklist in the order it matters, with dates. What's done gets crossed off; what's next stays in sight."
                : "Tu checklist en el orden en que toca, con fechas. Lo hecho se tacha; lo que sigue, no se pierde de vista."
            }
          >
            <TasksMock en={en} />
          </Tile>

          <Tile
            className="lg:col-span-4"
            icon={CalendarClock}
            title={en ? "The day" : "El día"}
            body={
              en
                ? "Your wedding's run-of-show, minute by minute, so on the day nobody has to ask you anything."
                : "El guion de tu boda minuto a minuto, para que ese día nadie tenga que preguntarte nada a ti."
            }
          >
            <div className="rounded-2xl border border-hairline bg-white p-5">
              <TimelineMock en={en} horizontal />
            </div>
          </Tile>

          <Tile
            className="lg:col-span-2"
            delay={80}
            icon={Wine}
            title={en ? "The bar" : "La barra"}
            body={
              en
                ? "How much tequila, wine and beer to buy for your guests, from a planner's own numbers."
                : "Cuánto tequila, vino y cerveza comprar para tus invitados, con los números de una planner."
            }
          >
            <BarMock en={en} />
          </Tile>
        </div>
      </Container>
    </section>
  );
}
