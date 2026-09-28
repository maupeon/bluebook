"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, Check, Instagram, Mail, MessageCircle } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { Envelopes, Sparkle } from "@/components/marketing/Ink";
import { Watercolor } from "@/components/marketing/Watercolor";
import { Arrow, Container, Display, Em, Eyebrow, Lead } from "@/components/marketing/ui";
import { CONTACT_INFO } from "@/lib/language";
import { parseJsonSafe } from "@/lib/http";

type Interest = "planner" | "invitations" | "album" | "questions";
type Field = "name" | "email" | "interest" | "message";

interface FormState {
  name: string;
  email: string;
  phone: string;
  weddingDate: string;
  noDateYet: boolean;
  interest: Interest | null;
  message: string;
  company: string; // campo trampa
}

const EMPTY: FormState = {
  name: "",
  email: "",
  phone: "",
  weddingDate: "",
  noDateYet: false,
  interest: null,
  message: "",
  company: "",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form: FormState, en: boolean): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};
  if (!form.name.trim()) errors.name = en ? "Tell us your name." : "Dinos tu nombre.";
  if (!EMAIL_RE.test(form.email.trim())) errors.email = en ? "Check your email: we'll answer you there." : "Revisa tu correo: ahí te contestamos.";
  if (!form.interest) errors.interest = en ? "Pick one, even if it's just questions." : "Elige una, aunque sean solo dudas.";
  if (!form.message.trim()) errors.message = en ? "Write us a few words." : "Escríbenos unas palabras.";
  return errors;
}

// Los campos van en papel azul dentro de la hoja niebla, con borde de campo
// (3:1) y foco en azul noche. El error se dice en ladrillo, el único color que
// no es azul, para que se distinga de la tinta en un vistazo.
const INPUT =
  "w-full rounded-xl border bg-papel px-4 py-3 text-[15px] text-noche " +
  "transition-[border-color,box-shadow] duration-150 focus:border-noche focus:outline-none focus:ring-2 focus:ring-noche/20 " +
  "disabled:cursor-not-allowed disabled:bg-papel-medio disabled:text-tinta";
const BORDE = "border-linea-control";
const BORDE_ERROR = "border-error";

