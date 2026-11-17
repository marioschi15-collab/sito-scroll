import { C, E } from '../motore/cose.js';
import { BAMBINO, OMINO, VILLAGGIO } from '../motore/materiali.js';

/** I colori delle figure: ogni lettera dei disegni qui sotto è uno di questi. */
const P: Record<string, string> = {
  k: '#1b1420', n: '#3b2a22', b: '#6b4426', B: '#8f5e36', D: '#b07a48', g: '#1f5a3a', G: '#2f8048', l: '#4fae58', L: '#86d66c',
  r: '#a8362b', R: '#d2553c', O: '#ef7d55', o: '#ff9a2e', y: '#ffd95a', Y: '#fff3b0', w: '#efe6cf', W: '#ffffff', V: '#d8ceb4',
  s: '#7f8794', S: '#aab1bd', d: '#555c68', c: '#3f7fd6', C: '#8fc4ff', p: '#f2c79b', q: '#cf9a6c', h: '#3a2a20', m: '#34426e',
  t: '#c9a55e', T: '#e8cf8a', U: '#f6e6b0', F: '#9fd0ff', A: '#b06ce0', z: '#e0a030', Z: '#a86a18', e: '#9aa4b4', x: '#c8d0dc',
};

/** Prepara una figura una volta sola, con il suo contorno scuro; `scambi` cambia alcuni colori (le finestre di notte). */
export function prepara(righe: readonly string[], scambi?: Record<string, string>): HTMLCanvasElement {
  const w = Math.max(...righe.map((r) => r.length)) + 2;
  const tela = document.createElement('canvas');
  tela.width = w;
  tela.height = righe.length + 2;
  const g = tela.getContext('2d')!;
  const pieno = (i: number, j: number): boolean => j >= 0 && j < righe.length && i >= 0 && i < righe[j].length && righe[j][i] !== '.';
  g.fillStyle = P.k;
  for (let j = -1; j <= righe.length; j++) {
    for (let i = -1; i < w - 1; i++) {
      if (!pieno(i, j) && (pieno(i - 1, j) || pieno(i + 1, j) || pieno(i, j - 1) || pieno(i, j + 1))) g.fillRect(i + 1, j + 1, 1, 1);
    }
  }
  righe.forEach((r, j) => {
    for (let i = 0; i < r.length; i++) {
      if (r[i] === '.') continue;
      g.fillStyle = scambi?.[r[i]] ?? P[r[i]] ?? '#f0f';
      g.fillRect(i + 1, j + 1, 1, 1);
    }
  });
  return tela;
}

