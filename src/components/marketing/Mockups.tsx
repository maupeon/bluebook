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
 */

const SURFACE =
  "rounded-2xl border border-hairline bg-white shadow-[0_1px_2px_rgba(28,45,79,0.04),0_12px_32px_-16px_rgba(28,45,79,0.22)]";

export function MockCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`${SURFACE} ${className}`}>{children}</div>;
}

function Label({ children }: { children: ReactNode }) {
  return <p className="font-body text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-muted">{children}</p>;
}

type Tone = "done" | "soon" | "open";

function Chip({ tone, children }: { tone: Tone; children: ReactNode }) {
  const tones: Record<Tone, string> = {
    done: "bg-wash text-azul-deep",
    soon: "bg-navy text-white",
    open: "border border-hairline bg-paper text-navy-muted",
  };
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 font-body text-[10px] font-semibold ${tones[tone]}`}>
      {tone === "done" && <Check className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden="true" />}
      {children}
    </span>
  );
}

function Bar({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-wash-soft ${className}`}>
      <div className="h-full rounded-full bg-azul" style={{ width: `${value}%` }} />
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

  return (
    <div
      role="img"
      aria-label={
        en
          ? "The Blue Book dashboard on a phone: 172 days to go, 86 of 120 guests confirmed, the flower deposit due Friday and this week's tasks."
          : "El panel de Blue Book en un celular: faltan 172 días, 86 de 120 invitados confirmados, el anticipo de flores vence el viernes y los pendientes de la semana."
      }
      className="relative w-[272px] shrink-0 rounded-[2.9rem] bg-navy p-[9px] shadow-[0_40px_80px_-30px_rgba(28,45,79,0.55),0_0_0_1px_rgba(28,45,79,0.06)] sm:w-[292px]"
    >
      <div className="relative overflow-hidden rounded-[2.35rem] bg-paper" aria-hidden="true">
        {/* barra de estado */}
        <div className="flex items-center justify-between px-6 pt-3 font-body text-[11px] font-semibold text-navy">
          <span className="tabular-nums">9:41</span>
          <span className="h-[22px] w-[76px] rounded-full bg-navy" />
          <span className="flex items-center gap-1">
            <span className="h-2 w-3 rounded-[2px] border border-navy/70" />
          </span>
        </div>

        <div className="space-y-2.5 px-3.5 pb-3 pt-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <p className="font-body text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-muted">
                {en ? "Your wedding" : "Tu boda"}
              </p>
              <p className="font-heading text-[19px] font-medium leading-tight text-navy">Sofía &amp; Diego</p>
            </div>
            <div className="flex -space-x-1.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-paper bg-wash-deep font-body text-[10px] font-bold text-navy">S</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-paper bg-wash font-body text-[10px] font-bold text-navy">D</span>
            </div>
          </div>

          {/* cuenta regresiva */}
          <div className="relative overflow-hidden rounded-2xl bg-wash px-4 py-3.5">
            <p className="font-script text-[26px] leading-none text-line">{en ? "only" : "faltan"}</p>
            <p className="font-heading text-[40px] font-medium leading-[0.95] tracking-[-0.02em] text-navy tabular-nums">
              172 <span className="text-[24px]">{en ? "days" : "días"}</span>
            </p>
            <p className="mt-1 font-body text-[10.5px] text-navy-soft">
              {en ? "Sat, March 13, 2027 · San Gabriel" : "Sáb 13 de marzo, 2027 · San Gabriel"}
            </p>
          </div>

          {/* invitados */}
          <div className="rounded-2xl border border-hairline bg-white px-3.5 py-3">
            <div className="flex items-baseline justify-between">
              <Label>{en ? "Guests" : "Invitados"}</Label>
              <p className="font-body text-[11px] text-navy-muted">
                <span className="font-semibold text-navy tabular-nums">
                  <CountUp to={86} />
                </span>{" "}
                {en ? "of 120" : "de 120"}
              </p>
            </div>
            <Bar value={72} className="mt-2" />
            <p className="mt-1.5 font-body text-[10.5px] text-navy-muted">
              {en ? "25 haven't replied yet" : "25 aún no contestan"}
            </p>
          </div>

          {/* próximo pago */}
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-hairline bg-white px-3.5 py-3">
            <div className="min-w-0">
              <Label>{en ? "Next payment" : "Próximo pago"}</Label>
              <p className="mt-0.5 font-body text-[12px] font-semibold text-navy">
                {en ? "Flowers · deposit" : "Flores · anticipo"}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-body text-[13px] font-semibold text-navy tabular-nums">$8,500</p>
              <Chip tone="soon">{en ? "due Friday" : "vence el viernes"}</Chip>
            </div>
          </div>

          {/* esta semana */}
          <div className="rounded-2xl border border-hairline bg-white px-3.5 py-3">
            <Label>{en ? "This week" : "Esta semana"}</Label>
            <ul className="mt-2 space-y-1.5">
              {tasks.map((task) => (
                <li key={task.t} className="flex items-center gap-2 font-body text-[11.5px]">
                  <span
                    className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border ${
                      task.done ? "border-azul bg-azul text-white" : "border-wash-deep bg-white"
                    }`}
                  >
                    {task.done && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                  </span>
                  <span className={task.done ? "text-navy-muted line-through decoration-wash-deep" : "text-navy"}>
                    {task.t}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* barra de navegación del panel */}
        <div className="grid grid-cols-4 border-t border-hairline bg-white/90 px-2 pb-4 pt-2">
          {tabs.map(({ Icon, label, active }) => (
            <span
              key={label}
              className={`flex flex-col items-center gap-0.5 font-body text-[9.5px] font-semibold ${
                active ? "text-navy" : "text-navy-muted/70"
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
        <p className="font-body text-[10.5px] text-navy-muted">{en ? "2 of 5 booked" : "2 de 5 contratados"}</p>
      </div>
      <ul className="mt-2 divide-y divide-hairline">
        {rows.map((row) => (
          <li key={row.name} className="flex items-center gap-3 py-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-wash-soft font-heading text-sm font-semibold text-navy">
              {row.name[0]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-body text-[12px] font-semibold text-navy">{row.name}</p>
              <p className="truncate font-body text-[10.5px] text-navy-muted">{row.who}</p>
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
      <p className="mt-1 font-heading text-[30px] font-medium leading-none tracking-[-0.02em] text-navy tabular-nums">
        $186,500
        <span className="font-body text-[11px] font-normal tracking-normal text-navy-muted"> {en ? "of" : "de"} $300,000</span>
      </p>
      {/* pagado + por pagar + libre, en una sola barra */}
      <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-wash-soft">
        <span className="h-full bg-navy" style={{ width: "41%" }} />
        <span className="h-full bg-azul/60" style={{ width: "21%" }} />
      </div>
      <dl className="mt-2 grid grid-cols-3 gap-1 font-body text-[10px] text-navy-muted">
        <div>
          <dt className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-navy" />{en ? "Paid" : "Pagado"}</dt>
          <dd className="font-semibold text-navy tabular-nums">$124,000</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-azul/60" />{en ? "To pay" : "Por pagar"}</dt>
          <dd className="font-semibold text-navy tabular-nums">$62,500</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-wash-deep" />{en ? "Left" : "Libre"}</dt>
          <dd className="font-semibold text-navy tabular-nums">$113,500</dd>
        </div>
      </dl>
      <div className="mt-3 space-y-1.5 border-t border-hairline pt-3">
        {[
          { what: en ? "Flowers · deposit" : "Flores · anticipo", when: en ? "Fri 19" : "vie 19", amount: "$8,500", soon: true },
          { what: en ? "DJ · 2nd payment" : "DJ · 2º pago", when: en ? "Oct 2" : "2 oct", amount: "$6,000", soon: false },
        ].map((p) => (
          <div key={p.what} className="flex items-center justify-between font-body text-[11px]">
            <span className="text-navy">{p.what}</span>
            <span className="flex items-center gap-2">
              <span className={p.soon ? "font-semibold text-azul-deep" : "text-navy-muted"}>{p.when}</span>
              <span className="font-semibold text-navy tabular-nums">{p.amount}</span>
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
            <circle cx="38" cy="38" r={r} fill="none" strokeWidth="7" className="stroke-wash-soft" />
            <circle
              cx="38"
              cy="38"
              r={r}
              fill="none"
              strokeWidth="7"
              strokeLinecap="round"
              className="stroke-azul"
              strokeDasharray={`${c * 0.72} ${c}`}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-heading text-[22px] font-semibold text-navy tabular-nums">
            <CountUp to={86} />
          </span>
        </div>
        <dl className="space-y-0.5 font-body text-[11px] text-navy-muted">
          <div className="flex gap-2"><dt className="w-20">{en ? "Coming" : "Sí van"}</dt><dd className="font-semibold text-navy tabular-nums">86</dd></div>
          <div className="flex gap-2"><dt className="w-20">{en ? "Can't come" : "No van"}</dt><dd className="font-semibold text-navy tabular-nums">9</dd></div>
          <div className="flex gap-2"><dt className="w-20">{en ? "No reply" : "Sin contestar"}</dt><dd className="font-semibold text-navy tabular-nums">25</dd></div>
        </dl>
      </div>
      <ul className="mt-3 space-y-1 border-t border-hairline pt-2.5">
        {people.map((p) => (
          <li key={p.n} className="flex items-center justify-between font-body text-[11px]">
            <span className="text-navy">{p.n}</span>
            {p.ok ? (
              <Chip tone="done">{p.v}</Chip>
            ) : (
              <span className="text-navy-muted">{en ? "reminder sent" : "recordatorio enviado"}</span>
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
      <div className="relative mx-auto w-full max-w-[230px] -rotate-2 rounded-xl border border-hairline bg-paper-warm px-5 pb-5 pt-4 text-center shadow-[0_14px_30px_-18px_rgba(28,45,79,0.35)]">
        <Rings className="mx-auto h-12 w-16 text-line" />
        <p className="font-script text-[24px] leading-none text-line">Save the date</p>
        <p className="mt-1.5 font-heading text-[26px] font-medium leading-none text-navy">Sofía &amp; Diego</p>
        <p className="mt-2 font-body text-[10px] font-semibold uppercase tracking-[0.22em] text-navy-muted tabular-nums">13 · 03 · 2027</p>
        <p className="mt-0.5 font-body text-[10px] text-navy-muted">Hacienda San Gabriel</p>
        <span className="mt-3 inline-flex rounded-full bg-navy px-3 py-1 font-body text-[10px] font-semibold text-white">
          {en ? "Will you come?" : "¿Nos acompañas?"}
        </span>
      </div>
      <div className="relative mx-auto -mt-3 flex w-fit items-center gap-1.5 rounded-full border border-hairline bg-white px-3 py-1.5 font-body text-[10.5px] font-semibold text-navy shadow-sm">
        <Send className="h-3 w-3 text-azul" strokeWidth={2} aria-hidden="true" />
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
        <div key={g.title} className={gi ? "mt-3 border-t border-hairline pt-3" : ""}>
          <Label>{g.title}</Label>
          <ul className="mt-1.5 space-y-1.5">
            {g.items.map((item) => (
              <li key={item.t} className="flex items-center gap-2 font-body text-[11.5px]">
                <span
                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border ${
                    item.done ? "border-azul bg-azul text-white" : "border-wash-deep bg-white"
                  }`}
                >
                  {item.done && <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />}
                </span>
                <span className={`flex-1 ${item.done ? "text-navy-muted line-through decoration-wash-deep" : "text-navy"}`}>{item.t}</span>
                {item.d && <span className="text-[10.5px] text-navy-muted">{item.d}</span>}
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
        <div className="absolute left-0 right-0 top-[7px] hidden h-px bg-wash-deep sm:block" aria-hidden="true" />
        <ol className="relative grid gap-4 sm:grid-cols-5 sm:gap-3">
          {moments.map((m, i) => (
            <li key={m.h} className="flex gap-3 sm:block">
              <span className={`mt-0.5 block h-3.5 w-3.5 shrink-0 rounded-full border-2 sm:mt-0 ${i === 2 ? "border-navy bg-navy" : "border-azul bg-paper"}`} />
              <div className="sm:mt-3">
                <p className="font-body text-[11px] font-semibold text-azul-deep tabular-nums">{m.h}</p>
                <p className="font-heading text-lg font-medium leading-tight text-navy">{m.t}</p>
                <p className="font-body text-[11px] text-navy-muted">{m.w}</p>
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
      <ol className="relative mt-2 space-y-2.5 border-l border-wash-deep pl-4">
        {moments.map((m, i) => (
          <li key={m.h} className="relative">
            <span className={`absolute -left-[21.5px] top-1 h-2.5 w-2.5 rounded-full border-2 ${i === 2 ? "border-navy bg-navy" : "border-azul bg-white"}`} />
            <p className="font-body text-[11.5px] text-navy">
              <span className="font-semibold tabular-nums text-azul-deep">{m.h}</span> · {m.t}
            </p>
            <p className="font-body text-[10.5px] text-navy-muted">{m.w}</p>
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
        <span className="rounded-full bg-wash-soft px-2 py-0.5 font-body text-[10px] font-semibold text-navy tabular-nums">
          150 {en ? "people" : "personas"}
        </span>
      </div>
      <dl className="mt-2 divide-y divide-hairline">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between py-1.5 font-body text-[11.5px]">
            <dt className="text-navy">{k}</dt>
            <dd className="font-semibold text-navy tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </MockCard>
  );
}

/** El mensaje de la planner: el lado humano junto al software. */
export function PlannerNote({ en, className = "" }: { en: boolean; className?: string }) {
  return (
    <div
      className={`w-[250px] rounded-2xl rounded-bl-md border border-white/60 bg-white/85 p-3.5 shadow-[0_18px_40px_-20px_rgba(28,45,79,0.45)] backdrop-blur-xl ${className}`}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy font-heading text-[12px] font-semibold text-white">P</span>
        <p className="font-body text-[11px] font-semibold text-navy">{en ? "Your planner" : "Tu planner"}</p>
        <span className="ml-auto font-body text-[10px] text-navy-muted tabular-nums">10:04</span>
      </div>
      <p className="mt-2 font-body text-[12px] leading-snug text-navy">
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
      className={`flex w-[256px] items-center gap-3 rounded-2xl border border-white/60 bg-white/85 p-3 shadow-[0_18px_40px_-20px_rgba(28,45,79,0.45)] backdrop-blur-xl ${className}`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-wash text-azul-deep">
        <Check className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="font-body text-[12px] font-semibold text-navy">{en ? "Aunt Lupe confirmed" : "Tía Lupe confirmó"}</p>
        <p className="font-body text-[10.5px] text-navy-muted">{en ? "2 people · just now" : "2 personas · hace un momento"}</p>
      </div>
    </div>
  );
}
