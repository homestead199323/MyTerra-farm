/* The Supabase client library, in its own chunk: see lib/db.js (the only importer). */
import { createClient } from "@supabase/supabase-js";

export function createSupabase(url, key, storageKey) {
  return createClient(url, key, {
    auth: {
      // Persist the session in localStorage so a returning user stays signed in.
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // needed for the OAuth redirect callback (Google) and email links
      storageKey,
    },
  });
}
