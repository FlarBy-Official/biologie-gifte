/**
 * core/viewport.js
 *
 * Eine einzige Quelle der Wahrheit für den Mobile-Breakpoint, damit
 * JS und CSS nicht auseinanderlaufen. Der Wert 768px entspricht dem in
 * AGENTS.md festgelegten Breakpoint aller @media-Blöcke.
 */
export const MOBILE_BREAKPOINT = 768;

const mobileQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);

/** True, sobald die App im Handy-Layout (gestapelt) dargestellt wird. */
export function isMobileViewport() {
  return mobileQuery.matches;
}

/** Ruft `callback(isMobile)` bei jedem Wechsel des Breakpoints auf. */
export function onViewportChange(callback) {
  const handler = (event) => callback(event.matches);
  if (typeof mobileQuery.addEventListener === "function") {
    mobileQuery.addEventListener("change", handler);
  } else {
    // Safari < 14 kennt addEventListener auf MediaQueryList noch nicht
    mobileQuery.addListener(handler);
  }
}
