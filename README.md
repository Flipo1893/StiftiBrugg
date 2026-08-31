# Bug Hunt

Ein Zwei-Spieler-Duell-Webgame für den Stifti-Berufsmesse-Stand der Aargauischen
Kantonalbank (AKB). Beide Spieler sehen gleichzeitig dieselben 8 Codezeilen –
sieben sind identisch, eine weicht minimal ab. Wer die abweichende Zeile zuerst
antippt, gewinnt den Punkt. Best of 5, wer zuerst 3 Punkte hat, gewinnt.

Läuft komplett **offline** auf einem einzelnen Laptop: kein Internet, keine
CDNs, keine Datenbank – Node.js + Express + Socket.io, Vanilla JS/HTML/CSS auf
dem Client.

## Installation & Start

Voraussetzung: [Node.js](https://nodejs.org/) ist installiert (Version 18 oder
neuer empfohlen).

```bash
npm install
npm start
```

Die Konsole zeigt danach etwas wie:

```
=================================================
  Bug Hunt Server laeuft!
  Lokal:    http://localhost:3000
  Im LAN:   http://192.168.137.1:3000
  Leaderboard: http://192.168.137.1:3000/leaderboard
  Admin:       http://192.168.137.1:3000/admin
=================================================
```

- Die Adresse **"Im LAN"** ist die, die du auf dein Schild am Stand schreibst.
- `/leaderboard` auf einem zweiten Bildschirm/Beamer offen lassen – die Top 10
  aktualisieren sich live.
- `/admin` zeigt offene Lobbys und hat einen Knopf, um die Bestenliste
  zurückzusetzen (z.B. für den nächsten Messetag).

Server stoppen: `Strg + C` im Terminal.

## Hotspot-Einrichtung unter Windows

1. **Einstellungen → Netzwerk und Internet → Mobiler Hotspot**.
2. "Mit anderen Geräten teilen von" auf eine Verbindung mit Internet stellen
   (falls vorhanden) – ein Internetzugang ist für das Spiel selbst aber nicht
   nötig, nur euer eigenes WLAN-Netz.
3. Netzwerkname und Passwort notieren (z.B. auf dasselbe Schild wie die
   Server-Adresse).
4. Hotspot **einschalten**, bevor ihr `npm start` ausführt.
5. Alle Geräte (zweiter Laptop, Handys) mit diesem Hotspot verbinden.
6. Im Browser die im Terminal angezeigte "Im LAN"-Adresse öffnen
   (z.B. `http://192.168.137.1:3000`).

Falls die Firewall beim ersten Start von `node.exe` fragt, ob es im
öffentlichen/privaten Netzwerk zugelassen werden soll: **Zulassen**, sonst
können sich andere Geräte nicht verbinden.

## Test-Modus (zwei Spieler an einem Rechner)

Auf der Startseite gibt es den Knopf **"🧪 Testmodus: 2. Spieler in neuem Tab
öffnen"**. Er erstellt eine Lobby und öffnet automatisch einen zweiten Browser-
Tab, der ihr direkt beitritt. So lässt sich der komplette Ablauf allein am
Laptop durchspielen, ohne ein zweites Gerät zu brauchen.

Alternativ manuell: Spiel erstellen, Code notieren, in einem zweiten Tab
`http://localhost:3000/?code=XXXX` öffnen und beitreten.

## Rätsel ergänzen oder ändern

Alle Rätsel liegen in **`puzzles.js`**, kommentiert und in drei Listen nach
Schwierigkeit sortiert: `EASY_PUZZLES`, `MEDIUM_PUZZLES`, `HARD_PUZZLES`.

Ein Rätsel besteht aus einer "richtigen" Zeile (`baseLine`) und einer Liste
möglicher fehlerhafter Varianten (`mutations`). Beim Spielstart wird zufällig
eine Mutation ausgewählt und ersetzt die `baseLine` an einer zufälligen
Position unter den 8 angezeigten Zeilen.

Neues Rätsel hinzufügen, Beispiel:

```js
{
  baseLine: 'int summe = a + b;',
  mutations: [
    { line: 'int summe = a - b;', hint: 'Minus statt Plus' },
    { line: 'int summe = a + b', hint: 'Semikolon fehlt' },
  ],
},
```

