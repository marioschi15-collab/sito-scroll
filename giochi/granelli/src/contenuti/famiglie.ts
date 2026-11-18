/**
 * I capitoli del Libro, nell'ordine in cui si sfogliano: [chiave, nome]. Una famiglia nuova si aggiunge qui, prima
 * delle ere, che chiudono il Libro, vicino ai capitoli che le somigliano (la chiave conta, il posto no); le miscele
 * hanno un capitolo a parte, senza fine, che non sta qui.
 * I capitoli nati con la grande infornata (P8) sono segnati: le loro voci stanno nei sei file della grande infornata.
 */
export const FAMIGLIE: readonly (readonly [string, string])[] = [
  ['elementi', 'I quattro elementi'],
  ['terra', 'Terra e pietre'],
  ['cielo', 'Acqua e cielo'],
  ['fuoco', 'Fuoco e fumo'],
  ['vita', 'Vita'],
  ['animali', 'Animali'], // P8
  ['cucina', 'In cucina'], // P8
  ['genti', 'Genti'],
  ['cose', 'Invenzioni'],
  ['casa', 'Casa e bottega'], // P8
  ['saperi', 'Città e saperi'], // P8
  ['macchine', 'Scienza e macchine'], // P8
  ['moderno', 'Mondo moderno'], // P8
  ['spazio', 'Spazio'], // P8
  ['feste', 'Stagioni e feste'], // P8
  ['ere', 'Ere ed eventi'],
];
