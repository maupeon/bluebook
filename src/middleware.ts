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

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
  matcher: ["/panel/:path*", "/acceso", "/auth/:path*"],
};
