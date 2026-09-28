import type { ReactNode } from "react";
import {
  CalendarClock,
  Check,
  Home,
  Send,
  Users,
  Wallet,
} from "lucide-react";
import { CountUp } from "@/components/marketing/CountUp";
import { Rings } from "@/components/marketing/Ink";

/*
 * Pantallas de ejemplo del panel, dibujadas en HTML (no capturas): se ven
 * nítidas en cualquier pantalla, se traducen solas y no pesan.
 *
 * Los datos son de una boda inventada (Sofía y Diego) pero las pantallas son
 * las reales: Hoy, Invitados, Dinero, El día y la barra existen en /panel.
 * Las cifras de la barra salen de la misma receta que usa PantallaBarra
 * (150 personas: 48 botellas de tequila = 4 cajas, 360 coronitas = 15
 * cartones).
 *
 * Todo en Work Sans: son pantallas de producto, y en el producto la letra de
 * apoyo carga los datos. El marcador y el script sólo aparecen donde la
 * pantalla real los usa como adorno (el «Save the date» de la invitación).
 * Sombras teñidas de azul noche, nunca negras; superficies sólidas, porque lo
 * translúcido queda reservado a la barra fija del sitio.
 */

const SURFACE =
  "rounded-2xl border border-linea bg-niebla shadow-[0_1px_2px_rgb(46_58_85/0.04),0_12px_32px_-16px_rgb(46_58_85/0.22)]";

export function MockCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`${SURFACE} ${className}`}>{children}</div>;
}

function Label({ children }: { children: ReactNode }) {
  return <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-tinta">{children}</p>;
}

type Tone = "done" | "soon" | "open";

function Chip({ tone, children }: { tone: Tone; children: ReactNode }) {
  const tones: Record<Tone, string> = {
    done: "bg-papel text-noche",
    soon: "bg-noche text-niebla",
    open: "border border-linea bg-papel text-tinta",
  };
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium ${tones[tone]}`}>
      {tone === "done" && <Check className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden="true" />}
      {children}
    </span>
  );
}

function Bar({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-papel-medio ${className}`}>
      <div className="h-full rounded-full bg-tinta" style={{ width: `${value}%` }} />
    </div>
  );
}

/* ---------- El teléfono con la pantalla "Hoy" ---------- */