function FieldShell({
  id,
  label,
  optional,
  error,
  children,
  en,
}: {
  id: string;
  label: string;
  optional?: boolean;
  error?: string;
  children: ReactNode;
  en: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 flex items-baseline justify-between text-sm font-medium text-noche">
        {label}
        {optional && <span className="text-xs font-normal text-tinta">{en ? "Optional" : "Opcional"}</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1.5 text-[13px] text-error">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

export default function ContactoPage() {
  const { language, isEnglish: en } = useLanguage();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [sentName, setSentName] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);

  // El botón que tenía el foco desaparece al enviar: el foco pasa al mensaje
  // de confirmación, para que un lector de pantalla lo lea y el teclado no
  // quede huérfano en <body>.
  useEffect(() => {
    if (status === "sent") doneRef.current?.focus();
  }, [status]);

  const errors = validate(form, en);
  // Se valida al salir del campo, no al primer tecleo ni hasta el final.
  const shown = (field: Field) => (touched[field] ? errors[field] : undefined);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const touch = (field: Field) => setTouched((prev) => ({ ...prev, [field]: true }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setServerError(null);
    setTouched({ name: true, email: true, interest: true, message: true });

    const firstInvalid = (["name", "email", "interest", "message"] as Field[]).find((f) => errors[f]);
    if (firstInvalid) {
      const target =
        firstInvalid === "interest"
          ? formRef.current?.querySelector<HTMLInputElement>('input[name="interest"]')
          : formRef.current?.querySelector<HTMLElement>(`#contacto-${firstInvalid}`);
      target?.focus();
      return;
    }

    setStatus("sending");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          weddingDate: form.noDateYet ? null : form.weddingDate || null,
          noDateYet: form.noDateYet,
          interest: form.interest,
          message: form.message,
          company: form.company,
          language,
        }),
      });
      const { data } = await parseJsonSafe<{ ok?: boolean; error?: string }>(response);
      if (!response.ok) {
        setServerError(
          data?.error ??
            (en ? "We couldn't send your message. Please write to us on WhatsApp." : "No pudimos enviar tu mensaje. Escríbenos por WhatsApp, por favor.")
        );
        setStatus("idle");
        return;
      }
      setSentName(form.name.trim().split(/\s+/)[0] ?? "");
      setStatus("sent");
    } catch {
      setServerError(en ? "No connection. Check your internet and try again." : "Sin conexión. Revisa tu internet e inténtalo de nuevo.");
      setStatus("idle");
    }
  };

  const interests: Array<{ id: Interest; label: string }> = [
    { id: "planner", label: en ? "Full planner" : "Planner completo" },
    { id: "invitations", label: en ? "Invitations only" : "Solo invitaciones" },
    { id: "album", label: en ? "Digital album" : "Álbum digital" },
    { id: "questions", label: en ? "Just questions" : "Solo tengo dudas" },
  ];

  const channels = [
    {
      href: CONTACT_INFO.whatsappUrl,
      Icon: MessageCircle,
      title: "WhatsApp",
      detail: CONTACT_INFO.whatsappDisplay,
      note: en ? "The fastest way" : "La forma más rápida",
      external: true,
    },
    {
      href: CONTACT_INFO.instagramUrl,
      Icon: Instagram,
      title: "Instagram",
      detail: `@${CONTACT_INFO.instagramHandle}`,
      note: en ? "Send us a DM" : "Mándanos un DM",
      external: true,
    },
    {
      href: `mailto:${CONTACT_INFO.email}`,
      Icon: Mail,
      title: en ? "Email" : "Correo",
      detail: CONTACT_INFO.email,
      note: en ? "For the long version" : "Para la versión larga",
      external: false,
    },
  ];

  return (
    <div className="bg-papel">
      <section className="relative overflow-hidden pb-24 pt-28 sm:pt-32 md:pb-32 lg:pt-36">
        <Container>
          {/* El encabezado, centrado y a lo ancho; debajo, los canales y el
              formulario lado a lado. */}
          <div className="mx-auto max-w-4xl text-center">
            <Reveal>
              <Eyebrow>{en ? "Contact" : "Contacto"}</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <Display className="mt-5">
                {en ? (
                  <>
                    Let&apos;s talk about <Em>your wedding.</Em>
                  </>
                ) : (
                  <>
                    Hablemos de <Em>tu boda.</Em>
                  </>
                )}
              </Display>
            </Reveal>
            <Reveal delay={160}>
              <Lead className="mx-auto mt-6 max-w-md">
                {en
                  ? "Write to us wherever is easiest for you. A person answers, in under 24 hours."
                  : "Escríbenos por donde te quede más cómodo. Te contesta una persona, en menos de 24 horas."}
              </Lead>
            </Reveal>
          </div>

          <div className="mt-14 grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            {/* Canales */}
            <div>
              <ul className="space-y-3">
                {channels.map(({ href, Icon, title, detail, note, external }, i) => (
                  <Reveal as="li" key={title} delay={200 + i * 60}>
                    <a
                      href={href}
                      target={external ? "_blank" : undefined}
                      rel={external ? "noopener noreferrer" : undefined}
                      className="group flex items-center gap-4 rounded-2xl border border-linea bg-niebla p-4 transition-[border-color,background-color,scale] duration-150 hover:border-linea-control hover:bg-papel-medio active:scale-[0.99] motion-reduce:active:scale-100 sm:p-5"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-papel text-noche">
                        <Icon className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span className="text-[15px] font-medium text-noche">{title}</span>
                          <span className="text-xs text-tinta">{note}</span>
                        </span>
                        <span className="block truncate text-sm text-tinta">{detail}</span>
                      </span>
                      <Arrow className="h-4 w-4 shrink-0 text-tinta" />
                    </a>
                  </Reveal>
                ))}
              </ul>

              <Reveal delay={400}>
                <p className="mt-8 text-sm text-tinta">
                  {en ? "Ready to start? " : "¿Lista para empezar? "}
                  <Link
                    href="/comenzar"
                    className="font-medium text-noche underline decoration-linea-control underline-offset-4 transition-colors hover:decoration-noche"
                  >
                    {en ? "Try it free for 7 days, no card." : "Pruébalo 7 días gratis, sin tarjeta."}
                  </Link>
                </p>
              </Reveal>
            </div>

            {/* Formulario */}
            <Reveal delay={160}>
              <div className="relative overflow-hidden rounded-3xl border border-linea bg-niebla p-6 shadow-[0_24px_60px_-40px_rgb(46_58_85/0.35)] sm:p-10">
                <Watercolor className="absolute -right-16 -top-16 h-56 w-72" seed={10} opacity={0.8} />
                <Envelopes className="absolute right-4 top-4 hidden h-24 w-28 text-tinta sm:block" />

                {status === "sent" ? (
                  <div role="status" className="relative flex min-h-[28rem] flex-col items-center justify-center py-8 text-center">
                    <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-noche text-niebla">
                      <Check className="h-7 w-7" strokeWidth={2} aria-hidden="true" />
                      <Sparkle className="absolute -right-5 -top-3 h-5 w-5 text-tinta" />
                    </span>
                    {/* La pantalla de éxito lleva el titular de hoja. Con las
                        clases sueltas y no con <Titular>, porque el foco tiene
                        que caer en este h2 (ref) y el componente no lo pasa. */}
                    <h2 ref={doneRef} tabIndex={-1} className="titular adornado mt-6 text-[1.75rem] sm:text-[2rem]">
                      <span className="min-w-0">
                        {en ? `Got it${sentName ? `, ${sentName}` : ""}.` : `Listo${sentName ? `, ${sentName}` : ""}.`}
                      </span>
                    </h2>
                    <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-tinta">
                      {en
                        ? "Your message reached us. We'll answer by email in under 24 hours."
                        : "Tu mensaje ya nos llegó. Te contestamos por correo en menos de 24 horas."}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setForm(EMPTY);
                        setTouched({});
                        setStatus("idle");
                      }}
                      className="mt-8 min-h-11 text-sm font-medium text-noche underline decoration-linea-control underline-offset-4 transition-colors hover:decoration-noche"
                    >
                      {en ? "Send another message" : "Enviar otro mensaje"}
                    </button>
                  </div>
                ) : (
                  <form ref={formRef} onSubmit={handleSubmit} noValidate className="relative">
                    {/* Título de la hoja del formulario, no de la página: Work
                        Sans. El titular de la página es el de arriba. */}
                    <h2 className="max-w-[16ch] text-2xl font-medium text-noche">
                      {en ? "Or leave us a message" : "O déjanos un mensaje"}
                    </h2>
                    <p className="mt-2 max-w-[40ch] text-sm text-tinta">
                      {en ? "We'll answer at the email you give us." : "Te contestamos al correo que nos dejes."}
                    </p>

                    <div className="mt-8 space-y-5">
                      <div className="grid gap-5 sm:grid-cols-2">
                        <FieldShell id="contacto-name" label={en ? "Your name" : "Tu nombre"} error={shown("name")} en={en}>
                          <input
                            id="contacto-name"
                            name="name"
                            autoComplete="name"
                            value={form.name}
                            onChange={(e) => set("name", e.target.value)}
                            onBlur={() => touch("name")}
                            aria-invalid={!!shown("name")}
                            aria-describedby={shown("name") ? "contacto-name-error" : undefined}
                            placeholder={en ? "Sofía" : "Sofía"}
                            className={`${INPUT} ${shown("name") ? BORDE_ERROR : BORDE}`}
                          />
                        </FieldShell>
                        <FieldShell id="contacto-email" label={en ? "Your email" : "Tu correo"} error={shown("email")} en={en}>
                          <input
                            id="contacto-email"
                            name="email"
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            value={form.email}
                            onChange={(e) => set("email", e.target.value)}
                            onBlur={() => touch("email")}
                            aria-invalid={!!shown("email")}
                            aria-describedby={shown("email") ? "contacto-email-error" : undefined}
                            placeholder={en ? "you@email.com" : "tu@correo.com"}
                            className={`${INPUT} ${shown("email") ? BORDE_ERROR : BORDE}`}
                          />
                        </FieldShell>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <FieldShell id="contacto-phone" label="WhatsApp" optional en={en}>
                          <input
                            id="contacto-phone"
                            name="phone"
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            value={form.phone}
                            onChange={(e) => set("phone", e.target.value)}
                            placeholder="+52 55 1234 5678"
                            className={`${INPUT} ${BORDE}`}
                          />
                        </FieldShell>
                        <FieldShell id="contacto-date" label={en ? "Wedding date" : "Fecha de la boda"} optional en={en}>
                          <input
                            id="contacto-date"
                            name="weddingDate"
                            type="date"
                            value={form.noDateYet ? "" : form.weddingDate}
                            disabled={form.noDateYet}
                            onChange={(e) => set("weddingDate", e.target.value)}
                            className={`${INPUT} ${BORDE}`}
                          />
                          <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2 text-[13px] text-noche">
                            <input
                              type="checkbox"
                              checked={form.noDateYet}
                              onChange={(e) => set("noDateYet", e.target.checked)}
                              className="h-4 w-4 rounded accent-noche"
                            />
                            {en ? "We don't have a date yet" : "Aún no tenemos fecha"}
                          </label>
                        </FieldShell>
                      </div>

                      <fieldset>
                        <legend className="mb-2 text-sm font-medium text-noche">
                          {en ? "What are you interested in?" : "¿Qué te interesa?"}
                        </legend>
                        <div
                          className="flex flex-wrap gap-2"
                          aria-describedby={shown("interest") ? "contacto-interest-error" : undefined}
                        >
                          {interests.map((option) => {
                            const checked = form.interest === option.id;
                            return (
                              <label
                                key={option.id}
                                className={`relative inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-medium transition-[background-color,border-color,color,scale] duration-150 active:scale-[0.97] motion-reduce:active:scale-100 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-noche ${
                                  checked
                                    ? "border-noche bg-noche text-niebla"
                                    : "border-linea-control/60 bg-papel text-noche hover:border-linea-control hover:bg-papel-medio"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="interest"
                                  value={option.id}
                                  checked={checked}
                                  onChange={() => {
                                    set("interest", option.id);
                                    touch("interest");
                                  }}
                                  className="sr-only"
                                />
                                {checked && <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />}
                                {option.label}
                              </label>
                            );
                          })}
                        </div>
                        {shown("interest") && (
                          <p id="contacto-interest-error" className="mt-1.5 flex items-center gap-1.5 text-[13px] text-error">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
                            {shown("interest")}
                          </p>
                        )}
                      </fieldset>

                      <FieldShell id="contacto-message" label={en ? "Your message" : "Tu mensaje"} error={shown("message")} en={en}>
                        <textarea
                          id="contacto-message"
                          name="message"
                          rows={4}
                          value={form.message}
                          onChange={(e) => set("message", e.target.value)}
                          onBlur={() => touch("message")}
                          aria-invalid={!!shown("message")}
                          aria-describedby={shown("message") ? "contacto-message-error" : undefined}
                          placeholder={
                            en
                              ? "Tell us about your wedding or ask us anything."
                              : "Cuéntanos de tu boda o pregúntanos lo que quieras."
                          }
                          className={`${INPUT} resize-y ${shown("message") ? BORDE_ERROR : BORDE}`}
                        />
                      </FieldShell>

                      {/* Campo trampa para bots: fuera de la vista y del tabulador. */}
                      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                        <label htmlFor="contacto-company">Company</label>
                        <input
                          id="contacto-company"
                          name="company"
                          tabIndex={-1}
                          autoComplete="off"
                          value={form.company}
                          onChange={(e) => set("company", e.target.value)}
                        />
                      </div>
                    </div>

                    {serverError && (
                      <div role="alert" className="mt-6 flex items-start gap-3 rounded-xl bg-error-fondo px-4 py-3">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-error" strokeWidth={2} aria-hidden="true" />
                        <p className="text-sm text-error">
                          {serverError}{" "}
                          <a
                            href={CONTACT_INFO.whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-error underline underline-offset-4"
                          >
                            {en ? "Open WhatsApp" : "Abrir WhatsApp"}
                          </a>
                        </p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={status === "sending"}
                      className="group mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-noche px-7 py-3.5 text-sm font-medium text-niebla transition-[background-color,scale] duration-150 hover:bg-noche-suave active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 disabled:cursor-wait disabled:opacity-80"
                    >
                      {status === "sending" ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-niebla/30 border-t-niebla" aria-hidden="true" />
                          {en ? "Sending…" : "Enviando…"}
                        </>
                      ) : (
                        <>
                          {en ? "Send message" : "Enviar mensaje"}
                          <Arrow />
                        </>
                      )}
                    </button>
                    <p className="mt-4 text-center text-xs text-tinta">
                      {en ? "By sending it you accept our " : "Al enviarlo aceptas nuestro "}
                      <Link href="/privacidad" className="text-noche underline decoration-linea-control underline-offset-2 transition-colors hover:decoration-noche">
                        {en ? "privacy policy" : "aviso de privacidad"}
                      </Link>
                      .
                    </p>
                  </form>
                )}
              </div>
            </Reveal>
          </div>
        </Container>
      </section>
    </div>
  );
}
