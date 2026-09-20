/**
 * domains/gift/gift.ui.js
 *
 * Rendering / DOM-Erzeugung für die Gift-Domain. Enthält keine
 * Event-Listener-Logik (das übernimmt gift.controller.js), nur
 * Funktionen, die Daten in DOM/HTML umwandeln bzw. das Formular
 * befüllen/leeren.
 */
import { escapeHtml } from "../../core/utils.js?v=6";
import { GIFT_KATEGORIEN, GIFT_DOSIS_EINHEITEN } from "./gift.model.js?v=6";
import { getStructureImagePath } from "./gift.structures.js?v=6";
import { GiftFavorites } from "./gift.favorites.js?v=6";
import { EditLock } from "../../core/edit-lock.js?v=6";

const KATEGORIE_ICON = {
  Pflanze: "🌿",
  Tier: "🐍",
  Pilz: "🍄",
  Chemikalie: "⚗️",
  Sonstiges: "☠️",
};

function renderRangBadges(gift) {
  const badges = [];
  if (gift.rangWeltweit) {
    badges.push(`<span class="badge badge--danger" title="${escapeHtml(gift.rangKontext)}">#${escapeHtml(gift.rangWeltweit)} weltweit</span>`);
  }
  if (gift.rangEuropa) {
    badges.push(`<span class="badge badge--brand" title="${escapeHtml(gift.rangKontext)}">#${escapeHtml(gift.rangEuropa)} Europa</span>`);
  }
  return badges.join("");
}

function renderDosis(gift) {
  const { menge, einheit } = gift.letaleDosis ?? {};
  if (menge === null || menge === undefined || menge === "") {
    return "unbekannt";
  }
  return `${escapeHtml(menge)} ${escapeHtml(einheit)}`;
}

/** Baut das HTML für eine einzelne Gift-Karte. */
export function renderGiftCard(gift) {
  const icon = KATEGORIE_ICON[gift.kategorie] ?? "☠️";
  const isFavorite = GiftFavorites.isFavorite(gift.id);
  const unlocked = EditLock.isUnlocked();
  return `
    <article class="card gift-card--clickable" data-gift-id="${escapeHtml(gift.id)}" tabindex="0">
      <div class="card__header">
        <div>
          <div class="card__title"><span class="gift-category-icon">${icon}</span> ${escapeHtml(gift.name)}</div>
          ${gift.wissenschaftlicherName ? `<div class="card__subtitle">${escapeHtml(gift.wissenschaftlicherName)}</div>` : ""}
        </div>
        <div class="card__actions">
          <button type="button" class="btn btn--icon gift-favorite-btn${isFavorite ? " is-favorite" : ""}" data-action="favorite" title="${isFavorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}">${isFavorite ? "★" : "☆"}</button>
          <button type="button" class="btn btn--icon" data-action="compare" title="Vergleichen">⚖️</button>
          ${unlocked ? `<button type="button" class="btn btn--icon" data-action="edit" title="Bearbeiten">✏️</button>` : ""}
          ${unlocked ? `<button type="button" class="btn btn--icon" data-action="delete" title="Löschen">🗑️</button>` : ""}
        </div>
      </div>
      <div class="card__body">
        <div class="card__row"><span class="card__row-label">Letale Dosis:</span> <span class="gift-card__dose">${renderDosis(gift)}</span></div>
        ${gift.ort ? `<div class="card__row"><span class="card__row-label">Vorkommen:</span> ${escapeHtml(gift.ort)}</div>` : ""}
        ${gift.symptome ? `<div class="card__row"><span class="card__row-label">Symptome:</span> ${escapeHtml(gift.symptome)}</div>` : ""}
      </div>
      <div class="card__footer">
        <span class="badge badge--muted">${escapeHtml(gift.kategorie)}</span>
        ${gift.natürlichenUrsprungs ? '<span class="badge badge--success">natürlich</span>' : '<span class="badge badge--muted">synthetisch</span>'}
        ${gift.gefährlichFürMenschen ? '<span class="badge badge--danger">gefährlich f. Menschen</span>' : ""}
        ${gift.gefährlichFürTiere ? '<span class="badge badge--danger">gefährlich f. Tiere</span>' : ""}
        <span class="gift-card__rank-list">${renderRangBadges(gift)}</span>
      </div>
    </article>
  `;
}

