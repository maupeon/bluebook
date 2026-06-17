import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCoupleWeddingByEmail } from "@/lib/couplePanel";
import { ScrollLock } from "@/components/panel/ScrollLock";
import { PanelTopBar } from "@/components/panel/PanelTopBar";
import { NoWedding } from "@/components/panel/NoWedding";

// Chrome enfocado del panel: un overlay fijo que reemplaza visualmente el chrome
// de marketing (Navbar / PromoBanner / Footer del root layout siguen montados detrás).
export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Belt + suspenders: el middleware ya protege /panel.
  if (!user?.email) {
    redirect("/acceso");
  }

  const wedding = await getCoupleWeddingByEmail(user.email);

  return (
    <div className="fixed inset-0 z-[55] flex min-h-[100dvh] flex-col overflow-y-auto bg-bone">
      <ScrollLock />
      <PanelTopBar
        coupleName={wedding?.coupleName ?? null}
        weddingDate={wedding?.weddingDate ?? null}
      />
      {wedding ? children : <NoWedding />}
    </div>
  );
}
