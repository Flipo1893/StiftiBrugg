// puzzles.js
//
// Hier liegen alle Raetsel fuer "Bug Hunt". Ein Raetsel besteht aus:
//   - difficulty: "easy" | "medium" | "hard"
//   - baseLine:   die "richtige" Codezeile, die 7x identisch angezeigt wird
//   - mutations:  eine Liste moeglicher fehlerhafter Varianten dieser Zeile.
//                 Beim Spielstart wird zufaellig EINE Mutation ausgewaehlt
//                 und an einer zufaelligen Position anstelle der baseLine
//                 eingesetzt. So bleibt jedes Raetsel bei mehrfachem Spielen
//                 abwechslungsreich.
//
// Neue Raetsel hinzufuegen: Einfach ein neues Objekt an das passende Array
// (EASY_PUZZLES / MEDIUM_PUZZLES / HARD_PUZZLES) anhaengen. baseLine und
// jede mutation.line sollten in etwa gleich lang sein, damit der Unterschied
// nicht schon an der Zeilenlaenge erkennbar ist.
//
// Schwierigkeitsgrade:
//   easy   -> Runde 1-2: sehr offensichtlich (fehlendes Semikolon, falsche Klammer, ...)
//   medium -> Runde 3-4: man muss die Zeile schon genauer lesen
//   hard   -> ab Runde 5: sehr subtil (1 statt l, vertauschte Variablen, ...)

const EASY_PUZZLES = [
  {
    baseLine: 'int anzahl = 0;',
    mutations: [
      { line: 'int anzahl = 0', hint: 'Semikolon fehlt' },
      { line: 'int anzahl = 0;;', hint: 'Doppeltes Semikolon' },
    ],
  },
  {
    baseLine: 'System.out.println("Hallo Welt");',
    mutations: [
      { line: 'System.out.println("Hallo Welt")', hint: 'Semikolon fehlt' },
      { line: 'System.out.println("Hallo Welt");;', hint: 'Doppeltes Semikolon' },
    ],
  },
  {
    baseLine: 'if (x > 0) {',
    mutations: [
      { line: 'if (x > 0) {{', hint: 'Klammer zu viel' },
      { line: 'if x > 0) {', hint: 'Klammer fehlt' },
    ],
  },
  {
    baseLine: 'for (int i = 0; i < 10; i++) {',
    mutations: [
      { line: 'for (int i = 0; i < 10; i++ {', hint: 'Klammer fehlt' },
      { line: 'for (int i = 0; i < 10; i++)) {', hint: 'Klammer zu viel' },
    ],
  },
  {
    baseLine: 'public class Rechner {',
    mutations: [
      { line: 'public class rechner {', hint: 'Kleinbuchstabe statt Grossbuchstabe' },
      { line: 'public class Rechner {{', hint: 'Klammer zu viel' },
    ],
  },
  {
    baseLine: 'String name = "Alex";',
    mutations: [
      { line: 'String name = "Alex";;', hint: 'Doppeltes Semikolon' },
      { line: 'string name = "Alex";', hint: 'Kleines statt grosses String' },
    ],
  },
  {
    baseLine: 'return summe;',
    mutations: [
      { line: 'return summe', hint: 'Semikolon fehlt' },
      { line: 'retrun summe;', hint: 'Vertipper bei return' },
    ],
  },
  {
    baseLine: 'boolean istFertig = false;',
    mutations: [
      { line: 'boolean istFertig = flase;', hint: 'Vertipper bei false' },
      { line: 'boolen istFertig = false;', hint: 'Vertipper bei boolean' },
    ],
  },
  {
    baseLine: 'while (zaehler <= 100) {',
    mutations: [
      { line: 'while (zaehler <= 100) {{', hint: 'Klammer zu viel' },
      { line: 'while (zaehler <= 100 {', hint: 'Klammer fehlt' },
    ],
  },
  {
    baseLine: 'double preis = 19.90;',
    mutations: [
      { line: 'double preis = 19.90', hint: 'Semikolon fehlt' },
      { line: 'doubel preis = 19.90;', hint: 'Vertipper bei double' },
    ],
  },
];

