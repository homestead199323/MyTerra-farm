import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Price ID -> tier. MUST match the Paddle catalogue and PRICE_IDS in
// src/services/payments/plans.js (tests/plans.test.js checks the two files agree).
// basic = "Grow", pro = "Homestead". Monthly and yearly prices share a tier.
const PRICE_TIER = {
  "pri_01kxdcntw2905t5fky81fy8cp0": "basic",    // Grow $4.99 / month
  "pri_01m7qyfgrm1zmts5k6yw5rh8kw": "basic",    // Grow $39 / year
  "pri_01kxdcqpgjd5z1qrpd6hxgmxr2": "pro",      // Homestead $9.99 / month
  "pri_01m7qygka3p9cknmynek8bt09m": "pro",  // Homestead $79 / year
  "pri_01m7qyhngkt0s94p591kv2cacv": "lifetime", // Founding Lifetime $129 once
  "pri_01kxdcrgmy4jnxycc4h9fa2jsp": "lifetime", // old Lifetime $190: no longer sold, still honoured
};

const WEBHOOK_SECRET = Deno.env.get("PADDLE_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

async function verifySignature(rawBody: string, sigHeader: string | null): Promise<boolean> {
  if (!sigHeader || !WEBHOOK_SECRET) return false;
  const parts = Object.fromEntries(
    sigHeader.split(";").map((p) => p.split("=") as [string, string])
  );
  const ts = parts.ts;
  const h1 = parts.h1;
  if (!ts || !h1) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signed = await crypto.subtle.sign(
    "HMAC", key, enc.encode(`${ts}:${rawBody}`)
  );
  const computed = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, "0")).join("");

  if (computed.length !== h1.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ h1.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await req.text();
  const sigHeader = req.headers.get("Paddle-Signature");
  const valid = await verifySignature(rawBody, sigHeader);
  if (!valid) {
    return new Response(JSON.stringify({ error: "invalid signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "bad json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const eventType: string = event.event_type;
  const data = event.data ?? {};
  const userId: string | undefined = data.custom_data?.user_id;
  // Paddle does not guarantee delivery order. Each profile remembers the
  // occurred_at of the last event applied; an older event (or a duplicate
  // delivery) is skipped so a late "updated" can't undo a "canceled".
  const occurredAt: string | null = typeof event.occurred_at === "string" ? event.occurred_at : null;

  if (!userId) {
    console.log("skip: no custom_data.user_id", eventType);
    return new Response(JSON.stringify({ skipped: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  async function applyProfile(update: Record<string, unknown>): Promise<boolean> {
    let q = supabase.from("profiles").update({ ...update, paddle_event_at: occurredAt }).eq("id", userId);
    if (occurredAt) q = q.or(`paddle_event_at.is.null,paddle_event_at.lt.${occurredAt}`);
    const { data: rows, error } = await q.select("id");
    if (error) throw error;
    if (!rows || rows.length === 0) {
      console.log("skip: stale event or unknown user", eventType, userId, occurredAt);
      return false;
    }
    return true;
  }

  try {
    if (eventType.startsWith("subscription.")) {
      // created / activated / updated / trialing / past_due / paused / resumed /
      // canceled / imported — every one carries the full subscription entity,
      // so the row always mirrors Paddle's current status.
      const priceId = data.items?.[0]?.price?.id;
      const tier = PRICE_TIER[priceId as keyof typeof PRICE_TIER] ?? null;
      const status = typeof data.status === "string" ? data.status : null;
      const periodEnd = data.current_billing_period?.ends_at ?? null;

      const { data: existing } = await supabase.from("profiles").select("tier, paddle_subscription_id, subscription_status").eq("id", userId).maybeSingle();

      const update: Record<string, unknown> = {
        paddle_customer_id: data.customer_id ?? null,
        paddle_subscription_id: data.id ?? null,
        subscription_status: status,
        current_period_end: periodEnd,
      };
      // A Lifetime account keeps its tier whatever happens to an old subscription.
      if (tier && tier !== "lifetime" && existing?.tier !== "lifetime") update.tier = tier;

      if (eventType === "subscription.created") {
        // Two live subscriptions for one account means double billing — the app
        // blocks a second checkout, so log loudly if it ever happens anyway.
        if (existing?.paddle_subscription_id && existing.paddle_subscription_id !== data.id &&
            ["active", "trialing", "past_due", "paused"].includes(existing.subscription_status ?? "")) {
          console.error("WARNING second subscription for user", userId, "old:", existing.paddle_subscription_id, "new:", data.id);
        }
      }
      await applyProfile(update);
    } else if (eventType === "transaction.completed") {
      const priceId = data.items?.[0]?.price?.id;
      const tier = PRICE_TIER[priceId as keyof typeof PRICE_TIER];
      if (tier === "lifetime") {
        await applyProfile({
          tier: "lifetime",
          paddle_customer_id: data.customer_id ?? null,
          subscription_status: null,
          current_period_end: null,
        });
      }
    } else {
      console.log("unhandled event type", eventType);
    }
  } catch (err) {
    console.error("webhook handler error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