Einfach ein solches Objekt an die passende Liste anhängen (z.B.
`EASY_PUZZLES.push(...)` bzw. direkt im Array ergänzen) und den Server neu
starten. Achte darauf, dass `baseLine` und jede `mutations[].line` etwa gleich
lang sind, damit der Unterschied nicht schon an der Zeilenlänge auffällt.

Schwierigkeitsstufen:

- **Runde 1–2 (leicht):** sehr offensichtlich, z.B. fehlendes Semikolon.
- **Runde 3–4 (mittel):** man muss die Zeile genauer lesen.
- **Ab Runde 5 (schwer):** subtile Unterschiede wie `1` statt `l` oder
  vertauschte Buchstaben.

## Farben & Logo ändern

Das Design ist hell und schlicht gehalten (weisser Hintergrund, AKB-Blau als
Akzentfarbe) und an genau einer Stelle definiert: ganz oben in
**`public/css/style.css`**:

```css
:root {
  --accent: #009ee0;   /* AKB Primärfarbe – Buttons, Hervorhebungen */
  --ink: #001a41;      /* AKB Sekundärfarbe – Titel, Code-Zeilen-Hintergrund */
  --bg: #f2f4f7;        /* Seitenhintergrund, hell und neutral */
}
```

Datei speichern, Browser-Seite neu laden – fertig. Das AKB-Logo liegt unter
`public/img/akb-logo.png` (transparenter Hintergrund) und wird oben auf jeder
Seite angezeigt. Um es auszutauschen, einfach eine neue Datei unter demselben
Pfad/Namen ablegen.

## Was tun, wenn am Stand etwas klemmt?

- **Seite lädt nicht / "Diese Seite ist nicht erreichbar":** Ist der Server
  noch am Laufen (Terminal-Fenster offen, keine Fehlermeldung)? Ist das Gerät
  wirklich mit eurem Hotspot verbunden (nicht mit Mobilfunk/anderem WLAN)?
- **Server abgestürzt:** Terminal öffnen, `npm start` erneut ausführen. Der
  Server fängt unerwartete Fehler ab und sollte eigentlich nie von selbst
  abstürzen – falls doch, ist die Fehlermeldung im Terminal sichtbar und hilft
  bei der Fehlersuche.
- **Ungültiger Code / "Diesen Lobby-Code gibt es nicht":** Code wird nach
  10 Minuten Inaktivität automatisch gelöscht. Einfach eine neue Lobby
  erstellen.
- **Ein Spieler ist rausgeflogen:** Bei kurzem WLAN-Aussetzer hat der Spieler
  15 Sekunden Zeit, sich neu zu verbinden (Seite neu laden reicht) und landet
  automatisch zurück in der laufenden Partie. Kommt er nicht rechtzeitig
  zurück, sieht der andere Spieler eine Meldung und wird nach 5 Sekunden zur
  Startseite geschickt.
- **Bestenliste zurücksetzen:** Über `/admin` auf dem Laptop öffnen, Knopf
  "Bestenliste zurücksetzen" drücken (mit Sicherheitsabfrage).
- **Alles neu starten:** Server im Terminal mit `Strg + C` stoppen und mit
  `npm start` neu starten. Laufende Partien gehen dabei verloren (Lobbys leben
  nur im Arbeitsspeicher), die Bestenliste (`data/leaderboard.json`) bleibt
  erhalten.

## Projektstruktur

```
server.js           Express-Server, Socket.io-Verbindung, Routen
rooms.js            Lobby-Verwaltung + komplette Spiellogik (serverseitig)
leaderboard.js       Bestenliste, persistiert als data/leaderboard.json
puzzles.js           Alle Rätsel (Java-Snippets), nach Schwierigkeit sortiert
public/
  index.html         Start, Lobby, Spielbildschirm (eine Seite, mehrere Screens)
  leaderboard.html    Route /leaderboard – Live-Bestenliste für Zweitbildschirm
  admin.html          Route /admin – offene Lobbys, Bestenliste zurücksetzen
  css/style.css       Gestaltung, Akzentfarbe als CSS-Variable
  js/app.js           Client-Logik Lobby + Spiel
  js/leaderboard.js   Client-Logik Bestenliste
  js/admin.js         Client-Logik Admin
data/leaderboard.json Bestenliste (wird automatisch angelegt/aktualisiert)
```
