import { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { CheckCircle } from "lucide-react";
import { CONTACT_INFO, LANGUAGE_COOKIE, parseLanguage } from "@/lib/language";

export const metadata: Metadata = {
  title: "Gracias",
  robots: { index: false, follow: false },
};

export default async function CheckoutSuccessWeddingPage() {
  const cookieStore = await cookies();
  const isEnglish = parseLanguage(cookieStore.get(LANGUAGE_COOKIE)?.value) === "en";

  return (
    <div className="min-h-screen bg-bone">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-terra-light">
          <CheckCircle className="h-8 w-8 text-terra" strokeWidth={1.5} />
        </div>

        <p className="mt-8 font-body text-xs font-medium uppercase tracking-[0.2em] text-terra">
          {isEnglish ? "Payment received" : "Pago recibido"}
        </p>

        <h2 className="mt-4 font-heading text-4xl leading-[1.1] tracking-tight text-ink sm:text-5xl">
          {isEnglish ? "Payment received" : "Pago recibido"}
        </h2>

        <p className="mx-auto mt-5 max-w-md font-body text-sm leading-relaxed text-ink-muted">
          {isEnglish
            ? "Your planner reviews everything and texts you on WhatsApp within 24 hours. Once they activate your wedding, you get access to your panel."
            : "Su planner revisa todo y les escribe por WhatsApp en menos de 24 horas. Cuando active su boda, entran a su panel."}
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href={CONTACT_INFO.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-terra px-7 py-3.5 font-body text-sm font-semibold text-white transition-all duration-300 hover:bg-terra-deep active:scale-[0.98]"
          >
            {isEnglish ? "Message your planner" : "Escribir a su planner"}
          </a>
          <Link
            href="/acceso"
            className="rounded-full border border-sand bg-white px-7 py-3.5 font-body text-sm font-semibold text-ink transition-all duration-300 hover:bg-bone active:scale-[0.98]"
          >
            {isEnglish ? "Go to your panel" : "Ir a su panel"}
          </Link>
        </div>

        <Link
          href="/"
          className="mt-8 font-body text-sm font-medium text-ink-muted underline underline-offset-4 transition-colors hover:text-ink"
        >
          {isEnglish ? "Back to home" : "Volver al inicio"}
        </Link>
      </div>
    </div>
  );
}
