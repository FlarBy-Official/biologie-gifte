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

- **Basis-Layout** (`css/base/layout.css`): Die Sidebar (`.app-sidebar`)
  klappt unterhalb eines Breakpoints (`max-width: 768px`) von einer
  festen linken Spalte zu einer oben angehefteten, horizontal
  scrollbaren Leiste um; `.app-content` bekommt kleinere Abstände.
- **Komponenten** (`css/base/components.css`): `.modal` ist unterhalb
  des Breakpoints vollflächig (kein `max-width`, `border-radius: 0`,
  `max-height: 100vh`), `.field-row` stapelt seine Felder
  untereinander statt nebeneinander, `.card-grid` erlaubt einspaltige
  Darstellung.
- **Neue Domains**: Wer eine neue Domain-CSS-Datei anlegt, muss für
  eigene, domain-spezifische Layouts (z.B. Toolbars, Grids) ebenfalls
  einen `@media (max-width: 768px)`-Block mitliefern, statt sich
  ausschließlich auf Desktop-Breiten zu verlassen.
- Einheitlicher Breakpoint: **768px** (Tablet-Hochformat/Handy-Grenze),
  als Variable/Konvention beizubehalten, damit alle Domains konsistent
  umbrechen.
- Bevorzugt werden flexible Einheiten (`%`, `rem`, `minmax()`,
  `auto-fill`/`auto-fit` in Grids) gegenüber festen Pixel-Breiten,
  damit möglichst wenige zusätzliche Breakpoints nötig sind.

## Gift-Domain: Detailansicht & aktuelle Erweiterungen

Die Gift-Domain zeigt Liste + Detail-Panel nebeneinander
(`.gift-layout` in `gift.css`). Wichtige Konventionen, die bei
weiteren Änderungen an dieser Domain beachtet werden sollten:

- **Unabhängiges Scrollen**: `.gift-list-column` und `.gift-detail`
  scrollen jeweils eigenständig (`overflow-y: auto`, `height: 100%`)
  innerhalb des höhenfixierten `.gift-layout` (`height: 100%` über
  `.domain-view.is-active` als Flex-Container, siehe
  `css/base/layout.css`). Das Detail-Panel bleibt dadurch beim
  Scrollen der Liste stehen.
- **Auto-Auswahl & Tastatur-Navigation**
  (`gift.controller.js`): Nach jedem Rendern der Liste
  (`renderList()` → `ensureSelection()`) wird automatisch das erste
  Gift der aktuellen (gefilterten/sortierten) Liste im Detail-Panel
  angezeigt, falls die bisherige Auswahl nicht mehr enthalten ist.
  `↑`/`↓` navigieren durch `this.currentList` (siehe
  `handleKeydown`), außer ein Formularfeld ist fokussiert oder das
  Modal ist offen.
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
