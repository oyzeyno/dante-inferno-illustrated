// Resolves painting entries to real Wikimedia Commons files and writes data/paintings.js
// Usage: node tools/build-paintings.js   (Node 18+, polite 1.5s delay between API calls)
const fs = require('fs');
const path = require('path');
const API = 'https://commons.wikimedia.org/w/api.php';
const UA = { 'User-Agent': 'InfernoIllustratedBook/1.0 (personal educational project)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const DORE = { artist: 'Gustave Doré', date: '1861', medium: 'Wood engraving (Hachette edition of the Inferno)' };
const BLAKE = { artist: 'William Blake', date: '1824–1827', medium: 'Pen, ink and watercolour (Dante series)' };
const dp = (n, extra) => `Gustave Doré - Dante Alighieri - Inferno - Plate ${n} (${extra}).jpg`;

// canto, lines [start,end], title, plus either `file` (exact) or `q` (search) with `must` (regex the filename must match)
const P = [
  // I
  { c: 1, l: [1, 3], t: 'The Dark Wood', ...DORE, file: dp(1, 'I found myself within a forest dark...') },
  { c: 1, l: [31, 36], t: 'The Panther', ...DORE, file: dp(2, 'the panther') },
  { c: 1, l: [31, 54], t: 'Dante Running from the Three Beasts', ...BLAKE, q: 'Blake Dante running from the three beasts', must: /Blake|three beasts/i },
  { c: 1, l: [44, 48], t: 'The Lion', ...DORE, file: dp(3, 'The lion') },
  { c: 1, l: [61, 66], t: 'Dante Meets Virgil', ...DORE, file: dp(4, 'Dante meets Virgil') },
  { c: 1, l: [133, 136], t: 'Then he moved on, and I behind him followed', ...DORE, file: dp(5, 'End of Canto I') },
  // II
  { c: 2, l: [1, 6], t: 'Day was departing', ...DORE, file: dp(6, 'Start of Canto II - Day was departing') },
  { c: 2, l: [52, 74], t: 'Beatrice', ...DORE, file: dp(7, 'Beatrice') },
  // III
  { c: 3, l: [1, 9], t: 'The Gate of Hell', ...DORE, file: dp(8, 'Canto III - Abandon all hope ye who enter here') },
  { c: 3, l: [1, 9], t: 'The Inscription over the Gate', ...BLAKE, q: 'Blake Inscription over the Gate Hell', must: /Blake|Inscription/i },
  { c: 3, l: [10, 21], t: 'The Map of Hell (La mappa dell\'Inferno)', artist: 'Sandro Botticelli', date: 'c. 1480–1495', medium: 'Silverpoint, ink and tempera on parchment', location: 'Biblioteca Apostolica Vaticana, Vatican City', q: 'Botticelli Map of Hell', must: /Botticelli/i },
  { c: 3, l: [82, 87], t: 'Charon, the Ferryman', ...DORE, file: dp(9, 'Canto III - Charon') },
  { c: 3, l: [109, 117], t: 'Charon Herds the Sinners onto his Boat', ...DORE, file: dp(10, 'Canto III - Charon herds the sinners onto his boat') },
  // IV
  { c: 4, l: [25, 30], t: 'Limbo – The Virtuous Pagans', ...DORE, file: dp(11, 'Canto IV - Limbo, the Viruous Pagans') },
  { c: 4, l: [85, 102], t: 'Dante among the Great Poets', ...DORE, file: dp(12, 'Canto IV - Limbo, Dante is accepted as an equal by the great Greek and Roman poets') },
  { c: 4, l: [86, 93], t: 'Homer and the Ancient Poets', ...BLAKE, q: 'Blake Homer and the Ancient Poets', must: /Blake|Homer/i },
  // V
  { c: 5, l: [4, 12], t: 'Minos', ...DORE, file: dp(13, 'Canto V - Minos') },
  { c: 5, l: [31, 45], t: 'The Hurricane of Souls', ...DORE, file: dp(14, 'Canto V - The hurricane of souls') },
  { c: 5, l: [73, 78], t: 'Francesca da Rimini', ...DORE, file: dp(15, 'Canto V - Francesca di Rimini') },
  { c: 5, l: [82, 87], t: 'Francesca da Rimini II', ...DORE, file: dp(16, 'Canto V - Francesca di Rimini II') },
  { c: 5, l: [106, 108], t: 'The Death of Francesca da Rimini and Paolo Malatesta', artist: 'Alexandre Cabanel', date: '1870', medium: 'Oil on canvas', location: 'Musée d\'Orsay, Paris', q: 'Cabanel Death of Francesca da Rimini Paolo Malatesta', must: /Cabanel/i },
  { c: 5, l: [127, 133], t: 'Francesca and Paolo', ...DORE, file: dp(17, 'Canto V - Francesca di Rimini and her brother in law') },
  { c: 5, l: [127, 138], t: 'Francesca da Rimini', artist: 'Ary Scheffer', date: '1835', medium: 'Oil on canvas', location: 'Wallace Collection, London', q: 'Ary Scheffer Francesca da Rimini 1835', must: /Scheffer/i },
  { c: 5, l: [130, 136], t: 'Paolo and Francesca da Rimini', artist: 'Dante Gabriel Rossetti', date: '1855', medium: 'Watercolour on paper', location: 'Tate Britain, London', q: 'Rossetti Paolo and Francesca da Rimini 1855', must: /Rossetti/i },
  { c: 5, l: [136, 138], t: 'Paolo and Francesca', artist: 'Anselm Feuerbach', date: '1864', medium: 'Oil on canvas', location: 'Schack Collection, Munich', q: 'Feuerbach Paolo und Francesca', must: /Feuerbach/i },
  { c: 5, l: [139, 142], t: 'And fell, even as a dead body falls', ...DORE, file: dp(18, 'Canto V - Dante has a touch of the vapours') },
  { c: 5, l: [139, 142], t: 'The Circle of the Lustful (The Whirlwind of Lovers)', ...BLAKE, location: 'Birmingham Museum and Art Gallery', q: 'Blake Circle of the Lustful Francesca', must: /Blake|Lustful|Lovers/i },
  // VI
  { c: 6, l: [13, 21], t: 'Cerberus', ...DORE, q: 'Doré Inferno Canto VI Cerberus', must: /Dor[eé].*(Canto VI\b|Cerberus)/i },
  { c: 6, l: [22, 33], t: 'Cerberus', ...BLAKE, q: 'William Blake Cerberus Dante', must: /Blake.*Cerberus|Cerberus.*Blake/i },
  { c: 6, l: [37, 54], t: 'Ciacco', ...DORE, q: 'Doré Inferno Canto VI Ciacco', must: /Dor[eé].*(Canto VI\b|Ciacco)/i },
  // VII
  { c: 7, l: [1, 15], t: 'Plutus', ...BLAKE, q: 'William Blake Plutus Dante', must: /Plutus/i },
  { c: 7, l: [25, 35], t: 'Hoarders and Wasters', ...DORE, file: dp(22, 'Canto VII - Hoarders and Wasters') },
  { c: 7, l: [109, 116], t: 'The Wrathful in the Styx', ...DORE, q: 'Doré Inferno Canto VII Styx wrathful', must: /Dor[eé].*(Canto VII\b|Styx)/i },
  // VIII
  { c: 8, l: [13, 24], t: 'Phlegyas', ...DORE, q: 'Doré Inferno Canto VIII Phlegyas', must: /Dor[eé].*(Canto VIII|Phlegyas)/i },
  { c: 8, l: [31, 42], t: 'The Barque of Dante', artist: 'Eugène Delacroix', date: '1822', medium: 'Oil on canvas', location: 'Musée du Louvre, Paris', q: 'Delacroix Barque of Dante', must: /Delacroix/i },
  { c: 8, l: [40, 51], t: 'Filippo Argenti', ...DORE, q: 'Doré Inferno Canto VIII Filippo Argenti', must: /Dor[eé].*(Canto VIII|Argenti)/i },
  // IX
  { c: 9, l: [37, 51], t: 'The Furies', ...DORE, q: 'Doré Inferno Canto IX Furies', must: /Dor[eé].*(Canto IX|Furies|Erinyes)/i },
  { c: 9, l: [79, 90], t: 'The Heavenly Messenger', ...DORE, q: 'Doré Inferno Canto IX angel messenger', must: /Dor[eé].*(Canto IX|messenger|angel)/i },
  // X
  { c: 10, l: [31, 42], t: 'Farinata degli Uberti', ...DORE, q: 'Doré Inferno Canto X Farinata', must: /Dor[eé].*(Canto X\b|Farinata)/i },
  // XI
  { c: 11, l: [6, 9], t: 'The Tomb of Pope Anastasius', ...DORE, q: 'Doré Inferno Canto XI Anastasius', must: /Dor[eé].*(Canto XI\b|Anastasius)/i },
  // XII
  { c: 12, l: [11, 25], t: 'The Minotaur', ...DORE, q: 'Doré Inferno Canto XII Minotaur', must: /Dor[eé].*(Canto XII\b|Minotaur)/i },
  { c: 12, l: [55, 75], t: 'The Centaurs', ...DORE, q: 'Doré Inferno Canto XII Centaurs', must: /Dor[eé].*(Canto XII\b|Centaur)/i },
  // XIII
  { c: 13, l: [10, 15], t: 'The Harpies in the Wood of the Suicides', ...DORE, q: 'Doré Inferno Canto XIII Harpies', must: /Dor[eé].*(Canto XIII|Harp)/i },
  { c: 13, l: [1, 15], t: 'The Wood of the Self-Murderers: The Harpies and the Suicides', ...BLAKE, location: 'Tate, London', q: 'Blake Wood of the Self-Murderers Harpies Suicides', must: /Blake|Self-Murderers|Suicides/i },
  { c: 13, l: [31, 39], t: 'Pier della Vigna', ...DORE, q: 'Doré Inferno Canto XIII Pier delle Vigne', must: /Dor[eé].*(Canto XIII|Vign)/i },
  // XIV
  { c: 14, l: [46, 51], t: 'Capaneus', ...DORE, q: 'Doré Inferno Canto XIV Capaneus', must: /Dor[eé].*(Canto XIV|Capaneus)/i },
  { c: 14, l: [43, 72], t: 'Capaneus the Blasphemer', ...BLAKE, q: 'Blake Capaneus the Blasphemer', must: /Capaneus/i },
  // XV
  { c: 15, l: [22, 30], t: 'Brunetto Latini', ...DORE, q: 'Doré Inferno Canto XV Brunetto Latini', must: /Dor[eé].*(Canto XV\b|Brunetto)/i },
  // XVI
  { c: 16, l: [19, 27], t: 'The Three Florentines', ...DORE, q: 'Doré Inferno Canto XVI', must: /Dor[eé].*(Canto XVI\b)/i },
  // XVII
  { c: 17, l: [1, 27], t: 'Geryon', ...DORE, q: 'Doré Inferno Canto XVII Geryon', must: /Dor[eé].*(Canto XVII\b|Geryon)/i },
  { c: 17, l: [79, 99], t: 'Geryon Conveying Dante and Virgil Downwards', ...BLAKE, q: 'Blake Geryon Conveying Dante and Virgil Downwards', must: /Geryon/i },
  // XVIII
  { c: 18, l: [1, 18], t: 'Malebolge (Inferno XVIII)', artist: 'Sandro Botticelli', date: 'c. 1480–1495', medium: 'Silverpoint and ink on parchment', location: 'Kupferstichkabinett, Berlin', q: 'Botticelli Inferno XVIII', must: /Botticelli/i },
  { c: 18, l: [112, 126], t: 'The Flatterers', ...DORE, q: 'Doré Inferno Canto XVIII flatterers', must: /Dor[eé].*(Canto XVIII|Flatter)/i },
  { c: 18, l: [127, 136], t: 'Thaïs', ...DORE, q: 'Doré Inferno Canto XVIII Thais', must: /Dor[eé].*(Canto XVIII|Tha[iï]s)/i },
  // XIX
  { c: 19, l: [13, 30], t: 'The Punishment of the Simonists', ...DORE, file: 'Gustove Dore, The Divine Comedy, Inferno, plate 45, The Punishment of Simonists.jpg' },
  { c: 19, l: [31, 51], t: 'The Simoniac Pope', ...BLAKE, location: 'Tate, London', q: 'Blake Simoniac Pope', must: /Simoniac/i },
  // XX
  { c: 20, l: [10, 24], t: 'The Soothsayers', ...DORE, q: 'Doré Inferno Canto XX soothsayers', must: /Dor[eé].*(Canto XX\b|Soothsay|Diviner)/i },
  // XXI
  { c: 21, l: [29, 45], t: 'The Malebranche', ...DORE, q: 'Doré Inferno Canto XXI demons', must: /Dor[eé].*(Canto XXI\b|Malebranche|demon)/i },
  { c: 21, l: [46, 57], t: 'The Devils under the Bridge', ...BLAKE, q: 'Blake Devils under the Bridge Dante', must: /Devils/i },
  // XXII
  { c: 22, l: [118, 132], t: 'Ciampolo the Navarrese', ...DORE, q: 'Doré Inferno Canto XXII', must: /Dor[eé].*(Canto XXII\b|Ciampolo|Navarr)/i },
  { c: 22, l: [133, 151], t: 'The Baffled Devils Fighting', ...BLAKE, q: 'Blake Baffled Devils Fighting', must: /Baffled|Devils/i },
  // XXIII
  { c: 23, l: [58, 67], t: 'The Hypocrites', ...DORE, q: 'Doré Inferno Canto XXIII hypocrites', must: /Dor[eé].*(Canto XXIII|Hypocrit)/i },
  { c: 23, l: [110, 120], t: 'Caiaphas', ...DORE, q: 'Doré Inferno Canto XXIII Caiaphas', must: /Dor[eé].*(Canto XXIII|Caiaphas)/i },
  // XXIV
  { c: 24, l: [82, 96], t: 'The Thieves and the Serpents', ...DORE, q: 'Doré Inferno Canto XXIV serpents thieves', must: /Dor[eé].*(Canto XXIV|Thie|Serpent)/i },
  // XXV
  { c: 25, l: [17, 27], t: 'Cacus', ...DORE, q: 'Doré Inferno Canto XXV Cacus', must: /Dor[eé].*(Canto XXV\b|Cacus)/i },
  { c: 25, l: [49, 78], t: 'The Six-Footed Serpent Attacking Agnolo Brunelleschi', ...BLAKE, q: 'Blake Six-Footed Serpent Agnolo Brunelleschi', must: /Serpent|Brunelleschi/i },
  // XXVI
  { c: 26, l: [52, 63], t: 'Ulysses and Diomedes', ...DORE, q: 'Doré Inferno Canto XXVI Ulysses', must: /Dor[eé].*(Canto XXVI\b|Ulysses)/i },
  { c: 26, l: [52, 63], t: 'Ulysses and Diomed Swathed in the Same Flame', ...BLAKE, q: 'Blake Ulysses and Diomed Swathed in the Same Flame', must: /Ulysses|Diomed/i },
  // XXVII
  { c: 27, l: [58, 66], t: 'Guido da Montefeltro', ...DORE, q: 'Doré Inferno Canto XXVII Guido Montefeltro', must: /Dor[eé].*(Canto XXVII\b|Montefeltro)/i },
  // XXVIII
  { c: 28, l: [22, 31], t: 'Mahomet', ...DORE, q: 'Doré Inferno Canto XXVIII', must: /Dor[eé].*(Canto XXVIII)/i },
  { c: 28, l: [118, 126], t: 'Bertran de Born', ...DORE, q: 'Doré Inferno Canto XXVIII Bertrand de Born', must: /Dor[eé].*(Bertran|Born)/i },
  { c: 28, l: [103, 126], t: 'The Schismatics and Sowers of Discord', ...BLAKE, q: 'Blake Schismatics Sowers of Discord Mosca Bertrand de Born', must: /Schismatic|Mosca|Bertrand/i },
  // XXIX
  { c: 29, l: [73, 84], t: 'The Alchemists', ...DORE, q: 'Doré Inferno Canto XXIX alchemists falsifiers', must: /Dor[eé].*(Canto XXIX|Alchem|Falsif)/i },
  { c: 29, l: [40, 51], t: 'The Pit of Disease: The Falsifiers', ...BLAKE, q: 'Blake Pit of Disease Falsifiers', must: /Falsifiers|Disease/i },
  // XXX
  { c: 30, l: [22, 33], t: 'Dante and Virgil', artist: 'William-Adolphe Bouguereau', date: '1850', medium: 'Oil on canvas', location: 'Musée d\'Orsay, Paris', q: 'Bouguereau Dante and Virgil 1850', must: /Bouguereau/i },
  { c: 30, l: [37, 41], t: 'Myrrha', ...DORE, q: 'Doré Inferno Canto XXX Myrrha', must: /Dor[eé].*(Canto XXX\b|Myrrha)/i },
  { c: 30, l: [100, 108], t: 'Master Adam and Sinon', ...DORE, q: 'Doré Inferno Canto XXX Adam Sinon', must: /Dor[eé].*(Canto XXX\b|Adam|Sinon)/i },
  // XXXI
  { c: 31, l: [31, 45], t: 'The Titans', ...DORE, file: dp(65, 'Canto XXXI - The Titans') },
  { c: 31, l: [130, 145], t: 'Antaeus Lowering Dante and Virgil', ...DORE, q: 'Doré Inferno Canto XXXI Antaeus', must: /Dor[eé].*(Antaeus)/i },
  { c: 31, l: [130, 145], t: 'Antaeus Setting Down Dante and Virgil', ...BLAKE, location: 'National Gallery of Victoria, Melbourne', q: 'Blake Antaeus Setting Down Dante and Virgil', must: /Antaeus/i },
  // XXXII
  { c: 32, l: [19, 24], t: 'The Traitors in the Ice of Cocytus', ...DORE, q: 'Doré Inferno Canto XXXII Cocytus traitors', must: /Dor[eé].*(Canto XXXII|Cocytus|Traitor)/i },
  { c: 32, l: [97, 105], t: 'Bocca degli Abati', ...DORE, q: 'Doré Inferno Canto XXXII Bocca', must: /Dor[eé].*(Canto XXXII|Bocca)/i },
  // XXXIII
  { c: 33, l: [1, 9], t: 'Ugolino and Archbishop Ruggieri', ...DORE, q: 'Doré Inferno Canto XXXIII Ugolino', must: /Dor[eé].*(Canto XXXIII|Ugolino)/i },
  { c: 33, l: [49, 63], t: 'Count Ugolino and his Children in the Dungeon', artist: 'Sir Joshua Reynolds', date: '1773', medium: 'Oil on canvas', location: 'Knole, Kent (National Trust)', q: 'Joshua Reynolds Count Ugolino and his Children', must: /Reynolds|Ugolino/i },
  { c: 33, l: [64, 75], t: 'Count Ugolino and his Sons in Prison', ...BLAKE, q: 'William Blake Ugolino Sons in Prison', must: /Ugolino/i },
  // XXXIV
  { c: 34, l: [28, 36], t: 'Lucifer, King of Hell', ...DORE, q: 'Doré Inferno Canto XXXIV Lucifer', must: /Dor[eé].*(Canto XXXIV|Lucifer|Satan)/i },
  { c: 34, l: [37, 57], t: 'Lucifer', ...BLAKE, q: 'William Blake Lucifer Dante Inferno', must: /Lucifer|Satan/i },
  { c: 34, l: [133, 139], t: 'Thence we came forth to rebehold the stars', ...DORE, q: 'Doré Inferno Canto XXXIV stars', must: /Dor[eé].*(Canto XXXIV|stars)/i },
];

// Exact Doré filenames discovered on Commons (second pass)
const DV = n => `DVinferno${n}_m.jpg`;
const OVR = {
  'C6 Cerberus|Gustave Doré': 'Inferno Canto 6 - Cerberus (148618330).jpg',
  'C6 Cerberus|William Blake': "Illustrations to Dante's Divine Comedy object 11 Butlin 812-11 recto) The Circle of the Gluttons with Cerberus.jpg",
  'C7 The Wrathful in the Styx': DV('VirgilShowSoulsOfWrathful'),
  'C8 Phlegyas': DV('FerryAcrossTheStyx'),
  'C9 The Furies': DV('MegaeraTisifphoneAlecto'),
  'C10 Farinata degli Uberti': DV('UbertiAddressesDante'),
  'C11 The Tomb of Pope Anastasius': 'Inferno Canto 11 verses 6-7.jpg',
  'C12 The Minotaur': DV('MinotaurOnCliff'),
  'C13 The Harpies in the Wood of the Suicides': DV('ForestOfSuicides'),
  'C14 Capaneus': DV('ViolentInRainOfFire'),
  'C15 Brunetto Latini': DV('BrunettoLatiniAccostsDante'),
  'C17 Geryon': 'Geryon by Gustave Doré.jpg',
  'C18 Thaïs': DV('ShadeOfThais'),
  'C21 The Malebranche': 'Inferno Canto 21 verses 50-51.jpg',
  'C22 Ciampolo the Navarrese': DV('CiampoloDemonAlichino'),
  'C23 The Hypocrites': DV('HypocritesAddressDante'),
  'C24 The Thieves and the Serpents': DV('ThievesTorturedBySerpents'),
  'C26 Ulysses and Diomedes': DV('FlamingSpiritsOfEvilCounsellors'),
  'C28 Mahomet': DV('MutilatedShades'),
  'C28 Bertran de Born': DV('SeveredHeadOfBertranddeBorn'),
  'C31 Antaeus Lowering Dante and Virgil': DV('GiantAntaeusLoweringDanteAndVirgil'),
  'C32 The Traitors in the Ice of Cocytus': 'Inferno Canto 32 verses 20-22.jpg',
  'C32 Bocca degli Abati': 'Inferno Canto 32 verses 97-98.jpg',
  'C33 Ugolino and Archbishop Ruggieri': DV('UgolinoGnawingHeadOfRuggieari'),
  'C34 Lucifer, King of Hell': DV('LuciferKingOfHell'),
};
P.forEach(p => {
  const f = OVR[`C${p.c} ${p.t}|${p.artist}`] || OVR[`C${p.c} ${p.t}`];
  if (f) { p.file = f; delete p.q; }
});
P.push(
  { c: 3, l: [118, 120], t: 'The Doomed Souls Cross the Acheron', ...DORE, file: 'DVinfernoDoomedSoulsCrossAcheron.jpg' },
  { c: 8, l: [82, 90], t: 'The Demons Threaten Virgil', ...DORE, file: 'DVinfernoDemonsThreatenVirgil.jpg' },
  { c: 12, l: [11, 14], t: 'The Infamy of Crete', ...DORE, file: 'Inferno Canto 12 verses 11-14.jpg' },
  { c: 17, l: [115, 126], t: 'Into the Abyss on Geryon\'s Back', ...DORE, file: DV('IntoAbyssOnGeryonsBack') },
  { c: 19, l: [46, 51], t: 'Pope Nicholas III', ...DORE, file: 'DvinfernoPopeNicholasIII m.jpg' },
  { c: 20, l: [25, 30], t: 'Virgil Reproves Dante\'s Pity', ...DORE, file: DV('VirgilReprovesDantesCuriosity') },
  { c: 25, l: [64, 78], t: 'Agnello Changing into a Serpent', ...DORE, file: DV('AgnelloChangingIntoSerpent') },
  { c: 32, l: [124, 132], t: 'Ugolino and Ruggieri in the Ice', ...DORE, file: 'Inferno Canto 32 verses 127-129.jpg' },
  { c: 34, l: [20, 21], t: 'Behold Dis', ...DORE, file: 'Inferno Canto 34 verses 20-21.jpg' },
  { c: 16, l: [19, 27], t: 'The Three Florentines', ...DORE, q: 'Inferno Canto 16 verses', must: /Inferno Canto 16\b/i },
  { c: 27, l: [58, 66], t: 'Guido da Montefeltro', ...DORE, q: 'Inferno Canto 27 verses', must: /Inferno Canto 27\b/i },
  { c: 29, l: [73, 84], t: 'The Alchemists', ...DORE, q: 'Inferno Canto 29 verses', must: /Inferno Canto 29\b/i },
  { c: 30, l: [100, 108], t: 'Master Adam and Sinon', ...DORE, q: 'Inferno Canto 30 verses', must: /Inferno Canto 30\b/i },
);
// fix Scheffer match (1855 Louvre version found on Commons)
P.forEach(p => { if (p.artist === 'Ary Scheffer') { p.t = 'The Ghosts of Paolo and Francesca Appear to Dante and Virgil'; p.date = '1855'; p.location = 'Musée du Louvre, Paris'; } });
// cached results from the first pass so we skip repeat searches
const CACHE = {
  'Dante Running from the Three Beasts': 'William Blake - Dante running from the three beasts - Google Art Project.jpg',
  'The Inscription over the Gate': 'The Inscription over Hell-Gate Blake.jpg',
  "The Map of Hell (La mappa dell'Inferno)": "Sandro Botticelli - La Carte de l'Enfer.jpg",
  'Homer and the Ancient Poets': 'Homer and the Ancient Poets Blake.jpg',
  'The Death of Francesca da Rimini and Paolo Malatesta': 'Inf. 06 Alexandre Cabanel, Morte di Francesca da Rimini e di Paolo Malatesta, 1870.jpg',
  'The Ghosts of Paolo and Francesca Appear to Dante and Virgil': '1855 Ary Scheffer - The Ghosts of Paolo and Francesca Appear to Dante and Virgil.jpg',
  'Paolo and Francesca da Rimini': 'Dante Gabriel Rossetti - Paolo and Francesca da Rimini (1855).jpg',
  'Paolo and Francesca': 'Feuerbach Paolo und Francesca.jpg',
  'The Circle of the Lustful (The Whirlwind of Lovers)': 'William Blake, The Circle of the Lustful - Paolo and Francesca, 1827, NGA 11878.jpg',
  'Plutus': 'Blake Plutus Inferno 7 1-15.jpg',
  'The Barque of Dante': 'Eugène Delacroix - The Barque of Dante.jpg',
  'The Wood of the Self-Murderers: The Harpies and the Suicides': 'The Wood of the Self-Murderers.jpg',
  'Malebolge (Inferno XVIII)': 'Botticelli Inferno XVIII.png',
  'The Baffled Devils Fighting': "William Blake - Pl 3, Baffled Devils Fighting (' so turn'd- His talons on his comrade ' Hell, Canto xxii line - B1992.8.8(3) - Yale Center for British Art.jpg",
  'The Six-Footed Serpent Attacking Agnolo Brunelleschi': "William Blake - Pl 4, The Six-Footed Serpent Attacking Agnolo Brunelleschi (' lo^ a serpent with six feet- - B1992.8.8(4) - Yale Center for British Art.jpg",
  'The Pit of Disease: The Falsifiers': 'The Pit of Disease- The Falsifiers.jpg',
  'Dante and Virgil': 'William Bouguereau - Dante and Virgile - Google Art Project 2.jpg',
  'Antaeus Setting Down Dante and Virgil': 'William Blake - Antaeus setting down Dante and Virgil in the Last Circle of Hell - Google Art Project.jpg',
  'Count Ugolino and his Children in the Dungeon': 'Joshua Reynolds Ugolino.jpg',
  'Count Ugolino and his Sons in Prison': 'William Blake - Count Ugolino and his sons in prision.jpg',
  'Lucifer': "Illustrations to Dante's Divine Comedy, object 72 Butlin 812-69 recto Lucifer.jpg",
};
P.forEach(p => { if (p.q && CACHE[p.t]) { p.file = CACHE[p.t]; delete p.q; } });
// drop entries that failed in pass 1 and have no override (avoid slow re-searches)
const RETRY = new Set(['The Three Florentines', 'Guido da Montefeltro', 'The Alchemists', 'Master Adam and Sinon']);
for (let i = P.length - 1; i >= 0; i--) if (P[i].q && !(RETRY.has(P[i].t) && P[i].q.startsWith('Inferno Canto'))) P.splice(i, 1);
P.sort((a, b) => a.c - b.c || a.l[0] - b.l[0]);

async function api(params) {
  const url = API + '?' + new URLSearchParams({ format: 'json', ...params });
  for (let a = 0; a < 5; a++) {
    await sleep(1500 + a * 4000);
    const r = await fetch(url, { headers: UA });
    if (r.ok) { const j = await r.json(); if (!j.error) return j; }
  }
  throw new Error('API failed: ' + url);
}

(async () => {
  const used = new Set();
  for (const p of P) {
    if (p.file) { p.file = 'File:' + p.file; continue; }
    const j = await api({ action: 'query', list: 'search', srnamespace: 6, srsearch: p.q, srlimit: 30 });
    const hit = j.query.search.map(s => s.title)
      .find(t => /\.(jpe?g|png)$/i.test(t) && p.must.test(t) && !used.has(t));
    if (hit) { p.file = hit; used.add(hit); }
    console.log((hit ? 'OK  ' : 'MISS') + ` C${p.c} ${p.t} -> ${hit || ''}`);
  }
  const files = P.filter(p => p.file).map(p => p.file);
  const info = {};
  for (let i = 0; i < files.length; i += 40) {
    const j = await api({ action: 'query', prop: 'imageinfo', iiprop: 'url', iiurlwidth: 1400, titles: files.slice(i, i + 40).join('|') });
    const norm = {}; (j.query.normalized || []).forEach(n => norm[n.to] = n.from);
    Object.values(j.query.pages).forEach(pg => {
      if (!pg.imageinfo) return;
      const ii = pg.imageinfo[0];
      info[norm[pg.title] || pg.title] = { image: ii.thumburl || ii.url, full: ii.url, source: ii.descriptionurl };
    });
  }
  const out = P.filter(p => p.file && info[p.file]).map((p, i) => ({
    id: 'p' + (i + 1), canto: p.c, lines: p.l, title: p.t, artist: p.artist, date: p.date,
    medium: p.medium, location: p.location || '', ...info[p.file],
  }));
  P.filter(p => p.file && !info[p.file]).forEach(p => console.log('NOINFO', p.file));
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'paintings.js'),
    '// Public-domain artworks hosted on Wikimedia Commons\nwindow.PAINTINGS = ' + JSON.stringify(out, null, 1) + ';\n');
  console.log('Wrote', out.length, 'paintings');
})();
