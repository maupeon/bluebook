import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Refresca la sesión de Supabase en cada request y protege /panel.
// (No interfiere con el sitio público ni con las rutas del álbum.)
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // VERIFICAR LA SESION SIN SALIR A LA RED.
  //
  // getUser() pregunta al servidor de Auth en CADA request. Medido desde aquí
  // son ~130 ms, y el layout hacía otra igual: dos idas y vueltas en serie
  // antes de que empezara la primera consulta de datos, en cada navegación del
  // panel.
  //
  // Este proyecto firma los tokens con ES256 y publica su JWKS, así que
  // getClaims() valida la firma en local con WebCrypto —la clave se cachea tras
  // la primera vez— y no toca la red. Sólo se cae a getUser() cuando el token
  // ya expiró, que es una vez por hora y además es la llamada que REFRESCA la
  // cookie, que es el otro trabajo de este middleware.
  let email: string | undefined;
  const { data: verificado } = await supabase.auth.getClaims();
  email = verificado?.claims?.email as string | undefined;
  if (!email) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? undefined;
  }
  const user = email ? { email } : null;

  const { pathname } = request.nextUrl;

  // Rutas privadas de la pareja: exigen sesión.
  if (pathname.startsWith("/panel") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/acceso";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Corre en /panel, /acceso y /auth para mantener la sesión fresca; ignora estáticos.
  // /comenzar también: el onboarding lee la sesión desde un Server Component
  // (para saltarse el acceso si ya entró, o mandarla a su panel si ya tiene
  // boda), y un Server Component no puede escribir cookies. Si el token venció,
  // Supabase lo refrescaría allí sin poder guardar el nuevo. Aquí no protege
  // nada: sin sesión, /comenzar se abre igual.
  matcher: ["/panel/:path*", "/acceso", "/auth/:path*", "/comenzar/:path*"],
};