const MEDIUM_PUZZLES = [
  {
    baseLine: 'if (punkte == 3) {',
    mutations: [
      { line: 'if (punkte = 3) {', hint: 'Zuweisung statt Vergleich' },
      { line: 'if (punkte === 3) {', hint: 'Drei Gleichheitszeichen (kein Java)' },
    ],
  },
  {
    baseLine: 'for (int i = 0; i < liste.length; i++) {',
    mutations: [
      { line: 'for (int i = 0; i <= liste.length; i++) {', hint: '<= statt <' },
      { line: 'for (int i = 0; i < liste.lenght; i++) {', hint: 'lenght statt length' },
    ],
  },
  {
    baseLine: 'if (name.equals("Admin")) {',
    mutations: [
      { line: 'if (name.equal("Admin")) {', hint: 'equal statt equals' },
      { line: 'if (name == "Admin") {', hint: '== statt .equals()' },
    ],
  },
  {
    baseLine: 'int mittelwert = summe / anzahl;',
    mutations: [
      { line: 'int mittelwert = summe % anzahl;', hint: 'Modulo statt Division' },
      { line: 'int mittelwert = summe / anzhal;', hint: 'Vertipper bei anzahl' },
    ],
  },
  {
    baseLine: 'if (alter >= 18 && hatAusweis) {',
    mutations: [
      { line: 'if (alter >= 18 || hatAusweis) {', hint: 'ODER statt UND' },
      { line: 'if (alter > 18 && hatAusweis) {', hint: '> statt >=' },
    ],
  },
  {
    baseLine: 'kunde.setName(vorname + " " + nachname);',
    mutations: [
      { line: 'kunde.setName(vorname + " " - nachname);', hint: 'Minus statt Plus' },
      { line: 'kunde.setName(vorname + " " + nachame);', hint: 'Vertipper bei nachname' },
    ],
  },
  {
    baseLine: 'public int berechneSumme(int a, int b) {',
    mutations: [
      { line: 'public int berechneSumme(int a, int a) {', hint: 'Parameter b heisst a' },
      { line: 'public void berechneSumme(int a, int b) {', hint: 'void statt int' },
    ],
  },
  {
    baseLine: 'liste.add(neuerEintrag);',
    mutations: [
      { line: 'liste.get(neuerEintrag);', hint: 'get statt add' },
      { line: 'liste.add(neuerEintrga);', hint: 'Vertipper bei neuerEintrag' },
    ],
  },
  {
    baseLine: 'int rest = zahl % 2;',
    mutations: [
      { line: 'int rest = zahl / 2;', hint: 'Division statt Modulo' },
      { line: 'int rest = zhal % 2;', hint: 'Vertipper bei zahl' },
    ],
  },
  {
    baseLine: 'System.out.print("Wert: " + wert);',
    mutations: [
      { line: 'System.out.print("Wert: " + wet);', hint: 'Vertipper bei wert' },
      { line: 'System.out.print("Wert: " , wert);', hint: 'Komma statt Plus' },
    ],
  },
];

