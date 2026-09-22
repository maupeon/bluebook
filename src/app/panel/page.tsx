import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCoupleWeddingByEmail, getPanelBundle } from "@/lib/couplePanel";
import { NoWedding } from "@/components/panel/NoWedding";
import { PanelDashboard } from "@/components/panel/PanelDashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Panel",
  robots: { index: false, follow: false },
};

export default async function PanelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/acceso");
  }

  const wedding = await getCoupleWeddingByEmail(user.email);
  if (!wedding) {
    // El layout ya muestra este estado, pero lo mantenemos coherente por si acaso.
    return <NoWedding email={user.email} />;
  }

  const bundle = await getPanelBundle(wedding);

  return <PanelDashboard bundle={bundle} />;
}
