import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPanelDataByEmail } from "@/lib/couplePanel";
import { ScrollLock } from "@/components/panel/ScrollLock";
import { ResetScroll } from "@/components/panel/ResetScroll";
import { PanelTopBar } from "@/components/panel/PanelTopBar";
import { PanelSidebar } from "@/components/panel/PanelSidebar";
import { NoWedding } from "@/components/panel/NoWedding";

/** El id del div que scrollea. Lo comparten el layout y ResetScroll. */
const ID_SCROLLER = "panel-scroll";

// Chrome enfocado del panel: un overlay fijo que reemplaza visualmente el chrome
// de marketing (Navbar / PromoBanner / Footer del root layout siguen montados detrás).
//
// El que scrollea es el div de contenido, NO el overlay: así la barra lateral se
// queda quieta mientras la pantalla se desplaza, que es como se comporta el
// chrome de una aplicación y no el de un documento.
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

  // Cacheado por petición: la pantalla hija pide lo mismo y no se vuelve a consultar.
  const datos = await getPanelDataByEmail(user.email);

  if (!datos) {
    return (
      <div
        data-panel-overlay
        className="fixed inset-0 z-[55] flex min-h-[100dvh] flex-col overflow-y-auto bg-bone"
      >
        <ScrollLock />
        <PanelTopBar coupleName={null} weddingDate={null} />
        <NoWedding email={user.email} />
      </div>
    );
  }

  const { wedding, bundle, diasRestantes } = datos;

  return (
    <div data-panel-overlay className="fixed inset-0 z-[55] flex flex-col bg-bone">
      <ScrollLock />
      <ResetScroll targetId={ID_SCROLLER} />
      <PanelTopBar
        coupleName={wedding.coupleName}
        weddingDate={wedding.weddingDate}
      />
      <div className="flex min-h-0 flex-1">
        <PanelSidebar
          estado={{
            diasRestantes,
            invitadosPendientes: bundle.guests.pending,
            personasConfirmadas: bundle.guests.attending,
            dineroPorPagar: bundle.budget.balance,
            dineroContratado: bundle.budget.contracted,
            momentos: bundle.runOfShow.blocks.length,
            hayGuion:
              !bundle.runOfShow.unavailable && bundle.runOfShow.blocks.length > 0,
          }}
        />
        {/* pb para que la barra inferior del teléfono no tape el final. */}
        <div
          id={ID_SCROLLER}
          className="min-w-0 flex-1 overflow-y-auto overscroll-contain pb-24 md:pb-0"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