function detailSection(title, body) {
  if (!body) {
    return "";
  }
  return `
    <div class="gift-detail__section">
      <div class="gift-detail__section-title">${escapeHtml(title)}</div>
      <div class="gift-detail__section-body">${escapeHtml(body)}</div>
    </div>
  `;
}

/** Baut das HTML für das Strukturbild eines Gifts (falls lokal
 *  hinterlegt). Da die Bilder lokal im Repo liegen (kein Live-Fetch
 *  von PubChem im Browser des Nutzers), ist kein Fallback-/Retry-
 *  Mechanismus nötig. */
function renderStructureImage(gift) {
  const path = getStructureImagePath(gift);
  if (!path) {
    return `
    <div class="gift-detail__structure gift-detail__structure--empty" data-gift-structure>
      <div class="gift-detail__structure-placeholder">Kein Strukturbild verfügbar</div>
    </div>
  `;
  }
  return `
    <div class="gift-detail__structure" data-gift-structure>
      <button
        type="button"
        class="gift-detail__structure-zoom-trigger"
        data-gift-structure-zoom
        data-gift-structure-src="${path}"
        data-gift-structure-name="${escapeHtml(gift.name)}"
        title="Strukturbild vergrößern"
      >
        <img
          class="gift-detail__structure-img"
          src="${path}"
          alt="Chemische Struktur von ${escapeHtml(gift.name)}"
          onerror="this.closest('[data-gift-structure]').innerHTML = '<div class=\\'gift-detail__structure-placeholder\\'>Kein Strukturbild verfügbar</div>'"
        />
      </button>
      <div class="gift-detail__structure-caption">Chemische Struktur (zum Vergrößern klicken)</div>
    </div>
  `;
}