export function PhoneHoy({ en }: { en: boolean }) {
  const tasks = en
    ? [
        { t: "Send the invitations", done: true },
        { t: "Menu tasting · Sat 10:00", done: false },
        { t: "Pick the entrance song", done: false },
      ]
    : [
        { t: "Mandar las invitaciones", done: true },
        { t: "Prueba de menú · sáb 10:00", done: false },
        { t: "Elegir la canción de entrada", done: false },
      ];

  const tabs = [
    { Icon: Home, label: en ? "Today" : "Hoy", active: true },
    { Icon: Users, label: en ? "Guests" : "Invitados" },
    { Icon: Wallet, label: en ? "Money" : "Dinero" },
    { Icon: CalendarClock, label: en ? "The day" : "El día" },
  ];

  // El marco del teléfono es el único azul noche grande de la pieza: es el
  // sombreado del dibujo (el objeto), no un fondo de sección.
  return (
    <div
      role="img"
      aria-label={
        en
          ? "The Blue Book dashboard on a phone: 172 days to go, 86 of 120 guests confirmed, the flower deposit due Friday and this week's tasks."
          : "El panel de Blue Book en un celular: faltan 172 días, 86 de 120 invitados confirmados, el anticipo de flores vence el viernes y los pendientes de la semana."
      }
      className="relative w-[272px] shrink-0 rounded-[2.9rem] bg-noche p-[9px] shadow-[0_40px_80px_-30px_rgb(46_58_85/0.55),0_0_0_1px_rgb(46_58_85/0.06)] sm:w-[292px]"
    >
      <div className="relative overflow-hidden rounded-[2.35rem] bg-papel" aria-hidden="true">
        {/* barra de estado */}
        <div className="flex items-center justify-between px-6 pt-3 text-[11px] font-medium text-noche">
          <span className="tabular-nums">9:41</span>
          <span className="h-[22px] w-[76px] rounded-full bg-noche" />
          <span className="flex items-center gap-1">
            <span className="h-2 w-3 rounded-[2px] border border-noche/70" />
          </span>
        </div>

        <div className="space-y-2.5 px-3.5 pb-3 pt-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-tinta">
                {en ? "Your wedding" : "Tu boda"}
              </p>
              <p className="text-[19px] font-medium leading-tight text-noche">Sofía &amp; Diego</p>
            </div>
            <div className="flex -space-x-1.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-papel bg-linea text-[10px] font-medium text-noche">S</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-papel bg-niebla text-[10px] font-medium text-noche">D</span>
            </div>
          </div>

          {/* cuenta regresiva. «faltan» era script, pero es parte del dato
              («faltan 172 días»): el script nunca carga información. La cifra
              va en Work Sans Light, como los numerales grandes de Apple. */}
          <div className="relative overflow-hidden rounded-2xl bg-niebla px-4 py-3.5 ring-1 ring-linea">
            <p className="text-[12px] text-tinta">{en ? "only" : "faltan"}</p>
            <p className="text-[40px] font-light leading-none text-noche tabular-nums">
              172 <span className="text-[24px]">{en ? "days" : "días"}</span>
            </p>
            <p className="mt-1.5 text-[10.5px] text-tinta">
              {en ? "Sat, March 13, 2027 · San Gabriel" : "Sáb 13 de marzo, 2027 · San Gabriel"}
            </p>
          </div>

          {/* invitados */}
          <div className="rounded-2xl border border-linea bg-niebla px-3.5 py-3">
            <div className="flex items-baseline justify-between">
              <Label>{en ? "Guests" : "Invitados"}</Label>
              <p className="text-[11px] text-tinta">
                <span className="font-medium text-noche tabular-nums">
                  <CountUp to={86} />
                </span>{" "}
                {en ? "of 120" : "de 120"}
              </p>
            </div>
            <Bar value={72} className="mt-2" />
            <p className="mt-1.5 text-[10.5px] text-tinta">
              {en ? "25 haven't replied yet" : "25 aún no contestan"}
            </p>
          </div>

          {/* próximo pago */}
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-linea bg-niebla px-3.5 py-3">
            <div className="min-w-0">
              <Label>{en ? "Next payment" : "Próximo pago"}</Label>
              <p className="mt-0.5 text-[12px] font-medium text-noche">
                {en ? "Flowers · deposit" : "Flores · anticipo"}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[13px] font-medium text-noche tabular-nums">$8,500</p>
              <Chip tone="soon">{en ? "due Friday" : "vence el viernes"}</Chip>
            </div>
          </div>

          {/* esta semana */}
          <div className="rounded-2xl border border-linea bg-niebla px-3.5 py-3">
            <Label>{en ? "This week" : "Esta semana"}</Label>
            <ul className="mt-2 space-y-1.5">
              {tasks.map((task) => (
                <li key={task.t} className="flex items-center gap-2 text-[11.5px]">
                  <span
                    className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border ${
                      task.done ? "border-tinta bg-tinta text-niebla" : "border-linea bg-niebla"
                    }`}
                  >
                    {task.done && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                  </span>
                  <span className={task.done ? "text-tinta line-through decoration-linea-control" : "text-noche"}>
                    {task.t}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* barra de navegación del panel */}
        <div className="grid grid-cols-4 border-t border-linea bg-niebla px-2 pb-4 pt-2">
          {tabs.map(({ Icon, label, active }) => (
            <span
              key={label}
              className={`flex flex-col items-center gap-0.5 text-[9.5px] font-medium ${
                active ? "text-noche" : "text-tinta"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={active ? 2 : 1.6} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Tarjetas sueltas (bento de "todo en un solo lugar") ---------- */

export function VendorsMock({ en }: { en: boolean }) {
  const rows: Array<{ name: string; who: string; tone: Tone; status: string }> = en
    ? [
        { name: "Catering", who: "Casa Olivo", tone: "done", status: "Booked" },
        { name: "Photography", who: "Luz de Tarde", tone: "done", status: "Booked" },
        { name: "Flowers", who: "Flor de Lis", tone: "soon", status: "Deposit Fri" },
        { name: "Music", who: "DJ Mateo", tone: "open", status: "To confirm" },
        { name: "Cake", who: "3 quotes", tone: "open", status: "Comparing" },
      ]
    : [
        { name: "Banquete", who: "Casa Olivo", tone: "done", status: "Contratado" },
        { name: "Fotografía", who: "Luz de Tarde", tone: "done", status: "Contratado" },
        { name: "Flores", who: "Flor de Lis", tone: "soon", status: "Anticipo vie" },
        { name: "Música", who: "DJ Mateo", tone: "open", status: "Por confirmar" },
        { name: "Pastel", who: "3 cotizaciones", tone: "open", status: "Comparando" },
      ];
  return (
    <MockCard className="p-4">
      <div className="flex items-center justify-between">
        <Label>{en ? "Vendors" : "Proveedores"}</Label>
        <p className="text-[10.5px] text-tinta">{en ? "2 of 5 booked" : "2 de 5 contratados"}</p>
      </div>
      <ul className="mt-2 divide-y divide-linea">
        {rows.map((row) => (
          <li key={row.name} className="flex items-center gap-3 py-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-papel text-sm font-medium text-noche">
              {row.name[0]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-noche">{row.name}</p>
              <p className="truncate text-[10.5px] text-tinta">{row.who}</p>
            </div>
            <Chip tone={row.tone}>{row.status}</Chip>
          </li>
        ))}
      </ul>
    </MockCard>
  );
}

export function BudgetMock({ en }: { en: boolean }) {
  return (
    <MockCard className="p-4">
      <Label>{en ? "Budget" : "Presupuesto"}</Label>
      <p className="mt-1 text-[30px] font-light leading-none text-noche tabular-nums">
        $186,500
        <span className="text-[11px] font-normal text-tinta"> {en ? "of" : "de"} $300,000</span>
      </p>
      {/* pagado + por pagar + libre, en una sola barra */}
      <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-papel-medio">
        <span className="h-full bg-noche" style={{ width: "41%" }} />
        <span className="h-full bg-tinta/60" style={{ width: "21%" }} />
      </div>
      <dl className="mt-2 grid grid-cols-3 gap-1 text-[10px] text-tinta">
        <div>
          <dt className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-noche" />{en ? "Paid" : "Pagado"}</dt>
          <dd className="font-medium text-noche tabular-nums">$124,000</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-tinta/60" />{en ? "To pay" : "Por pagar"}</dt>
          <dd className="font-medium text-noche tabular-nums">$62,500</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-linea" />{en ? "Left" : "Libre"}</dt>
          <dd className="font-medium text-noche tabular-nums">$113,500</dd>
        </div>
      </dl>
      <div className="mt-3 space-y-1.5 border-t border-linea pt-3">
        {[
          { what: en ? "Flowers · deposit" : "Flores · anticipo", when: en ? "Fri 19" : "vie 19", amount: "$8,500", soon: true },
          { what: en ? "DJ · 2nd payment" : "DJ · 2º pago", when: en ? "Oct 2" : "2 oct", amount: "$6,000", soon: false },
        ].map((p) => (
          <div key={p.what} className="flex items-center justify-between text-[11px]">
            <span className="text-noche">{p.what}</span>
            <span className="flex items-center gap-2">
              <span className={p.soon ? "font-medium text-noche" : "text-tinta"}>{p.when}</span>
              <span className="font-medium text-noche tabular-nums">{p.amount}</span>
            </span>
          </div>
        ))}
      </div>
    </MockCard>
  );
}

export function RsvpMock({ en }: { en: boolean }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const people = en
    ? [
        { n: "Aunt Lupe", v: "2", ok: true },
        { n: "Cousin Andrés", v: "1", ok: true },
        { n: "The Ruiz family", v: "—", ok: false },
      ]
    : [
        { n: "Tía Lupe", v: "2", ok: true },
        { n: "Primo Andrés", v: "1", ok: true },
        { n: "Familia Ruiz", v: "—", ok: false },
      ];
  return (
    <MockCard className="p-4">
      <Label>{en ? "RSVPs" : "Confirmaciones"}</Label>
      <div className="mt-2 flex items-center gap-4">
        <div className="relative h-[76px] w-[76px] shrink-0">
          <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="38" cy="38" r={r} fill="none" strokeWidth="7" className="stroke-papel-medio" />
            <circle
              cx="38"
              cy="38"
              r={r}
              fill="none"
              strokeWidth="7"
              strokeLinecap="round"
              className="stroke-tinta"
              strokeDasharray={`${c * 0.72} ${c}`}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[22px] font-medium text-noche tabular-nums">
            <CountUp to={86} />
          </span>
        </div>
        <dl className="space-y-0.5 text-[11px] text-tinta">
          <div className="flex gap-2"><dt className="w-20">{en ? "Coming" : "Sí van"}</dt><dd className="font-medium text-noche tabular-nums">86</dd></div>
          <div className="flex gap-2"><dt className="w-20">{en ? "Can't come" : "No van"}</dt><dd className="font-medium text-noche tabular-nums">9</dd></div>
          <div className="flex gap-2"><dt className="w-20">{en ? "No reply" : "Sin contestar"}</dt><dd className="font-medium text-noche tabular-nums">25</dd></div>
        </dl>
      </div>
      <ul className="mt-3 space-y-1 border-t border-linea pt-2.5">
        {people.map((p) => (
          <li key={p.n} className="flex items-center justify-between text-[11px]">
            <span className="text-noche">{p.n}</span>
            {p.ok ? (
              <Chip tone="done">{p.v}</Chip>
            ) : (
              <span className="text-tinta">{en ? "reminder sent" : "recordatorio enviado"}</span>
            )}
          </li>
        ))}
      </ul>
    </MockCard>
  );
}

export function InvitationMock({ en }: { en: boolean }) {
  return (
    <div className="relative">
      {/* La invitación es una pieza de la marca: su «Save the date» va en la
          frase (Lazy Dog) y los nombres en el marcador, como en el Instagram. */}
      <div className="relative mx-auto w-full max-w-[230px] -rotate-2 rounded-xl border border-linea bg-niebla px-5 pb-5 pt-4 text-center shadow-[0_14px_30px_-18px_rgb(46_58_85/0.35)]">
        <Rings className="mx-auto h-12 w-16 text-tinta" />
        <p className="font-script text-[24px] leading-none text-tinta">Save the date</p>
        <p className="titular mt-1.5 text-[26px]">Sofía &amp; Diego</p>
        <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.22em] text-tinta tabular-nums">13 · 03 · 2027</p>
        <p className="mt-0.5 text-[10px] text-tinta">Hacienda San Gabriel</p>
        <span className="mt-3 inline-flex rounded-full bg-noche px-3 py-1 text-[10px] font-medium text-niebla">
          {en ? "Will you come?" : "¿Nos acompañas?"}
        </span>
      </div>
      <div className="relative mx-auto -mt-3 flex w-fit items-center gap-1.5 rounded-full border border-linea bg-niebla px-3 py-1.5 text-[10.5px] font-medium text-noche shadow-sm">
        <Send className="h-3 w-3 text-tinta" strokeWidth={2} aria-hidden="true" />
        {en ? "Sent on WhatsApp · 120 guests" : "Enviada por WhatsApp · 120 invitados"}
      </div>
    </div>
  );
}

export function TasksMock({ en }: { en: boolean }) {
  const groups = en
    ? [
        { title: "This week", items: [{ t: "Menu tasting", d: "Sat", done: false }, { t: "Send invitations", d: "", done: true }] },
        { title: "This month", items: [{ t: "Dress fitting", d: "Oct 12", done: false }, { t: "Book the makeup artist", d: "Oct 20", done: false }] },
      ]
    : [
        { title: "Esta semana", items: [{ t: "Prueba de menú", d: "sáb", done: false }, { t: "Mandar invitaciones", d: "", done: true }] },
        { title: "Este mes", items: [{ t: "Prueba del vestido", d: "12 oct", done: false }, { t: "Apartar maquillista", d: "20 oct", done: false }] },
      ];
  return (
    <MockCard className="p-4">
      {groups.map((g, gi) => (
        <div key={g.title} className={gi ? "mt-3 border-t border-linea pt-3" : ""}>
          <Label>{g.title}</Label>
          <ul className="mt-1.5 space-y-1.5">
            {g.items.map((item) => (
              <li key={item.t} className="flex items-center gap-2 text-[11.5px]">
                <span
                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border ${
                    item.done ? "border-tinta bg-tinta text-niebla" : "border-linea bg-niebla"
                  }`}
                >
                  {item.done && <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />}
                </span>
                <span className={`flex-1 ${item.done ? "text-tinta line-through decoration-linea-control" : "text-noche"}`}>{item.t}</span>
                {item.d && <span className="text-[10.5px] text-tinta">{item.d}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </MockCard>
  );
}

export function TimelineMock({ en, horizontal = false }: { en: boolean; horizontal?: boolean }) {
  const moments = en
    ? [
        { h: "17:00", t: "Ceremony", w: "Coin sponsors: the Ruiz family" },
        { h: "18:15", t: "Cocktail hour", w: "Casa Olivo" },
        { h: "19:45", t: "Grand entrance", w: "Song: La vie en rose" },
        { h: "20:00", t: "Dinner", w: "Casa Olivo" },
        { h: "21:30", t: "First dance", w: "DJ Mateo" },
      ]
    : [
        { h: "17:00", t: "Ceremonia", w: "Padrinos de arras: los Ruiz" },
        { h: "18:15", t: "Cóctel", w: "Casa Olivo" },
        { h: "19:45", t: "Entrada de los novios", w: "Canción: La vie en rose" },
        { h: "20:00", t: "Cena", w: "Casa Olivo" },
        { h: "21:30", t: "Primer baile", w: "DJ Mateo" },
      ];

  if (horizontal) {
    return (
      <div className="relative">
        <div className="absolute left-0 right-0 top-[7px] hidden h-px bg-linea sm:block" aria-hidden="true" />
        <ol className="relative grid gap-4 sm:grid-cols-5 sm:gap-3">
          {moments.map((m, i) => (
            <li key={m.h} className="flex gap-3 sm:block">
              <span className={`mt-0.5 block h-3.5 w-3.5 shrink-0 rounded-full border-2 sm:mt-0 ${i === 2 ? "border-noche bg-noche" : "border-tinta bg-papel"}`} />
              <div className="sm:mt-3">
                <p className="text-[11px] font-medium text-noche tabular-nums">{m.h}</p>
                <p className="text-base font-medium leading-tight text-noche">{m.t}</p>
                <p className="text-[11px] text-tinta">{m.w}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <MockCard className="p-4">
      <Label>{en ? "The day" : "El día"}</Label>
      <ol className="relative mt-2 space-y-2.5 border-l border-linea pl-4">
        {moments.map((m, i) => (
          <li key={m.h} className="relative">
            <span className={`absolute -left-[21.5px] top-1 h-2.5 w-2.5 rounded-full border-2 ${i === 2 ? "border-noche bg-noche" : "border-tinta bg-niebla"}`} />
            <p className="text-[11.5px] text-noche">
              <span className="font-medium tabular-nums text-noche">{m.h}</span> · {m.t}
            </p>
            <p className="text-[10.5px] text-tinta">{m.w}</p>
          </li>
        ))}
      </ol>
    </MockCard>
  );
}

export function BarMock({ en }: { en: boolean }) {
  const rows = en
    ? [
        ["Tequila", "4 cases"],
        ["Red wine", "5 cases"],
        ["Whisky", "2 cases"],
        ["Coronitas", "15 packs"],
      ]
    : [
        ["Tequila", "4 cajas"],
        ["Vino tinto", "5 cajas"],
        ["Whisky", "2 cajas"],
        ["Coronitas", "15 cartones"],
      ];
  return (
    <MockCard className="p-4">
      <div className="flex items-center justify-between">
        <Label>{en ? "The bar" : "La barra"}</Label>
        <span className="rounded-full bg-papel px-2 py-0.5 text-[10px] font-medium text-noche tabular-nums">
          150 {en ? "people" : "personas"}
        </span>
      </div>
      <dl className="mt-2 divide-y divide-linea">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between py-1.5 text-[11.5px]">
            <dt className="text-noche">{k}</dt>
            <dd className="font-medium text-noche tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </MockCard>
  );
}

/** El mensaje de la planner: el lado humano junto al software. Sólido y no
 *  translúcido: el vidrio esmerilado queda sólo para la barra fija. */
export function PlannerNote({ en, className = "" }: { en: boolean; className?: string }) {
  return (
    <div
      className={`w-[250px] rounded-2xl rounded-bl-md border border-linea bg-niebla p-3.5 shadow-[0_18px_40px_-20px_rgb(46_58_85/0.45)] ${className}`}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-noche text-[12px] font-medium text-niebla">P</span>
        <p className="text-[11px] font-medium text-noche">{en ? "Your planner" : "Tu planner"}</p>
        <span className="ml-auto text-[10px] text-tinta tabular-nums">10:04</span>
      </div>
      <p className="mt-2 text-[12px] leading-snug text-noche">
        {en
          ? "I went over your budget: you're doing great. I already reminded the florist about Friday."
          : "Revisé tu presupuesto: vas muy bien. Ya le recordé a la florista lo del viernes."}
      </p>
    </div>
  );
}

/** El aviso que aparece cuando alguien confirma. */
export function RsvpToast({ en, className = "" }: { en: boolean; className?: string }) {
  return (
    <div
      className={`flex w-[256px] items-center gap-3 rounded-2xl border border-linea bg-niebla p-3 shadow-[0_18px_40px_-20px_rgb(46_58_85/0.45)] ${className}`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-papel text-noche">
        <Check className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-noche">{en ? "Aunt Lupe confirmed" : "Tía Lupe confirmó"}</p>
        <p className="text-[10.5px] text-tinta">{en ? "2 people · just now" : "2 personas · hace un momento"}</p>
      </div>
    </div>
  );
}
