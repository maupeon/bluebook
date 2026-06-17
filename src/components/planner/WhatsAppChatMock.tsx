"use client";

import { memo, useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

const LOOP_MS = 14000;

interface ChatMessage {
  from: "agent" | "guest";
  es: string;
  en: string;
  metaEs?: string;
  metaEn?: string;
  time: string;
  delay: number;
}

const SCRIPT: ChatMessage[] = [
  {
    from: "agent",
    metaEs: "Invitación · María & Diego",
    metaEn: "Invitation · María & Diego",
    es: "Hola Sofía, les compartimos la invitación a la boda. ¿Nos confirman su asistencia?",
    en: "Hi Sofía, here is the wedding invitation. Could you confirm your attendance?",
    time: "10:02",
    delay: 400,
  },
  {
    from: "guest",
    es: "¡Confirmamos! Somos 2",
    en: "We're in! Party of 2",
    time: "10:03",
    delay: 3000,
  },
  {
    from: "agent",
    es: "Llevan 86 de 120 invitados confirmados",
    en: "You have 86 of 120 guests confirmed",
    time: "10:03",
    delay: 5600,
  },
  {
    from: "agent",
    es: "Mañana vence el anticipo de las flores ($8,500)",
    en: "The flower deposit is due tomorrow ($8,500)",
    time: "10:04",
    delay: 8200,
  },
  {
    from: "agent",
    es: "Les recuerdo: prueba de menú el sábado 10:00",
    en: "Reminder: menu tasting on Saturday at 10:00",
    time: "10:05",
    delay: 10700,
  },
];

function Bubble({
  message,
  isEnglish,
  animated,
}: {
  message: ChatMessage;
  isEnglish: boolean;
  animated: boolean;
}) {
  const isAgent = message.from === "agent";
  return (
    <div
      className={`flex ${isAgent ? "justify-end" : "justify-start"} ${
        animated ? "animate-chat-in" : ""
      }`}
      style={animated ? { animationDelay: `${message.delay}ms` } : undefined}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
          isAgent
            ? "bg-pale-green text-ink rounded-br-md"
            : "bg-white border border-sand text-ink rounded-bl-md"
        }`}
      >
        {message.metaEs && (
          <p className="text-[10px] uppercase tracking-[0.08em] text-pale-green-ink font-medium font-body mb-1">
            {isEnglish ? message.metaEn : message.metaEs}
          </p>
        )}
        <p className="font-body text-[13px] leading-snug">
          {isEnglish ? message.en : message.es}
        </p>
        <p className="mt-1 text-right text-[10px] text-ink-muted tabular-nums">
          {message.time}
        </p>
      </div>
    </div>
  );
}

export const WhatsAppChatMock = memo(function WhatsAppChatMock() {
  const { isEnglish } = useLanguage();
  const [cycle, setCycle] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const id = setInterval(() => setCycle((c) => c + 1), LOOP_MS);
    return () => clearInterval(id);
  }, [reducedMotion]);

  return (
    <div className="w-full max-w-sm bg-white border border-sand rounded-[2rem] p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-sand bg-white">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink font-heading text-base text-white">
          B
        </div>
        <div>
          <p className="font-body text-sm font-semibold text-ink">Blue Book Planner</p>
          <p className="flex items-center gap-1.5 text-[11px] text-ink-muted font-body">
            <span className="h-1.5 w-1.5 rounded-full bg-pale-green-ink animate-breathe" />
            {isEnglish ? "online" : "en línea"}
          </p>
        </div>
      </div>

      {/* Conversation */}
      <div key={reducedMotion ? "static" : cycle} className="bg-cream px-4 py-5 space-y-2.5">
        {SCRIPT.map((message, index) => (
          <Bubble
            key={index}
            message={message}
            isEnglish={isEnglish}
            animated={!reducedMotion}
          />
        ))}

        {!reducedMotion && (
          <div
            className="flex justify-end animate-chat-in"
            style={{ animationDelay: "12600ms" }}
          >
            <div className="flex items-center gap-1 rounded-2xl rounded-br-md bg-pale-green px-3.5 py-3">
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-pale-green-ink" />
              <span
                className="typing-dot h-1.5 w-1.5 rounded-full bg-pale-green-ink"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="typing-dot h-1.5 w-1.5 rounded-full bg-pale-green-ink"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
