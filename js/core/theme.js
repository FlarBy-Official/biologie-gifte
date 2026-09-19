/**
 * core/theme.js
 *
 * Domain-unabhängiges Dark/Light-Theme-Toggle. Setzt das Attribut
 * `data-theme` auf <html> und persistiert die Wahl in LocalStorage
 * ("bg.theme"), damit die Domain-CSS-Dateien unverändert bleiben und
 * nur `css/base/variables.css` je Theme unterschiedliche Werte für
 * dieselben Design-Tokens liefert.
 */
const THEME_STORAGE_KEY = "bg.theme";

function getStoredTheme() {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch (error) {
    console.error("[theme] Konnte Theme-Einstellung nicht lesen:", error);
    return null;
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export const ThemeToggle = {
  /** Liest die gespeicherte Präferenz (oder "dark" als Default) und wendet sie an. */
  init() {
    const stored = getStoredTheme() ?? "dark";
    applyTheme(stored);

    const button = document.querySelector("[data-theme-toggle]");
    if (button) {
      this.updateButtonLabel(button, stored);
      button.addEventListener("click", () => this.toggle(button));
    }
  },

  toggle(button) {
    const current = document.documentElement.getAttribute("data-theme") ?? "dark";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    if (button) {
      this.updateButtonLabel(button, next);
    }
  },

  updateButtonLabel(button, theme) {
    button.textContent = theme === "dark" ? "☀️ Helles Design" : "🌙 Dunkles Design";
  },
};
