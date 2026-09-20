/**
 * domains/gift/gift.model.js
 *
 * Reine Datenstruktur + Validierung für die Domain "Gift".
 * Kein DOM-Zugriff, kein Storage-Zugriff.
 */
import { createId, nowIso } from "../../core/utils.js?v=8";

/** Erlaubte Werte für das Kategorie-Feld. */
export const GIFT_KATEGORIEN = ["Pflanze", "Tier", "Pilz", "Chemikalie", "Sonstiges"];

/** Erlaubte Einheiten für die letale Dosis. */
export const GIFT_DOSIS_EINHEITEN = ["mg/kg", "mg", "g", "ml", "Stück"];

/**
 * Erzeugt ein neues Gift-Objekt mit generierter ID und Zeitstempeln
 * aus rohen Formular-/Import-Daten. Fehlende Felder werden mit
 * sinnvollen Leerwerten aufgefüllt.
 *
 * @param {object} data Rohdaten (z.B. aus dem Formular oder Seed-Daten)
 * @returns {object} vollständiges Gift-Datenobjekt
 */
export function createGift(data = {}) {
  const timestamp = nowIso();
  return {
    id: data.id ?? createId(),
    name: data.name ?? "",
    wissenschaftlicherName: data.wissenschaftlicherName ?? "",
    kategorie: GIFT_KATEGORIEN.includes(data.kategorie) ? data.kategorie : "Sonstiges",
    natürlichenUrsprungs: Boolean(data.natürlichenUrsprungs),
    gefährlichFürMenschen: Boolean(data.gefährlichFürMenschen),
    gefährlichFürTiere: Boolean(data.gefährlichFürTiere),
    letaleDosis: {
      menge: data.letaleDosis?.menge === "" || data.letaleDosis?.menge === undefined
        ? null
        : Number(data.letaleDosis.menge),
      einheit: GIFT_DOSIS_EINHEITEN.includes(data.letaleDosis?.einheit)
        ? data.letaleDosis.einheit
        : "mg/kg",
      kontext: data.letaleDosis?.kontext ?? "",
    },
    rangWeltweit: data.rangWeltweit === "" || data.rangWeltweit === undefined || data.rangWeltweit === null
      ? null
      : Number(data.rangWeltweit),
    rangEuropa: data.rangEuropa === "" || data.rangEuropa === undefined || data.rangEuropa === null
      ? null
      : Number(data.rangEuropa),
    rangKontext: data.rangKontext ?? "",
    ort: data.ort ?? "",
    symptome: data.symptome ?? "",
    gegenmittel: data.gegenmittel ?? "",
    quelle: data.quelle ?? "",
    notizen: data.notizen ?? "",
    createdAt: data.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

/**
 * Validiert Gift-Formulardaten.
 * @returns {string[]} Liste an Fehlermeldungen (leer = valide)
 */
export function validateGift(data) {
  const errors = [];
  if (!data.name || !data.name.trim()) {
    errors.push("Name ist ein Pflichtfeld.");
  }
  if (!GIFT_KATEGORIEN.includes(data.kategorie)) {
    errors.push("Kategorie ist ungültig.");
  }
  if (data.letaleDosis?.menge !== null && data.letaleDosis?.menge !== undefined && data.letaleDosis?.menge !== "" && Number.isNaN(Number(data.letaleDosis.menge))) {
    errors.push("Letale Dosis muss eine Zahl sein.");
  }
  if (data.rangWeltweit !== null && data.rangWeltweit !== undefined && data.rangWeltweit !== "" && Number.isNaN(Number(data.rangWeltweit))) {
    errors.push("Rang weltweit muss eine Zahl sein.");
  }
  if (data.rangEuropa !== null && data.rangEuropa !== undefined && data.rangEuropa !== "" && Number.isNaN(Number(data.rangEuropa))) {
    errors.push("Rang Europa muss eine Zahl sein.");
  }
  return errors;
}
