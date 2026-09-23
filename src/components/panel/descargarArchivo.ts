import type { TipoDeArchivo } from "@/lib/archivosProveedores";

/**
 * Baja un Excel de /api/panel/archivos/{tipo}.
 *
 * Con fetch y no con un <a download>: si el servidor contesta con error, un
 * enlace directo dejaba al navegador con una descarga fallida sin decir por
 * qué. Así el error sale junto al botón, con el texto que mandó el servidor.
 */
export async function descargarArchivo(tipo: TipoDeArchivo): Promise<void> {
  const res = await fetch(`/api/panel/archivos/${tipo}`, { cache: "no-store" });
  if (!res.ok) {
    let mensaje = "No pudimos armar el archivo. Inténtenlo otra vez.";
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) mensaje = data.error;
    } catch {
      // Sin cuerpo JSON: se queda el mensaje de siempre.
    }
    throw new Error(mensaje);
  }

  const disposicion = res.headers.get("Content-Disposition") ?? "";
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposicion);
  const ascii = /filename="([^"]+)"/i.exec(disposicion);
  const nombre = utf8 ? decodeURIComponent(utf8[1]) : ascii ? ascii[1] : `${tipo}.xlsx`;

  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Safari necesita que la URL siga viva un momento después del clic.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
