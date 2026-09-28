"use client";

import { useRef, useState, type FormEvent } from "react";
import { Check, ExternalLink, FileText, Mail, MessageCircle, Plus, Trash2, Upload, X } from "lucide-react";
import { formatShortDate, daysUntil } from "@/components/panel/dates";
import {
  NOTA_DECISION_MAX,
  conceptoSugerido,
  cuentasDe,
  numeroDeWhatsApp,
  type DecisionDeLaPareja,
  type EstadoDeProveedor,
  type PagoDelPanel,
  type ProveedorDelPanel,
} from "@/lib/proveedores";
import {
  FormularioProveedor,
  datosDe,
  type DatosDelFormulario,
} from "@/components/panel/proveedores/FormularioProveedor";
import {
  botonPrincipal,
  botonSecundario,
  campo,
  chip,
  chipActivo,
  chipPeligro,
  pesos,
  rotuloCampo,
} from "@/components/panel/proveedores/estilos";

const CONTRATO_MAX_BYTES = 10 * 1024 * 1024;

export interface AccionesDelProveedor {
  editar: (datos: DatosDelFormulario) => Promise<boolean>;
  cambiarEstado: (estado: EstadoDeProveedor) => Promise<boolean>;
  cambiarContratado: (monto: string) => Promise<boolean>;
  borrar: () => Promise<boolean>;
  crearPago: (datos: { concepto: string; monto: string; fecha: string; pagado: boolean }) => Promise<boolean>;
  marcarPagado: (pagoId: string, pagado: boolean) => Promise<boolean>;
  borrarPago: (pagoId: string) => Promise<boolean>;
  subirContrato: (archivo: File) => Promise<boolean>;
  quitarContrato: () => Promise<boolean>;
  /** Contestarle a la planner una cotización que les mandó (0041). */
  decidir: (decision: DecisionDeLaPareja, nota: string) => Promise<boolean>;
}

/**
 * Todo lo de un proveedor, abierto en su lugar: cómo contactarlo, en qué va,
 * su contrato y sus pagos. Lo de la pareja se edita aquí; lo de la planner se
 * ve y se le pide a ella por el chat.
 */
