/**
 * core/utils.js
 *
 * Kleine, domain-unabhängige Helferfunktionen.
 */

/** Erzeugt eine (für diese App ausreichend) eindeutige ID. */
export function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Aktueller Zeitstempel als ISO-String. */
export function nowIso() {
  return new Date().toISOString();
}

/** Escaped HTML-Sonderzeichen, um XSS über Benutzereingaben zu vermeiden. */
export function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Zeigt eine kurze Toast-Meldung unten rechts an. */
export function showToast(message, variant = "info") {
  const container = document.querySelector(".toast-container");
  if (!container) {
    console.warn("[utils] .toast-container nicht gefunden, Meldung:", message);
    return;
  }
  const toast = document.createElement("div");
  toast.className = `toast toast--${variant}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

/** Debounced eine Funktion, z.B. fürs Live-Filtern der Suche. */
export function debounce(fn, delayMs = 200) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delayMs);
  };
}