/** Baut das HTML für das rechte Detail-Panel eines ausgewählten Gifts. */
export function renderGiftDetail(gift) {
  const icon = KATEGORIE_ICON[gift.kategorie] ?? "☠️";
  const badges = [
    `<span class="badge badge--muted">${escapeHtml(gift.kategorie)}</span>`,
    gift.natürlichenUrsprungs
      ? '<span class="badge badge--success">natürlich</span>'
      : '<span class="badge badge--muted">synthetisch</span>',
    gift.gefährlichFürMenschen ? '<span class="badge badge--danger">gefährlich f. Menschen</span>' : "",
    gift.gefährlichFürTiere ? '<span class="badge badge--danger">gefährlich f. Tiere</span>' : "",
    renderRangBadges(gift),
  ]
    .filter(Boolean)
    .join("");

  return `
    <div class="gift-detail__mobile-bar">
      <button type="button" class="btn btn--secondary gift-detail__back" data-gift-detail-close>‹ Zurück zur Liste</button>
      <span class="gift-detail__mobile-title">${escapeHtml(gift.name)}</span>
    </div>
    <div class="gift-detail__header">
      <div>
        <div class="gift-detail__title">${icon} ${escapeHtml(gift.name)}</div>
        ${gift.wissenschaftlicherName ? `<div class="gift-detail__subtitle">${escapeHtml(gift.wissenschaftlicherName)}</div>` : ""}
      </div>
      <div class="gift-detail__actions">
        <button type="button" class="btn btn--icon gift-favorite-btn${GiftFavorites.isFavorite(gift.id) ? " is-favorite" : ""}" data-action="favorite" title="${GiftFavorites.isFavorite(gift.id) ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}">${GiftFavorites.isFavorite(gift.id) ? "★" : "☆"}</button>
        <button type="button" class="btn btn--icon" data-action="compare" title="Vergleichen">⚖️</button>
        <button type="button" class="btn btn--icon" data-gift-detail-close title="Schließen">✕</button>
      </div>
    </div>
    <div class="gift-detail__badges">${badges}</div>
    ${detailSection("Letale Dosis", `${renderDosis(gift)}${gift.letaleDosis?.kontext ? ` – ${gift.letaleDosis.kontext}` : ""}`)}
    ${detailSection("Ranking", [gift.rangWeltweit ? `#${gift.rangWeltweit} weltweit` : "", gift.rangEuropa ? `#${gift.rangEuropa} Europa` : "", gift.rangKontext].filter(Boolean).join(" · "))}
    ${detailSection("Vorkommen / Ort", gift.ort)}
    ${detailSection("Symptome", gift.symptome)}
    ${detailSection("Gegenmittel", gift.gegenmittel)}
    ${detailSection("Notizen", gift.notizen)}
    ${gift.quelle ? `<div class="gift-detail__source">Quelle: ${escapeHtml(gift.quelle)}</div>` : ""}
    ${renderStructureImage(gift)}
  `;
}

/** Baut die `<option>`-Elemente für die Gift-Auswahl im Vergleichsmodal, alphabetisch sortiert. */
export function renderGiftCompareOptions(gifte) {
  return gifte
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((gift) => `<option value="${escapeHtml(gift.id)}">${escapeHtml(gift.name)}</option>`)
    .join("");
}

function compareRow(label, valueA, valueB) {
  return `
    <tr>
      <td class="gift-compare__label">${escapeHtml(label)}</td>
      <td>${escapeHtml(valueA)}</td>
      <td>${escapeHtml(valueB)}</td>
    </tr>
  `;
}

/** Vergleichszeile für Ränge: markiert die niedrigere (= gefährlichere) Platzierung mit 🏆. */
function compareRankRow(label, rankA, rankB) {
  const aIsBetter = rankA != null && (rankB == null || rankA < rankB);
  const bIsBetter = rankB != null && (rankA == null || rankB < rankA);
  const textA = rankA != null ? `#${rankA}` : "unbekannt";
  const textB = rankB != null ? `#${rankB}` : "unbekannt";
  return `
    <tr>
      <td class="gift-compare__label">${escapeHtml(label)}</td>
      <td class="${aIsBetter ? "gift-compare__cell--highlight" : ""}">${escapeHtml(textA)}${aIsBetter ? " 🏆" : ""}</td>
      <td class="${bIsBetter ? "gift-compare__cell--highlight" : ""}">${escapeHtml(textB)}${bIsBetter ? " 🏆" : ""}</td>
    </tr>
  `;
}

/** Baut die Vergleichstabelle für zwei Gifte (oder einen Hinweistext, falls eins fehlt). */
export function renderGiftCompareTable(giftA, giftB) {
  if (!giftA || !giftB) {
    return `<p class="gift-compare__hint">Bitte zwei Gifte auswählen, um sie zu vergleichen.</p>`;
  }
  const rows = [
    compareRow("Kategorie", giftA.kategorie, giftB.kategorie),
    compareRow(
      "Ursprung",
      giftA.natürlichenUrsprungs ? "natürlich" : "synthetisch",
      giftB.natürlichenUrsprungs ? "natürlich" : "synthetisch",
    ),
    compareRow("Gefährlich f. Menschen", giftA.gefährlichFürMenschen ? "Ja" : "Nein", giftB.gefährlichFürMenschen ? "Ja" : "Nein"),
    compareRow("Gefährlich f. Tiere", giftA.gefährlichFürTiere ? "Ja" : "Nein", giftB.gefährlichFürTiere ? "Ja" : "Nein"),
    compareRow("Letale Dosis", renderDosis(giftA), renderDosis(giftB)),
    compareRankRow("Rang weltweit", giftA.rangWeltweit, giftB.rangWeltweit),
    compareRankRow("Rang Europa", giftA.rangEuropa, giftB.rangEuropa),
    compareRow("Vorkommen", giftA.ort || "–", giftB.ort || "–"),
    compareRow("Symptome", giftA.symptome || "–", giftB.symptome || "–"),
    compareRow("Gegenmittel", giftA.gegenmittel || "–", giftB.gegenmittel || "–"),
  ].join("");

  return `
    <table class="gift-compare__table">
      <thead>
        <tr>
          <th></th>
          <th>${escapeHtml(giftA.name)}</th>
          <th>${escapeHtml(giftB.name)}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

/** Rendert die komplette Giftliste (oder einen Leerzustand). */
export function renderGiftList(container, gifte) {
  if (!gifte.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">☠️</div>
        <p>Keine Gifte gefunden.</p>
      </div>
    `;
    return;
  }
  container.innerHTML = `<div class="card-grid">${gifte.map(renderGiftCard).join("")}</div>`;
}

