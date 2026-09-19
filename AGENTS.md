# AGENTS.md – Architektur & Konventionen

Dieses Dokument beschreibt die Architektur der App, damit neue Domains
("kleine Apps") konsistent nach dem gleichen Muster hinzugefügt werden
können.

## Grundidee

Die App ist eine reine **Client-Side App** (HTML/CSS/JS, kein Build-Tool
nötig). Sie läuft direkt über einen statischen Webserver (z.B. den in
IntelliJ eingebauten Webserver via Rechtsklick auf `index.html` →
"Open in Browser" bzw. den integrierten Live-Preview-Server).

Die App ist **domain-getrieben** aufgebaut. Jede fachliche Domäne
(aktuell: `gift`) ist eine eigene "kleine App" mit eigenem CSS- und
JS-Ordner. Domains sind voneinander unabhängig und teilen sich nur den
`core`-Layer (Storage, Utils) und das Basis-Layout/-Styling.

## Ordnerstruktur

```
index.html                  Einstiegspunkt, bindet Domains ein
AGENTS.md                   dieses Dokument

css/
  base/                     Domain-unabhängiges Basis-Styling
    variables.css           Farben/Spacing/Radius als CSS-Variablen (Discord-Theme)
    reset.css                CSS-Reset / Normalisierung
    layout.css               Grundlayout (Sidebar, Content-Bereich, App-Shell)
    components.css           Wiederverwendbare UI-Bausteine (Buttons, Inputs, Cards, Badges, Toasts)
  domains/
    gift/
      gift.css               Styling speziell für die Gift-Domain
    <weitere-domain>/
      <domain>.css

js/
  core/
    storage.js               Generischer LocalStorage-Wrapper (CRUD), Promise-basiert
    utils.js                 Kleine Helfer (IDs, Datum, Escaping, Toast-Anzeige)
    viewport.js              Mobile-Breakpoint als einzige Quelle der Wahrheit für JS
    back-stack.js            Overlays (Detail/Modals/Drawer) an die Browser-History koppeln
    sidebar-drawer.js        Mobile Off-Canvas-Navigation (☰)
    theme.js                 Umschalten zwischen dunklem und hellem Design
    edit-lock.js             PIN-Sperre für Anlegen/Bearbeiten/Löschen
  domains/
    gift/
      gift.model.js           Datenmodell + Validierung für "Gift"
      gift.api.js              Persistenz-Layer ("Backend-Anbindung") – aktuell LocalStorage,
                                später 1:1 durch fetch()-Aufrufe gegen echtes Backend ersetzbar
      gift.ui.js                Rendering / DOM-Erzeugung (Karten, Formular befüllen)
      gift.controller.js        Verhalten im Browser: Event-Handling, verbindet ui.js mit api.js
    <weitere-domain>/
      <domain>.model.js
      <domain>.api.js
      <domain>.ui.js
      <domain>.controller.js
  app.js                      Bootstrapping: initialisiert alle Domain-Controller
```

## Schichten pro Domain

Jede Domain wird konsequent in 4 Dateien aufgeteilt, damit die
Verantwortlichkeiten klar getrennt sind und die "Backend-Anbindung"
später isoliert ausgetauscht werden kann:

1. **`*.model.js`** – reine Datenstruktur + Validierung (kein DOM, kein
   Storage-Zugriff). Erzeugt Objekte mit `id`, Zeitstempeln und
   Fachfeldern.
2. **`*.api.js`** – "Backend-Anbindung". Stellt asynchrone Funktionen
   (`getAll`, `getById`, `create`, `update`, `remove`) bereit. Nutzt
   aktuell `core/storage.js` (LocalStorage). Wenn später ein echtes
   Backend kommt, wird **nur diese Datei** angepasst (z.B. `fetch()`
   statt LocalStorage) – Model, UI und Controller bleiben unverändert.
