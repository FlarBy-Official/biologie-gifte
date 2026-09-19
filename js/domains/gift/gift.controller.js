/**
 * domains/gift/gift.controller.js
 *
 * "Verhalten im Browser" der Gift-Domain: registriert Event-Listener
 * (Suche, Formular absenden, Bearbeiten, Löschen) und orchestriert
 * gift.api.js (Persistenz) + gift.ui.js (Rendering).
 */
import { GiftApi } from "./gift.api.js?v=3";
import { validateGift } from "./gift.model.js?v=3";
import { renderGiftList, renderGiftDetail, fillGiftForm, readGiftForm } from "./gift.ui.js?v=3";
import { GiftFavorites } from "./gift.favorites.js?v=3";
import { EditLock } from "../../core/edit-lock.js?v=3";
import { debounce, showToast } from "../../core/utils.js?v=3";

export const GiftController = {
  selectedId: null,
  activeFilter: "all",
  currentList: [],

  async init() {
    this.listEl = document.querySelector("[data-gift-list]");
    this.detailEl = document.querySelector("[data-gift-detail]");
    this.searchEl = document.querySelector("[data-gift-search]");
    this.modalEl = document.querySelector("[data-gift-modal]");
    this.formEl = document.querySelector("[data-gift-form]");
    this.modalTitleEl = document.querySelector("[data-gift-modal-title]");
    this.filterButtons = document.querySelectorAll("[data-gift-filter]");
    this.zoomModalEl = document.querySelector("[data-gift-structure-zoom-modal]");
    this.zoomImgEl = document.querySelector("[data-gift-structure-zoom-img]");
    this.zoomCaptionEl = document.querySelector("[data-gift-structure-zoom-caption]");
    this.newButtonEl = document.querySelector("[data-gift-new]");
    this.editLockToggleEl = document.querySelector("[data-edit-lock-toggle]");
    this.editLockModalEl = document.querySelector("[data-edit-lock-modal]");
    this.editLockFormEl = document.querySelector("[data-edit-lock-form]");
    this.editLockErrorEl = document.querySelector("[data-edit-lock-error]");
    this.editLockPinEl = document.getElementById("edit-lock-pin");

    this.filterButtons.forEach((button) => {
      button.addEventListener("click", () => this.setFilter(button.dataset.giftFilter));
    });

    this.newButtonEl.addEventListener("click", () => this.openCreateModal());
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
    await this.renderList();
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
    this.editLockFormEl.reset();
    this.editLockErrorEl.hidden = true;
    this.editLockModalEl.hidden = false;
    this.editLockPinEl.focus();
  },

  closeEditLockModal() {
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
      .sort((a, b) => this.compareByRangWeltweit(a, b));
    this.currentList = filtered;
    renderGiftList(this.listEl, filtered);
    this.highlightSelectedCard();
    await this.ensureSelection();
  },

  /** Wählt automatisch das erste Gift der aktuellen Liste aus, sobald
   *  die aktuelle Auswahl nicht mehr Teil der (gefilterten) Liste ist. */
  async ensureSelection() {
    if (this.currentList.length === 0) {
      if (this.selectedId !== null) {
        this.closeDetail();
      }
      return;
    }
    const stillPresent = this.currentList.some((gift) => gift.id === this.selectedId);
    if (!stillPresent) {
      await this.openDetail(this.currentList[0].id);
    }
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
    const tag = event.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
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

  /** Zeigt ein Gift schön aufbereitet im rechten Detail-Panel an. */
  async openDetail(id) {
    const gift = await GiftApi.getById(id);
    if (!gift) {
      return;
    }
    this.selectedId = id;
    this.detailEl.innerHTML = renderGiftDetail(gift);
    this.detailEl.hidden = false;
    this.highlightSelectedCard();
  },

  closeDetail() {
    this.selectedId = null;
    this.detailEl.hidden = true;
    this.detailEl.innerHTML = "";
    this.highlightSelectedCard();
  },

  openCreateModal() {
    if (!EditLock.isUnlocked()) {
      return;
    }
    this.modalTitleEl.textContent = "Neues Gift anlegen";
    fillGiftForm(this.formEl, null);
    this.modalEl.hidden = false;
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
  },

  closeModal() {
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
  },

  closeStructureZoom() {
    this.zoomModalEl.hidden = true;
    this.zoomImgEl.src = "";
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
    showToast(`"${gift?.name ?? "Eintrag"}" wurde gelöscht.`, "success");
    if (this.selectedId === id) {
      this.closeDetail();
    }
    await this.renderList();
  },
};
