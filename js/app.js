/**
 * app.js
 *
 * Einstiegspunkt: initialisiert die App-Shell (Sidebar-Navigation
 * zwischen Domains, mobile Off-Canvas-Drawer) und bootstrapped jeden
 * Domain-Controller.
 *
 * Neue Domain hinzufügen: hier importieren + in DOMAINS registrieren,
 * siehe AGENTS.md.
 */
import { GiftController } from "./domains/gift/gift.controller.js?v=4";
import { ThemeToggle } from "./core/theme.js?v=4";
import { BackStack } from "./core/back-stack.js?v=4";
import { isMobileViewport } from "./core/viewport.js?v=4";

const DOMAINS = [{ key: "gift", controller: GiftController }];

/**
 * Mobile Navigation: Die Sidebar liegt auf schmalen Bildschirmen als
 * Drawer über dem Inhalt. Sie ist per ☰ erreichbar und schließt sich
 * bei Auswahl, Tippen auf den Hintergrund, Escape und über den
 * Zurück-Button/die Wischgeste des Browsers (via BackStack).
 */
export const SidebarDrawer = {
  init() {
    this.shellEl = document.querySelector("[data-app-shell]");
    this.backdropEl = document.querySelector("[data-sidebar-backdrop]");
    this.toggleEl = document.querySelector("[data-sidebar-toggle]");
    this.sidebarEl = document.querySelector("[data-app-sidebar]");

    this.toggleEl.addEventListener("click", () => this.toggle());
    this.backdropEl.addEventListener("click", () => this.close());
    document.querySelector("[data-sidebar-close]").addEventListener("click", () => this.close());

    // Nach jeder Auswahl im Menü soll die Liste wieder sichtbar sein.
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

function initNavigation() {
  const navItems = document.querySelectorAll("[data-nav-item]");
  const views = document.querySelectorAll("[data-domain-view]");
  const groups = document.querySelectorAll("[data-nav-group]");

  navItems.forEach((navItem) => {
    navItem.addEventListener("click", () => {
      const target = navItem.dataset.navItem;
      const wasActive = navItem.classList.contains("is-active");
      const group = navItem.closest("[data-nav-group]");

      navItems.forEach((item) => item.classList.toggle("is-active", item === navItem));
      views.forEach((view) => view.classList.toggle("is-active", view.dataset.domainView === target));

      // Akkordeon: Domain-Wechsel klappt die zugehörige Gruppe auf (andere
      // schließen); erneuter Klick auf die bereits aktive Domain klappt
      // deren Submenü nur auf/zu.
      groups.forEach((g) => {
        const isTarget = g === group;
        const shouldExpand = isTarget && (!wasActive || !g.classList.contains("is-expanded"));
        g.classList.toggle("is-expanded", isTarget ? shouldExpand : false);
        const item = g.querySelector("[data-nav-item]");
        if (item) item.setAttribute("aria-expanded", String(shouldExpand && isTarget));
      });
    });
  });
}

async function init() {
  BackStack.init();
  initNavigation();
  SidebarDrawer.init();
  ThemeToggle.init();
  for (const domain of DOMAINS) {
    await domain.controller.init();
  }
}

document.addEventListener("DOMContentLoaded", init);
