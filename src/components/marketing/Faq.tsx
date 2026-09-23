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
 */
export function Faq({
  eyebrow,
  title,
  aside,
  items,
  id,
  className = "bg-white",
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
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <Reveal>
              <Eyebrow>{eyebrow}</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <Heading className="mt-4">{title}</Heading>
            </Reveal>
            {aside && (
              <Reveal delay={160}>
                <div className="mt-5 max-w-sm font-body text-sm leading-relaxed text-navy-muted">{aside}</div>
              </Reveal>
            )}
          </div>

          <div className="border-t border-hairline">
            {items.map((item, index) => {
              const isOpen = open === index;
              const panelId = `${baseId}-panel-${index}`;
              const buttonId = `${baseId}-button-${index}`;
              return (
                <Reveal key={item.q} delay={Math.min(index, 4) * 60}>
                  <div className="border-b border-hairline">
                    <h3>
                      <button
                        id={buttonId}
                        type="button"
                        onClick={() => setOpen(isOpen ? null : index)}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        className="group flex w-full items-center justify-between gap-6 py-6 text-left"
                      >
                        <span className="font-heading text-xl font-medium tracking-[-0.01em] text-navy transition-colors group-hover:text-azul-deep md:text-2xl">
                          {item.q}
                        </span>
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-[background-color,border-color,color] duration-200 ${
                            isOpen ? "border-navy bg-navy text-white" : "border-hairline bg-white text-navy group-hover:border-wash-deep"
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
                        <p className="max-w-[62ch] pb-6 pr-12 font-body text-[15px] leading-relaxed text-navy-muted">{item.a}</p>
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
