export type Language = "es" | "en";

export const LANGUAGE_COOKIE = "bb_lang";

export const CONTACT_INFO = {
  instagramUrl: "https://www.instagram.com/bluebook.mx/",
  instagramHandle: "bluebook.mx",
  whatsappDisplay: "+52 442 202 9374",
  whatsappNumber: "+524422029374",
  whatsappUrl: "https://wa.me/524422029374",
  email: "majomer9@gmail.com",
  cityEs: "Ciudad de Mexico, Mexico",
  cityEn: "Mexico City, Mexico",
} as const;

export function parseLanguage(value?: string | null): Language {
  return value === "en" ? "en" : "es";
}

export function getLanguageName(language: Language) {
  return language === "en" ? "English" : "Espanol";
}
