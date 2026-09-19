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
import { createStorageService } from "../../core/storage.js?v=5";
import { createGift } from "./gift.model.js?v=5";
import { GIFT_SEED_DATA } from "./gift.seed.js?v=5";

const STORAGE_KEY = "bg.gift.items";
const storage = createStorageService(STORAGE_KEY);

// Öffentliche, rohe JSON-Datei im GitHub-Repo. Dient als "Quelle der
// Wahrheit" für die Seed-Daten, damit neue/aktualisierte Gifte, die im
// Repo gepflegt werden, auch bei bereits installierten Nutzern ohne
// App-Update ankommen (siehe seedIfEmpty()).
const SEED_DATA_URL =
  "https://raw.githubusercontent.com/FlarBy-Official/biologie-gifte/main/data/gifte.json";
const SEED_FETCH_TIMEOUT_MS = 4000;

/**
 * Lädt die aktuellen Seed-Daten von GitHub. Wirft bei Netzwerkfehlern,
 * Timeout, HTTP-Fehlerstatus oder unerwartetem Format (kein/leeres
 * Array), damit der Aufrufer auf die gebündelten Seed-Daten
 * zurückfallen kann (z.B. wenn das Netzwerk externe Domains blockiert).
 */
async function fetchRemoteSeedData() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SEED_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(SEED_DATA_URL, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Unerwarteter Status beim Laden der Seed-Daten: ${response.status}`);
    }
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Seed-Daten von GitHub sind kein/leeres Array.");
    }
    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Befüllt den Storage beim allerersten Start mit Seed-Daten (bekannte,
 * recherchierte Gifte), falls noch nichts gespeichert ist. Versucht
 * zuerst, die aktuellsten Daten von GitHub zu laden; schlägt das fehl
 * (z.B. kein Netz, Domain blockiert), wird auf die im Bundle
 * mitgelieferten Seed-Daten (gift.seed.js) zurückgefallen.
 */
async function seedIfEmpty() {
  const isEmpty = await storage.isEmpty();
  if (!isEmpty) {
    return;
  }
  let rawData;
  try {
    rawData = await fetchRemoteSeedData();
  } catch (error) {
    console.warn("Konnte Gift-Seed-Daten nicht von GitHub laden, nutze gebündelte Daten.", error);
    rawData = GIFT_SEED_DATA;
  }
  const seeded = rawData.map((entry) => createGift(entry));
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
