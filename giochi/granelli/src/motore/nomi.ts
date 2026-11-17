import { GAS, LIQUIDO, POLVERE, type Sostanza } from './materiali.js';
import { dado, tratti } from './miscele.js';

type Nome = readonly [string, 'm' | 'f'];
type Aggettivo = readonly [string, string];

/** Come si può chiamare una miscela, a seconda di cos'è. */
const NOMI: Record<number, readonly Nome[]> = {
  [POLVERE]: [
    ['Polvere', 'f'], ['Ghiaia', 'f'], ['Farina', 'f'], ['Limatura', 'f'], ['Pomice', 'f'], ['Graniglia', 'f'], ['Fuliggine', 'f'], ['Brina', 'f'],
    ['Rena', 'f'], ['Pulviscolo', 'm'], ['Sale', 'm'], ['Lapillo', 'm'], ['Pietrisco', 'm'], ['Gesso', 'm'], ['Talco', 'm'], ['Tritume', 'm'],
  ],
  [LIQUIDO]: [
    ['Melma', 'f'], ['Linfa', 'f'], ['Resina', 'f'], ['Pozione', 'f'], ['Tintura', 'f'], ['Colla', 'f'], ['Rugiada', 'f'], ['Schiuma', 'f'],
    ['Sciroppo', 'm'], ['Inchiostro', 'm'], ['Succo', 'm'], ['Brodo', 'm'], ['Siero', 'm'], ['Balsamo', 'm'], ['Nettare', 'm'], ['Elisir', 'm'],
  ],
  [GAS]: [
    ['Nebbia', 'f'], ['Foschia', 'f'], ['Bruma', 'f'], ['Esalazione', 'f'], ['Brezza', 'f'], ['Caligine', 'f'], ['Nube', 'f'], ['Aura', 'f'],
    ['Alito', 'm'], ['Soffio', 'm'], ['Miasma', 'm'], ['Effluvio', 'm'], ['Sbuffo', 'm'], ['Etere', 'm'], ['Respiro', 'm'], ['Vento', 'm'],
  ],
  0: [
    ['Roccia', 'f'], ['Lega', 'f'], ['Crosta', 'f'], ['Ambra', 'f'], ['Gemma', 'f'], ['Ceramica', 'f'], ['Scoria', 'f'], ['Selce', 'f'],
    ['Cristallo', 'm'], ['Blocco', 'm'], ['Minerale', 'm'], ['Smalto', 'm'], ['Marmo', 'm'], ['Corallo', 'm'], ['Quarzo', 'm'], ['Granito', 'm'],
  ],
};

/** Gli aggettivi (maschile, femminile) che raccontano il carattere più forte di una miscela. */
const AGGETTIVI: Record<string, readonly Aggettivo[]> = {
  caldo: [['ardente', 'ardente'], ['rovente', 'rovente'], ['bollente', 'bollente'], ['incandescente', 'incandescente'], ['infuocato', 'infuocata'], ['torrido', 'torrida'], ['cocente', 'cocente']],
  freddo: [['gelido', 'gelida'], ['glaciale', 'glaciale'], ['ghiacciato', 'ghiacciata'], ['brinato', 'brinata'], ['polare', 'polare'], ['algido', 'algida']],
  luce: [['lucente', 'lucente'], ['luminoso', 'luminosa'], ['splendente', 'splendente'], ['fosforescente', 'fosforescente'], ['radioso', 'radiosa'], ['brillante', 'brillante'], ['stellato', 'stellata']],
  brucia: [['infiammabile', 'infiammabile'], ['focoso', 'focosa'], ['resinoso', 'resinosa'], ['secco', 'secca'], ['stoppaccioso', 'stoppacciosa']],
  esplode: [['esplosivo', 'esplosiva'], ['tonante', 'tonante'], ['instabile', 'instabile'], ['scoppiettante', 'scoppiettante'], ['irrequieto', 'irrequieta']],
  fertile: [['fertile', 'fertile'], ['fecondo', 'feconda'], ['grasso', 'grassa'], ['rigoglioso', 'rigogliosa'], ['generoso', 'generosa']],
  vivo: [['vivo', 'viva'], ['strisciante', 'strisciante'], ['selvatico', 'selvatica'], ['rampicante', 'rampicante'], ['inquieto', 'inquieta']],
  veleno: [['velenoso', 'velenosa'], ['tossico', 'tossica'], ['amaro', 'amara'], ['funesto', 'funesta'], ['mefitico', 'mefitica']],
  nutre: [['dolce', 'dolce'], ['saporito', 'saporita'], ['nutriente', 'nutriente'], ['goloso', 'golosa'], ['mielato', 'mielata']],
  corrode: [['corrosivo', 'corrosiva'], ['mordente', 'mordente'], ['acido', 'acida'], ['vorace', 'vorace'], ['pungente', 'pungente']],
};

