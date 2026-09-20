/**
 * core/edit-lock.js
 *
 * Einfache Bearbeiten-Sperre für Domains, die standardmäßig nur
 * lesend zugänglich sein sollen (Hinzufügen/Bearbeiten/Löschen
 * gesperrt), bis der PIN eingegeben wird. WICHTIG: Das ist eine
 * reine Client-Side-Hürde gegen versehentliches/beiläufiges
 * Bearbeiten durch andere, KEINE echte Zugriffskontrolle – der Code
 * läuft im Browser des Nutzers, der SHA-256-Hash lässt sich mit
 * DevTools umgehen. Für echten Schutz wäre ein Backend mit
 * serverseitiger Auth nötig.
 *
 * Freischaltung gilt nur für die aktuelle Tab-Session
 * (sessionStorage) – nach Schließen/Neuladen des Tabs ist die Seite
 * wieder gesperrt.
 */
const UNLOCK_SESSION_KEY = "bg.editLock.unlocked";
const FAILED_ATTEMPTS_KEY = "bg.editLock.failedAttempts";
const LOCKOUT_UNTIL_KEY = "bg.editLock.lockoutUntil";
const MAX_ATTEMPTS_BEFORE_LOCKOUT = 5;
const LOCKOUT_DURATION_MS = 30_000;

// SHA-256-Hash des PIN (Klartext-PIN wird bewusst nicht im Code hinterlegt).
const PIN_HASH = "cd77c417c3e651c0c12a15cd7b8f7792e0b73de23b1ca5fa4eaf00d27926b8a7";

async function hashPin(pin) {
  const data = new TextEncoder().encode(pin);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getFailedAttempts() {
  return Number(window.sessionStorage.getItem(FAILED_ATTEMPTS_KEY) ?? "0");
}

function getLockoutRemainingMs() {
  const until = Number(window.sessionStorage.getItem(LOCKOUT_UNTIL_KEY) ?? "0");
  return Math.max(0, until - Date.now());
}

export const EditLock = {
  isUnlocked() {
    return window.sessionStorage.getItem(UNLOCK_SESSION_KEY) === "true";
  },

  lock() {
    window.sessionStorage.removeItem(UNLOCK_SESSION_KEY);
  },

  /** Sekunden, die wegen zu vieler Fehlversuche noch gewartet werden muss (0 = kein Lockout aktiv). */
  getLockoutSecondsRemaining() {
    return Math.ceil(getLockoutRemainingMs() / 1000);
  },

  /** Prüft den eingegebenen PIN und schaltet bei Erfolg frei. Liefert
   *  { success: true } oder { success: false, lockoutSeconds } (>0 heißt: aktuell gesperrt,
   *  Eingabe wurde nicht geprüft). Nach mehreren Fehlversuchen wird kurz gesperrt, um
   *  automatisiertes Durchprobieren zu erschweren. */
  async tryUnlock(pin) {
    const lockoutRemaining = getLockoutRemainingMs();
    if (lockoutRemaining > 0) {
      return { success: false, lockoutSeconds: Math.ceil(lockoutRemaining / 1000) };
    }

    const hash = await hashPin((pin ?? "").trim());
    if (hash === PIN_HASH) {
      window.sessionStorage.setItem(UNLOCK_SESSION_KEY, "true");
      window.sessionStorage.removeItem(FAILED_ATTEMPTS_KEY);
      window.sessionStorage.removeItem(LOCKOUT_UNTIL_KEY);
      return { success: true };
    }

    const attempts = getFailedAttempts() + 1;
    window.sessionStorage.setItem(FAILED_ATTEMPTS_KEY, String(attempts));
    if (attempts >= MAX_ATTEMPTS_BEFORE_LOCKOUT) {
      window.sessionStorage.setItem(LOCKOUT_UNTIL_KEY, String(Date.now() + LOCKOUT_DURATION_MS));
      window.sessionStorage.removeItem(FAILED_ATTEMPTS_KEY);
      return { success: false, lockoutSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000) };
    }
    return { success: false, lockoutSeconds: 0 };
  },
};
