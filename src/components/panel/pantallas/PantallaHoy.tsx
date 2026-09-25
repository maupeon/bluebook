"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import type { PanelBundle } from "@/lib/couplePanel";
import { seccionesDelPanel } from "@/lib/seccionesDelPanel";
import { DatosDeLaBoda } from "@/components/panel/DatosDeLaBoda";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { ArchivosParaProveedores } from "@/components/panel/ArchivosParaProveedores";
import { SuPlan } from "@/components/panel/SuPlan";
import { PlanDePrueba } from "@/components/panel/PlanDePrueba";
import type { SuscripcionDeLaBoda } from "@/lib/suscripcion";
import { estaEnPrueba, type AccesoDeLaBoda } from "@/lib/accesoDeLaBoda";
import { enCajas, sugerido } from "@/lib/barra";
import { formatMXN } from "@/lib/weddingPlans";
import { Eyebrow } from "@/components/panel/sections";
import { countdownPhrase } from "@/components/panel/dates";
import { TasksSection, MessagesSection } from "@/components/panel/PanelDashboard";
import { PlannerBook } from "@/components/marketing/Ink";
import { Watercolor } from "@/components/marketing/Watercolor";

/**
 * Una tarjeta que RESUME y lleva a su destino. No repite el detalle: dice el
 * número que importa, en una frase con su unidad, y se quita de en medio.
 */
function Resumen({
  eyebrow,
  titular,
  detalle,
  progreso,
  tono,
  href,
  cta,
}: {
  eyebrow: string;
  titular: string;
  detalle: string;
  progreso: number | null;
  tono: "terra" | "verde";
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col panel-card p-6 transition-[scale,box-shadow] duration-150 hover:shadow-[0_2px_10px_rgba(29,46,75,0.06)] active:scale-[0.99] sm:p-7"
    >
      <Eyebrow>{eyebrow}</Eyebrow>
      <p className="mt-2 font-heading text-[28px] leading-tight tracking-tight text-ink sm:text-[32px]">
        {titular}
      </p>
      <p className="mt-2 font-body text-sm leading-relaxed text-ink-muted">
        {detalle}
      </p>
      {progreso != null ? (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-sand-soft">
          <div
            className={`h-full rounded-full ${tono === "terra" ? "bg-navy" : "bg-azul"}`}
            style={{ width: `${Math.max(0, Math.min(100, progreso))}%` }}
          />
        </div>
      ) : null}
      <span className="mt-5 inline-flex items-center gap-1.5 font-body text-sm text-azul-deep">
        {cta}
        <ArrowRight
          className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
          strokeWidth={1.6}
        />
      </span>
    </Link>
  );
}

/**
 * La cuenta regresiva, como en las maquetas del sitio (Mockups.tsx, PhoneHoy):
 * lavado azul, "faltan" en la manuscrita del Instagram y el número grande.
 * La manuscrita es decorativa: el número y la unidad se leen solos, y el
 * lector de pantalla recibe la frase completa.
 */
