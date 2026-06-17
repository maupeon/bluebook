import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCoupleWeddingByEmail } from "@/lib/couplePanel";
import { LoginForm } from "@/components/panel/LoginForm";

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
  const next = typeof params.next === "string" ? params.next : "/panel";

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
    <div className="fixed inset-0 z-[55] flex min-h-[100dvh] flex-col overflow-y-auto bg-bone">
      <div
        aria-hidden="true"
        className="animate-drift pointer-events-none absolute -top-40 -right-40 h-[34rem] w-[34rem] rounded-full bg-terra-light opacity-[0.07] blur-3xl"
      />

      <div className="relative flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center">
            <span className="font-heading text-2xl tracking-tight text-ink">
              Blue Book
            </span>
          </div>

          <div className="rounded-2xl border border-sand bg-white p-8 md:p-10">
            <LoginForm next={next} hadError={params.error === "1"} />
          </div>
        </div>
      </div>
    </div>
  );
}
