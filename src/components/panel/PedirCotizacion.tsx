"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { Eyebrow } from "@/components/panel/sections";

/**
 * Acompañamiento (0053): pedirle una cotización a un proveedor por correo.
 * El correo sale de Blue Book con «responder a» la pareja: el proveedor les
 * contesta directo. Lo que se manda es exactamente lo que escriben aquí.
 */

const inputClass =
  "w-full rounded-xl border border-linea-control/70 bg-papel px-4 py-3 text-sm text-noche outline-none transition-[border-color,box-shadow] focus:border-noche focus:ring-2 focus:ring-noche/20";

const botonPrincipal =
  "inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-full bg-noche px-5 py-2.5 text-sm font-medium text-niebla transition-[background-color,scale,opacity] duration-150 hover:bg-noche-suave active:scale-[0.97] disabled:opacity-60";

interface Enviada {
  id: string;
  categoria: string;
  proveedor_nombre: string | null;
  proveedor_correo: string;
  enviada_en: string | null;
  error: string | null;
  created_at: string;
  estado?: string;
  origen?: "pareja" | "asistente";
}

const ESTADOS: Record<string, { es: string; en: string }> = {
  por_enviar: { es: "Por salir", en: "Going out" },
  en_revision: { es: "Por salir", en: "Going out" },
  enviada: { es: "Esperando respuesta", en: "Waiting for a reply" },
  respondida: { es: "Contestó", en: "Replied" },
  sin_respuesta: { es: "No contestó", en: "No reply" },
  rechazada: { es: "No salió", en: "Didn't go out" },
  fallida: { es: "No salió", en: "Didn't go out" },
};

function borrador(p: { pareja: string; fecha: string | null; lugar: string | null; personas: number | null; isEnglish: boolean }) {
  const fecha = p.fecha
    ? new Intl.DateTimeFormat(p.isEnglish ? "en-US" : "es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
        new Date(`${p.fecha}T00:00:00Z`)
      )
    : null;
  return p.isEnglish
    ? [
        "Hi! We're planning our wedding and would love a quote.",
        "",
        fecha ? `Date: ${fecha}` : "Date: to be confirmed",
        p.lugar ? `Venue: ${p.lugar}` : "Venue: to be confirmed",
        p.personas ? `Guests: about ${p.personas}` : "Guests: to be confirmed",
        "",
        "What we're looking for: ",
        "",
        `Thank you! ${p.pareja}`,
      ].join("\n")
    : [
        "¡Hola! Estamos organizando nuestra boda y nos gustaría una cotización.",
        "",
        fecha ? `Fecha: ${fecha}` : "Fecha: por confirmar",
        p.lugar ? `Lugar: ${p.lugar}` : "Lugar: por confirmar",
        p.personas ? `Invitados: alrededor de ${p.personas}` : "Invitados: por confirmar",
        "",
        "Lo que buscamos: ",
        "",
        `¡Gracias! ${p.pareja}`,
      ].join("\n");
}

