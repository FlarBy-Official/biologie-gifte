/**
 * domains/gift/gift.favorites.js
 *
 * Verwaltet die Favoriten-/Merkliste der Gift-Domain. Speichert
 * lediglich eine Liste von Gift-IDs unter einem eigenen
 * LocalStorage-Key ("bg.gift.favorites"), getrennt vom eigentlichen
 * Gift-Datensatz (bg.gift.items), damit ein späterer Wechsel auf ein
 * echtes Backend die Favoriten unberührt lassen kann.
 */
const FAVORITES_STORAGE_KEY = "bg.gift.favorites";

function readIds() {
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (error) {
    console.error("[gift.favorites] Konnte Favoriten nicht lesen:", error);
    return new Set();
  }
}

function writeIds(ids) {
  window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...ids]));
}

export const GiftFavorites = {
  /** Liefert die Menge aller favorisierten Gift-IDs. */
  getAll() {
    return readIds();
  },

  isFavorite(id) {
    return readIds().has(id);
  },

  /** Schaltet den Favoriten-Status eines Gifts um und liefert den neuen Zustand zurück. */
  toggle(id) {
    const ids = readIds();
    let isFavoriteNow;
    if (ids.has(id)) {
      ids.delete(id);
      isFavoriteNow = false;
    } else {
      ids.add(id);
      isFavoriteNow = true;
    }
    writeIds(ids);
    return isFavoriteNow;
  },
};