const COLORI: readonly Aggettivo[] = [
  ['rosso', 'rossa'], ['arancione', 'arancione'], ['giallo', 'gialla'], ['verde', 'verde'], ['turchese', 'turchese'], ['azzurro', 'azzurra'],
  ['blu', 'blu'], ['viola', 'viola'], ['rosa', 'rosa'],
];
const NUMERI = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

function aggettivoColore(s: Sostanza): Aggettivo {
  const [r, g, b] = s.colore;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  if (mx - mn < 28) return mx > 190 ? ['bianco', 'bianca'] : mx < 80 ? ['nero', 'nera'] : ['grigio', 'grigia'];
  const d = mx - mn;
  const h = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) / 6;
  if (h < 0.11 && mx < 150) return ['bruno', 'bruna'];
  if (h > 0.1 && h < 0.17 && mx > 200) return ['dorato', 'dorata'];
  return COLORI[Math.min(COLORI.length - 1, Math.floor(((h + 0.04) % 1) * COLORI.length))];
}

/**
 * Il nome di una miscela: un nome che dice cos'è e un aggettivo che dice che carattere ha ("Melma ardente",
 * "Cristallo gelido"). Se il nome è già preso si aggiunge il colore, e se serve un numero.
 */
export function nomeMiscela(s: Sostanza, id: number, occupato: (nome: string) => boolean): string {
  const r = dado(id ^ 0x51ed);
  const nomi = NOMI[s.stato] ?? NOMI[0];
  const [nome, genere] = nomi[(r() * nomi.length) | 0];
  const g = genere === 'm' ? 0 : 1;
  const forti = tratti(s);
  const elenco = AGGETTIVI[forti[(r() * forti.length) | 0]] ?? AGGETTIVI.luce;
  const semplice = `${nome} ${elenco[(r() * elenco.length) | 0][g]}`;
  if (!occupato(semplice)) return semplice;
  const colorato = `${semplice} ${aggettivoColore(s)[g]}`;
  if (!occupato(colorato)) return colorato;
  for (const n of NUMERI) if (!occupato(`${colorato} ${n}`)) return `${colorato} ${n}`;
  return `${colorato} ${id % 1000}`;
}

const COSA: Record<number, string> = {
  [POLVERE]: 'Polvere',
  [LIQUIDO]: 'Liquido',
  [GAS]: 'Gas',
  0: 'Solido',
};

/** Le parole brevi che riassumono una sostanza nel libro: cos'è e che carattere ha. */
export function etichette(s: Sostanza): string[] {
  const parole: Record<string, string> = {
    caldo: 'Scotta',
    freddo: 'Gela',
    luce: 'Fa luce',
    brucia: 'Brucia',
    esplode: 'Esplode',
    fertile: 'Fertile',
    vivo: 'Si allarga',
    veleno: 'Velenosa',
    nutre: 'Si mangia',
    corrode: 'Corrode',
  };
  return [COSA[s.stato] ?? COSA[0], ...tratti(s).map((t) => parole[t])];
}

/** Due o tre frasi che raccontano come si comporta una miscela, scritte a partire dal suo carattere. */
export function descriviMiscela(s: Sostanza): string {
  const frasi: string[] = [];
  if (s.stato === POLVERE) frasi.push(s.scorre > 0.6 ? 'Una polvere fine, che scivola come sabbia.' : s.scorre < 0.2 ? 'Una polvere che resta dove la metti, quasi un impasto.' : 'Una polvere che si ammucchia in piccoli cumuli.');
  else if (s.stato === LIQUIDO) frasi.push(s.scorre > 0.6 ? 'Un liquido svelto, che cerca subito il punto più basso.' : 'Un liquido denso, che scorre senza fretta.');
  else if (s.stato === GAS) frasi.push('Un gas: sale, si sparpaglia e dopo un po’ si dissolve.');
  else frasi.push('Un solido: resta dove lo metti, anche a mezz’aria.');
  const forti = tratti(s);
  const racconti: Record<string, string> = {
    caldo: 'Scotta: accende quello che può bruciare e fa evaporare l’acqua.',
    freddo: 'È gelida: ghiaccia l’acqua che tocca e spegne il fuoco.',
    luce: 'Al buio fa luce da sola.',
    brucia: 'Prende fuoco facilmente.',
    esplode: 'Attenzione: col fuoco esplode.',
    fertile: 'Dove si posa, le piante spuntano volentieri.',
    vivo: 'Sembra viva: si allarga piano piano su quello che ha intorno.',
    veleno: 'È velenosa: le piante che la toccano muoiono, e gli omini le stanno alla larga.',
    nutre: 'Gli omini la mangiano volentieri.',
    corrode: 'Corrode quello che tocca, finché non si consuma.',
  };
  for (const t of forti) frasi.push(racconti[t]);
  // Galleggia solo ciò che può muoversi: un solido resta dov'è, leggero o no.
  if ((s.stato === POLVERE || s.stato === LIQUIDO) && s.peso < 0.42) frasi.push('È leggera: galleggia sull’acqua.');
  return frasi.join(' ');
}