export function PedirCotizacion({
  pareja,
  fecha,
  lugar,
  personas,
  soloLectura,
  isEnglish,
}: {
  pareja: string;
  fecha: string | null;
  lugar: string | null;
  personas: number | null;
  soloLectura: boolean;
  isEnglish: boolean;
}) {
  const [incluido, setIncluido] = useState<boolean | null>(null);
  const [enviadas, setEnviadas] = useState<Enviada[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [categoria, setCategoria] = useState("");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [mensaje, setMensaje] = useState(() => borrador({ pareja, fecha, lugar, personas, isEnglish }));
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<string | null>(null);

  async function cargar() {
    const res = await fetch("/api/panel/cotizaciones", { cache: "no-store" }).catch(() => null);
    const data = res?.ok ? ((await res.json()) as { incluido: boolean; cotizaciones: Enviada[] }) : null;
    setIncluido(data?.incluido ?? false);
    setEnviadas(data?.cotizaciones ?? []);
  }
  useEffect(() => {
    if (!soloLectura) void cargar();
  }, [soloLectura]);

  // Sólo Acompañamiento la ve. Sin plan o con otro, nada (no es un anuncio).
  if (soloLectura || !incluido) return null;

  async function mandar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    setListo(null);
    try {
      const res = await fetch("/api/panel/cotizaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoria, proveedorNombre: nombre, proveedorCorreo: correo, mensaje }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error || (isEnglish ? "It didn't go out." : "No salió."));
      setListo(
        isEnglish
          ? `Sent to ${correo}. Their reply will reach your email.`
          : `Listo, se mandó a ${correo}. Su respuesta les llega a su correo.`
      );
      setCategoria("");
      setNombre("");
      setCorreo("");
      setMensaje(borrador({ pareja, fecha, lugar, personas, isEnglish }));
      setAbierto(false);
      void cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="panel-card p-5 sm:p-6" aria-labelledby="pedir-cotizacion">
      <Eyebrow>{isEnglish ? "Guided plan" : "Plan Acompañamiento"}</Eyebrow>
      <h2 id="pedir-cotizacion" className="mt-2 text-xl font-medium text-noche">
        {isEnglish ? "Ask a vendor for a quote" : "Pedir una cotización por correo"}
      </h2>
      <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-tinta">
        {isEnglish
          ? "We email the vendor exactly what you write here, with you in copy. Their reply reaches your email, and your assistant can read it too. You can also ask your assistant on WhatsApp to write to vendors for you."
          : "Le mandamos al proveedor exactamente lo que escriban aquí, con ustedes en copia. Su respuesta les llega a su correo y también la lee su asistente. También le pueden pedir a su asistente por WhatsApp que les escriba a los proveedores por ustedes."}
      </p>

      {listo ? (
        <p role="status" className="mt-4 rounded-2xl bg-papel px-4 py-3 text-sm text-noche">
          {listo}
        </p>
      ) : null}

      {abierto ? (
        <form onSubmit={mandar} className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cot-categoria" className="mb-2 block text-sm font-medium text-noche">
              {isEnglish ? "What for" : "Qué le cotizan"}
            </label>
            <input id="cot-categoria" required maxLength={80} value={categoria} onChange={(e) => setCategoria(e.target.value)}
              placeholder={isEnglish ? "e.g. Flowers" : "p. ej. Flores"} className={inputClass} />
          </div>
          <div>
            <label htmlFor="cot-nombre" className="mb-2 block text-sm font-medium text-noche">
              {isEnglish ? "Vendor's name (optional)" : "Nombre del proveedor (opcional)"}
            </label>
            <input id="cot-nombre" maxLength={120} value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="cot-correo" className="mb-2 block text-sm font-medium text-noche">
              {isEnglish ? "Vendor's email" : "Correo del proveedor"}
            </label>
            <input id="cot-correo" type="email" required maxLength={200} value={correo} onChange={(e) => setCorreo(e.target.value)} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="cot-mensaje" className="mb-2 block text-sm font-medium text-noche">
              {isEnglish ? "Message" : "Mensaje"}
            </label>
            <textarea id="cot-mensaje" required rows={10} maxLength={4000} value={mensaje} onChange={(e) => setMensaje(e.target.value)}
              className={`${inputClass} leading-relaxed`} />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-error sm:col-span-2">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <button type="submit" disabled={enviando} className={botonPrincipal}>
              <Mail aria-hidden="true" className="h-4 w-4" strokeWidth={1.6} />
              {enviando ? (isEnglish ? "Sending…" : "Mandando…") : isEnglish ? "Send" : "Mandar"}
            </button>
            <button type="button" onClick={() => setAbierto(false)} className="min-h-[2.75rem] px-3 text-sm text-tinta underline decoration-linea-control underline-offset-4">
              {isEnglish ? "Cancel" : "Cancelar"}
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => { setAbierto(true); setListo(null); }} className={`${botonPrincipal} mt-5`}>
          <Mail aria-hidden="true" className="h-4 w-4" strokeWidth={1.6} />
          {isEnglish ? "Write to a vendor" : "Escribirle a un proveedor"}
        </button>
      )}

      {enviadas.length ? (
        <ul className="mt-6 divide-y divide-linea border-t border-linea">
          {enviadas.slice(0, 8).map((c) => (
            <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm">
              <span className="text-noche">
                {c.categoria}
                <span className="text-tinta"> · {c.proveedor_nombre || c.proveedor_correo}</span>
                {c.origen === "asistente" ? (
                  <span className="text-tinta"> · {isEnglish ? "by your assistant" : "lo pidió su asistente"}</span>
                ) : null}
              </span>
              <span className="text-xs text-tinta">
                {c.estado && ESTADOS[c.estado]
                  ? ESTADOS[c.estado][isEnglish ? "en" : "es"]
                  : c.enviada_en
                    ? new Intl.DateTimeFormat(isEnglish ? "en-US" : "es-MX", { day: "numeric", month: "short" }).format(new Date(c.enviada_en))
                    : isEnglish
                      ? "Didn't go out"
                      : "No salió"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