const DISEGNI: Record<number, readonly string[]> = {
  [C.FALO]: ['....y....', '...yo....', '...ooy...', '..oyYo...', '..oYYyo..', '.ooYYoo..', 'nbBDbBDbn'],
  [C.CAPANNA]: ['........tTt........', '......ttTUTtt......', '....ttTUUTTTTtt....', '..ttTUUTTtTTTTTtt..', 'ttTUUTTtTTTTtTTTTtt', 'tTTTtTTTTtTTTTtTTTt', '.bBDBBBBBBBBBBBDBb.', '.bBDBFFBBnnBBFFDBb.', '.bBDBFFBBnhBBFFDBb.', '.bBDBBBBBnnBBBBDBb.', '.bBDBBBBBnnBBBBDBb.'],
  [C.CASA]: ['..............dSd....', '..............dSd....', '.....rrrrrrrrrdSdrr..', '....rROORRRRRRRRRRRr.', '...rROORRrRRRRRrRRRRr', '..rROORRRRRRrRRRRRRRr', '.rRRRRRrRRRRRRRRrRRRr', 'rrrrrrrrrrrrrrrrrrrrr', '.VwwwwwwwwwwwwwwwwwV.', '.VwFFwwwwwnnwwwFFwwV.', '.VwFFwwwwwnnwwwFFwwV.', '.VwwwwwwwwnhwwwwwwwV.', '.VwwwwwwwwnnwwwwwwwV.', '.ssSSsssssnnsssSSsss.'],
  [C.TEMPIO]: ['..........SS..........', '.......SSSwWSSS.......', '....SSSwwWWWWwwSSS....', '.SSSwwwwwWWWWwwwwwSSS.', 'SSSSSSSSSSSSSSSSSSSSSS', '.sSSSSSSSSSSSSSSSSSSs.', '..sw..sw..sw..sw..sw..', '..sW..sW..sW..sW..sW..', '..sw..sw..sw..sw..sw..', '..sW..sW..sW..sW..sW..', '..sw..sw..sw..sw..sw..', '..sW..sW..sW..sW..sW..', '.sSSSSSSSSSSSSSSSSSSs.', 'sSSSSSSSSSSSSSSSSSSSSs', 'dssssssssssssssssssssd'],
  [C.POZZO]: ['..bBBBBBBb..', '..b......b..', '..b..nn..b..', '..b..nn..b..', '..b..DD..b..', '.sSSSSSSSSs.', '.SsSSsSSsSS.', '.sSScccSSsS.', '.SsSSsSSsSS.', '.sSSsSSSSsS.'],
  [C.CAMPO]: ['.y..y..y..y..y..y...', '.yy.yy.yy.yy.yy.yy..', '.ly.ly.ly.ly.ly.ly..', '.l..l..l..l..l..l...', 'nbnbnbnbnbnbnbnbnbnb', 'bBbBbBbBbBbBbBbBbBbB'],
  [C.FORNACE]: ['.....dd.....', '.....dS.....', '....rRRr....', '...rRRRRr...', '..rRRrRRRr..', '.rRRRRRRrRr.', '.rRrRRRRRRr.', '.rRRRkkRRRr.', '.rRRkoykRRr.', '.rRRkyYkRRr.', 'ssSSkooksSss'],
  [C.CARRO]: ['..bBBBBBBBBBBb..', '..bDDDDDDDDDDb..', 'bbbBBBBBBBBBBb..', '..bBBBBBBBBBBb..', '..nnn......nnn..', '.nDDDn....nDDDn.', '.nDnDn....nDnDn.', '.nDDDn....nDDDn.', '..nnn......nnn..'],
  [C.BARCA]: ['........b.........', '........bWW.......', '........bWWWW.....', '........bWWWWWW...', '........bWWWW.....', '........b.........', 'bBBBBBBBBBBBBBBBBb', '.bDDDDDDDDDDDDDDb.', '..bBBBBBBBBBBBBb..', '...bbbbbbbbbbbb...'],
  [C.MURA]: ['S.SS.SS.SS.SS.SS', 'SSSSSSSSSSSSSSSS', 'sSSsSSSsSSSsSSSs', 'SSSSsSSSSSsSSSSS', 'sSsSSSSsSSSSsSSs', 'SSSSSsSSSSsSSSSS', 'sSSsSSSSsSSSSsSs', 'SSSSSSsSSSSSsSSS', 'sSsSSSSSsSSsSSSs', 'SSSSsSSSSSSSSsSS', 'dsssssssssssssssd'],
  [C.TORRE]: ['S.SS.SS.S...', 'SSSSSSSSS...', '.sSSSSSs....', '.sSSkSSs....', '.sSSkSSs....', '.sSsSSSs....', '.sSSSsSs....', '.sSSSSSs....', '.sSsSSSs....', '.sSSSSsS....', '.sSSkSSs....', '.sSSkSSs....', '.sSsSSSs....', '.sSSSsSs....', '.sSSSSSs....', '.sSsSSSs....', '.sSSnnSs....', '.sSSnnSs....', 'dsssnnssd...'],
  [C.MULINO]: ['W.......W.........', '.WW...WW..........', '..WWbWW...........', '...bkb............', '..WWbWW...........', '.WW.b.WW..........', 'W..rRr..W.........', '..rRRRr...........', '.rRRRRRr..........', '.wwwwwww..........', '.wwwFwww..........', '.wwwwwww..........', '.wwwwwww..........', '.wwwnnww..........', '.wwwnnww..........', 'sssssssss.........'],
  [C.CASTELLO]: ['S.S.S..................S.S.S', 'SSSSS..................SSSSS', 'sSSSs....r.............sSSSs', 'sSkSs....rRR...........sSkSs', 'sSkSs....r.............sSkSs', 'sSSSs.S.SSS.SS.SS.S.SS.sSSSs', 'sSsSsSSSSSSSSSSSSSSSSSSsSsSs', 'sSSSsSsSSSSsSSSSSsSSSSsSSSSs', 'sSsSsSSSSkSSSSSSkSSSSSSsSsSs', 'sSSSsSSsSkSSSSSSkSSsSSSsSSSs', 'sSkSsSSSSSSSsSSSSSSSSSSsSkSs', 'sSkSsSsSSSSnnnnSSSSSsSSsSkSs', 'sSSSsSSSSSnnnnnnSSSSSSSsSSSs', 'sSsSsSSsSSnnnnnnSSsSSSSsSsSs', 'sSSSsSSSSSnnnnnnSSSSSSSsSSSs', 'dsssssssssnnnnnnssssssssssssd'],
  [C.MERCATO]: ['rrWWrrWWrrWWrrWWrrWW', 'rRWWRRWWRRWWRRWWRRWW', 'rRWWRRWWRRWWRRWWRRWW', '.b................b.', '.b..ooo..lll..yy..b.', '.bBBBBBBBBBBBBBBBBb.', '.bDDDDDDDDDDDDDDDDb.', '.b................b.', '.b................b.'],
  [C.PONTE]: ['b......................b....', 'bBBBBBBBBBBBBBBBBBBBBBBBBBBb', 'bDDDDDDDDDDDDDDDDDDDDDDDDDDb', '.sS....sSSSSSSs....sSSs.....', '.sS...sS......Ss...sSs......', '.sS..sS........Ss..sSs......', '.sS.sS..........SsssSs......'],
  [C.FARO]: ['...YyY....', '..YyYyY...', '...sSs....', '..sSSSs...', '..rRRRr...', '..wwwww...', '..wwwww...', '..rRRRr...', '..rRRRr...', '..wwwww...', '..wwwww...', '..rRRRr...', '..rRRRr...', '..wwwww...', '..wwFww...', '..wwwww...', '.sSSSSSs..', 'sSSnnnSSs.', 'dssnnnssd.'],
  // ── Cose da tasca: si vedono solo nel libro e nel pannello Unisci ──
  [C.UTENSILE]: ['......sS.', '.....sSSS', '....bsSs.', '...bB.s..', '..bB.....', '.bB......', 'bB.......'],
  [C.LANCIA]: ['.......sS', '......sSs', '.....bs..', '....bB...', '...bB....', '..bB.....', '.bB......', 'bB.......'],
  [C.RUOTA]: ['..sSSSs..', '.sS.s.Ss.', 'sS..s..Ss', 'sssssssss', 'sS..s..Ss', '.sS.s.Ss.', '..sSSSs..'],
  [C.VASO]: ['..rRRRr..', '...rRr...', '..rRRRr..', '.rRORRRr.', '.rRORRRr.', '.rRRRRRr.', '..rRRRr..'],
  [C.PANE]: ['..tTTTt..', '.tTUTUTt.', 'tTTTTTTTt', 'tTTTTTTTt', '.ttttttt.'],
  [C.BRONZO]: ['...zzzz..', '..zzZzzz.', '.zzzzzZzz', 'zzZzzzzzz', 'ZZZZZZZZZ'],
  [C.SPADA]: ['.......xe', '......xe.', '.....xe..', '....xe...', '.z.xe....', '..ze.....', '.bzz.....', 'b........'],
  [C.STRADA]: ['.........', 'sSsSSsSsS', 'SsSSsSSsS', 'TtTTtTtTT'],
  [C.SCRITTURA]: ['.RRRRRRR.', '.Rn.nn.R.', '.R.nn.nR.', '.Rnn.n.R.', '.R.n.nnR.', '.RRRRRRR.'],
  [C.MONETA]: ['..zzzz...', '.zzyyzz..', 'zzyzzyzz.', 'zzyzzyzz.', '.zzyyzz..', '..zzzz...'],
  [C.CITTA]: ['....S.......rR...', '...SSS.....rRRr..', '..rSkS.rR..wwww..', '.rRSSSrRRr.wFww..', '.wwSSSwwww.wwww..', 'SSSSSSSSSSSSSSSSS', 'sSsSSsSnnSsSSsSSs'],
  [C.LIBRO]: ['.rrrrrrr.', '.rWWWWWr.', '.rWnnnWr.', '.rWWWWWr.', '.rWnnWWr.', '.rWWWWWr.', '.rrrrrrr.'],
  [C.FERRO]: ['...eeee..', '..eexeee.', '.eeeeexee', 'eexeeeeee', 'ddddddddd'],
  [C.ARATRO]: ['bB.......', '.bB......', '..bBbBbB.', '...bB..e.', '..bB..ee.', '.....eex.'],
  [VILLAGGIO]: ['....tTt.....rR...', '...tTUTt...rRRr..', '..tTTTTTt.rRRRRr.', '..bBFBnBb.wFwnww.', '..bBBBnBb.wwwnww.'],
};
const OMINO_FERMO = ['.hhhh.', '.hpph.', '.pkpk.', '.pppp.', 'qAAAAq', 'pAAAAp', '.AAAA.', '.mm.m.', '.m..m.', '.n..n.'];
DISEGNI[OMINO] = OMINO_FERMO;
DISEGNI[BAMBINO] = ['.hhh.', '.ppp.', '.kpk.', 'qAAAq', '.AAA.', '.m.m.'];

