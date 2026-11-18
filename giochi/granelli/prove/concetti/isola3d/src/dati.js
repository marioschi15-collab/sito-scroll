// Dati del gioco: le cose, i colori dei gettoni, le icone disegnate a mano in SVG.

export const COSE = {
  terra:    { nome: 'Terra',    c: ['#e0aa6e', '#9c6337'], ic: '#fff' },
  acqua:    { nome: 'Acqua',    c: ['#8be3ff', '#2588dd'], ic: '#fff' },
  fuoco:    { nome: 'Fuoco',    c: ['#ffd66b', '#f04a24'], ic: '#fff' },
  aria:     { nome: 'Aria',     c: ['#ffffff', '#b4d6ee'], ic: '#5b8fbf' },
  fango:    { nome: 'Fango',    c: ['#9b7352', '#4e3221'], ic: '#fff', frase: 'Terra e acqua: morbido e lucido.' },
  argilla:  { nome: 'Argilla',  c: ['#f4a877', '#c45d36'], ic: '#fff', frase: 'Il vento asciuga il fango.' },
  lava:     { nome: 'Lava',     c: ['#ffbd4a', '#d62f17'], ic: '#fff', frase: 'La terra si scioglie nel fuoco.' },
  pietra:   { nome: 'Pietra',   c: ['#d6d3cc', '#7d7a76'], ic: '#fff', frase: 'La lava si raffredda e si fa dura.' },
  vapore:   { nome: 'Vapore',   c: ['#ffffff', '#c3cfdd'], ic: '#7189a6', frase: 'Acqua e fuoco: una nuvoletta calda.' },
  nuvola:   { nome: 'Nuvola',   c: ['#ffffff', '#c8d8ea'], ic: '#6f90b8', frase: 'Il vapore sale e si raccoglie.' },
  pioggia:  { nome: 'Pioggia',  c: ['#bfe0ff', '#5a8cd0'], ic: '#fff', frase: 'La nuvola è piena: piove!' },
  germoglio:{ nome: 'Germoglio',c: ['#c4f082', '#56a83a'], ic: '#fff', frase: 'Sotto la pioggia il fango si sveglia.' },
  pianta:   { nome: 'Pianta',   c: ['#a6e070', '#3c9636'], ic: '#fff', frase: 'Il germoglio cresce a vista d’occhio.' },
  albero:   { nome: 'Albero',   c: ['#86d46c', '#2b7a37'], ic: '#fff', frase: 'Radici, tronco e tante foglie.' },
  incendio: { nome: 'Incendio', c: ['#ffa646', '#c22a1a'], ic: '#fff', frase: 'Il fuoco si mangia il bosco.' },
  cenere:   { nome: 'Cenere',   c: ['#a59f98', '#4f4b48'], ic: '#fff', frase: 'Quel che resta del fuoco. Nutre la terra.' },
  legno:    { nome: 'Legno',    c: ['#dca46c', '#8a5631'], ic: '#fff', frase: 'Una pietra abbatte l’albero.' },
  utensile: { nome: 'Utensile', c: ['#d8c6a6', '#7a674e'], ic: '#fff', frase: 'Pietra e legno: il primo attrezzo.' },
  omini:    { nome: 'Omini',    c: ['#ffd2a2', '#e07f50'], ic: '#fff', frase: 'Vita! Qualcuno abita l’isola.' },
  mattone:  { nome: 'Mattone',  c: ['#f09068', '#a8402a'], ic: '#fff', frase: 'Argilla cotta nel fuoco.' },
  casa:     { nome: 'Casa',     c: ['#ffdcae', '#e3834b'], ic: '#fff', frase: 'Mattoni e legno: un tetto per tutti.' },
  collina:  { nome: 'Collina',  c: ['#b0e07e', '#5c9d47'], ic: '#fff', frase: 'Terra su terra: l’isola si alza.' },
  sabbia:   { nome: 'Sabbia',   c: ['#ffeab8', '#dcae5e'], ic: '#9c7234', frase: 'Il vento sbriciola la pietra.' },
  vetro:    { nome: 'Vetro',    c: ['#e2fdff', '#78cadd'], ic: '#2f8aa1', frase: 'La sabbia nel fuoco diventa trasparente.' },
};

export const SCOPERTE = ['fango', 'argilla', 'lava', 'pietra', 'vapore', 'nuvola', 'pioggia', 'germoglio', 'pianta', 'albero',
  'incendio', 'cenere', 'legno', 'utensile', 'omini', 'mattone', 'casa', 'collina', 'sabbia', 'vetro'];

export const GETTONI_BASE = ['terra', 'acqua', 'fuoco', 'aria'];
// Le scoperte che diventano anche gettoni da trascinare.
export const GETTONI_NUOVI = ['fango', 'lava', 'argilla', 'pietra', 'nuvola', 'germoglio', 'legno', 'mattone', 'sabbia'];

