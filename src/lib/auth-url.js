/* Does this address carry an auth redirect? (pure, unit tested)
   Supabase sends people back with the result in the address: `#access_token=…` (sign-in, email
   confirmation), `#…type=recovery` (password reset), `#error=…` (expired link), or `?code=…` (PKCE).
   The app's own switches (`?signin`, `?signup`, `?demo`, `?mode=…`) are not auth redirects. */
const HASH = /(^|[#&])(access_token|refresh_token|type|error|error_code|error_description|code|token_hash)=/;
const QUERY = /(^|[?&])(code|error|error_code|error_description|token_hash)=/;

export function authInAddress(hash, search) {
  return HASH.test(String(hash || "")) || QUERY.test(String(search || ""));
}