export function DetalleDelProveedor({
  proveedor: p,
  pagos,
  tiposSugeridos,
  soloLectura,
  trabajando,
  conContratos,
  isEnglish,
  acciones,
}: {
  proveedor: ProveedorDelPanel;
  /** Sólo los de este proveedor. */
  pagos: PagoDelPanel[];
  tiposSugeridos: readonly string[];
  soloLectura: boolean;
  trabajando: boolean;
  /** false = falta la 0040: no hay dónde guardar el contrato. */
  conContratos: boolean;
  isEnglish: boolean;
  acciones: AccionesDelProveedor;
}) {
  const [editando, setEditando] = useState(false);
  const [agregandoPago, setAgregandoPago] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const entradaArchivo = useRef<HTMLInputElement>(null);

  const editable = p.esDeLaPareja && !soloLectura;
  const cuentas = cuentasDe(p, pagos);
  const whatsapp = numeroDeWhatsApp(p.telefono);
  const conPartidas = p.contratadoEnPartidas != null;
  // En el orden en que pasan: por su fecha límite, o por el día en que se
  // pagaron si nunca tuvieron una (el anticipo que se anota ya pagado).
  const cuando = (x: PagoDelPanel) => x.fecha ?? x.pagadoEn?.slice(0, 10) ?? "9999-12-31";
  const ordenados = [...pagos].sort((a, b) => (cuando(a) < cuando(b) ? -1 : cuando(a) > cuando(b) ? 1 : 0));

  if (editando) {
    return (
      <div className="border-t border-linea px-4 py-4 sm:px-5">
        <FormularioProveedor
          inicial={datosDe(p, p.tipo)}
          tiposSugeridos={tiposSugeridos}
          trabajando={trabajando}
          isEnglish={isEnglish}
          textoGuardar={isEnglish ? "Save" : "Guardar"}
          onGuardar={async (datos) => {
            const ok = await acciones.editar(datos);
            if (ok) setEditando(false);
            return ok;
          }}
          onCancelar={() => setEditando(false)}
        />
      </div>
    );
  }

  const elegirArchivo = async (archivo: File | undefined) => {
    setAviso(null);
    if (!archivo) return;
    if (archivo.type !== "application/pdf") {
      setAviso(isEnglish ? "The contract has to be a PDF." : "El contrato tiene que ser un PDF.");
      return;
    }
    if (archivo.size > CONTRATO_MAX_BYTES) {
      setAviso(isEnglish ? "That PDF weighs more than 10 MB." : "Ese PDF pesa más de 10 MB.");
      return;
    }
    await acciones.subirContrato(archivo);
  };

  return (
    <div className="border-t border-linea px-4 py-4 sm:px-5">
      {/* Cómo hablarle: lo primero que se busca de un proveedor. */}
      {p.contacto || whatsapp || p.correo || p.enlace ? (
        <div className="flex flex-wrap items-center gap-2">
          {p.contacto ? <span className="mr-1 text-sm text-noche">{p.contacto}</span> : null}
          {whatsapp ? (
            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className={chip}>
              <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.8} />
              WhatsApp
            </a>
          ) : p.telefono ? (
            <span className="text-xs text-tinta">{p.telefono}</span>
          ) : null}
          {p.correo ? (
            <a href={`mailto:${p.correo}`} className={chip}>
              <Mail className="h-3.5 w-3.5" strokeWidth={1.8} />
              {p.correo}
            </a>
          ) : null}
          {p.enlace ? (
            <a href={p.enlace} target="_blank" rel="noopener noreferrer" className={chip}>
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} />
              {p.enlace.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "").slice(0, 32)}
            </a>
          ) : null}
        </div>
      ) : null}

      {/* Una cotización que les mandó su planner: lo primero que les toca. */}
      {!p.esDeLaPareja && p.enviadaEn && p.estado === "cotizando" ? (
        <RespuestaALaCotizacion
          proveedor={p}
          soloLectura={soloLectura}
          trabajando={trabajando}
          isEnglish={isEnglish}
          onDecidir={acciones.decidir}
        />
      ) : null}

      {/* En qué va */}
      {editable ? (
        <div className="mt-4 flex flex-wrap items-center gap-2" role="radiogroup" aria-label={isEnglish ? "Status" : "Estado"}>
          {(
            [
              ["cotizando", isEnglish ? "Getting quotes" : "Cotizando"],
              ["contratado", isEnglish ? "Booked" : "Contratado"],
              ["descartado", isEnglish ? "Dropped" : "Descartado"],
            ] as [EstadoDeProveedor, string][]
          ).map(([estado, texto]) => (
            <button
              key={estado}
              type="button"
              role="radio"
              aria-checked={p.estado === estado}
              disabled={trabajando}
              onClick={() => p.estado !== estado && void acciones.cambiarEstado(estado)}
              className={p.estado === estado ? chipActivo : chip}
            >
              {p.estado === estado ? <Check className="h-3.5 w-3.5" strokeWidth={2} /> : null}
              {texto}
            </button>
          ))}
        </div>
      ) : null}

      {/* Las cuentas */}
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        <Cifra etiqueta={isEnglish ? "Quote" : "Cotizó"} valor={p.cotizacion != null ? pesos(p.cotizacion) : "—"} />
        {editable && p.estado === "contratado" && !conPartidas ? (
          <CampoContratado
            valor={p.montoContratado}
            trabajando={trabajando}
            isEnglish={isEnglish}
            onGuardar={acciones.cambiarContratado}
          />
        ) : (
          <Cifra
            etiqueta={isEnglish ? "Booked for" : "Contratado"}
            valor={cuentas.contratado > 0 || p.estado === "contratado" ? pesos(cuentas.contratado) : "—"}
          />
        )}
        <Cifra etiqueta={isEnglish ? "Paid" : "Pagado"} valor={pesos(cuentas.pagado)} />
        <Cifra
          etiqueta={cuentas.porPagar < 0 ? (isEnglish ? "Overpaid" : "Pagado de más") : isEnglish ? "Left to pay" : "Por pagar"}
          valor={pesos(Math.abs(cuentas.porPagar))}
          fuerte={cuentas.porPagar > 0}
        />
      </div>

      {/* Los pagos */}
      <div className="mt-5">
        <h4 className={rotuloCampo}>{isEnglish ? "Payments" : "Pagos"}</h4>
        {pagos.length === 0 ? (
          <p className="mt-1 text-sm text-tinta">
            {editable
              ? isEnglish
                ? "No payments yet. Add the deposit and the rest with their due dates."
                : "Todavía sin pagos. Anoten el anticipo y lo que sigue, con su fecha."
              : isEnglish
                ? "No payments recorded."
                : "Sin pagos registrados."}
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-linea border-y border-linea">
            {ordenados.map((pago) => {
              const vencido = !pago.pagadoEn && pago.fecha != null && (daysUntil(pago.fecha) ?? 0) < 0;
              const puedeTocar = pago.esDeLaPareja && editable;
              return (
                <li key={pago.id} className="flex items-center gap-3 py-2">
                  <button
                    type="button"
                    disabled={!puedeTocar || trabajando}
                    onClick={() => void acciones.marcarPagado(pago.id, !pago.pagadoEn)}
                    aria-label={
                      pago.pagadoEn
                        ? isEnglish
                          ? `Mark ${pago.concepto} as not paid`
                          : `Marcar ${pago.concepto} como no pagado`
                        : isEnglish
                          ? `Mark ${pago.concepto} as paid`
                          : `Marcar ${pago.concepto} como pagado`
                    }
                    aria-pressed={Boolean(pago.pagadoEn)}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors duration-150 disabled:cursor-default ${
                      pago.pagadoEn ? "border-noche bg-noche text-niebla" : "border-linea-control bg-papel text-transparent"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={2.2} />
                  </button>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm ${pago.pagadoEn ? "text-tinta" : "text-noche"}`}>{pago.concepto}</span>
                    <span className={`block text-xs ${vencido ? "font-medium text-error" : "text-tinta"}`}>
                      {pago.pagadoEn
                        ? isEnglish
                          ? `Paid ${formatShortDate(pago.pagadoEn.slice(0, 10), true)}`
                          : `Pagado el ${formatShortDate(pago.pagadoEn.slice(0, 10), false)}`
                        : pago.fecha
                          ? vencido
                            ? isEnglish
                              ? `Overdue since ${formatShortDate(pago.fecha, true)}`
                              : `Vencido desde el ${formatShortDate(pago.fecha, false)}`
                            : isEnglish
                              ? `Due ${formatShortDate(pago.fecha, true)}`
                              : `Vence el ${formatShortDate(pago.fecha, false)}`
                          : isEnglish
                            ? "No date yet"
                            : "Sin fecha"}
                      {!pago.esDeLaPareja ? (isEnglish ? " · from your planner" : " · lo lleva su planner") : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm text-noche tabular-nums">{pesos(pago.monto)}</span>
                  {puedeTocar ? (
                    <button
                      type="button"
                      disabled={trabajando}
                      onClick={() => void acciones.borrarPago(pago.id)}
                      aria-label={isEnglish ? `Remove ${pago.concepto}` : `Quitar ${pago.concepto}`}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-tinta transition-colors hover:bg-error-fondo hover:text-error"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {editable ? (
          agregandoPago ? (
            <NuevoPago
              conceptoInicial={conceptoSugerido(pagos.length, isEnglish)}
              sugerido={cuentas.porPagar > 0 ? cuentas.porPagar - cuentas.programado : null}
              trabajando={trabajando}
              isEnglish={isEnglish}
              onGuardar={async (datos) => {
                const ok = await acciones.crearPago(datos);
                if (ok) setAgregandoPago(false);
                return ok;
              }}
              onCancelar={() => setAgregandoPago(false)}
            />
          ) : (
            <button type="button" onClick={() => setAgregandoPago(true)} className={`${chip} mt-3`}>
              <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
              {isEnglish ? "Add a payment" : "Agregar pago"}
            </button>
          )
        ) : null}
      </div>

      {/* La cotización en papel, cuando no está ya en el bloque de respuesta */}
      {p.cotizacionArchivo && !(!p.esDeLaPareja && p.enviadaEn && p.estado === "cotizando") ? (
        <div className="mt-5">
          <h4 className={rotuloCampo}>{isEnglish ? "Quote" : "Cotización"}</h4>
          <div className="mt-2">
            <LigaDeCotizacion proveedor={p} />
          </div>
        </div>
      ) : null}

      {/* El contrato */}
      {conContratos ? (
        <div className="mt-5">
          <h4 className={rotuloCampo}>{isEnglish ? "Contract" : "Contrato"}</h4>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {p.contrato ? (
              <a
                href={`/api/panel/proveedores/contrato?id=${p.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className={chip}
              >
                <FileText className="h-3.5 w-3.5" strokeWidth={1.8} />
                <span className="max-w-[16rem] truncate">{p.contrato.nombre}</span>
              </a>
            ) : (
              <span className="text-sm text-tinta">{isEnglish ? "Not uploaded yet." : "Todavía sin subir."}</span>
            )}
            {!soloLectura ? (
              <>
                <input
                  ref={entradaArchivo}
                  type="file"
                  accept="application/pdf"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                  onChange={(e) => {
                    void elegirArchivo(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <button type="button" disabled={trabajando} onClick={() => entradaArchivo.current?.click()} className={chip}>
                  <Upload className="h-3.5 w-3.5" strokeWidth={1.8} />
                  {p.contrato ? (isEnglish ? "Replace" : "Reemplazar") : isEnglish ? "Upload PDF" : "Subir PDF"}
                </button>
                {p.contrato ? (
                  <button
                    type="button"
                    disabled={trabajando}
                    onClick={() => void acciones.quitarContrato()}
                    aria-label={isEnglish ? "Remove the contract" : "Quitar el contrato"}
                    className={chipPeligro}
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                    {isEnglish ? "Remove" : "Quitar"}
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
          {aviso ? (
            <p role="alert" className="mt-2 text-sm text-error">
              {aviso}
            </p>
          ) : null}
        </div>
      ) : null}

      {p.notas ? (
        <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-tinta">{p.notas}</p>
      ) : null}

      {/* Quién lo lleva */}
      {!p.esDeLaPareja ? (
        <p className="mt-5 text-xs leading-relaxed text-tinta">
          {conPartidas
            ? isEnglish
              ? "Your planner handles this vendor, line by line. If something changed, let them know in the chat."
              : `A este proveedor lo lleva su planner, partida por partida. Si algo cambió, díganselo por el chat.`
            : isEnglish
              ? "Your planner handles this vendor. If something changed, let them know in the chat."
              : "A este proveedor lo lleva su planner. Si algo cambió, díganselo por el chat."}
        </p>
      ) : null}

      {editable ? (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-linea pt-4">
          <button type="button" onClick={() => setEditando(true)} className={chip}>
            {isEnglish ? "Edit details" : "Editar datos"}
          </button>
          {confirmarBorrado ? (
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-noche">
                {pagos.length > 0 || p.contrato
                  ? isEnglish
                    ? "Remove it with its payments and contract?"
                    : "¿Quitarlo con sus pagos y su contrato?"
                  : isEnglish
                    ? "Remove this vendor?"
                    : "¿Quitar a este proveedor?"}
              </span>
              <button
                type="button"
                disabled={trabajando}
                onClick={() => void acciones.borrar()}
                className="inline-flex min-h-[2.25rem] items-center gap-1.5 rounded-full bg-error px-4 py-1.5 text-xs font-medium text-niebla transition-[opacity,scale] duration-150 hover:opacity-90 active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                {isEnglish ? "Yes, remove" : "Sí, quitarlo"}
              </button>
              <button type="button" onClick={() => setConfirmarBorrado(false)} className={chip}>
                {isEnglish ? "Keep it" : "Dejarlo"}
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmarBorrado(true)} className={chipPeligro}>
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
              {isEnglish ? "Remove vendor" : "Quitar proveedor"}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function LigaDeCotizacion({ proveedor: p }: { proveedor: ProveedorDelPanel }) {
  if (!p.cotizacionArchivo) return null;
  return (
    <a
      href={`/api/panel/proveedores/contrato?id=${p.id}&doc=cotizacion`}
      target="_blank"
      rel="noopener noreferrer"
      className={chip}
    >
      <FileText className="h-3.5 w-3.5" strokeWidth={1.8} />
      <span className="max-w-[16rem] truncate">{p.cotizacionArchivo.nombre}</span>
    </a>
  );
}

/**
 * Lo que la planner les mandó para que decidan, y su respuesta. Contestar no
 * contrata: la planner cierra con el proveedor y lo marca en el admin. Pueden
 * cambiar de respuesta mientras ella no lo cierre.
 */
function RespuestaALaCotizacion({
  proveedor: p,
  soloLectura,
  trabajando,
  isEnglish,
  onDecidir,
}: {
  proveedor: ProveedorDelPanel;
  soloLectura: boolean;
  trabajando: boolean;
  isEnglish: boolean;
  onDecidir: (decision: DecisionDeLaPareja, nota: string) => Promise<boolean>;
}) {
  const [cambiando, setCambiando] = useState(false);
  const [nota, setNota] = useState(p.decision?.nota ?? "");
  const eligiendo = !soloLectura && (p.decision == null || cambiando);

  const decidir = async (decision: DecisionDeLaPareja) => {
    const ok = await onDecidir(decision, nota);
    if (ok) setCambiando(false);
  };

  return (
    <div className="mt-4 rounded-xl border border-linea bg-papel p-4">
      <p className="text-sm text-noche">
        {isEnglish ? "Your planner sent you this quote" : "Su planner les mandó esta cotización"}
        {p.enviadaEn ? (
          <span className="text-tinta">
            {" · "}
            {formatShortDate(p.enviadaEn.slice(0, 10), isEnglish)}
          </span>
        ) : null}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {p.cotizacion != null ? (
          <span className="mr-1 text-lg font-light text-noche tabular-nums">{pesos(p.cotizacion)}</span>
        ) : null}
        <LigaDeCotizacion proveedor={p} />
      </div>

      {p.decision && !cambiando ? (
        <div className="mt-3">
          <p className="flex items-center gap-1.5 text-sm font-medium text-noche">
            <Check className="h-4 w-4" strokeWidth={2} />
            {p.decision.tipo === "la_queremos"
              ? isEnglish
                ? "You told your planner you'll go with this one"
                : "Le dijeron a su planner que se quedan con este"
              : isEnglish
                ? "You told your planner it doesn't convince you"
                : "Le dijeron a su planner que no les convence"}
          </p>
          {p.decision.nota ? (
            <p className="mt-1 whitespace-pre-line text-sm text-tinta">«{p.decision.nota}»</p>
          ) : null}
          <p className="mt-1 text-xs leading-relaxed text-tinta">
            {p.decision.tipo === "la_queremos"
              ? isEnglish
                ? "Your planner confirms the booking with the vendor; it'll show up as booked here."
                : "Su planner confirma la contratación con el proveedor; aquí va a aparecer como contratado."
              : isEnglish
                ? "Your planner will look for other options."
                : "Su planner va a buscar otras opciones."}
          </p>
          {!soloLectura ? (
            <button type="button" onClick={() => setCambiando(true)} className={`${chip} mt-3`}>
              {isEnglish ? "Change answer" : "Cambiar respuesta"}
            </button>
          ) : null}
        </div>
      ) : null}

      {eligiendo ? (
        <div className="mt-3">
          <label className="block">
            <span className={rotuloCampo}>{isEnglish ? "Anything to tell your planner? (optional)" : "¿Algo que quieran decirle? (opcional)"}</span>
            <textarea
              rows={2}
              maxLength={NOTA_DECISION_MAX}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder={isEnglish ? "e.g. We'd like the 8-hour package" : "p. ej. Nos gustaría el paquete de 8 horas"}
              className={`${campo} mt-1 resize-y`}
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={trabajando} onClick={() => void decidir("la_queremos")} className={botonPrincipal}>
              {isEnglish ? "We'll go with this one" : "Nos quedamos con este"}
            </button>
            <button type="button" disabled={trabajando} onClick={() => void decidir("no_nos_convence")} className={botonSecundario}>
              {isEnglish ? "Not convinced" : "No nos convence"}
            </button>
            {cambiando ? (
              <button type="button" onClick={() => setCambiando(false)} className={chip}>
                {isEnglish ? "Cancel" : "Cancelar"}
              </button>
            ) : null}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-tinta">
            {isEnglish
              ? "Answering doesn't book anyone: your planner confirms with the vendor."
              : "Contestar no contrata a nadie: su planner confirma con el proveedor."}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Cifra({ etiqueta, valor, fuerte = false }: { etiqueta: string; valor: string; fuerte?: boolean }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.08em] text-tinta">{etiqueta}</p>
      <p className={`mt-0.5 text-base tabular-nums ${fuerte ? "font-medium text-noche" : "text-noche"}`}>{valor}</p>
    </div>
  );
}

/** Lo contratado se escribe en su lugar y se guarda al salir del campo. */
function CampoContratado({
  valor,
  trabajando,
  isEnglish,
  onGuardar,
}: {
  valor: number | null;
  trabajando: boolean;
  isEnglish: boolean;
  onGuardar: (monto: string) => Promise<boolean>;
}) {
  const [texto, setTexto] = useState(valor != null ? valor.toLocaleString("es-MX", { maximumFractionDigits: 2 }) : "");
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.08em] text-tinta">{isEnglish ? "Booked for" : "Contratado"}</span>
      <input
        type="text"
        inputMode="decimal"
        value={texto}
        disabled={trabajando}
        placeholder="$0"
        onChange={(e) => setTexto(e.target.value)}
        onBlur={() => {
          const limpio = texto.replace(/[$,\s]/g, "");
          if (limpio !== (valor != null ? String(valor) : "")) void onGuardar(limpio);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="mt-0.5 w-full rounded-lg border border-linea-control/70 bg-papel px-2 py-1 text-base text-noche tabular-nums outline-none transition-[border-color] duration-150 focus:border-noche"
      />
    </label>
  );
}

function NuevoPago({
  conceptoInicial,
  sugerido,
  trabajando,
  isEnglish,
  onGuardar,
  onCancelar,
}: {
  conceptoInicial: string;
  /** Lo que falta sin fecha: un buen punto de partida para el monto. */
  sugerido: number | null;
  trabajando: boolean;
  isEnglish: boolean;
  onGuardar: (datos: { concepto: string; monto: string; fecha: string; pagado: boolean }) => Promise<boolean>;
  onCancelar: () => void;
}) {
  const [concepto, setConcepto] = useState(conceptoInicial);
  const [monto, setMonto] = useState(sugerido != null && sugerido > 0 ? String(sugerido) : "");
  const [fecha, setFecha] = useState("");
  const [pagado, setPagado] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    await onGuardar({ concepto, monto, fecha, pagado });
  };

  return (
    <form onSubmit={enviar} className="mt-3 grid gap-3 rounded-xl border border-linea bg-papel p-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <label className="block min-w-0">
        <span className={rotuloCampo}>{isEnglish ? "What for" : "Qué es"}</span>
        <input type="text" required maxLength={120} value={concepto} onChange={(e) => setConcepto(e.target.value)} className={`${campo} mt-1`} />
      </label>
      <label className="block min-w-0">
        <span className={rotuloCampo}>{isEnglish ? "Amount ($)" : "Monto ($)"}</span>
        <input
          type="text"
          required
          inputMode="decimal"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          className={`${campo} mt-1 tabular-nums`}
        />
      </label>
      <label className="block min-w-0">
        <span className={rotuloCampo}>{isEnglish ? "Due date" : "Fecha límite"}</span>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={`${campo} mt-1`} />
      </label>
      <label className="flex items-center gap-2 text-sm text-noche sm:col-span-3">
        <input type="checkbox" checked={pagado} onChange={(e) => setPagado(e.target.checked)} className="h-4 w-4 accent-[var(--noche)]" />
        {isEnglish ? "Already paid" : "Ya está pagado"}
      </label>
      <div className="flex flex-wrap gap-2 sm:col-span-3">
        <button type="submit" disabled={trabajando || !concepto.trim() || !monto.trim()} className={botonPrincipal}>
          {isEnglish ? "Save payment" : "Guardar pago"}
        </button>
        <button type="button" onClick={onCancelar} className={botonSecundario}>
          {isEnglish ? "Cancel" : "Cancelar"}
        </button>
      </div>
    </form>
  );
}