const pronte = new Map<string, HTMLCanvasElement>();
/** La figura di un'invenzione, di giorno o di notte (con le finestre accese); null se non ha una figura sua. */
export function figura(id: number, notte = false): HTMLCanvasElement | null {
  const righe = DISEGNI[id];
  if (!righe) return null;
  const chiave = `${id}${notte ? 'n' : ''}`;
  let tela = pronte.get(chiave);
  if (!tela) {
    tela = prepara(righe, notte ? { F: P.y } : undefined);
    pronte.set(chiave, tela);
  }
  return tela;
}

/** Il falò ha tre pose: la fiamma si muove. */
export const FIAMME: readonly HTMLCanvasElement[] = [
  ['....y....', '...yo....', '...ooy...', '..oyYo...', '..oYYyo..', '.ooYYoo..', 'nbBDbBDbn'],
  ['...y.....', '....oy...', '...oyo...', '..oyYyo..', '..oYYo...', '.ooYYYoo.', 'nbBDbBDbn'],
  ['.....y...', '...yo....', '..oyoo...', '..oYYo...', '.oyYYyo..', '.ooYYoo..', 'nbBDbBDbn'],
].map((r) => prepara(r));

/** L'omino che cammina: quattro pose per ognuna delle sei maglie. */
const POSE = [
  OMINO_FERMO,
  ['.hhhh.', '.hpph.', '.pkpk.', '.pppp.', '.AAAA.', 'pAAAAq', '.AAAA.', '.mmmm.', '..mm..', '..nn..'],
  ['.hhhh.', '.hpph.', '.pkpk.', '.pppp.', 'qAAAAq', 'pAAAAp', '.AAAA.', '.m.mm.', '.m..m.', '.n..n.'],
  ['.hhhh.', '.hpph.', '.pkpk.', '.pppp.', '.AAAA.', 'qAAAAp', '.AAAA.', '.mmmm.', '..mm..', '..nn..'],
];
const BRACCIA_SU = ['q.hhhh.q', 'p.hpph.p', 'p.pkpk.p', '.ppppp..', '.AAAAAA.', '..AAAA..', '..AAAA..', '..mm.m..', '..m..m..', '..n..n..'];
const MAGLIE = ['#b06ce0', '#4a8fe6', '#e6a23c', '#e8504a', '#5ac896', '#f08c3c'];
const PELLI: readonly (readonly [string, string])[] = [['#f2c79b', '#cf9a6c'], ['#dba878', '#b8824f'], ['#a9714c', '#84553a']];
const CAPELLI = ['#3a2a20', '#6b4423', '#d8b25a', '#c9c9d2'];

