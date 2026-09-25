import "server-only";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Quién está mirando /comenzar, si ya entró. Con getUser() y no con el
 * correoDelPanel de las claims: aquí hace falta también el nombre que trae la
 * cuenta de Google, y esa página no pasa por el middleware.
 */
export async function sesionDeComenzar(): Promise<{
  correo: string;
  nombreDeGoogle: string | null;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  return { correo: user.email, nombreDeGoogle: nombreDePila(user) };
}

/** «María Fernanda López» → «María». Solo el de pila: es como se presenta en la tarjeta. */
function nombreDePila(user: User): string | null {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const crudo =
    (typeof meta.given_name === "string" && meta.given_name) ||
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    "";
  const primero = crudo.trim().split(/\s+/)[0] ?? "";
  // Un correo como nombre (algunas cuentas lo traen así) no es un nombre.
  return primero && !primero.includes("@") ? primero.slice(0, 80) : null;
}