function CuentaRegresiva({ dias, isEnglish }: { dias: number; isEnglish: boolean }) {
  const hoy = dias === 0;
  return (
    <div className="relative overflow-hidden rounded-2xl bg-wash px-6 py-5 md:min-w-[15rem]">
      <p className="sr-only">{countdownPhrase(dias, isEnglish)}</p>
      <div aria-hidden="true">
        <p className="font-script text-[34px] leading-none text-line">
          {hoy ? (isEnglish ? "today" : "hoy es") : dias === 1 ? (isEnglish ? "only" : "falta") : isEnglish ? "only" : "faltan"}
        </p>
        <p className="mt-1 font-heading text-[3.4rem] font-medium leading-[0.95] tracking-[-0.02em] text-ink tabular-nums">
          {hoy ? (
            isEnglish ? "the day" : "el día"
          ) : (
            <>
              {dias}{" "}
              <span className="text-[1.9rem]">
                {dias === 1 ? (isEnglish ? "day" : "día") : isEnglish ? "days" : "días"}
              </span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

const claseEnlace =
  "mt-1 inline-flex min-h-[2.75rem] items-center gap-1.5 font-body text-sm text-azul-deep underline-offset-4 hover:text-ink hover:underline";

interface LoQueYaEsta {
  clave: string;
  figura: string;
  texto: string;
  enlace?: { href: string; texto: string };
}

/**
 * El primer momento en el panel, al llegar del onboarding.
 *
 * El principio es "pregunta sólo lo que vas a usar, y enséñale dónde lo
 * usaste": cada renglón es una respuesta suya convertida en algo que ya
 * funciona (la cuenta, la barra, el presupuesto, el plan), con el enlace a
 * donde vive. Nada de confeti ni de "¡felicidades!": la calma es la marca, y
 * lo que alegra es ver que lo que contaron no se perdió.
 *
 * Sólo salen los renglones que tienen de dónde: "todavía no sé" en el
 * onboarding es una respuesta válida, y un renglón con un hueco sería
 * recordárselo.
 */
function Bienvenida({
  items,
  isEnglish,
  onCerrar,
}: {
  items: LoQueYaEsta[];
  isEnglish: boolean;
  onCerrar: () => void;
}) {
  const [cerrando, setCerrando] = useState(false);

  function cerrar() {
    if (cerrando) return;
    setCerrando(true);
    // Con movimiento reducido no hay transición que esperar: se va al momento.
    let reducido = false;
    try {
      reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      // matchMedia no existe en algún navegador viejo: se trata como normal.
    }
    // Un temporizador y no onTransitionEnd: si la transición no corre (pestaña
    // en segundo plano, transición desactivada) el evento nunca llega y la
    // tarjeta se quedaría a opacidad cero ocupando su lugar.
    window.setTimeout(onCerrar, reducido ? 0 : 180);
  }

  return (
    <section
      aria-labelledby="bienvenida-titulo"
      className={`animate-step-in relative mt-10 overflow-hidden rounded-2xl border border-sand bg-wash-soft px-6 py-7 transition-opacity duration-150 motion-reduce:transition-none sm:px-8 sm:py-9 ${
        cerrando ? "opacity-0" : "opacity-100"
      }`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-8 hidden h-56 w-80 lg:block"
      >
        <Watercolor tone="wash" seed={7} className="absolute inset-0 h-full w-full" />
        <PlannerBook className="absolute right-12 top-10 h-32 w-48 text-line" />
      </div>

      <div className="relative max-w-xl">
        <Eyebrow>{isEnglish ? "Welcome" : "Bienvenidos"}</Eyebrow>
        <h2
          id="bienvenida-titulo"
          className="mt-3 font-heading text-3xl font-medium tracking-[-0.015em] text-ink md:text-4xl"
        >
          {isEnglish
            ? "Everything you told us is already here"
            : "Todo lo que nos contaron ya está aquí"}
        </h2>
        <p className="mt-3 max-w-[52ch] font-body text-sm leading-relaxed text-ink-muted">
          {items.length > 0
            ? isEnglish
              ? "We used your answers to set up the first things. This already works:"
              : "Con sus respuestas dejamos listo lo primero. Esto ya funciona:"
            : isEnglish
              ? "You're in. Whatever you add from now on shows up right here."
              : "Ya están dentro. Lo que vayan agregando va a aparecer justo aquí."}
        </p>
      </div>

      {items.length > 0 ? (
        <ul className="relative mt-6 grid border-t border-sand sm:grid-cols-2 sm:gap-x-10">
          {items.map((item) => (
            <li key={item.clave} className="border-b border-sand py-5">
              <p className="font-heading text-[28px] font-medium leading-tight tracking-tight text-ink tabular-nums">
                {item.figura}
              </p>
              <p className="mt-1 max-w-[42ch] font-body text-sm leading-relaxed text-ink-muted">
                {item.texto}
              </p>
              {item.enlace ? (
                // Un ancla de la misma pantalla va en <a>: no hay ruta que
                // cambiar, sólo bajar a las tareas.
                item.enlace.href.startsWith("#") ? (
                  <a href={item.enlace.href} className={claseEnlace}>
                    {item.enlace.texto}
                    <ArrowRight className="h-4 w-4" strokeWidth={1.6} />
                  </a>
                ) : (
                  <Link href={item.enlace.href} className={claseEnlace}>
                    {item.enlace.texto}
                    <ArrowRight className="h-4 w-4" strokeWidth={1.6} />
                  </Link>
                )
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        onClick={cerrar}
        className="relative mt-7 inline-flex min-h-[2.75rem] items-center rounded-full border border-ink bg-ink px-6 py-2 font-body text-sm text-white transition-[background-color,scale] duration-150 hover:bg-ink-soft active:scale-[0.98]"
      >
        {isEnglish ? "Let's start" : "Empezar"}
      </button>
    </section>
  );
}

/** Marca de "ya la vieron", por boda: la pareja comparte panel con dos correos. */
function claveDeBienvenida(weddingId: string): string {
  return `bb:bienvenida:${weddingId}`;
}

export function PantallaHoy({
  bundle,
  diasRestantes,
  suscripcion = null,
  acceso,
  bienvenida = false,
}: {
  bundle: PanelBundle;
  /** Resuelto en el servidor. Aquí NO se mira el reloj: ver getPanelDataByEmail. */
  diasRestantes: number | null;
  /** Sólo las bodas del plan mensual; las de pago único no tienen tarjeta. */
  suscripcion?: SuscripcionDeLaBoda | null;
  /** De v_acceso_de_la_boda (leerAcceso). Decide si sale la tarjeta de la prueba. */
  acceso: AccesoDeLaBoda;
  /** true cuando llega del onboarding (?bienvenida=1). */
  bienvenida?: boolean;
}) {
  const { isEnglish } = useLanguage();
  const router = useRouter();
  const { wedding, budget, guests } = bundle;
  const conPlanner = wedding.tienePlanner;
  const estimados =
    wedding.invitadosEstimados != null && wedding.invitadosEstimados > 0
      ? wedding.invitadosEstimados
      : null;

  // ----- La bienvenida -----
  // Se siembra del prop para que llegue pintada desde el servidor (sin un
  // salto al hidratar). Luego vive en su propio estado: al quitar el parámetro
  // de la URL el servidor vuelve a pintar con bienvenida=false, y la tarjeta
  // no debe desaparecer por eso, sólo cuando la cierren.
  const [verBienvenida, setVerBienvenida] = useState(bienvenida);
  const h1Ref = useRef<HTMLHeadingElement | null>(null);
  // StrictMode corre los efectos dos veces en desarrollo, y la segunda vez ya
  // encontraría la marca que puso la primera: la escondería al instante.
  const revisada = useRef(false);

  useEffect(() => {
    if (!bienvenida || revisada.current) return;
    revisada.current = true;
    const clave = claveDeBienvenida(wedding.id);
    try {
      if (window.localStorage.getItem(clave) === "1") {
        // Ya la vieron: el enlace del correo o el botón Atrás pueden traer el
        // parámetro otra vez. No vuelve a salir.
        setVerBienvenida(false);
      } else {
        window.localStorage.setItem(clave, "1");
      }
    } catch {
      // Sin almacenamiento (ventana privada, bloqueado) sale esta vez y la
      // URL limpia de abajo evita que salga al recargar.
    }
    // Recargar la página no debe repetirla: se quita el parámetro.
    router.replace("/panel", { scroll: false });
  }, [bienvenida, wedding.id, router]);

  function cerrarBienvenida() {
    setVerBienvenida(false);
    // El botón que tenía el foco desaparece: sin esto el foco cae al <body> y
    // quien navega con teclado vuelve a empezar desde arriba del documento.
    h1Ref.current?.focus();
  }

  const paso = diasRestantes != null && diasRestantes < 0;
  const cuenta = countdownPhrase(diasRestantes, isEnglish);
  // La tarjeta de la cuenta regresiva solo tiene sentido con días por delante
  // (o el mismo día). Sin fecha o ya casados, lo dice el renglón de arriba.
  const faltanDias = diasRestantes != null && diasRestantes >= 0;
  // La misma regla que el menú y las rutas: sin planner y sin nada capturado,
  // la tarjeta de dinero solo diría "su planner aún no…" a quien no tiene una.
  const { dinero: mostrarDinero } = seccionesDelPanel(bundle);

  // El dinero se cuenta desde lo PAGADO, que es la buena noticia, y nunca se
  // enseña un "Disponible" suelto: cuando el estimado coincide con lo
  // contratado daba $0 y una pareja lee eso como "nos quedamos sin dinero".
  const porcentajePagado =
    budget.contracted > 0 ? (budget.paid / budget.contracted) * 100 : null;

  // Sin nada contratado ni pagado, "Llevan pagado $0" era el titular. Si hay
  // presupuesto (del onboarding o de la planner), ése es el dato que tienen.
  const soloPresupuesto =
    budget.paid <= 0 && budget.contracted <= 0 && budget.budgetTotal != null;

  const dineroTitular = soloPresupuesto
    ? isEnglish
      ? `A budget of ${formatMXN(budget.budgetTotal!)}`
      : `Un presupuesto de ${formatMXN(budget.budgetTotal!)}`
    : paso
      ? isEnglish
        ? `You paid ${formatMXN(budget.paid)}`
        : `Pagaron ${formatMXN(budget.paid)}`
      : isEnglish
        ? `You've paid ${formatMXN(budget.paid)}`
        : `Llevan pagado ${formatMXN(budget.paid)}`;

  const dineroDetalle =
    budget.contracted <= 0
      ? conPlanner
        ? isEnglish
          ? "Nothing is contracted yet. As your planner signs vendors, they'll show up here."
          : "Todavía no hay nada contratado. Conforme su planner cierre proveedores van a ir apareciendo aquí."
        : isEnglish
          ? "Nothing is contracted or paid yet."
          : "Todavía no hay nada contratado ni pagado."
      : budget.balance > 0
        ? isEnglish
          ? `of ${formatMXN(budget.contracted)} contracted. ${formatMXN(budget.balance)} left to pay.`
          : `de ${formatMXN(budget.contracted)} contratados. Faltan ${formatMXN(budget.balance)} por pagar.`
        : isEnglish
          ? `of ${formatMXN(budget.contracted)} contracted. Nothing left to pay.`
          : `de ${formatMXN(budget.contracted)} contratados. No falta nada por pagar.`;

  // ----- Invitados -----
  // Tres momentos distintos que antes compartían frase. Con la lista vacía,
  // "Van 0 personas · Los 0 grupos ya contestaron" era falso y además un
  // callejón: no decía qué hacer. Con lista y sin ninguna respuesta, "Van 0
  // personas" y una barra en cero se leían como "nadie viene".
  const listaVacia = guests.total === 0;
  const nadieContesto = !listaVacia && guests.pending === guests.total;

  const invitadosTitular = listaVacia
    ? estimados != null
      ? isEnglish
        ? `About ${estimados} people in mind`
        : `Unas ${estimados} personas en mente`
      : isEnglish
        ? "Your list, ready to begin"
        : "Su lista, por empezar"
    : nadieContesto
      ? isEnglish
        ? `${guests.total} ${guests.total === 1 ? "group" : "groups"} on your list`
        : `${guests.total} ${guests.total === 1 ? "grupo" : "grupos"} en su lista`
      : isEnglish
        ? `${guests.attending} people coming`
        : `Van ${guests.attending} personas`;

  const invitadosDetalle = listaVacia
    ? isEnglish
      ? "Add the first ones and you'll see here who has replied."
      : "Agreguen a los primeros y aquí van a ver quién ya contestó."
    : nadieContesto
      ? isEnglish
        ? "No replies yet. As they come in, you'll see here who's coming."
        : "Todavía no contesta nadie. Conforme lo hagan, aquí van a ver quién viene."
      : guests.pending > 0
        ? isEnglish
          ? `Of the ${guests.total} groups you invited, ${guests.pending} haven't replied. They'll show up here on their own.`
          : `De los ${guests.total} grupos que invitaron, ${guests.pending} no han contestado. Van a aparecer aquí solos.`
        : isEnglish
          ? `All ${guests.total} groups replied.`
          : `Los ${guests.total} grupos ya contestaron.`;

  const porcentajeContestado =
    guests.total > 0 && !nadieContesto
      ? ((guests.total - guests.pending) / guests.total) * 100
      : null;

  // ----- Lo que ya funciona, para la bienvenida -----
  const pendientes = bundle.tasks.filter((t) => !t.doneAt).length;
  const loQueYaEsta: LoQueYaEsta[] = [];
  if (faltanDias && diasRestantes! > 0) {
    loQueYaEsta.push({
      clave: "cuenta",
      figura: isEnglish
        ? `${diasRestantes} ${diasRestantes === 1 ? "day" : "days"}`
        : `${diasRestantes} ${diasRestantes === 1 ? "día" : "días"}`,
      texto: isEnglish
        ? "The countdown is already running, right up there."
        : "La cuenta regresiva ya corre, ahí arriba.",
    });
  }
  if (estimados != null) {
    const tequila = enCajas(sugerido("tequila", estimados), isEnglish);
    loQueYaEsta.push({
      clave: "barra",
      figura: isEnglish ? `${estimados} people` : `${estimados} personas`,
      texto: isEnglish
        ? `The bar is already worked out for them: ${tequila} of tequila, to begin with.`
        : `La barra ya está calculada para ellas: ${tequila} de tequila, para empezar.`,
      enlace: { href: "/panel/barra", texto: isEnglish ? "See the bar" : "Ver la barra" },
    });
  }
  if (budget.budgetTotal != null) {
    loQueYaEsta.push({
      clave: "presupuesto",
      figura: formatMXN(budget.budgetTotal),
      texto: isEnglish
        ? "Your budget already lives in Money, whole."
        : "Su presupuesto ya vive en Dinero, completo.",
      enlace: mostrarDinero
        ? { href: "/panel/dinero", texto: isEnglish ? "See your money" : "Ver su dinero" }
        : undefined,
    });
  }
  if (pendientes > 0) {
    loQueYaEsta.push({
      clave: "plan",
      figura: isEnglish
        ? `${pendientes} ${pendientes === 1 ? "task" : "tasks"}`
        : `${pendientes} ${pendientes === 1 ? "pendiente" : "pendientes"}`,
      texto: wedding.weddingDate
        ? isEnglish
          ? "Your plan, dated back from the big day. What's due this week comes first."
          : "Su plan, con fechas contadas desde el día de la boda. Lo de esta semana va primero."
        : isEnglish
          ? "Your plan. Once you set the date, each task gets its own."
          : "Su plan. En cuanto pongan la fecha, cada pendiente toma la suya.",
      enlace: { href: "#tareas", texto: isEnglish ? "See the plan" : "Ver el plan" },
    });
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <Reveal app>
        <header className="grid items-end gap-6 md:grid-cols-[1fr_auto]">
          <div>
            {/* Con cuenta regresiva a la vista, el renglón no la repite. */}
            <Eyebrow>{faltanDias ? (isEnglish ? "Your wedding" : "Su boda") : cuenta}</Eyebrow>
            <h1
              ref={h1Ref}
              tabIndex={-1}
              className="mt-3 font-heading text-4xl font-medium tracking-[-0.02em] text-ink outline-none md:text-5xl"
            >
              {isEnglish ? "Hi, " : "Hola, "}
              <em className="italic text-azul">{wedding.coupleName}</em>
            </h1>
            <DatosDeLaBoda
              weddingDate={wedding.weddingDate}
              venue={wedding.venue}
              soloLectura={!acceso.puedeEditar}
            />
          </div>
          {faltanDias ? <CuentaRegresiva dias={diasRestantes!} isEnglish={isEnglish} /> : null}
        </header>
      </Reveal>

      {verBienvenida ? (
        <Bienvenida items={loQueYaEsta} isEnglish={isEnglish} onCerrar={cerrarBienvenida} />
      ) : null}

      <Reveal app className="mt-10">
        <div className={`grid gap-5 ${mostrarDinero ? "sm:grid-cols-2" : ""}`}>
          {mostrarDinero ? (
            <Resumen
              eyebrow={isEnglish ? "Your money" : "Su dinero"}
              titular={dineroTitular}
              detalle={dineroDetalle}
              progreso={porcentajePagado}
              tono="terra"
              href="/panel/dinero"
              cta={
                soloPresupuesto
                  ? isEnglish
                    ? "See your budget"
                    : "Ver su presupuesto"
                  : isEnglish
                    ? "See it vendor by vendor"
                    : "Ver proveedor por proveedor"
              }
            />
          ) : null}
          <Resumen
            eyebrow={isEnglish ? "Your guests" : "Sus invitados"}
            titular={invitadosTitular}
            detalle={invitadosDetalle}
            progreso={porcentajeContestado}
            tono="verde"
            href="/panel/invitados"
            cta={
              listaVacia
                ? isEnglish
                  ? "Add the first ones"
                  : "Agregar a los primeros"
                : isEnglish
                  ? "See the list"
                  : "Ver la lista"
            }
          />
        </div>
      </Reveal>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        {/* id: el renglón "Ver el plan" de la bienvenida salta aquí. */}
        <Reveal app>
          <div id="tareas" className="h-full scroll-mt-6">
            <TasksSection tasks={bundle.tasks} isEnglish={isEnglish} conPlanner={conPlanner} />
          </div>
        </Reveal>
        <Reveal app>
          <MessagesSection
            initialMessages={bundle.messages}
            unavailable={Boolean(bundle.messagesUnavailable)}
            isEnglish={isEnglish}
            conPlanner={conPlanner}
          />
        </Reveal>
      </div>

      <Reveal app className="mt-8">
        <ArchivosParaProveedores bundle={bundle} />
      </Reveal>

      {/* La prueba y la suscripción ocupan el mismo sitio: son "su plan". */}
      {estaEnPrueba(acceso) ? (
        <Reveal app className="mt-8">
          <PlanDePrueba acceso={acceso} />
        </Reveal>
      ) : null}

      {suscripcion ? (
        <Reveal app className="mt-8">
          <SuPlan suscripcion={suscripcion} />
        </Reveal>
      ) : null}
    </div>
  );
}