const omini = new Map<number, { passi: HTMLCanvasElement[]; fuga: HTMLCanvasElement }>();
/** Le figure di un omino, a seconda del suo aspetto (maglia, pelle, capelli). */
export function figureOmino(aspetto: number): { passi: HTMLCanvasElement[]; fuga: HTMLCanvasElement } {
  let f = omini.get(aspetto);
  if (!f) {
    const pelle = PELLI[(aspetto >> 3) % PELLI.length];
    const scambi = { A: MAGLIE[aspetto % MAGLIE.length], p: pelle[0], q: pelle[1], h: CAPELLI[(aspetto >> 5) % CAPELLI.length] };
    f = { passi: POSE.map((p) => prepara(p, scambi)), fuga: prepara(BRACCIA_SU, scambi) };
    omini.set(aspetto, f);
  }
  return f;
}

/** Un'era o un evento non ha una figura: nel libro è un piccolo stendardo del suo colore. */
export function stendardo(id: number): HTMLCanvasElement {
  const tono = ((id - E.PIETRA) * 43 + 20) % 360;
  const tela = document.createElement('canvas');
  tela.width = tela.height = 9;
  const g = tela.getContext('2d')!;
  g.fillStyle = '#131a33';
  g.fillRect(0, 0, 9, 9);
  g.fillStyle = `hsl(${tono} 65% 55%)`;
  g.fillRect(2, 1, 5, 6);
  g.fillStyle = `hsl(${tono} 70% 72%)`;
  g.fillRect(3, 2, 3, 2);
  g.fillStyle = '#131a33';
  g.fillRect(4, 6, 1, 1);
  g.fillStyle = '#d8ceb4';
  g.fillRect(1, 0, 1, 9);
  return tela;
}
