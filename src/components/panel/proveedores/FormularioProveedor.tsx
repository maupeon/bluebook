"use client";

import { useState, type FormEvent } from "react";
import { TIPOS, type ProveedorDelPanel } from "@/lib/proveedores";
import { botonPrincipal, botonSecundario, campo, rotuloCampo } from "@/components/panel/proveedores/estilos";

export interface DatosDelFormulario {
  nombre: string;
  tipo: string;
  contacto: string;
  telefono: string;
  correo: string;
  enlace: string;
  cotizacion: string;
  notas: string;
}

export function datosDe(p: ProveedorDelPanel | null, tipo: string): DatosDelFormulario {
  return {
    nombre: p?.nombre ?? "",
    tipo: p?.tipo ?? tipo,
    contacto: p?.contacto ?? "",
    telefono: p?.telefono ?? "",
    correo: p?.correo ?? "",
    enlace: p?.enlace ?? "",
    cotizacion: p?.cotizacion != null ? String(p.cotizacion) : "",
    notas: p?.notas ?? "",
  };
}

/**
 * Alta y edición de un proveedor. Sólo el nombre es obligatorio: a un
 * proveedor se le anota desde la primera llamada, cuando todavía no hay
 * cotización ni contacto completo.
 */
export function FormularioProveedor({
  inicial,
  tiposSugeridos,
  trabajando,
  isEnglish,
  textoGuardar,
  onGuardar,
  onCancelar,
}: {
  inicial: DatosDelFormulario;
  /** Los tipos de la categoría donde se abrió: van primero en la lista. */
  tiposSugeridos: readonly string[];
  trabajando: boolean;
  isEnglish: boolean;
  textoGuardar: string;
  /** Resuelve true si se guardó: entonces el formulario se cierra. */
  onGuardar: (datos: DatosDelFormulario) => Promise<boolean>;
  onCancelar: () => void;
}) {
  const [datos, setDatos] = useState(inicial);
  const cambia = (campoNombre: keyof DatosDelFormulario) => (valor: string) =>
    setDatos((d) => ({ ...d, [campoNombre]: valor }));

  const primero = TIPOS.filter((t) => tiposSugeridos.includes(t.clave));
  const resto = TIPOS.filter((t) => !tiposSugeridos.includes(t.clave));
  // Un proveedor de la planner puede traer una categoría que el panel no
  // ofrece; aquí sólo se editan los de la pareja, que siempre traen una suya.
  const conocida = TIPOS.some((t) => t.clave === datos.tipo);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!datos.nombre.trim()) return;
    await onGuardar(datos);
  };

  const texto = (
    nombre: keyof DatosDelFormulario,
    etiqueta: string,
    props: { type?: string; inputMode?: "text" | "tel" | "email" | "url" | "decimal"; placeholder?: string; autoComplete?: string } = {}
  ) => (
    <label className="block min-w-0">
      <span className={rotuloCampo}>{etiqueta}</span>
      <input
        type={props.type ?? "text"}
        inputMode={props.inputMode}
        placeholder={props.placeholder}
        autoComplete={props.autoComplete ?? "off"}
        value={datos[nombre]}
        onChange={(e) => cambia(nombre)(e.target.value)}
        className={`${campo} mt-1`}
      />
    </label>
  );

  return (
    <form onSubmit={enviar} className="grid gap-3 sm:grid-cols-2">
      <label className="block min-w-0 sm:col-span-2">
        <span className={rotuloCampo}>{isEnglish ? "Name" : "Nombre"}</span>
        <input
          type="text"
          required
          maxLength={80}
          value={datos.nombre}
          onChange={(e) => cambia("nombre")(e.target.value)}
          placeholder={isEnglish ? "e.g. Foto Luz Studio" : "p. ej. Foto Luz Estudio"}
          className={`${campo} mt-1`}
        />
      </label>
      <label className="block min-w-0">
        <span className={rotuloCampo}>{isEnglish ? "What they do" : "Qué hace"}</span>
        <select value={datos.tipo} onChange={(e) => cambia("tipo")(e.target.value)} className={`${campo} mt-1 cursor-pointer`}>
          {!conocida ? <option value={datos.tipo}>{datos.tipo}</option> : null}
          {primero.map((t) => (
            <option key={t.clave} value={t.clave}>
              {isEnglish ? t.en : t.es}
            </option>
          ))}
          {primero.length > 0 ? <option disabled>──────────</option> : null}
          {resto.map((t) => (
            <option key={t.clave} value={t.clave}>
              {isEnglish ? t.en : t.es}
            </option>
          ))}
        </select>
      </label>
      {texto("cotizacion", isEnglish ? "Their quote ($)" : "Lo que cotizó ($)", { inputMode: "decimal", placeholder: "0" })}
      {texto("contacto", isEnglish ? "Contact person" : "Con quién hablan")}
      {texto("telefono", "WhatsApp", { type: "tel", inputMode: "tel", placeholder: "55 1234 5678" })}
      {texto("correo", isEnglish ? "Email" : "Correo", { type: "email", inputMode: "email" })}
      {texto("enlace", isEnglish ? "Website or Instagram" : "Página o Instagram", { inputMode: "url", placeholder: "@fotoluz" })}
      <label className="block min-w-0 sm:col-span-2">
        <span className={rotuloCampo}>{isEnglish ? "Notes" : "Notas"}</span>
        <textarea
          rows={2}
          maxLength={1000}
          value={datos.notas}
          onChange={(e) => cambia("notas")(e.target.value)}
          placeholder={isEnglish ? "What's included, what you liked…" : "Qué incluye, qué les gustó…"}
          className={`${campo} mt-1 resize-y`}
        />
      </label>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button type="submit" disabled={trabajando || !datos.nombre.trim()} className={botonPrincipal}>
          {textoGuardar}
        </button>
        <button type="button" onClick={onCancelar} className={botonSecundario}>
          {isEnglish ? "Cancel" : "Cancelar"}
        </button>
      </div>
    </form>
  );
}
