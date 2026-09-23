import type { ClaveReceta } from "@/lib/barra";

/**
 * PRECIOS DE REFERENCIA, NO DE COMPRA.
 *
 * No hay una API de precios de las tiendas de México: esto es una lista
 * consultada a mano en sus páginas públicas, con fecha, tienda y liga, para
 * que la pareja tenga un punto de partida y lo cambie por la cotización que
 * de verdad le den. El precio cambia cada semana y varía por tienda; por eso
 * cada uno lleva de dónde salió y la pantalla nunca lo presenta como el
 * precio "real".
 *
 * Para las coronitas el precio es POR CARTÓN DE 24, que es la unidad del
 * renglón.
 *
 * CÓMO SE ESCOGIÓ CADA PRECIO (consulta del 23-sep-2026, leyendo los datos de
 * producto de cada tienda, que son los mismos que enseña su página):
 * - Primero las tiendas de vinos y licores: La Europea, luego Bodegas
 *   Alianza o Vinoteca; el súper (Chedraui) o Costco sólo cuando ellas no lo
 *   tienen.
 * - El precio NORMAL, no el de promoción: las promociones mueven el rango
 *   muchísimo (Chivas 12 iba de $464 a $909.50 el mismo día) y un
 *   presupuesto armado con la oferta de esta semana se queda corto.
 * - La presentación real de cada botella. Conviven 700, 750, 950, 980 ml y
 *   1 L, y varias marcas bajaron de 750 a 700 ml; no se asume ninguna.
 * - Walmart, Sam's y Soriana no se pudieron leer (piden verificación de
 *   robot o contestan 403): no están.
 * - Las cajas de Concha y Toro Selección son de 6 en Costco; aquí va el
 *   precio por botella (729 / 6).
 */
export interface PrecioDeReferencia {
  clave: ClaveReceta;
  marca: string;
  ml: number;
  /** MXN por unidad del renglón: botella, o cartón de 24 en las coronitas. */
  precio: number;
  tienda: string;
  url: string;
}

export const PRECIOS_CONSULTADOS = "2026-09-23";

