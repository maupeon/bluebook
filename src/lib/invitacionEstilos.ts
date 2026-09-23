/**
 * Los estilos propuestos para generar la invitación con IA.
 *
 * Cada uno es una dirección de arte cerrada: paleta, papel, tipografía y
 * ornamento. La pareja elige uno y, si quiere, añade un detalle suyo ("con
 * flores de cempasúchil"). Estilos cerrados y no un campo libre porque un
 * prompt libre da resultados muy desiguales, y porque el texto de la
 * invitación (nombres, fecha, lugar) lo fija el servidor, no la pareja.
 *
 * `direccion` va en inglés a propósito: el modelo sigue mejor la dirección de
 * arte en inglés. El TEXTO que se imprime en la invitación va siempre en
 * español y entre comillas (ver invitaciones.ts).
 *
 * Pura: la usan la pantalla (nombres, descripción, muestras de color) y el
 * servidor (la dirección de arte).
 */
export interface EstiloDeInvitacion {
  id: string;
  nombre: { es: string; en: string };
  descripcion: { es: string; en: string };
  /** Tres colores para la muestra en la pantalla. No van al modelo. */
  muestra: [string, string, string];
  direccion: string;
}

export const ESTILOS_DE_INVITACION: EstiloDeInvitacion[] = [
  {
    id: "clasica",
    nombre: { es: "Clásica y elegante", en: "Classic and elegant" },
    descripcion: {
      es: "Papel marfil, letras en dorado y un marco fino.",
      en: "Ivory paper, gold lettering and a fine frame.",
    },
    muestra: ["#f7f1e3", "#b8964a", "#2b2b2b"],
    direccion:
      "Classic, elegant stationery. Warm ivory textured cardstock, a thin double gold-foil border, delicate engraved-style floral corner ornaments. Couple names in a refined high-contrast serif with a graceful calligraphic ampersand; other lines in small-caps serif. Palette: ivory, antique gold, soft charcoal. Symmetrical, centered, timeless.",
  },
  {
    id: "jardin",
    nombre: { es: "Jardín botánico", en: "Botanical garden" },
    descripcion: {
      es: "Acuarela de eucalipto y olivo en verdes suaves.",
      en: "Watercolor eucalyptus and olive in soft greens.",
    },
    muestra: ["#f5f3ec", "#8fa58a", "#4d5b46"],
    direccion:
      "Botanical garden wedding. Loose watercolor greenery (eucalyptus, olive branches, soft white garden roses) framing the top and bottom edges, lots of breathing room in the center. Couple names in an elegant modern script; details in a light serif. Palette: sage green, cream, muted olive, touches of blush. Airy, fresh, natural.",
  },
  {
    id: "boho",
    nombre: { es: "Boho", en: "Boho" },
    descripcion: {
      es: "Pampas, flores secas y tonos terracota.",
      en: "Pampas grass, dried flowers and terracotta tones.",
    },
    muestra: ["#f3e7dc", "#c07a5a", "#8a6a55"],
    direccion:
      "Bohemian wedding. A soft arch shape in terracotta behind the text, dried flowers and pampas grass arrangements in the corners, subtle paper grain. Couple names in a relaxed handwritten script; details in a clean rounded serif. Palette: terracotta, dusty rose, sand, warm beige. Warm, earthy, romantic.",
  },
  {
    id: "playa",
    nombre: { es: "Playa", en: "Beach" },
    descripcion: {
      es: "Arena, mar en acuarela y hojas de palma.",
      en: "Sand, watercolor sea and palm leaves.",
    },
    muestra: ["#f6efe3", "#8fbfd0", "#3e6f86"],
    direccion:
      "Beach destination wedding. Soft watercolor of a calm sea horizon at the bottom, a few delicate palm leaf shadows at the top corners, sand-colored textured background. Couple names in a flowing script; details in a light serif. Palette: sand, seafoam, soft ocean blue, white. Serene, luminous, tropical but refined.",
  },
  {
    id: "mexicana",
    nombre: { es: "Mexicana", en: "Mexican" },
    descripcion: {
      es: "Talavera azul, bugambilias y papel picado.",
      en: "Blue talavera, bougainvillea and papel picado.",
    },
    muestra: ["#fbf7ef", "#2f5fa7", "#c2447a"],
    direccion:
      "Elegant Mexican hacienda wedding. A tasteful border inspired by blue-and-white Talavera tile patterns, a few bougainvillea branches in magenta, a subtle strip of papel picado at the very top. Clean off-white center for the text. Couple names in a classic serif; details in small caps. Palette: cobalt blue, white, magenta, touches of marigold. Festive but sophisticated, not cartoonish.",
  },
  {
    id: "minimalista",
    nombre: { es: "Minimalista", en: "Minimalist" },
    descripcion: {
      es: "Mucho blanco, tipografía moderna y un solo trazo.",
      en: "Lots of white, modern type and a single line.",
    },
    muestra: ["#ffffff", "#d9d4cc", "#1d1d1d"],
    direccion:
      "Modern minimalist wedding stationery. Pure white background, generous margins, a single continuous line-art drawing of two intertwined flowers as the only ornament. Couple names large in a contemporary high-contrast serif; details in a small, widely tracked sans-serif. Palette: white, warm grey, black. Quiet, editorial, sophisticated.",
  },
];

export function estiloPorId(id: string): EstiloDeInvitacion | null {
  return ESTILOS_DE_INVITACION.find((e) => e.id === id) ?? null;
}
