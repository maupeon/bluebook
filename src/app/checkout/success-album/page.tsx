import { Metadata } from "next";
import { redirect } from "next/navigation";
import Stripe from "stripe";
import { nanoid } from "nanoid";
import { createClient } from "@supabase/supabase-js";
import { getAlbumPlan } from "@/lib/albumPlans";
import { cookies } from "next/headers";
import { LANGUAGE_COOKIE, parseLanguage } from "@/lib/language";
import { Titular } from "@/components/marca/Titular";
import { ButtonAnchor, ButtonLink } from "@/components/marketing/ui";

export const metadata: Metadata = {
  title: "¡Tu álbum está listo!",
  description: "Tu álbum digital ha sido creado. ¡Administra y comparte!",
};

const getStripeClient = (): Stripe | null => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;

  return new Stripe(secretKey, {
    apiVersion: "2025-12-15.clover",
  });
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getAlbumBySession(sessionId: string) {
  const { data } = await supabase
    .from("albums")
    .select("*")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  return data ?? null;
}

async function ensureAlbumForSession(sessionId: string) {
  const existingAlbum = await getAlbumBySession(sessionId);
  if (existingAlbum) return existingAlbum;

  const stripe = getStripeClient();
  if (!stripe) {
    console.error("No se pudo crear álbum: STRIPE_SECRET_KEY no configurado");
    return null;
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (error) {
    console.error("No se pudo recuperar sesión de Stripe:", error);
    return null;
  }

  if (session.payment_status !== "paid") {
    return null;
  }

  const metadata = session.metadata || {};
  if (metadata.productType !== "album") {
    return null;
  }

  const plan = getAlbumPlan(metadata.planId || "");
  const slug = `album-${nanoid(8)}`;
  const adminToken = nanoid(32);

  const { data, error } = await supabase
    .from("albums")
    .insert({
      slug,
      email: session.customer_email || session.customer_details?.email,
      title: metadata.albumTitle || "Nuestro Álbum",
      template: metadata.albumTemplate || "classic",
      photos: [],
      admin_token: adminToken,
      stripe_session_id: sessionId,
      guest_upload_enabled: true,
      max_photos_per_guest: plan?.maxPhotos || 50,
    })
    .select("*")
    .single();

  if (!error) {
    return data;
  }

  // Si hubo carrera con webhook u otra petición, reintenta leer por sesión.
  const raceAlbum = await getAlbumBySession(sessionId);
  if (raceAlbum) return raceAlbum;

  console.error("No se pudo crear álbum desde success:", error.message);
  return null;
}

/*
 * Casi nunca se ve: si el álbum existe, redirige a su panel. Lo que queda son
 * dos avisos sueltos (sin sesión, o reintentar), cada uno una hoja de papel
 * niebla centrada sobre el papel azul, con el titular en marcador y un solo
 * botón azul noche. Sin degradados ni flores.
 */
export default async function CheckoutSuccessAlbumPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const cookieStore = await cookies();
  const isEnglish = parseLanguage(cookieStore.get(LANGUAGE_COOKIE)?.value) === "en";
  const params = await searchParams;
  const sessionId = params.session_id;

  if (!sessionId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-papel px-4 pt-20">
        <div className="panel-card w-full max-w-lg p-8 text-center">
          <Titular as="h1" tamano="hoja" className="mb-3">
            {isEnglish ? "Session not found" : "No encontramos tu sesión"}
          </Titular>
          <p className="mb-6 text-tinta">
            {isEnglish
              ? "We could not find your session. Please go back to the digital album and try checkout again."
              : "Regresa al álbum digital y vuelve a intentar el checkout."}
          </p>
          <ButtonLink href="/album-digital" size="md">
            {isEnglish ? "Back to digital album" : "Volver a álbum digital"}
          </ButtonLink>
        </div>
      </div>
    );
  }

  const album = await ensureAlbumForSession(sessionId);

  if (album) {
    redirect(`/album/${album.slug}/admin?token=${album.admin_token}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-papel px-4 pt-20">
      <div className="panel-card w-full max-w-lg p-8 text-center">
        <Titular as="h1" tamano="hoja" className="mb-3">
          {isEnglish ? "We are finishing your album" : "Estamos terminando tu álbum"}
        </Titular>
        <p className="mb-6 text-tinta">
          {isEnglish
            ? "We could not create your album automatically on this attempt. Please try again in a few seconds."
            : "No fue posible crear el álbum automáticamente en este intento. Reintenta en unos segundos."}
        </p>
        <ButtonAnchor href={`/checkout/success-album?session_id=${encodeURIComponent(sessionId)}`} size="md">
          {isEnglish ? "Retry now" : "Reintentar ahora"}
        </ButtonAnchor>
      </div>
    </div>
  );
}