3. **`*.ui.js`** – "Style/Darstellung im Browser". Baut DOM-Elemente
   (Karten-Listen, Formulare) und befüllt/leert sie. Enthält keine
   Event-Listener-Logik, nur Rendering-Funktionen.
4. **`*.controller.js`** – "Verhalten im Browser". Registriert
   Event-Listener (Formular absenden, Bearbeiten, Löschen), ruft
   `*.api.js` auf und lässt danach `*.ui.js` neu rendern.

## LocalStorage

`core/storage.js` kapselt den Zugriff auf `window.localStorage` hinter
einer generischen, Promise-basierten Schnittstelle
(`StorageService(key)` → `getAll/save/remove/clear`). Jede Domain nutzt
einen eigenen Storage-Key (z.B. `bg.gift.items`), damit Domains sich
nicht gegenseitig überschreiben.

Wenn später ein echtes Backend/Datenbank angebunden wird, ändert sich
nur `*.api.js` je Domain – die Storage-Key-Konvention entfällt dann
oder bleibt optional als Offline-Cache erhalten.

## Neue Domain hinzufügen (Checkliste)

1. `css/domains/<domain>/<domain>.css` anlegen, in `index.html`
   einbinden.
2. `js/domains/<domain>/` mit `<domain>.model.js`, `<domain>.api.js`,
   `<domain>.ui.js`, `<domain>.controller.js` anlegen.
3. Controller in `js/app.js` importieren und initialisieren.
4. Navigationseintrag in der Sidebar (`index.html`) + zugehörigen
   `<section>`-Container für die neue Domain ergänzen.
5. Eigenen LocalStorage-Key (Namensschema `bg.<domain>.items`) in der
   `api.js` der Domain verwenden.

## Styling

Das Theme lehnt sich an Discord an: dunkler Hintergrund, abgerundete
Karten, Sidebar-Navigation, Akzentfarbe Blurple (`#5865f2`). Alle
Farben/Radien/Abstände sind als CSS-Variablen in
`css/base/variables.css` zentral definiert – Domain-CSS-Dateien nutzen
ausschließlich diese Variablen, damit das Theme konsistent bleibt und
zentral angepasst werden kann.

## Responsive Design (Mobile-First-Pflicht)

Die App muss auf dem Handy genauso gut nutzbar sein wie am Desktop.
Das gilt für Basis-Layout **und** für jede Domain:

