import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Stripe from "stripe";
import { nanoid } from "nanoid";
import { createClient } from "@supabase/supabase-js";
import { getAlbumPlan } from "@/lib/albumPlans";

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

export default async function CheckoutSuccessAlbumPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const params = await searchParams;
  const sessionId = params.session_id;

  if (!sessionId) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center gradient-hero floral-pattern px-4">
        <div className="max-w-lg bg-white rounded-2xl shadow-xl p-8 text-center">
          <h1 className="font-heading text-3xl text-primary mb-3">No encontramos tu sesión</h1>
          <p className="font-body text-secondary mb-6">
            Regresa al álbum digital y vuelve a intentar el checkout.
          </p>
          <Link
            href="/album-digital"
            className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white font-body font-semibold rounded-full"
          >
            Volver a álbum digital
          </Link>
        </div>
      </div>
    );
  }

  const album = await ensureAlbumForSession(sessionId);

  if (album) {
    redirect(`/album/${album.slug}/admin?token=${album.admin_token}`);
  }

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center gradient-hero floral-pattern px-4">
      <div className="max-w-lg bg-white rounded-2xl shadow-xl p-8 text-center">
        <h1 className="font-heading text-3xl text-primary mb-3">Estamos terminando tu álbum</h1>
        <p className="font-body text-secondary mb-6">
          No fue posible crear el álbum automáticamente en este intento. Reintenta en unos segundos.
        </p>
        <a
          href={`/checkout/success-album?session_id=${encodeURIComponent(sessionId)}`}
          className="inline-flex items-center justify-center px-6 py-3 bg-accent text-white font-body font-semibold rounded-full"
        >
          Reintentar ahora
        </a>
      </div>
    </div>
  );
}
