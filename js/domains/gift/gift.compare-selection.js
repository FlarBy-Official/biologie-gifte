/**
 * domains/gift/gift.compare-selection.js
 *
 * Verwaltet, welche Gifte aktuell für den Vergleich markiert sind
 * (⚖️-Button auf Karte/Detail). Bewusst nur im Arbeitsspeicher (kein
 * LocalStorage) und auf maximal zwei Einträge begrenzt: Sobald zwei
 * Gifte markiert sind, öffnet gift.controller.js automatisch das
 * Vergleichsmodal mit der fertigen Tabelle – ein Auswahl-Dialog mit
 * zwei Dropdowns ist dadurch nicht mehr nötig. Die Markierung ist
 * eine kurzlebige Bedienhilfe für den aktuellen Besuch, kein
 * dauerhafter Zustand wie Favoriten.
 */
const MAX_MARKED = 2;
let markedIds = [];

export const GiftCompareSelection = {
  /** Liefert die aktuell markierten Gift-IDs in Markierungs-Reihenfolge. */
  getAll() {
    return [...markedIds];
  },

  isMarked(id) {
    return markedIds.includes(id);
  },

  count() {
    return markedIds.length;
  },

  /** Schaltet die Markierung eines Gifts um. Liefert
   *  { changed, full }: `changed` ist aktuell immer true (siehe
   *  unten). `full` ist true, sobald danach genau zwei Gifte
   *  markiert sind. Sind schon zwei markiert und ein drittes Gift
   *  wird angeklickt, ersetzt es das zweite (zuletzt markierte) –
   *  das zuerst markierte bleibt erhalten, damit man nicht von vorn
   *  anfangen muss. */
  toggle(id) {
    if (markedIds.includes(id)) {
      markedIds = markedIds.filter((markedId) => markedId !== id);
      return { changed: true, full: false };
    }
    if (markedIds.length < MAX_MARKED) {
      markedIds.push(id);
      return { changed: true, full: markedIds.length === MAX_MARKED };
    }
    markedIds = [markedIds[0], id];
    return { changed: true, full: true };
  },

  /** Entfernt ein Gift aus der Markierung, z.B. wenn es gelöscht wurde. */
  remove(id) {
    markedIds = markedIds.filter((markedId) => markedId !== id);
  },

  clear() {
    markedIds = [];
  },
};
