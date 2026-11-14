/* ═══════════════════════════════════════════
   ADMIN — owner-only dashboard access
   The client-side check below only controls whether the Admin nav item
   is rendered. It is NOT the security boundary: the real gate is the
   `admin_dashboard()` Postgres function (SECURITY DEFINER), which
   verifies auth.uid() against the owner UUID server-side and raises
   `forbidden` for anyone else. Editing this file gains nothing.
   ═══════════════════════════════════════════ */
import { getClient } from "./db";
import { getUser } from "./auth";

// Owner account (cosmetic gate only — see note above).
export const ADMIN_EMAIL = "dervis.kanina@gmail.com";

// True when the signed-in user is the owner. Safe to call signed-out.
export async function checkIsAdmin() {
  try {
    const user = await getUser();
    return Boolean(user && user.email === ADMIN_EMAIL);
  } catch {
    return false;
  }
}

// Fetch the aggregate owner dashboard from the server-gated RPC.
// Throws with the Supabase error message on failure ("forbidden" for
// non-owners, network/timeout messages otherwise).
export async function fetchAdminDashboard() {
  const { data, error } = await (await getClient()).rpc("admin_dashboard");
  if (error) throw new Error(error.message || "Failed to load dashboard");
  return data;
}
