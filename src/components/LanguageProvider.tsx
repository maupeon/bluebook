"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LANGUAGE_COOKIE, Language } from "@/lib/language";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  isEnglish: boolean;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  initialLanguage,
  children,
}: {
  initialLanguage: Language;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    document.cookie = `${LANGUAGE_COOKIE}=${nextLanguage}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [router]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      isEnglish: language === "en",
    }),
    [language, setLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return context;
}
