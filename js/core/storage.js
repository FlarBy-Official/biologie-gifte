/**
 * core/storage.js
 *
 * Generischer, Promise-basierter LocalStorage-Wrapper. Jede Domain
 * legt sich damit ihren eigenen isolierten Storage unter einem
 * eindeutigen Key an (Konvention: "bg.<domain>.items").
 *
 * Absichtlich Promise-basiert, obwohl LocalStorage synchron ist:
 * Wenn später ein echtes Backend angebunden wird, ändert sich nur
 * die jeweilige "*.api.js" der Domain (z.B. fetch() statt
 * StorageService) – die Aufrufer-Signatur bleibt gleich.
 *
 * @param {string} storageKey eindeutiger LocalStorage-Key der Domain
 */
export function createStorageService(storageKey) {
  function readRaw() {
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.error(`[storage] Konnte "${storageKey}" nicht lesen:`, error);
      return [];
    }
  }

  function writeRaw(items) {
    window.localStorage.setItem(storageKey, JSON.stringify(items));
  }

  return {
    /** Liefert alle gespeicherten Einträge. */
    getAll() {
      return Promise.resolve(readRaw());
    },

    /** Liefert einen einzelnen Eintrag per ID oder null. */
    getById(id) {
      const item = readRaw().find((entry) => entry.id === id) ?? null;
      return Promise.resolve(item);
    },

    /** Ersetzt den kompletten Datensatz (z.B. für Seed-Daten). */
    replaceAll(items) {
      writeRaw(items);
      return Promise.resolve(items);
    },

    /** Fügt einen neuen Eintrag hinzu. */
    add(item) {
      const items = readRaw();
      items.push(item);
      writeRaw(items);
      return Promise.resolve(item);
    },

    /** Aktualisiert einen bestehenden Eintrag per ID (merge). */
    update(id, patch) {
      const items = readRaw();
      const index = items.findIndex((entry) => entry.id === id);
      if (index === -1) {
        return Promise.reject(new Error(`Eintrag mit id "${id}" nicht gefunden.`));
      }
      items[index] = { ...items[index], ...patch };
      writeRaw(items);
      return Promise.resolve(items[index]);
    },

    /** Entfernt einen Eintrag per ID. */
    remove(id) {
      const items = readRaw().filter((entry) => entry.id !== id);
      writeRaw(items);
      return Promise.resolve(true);
    },

    /** Leert den kompletten Storage dieser Domain. */
    clear() {
      window.localStorage.removeItem(storageKey);
      return Promise.resolve(true);
    },

    /** True, wenn unter diesem Key noch nichts gespeichert ist. */
    isEmpty() {
      return Promise.resolve(readRaw().length === 0);
    },
  };
}