// Suggerimenti in ordine di percorso: [scoperta che manca, idea]
export const IDEE = [
  ['fango', 'Trascina l’Acqua sull’erba'],
  ['lava', 'Prova il Fuoco sulla terra, vicino al mare'],
  ['pietra', 'L’Acqua sulla lava la raffredda'],
  ['vapore', 'Il Fuoco nel mare… cosa succede?'],
  ['argilla', 'Il vento sul Fango: trascina l’Aria'],
  ['germoglio', 'Quando piove sul fango…'],
  ['mattone', 'Il Fuoco sull’Argilla'],
  ['legno', 'Una Pietra su un albero'],
  ['omini', 'Il Fango su un albero… nasce qualcuno'],
  ['casa', 'Il Legno sui Mattoni'],
  ['utensile', 'La Pietra sul Legno'],
  ['incendio', 'Il Fuoco su un albero (attenzione!)'],
  ['collina', 'La Terra sopra la terra'],
  ['sabbia', 'L’Aria sopra la pietra'],
  ['vetro', 'Il Fuoco sulla sabbia della spiaggia'],
];

const S = (d) => d;
const ombra = 'fill="#000" fill-opacity=".16"';
export const ICONE = {
  terra: S(`<path d="M3 32c4-9 9-13 15-13 4 0 6 2 8 1 5-2 9 3 11 12z"/><path d="M13 19l1-6 2 6M22 19l2-7 1 7M28 21l2-4 1 4" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 32c4-5 9-7 14-6" ${ombra}/>`),
  acqua: S(`<path d="M20 4C15 12 9 18 9 25a11 11 0 0 0 22 0c0-7-6-13-11-21z"/><path d="M14 25a6 6 0 0 0 5 6" stroke="#000" stroke-opacity=".16" stroke-width="2.6" fill="none" stroke-linecap="round"/>`),
  fuoco: S(`<path d="M20 3c2 7 10 11 10 20a10 10 0 0 1-20 0c0-5 3-8 5-10 0 4 2 6 4 7-1-6 0-12 1-17z"/><path d="M20 21c3 3 5 6 5 9a5 5 0 0 1-10 0c0-3 2-6 5-9z" ${ombra}/>`),
  aria: S(`<g fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"><path d="M5 15h17a5 5 0 1 0-5-5"/><path d="M5 22h25a5 5 0 1 1-5 5"/><path d="M5 29h11"/></g>`),
  fango: S(`<path d="M5 28c0-6 6-8 9-12 2-3 5-4 7-2 3 3 6 3 9 6 3 3 5 9-2 11-6 2-16 2-20 0-2-1-3-2-3-3z"/><circle cx="14" cy="26" r="2.2" ${ombra}/><circle cx="24" cy="28" r="2.6" ${ombra}/><circle cx="21" cy="21" r="1.6" ${ombra}/>`),
  argilla: S(`<path d="M14 5h12v3c0 2-3 3-3 6 0 2 7 4 7 12 0 6-5 9-10 9s-10-3-10-9c0-8 7-10 7-12 0-3-3-4-3-6z"/><path d="M11 23h18" stroke="#000" stroke-opacity=".16" stroke-width="2.6"/>`),
  lava: S(`<path d="M3 35l11-18h12l11 18z"/><path d="M14 17c2 4 0 8 3 10s4-3 3-6 5-1 6-4z" ${ombra}/><circle cx="16" cy="9" r="3"/><circle cx="24" cy="5.5" r="2.2"/>`),
  pietra: S(`<path d="M6 27l4-11 9-5 11 4 4 11-6 7H12z"/><path d="M10 16l9 5 11-6M19 21l-2 12" stroke="#000" stroke-opacity=".16" stroke-width="2" fill="none"/>`),
  vapore: S(`<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="M12 34c-4-4 4-7 0-11s4-7 0-11"/><path d="M20 34c-4-4 4-7 0-11s4-7 0-11"/><path d="M28 34c-4-4 4-7 0-11s4-7 0-11"/></g>`),
  nuvola: S(`<path d="M11 31a7 7 0 0 1-1-14 9 9 0 0 1 17-3 7.5 7.5 0 0 1 3 17z"/>`),
  pioggia: S(`<path d="M11 22a6 6 0 0 1-1-12 8 8 0 0 1 15-3 6.5 6.5 0 0 1 3 15z"/><g stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="M14 27l-2 6M21 27l-2 6M28 27l-2 6"/></g>`),
  germoglio: S(`<path d="M19 34V21" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M19 22C19 14 12 11 6 12c0 7 6 11 13 10z"/><path d="M20 19c0-6 5-10 13-10 0 7-5 11-13 10z"/><ellipse cx="19" cy="34" rx="9" ry="2.6"/>`),
  pianta: S(`<circle cx="13" cy="22" r="8"/><circle cx="26" cy="21" r="8.5"/><circle cx="20" cy="14" r="7.5"/><rect x="7" y="30" width="26" height="4" rx="2"/>`),
  albero: S(`<path d="M18 25h4v10h-4z"/><circle cx="20" cy="14" r="10.5"/><circle cx="13" cy="20" r="6"/><circle cx="27" cy="20" r="6"/>`),
  incendio: S(`<path d="M14 6c2 6 8 9 8 16a8 8 0 0 1-16 0c0-4 2-6 4-8 0 3 1 4 3 5-1-5 0-9 1-13z"/><path d="M27 12c2 5 8 8 8 14a7 7 0 0 1-14 0c0-3 2-5 3-7 0 2 1 4 3 4-1-4-1-8 0-11z"/>`),
  cenere: S(`<path d="M4 33c3-8 9-12 16-12s13 4 16 12z"/><circle cx="14" cy="14" r="2.2"/><circle cx="22" cy="9" r="1.7"/><circle cx="28" cy="15" r="2.4"/>`),
  legno: S(`<rect x="4" y="13" width="27" height="14" rx="7"/><circle cx="31" cy="20" r="7"/><circle cx="31" cy="20" r="3.4" ${ombra}/>`),
  utensile: S(`<path d="M11 35L27 11" stroke="currentColor" stroke-width="3.8" stroke-linecap="round"/><path d="M21 6l12 3-2 11-10-3c-3-1-4-9 0-11z"/>`),
  omini: S(`<circle cx="13" cy="11" r="5"/><path d="M5 35c0-9 3-15 8-15s8 6 8 15z"/><circle cx="27.5" cy="13" r="4.4"/><path d="M20 35c0-8 3-13 7.5-13s7.5 5 7.5 13z"/>`),
  mattone: S(`<rect x="3" y="23" width="16" height="10" rx="1.6"/><rect x="21" y="23" width="16" height="10" rx="1.6"/><rect x="12" y="11" width="16" height="10" rx="1.6"/>`),
  casa: S(`<path d="M4 19L20 6l16 13z"/><path d="M9 19h22v16H9z"/><path d="M17 26h6v9h-6z" ${ombra}/><rect x="26" y="8" width="4" height="8"/>`),
  collina: S(`<path d="M2 34c5-12 10-17 15-17s8 5 10 9c2-5 5-8 8-8s4 6 5 16z"/>`),
  sabbia: S(`<path d="M3 30c6-6 12-6 18-2 5-4 11-5 16 0v6H3z"/><circle cx="12" cy="15" r="1.9"/><circle cx="20" cy="10" r="1.9"/><circle cx="27" cy="17" r="1.9"/><circle cx="17" cy="21" r="1.6"/>`),
  vetro: S(`<path d="M12 5h16l6 10-14 20L6 15z"/><path d="M6 15h28M16 5l-2 10 6 20M24 5l2 10-6 20" stroke="#000" stroke-opacity=".16" stroke-width="1.6" fill="none"/>`),
  stella: S(`<path d="M20 3l5 11 12 1.3-9 8 2.8 12L20 29l-10.8 6.3 2.8-12-9-8L15 14z"/>`),
  sole: S(`<circle cx="20" cy="20" r="7.5"/><g stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M20 3v4M20 33v4M3 20h4M33 20h4M8 8l3 3M29 29l3 3M8 32l3-3M29 11l3-3"/></g>`),
  luna: S(`<path d="M25 4a15 15 0 1 0 11 24A13 13 0 0 1 25 4z"/>`),
  suono: S(`<path d="M5 15h7l9-8v26l-9-8H5z"/><path d="M26 13a9 9 0 0 1 0 14M30 9a14 14 0 0 1 0 22" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>`),
  muto: S(`<path d="M5 15h7l9-8v26l-9-8H5z"/><path d="M27 15l9 10M36 15l-9 10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`),
  mano: S(`<path d="M15 21V8a3 3 0 0 1 6 0v10l1-1a3 3 0 0 1 5 1l1-1a3 3 0 0 1 5 1v2a3 3 0 0 1 4 2v5c0 7-5 12-12 12h-2c-4 0-7-2-9-5l-6-9a3 3 0 0 1 5-3z" stroke="#3b3346" stroke-width="2" stroke-linejoin="round"/>`),
};

export function svg(nome, colore) {
  return `<svg viewBox="0 0 40 40" fill="currentColor" style="color:${colore || 'currentColor'}" aria-hidden="true">${ICONE[nome] || ''}</svg>`;
}
