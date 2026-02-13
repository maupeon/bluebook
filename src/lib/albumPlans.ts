import type { Language } from "@/lib/language";

export const UNLIMITED_PHOTO_LIMIT = 999999;

export type AlbumPlanId = 'album_50' | 'album_200' | 'album_unlimited';

export type AlbumPlan = {
  id: AlbumPlanId;
  name: string;
  subtitle: string;
  description: string;
  features: string[];
  priceMx: number;
  priceCents: number;
  maxPhotos: number;
  maxPhotosLabel: string;
  featured?: boolean;
  badge?: string;
  templateAccess: 'classic' | 'three' | 'all';
};

export const ALBUM_PLAN_ORDER: AlbumPlanId[] = [
  'album_50',
  'album_200',
  'album_unlimited',
];

export const ALBUM_PLANS: Record<AlbumPlanId, AlbumPlan> = {
  album_50: {
    id: 'album_50',
    name: 'Plan 50',
    subtitle: 'Para eventos íntimos',
    description: 'Hasta 50 fotos, flipbook y QR para que invitados suban fotos.',
    features: [
      'Hasta 50 fotos',
      'Flipbook interactivo',
      'QR para invitados',
      'Link compartible',
      'Acceso de por vida',
    ],
    priceMx: 200,
    priceCents: 20000,
    maxPhotos: 50,
    maxPhotosLabel: '50 fotos',
    templateAccess: 'classic',
  },
  album_200: {
    id: 'album_200',
    name: 'Plan 200',
    subtitle: 'El más elegido',
    description: 'Hasta 200 fotos, más estilos y QR para compartir durante el evento.',
    features: [
      'Hasta 200 fotos',
      '3 estilos de álbum',
      'QR para invitados',
      'Panel para ordenar fotos',
      'Acceso de por vida',
    ],
    priceMx: 500,
    priceCents: 50000,
    maxPhotos: 200,
    maxPhotosLabel: '200 fotos',
    featured: true,
    badge: 'Más popular',
    templateAccess: 'three',
  },
  album_unlimited: {
    id: 'album_unlimited',
    name: 'Plan Ilimitado',
    subtitle: 'Cobertura total',
    description: 'Fotos ilimitadas, todas las plantillas y flujo QR completo.',
    features: [
      'Fotos ilimitadas',
      'Todas las plantillas',
      'QR para invitados',
      'Control total del álbum',
      'Acceso de por vida',
    ],
    priceMx: 2000,
    priceCents: 200000,
    maxPhotos: UNLIMITED_PHOTO_LIMIT,
    maxPhotosLabel: 'Ilimitadas',
    templateAccess: 'all',
  },
};

export const ALBUM_PLANS_LIST: AlbumPlan[] = ALBUM_PLAN_ORDER.map(
  (planId) => ALBUM_PLANS[planId]
);

const PLAN_TRANSLATIONS_EN: Record<AlbumPlanId, Pick<AlbumPlan, "name" | "subtitle" | "description" | "features" | "maxPhotosLabel" | "badge">> = {
  album_50: {
    name: "Plan 50",
    subtitle: "For intimate events",
    description: "Up to 50 photos, interactive flipbook, and QR for guest uploads.",
    features: [
      "Up to 50 photos",
      "Interactive flipbook",
      "QR for guests",
      "Shareable link",
      "Lifetime access",
    ],
    maxPhotosLabel: "50 photos",
    badge: undefined,
  },
  album_200: {
    name: "Plan 200",
    subtitle: "Most popular",
    description: "Up to 200 photos, more styles, and QR sharing during your event.",
    features: [
      "Up to 200 photos",
      "3 album styles",
      "QR for guests",
      "Photo ordering panel",
      "Lifetime access",
    ],
    maxPhotosLabel: "200 photos",
    badge: "Most popular",
  },
  album_unlimited: {
    name: "Unlimited Plan",
    subtitle: "Full coverage",
    description: "Unlimited photos, all templates, and full QR flow.",
    features: [
      "Unlimited photos",
      "All templates",
      "QR for guests",
      "Full album control",
      "Lifetime access",
    ],
    maxPhotosLabel: "Unlimited",
    badge: undefined,
  },
};

export const getLocalizedAlbumPlans = (language: Language): AlbumPlan[] => {
  if (language === "es") {
    return ALBUM_PLANS_LIST;
  }

  return ALBUM_PLAN_ORDER.map((planId) => ({
    ...ALBUM_PLANS[planId],
    ...PLAN_TRANSLATIONS_EN[planId],
  }));
};

export const getAlbumPlan = (planId: string): AlbumPlan | null => {
  if (planId in ALBUM_PLANS) {
    return ALBUM_PLANS[planId as AlbumPlanId];
  }

  return null;
};

export const isUnlimitedPhotosPlan = (maxPhotos: number): boolean =>
  maxPhotos >= UNLIMITED_PHOTO_LIMIT;