const HARD_PUZZLES = [
  {
    baseLine: 'int level = zahl1 * zahl2;',
    mutations: [
      { line: 'int level = zaha1 * zahl2;', hint: 'Vertauschtes l/a bei zahl1' },
      { line: 'int level = zahl1 * zah12;', hint: '2 statt l bei zahl12' },
    ],
  },
  {
    baseLine: 'for (int i = 1; i < limit; i++) {',
    mutations: [
      { line: 'for (int i = l; i < limit; i++) {', hint: 'Buchstabe l statt Ziffer 1' },
      { line: 'for (int i = 1; i < limit; i--) {', hint: 'i-- statt i++' },
    ],
  },
  {
    baseLine: 'if (links.equals(rechts)) {',
    mutations: [
      { line: 'if (links.equals(rechts)) {  ', hint: 'Unsichtbares Leerzeichen am Ende' },
      { line: 'if (linsk.equals(rechts)) {', hint: 'Vertauschte Buchstaben in links' },
    ],
  },
  {
    baseLine: 'double zinssatz = 0.015;',
    mutations: [
      { line: 'double zinssatz = O.015;', hint: 'Grosses O statt Ziffer 0' },
      { line: 'double zinssatz = 0.OI5;', hint: 'Buchstaben O/I statt Ziffern 0/1' },
    ],
  },
  {
    baseLine: 'total += einzahlung - gebuehr;',
    mutations: [
      { line: 'total += einzahlung + gebuehr;', hint: 'Plus statt Minus' },
      { line: 'total -= einzahlung - gebuehr;', hint: '-= statt +=' },
    ],
  },
  {
    baseLine: 'boolean istGueltig = pruefeIban(iban);',
    mutations: [
      { line: 'boolean istGueltig = pruefeIban(ibna);', hint: 'Vertauschte Buchstaben in iban' },
      { line: 'boolean istGultig = pruefeIban(iban);', hint: 'Umlaut ue fehlt in istGueltig' },
    ],
  },
  {
    baseLine: 'konto.abheben(betrag);',
    mutations: [
      { line: 'konto.abheben(betrga);', hint: 'Vertauschte Buchstaben in betrag' },
      { line: 'Konto.abheben(betrag);', hint: 'Grosses K statt kleines k' },
    ],
  },
  {
    baseLine: 'if (saldo < 0 && !gesperrt) {',
    mutations: [
      { line: 'if (saldo < 0 && gesperrt) {', hint: 'Ausrufezeichen (Negation) fehlt' },
      { line: 'if (saldo <= 0 && !gesperrt) {', hint: '<= statt <' },
    ],
  },
  {
    baseLine: 'String pin = kunde.getPin();',
    mutations: [
      { line: 'String pin = kunde.getPln();', hint: 'l statt i in getPin' },
      { line: 'String pln = kunde.getPin();', hint: 'l statt i in der Variable pin' },
    ],
  },
  {
    baseLine: 'int index = werte.length - 1;',
    mutations: [
      { line: 'int index = werte.length + 1;', hint: 'Plus statt Minus' },
      { line: 'int lndex = werte.length - 1;', hint: 'l statt I am Wortanfang' },
    ],
  },
];

function withDifficulty(list, difficulty) {
  return list.map((p, i) => ({ id: `${difficulty}-${i}`, difficulty, ...p }));
}

const ALL_PUZZLES = [
  ...withDifficulty(EASY_PUZZLES, 'easy'),
  ...withDifficulty(MEDIUM_PUZZLES, 'medium'),
  ...withDifficulty(HARD_PUZZLES, 'hard'),
];

// Runde 1-2 = easy, Runde 3-4 = medium, ab Runde 5 = hard
function difficultyForRound(round) {
  if (round <= 2) return 'easy';
  if (round <= 4) return 'medium';
  return 'hard';
}

// Baut ein spielbares Raetsel fuer eine gegebene Runde: 8 Zeilen, davon
// eine zufaellig ersetzte Mutation. Gibt { lines, correctIndex, difficulty }
// zurueck. correctIndex zeigt auf die ABWEICHENDE Zeile (die gesucht wird).
function buildRoundPuzzle(round) {
  const difficulty = difficultyForRound(round);
  const pool = ALL_PUZZLES.filter((p) => p.difficulty === difficulty);
  const puzzle = pool[Math.floor(Math.random() * pool.length)];
  const mutation = puzzle.mutations[Math.floor(Math.random() * puzzle.mutations.length)];

  const lines = new Array(8).fill(puzzle.baseLine);
  const correctIndex = Math.floor(Math.random() * 8);
  lines[correctIndex] = mutation.line;

  return {
    puzzleId: puzzle.id,
    difficulty,
    lines,
    correctIndex,
  };
}

module.exports = {
  ALL_PUZZLES,
  difficultyForRound,
  buildRoundPuzzle,
};
