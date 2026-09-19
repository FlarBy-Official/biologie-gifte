/**
 * core/back-stack.js
 *
 * Verbindet "Overlays" (Detail-Panel im Vollbild, Modals, Mobile-Drawer)
 * mit der Browser-History, damit der Hardware-/Browser-Zurück-Button und
 * die iOS-Wischgeste ("Swipe back") das oberste Overlay schließen statt
 * die App zu verlassen.
 *
 * Nutzung:
 *   BackStack.init();                       // einmalig in app.js
 *   BackStack.push("gift-detail", () => …); // beim Öffnen
 *   BackStack.close("gift-detail");         // beim Schließen per UI
 *
 * Overlays werden als LIFO-Stapel behandelt (zuletzt geöffnetes zuerst
 * geschlossen). Das entspricht dem Verhalten der App: ein Modal liegt
 * immer über dem Detail-Panel und wird zuerst wieder geschlossen.
 */
export const BackStack = {
  entries: [],
  initialized: false,
  /** Anzahl der popstate-Events, die von uns selbst ausgelöst wurden
   *  (durch close()) und deshalb nichts mehr schließen sollen. */
  pendingSelfPops: 0,

  init() {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    window.addEventListener("popstate", () => {
      if (this.pendingSelfPops > 0) {
        this.pendingSelfPops -= 1;
        return;
      }
      const entry = this.entries.pop();
      if (entry) {
        entry.onClose();
      }
    });
  },

  /** Ist für dieses Overlay bereits ein History-Eintrag vorhanden? */
  has(id) {
    return this.entries.some((entry) => entry.id === id);
  },

  /**
   * Registriert ein geöffnetes Overlay und legt dafür einen
   * History-Eintrag an. `onClose` wird aufgerufen, wenn der Nutzer
   * zurück navigiert (Browser-Button, iOS-Wischgeste).
   */
  push(id, onClose) {
    if (this.has(id)) {
      return;
    }
    this.entries.push({ id, onClose });
    window.history.pushState({ overlay: id }, "");
  },

  /**
   * Schließt ein Overlay, das per push() registriert wurde.
   *
   * Das Schließen passiert **synchron** (onClose wird sofort
   * aufgerufen), damit direkt danach laufender Code bereits den neuen
   * Zustand sieht. Der zugehörige History-Eintrag wird anschließend
   * per history.back() abgeräumt; das dadurch ausgelöste popstate
   * wird über pendingSelfPops übersprungen.
   *
   * Rückgabe: true, wenn ein Eintrag gefunden und geschlossen wurde.
   */
  close(id) {
    const index = this.entries.findIndex((entry) => entry.id === id);
    if (index === -1) {
      return false;
    }
    // Overlays sind ein LIFO-Stapel: alles, was über dem gesuchten
    // Eintrag liegt, wird mitgeschlossen.
    const removed = this.entries.splice(index);
    removed.reverse().forEach((entry) => entry.onClose());
    this.pendingSelfPops += removed.length;
    window.history.go(-removed.length);
    return true;
  },

  /**
   * Entfernt einen Eintrag ohne History-Navigation und ohne onClose
   * aufzurufen – für Fälle, in denen das Overlay durch einen
   * Layout-Wechsel (z.B. Mobile -> Desktop) bedeutungslos wird.
   */
  drop(id) {
    const index = this.entries.findIndex((entry) => entry.id === id);
    if (index !== -1) {
      this.entries.splice(index, 1);
    }
  },
};
