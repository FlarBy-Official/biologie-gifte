/**
 * domains/gift/gift.api.js
 *
 * "Backend-Anbindung" der Gift-Domain. Aktuell auf LocalStorage
 * gemappt (core/storage.js). Wenn später ein echtes Backend kommt,
 * wird ausschließlich diese Datei angepasst (z.B. fetch()-Aufrufe
 * gegen eine REST-API) – Model, UI und Controller bleiben
 * unverändert, solange die Funktionssignaturen (Promise-basiert)
 * gleich bleiben.
 */
import { createStorageService } from "../../core/storage.js?v=3";
import { createGift } from "./gift.model.js?v=3";
import { GIFT_SEED_DATA } from "./gift.seed.js?v=3";

const STORAGE_KEY = "bg.gift.items";
const storage = createStorageService(STORAGE_KEY);

/**
 * Befüllt den Storage beim allerersten Start mit Seed-Daten
 * (bekannte, recherchierte Gifte), falls noch nichts gespeichert ist.
 */
async function seedIfEmpty() {
  const isEmpty = await storage.isEmpty();
  if (!isEmpty) {
    return;
  }
  const seeded = GIFT_SEED_DATA.map((entry) => createGift(entry));
  await storage.replaceAll(seeded);
}

export const GiftApi = {
  /** Stellt sicher, dass beim ersten Aufruf Seed-Daten vorhanden sind. */
  async init() {
    await seedIfEmpty();
  },

  /** Liefert alle Gifte, sortiert nach Name. */
  async getAll() {
    const items = await storage.getAll();
    return [...items].sort((a, b) => a.name.localeCompare(b.name, "de"));
  },

  /** Liefert ein einzelnes Gift per ID. */
  async getById(id) {
    return storage.getById(id);
  },

  /** Legt ein neues Gift an. */
  async create(formData) {
    const gift = createGift(formData);
    return storage.add(gift);
  },

  /** Aktualisiert ein bestehendes Gift. */
  async update(id, formData) {
    const existing = await storage.getById(id);
    const merged = createGift({ ...existing, ...formData, id });
    return storage.update(id, merged);
  },

  /** Löscht ein Gift per ID. */
  async remove(id) {
    return storage.remove(id);
  },
};
