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
import { GiftController } from "./domains/gift/gift.controller.js?v=10";
import { ThemeToggle } from "./core/theme.js?v=10";
import { BackStack } from "./core/back-stack.js?v=10";
import { SidebarDrawer } from "./core/sidebar-drawer.js?v=10";

const DOMAINS = [{ key: "gift", controller: GiftController }];

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
