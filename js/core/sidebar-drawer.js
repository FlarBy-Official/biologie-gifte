/**
 * core/sidebar-drawer.js
 *
 * Mobile Navigation: Auf schmalen Bildschirmen liegt die Sidebar als
 * Off-Canvas-Drawer über dem Inhalt. Sie ist per ☰ erreichbar und
 * schließt sich bei Auswahl, Tippen auf den Hintergrund, Escape und
 * über den Zurück-Button/die Wischgeste des Browsers (via BackStack).
 *
 * Liegt bewusst im core-Layer (und nicht in app.js), damit Domains den
 * Drawer schließen können, ohne einen Zirkelbezug auf app.js zu
 * erzeugen.
 */
import { BackStack } from "./back-stack.js?v=5";
import { isMobileViewport } from "./viewport.js?v=5";

export const SidebarDrawer = {
  init() {
    this.shellEl = document.querySelector("[data-app-shell]");
    this.backdropEl = document.querySelector("[data-sidebar-backdrop]");
    this.toggleEl = document.querySelector("[data-sidebar-toggle]");
    this.sidebarEl = document.querySelector("[data-app-sidebar]");

    this.toggleEl.addEventListener("click", () => this.toggle());
    this.backdropEl.addEventListener("click", () => this.close());
    document.querySelector("[data-sidebar-close]").addEventListener("click", () => this.close());

    // Nach jeder Auswahl im Menü soll der Inhalt wieder sichtbar sein.
    this.sidebarEl.querySelectorAll("[data-nav-item], [data-gift-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        if (isMobileViewport()) {
          this.close();
        }
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.isOpen()) {
        this.close();
      }
    });
  },

  isOpen() {
    return this.shellEl.classList.contains("is-drawer-open");
  },

  toggle() {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  },

  open() {
    this.shellEl.classList.add("is-drawer-open");
    this.backdropEl.hidden = false;
    this.toggleEl.setAttribute("aria-expanded", "true");
    BackStack.push("sidebar-drawer", () => this.closeImmediate());
  },

  close() {
    if (!this.isOpen()) {
      return;
    }
    if (BackStack.close("sidebar-drawer")) {
      return;
    }
    this.closeImmediate();
  },

  closeImmediate() {
    this.shellEl.classList.remove("is-drawer-open");
    this.backdropEl.hidden = true;
    this.toggleEl.setAttribute("aria-expanded", "false");
  },
};
