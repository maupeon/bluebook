import { Metadata } from "next";
import Link from "next/link";
import { CheckCircle, Upload, ArrowRight, Shield } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

export const metadata: Metadata = {
  title: "¡Tu álbum está listo!",
  description: "Tu álbum digital ha sido creado. ¡Administra y comparte!",
};

// Buscar el álbum más reciente creado (fallback si no hay stripe_session_id)
async function getAlbumBySession(sessionId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Primero intenta buscar por stripe_session_id
  const { data: albumBySession } = await supabase
    .from("albums")
    .select("*")
    .eq("stripe_session_id", sessionId)
    .single();

  if (albumBySession) {
    return albumBySession;
  }

  // Fallback: obtener el álbum más reciente (útil si no tienes la columna stripe_session_id)
  const { data: latestAlbum } = await supabase
    .from("albums")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return latestAlbum;
}

export default async function CheckoutSuccessAlbumPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const params = await searchParams;
  const sessionId = params.session_id;
  const album = sessionId ? await getAlbumBySession(sessionId) : null;

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center gradient-hero floral-pattern">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        {/* Success Icon */}
        <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-accent/20 flex items-center justify-center">
          <CheckCircle className="w-14 h-14 text-accent" />
        </div>

        {/* Title */}
        <h1 className="font-heading text-4xl sm:text-5xl font-semibold text-primary mb-4">
          ¡Tu álbum está listo!
        </h1>

        <p className="font-body text-xl text-secondary mb-8">
          {album?.title || "Tu álbum digital"} ha sido creado exitosamente.
        </p>

        {/* Admin Panel Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-10">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Shield className="w-6 h-6 text-accent" />
            <span className="font-heading text-2xl text-primary">
              Tu Panel de Administración
            </span>
          </div>

          <p className="font-body text-secondary mb-6">
            Desde tu panel de administración podrás subir fotos, invitar a otros
            a contribuir con sus fotos, y gestionar todo tu álbum digital.
          </p>

          {album ? (
            <Link
              href={`/album/${album.slug}/admin?token=${album.admin_token}`}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-accent text-white font-body font-semibold rounded-full hover:bg-accent/90 transition-all duration-300 group w-full sm:w-auto"
            >
              <Upload className="w-5 h-5" />
              Ir a mi panel de administración
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <div className="bg-light rounded-xl p-6">
              <p className="font-body text-secondary">
                Tu álbum se está procesando. En unos minutos recibirás un email
                con el enlace a tu panel de administración.
              </p>
            </div>
          )}

          {album && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-2">
                <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-left">
                  <p className="font-body text-sm font-semibold text-amber-800 mb-1">
                    Guarda este enlace
                  </p>
                  <p className="font-body text-sm text-amber-700 mb-2">
                    Este es tu enlace privado de administración. También te lo enviamos por email.
                  </p>
                  <code className="font-mono text-xs text-amber-900 break-all block bg-amber-100 p-2 rounded">
                    {process.env.NEXT_PUBLIC_APP_URL}/album/{album.slug}/admin?token={album.admin_token}
                  </code>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Steps */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-10">
          <h3 className="font-heading text-lg font-semibold text-primary mb-4 text-left">
            ¿Cómo funciona?
          </h3>
          <ul className="space-y-3 text-left">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-accent text-white text-sm flex items-center justify-center flex-shrink-0">
                1
              </span>
              <span className="font-body text-secondary">
                Sube tus fotos favoritas desde el panel de administración
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-accent text-white text-sm flex items-center justify-center flex-shrink-0">
                2
              </span>
              <span className="font-body text-secondary">
                Crea invitaciones para que otros suban sus fotos (con límites)
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-accent text-white text-sm flex items-center justify-center flex-shrink-0">
                3
              </span>
              <span className="font-body text-secondary">
                Ordena todas las fotos y comparte el álbum final
              </span>
            </li>
          </ul>
        </div>

        {/* Back home */}
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white font-body font-semibold rounded-full hover:bg-primary-dark transition-all duration-300 group"
        >
          Volver al inicio
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>

        {/* Support */}
        <p className="font-body text-sm text-secondary mt-10">
          ¿Tienes alguna pregunta? Escríbenos a{" "}
          <a
            href="mailto:hola@bluebook.mx"
            className="text-accent hover:underline"
          >
            hola@bluebook.mx
          </a>
        </p>
      </div>
    </div>
  );
}
