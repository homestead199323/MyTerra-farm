import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { C, F } from "../lib/theme";
import { BADGES } from "../data/badges";

/* ═══════════════════════════════════════════
   BadgeCelebration — Phase 8.4
   Full-screen achievement overlay shown when the user earns a new badge.
   Consumes a queue of badge ids from the parent; pops them one at a time.

   Props:
     queue       — array of badge id strings waiting to be shown
     onDismiss   — (badgeId) => void called when the user dismisses or it
                   auto-times out. Parent persists the id to
                   gamify.celebratedBadges so it never re-appears.

   Behavior:
     - Renders only when queue[0] exists
     - Auto-dismiss after 1800ms; tap-anywhere also dismisses
     - Optional Web Vibration API on mount (Android only; no-op on iOS)
     - Honors prefers-reduced-motion (no confetti, no overshoot)
   ═══════════════════════════════════════════ */

// 12 confetti pieces ringing the badge. Pre-computed at module scope so
// the JSX render path stays IIFE-free (artifact-renderer constraint).
const CONFETTI = Array.from({length: 12}, (_, i) => {
  const angle = (i / 12) * Math.PI * 2;
  const dist = 70 + (i % 3) * 12;     // vary distance for organic look
  const dx = Math.cos(angle) * dist;
  const dy = Math.sin(angle) * dist;
  const colors = ["#2D6A4F", "#F4A261", "#E76F51", "#52B788", "#F1C453", "#74C69D"];
  return {
    color: colors[i % colors.length],
    dx,
    dy,
    delay: i * 30,                    // staggered emission
    size: 6 + (i % 3) * 2,
  };
});

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function BadgeCelebration({ queue, onDismiss }) {
  const currentId = queue[0];
  const badge = useMemo(
    () => BADGES.find(b => b.id === currentId) || null,
    [currentId]
  );
  const [reduceMotion] = useState(prefersReducedMotion);

  // Auto-dismiss + vibration on mount (per badge)
  useEffect(() => {
    // Unknown id (badge renamed between app versions): drop it, or every later badge stays hidden.
    if (!badge) { if (currentId) onDismiss(currentId); return; }
    // Try vibration — Android only, silently fails on iOS
    try {
      // Chrome refuses vibration (and logs an error) until the page has been tapped once.
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function" && navigator.userActivation?.hasBeenActive !== false) {
        navigator.vibrate(reduceMotion ? 0 : 150);
      }
    } catch (e) { /* swallow */ }

    const t = setTimeout(() => onDismiss(badge.id), 1800);
    return () => clearTimeout(t);
  }, [badge, currentId, onDismiss, reduceMotion]);

  if (!badge) return null;

  const handleDismiss = () => onDismiss(badge.id);

  return createPortal(
    <div
      onClick={handleDismiss}
      role="dialog"
      aria-live="polite"
      aria-label={`Badge earned: ${badge.name}`}
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0, 0, 0, 0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        cursor: "pointer",
        animation: reduceMotion ? "none" : "fadeIn 0.25s ease-out both",
      }}
    >
      {/* Confetti ring — hidden when reduce-motion */}
      {!reduceMotion && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            width: 0,
            height: 0,
            top: "50%",
            left: "50%",
            pointerEvents: "none",
          }}
        >
          {CONFETTI.map((c, i) => (
            <span
              key={i}
              style={{
                position: "absolute",
                width: c.size,
                height: c.size,
                borderRadius: "50%",
                background: c.color,
                left: 0,
                top: 0,
                ["--cx"]: `${c.dx}px`,
                ["--cy"]: `${c.dy}px`,
                animation: `confettiBurst 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${c.delay}ms forwards`,
                opacity: 0,
              }}
            />
          ))}
        </div>
      )}

      {/* Badge card */}
      <div
        style={{
          background: C.card,
          borderRadius: 24,
          padding: "32px 40px",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(0,0,0,.3), 0 8px 24px rgba(0,0,0,.15)",
          maxWidth: 320,
          minWidth: 240,
          animation: reduceMotion ? "fadeIn 0.2s ease-out both" : "badgeUnlock 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{fontSize: 11, fontWeight: 700, color: C.green, letterSpacing: 1.5, marginBottom: 12, fontFamily: F.body, textTransform: "uppercase"}}>
          Badge Earned
        </div>
        <div
          style={{
            fontSize: 72,
            lineHeight: 1,
            marginBottom: 16,
            filter: "drop-shadow(0 4px 12px color-mix(in srgb, var(--color-green-dark) 25%, transparent))",
          }}
        >
          {badge.emoji}
        </div>
        <div style={{fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 8, fontFamily: F.head}}>
          {badge.name}
        </div>
        <div style={{fontSize: 13, color: C.t2, lineHeight: 1.5, fontFamily: F.body}}>
          {badge.desc}
        </div>
        <div style={{fontSize: 11, color: C.t3, marginTop: 20, fontFamily: F.body}}>
          Tap anywhere to continue
        </div>
      </div>
    </div>,
    document.body
  );
}
