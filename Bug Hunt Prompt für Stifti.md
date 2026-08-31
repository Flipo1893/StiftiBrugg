# Auftrag: "Bug Hunt" – Zwei-Spieler-Webgame für einen Berufsmesse-Stand

Baue mir eine vollständige, lauffähige Webapplikation. Arbeite selbstständig und triff
kleine Design-Entscheidungen selbst, statt zurückzufragen. Frage nur nach, wenn eine
Anforderung dir widersprüchlich erscheint.

## Kontext

Ich vertrete an der Berufsmesse "Stifti" in Brugg die Aargauische Kantonalbank als
Lernender Informatiker Applikationsentwicklung. Am Stand soll ein kleines Duell-Spiel
laufen, das Besucher zu zweit gegeneinander spielen. Es ist ein Türöffner für ein
Gespräch – nicht das Hauptereignis.

Daraus folgen harte Randbedingungen:

- Eine komplette Partie dauert **maximal 60 Sekunden**.
- Ein Besucher muss ohne Erklärung und ohne Programmierkenntnisse sofort mitspielen können.
- **Es gibt kein Internet.** Der Laptop spannt einen eigenen Hotspot auf, der Server läuft
  lokal auf diesem Laptop. Keine CDNs, keine externen Fonts, keine externen API-Calls.
  Alle Abhängigkeiten müssen per `npm install` lokal installiert und aus `node_modules`
  ausgeliefert werden.
- Ich stehe daneben und rede mit Besuchern. Das Spiel muss ohne mein Zutun laufen und sich
  nach jeder Partie selbst aufräumen.

## Spielprinzip

Beide Spieler sehen **gleichzeitig dieselben 8 Codezeilen**. Sieben davon sind identisch,
**eine einzige weicht minimal ab** – zum Beispiel `==` statt `=`, ein fehlendes Semikolon,
ein `i` statt eines `l`, `lenght` statt `length`, eine Klammer zu viel.

Wer die abweichende Zeile zuerst antippt bzw. anklickt, gewinnt den Punkt. Wer daneben
tippt, wird für **1.5 Sekunden gesperrt** (sichtbares Feedback, Countdown). Nach einem
Punkt kurze Auflösung (~2 s, die richtige Zeile wird grün markiert), dann automatisch die
nächste Runde.

**Best of 5** – wer zuerst 3 Punkte hat, gewinnt die Partie.

## Tech-Stack

- **Node.js + Express + Socket.io**, nichts anderes im Backend.
- Frontend: **Vanilla JS, HTML, CSS**. Kein React, kein Build-Step, kein Bundler.
  Ich muss das Ding am Vorabend in einem Texteditor anpassen können.
- Keine Datenbank. Bestenliste als JSON-Datei auf der Platte.
- Start mit `npm install && npm start`, sonst nichts.

## Geräte und Verbindung

Gespielt wird gemischt: zwei Laptops am Stand, oder ein Laptop gegen ein Besucher-Handy,
oder zwei Handys. Das Layout muss **responsiv** sein und sowohl mit Maus/Touch als auch mit
der Tastatur (Tasten 1–8) funktionieren.

Beitritt über eine Lobby:

1. Spieler A öffnet die Seite, gibt seinen Vornamen ein, drückt "Spiel erstellen".
2. Er bekommt einen **4-stelligen Code** angezeigt (nur Grossbuchstaben, ohne die
   verwechselbaren Zeichen `I`, `O`, `0`, `1`), gross und gut lesbar, dazu ein **QR-Code**
   mit der Join-URL inklusive vorausgefülltem Code.
3. Spieler B scannt den QR-Code oder tippt den Code auf der Startseite ein, gibt seinen
   Vornamen ein und ist drin.
4. Sobald beide da sind: 3-2-1-Countdown, dann Runde 1.

Der Server muss seine eigene LAN-IP beim Start in der Konsole ausgeben (z.B.
`http://192.168.137.1:3000`), damit ich sie auf ein Schild schreiben kann.

## Server-Logik

Die Spiellogik gehört **vollständig auf den Server** – der Client darf nur anzeigen und
Klicks melden. Sonst gewinnt bei zwei unterschiedlich schnellen Geräten das schnellere
Netz statt der schnellere Spieler.

