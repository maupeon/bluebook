import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente con service-role (solo servidor). Salta RLS — usar SIEMPRE detrás de una
// verificación de sesión que confirme que la pareja es dueña de la boda consultada.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
