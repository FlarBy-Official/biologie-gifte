# biologie-gifte
Wissenstool über Gifte

Eine reine Client-Side-App (HTML/CSS/JavaScript, kein Build-Tool
nötig) im Discord-angelehnten Dark-Theme, um Wissen über Gifte zu
erfassen und zu verwalten. Die App ist domain-getrieben aufgebaut –
aktuell gibt es die Domain **Gift** ("Gift"), weitere fachliche
Domains ("kleine Apps") können nach dem gleichen Muster ergänzt
werden.

Details zur Architektur, Ordnerstruktur und den Konventionen für neue
Domains stehen in [`AGENTS.md`](./AGENTS.md).

## Features (Domain "Gift")

- Anlegen, Bearbeiten und Löschen von Gift-Einträgen über ein Modal
- Erfassung u.a. von: Kategorie (Pflanze/Tier/Pilz/Chemikalie/Sonstiges),
  natürlicher Ursprung, Gefahr für Mensch/Tier, letale Dosis (Menge +
  Einheit), Rang unter den giftigsten Substanzen weltweit/Europas
  (LD50-basiert), Vorkommen/Ort, Symptome, Gegenmittel und Quelle
- Einfache Namenssuche über die Giftliste
- Vorbefüllte Beispiel-/Recherchedaten beim ersten Start
- Persistenz aktuell über den `localStorage` des Browsers (pro Domain
  ein eigener Storage-Key); eine Anbindung an eine echte Datenbank ist
  als nächster Schritt vorgesehen (siehe `js/domains/gift/gift.api.js`)

## Starten

Kein Build-Schritt nötig – die App läuft direkt als statische
HTML/CSS/JS-Seite:

- **IntelliJ IDEA**: `index.html` öffnen und über das Browser-Icon am
  rechten Zeilenrand ("Open in Browser") starten – IntelliJ startet
  dafür automatisch einen lokalen Webserver.
- **Alternativ**: einen beliebigen statischen Webserver im
  Projektroot starten (z.B. `python3 -m http.server`) und
  `index.html` im Browser öffnen.

Wichtig: Die App nutzt ES-Modules (`<script type="module">`) und
benötigt daher einen echten HTTP-Server – ein Doppelklick auf
`index.html` (`file://`-Protokoll) funktioniert nicht.

## Projektstruktur

```
index.html          Einstiegspunkt
AGENTS.md            Architektur & Konventionen
css/base/            Discord-Theme, Layout, wiederverwendbare Komponenten
css/domains/gift/     Styling speziell für die Gift-Domain
js/core/              LocalStorage-Wrapper, kleine Helferfunktionen
js/domains/gift/      Model, "Backend"-Anbindung, Rendering, Verhalten
js/app.js             Bootstrapping aller Domains
```
