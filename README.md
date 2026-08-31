# Bug Hunt

Ein Zwei-Spieler-Duell-Webgame für den Stifti-Berufsmesse-Stand der Aargauischen
Kantonalbank (AKB). Beide Spieler sehen gleichzeitig dieselben 8 Codezeilen –
sieben sind identisch, eine weicht minimal ab. Wer die abweichende Zeile zuerst
antippt, gewinnt den Punkt. Best of 5, wer zuerst 3 Punkte hat, gewinnt.

Zwei Betriebsarten:

- **Lokal am Stand** (Standard): läuft komplett **offline** auf einem
  einzelnen Laptop – kein Internet, keine CDNs, keine Datenbank. Geräte
  verbinden sich über den eigenen Hotspot des Laptops.
- **Online gehostet**: Besucher treten über ihre **eigenen mobilen Daten**
  bei, kein Hotspot nötig. Dafür muss der Server öffentlich erreichbar
  gehostet werden – siehe [Online-Betrieb](#online-betrieb-eigene-mobile-daten)
  weiter unten.

Backend: Node.js + Express + Socket.io. Frontend: Vanilla JS/HTML/CSS, kein
Build-Step.

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
  zurückzusetzen (z.B. für den nächsten Messetag). Passwort: `stiftibrugg`
  (änderbar/deaktivierbar über `ADMIN_PASSWORD`, siehe
  [Admin-Passwortschutz](#admin-passwortschutz)).

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

## Online-Betrieb (eigene mobile Daten)

Sollen Besucher über ihre **eigenen mobilen Daten** teilnehmen können (statt
über euren Hotspot), muss der Server öffentlich im Internet erreichbar sein.

**Wichtig: Nicht auf Netlify/Vercel möglich.** Diese Dienste hosten nur
statische Seiten und kurzlebige Serverless-Functions – kein dauerhaft
laufender Node-Prozess, keine langlebigen WebSocket-Verbindungen (die
Socket.io braucht) und kein beschreibbares Dateisystem für die
Bestenliste.

Es gibt zwei sinnvolle Wege, kostenlos:

| Option | Kostenlos? | Vor-/Nachteil |
|---|---|---|
| **Cloudflare Tunnel** (empfohlen) | dauerhaft gratis | Server läuft weiterhin auf eurem Laptop, kein "Einschlafen", aber Laptop braucht selbst einen Internet-Uplink (z.B. Hotspot vom Handy) |
| Render / Railway / Fly.io | Gratis-Stufe vorhanden | Läuft in der Cloud, aber Gratis-Stufen schlafen nach Inaktivität ein (30–60s Aufwachzeit) – killt die erste 60-Sekunden-Partie |

### Empfohlen: Cloudflare Tunnel (kostenlos, kein Einschlafen)

Dabei bleibt alles wie gehabt: Der Server läuft weiterhin lokal auf eurem
Laptop mit `npm start`. `cloudflared` öffnet zusätzlich einen sicheren,
öffentlichen HTTPS-Link zu diesem lokalen Prozess – ohne eigenes Deployment,
ohne Cold-Start, Bestenliste bleibt auf eurer eigenen Festplatte. Einziger
Unterschied zum reinen Offline-Betrieb: der Laptop selbst braucht einen
Internet-Uplink (z.B. Hotspot vom eigenen Handy mit Datenvolumen, oder
Messe-WLAN) – logisch, sonst könnten Besucher-Handys ihn ja auch nicht über
ihre eigenen mobilen Daten erreichen.

**Wichtig zur Reihenfolge:** Erst den Tunnel starten und die Adresse
abwarten, danach den Server **einmalig** mit dieser Adresse starten. Wird der
Server zuerst (ohne `PUBLIC_URL`) gestartet, nutzt er automatisch eure
LAN-IP für Join-Link und QR-Code – Besucher auf eigenen mobilen Daten können
diese private Adresse nicht erreichen und die Seite lädt bei ihnen endlos.

1. `cloudflared` installieren:
   - **Windows:** Installer von
     [github.com/cloudflare/cloudflared/releases](https://github.com/cloudflare/cloudflared/releases/latest)
     herunterladen (`cloudflared-windows-amd64.msi`) und ausführen.
   - **macOS:** `brew install cloudflared`
   - **Linux:** `.deb`/`.rpm` von derselben Release-Seite installieren.
2. Laptop mit Internet verbinden (Handy-Hotspot mit Datenvolumen oder
   Messe-WLAN).
3. **Zuerst** in einem Terminal-Fenster den Tunnel starten (der Bug-Hunt-
   Server muss dafür noch gar nicht laufen):
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
   `cloudflared` gibt eine Adresse aus wie
   `https://random-woerter-1234.trycloudflare.com`.
4. **Erst danach**, in einem zweiten Terminal-Fenster, den Server **einmal**
   mit dieser Adresse als `PUBLIC_URL` starten:
   - **Windows (PowerShell):**
     `$env:PUBLIC_URL="https://random-woerter-1234.trycloudflare.com"; npm start`
   - **macOS/Linux:**
     `PUBLIC_URL=https://random-woerter-1234.trycloudflare.com npm start`
5. In der Server-Konsole prüfen, dass "Oeffentlich: https://...trycloudflare.com"
   angezeigt wird (nicht "Im LAN: http://192.168...") – dann nutzen Join-Link
   und QR-Code auf der Startseite garantiert die richtige Adresse. Besucher
   können jetzt über ihre eigenen mobilen Daten beitreten, ganz ohne euren
   Hotspot.

**Hinweis:** Diese kostenlose `trycloudflare.com`-Adresse ist zufällig
generiert und ändert sich bei jedem Neustart von `cloudflared` – für einen
einzelnen Messetag kein Problem (Adresse einmal am Morgen erzeugen, den Tag
über stehen lassen). Wer eine dauerhaft gleichbleibende eigene Adresse will,
kann sich kostenlos bei [Cloudflare](https://dash.cloudflare.com/sign-up)
registrieren und einen "named tunnel" auf eine eigene (Sub-)Domain legen –
dafür braucht es aber eine bei Cloudflare verwaltete Domain.

### Alternative: Deployment am Beispiel Render

1. Dieses Repository mit einem GitHub-Account verbinden (ist es schon).
2. Auf [render.com](https://render.com) **New → Web Service** wählen und das
   Repo auswählen.
3. Build Command: `npm install`, Start Command: `npm start`.
4. Unter **Environment** folgende Variablen setzen:
   - `PUBLIC_URL` = die von Render vergebene URL, z.B.
     `https://bug-hunt.onrender.com` (ohne Slash am Ende).
   - `ADMIN_PASSWORD` = ein eigenes, sicheres Passwort für `/admin` (ohne
     diese Variable gilt das Standard-Passwort `stiftibrugg` – sobald die App
     öffentlich erreichbar ist, unbedingt ein eigenes setzen, siehe unten).
5. Deployen. Render vergibt automatisch HTTPS.
6. **Wichtig für den Live-Betrieb:** Die kostenlose Stufe schläft nach
   Inaktivität ein und braucht dann 30–60s zum Aufwachen – bei einer Partie,
   die maximal 60 Sekunden dauern soll, ruiniert das die erste Runde. Für den
   eigentlichen Messetag daher einen "Always On"/bezahlten Plan verwenden.
7. Die App zeigt jetzt automatisch `PUBLIC_URL` in Join-Link und QR-Code an,
   Besucher scannen den QR-Code mit ihrem eigenen Handy über Mobilfunk.

Railway und Fly.io funktionieren nach demselben Prinzip (Node-Webservice,
`npm start`, `PORT` wird von der Plattform automatisch gesetzt, `PUBLIC_URL`
und `ADMIN_PASSWORD` selbst als Umgebungsvariable setzen).

### Admin-Passwortschutz

`/admin` verlangt immer ein Passwort, bevor Lobby-Übersicht oder
Bestenliste-Reset funktionieren – **Standard-Passwort ist `stiftibrugg`**.
Für den Online-Betrieb solltet ihr per `ADMIN_PASSWORD`-Umgebungsvariable ein
eigenes, stärkeres Passwort setzen (siehe oben), da `/admin` sonst mit dem
bekannten Standardpasswort von aussen erreichbar wäre. Wer den Schutz
bewusst ganz ausschalten will (z.B. rein lokal am Stand), setzt
`ADMIN_PASSWORD=""` explizit leer.

### Zu beachten beim Online-Betrieb

- **Bestenliste-Persistenz:** `data/leaderboard.json` liegt auf der
  Festplatte des Hosts. Ohne einen persistenten Datenträger (bei den meisten
  Anbietern ein kostenpflichtiges Zusatzfeature) geht die Bestenliste bei
  jedem Neustart/Redeploy verloren. Für einen einzelnen Messetag meist kein
  Problem – sonst vorher beim Hoster ein persistentes Volume einrichten.
- **Ein einzelner Server-Prozess:** Lobbys leben im Arbeitsspeicher eines
  Prozesses. Beim Hoster **keine automatische Skalierung auf mehrere
  Instanzen** aktivieren, sonst können zwei Spieler in unterschiedlichen
  Instanzen landen und sich nicht finden.
- Der lokale Offline-Betrieb bleibt unverändert möglich: einfach kein
  `PUBLIC_URL` setzen (bzw. lokal `npm start` ohne Umgebungsvariablen
  ausführen) – dann greift wieder die LAN-IP-Erkennung wie oben beschrieben.

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