/** Befüllt das Formular-Modal mit den Werten eines Gifts (oder leert es). */
export function fillGiftForm(form, gift = null) {
  form.reset();
  form.elements.namedItem("id").value = gift?.id ?? "";
  form.elements.namedItem("name").value = gift?.name ?? "";
  form.elements.namedItem("wissenschaftlicherName").value = gift?.wissenschaftlicherName ?? "";
  form.elements.namedItem("kategorie").value = gift?.kategorie ?? GIFT_KATEGORIEN[0];
  form.elements.namedItem("natürlichenUrsprungs").checked = Boolean(gift?.natürlichenUrsprungs);
  form.elements.namedItem("gefährlichFürMenschen").checked = Boolean(gift?.gefährlichFürMenschen);
  form.elements.namedItem("gefährlichFürTiere").checked = Boolean(gift?.gefährlichFürTiere);
  form.elements.namedItem("dosisMenge").value = gift?.letaleDosis?.menge ?? "";
  form.elements.namedItem("dosisEinheit").value = gift?.letaleDosis?.einheit ?? GIFT_DOSIS_EINHEITEN[0];
  form.elements.namedItem("dosisKontext").value = gift?.letaleDosis?.kontext ?? "";
  form.elements.namedItem("rangWeltweit").value = gift?.rangWeltweit ?? "";
  form.elements.namedItem("rangEuropa").value = gift?.rangEuropa ?? "";
  form.elements.namedItem("rangKontext").value = gift?.rangKontext ?? "";
  form.elements.namedItem("ort").value = gift?.ort ?? "";
  form.elements.namedItem("symptome").value = gift?.symptome ?? "";
  form.elements.namedItem("gegenmittel").value = gift?.gegenmittel ?? "";
  form.elements.namedItem("quelle").value = gift?.quelle ?? "";
  form.elements.namedItem("notizen").value = gift?.notizen ?? "";
}

/** Liest die aktuellen Formularwerte in ein Rohdaten-Objekt für das Model. */
export function readGiftForm(form) {
  const el = (fieldName) => form.elements.namedItem(fieldName);
  return {
    id: el("id").value || undefined,
    name: el("name").value.trim(),
    wissenschaftlicherName: el("wissenschaftlicherName").value.trim(),
    kategorie: el("kategorie").value,
    natürlichenUrsprungs: el("natürlichenUrsprungs").checked,
    gefährlichFürMenschen: el("gefährlichFürMenschen").checked,
    gefährlichFürTiere: el("gefährlichFürTiere").checked,
    letaleDosis: {
      menge: el("dosisMenge").value,
      einheit: el("dosisEinheit").value,
      kontext: el("dosisKontext").value.trim(),
    },
    rangWeltweit: el("rangWeltweit").value,
    rangEuropa: el("rangEuropa").value,
    rangKontext: el("rangKontext").value.trim(),
    ort: el("ort").value.trim(),
    symptome: el("symptome").value.trim(),
    gegenmittel: el("gegenmittel").value.trim(),
    quelle: el("quelle").value.trim(),
    notizen: el("notizen").value.trim(),
  };
}