- Der Server generiert das Rätsel und schickt beiden Clients **gleichzeitig** dieselben
  8 Zeilen in derselben Reihenfolge.
- Der erste eingehende korrekte Treffer gewinnt die Runde. Der Server misst die
  Reaktionszeit ab dem Moment, in dem er die Runde ausgesendet hat.
- Falscheingaben verarbeitet der Server (Sperre serverseitig setzen, nicht nur im Client).
- Lobbys leben nur im Arbeitsspeicher. Räume ohne Aktivität werden nach 10 Minuten
  automatisch aufgeräumt.

## Rätsel-Inhalte

Lege die Rätsel in einer separaten, gut kommentierten Datei ab (z.B. `puzzles.js`), damit
ich sie ohne Codeverständnis erweitern kann. Format: ein Grundschnipsel plus eine Liste
möglicher Mutationen.

Verwende **Java-Snippets** – das passt zu dem, was ich in der Lehre tatsächlich mache, und
ich kann es am Stand als Aufhänger nutzen. Bau mindestens **20 verschiedene Rätsel** und
drei Schwierigkeitsstufen (Runde 1–2 leicht, Runde 3–4 mittel, ab Runde 5 schwer). Leicht
heisst sehr offensichtlich, z.B. ein fehlendes Semikolon. Schwer heisst ein `1` statt `l`
oder eine subtil vertauschte Variable.

Wichtig: Der Unterschied muss auch für jemanden erkennbar sein, der noch nie Code gesehen
hat. Es ist ein Suchbild, kein Fachtest.

## Bestenliste

- Nach jeder Partie wird das Ergebnis mit Vorname, Punkten und schnellster Reaktionszeit
  gespeichert.
- Eine eigene Route `/leaderboard` zeigt die Top 10 des Tages gross auf einem
  Zweitbildschirm an und aktualisiert sich live über Socket.io.
- Vornamen auf 10 Zeichen begrenzen und serverseitig auf Buchstaben filtern – Jugendliche
  tippen sonst Unsinn hinein.
- Route `/admin` mit einem Knopf, der die Bestenliste zurücksetzt, und einer Übersicht der
  offenen Lobbys.

## Robustheit

Das ist der Teil, an dem so etwas an einer Messe typischerweise scheitert. Bitte
entsprechend sorgfältig:

- Verlässt ein Spieler die Partie oder bricht die Verbindung ab, bekommt der andere eine
  klare Meldung und landet nach 5 Sekunden automatisch wieder auf der Startseite.
- Reconnect innerhalb von 15 Sekunden führt zurück in die laufende Partie.
- Ungültiger oder bereits belegter Lobby-Code: verständliche Fehlermeldung, kein Absturz.
- Ein unerwarteter Fehler darf nie den ganzen Node-Prozess killen.
- Nach Spielende führt ein "Nochmal"-Knopf zurück in eine frische Lobby.

## Gestaltung

- Dunkles Theme, Monospace-Schrift für die Codezeilen (systemeigene Fonts, keine
  Web-Fonts – es gibt kein Internet).
- Die Akzentfarbe an genau **einer Stelle** als CSS-Variable definieren, damit ich sie auf
  die AKB-Hausfarbe ändern kann.
- Die Codezeilen müssen **auf einem Handy in Hochformat vollständig und ohne horizontales
  Scrollen** lesbar sein. Halte die Snippets entsprechend kurz. Das ist die wichtigste
  Layout-Anforderung.
- Grosse Touch-Ziele, klares visuelles Feedback bei Treffer, Fehler und Sperre.
- Der Punktestand beider Spieler ist jederzeit sichtbar.

## Deliverables

1. Lauffähiges Projekt mit `package.json`, Server, Client, Rätseldatei.
2. Eine `README.md` mit: Installation, Start, Hotspot-Einrichtung unter Windows, wie ich
   Rätsel ergänze, wie ich die Farbe ändere, und was ich tun soll, wenn am Stand etwas
   klemmt.
3. Ein `test-Modus`, in dem ich beide Spieler in zwei Browser-Tabs auf demselben Rechner
   testen kann.

Arbeite in dieser Reihenfolge: erst Server und Lobby-Mechanik lauffähig, dann die
Spiellogik, dann Bestenliste und Admin, zuletzt die Gestaltung. Zeig mir nach jedem dieser
Schritte kurz, was läuft, damit ich früh testen kann.