// En orden de precio dentro de cada bebida: así salen en el selector.
export const PRECIOS: PrecioDeReferencia[] = [
  { clave: "coronitas", marca: "Coronita Extra, 24 piezas", ml: 210, precio: 279, tienda: "Chedraui", url: "https://www.chedraui.com.mx/cervezas-coronita-losse-con-24-piezas-de-210ml-3816453/p" },
  { clave: "coronitas", marca: "Coronita Extra, 24 sueltas", ml: 210, precio: 336, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000000415" },
  { clave: "tequila", marca: "El Jimador Reposado", ml: 700, precio: 295, tienda: "Bodegas Alianza", url: "https://www.bodegasalianza.com/tequila-el-jimador-rep-nva-pres-14701/p" },
  { clave: "tequila", marca: "Cazadores Reposado", ml: 950, precio: 409, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000015343" },
  { clave: "tequila", marca: "1800 Reposado", ml: 700, precio: 610, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000001217" },
  { clave: "tequila", marca: "Herradura Reposado", ml: 700, precio: 720, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000001279" },
  { clave: "tequila", marca: "Don Julio 70 Añejo Cristalino", ml: 700, precio: 1099, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000014301" },
  { clave: "tinto", marca: "Concha y Toro Selección (caja de 6)", ml: 750, precio: 121.5, tienda: "Costco", url: "https://www.costco.com.mx/Vinos/Vinos/Cajas-de-Vino/Seleccion-Concha-y-Toro-Vino-Tinto-6750-ml/p/519238" },
  { clave: "tinto", marca: "L.A. Cetto Cabernet Sauvignon", ml: 750, precio: 190.76, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000001967" },
  { clave: "tinto", marca: "Casillero del Diablo Cabernet Sauvignon", ml: 750, precio: 256, tienda: "Vinoteca", url: "https://www.vinoteca.com/vino-tinto-casillero-del-diablo-cab-sauv-750-ml/p" },
  { clave: "tinto", marca: "Sangre de Toro", ml: 750, precio: 300, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000010181" },
  { clave: "tinto", marca: "Santo Tomás Tempranillo", ml: 750, precio: 468.35, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000002322" },
  { clave: "tinto", marca: "Casa Madero 3V", ml: 750, precio: 515, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000000455" },
  { clave: "tinto", marca: "Monte Xanic Cabernet Sauvignon", ml: 750, precio: 750, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000001982" },
  { clave: "tinto", marca: "Marqués de Riscal Reserva", ml: 750, precio: 840, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000002182" },
  { clave: "blanco", marca: "Concha y Toro Selección Blanco (caja de 6)", ml: 750, precio: 121.5, tienda: "Costco", url: "https://www.costco.com.mx/Vinos/Vinos/Cajas-de-Vino/Seleccion-Concha-y-Toro-Vino-Blanco-6750-ml/p/519239" },
  { clave: "blanco", marca: "L.A. Cetto Chenin Blanc", ml: 750, precio: 183.42, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000001575" },
  { clave: "blanco", marca: "Santo Tomás Misión", ml: 750, precio: 185, tienda: "Chedraui", url: "https://www.chedraui.com.mx/vino-blanco-mexicano-mision-santo-tomas-750ml-3296215/p" },
  { clave: "blanco", marca: "Casillero del Diablo Chardonnay", ml: 750, precio: 259, tienda: "Chedraui", url: "https://www.chedraui.com.mx/vino-blanco-chileno-casillero-del-diablo-chardonnay-750ml-3063485/p" },
  { clave: "blanco", marca: "Casa Madero Chardonnay", ml: 750, precio: 375, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000001528" },
  { clave: "blanco", marca: "Marqués de Riscal Rueda", ml: 750, precio: 389, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000001607" },
  { clave: "blanco", marca: "Monte Xanic Chenin Colombard", ml: 750, precio: 399, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000001576" },
  { clave: "blanco", marca: "Monte Xanic Viña Kristel", ml: 750, precio: 525, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000001679" },
  { clave: "whisky", marca: "Black & White", ml: 700, precio: 269, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000011663" },
  { clave: "whisky", marca: "Johnnie Walker Red Label", ml: 700, precio: 403, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000009855" },
  { clave: "whisky", marca: "Chivas Regal 12 años", ml: 750, precio: 909.5, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000002605" },
  { clave: "whisky", marca: "Buchanan's 12 años", ml: 750, precio: 945, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000002603" },
  { clave: "whisky", marca: "Johnnie Walker Black Label", ml: 750, precio: 1131, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000002629" },
  { clave: "ron", marca: "Havana Club Añejo Especial", ml: 700, precio: 289.5, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000014172" },
  { clave: "ron", marca: "Matusalem Platino", ml: 750, precio: 310, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000001062" },
  { clave: "ron", marca: "Bacardí Carta Blanca", ml: 980, precio: 345, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000001017" },
  { clave: "ron", marca: "Havana Club 7 años", ml: 700, precio: 487, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000013795" },
  { clave: "ron", marca: "Zacapa 23", ml: 750, precio: 1397, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000000506" },
  { clave: "mezcal", marca: "Unión Uno Joven", ml: 700, precio: 558, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000006789" },
  { clave: "mezcal", marca: "400 Conejos Joven", ml: 700, precio: 570, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000027583" },
  { clave: "mezcal", marca: "Montelobos Espadín", ml: 750, precio: 689, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000007067" },
  { clave: "vodka", marca: "Smirnoff No. 21", ml: 750, precio: 225, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000002525" },
  { clave: "vodka", marca: "Absolut Azul", ml: 750, precio: 351, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000002497" },
  { clave: "vodka", marca: "Stolichnaya Premium", ml: 750, precio: 419, tienda: "Chedraui", url: "https://www.chedraui.com.mx/vodka-stolichnaya-premium-750-ml-3002051/p" },
  { clave: "vodka", marca: "Grey Goose", ml: 700, precio: 939, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000026455" },
  { clave: "ginebra", marca: "Larios London Dry", ml: 700, precio: 321, tienda: "Chedraui", url: "https://www.chedraui.com.mx/ginebra-larios-dry-700ml-3429501/p" },
  { clave: "ginebra", marca: "Beefeater London Dry", ml: 750, precio: 558.5, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000000510" },
  { clave: "ginebra", marca: "Tanqueray London Dry", ml: 750, precio: 596, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000000517" },
  { clave: "ginebra", marca: "Bombay Sapphire", ml: 750, precio: 609, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000000512" },
  { clave: "ginebra", marca: "Hendrick's", ml: 750, precio: 989, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000004797" },
  { clave: "licor43", marca: "Licor 43 Original", ml: 700, precio: 528.54, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000017692" },
  { clave: "brandy", marca: "Presidente Clásico", ml: 700, precio: 131, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000002801" },
  { clave: "brandy", marca: "Don Pedro Reserva Especial", ml: 1000, precio: 220, tienda: "Bodegas Alianza", url: "https://www.bodegasalianza.com/bandy-don-pedro-reserva-especial-1-l/p" },
  { clave: "brandy", marca: "Fundador Sherry Cask", ml: 700, precio: 250, tienda: "Bodegas Alianza", url: "https://www.bodegasalianza.com/brandy-fundador-sherry-cask-700-ml-35503/p" },
  { clave: "brandy", marca: "Torres 10", ml: 700, precio: 399, tienda: "La Europea", url: "https://laeuropea.com.mx/products/10000000243" },
];

export function preciosDe(clave: ClaveReceta): PrecioDeReferencia[] {
  return PRECIOS.filter((p) => p.clave === clave);
}

/** La referencia que corresponde a lo que eligió la pareja, si es del catálogo. */
export function referenciaDe(
  clave: ClaveReceta | null,
  marca: string,
  ml: number | null
): PrecioDeReferencia | null {
  if (!clave || !marca) return null;
  return PRECIOS.find((p) => p.clave === clave && p.marca === marca && (ml == null || p.ml === ml)) ?? null;
}
