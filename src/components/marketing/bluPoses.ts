/*
 * Las poses de Blu y sus medidas en public/blu/azul/ (para que next/image reserve
 * el espacio y la página no brinque al cargar). Los PNG originales de 1024px
 * y el script que los generó viven en «BlueBook Full/outputs/blu/».
 */
export const DIMENSIONES_DE_BLU = {
  hero: { w: 970, h: 1000 },
  avatar: { w: 256, h: 256 },
  cuerpo: { w: 371, h: 1100 },
  checklist: { w: 576, h: 760 },
  presupuesto: { w: 636, h: 760 },
  proveedores: { w: 515, h: 760 },
  invitados: { w: 571, h: 760 },
  celebra: { w: 602, h: 760 },
  album: { w: 537, h: 760 },
  pestanas: { w: 747, h: 760 },
  cafe: { w: 450, h: 760 },
} as const;

export type PoseDeBlu = keyof typeof DIMENSIONES_DE_BLU;
