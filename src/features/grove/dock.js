/* A card docked in the desktop home's side column (the area card, an area's jobs) publishes its height as
   the CSS variable --dock-h, so the panel stacked under it starts where the card ends (desk.css).
   Anywhere else nothing reads the variable. A hidden card (0 px) publishes nothing. */
export function publishDockHeight(el) {
  if (!el || typeof ResizeObserver !== "function") return function () {};
  const root = document.documentElement;
  const set = function () { const h = el.offsetHeight; if (h > 0) root.style.setProperty("--dock-h", `${h}px`); };
  const watch = new ResizeObserver(set);
  watch.observe(el); set();
  return function () { watch.disconnect(); root.style.removeProperty("--dock-h"); };
}
