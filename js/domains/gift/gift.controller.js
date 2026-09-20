/**
 * domains/gift/gift.controller.js
 *
 * "Verhalten im Browser" der Gift-Domain: registriert Event-Listener
 * (Suche, Formular absenden, Bearbeiten, Löschen) und orchestriert
 * gift.api.js (Persistenz) + gift.ui.js (Rendering).
 */
import { GiftApi } from "./gift.api.js?v=9";
import { validateGift } from "./gift.model.js?v=9";
import { renderGiftList, renderGiftDetail, fillGiftForm, readGiftForm, renderGiftCompareTable } from "./gift.ui.js?v=9";
import { GiftFavorites } from "./gift.favorites.js?v=9";
import { GiftCompareSelection } from "./gift.compare-selection.js?v=9";
import { initGiftResizer } from "./gift.resizer.js?v=9";
import { EditLock } from "../../core/edit-lock.js?v=9";
import { BackStack } from "../../core/back-stack.js?v=9";
import { SidebarDrawer } from "../../core/sidebar-drawer.js?v=9";
import { isMobileViewport, onViewportChange } from "../../core/viewport.js?v=9";
import { debounce, showToast } from "../../core/utils.js?v=9";

export const GiftController = {
  selectedId: null,
  activeFilter: "all",
  currentList: [],

  async init() {
    this.listEl = document.querySelector("[data-gift-list]");
    this.detailEl = document.querySelector("[data-gift-detail]");
    // Ursprünglicher Platz des Detail-Panels neben der Liste. Als
    // Vollbild-Overlay wird es nach <body> umgehängt (siehe
    // openDetail) und von dort wieder hierher zurückgesetzt.
    this.detailHomeEl = this.detailEl.parentElement;
    this.searchEl = document.querySelector("[data-gift-search]");
    this.modalEl = document.querySelector("[data-gift-modal]");
    this.formEl = document.querySelector("[data-gift-form]");
    this.modalTitleEl = document.querySelector("[data-gift-modal-title]");
    this.filterButtons = document.querySelectorAll("[data-gift-filter]");
    this.zoomModalEl = document.querySelector("[data-gift-structure-zoom-modal]");
    this.zoomImgEl = document.querySelector("[data-gift-structure-zoom-img]");
    this.zoomCaptionEl = document.querySelector("[data-gift-structure-zoom-caption]");
    this.newButtonEl = document.querySelector("[data-gift-new]");
    this.compareButtonEl = document.querySelector("[data-gift-compare]");
    this.compareModalEl = document.querySelector("[data-gift-compare-modal]");
    this.compareTableEl = document.querySelector("[data-gift-compare-table]");
    this.editLockToggleEl = document.querySelector("[data-edit-lock-toggle]");
    this.editLockModalEl = document.querySelector("[data-edit-lock-modal]");
    this.editLockFormEl = document.querySelector("[data-edit-lock-form]");
    this.editLockErrorEl = document.querySelector("[data-edit-lock-error]");
    this.editLockPinEl = document.getElementById("edit-lock-pin");
    this.topbarTitleEl = document.querySelector("[data-topbar-title]");
    this.giftResizerEl = document.querySelector("[data-gift-resizer]");

    this.filterButtons.forEach((button) => {
      button.addEventListener("click", () => this.setFilter(button.dataset.giftFilter));
    });

    this.newButtonEl.addEventListener("click", () => this.openCreateModal());
    this.compareButtonEl.addEventListener("click", () => this.openCompareModal());
    document.querySelector("[data-gift-compare-modal-close]").addEventListener("click", () => this.closeCompareModal());
    this.compareModalEl.addEventListener("click", (event) => {
      if (event.target === this.compareModalEl) {
        this.closeCompareModal();
      }
    });
    this.editLockToggleEl.addEventListener("click", () => this.handleEditLockToggle());
    document.querySelector("[data-edit-lock-modal-close]").addEventListener("click", () => this.closeEditLockModal());
    document.querySelector("[data-edit-lock-cancel]").addEventListener("click", () => this.closeEditLockModal());
    this.editLockModalEl.addEventListener("click", (event) => {
      if (event.target === this.editLockModalEl) {
        this.closeEditLockModal();
      }
    });
    this.editLockFormEl.addEventListener("submit", (event) => this.handleEditLockSubmit(event));
    document.querySelector("[data-gift-modal-close]").addEventListener("click", () => this.closeModal());
    document.querySelector("[data-gift-modal-cancel]").addEventListener("click", () => this.closeModal());
    this.modalEl.addEventListener("click", (event) => {
      if (event.target === this.modalEl) {
        this.closeModal();
      }
    });
    this.formEl.addEventListener("submit", (event) => this.handleSubmit(event));
    this.listEl.addEventListener("click", (event) => this.handleListClick(event));
    this.detailEl.addEventListener("click", (event) => this.handleDetailClick(event));
    this.searchEl.addEventListener(
      "input",
      debounce(() => this.renderList(), 150)
    );
    document.addEventListener("keydown", (event) => this.handleKeydown(event));

    document.querySelector("[data-gift-structure-zoom-close]").addEventListener("click", () => this.closeStructureZoom());
    this.zoomModalEl.addEventListener("click", (event) => {
      if (event.target === this.zoomModalEl) {
        this.closeStructureZoom();
      }
    });

    await GiftApi.init();
    this.updateEditLockUi();
    this.updateTopbarTitle();
    initGiftResizer({ listColumnEl: this.listEl.parentElement, resizerEl: this.giftResizerEl });
    onViewportChange((isMobile) => this.handleViewportChange(isMobile));
    await this.renderList();
  },

  /**
   * Beim Wechsel zwischen Handy- und Desktop-Layout muss die Auswahl
   * neu bewertet werden: Auf dem Desktop steht das Detail-Panel neben
   * der Liste und darf vorbelegt sein, auf dem Handy überdeckt es die
   * Liste und wird deshalb nur nach bewusstem Antippen geöffnet.
   */
  async handleViewportChange(isMobile) {
    if (isMobile) {
      if (this.selectedId !== null) {
        this.closeDetail();
      }
      return;
    }
    // Ein auf dem Handy geöffnetes Detail ist auf dem Desktop kein
    // Overlay mehr – History-Eintrag und Body-Platzierung zurücksetzen.
    BackStack.drop("gift-detail");
    this.moveDetailToColumn();
    await this.ensureSelection();
  },

  /** Zeigt den aktiven Filter in der Topbar an – auf dem Handy ist die
   *  Sidebar zugeklappt und der Filter sonst nicht erkennbar. */
  updateTopbarTitle() {
    const activeButton = Array.from(this.filterButtons).find(
      (button) => button.dataset.giftFilter === this.activeFilter
    );
    const label = activeButton ? activeButton.textContent.trim() : "Alle";
    this.topbarTitleEl.textContent = this.activeFilter === "all" ? "Gifte" : `Gifte · ${label}`;
  },

  /** Aktualisiert Toggle-Label + Sichtbarkeit des "+ Neues Gift"-Buttons je nach Sperrstatus. */
  updateEditLockUi() {
    const unlocked = EditLock.isUnlocked();
    this.newButtonEl.hidden = !unlocked;
    this.editLockToggleEl.textContent = unlocked ? "🔓 Bearbeiten sperren" : "🔒 Bearbeiten freischalten";
  },

  /** Klick auf den Sperr-Button: entweder direkt sperren oder das PIN-Modal öffnen. */
  async handleEditLockToggle() {
    if (EditLock.isUnlocked()) {
      EditLock.lock();
      this.updateEditLockUi();
      await this.renderList();
      showToast("Bearbeiten wieder gesperrt.", "info");
      return;
    }
    this.openEditLockModal();
  },

  openEditLockModal() {
    // Das PIN-Modal wird aus der Sidebar heraus geöffnet – auf dem
    // Handy muss die Drawer dafür aus dem Weg.
    SidebarDrawer.close();
    this.editLockFormEl.reset();
    this.editLockErrorEl.hidden = true;
    this.editLockModalEl.hidden = false;
    this.editLockPinEl.focus();
    BackStack.push("edit-lock-modal", () => this.closeEditLockModalImmediate());
  },

  closeEditLockModal() {
    if (BackStack.close("edit-lock-modal")) {
      return;
    }
    this.closeEditLockModalImmediate();
  },

  closeEditLockModalImmediate() {
    this.editLockModalEl.hidden = true;
  },

  async handleEditLockSubmit(event) {
    event.preventDefault();
    const pin = this.editLockPinEl.value;
    const result = await EditLock.tryUnlock(pin);
    if (result.success) {
      this.closeEditLockModal();
      this.updateEditLockUi();
      await this.renderList();
      showToast("Bearbeiten freigeschaltet.", "success");
      return;
    }
    this.editLockErrorEl.hidden = false;
    this.editLockErrorEl.textContent =
      result.lockoutSeconds > 0
        ? `Zu viele Fehlversuche. Bitte ${result.lockoutSeconds}s warten.`
        : "Falscher PIN.";
    this.editLockFormEl.reset();
    this.editLockPinEl.focus();
  },

  async renderList() {
    const term = this.searchEl.value.trim().toLowerCase();
    const all = await GiftApi.getAll();
    const filtered = all
      .filter((gift) => (term ? gift.name.toLowerCase().includes(term) : true))
      .filter((gift) => this.matchesFilter(gift))
      .sort((a, b) =>
        this.activeFilter === "top25-europa"
          ? this.compareByRangEuropa(a, b)
          : this.compareByRangWeltweit(a, b),
      );
    this.currentList = filtered;
    renderGiftList(this.listEl, filtered);
    this.highlightSelectedCard();
    await this.ensureSelection();
  },

  /**
   * Desktop: wählt automatisch das erste Gift der aktuellen Liste aus,
   * sobald die bisherige Auswahl nicht mehr Teil der (gefilterten)
   * Liste ist – das Detail-Panel neben der Liste bliebe sonst leer.
   *
   * Handy: es wird bewusst nichts vorausgewählt, weil das Detail dort
   * als Vollbild über der Liste liegt und man sich sonst bei jedem
   * Start/Filterwechsel erst wieder zurück navigieren müsste. Ein
   * bereits offenes Detail wird geschlossen, wenn sein Gift aus der
   * Liste fällt.
   */
  async ensureSelection() {
    const mobile = isMobileViewport();
    if (this.currentList.length === 0) {
      if (this.selectedId !== null) {
        this.closeDetail();
      }
      return;
    }
    const stillPresent = this.currentList.some((gift) => gift.id === this.selectedId);
    if (stillPresent) {
      return;
    }
    if (mobile) {
      if (this.selectedId !== null) {
        this.closeDetail();
      }
      return;
    }
    await this.openDetail(this.currentList[0].id);
  },

  /** Sortiert nach Rang weltweit aufsteigend (Platz 1 zuerst); Gifte
   *  ohne Rangangabe werden ans Ende sortiert, alphabetisch als Fallback. */
  compareByRangWeltweit(a, b) {
    const rankA = a.rangWeltweit;
    const rankB = b.rangWeltweit;
    if (rankA == null && rankB == null) {
      return a.name.localeCompare(b.name);
    }
    if (rankA == null) {
      return 1;
    }
    if (rankB == null) {
      return -1;
    }
    return rankA - rankB;
  },

  /** Sortiert nach Rang Europa aufsteigend (Platz 1 zuerst); Gifte
   *  ohne Rangangabe werden ans Ende sortiert, alphabetisch als Fallback. */
  compareByRangEuropa(a, b) {
    const rankA = a.rangEuropa;
    const rankB = b.rangEuropa;
    if (rankA == null && rankB == null) {
      return a.name.localeCompare(b.name);
    }
    if (rankA == null) {
      return 1;
    }
    if (rankB == null) {
      return -1;
    }
    return rankA - rankB;
  },

  matchesFilter(gift) {
    switch (this.activeFilter) {
      case "favoriten":
        return GiftFavorites.isFavorite(gift.id);
      case "top50-weltweit":
        return gift.rangWeltweit != null && gift.rangWeltweit <= 50;
      case "top10-weltweit":
        return gift.rangWeltweit != null && gift.rangWeltweit <= 10;
      case "top25-europa":
        return gift.rangEuropa != null && gift.rangEuropa <= 25;
      case "synthetisch":
        return !gift.natürlichenUrsprungs;
      case "natuerlich":
        return Boolean(gift.natürlichenUrsprungs);
      default:
        return true;
    }
  },

  setFilter(filterId) {
    this.activeFilter = filterId;
    this.filterButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.giftFilter === filterId);
    });
    this.updateTopbarTitle();
    // Filterwechsel führt zurück auf die Liste statt in ein Detail,
    // das evtl. gar nicht mehr zum Filter passt.
    if (isMobileViewport() && this.selectedId !== null) {
      this.closeDetail();
    }
    this.renderList();
  },

  /** Pfeiltasten (hoch/runter) navigieren durch die aktuelle Liste,
   *  solange kein Formularfeld fokussiert und kein Modal offen ist. */
  handleKeydown(event) {
    if (!this.editLockModalEl.hidden) {
      if (event.key === "Escape") {
        this.closeEditLockModal();
      }
      return;
    }
    if (!this.modalEl.hidden) {
      return;
    }
    if (!this.zoomModalEl.hidden) {
      if (event.key === "Escape") {
        this.closeStructureZoom();
      }
      return;
    }
    if (!this.compareModalEl.hidden) {
      if (event.key === "Escape") {
        this.closeCompareModal();
      }
      return;
    }
    const tag = event.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
      return;
    }
    if (event.key === "Escape") {
      if (this.selectedId !== null) {
        this.closeDetail();
      }
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }
    if (!this.currentList || this.currentList.length === 0) {
      return;
    }
    event.preventDefault();
    const currentIndex = this.currentList.findIndex((gift) => gift.id === this.selectedId);
    let nextIndex;
    if (currentIndex === -1) {
      nextIndex = 0;
    } else if (event.key === "ArrowDown") {
      nextIndex = Math.min(currentIndex + 1, this.currentList.length - 1);
    } else {
      nextIndex = Math.max(currentIndex - 1, 0);
    }
    const nextId = this.currentList[nextIndex].id;
    this.openDetail(nextId);
    this.scrollCardIntoView(nextId);
  },

  scrollCardIntoView(id) {
    const card = this.listEl.querySelector(`[data-gift-id="${id}"]`);
    if (card) {
      card.scrollIntoView({ block: "nearest" });
    }
  },

  highlightSelectedCard() {
    this.listEl.querySelectorAll("[data-gift-id]").forEach((card) => {
      card.classList.toggle("is-selected", card.dataset.giftId === this.selectedId);
    });
  },

  /** Zeigt ein Gift schön aufbereitet im Detail-Panel an. Auf dem Handy
   *  ist das ein Vollbild-Overlay, das als eigener History-Eintrag
   *  registriert wird (Zurück-Button/Wischgeste schließen es). */
  async openDetail(id) {
    const gift = await GiftApi.getById(id);
    if (!gift) {
      return;
    }
    this.selectedId = id;
    this.detailEl.innerHTML = renderGiftDetail(gift);
    this.detailEl.hidden = false;
    this.detailEl.scrollTop = 0;
    this.highlightSelectedCard();
    if (isMobileViewport()) {
      this.moveDetailToOverlay();
      BackStack.push("gift-detail", () => this.closeDetailImmediate());
    }
  },

  /**
   * Hängt das Detail-Panel als Vollbild-Overlay direkt unter <body>.
   *
   * Grund: WebKit/iOS behandelt `position: fixed` innerhalb eines
   * scrollenden Containers fehlerhaft – das Panel würde dort an
   * `.app-content` ausgerichtet und die Zurück-Leiste unter der Topbar
   * verschwinden. Auf <body> gibt es keinen scrollenden Vorfahren.
   */
  moveDetailToOverlay() {
    if (this.detailEl.parentElement !== document.body) {
      document.body.appendChild(this.detailEl);
    }
  },

  /** Setzt das Detail-Panel zurück an seinen Platz neben der Liste. */
  moveDetailToColumn() {
    if (this.detailEl.parentElement !== this.detailHomeEl) {
      this.detailHomeEl.appendChild(this.detailEl);
    }
  },

  /** Schließt das Detail – auf dem Handy über die History, damit kein
   *  toter History-Eintrag zurückbleibt. */
  closeDetail() {
    if (BackStack.close("gift-detail")) {
      return;
    }
    this.closeDetailImmediate();
  },

  closeDetailImmediate() {
    this.selectedId = null;
    this.detailEl.hidden = true;
    this.detailEl.innerHTML = "";
    this.moveDetailToColumn();
    this.highlightSelectedCard();
  },

  openCreateModal() {
    if (!EditLock.isUnlocked()) {
      return;
    }
    this.modalTitleEl.textContent = "Neues Gift anlegen";
    fillGiftForm(this.formEl, null);
    this.modalEl.hidden = false;
    BackStack.push("gift-modal", () => this.closeModalImmediate());
  },

  async openEditModal(id) {
    if (!EditLock.isUnlocked()) {
      return;
    }
    const gift = await GiftApi.getById(id);
    if (!gift) {
      return;
    }
    this.modalTitleEl.textContent = "Gift bearbeiten";
    fillGiftForm(this.formEl, gift);
    this.modalEl.hidden = false;
    BackStack.push("gift-modal", () => this.closeModalImmediate());
  },

  closeModal() {
    if (BackStack.close("gift-modal")) {
      return;
    }
    this.closeModalImmediate();
  },

  closeModalImmediate() {
    this.modalEl.hidden = true;
  },

  async handleSubmit(event) {
    event.preventDefault();
    if (!EditLock.isUnlocked()) {
      this.closeModal();
      return;
    }
    const data = readGiftForm(this.formEl);
    const errors = validateGift(data);
    if (errors.length) {
      showToast(errors.join(" "), "error");
      return;
    }
    if (data.id) {
      await GiftApi.update(data.id, data);
      showToast(`"${data.name}" wurde aktualisiert.`, "success");
    } else {
      await GiftApi.create(data);
      showToast(`"${data.name}" wurde angelegt.`, "success");
    }
    this.closeModal();
    await this.renderList();
    // Detail-Panel aktualisieren, falls gerade dieses Gift angezeigt wird
    if (this.selectedId === data.id) {
      await this.openDetail(data.id);
    }
  },

  /** Klicks in der Liste: Bearbeiten/Löschen-Buttons ODER Klick auf die Karte selbst (öffnet Detail-Panel). */
  async handleListClick(event) {
    const card = event.target.closest("[data-gift-id]");
    if (!card) {
      return;
    }
    const id = card.dataset.giftId;
    const button = event.target.closest("button[data-action]");
    if (!button) {
      await this.openDetail(id);
      return;
    }
    if (button.dataset.action === "edit") {
      await this.openEditModal(id);
    } else if (button.dataset.action === "delete") {
      await this.deleteGift(id);
    } else if (button.dataset.action === "favorite") {
      this.toggleFavorite(id);
    } else if (button.dataset.action === "compare") {
      this.toggleCompareMark(id);
    }
  },

  /** Schaltet den Favoriten-Status eines Gifts um und rendert Liste/Detail neu. */
  async toggleFavorite(id) {
    const isFavoriteNow = GiftFavorites.toggle(id);
    if (this.activeFilter === "favoriten") {
      await this.renderList();
    } else {
      this.listEl.querySelectorAll(`[data-gift-id="${id}"] [data-action="favorite"]`).forEach((btn) => {
        btn.classList.toggle("is-favorite", isFavoriteNow);
        btn.textContent = isFavoriteNow ? "★" : "☆";
        btn.title = isFavoriteNow ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen";
      });
    }
    if (this.selectedId === id) {
      await this.openDetail(id);
    }
  },

  /** Klicks im Detail-Panel: Schließen, Favorit umschalten, Strukturbild vergrößern. */
  handleDetailClick(event) {
    if (event.target.closest("[data-gift-detail-close]")) {
      this.closeDetail();
      return;
    }
    const favoriteButton = event.target.closest('[data-action="favorite"]');
    if (favoriteButton) {
      this.toggleFavorite(this.selectedId);
      return;
    }
    const compareButton = event.target.closest('[data-action="compare"]');
    if (compareButton) {
      this.toggleCompareMark(this.selectedId);
      return;
    }
    const zoomTrigger = event.target.closest("[data-gift-structure-zoom]");
    if (zoomTrigger) {
      this.openStructureZoom(zoomTrigger.dataset.giftStructureSrc, zoomTrigger.dataset.giftStructureName);
    }
  },

  openStructureZoom(src, name) {
    this.zoomImgEl.src = src;
    this.zoomImgEl.alt = `Chemische Struktur von ${name}`;
    this.zoomCaptionEl.textContent = name;
    this.zoomModalEl.hidden = false;
    BackStack.push("gift-structure-zoom", () => this.closeStructureZoomImmediate());
  },

  closeStructureZoom() {
    if (BackStack.close("gift-structure-zoom")) {
      return;
    }
    this.closeStructureZoomImmediate();
  },

  closeStructureZoomImmediate() {
    this.zoomModalEl.hidden = true;
    this.zoomImgEl.src = "";
  },

  /** Schaltet die Vergleichs-Markierung eines Gifts um (⚖️-Button auf
   *  Karte/Detail). Sind bereits zwei Gifte markiert, ersetzt die
   *  neue Markierung die zweite (siehe gift.compare-selection.js).
   *  Sobald zwei Gifte markiert sind, öffnet sich das Vergleichsmodal
   *  automatisch mit der fertigen Tabelle – ein Auswahl-Dialog mit
   *  zwei Dropdowns entfällt dadurch. */
  toggleCompareMark(id) {
    const result = GiftCompareSelection.toggle(id);
    this.updateCompareMarkUi();
    if (result.full) {
      this.openCompareModal();
    } else if (!this.compareModalEl.hidden) {
      this.renderCompareTable();
    }
  },

  /** Aktualisiert die ⚖️-Buttons in Liste und Detail-Panel (analog zu toggleFavorite), ohne komplett neu zu rendern. */
  updateCompareMarkUi() {
    document.querySelectorAll('[data-action="compare"]').forEach((button) => {
      const card = button.closest("[data-gift-id]");
      const id = card ? card.dataset.giftId : this.selectedId;
      const marked = GiftCompareSelection.isMarked(id);
      button.classList.toggle("is-marked", marked);
      button.title = marked ? "Markierung aufheben" : "Zum Vergleich markieren";
      if (card) {
        card.classList.toggle("gift-card--compare-marked", marked);
      }
    });
    const detailBadgeEl = this.detailEl.querySelector("[data-gift-compare-badge]");
    if (detailBadgeEl) {
      detailBadgeEl.hidden = !GiftCompareSelection.isMarked(this.selectedId);
    }
  },

  /** Öffnet das Vergleichsmodal mit den aktuell markierten Giften (⚖️),
   *  oder einem Hinweis, solange noch nicht zwei markiert sind. */
  async openCompareModal() {
    const gifte = await GiftApi.getAll();
    this.compareGifte = gifte;
    this.renderCompareTable();
    this.compareModalEl.hidden = false;
    BackStack.push("gift-compare-modal", () => this.closeCompareModalImmediate());
  },

  closeCompareModal() {
    if (BackStack.close("gift-compare-modal")) {
      return;
    }
    this.closeCompareModalImmediate();
  },

  closeCompareModalImmediate() {
    this.compareModalEl.hidden = true;
  },

  renderCompareTable() {
    const [idA, idB] = GiftCompareSelection.getAll();
    const giftA = (this.compareGifte ?? []).find((gift) => gift.id === idA) ?? null;
    const giftB = (this.compareGifte ?? []).find((gift) => gift.id === idB) ?? null;
    this.compareTableEl.innerHTML = renderGiftCompareTable(giftA, giftB);
  },

  async deleteGift(id) {
    if (!EditLock.isUnlocked()) {
      return;
    }
    const gift = await GiftApi.getById(id);
    const confirmed = window.confirm(`"${gift?.name ?? "dieses Gift"}" wirklich löschen?`);
    if (!confirmed) {
      return;
    }
    await GiftApi.remove(id);
    GiftCompareSelection.remove(id);
    showToast(`"${gift?.name ?? "Eintrag"}" wurde gelöscht.`, "success");
    if (this.selectedId === id) {
      this.closeDetail();
    }
    await this.renderList();
  },
};
