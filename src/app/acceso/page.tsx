import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCoupleWeddingByEmail } from "@/lib/couplePanel";
import { cookies } from "next/headers";
import { LoginForm } from "@/components/panel/LoginForm";
import { AvisoSimplificado } from "@/components/legal/AvisoSimplificado";
import { LANGUAGE_COOKIE, parseLanguage } from "@/lib/language";
import { rutaInterna } from "@/lib/rutaInterna";

export const metadata: Metadata = {
  title: "Acceso",
  robots: { index: false, follow: false },
};

export default async function AccesoPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const isEnglish = parseLanguage((await cookies()).get(LANGUAGE_COOKIE)?.value) === "en";
  const next = rutaInterna(params.next);

  // Si ya hay sesión Y la boda coincide, entrar directo al panel.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email) {
    const wedding = await getCoupleWeddingByEmail(user.email);
    if (wedding) {
      redirect(next || "/panel");
    }
  }

  return (
    // Papel azul plano. Antes flotaba una mancha desenfocada detrás de la hoja:
    // era un degradado con otro nombre, y la marca no los usa.
    <div className="fixed inset-0 z-[55] flex min-h-[100dvh] flex-col overflow-x-hidden overflow-y-auto bg-papel">
      <div className="relative flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-md">
          {/* La misma marca que la barra del sitio y la del panel: el logotipo
              en marcador, sin el interletrado que necesitaba la letra anterior. */}
          <div className="mb-10 flex items-center justify-center gap-3">
            <Image src="/icon.png" alt="" width={36} height={36} />
            <span className="font-round text-[23px] uppercase leading-none text-noche">
              Blue Book
            </span>
          </div>

          <div className="panel-card p-6 sm:p-8 md:p-10">
            <LoginForm next={next} hadError={params.error === "1"} />
          </div>
          {/* El correo se pide aquí: el simplificado va antes de que llegue
              al servidor (LFPDPPP art. 16 fr. II). */}
          <AvisoSimplificado isEnglish={isEnglish} className="mt-6 px-1 text-center" />
        </div>
      </div>
    </div>
  );
}
