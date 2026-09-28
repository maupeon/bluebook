"use client";

import { useId, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { Collapse } from "@/components/Collapse";
import { Container, Eyebrow, Heading } from "@/components/marketing/ui";

export interface FaqItem {
  q: string;
  a: string;
}

/*
 * Acordeón de preguntas. Una sola abierta a la vez, la primera abierta al
 * llegar. El + gira 45° y se vuelve ×: el mismo ícono cambia de sentido en vez
 * de sustituirse por otro, así se lee como un solo control que se voltea.
 *
 * El encabezado va centrado arriba y las preguntas debajo, en una columna de
 * lectura: antes iban lado a lado y el titular quedaba en una columna angosta.
 * Las preguntas van en Work Sans; el marcador es sólo del titular.
 */
export function Faq({
  eyebrow,
  title,
  aside,
  items,
  id,
  className = "bg-niebla",
}: {
  eyebrow: string;
  title: ReactNode;
  aside?: ReactNode;
  items: FaqItem[];
  id?: string;
  className?: string;
}) {
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();

  return (
    <section id={id} className={`scroll-mt-16 py-24 md:py-32 ${className}`}>
      <Container>
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <Reveal>
              <Eyebrow>{eyebrow}</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <Heading className="mt-4">{title}</Heading>
            </Reveal>
            {aside && (
              <Reveal delay={160}>
                <div className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-tinta">{aside}</div>
              </Reveal>
            )}
          </div>

          <div className="mt-12 border-t border-linea">
            {items.map((item, index) => {
              const isOpen = open === index;
              const panelId = `${baseId}-panel-${index}`;
              const buttonId = `${baseId}-button-${index}`;
              return (
                <Reveal key={item.q} delay={Math.min(index, 4) * 60}>
                  <div className="border-b border-linea">
                    <h3>
                      <button
                        id={buttonId}
                        type="button"
                        onClick={() => setOpen(isOpen ? null : index)}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        className="group flex w-full items-center justify-between gap-6 py-6 text-left"
                      >
                        <span className="text-lg font-medium text-noche md:text-xl">
                          {item.q}
                        </span>
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-[background-color,border-color,color] duration-200 ${
                            isOpen ? "border-noche bg-noche text-niebla" : "border-linea bg-niebla text-noche group-hover:border-linea-control"
                          }`}
                        >
                          <Plus
                            className={`h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${
                              isOpen ? "rotate-45" : ""
                            }`}
                            strokeWidth={1.75}
                            aria-hidden="true"
                          />
                        </span>
                      </button>
                    </h3>
                    <div id={panelId} role="region" aria-labelledby={buttonId}>
                      <Collapse open={isOpen}>
                        <p className="max-w-[62ch] pb-6 pr-12 text-[15px] leading-relaxed text-tinta">{item.a}</p>
                      </Collapse>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
