/**
 * domains/gift/gift.resizer.js
 *
 * Ziehbarer Slider zwischen Liste und Detail-Panel (nur Desktop –
 * auf dem Handy liegen Liste/Detail als getrennte "Seiten"
 * übereinander, siehe AGENTS.md „Responsive Design“). Passt die
 * Breite der Listen-Spalte per Pointer-Drag oder Pfeiltasten an und
 * merkt sich die zuletzt gewählte Breite in LocalStorage, damit sie
 * über Neuladen hinweg erhalten bleibt.
 */
const WIDTH_STORAGE_KEY = "bg.gift.listWidth";
const MIN_WIDTH = 320;
const MAX_WIDTH = 1000;
const DEFAULT_WIDTH = 720;
const KEYBOARD_STEP = 24;

function clamp(width) {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));
}

function readStoredWidth() {
  const raw = Number(window.localStorage.getItem(WIDTH_STORAGE_KEY));
  return Number.isFinite(raw) && raw > 0 ? clamp(raw) : DEFAULT_WIDTH;
}

/** Registriert Drag-/Tastatur-Bedienung für den Slider. `listColumnEl`
 *  ist die Spalte, deren Breite verändert wird, `resizerEl` der
 *  ziehbare Handle dazwischen. */
export function initGiftResizer({ listColumnEl, resizerEl }) {
  function applyWidth(width) {
    const rounded = Math.round(width);
    listColumnEl.style.flexBasis = `${rounded}px`;
    listColumnEl.style.width = `${rounded}px`;
    resizerEl.setAttribute("aria-valuenow", String(rounded));
    return rounded;
  }

  function persistWidth(width) {
    window.localStorage.setItem(WIDTH_STORAGE_KEY, String(width));
  }

  resizerEl.setAttribute("aria-valuemin", String(MIN_WIDTH));
  resizerEl.setAttribute("aria-valuemax", String(MAX_WIDTH));
  applyWidth(readStoredWidth());

  let dragStartX = 0;
  let dragStartWidth = 0;
  let dragging = false;

  function handlePointerMove(event) {
    if (!dragging) return;
    applyWidth(clamp(dragStartWidth + (event.clientX - dragStartX)));
  }

  function stopDragging() {
    if (!dragging) return;
    dragging = false;
    document.body.classList.remove("is-resizing-gift-columns");
    persistWidth(Math.round(listColumnEl.getBoundingClientRect().width));
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", stopDragging);
  }

  resizerEl.addEventListener("pointerdown", (event) => {
    dragging = true;
    dragStartX = event.clientX;
    dragStartWidth = listColumnEl.getBoundingClientRect().width;
    document.body.classList.add("is-resizing-gift-columns");
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);
    event.preventDefault();
  });

  resizerEl.addEventListener("keydown", (event) => {
    const currentWidth = listColumnEl.getBoundingClientRect().width;
    if (event.key === "ArrowLeft") {
      persistWidth(applyWidth(clamp(currentWidth - KEYBOARD_STEP)));
      event.preventDefault();
    } else if (event.key === "ArrowRight") {
      persistWidth(applyWidth(clamp(currentWidth + KEYBOARD_STEP)));
      event.preventDefault();
    }
  });
}