- **Basis-Layout** (`css/base/layout.css`): Unterhalb von 768px wird
  die Sidebar (`.app-sidebar`) zur **Off-Canvas-Drawer**: sie liegt
  `position: fixed` links außerhalb des Bildschirms und wird über den
  ☰-Button (`[data-sidebar-toggle]` in der Topbar) per
  `.app-shell.is-drawer-open` eingeblendet. Dahinter liegt
  `.app-sidebar-backdrop`. Die Drawer schließt bei Auswahl eines
  Nav-/Filter-Eintrags, Tippen auf den Backdrop, `Escape` und über den
  Zurück-Button (siehe „Back-Navigation"). Die Logik dazu steckt in
  `js/core/sidebar-drawer.js`.

### Scroll-Architektur (häufige Fehlerquelle)

- Am **Desktop** scrollen `.gift-list-column` und `.gift-detail`
  getrennt innerhalb der auf Bildschirmhöhe fixierten Shell. Auf dem
  **Handy** scrollt stattdessen `.app-content` als Ganzes; die inneren
  Spalten stehen dort auf `height: auto` / `overflow: visible`.
- **Jedes Flex-Item, das einen scrollenden Bereich enthält, braucht
  `min-height: 0`** (bzw. `min-width: 0` in Zeilenrichtung). Ohne das
  gilt die Inhaltshöhe als Mindesthöhe: `.app-main` wuchs dadurch auf
  die volle Listenhöhe an, `.app-content` wurde nie scrollbar und die
  Liste ließ sich auf dem Handy gar nicht scrollen. `.app-main` und
  `.app-content` setzen das deshalb explizit.
- **Kein `-webkit-overflow-scrolling: touch` verwenden.** Es ist seit
  iOS 13 wirkungslos (Schwung-Scrollen ist Standard), erzeugt aber in
  WebKit einen Container, der `position: fixed`-Nachfahren fehlerhaft
  ausrichtet und beschneidet.
- **Vollbild-Overlays gehören nicht in einen scrollenden Container.**
  Das Detail-Panel wird beim Öffnen auf dem Handy per
  `moveDetailToOverlay()` nach `<body>` umgehängt und beim Schließen
  per `moveDetailToColumn()` wieder neben die Liste gesetzt – sonst
  richtet iOS das `position: fixed`-Panel an `.app-content` aus und die
  Zurück-Leiste verschwindet unter der Topbar.

### Stapelreihenfolge

Alle `z-index`-Werte kommen aus den Tokens in `css/base/variables.css`
(`--z-topbar` < `--z-detail-overlay` < `--z-drawer-backdrop` <
`--z-drawer` < `--z-modal` < `--z-zoom` < `--z-toast`). Keine nackten
Zahlen in Domain-CSS schreiben – sonst landet z.B. ein Modal hinter dem
Vollbild-Detail.
- **Komponenten** (`css/base/components.css`): `.modal` ist unterhalb
  des Breakpoints vollflächig (kein `max-width`, `border-radius: 0`,
  `max-height: 100dvh`), `.field-row` stapelt seine Felder
  untereinander statt nebeneinander, `.card-grid` ist einspaltig.
  Buttons bekommen `min-height: 44px` (Apples Touch-Ziel-Empfehlung).
- **Neue Domains**: Wer eine neue Domain-CSS-Datei anlegt, muss für
  eigene, domain-spezifische Layouts (z.B. Toolbars, Grids) ebenfalls
  einen `@media (max-width: 768px)`-Block mitliefern, statt sich
  ausschließlich auf Desktop-Breiten zu verlassen.
- Einheitlicher Breakpoint: **768px**. Der Wert ist zusätzlich in
  `js/core/viewport.js` als `MOBILE_BREAKPOINT` hinterlegt – JS und
  CSS müssen beim Ändern zusammen angepasst werden. Für Abfragen im
  JS immer `isMobileViewport()` / `onViewportChange()` von dort
  verwenden, statt `window.innerWidth` selbst auszuwerten.
- Bevorzugt werden flexible Einheiten (`%`, `rem`, `minmax()`,
  `auto-fill`/`auto-fit` in Grids) gegenüber festen Pixel-Breiten,
  damit möglichst wenige zusätzliche Breakpoints nötig sind.

### iOS-Besonderheiten

Diese Punkte sind bereits umgesetzt und sollten bei Änderungen nicht
versehentlich zurückgedreht werden:

- **Viewport**: `viewport-fit=cover` in `index.html`; sämtliche
  Ränder, die an den Bildschirmrand stoßen (Topbar, Drawer,
  `.app-content`, Modal-Header/-Footer, Vollbild-Detail, Toasts)
  rechnen `env(safe-area-inset-*)` ein, damit nichts unter Notch oder
  Home-Indicator rutscht.
- **Höhen**: `100vh` ist in Safari größer als der sichtbare Bereich
  (Adressleiste). Überall `100dvh` verwenden – mit `100vh` als
  vorangestelltem Fallback, wo es um die App-Shell geht.
- **Scrollen**: Jeder scrollbare Container bekommt
  `overscroll-behavior: contain` (kein Weiterreichen an die Seite
  dahinter). `body` hat `overscroll-behavior: none`, damit die ganze
  Seite nicht „gummibandet". Siehe zusätzlich „Scroll-Architektur".
- **Kein Auto-Zoom**: Eingabefelder haben unterhalb des Breakpoints
  `font-size: 16px` – bei kleinerer Schrift zoomt iOS beim
  Fokussieren automatisch hinein und kommt nicht wieder heraus.
- **Tap-Verhalten**: `-webkit-tap-highlight-color: transparent` und
  `touch-action: manipulation` auf `body` entfernen das graue
  Aufblitzen und die Doppeltipp-Zoom-Verzögerung.

## Back-Navigation (`js/core/back-stack.js`)

Alles, was sich auf dem Handy als Overlay über den Inhalt legt
(Vollbild-Detail, Modals, Drawer), muss sich mit dem Zurück-Button des
Browsers **und** der iOS-Wischgeste schließen lassen – sonst verlässt
der Nutzer damit versehentlich die App.

Dafür gibt es `BackStack`:

- `BackStack.push(id, onClose)` beim Öffnen: legt einen
  History-Eintrag an; navigiert der Nutzer zurück, wird `onClose`
  aufgerufen.
- `BackStack.close(id)` beim Schließen per UI: ruft `onClose`
  **synchron** auf (damit direkt danach laufender Code den neuen
  Zustand sieht) und räumt den History-Eintrag anschließend per
  `history.go()` ab. Das dadurch ausgelöste `popstate` wird intern
  über `pendingSelfPops` übersprungen.
- `BackStack.drop(id)` entfernt einen Eintrag kommentarlos, wenn ein
  Overlay durch einen Layout-Wechsel (Mobile → Desktop) gar kein
  Overlay mehr ist.

Konvention pro Overlay: eine `openX()`-Methode (pusht), eine
`closeX()`-Methode (geht über `BackStack.close`) und eine
`closeXImmediate()`-Methode, die nur das DOM aufräumt und als
`onClose` übergeben wird. Neue Overlays in neuen Domains müssen dieses
Muster übernehmen.

## Gift-Domain: Detailansicht & aktuelle Erweiterungen

Die Gift-Domain zeigt Liste + Detail-Panel nebeneinander
(`.gift-layout` in `gift.css`). Wichtige Konventionen, die bei
weiteren Änderungen an dieser Domain beachtet werden sollten:

- **Unabhängiges Scrollen (nur Desktop)**: `.gift-list-column` und
  `.gift-detail` scrollen jeweils eigenständig (`overflow-y: auto`,
  `height: 100%`) innerhalb des höhenfixierten `.gift-layout`. Das
  Detail-Panel bleibt dadurch beim Scrollen der Liste stehen. Auf dem
  Handy ist das umgekehrt: dort scrollt `.app-content` als Ganzes und
  die beiden Spalten stehen auf `height: auto` / `overflow: visible`.
- **Liste und Detail sind auf dem Handy zwei „Seiten"**: Unterhalb von
  768px legt sich `.gift-detail` als `position: fixed`-Vollbild über
  die Liste. Ganz oben sitzt die klebende `.gift-detail__mobile-bar`
  mit dem Button „‹ Zurück zur Liste" (`[data-gift-detail-close]`) und
  dem Gift-Namen; das ✕ in `.gift-detail__actions` wird dort
  ausgeblendet, weil es sonst doppelt wäre. Das Öffnen registriert
  einen History-Eintrag, sodass auch Browser-Zurück und die
  iOS-Wischgeste zurück zur Liste führen.
- **Default-Auswahl (`ensureSelection()`)**: Am **Desktop** wird
  automatisch das erste Gift der aktuellen (gefilterten/sortierten)
  Liste im Detail-Panel angezeigt, sobald die bisherige Auswahl nicht
  mehr in der Liste enthalten ist – sonst stünde dort ein leeres
  Panel. Auf dem **Handy wird bewusst nichts vorausgewählt**, weil das
  Detail dort die Liste überdeckt und man sich sonst bei jedem Start
  und jedem Filterwechsel erst zurück navigieren müsste. Ein bereits
  offenes Detail wird geschlossen, wenn sein Gift aus der Liste fällt.
  Beim Wechsel des Breakpoints korrigiert `handleViewportChange()`
  den Zustand entsprechend.
- **Tastatur-Navigation** (`gift.controller.js`): `↑`/`↓` navigieren
  durch `this.currentList` (siehe `handleKeydown`), `Escape` schließt
  das Detail – außer ein Formularfeld ist fokussiert oder ein Modal
  ist offen.
- **Topbar-Titel**: `updateTopbarTitle()` schreibt den aktiven Filter
  in die Topbar (`[data-topbar-title]`), weil die Sidebar auf dem
  Handy zugeklappt ist und der Filter sonst nicht erkennbar wäre.
- **Sortierung**: Die Liste wird immer nach `rangWeltweit` aufsteigend
  sortiert (Gifte ohne Rang ans Ende, siehe
  `compareByRangWeltweit`).
- **Submenü-Filter** (Sidebar unter „Gifte“, `index.html`
  `.app-nav__submenu`): Buttons mit `data-gift-filter` (`all`,
  `top50-weltweit`, `top10-weltweit`, `top25-europa`, `synthetisch`,
  `natuerlich`) rufen `GiftController.setFilter()` auf;
  `matchesFilter()` wertet `rangWeltweit`/`rangEuropa`/
  `natürlichenUrsprungs` aus.
- **Chemische Strukturbilder** (`gift.structures.js`,
  `img/domains/gift/structures/*.png`): Für Gifte, die echte
  chemische Verbindungen sind, liegt lokal ein von PubChem
  heruntergeladenes PNG im Repo. `GIFT_STRUCTURE_IMAGES` mappt den
  exakten `gift.name` auf den Dateinamen; `getStructureImagePath()`
  liefert `null`, wenn keins hinterlegt ist (z.B. bei reinen
  Protein-/Tiergiften ohne einzelne Struktur). **Bewusst kein
  Live-Nachladen von einer externen API** (z.B. direkt von
  pubchem.ncbi.nlm.nih.gov) im Browser des Nutzers, da dessen Netzwerk
  externe Domains blockieren kann – die Bilder müssen deshalb lokal
  im Repo liegen, damit die Anzeige unabhängig vom Internetzugang
  funktioniert. Neues Gift mit Struktur ergänzen: PNG ablegen +
  Eintrag in `GIFT_STRUCTURE_IMAGES` mit dem exakten `name`-Wert.
- **Seed-Daten aus GitHub** (`gift.api.js#seedIfEmpty()` /
  `fetchRemoteSeedData()`): Ist der LocalStorage leer (erster Start),
  wird zuerst versucht, die aktuelle `data/gifte.json` per `fetch()`
  von der öffentlichen GitHub-Raw-URL des Repos zu laden (Timeout
  4s), damit im Repo gepflegte neue/aktualisierte Gifte auch bei
  bereits installierten Nutzern ohne App-Update ankommen. Schlägt der
  Fetch fehl (kein Netz, Domain blockiert, ungültiges/leeres Array),
  wird automatisch auf die im Bundle mitgelieferten Seed-Daten
  (`gift.seed.js`) zurückgefallen – die App funktioniert also auch
  offline. **Wichtig**: `data/gifte.json` muss inhaltlich mit
  `GIFT_SEED_DATA` in `gift.seed.js` synchron gehalten werden (gleiche
  Feldstruktur, ohne generierte Felder `id`/`createdAt`/`updatedAt`);
  bei Änderungen an den Seed-Giften beide Dateien aktualisieren.
  Bereits befüllter LocalStorage (Storage nicht leer) wird nie
  überschrieben – eigene Bearbeitungen/neue Gifte im Browser bleiben
  erhalten.

## Ausführen

Kein Build-Schritt nötig. In IntelliJ: `index.html` öffnen → über den
Browser-Icon-Button am Zeilenrand ("Open in Browser") starten IntelliJ
automatisch einen lokalen Webserver für das Projekt. Alternativ jeden
beliebigen statischen Webserver im Projektroot starten.
