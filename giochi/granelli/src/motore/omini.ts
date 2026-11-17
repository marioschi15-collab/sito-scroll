import { arrivo } from './arrivi.js';
import { ALTEZZA, appoggio, libera, posto, quotaDelPasso } from './cammino.js';
import { C, type Cosa, INGOMBRO, OSPITA } from './cose.js';
import { BAMBINO, M, OMINO, PRIMA_MISCELA, VILLAGGIO } from './materiali.js';
import { SOGLIA } from './miscele.js';
import { luceDelGiorno } from './tempo.js';
import type { Mondo } from './mondo.js';

/** Un abitante del mondo. È largo una cella e alto tre: (x, y) sono i piedi, (x, y-2) la testa. */
export interface Omino {
  x: number;
  y: number;
  dir: 1 | -1;
  sete: number;
  fame: number;
  eta: number;
  /** Da quanto ha la testa sott'acqua. */
  apnea: number;
  /** Da quanto è coperto da qualcosa che gli è caduto addosso. */
  sepolto: number;
  /** Quanto manca prima che possa fare un figlio. */
  attesa: number;
  /** Un numero a caso da cui escono vestito, pelle e capelli. */
  aspetto: number;
  /** Cosa sta facendo, per chi lo disegna: 0 cammina, 1 scappa, 2 nuota. */
  stato: number;
  /** In quale casa sta dormendo: il numero d'ordine della casa (vedi `Cosa.n`); 0 (o niente) se è fuori. */
  dentro?: number;
  /**
   * La colonna di casa: dove è arrivato, o la casa dei suoi genitori, e poi la casa (o il falò) dove passa la
   * notte. Quando non ha bisogni passeggia lì intorno. Manca solo nelle partite salvate prima che esistesse.
   */
  casa?: number;
  /** La colonna dell'ultima bevuta e quella dell'ultimo pasto: ci torna quando il mondo non gli mostra di meglio. */
  bevuta?: number;
  pasto?: number;
  /**
   * Da che parte ha trovato la strada chiusa mentre andava a bere o a mangiare, e per quanto se ne ricorda ancora:
   * il segno è la direzione, il numero i momenti che restano. Finché se ne ricorda cerca dall'altra parte.
   */
  chiusa?: number;
}

/** Di che cosa può morire un omino. */
export type Causa = 'sete' | 'fame' | 'fuoco' | 'veleno' | 'annegato' | 'sepolto' | 'vecchiaia';

/** Una nascita o una morte, con il punto in cui è avvenuta (in celle): la pagina le legge e svuota la coda. */
export type Fatto = { cosa: 'nato'; x: number; y: number } | { cosa: 'morto'; causa: Causa; x: number; y: number };

export const CAMMINA = 0;
export const SCAPPA = 1;
export const NUOTA = 2;

/** Al posto di un materiale preciso: qualsiasi cosa un omino possa mangiare (piante, frutti, funghi, miscele nutrienti). */
const CIBO = -1;
/** Ogni quanti istanti del mondo un omino fa un passo e pensa. */
const RITMO = 8;
const SETE_MAX = 900;
const FAME_MAX = 1350;
/** Da quanta sete (o fame) in su un omino lascia quello che sta facendo e va a bere (o a mangiare). */
const HA_SETE = 300;
const HA_FAME = 450;
/** Da quanta sete (o fame) in su non c'è più tempo da perdere: pur di arrivare ci si butta anche da un dirupo. */
const SETE_NERA = 600;
const FAME_NERA = 900;
/** Quanti momenti vive, in media, un omino (due giorni e mezzo); ognuno ha la sua età, fino a tanto in più o in meno. */
const ETA_MAX = 4500;
const ETA_DIVERSA = 1500;
/** Quanto si allontana da casa, al più, un omino che passeggia senza bisogni (in celle). */
export const PASSEGGIO = 50;
/** Per quanti momenti un omino si ricorda che da una parte la strada era chiusa. */
const RICORDO = 150;
/** Quanto lontano, al più, va a cercare un tetto o un falò per la notte (in celle). */
const A_CASA = 150;
export const POPOLAZIONE_MAX = 24;
/** Quanti omini campano senza un tetto: per essere di più servono capanne, case, castelli. */
export const SENZA_TETTO = 6;
/** Quanti omini vivi insieme fanno un villaggio. */
export const ABITANTI_VILLAGGIO = 6;

export function nuovoOmino(m: Mondo, x: number, y: number, attesa: number, casa = x): Omino {
  return {
    x,
    y,
    dir: m.caso() < 0.5 ? -1 : 1,
    sete: 0,
    fame: 0,
    eta: 0,
    apnea: 0,
    sepolto: 0,
    attesa,
    aspetto: (m.caso() * 256) | 0,
    stato: CAMMINA,
    casa,
  };
}

/** La prima cella di quel tipo a portata di mano; -1 se non ce n'è. */
function accanto(m: Mondo, o: Omino, cosa: number, raggio: number): number {
  for (let dy = -ALTEZZA; dy <= 1; dy++) {
    for (let dx = -raggio; dx <= raggio; dx++) {
      const t = m.leggi(o.x + dx, o.y + dy);
      if (cosa === CIBO ? m.cibo[t] : t === cosa) return (o.y + dy) * m.w + o.x + dx;
    }
  }
  return -1;
}

/** Da che parte c'è qualcosa che brucia, entro `raggio` celle: -1, 1, oppure 0. */
function pericolo(m: Mondo, o: Omino, raggio: number): -1 | 0 | 1 {
  for (let dx = 0; dx <= raggio; dx++) {
    for (let dy = -ALTEZZA - 1; dy <= 2; dy++) {
      if (m.mortale[m.leggi(o.x + dx, o.y + dy)]) return 1;
      if (m.mortale[m.leggi(o.x - dx, o.y + dy)]) return -1;
    }
  }
  return 0;
}

/** Se l'omino sta toccando qualcosa che uccide, di che morte muore: bruciato, oppure avvelenato (o corroso). */
function tocca(m: Mondo, o: Omino): Causa | null {
  for (let dy = -ALTEZZA; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const t = m.leggi(o.x + dx, o.y + dy);
      if (!m.mortale[t]) continue;
      const brucia = t < PRIMA_MISCELA ? t !== M.ACIDO : m.calore[t] > SOGLIA.calore;
      return brucia ? 'fuoco' : 'veleno';
    }
  }
  return null;
}

function gira(o: Omino): void {
  o.dir = o.dir === 1 ? -1 : 1;
}

/** L'altro omino (sveglio) che sta già in quella cella, se c'è. */
function chiCE(m: Mondo, io: Omino, x: number, y: number): Omino | null {
  for (const altro of m.omini) {
    if (altro !== io && !altro.dentro && altro.x === x && Math.abs(altro.y - y) < ALTEZZA) return altro;
  }
  return null;
}

const occupata = (m: Mondo, io: Omino, x: number, y: number): boolean => chiCE(m, io, x, y) !== null;

/**
 * Un passo nella direzione in cui guarda; `diCorsa` vale per chi scappa o non ne può più, e salta anche i dirupi.
 * Davanti a un muro (o a un dirupo) si gira, e lo dice (restituisce true).
 * Due omini non si fermano mai nella stessa cella: chi trova il posto occupato scavalca l'altro, e se oltre non c'è
 * posto i due si scambiano il posto. Così una fila non si blocca mai, nemmeno contro un'altra che viene incontro.
 */
function cammina(m: Mondo, o: Omino, diCorsa: boolean): boolean {
  const y = quotaDelPasso(m, o.x, o.y, o.dir, diCorsa);
  if (y < 0) {
    gira(o);
    return true;
  }
  const x = o.x + o.dir;
  const altro = chiCE(m, o, x, y);
  if (altro) {
    const oltre = quotaDelPasso(m, x, y, o.dir, diCorsa);
    if (oltre >= 0 && !occupata(m, o, x + o.dir, oltre)) {
      o.x = x + o.dir;
      o.y = oltre;
      return false;
    }
    // Chi scappa dal fuoco non spinge indietro nessuno: passa e basta, e ci si scosta al momento dopo.
    if (o.stato !== SCAPPA) {
      altro.x = o.x;
      altro.y = o.y;
    }
  }
  o.x = x;
  o.y = y;
  return false;
}

/**
 * Fino a che età arriva un omino prima di poter morire di vecchiaia. Dipende da lui (dal suo aspetto, che non cambia):
 * così chi è arrivato o nato nello stesso momento non se ne va nello stesso giorno, e il paese non resta vuoto di colpo.
 */
const vecchiaia = (o: Omino): number => ETA_MAX + ((((o.aspetto * 167) & 255) - 128) * ETA_DIVERSA) / 128;

/** Fin dove cerca un posto libero chi si ritrova nella cella di un altro (in passi). */
const SCOSTARSI = 8;

/**
 * Non si sta in due nella stessa cella: chi ci si ritrova (un bambino appena nato, chi esce di casa al mattino, uno
 * caduto dall'alto) va a mettersi nel primo posto libero che raggiunge a piedi, da una parte o dall'altra.
 */
function scostati(m: Mondo, o: Omino): void {
  for (let lato = 0; lato < 2; lato++) {
    let x = o.x;
    let y = o.y;
    for (let passi = 0; passi < SCOSTARSI; passi++) {
      const quota = quotaDelPasso(m, x, y, o.dir, false);
      if (quota < 0) break;
      x += o.dir;
      y = appoggio(m, x, quota);
      if (occupata(m, o, x, y)) continue;
      o.x = x;
      o.y = y;
      return;
    }
    gira(o);
  }
}

const centroDi = (cosa: Cosa): number => cosa.x + (INGOMBRO[cosa.id][0] >> 1);

/** Quanti omini stanno dormendo in una casa. */
function inCasa(m: Mondo, casa: Cosa): number {
  let quanti = 0;
  for (const o of m.omini) if (o.dentro === casa.n) quanti++;
  return quanti;
}

/** Al posto di una cosa precisa: un tetto qualsiasi (capanna, casa, castello) in cui ci sia ancora un posto. */
const UN_TETTO = -1;

/** Il tetto con un posto libero più vicino a un omino, oppure (se `id` è una cosa precisa) la più vicina di quel tipo. */
function ritrovo(m: Mondo, o: Omino, id: number): Cosa | null {
  let scelta: Cosa | null = null;
  let meglio = A_CASA + 1;
  for (const cosa of m.cose) {
    if (id >= 0 ? cosa.id !== id : OSPITA[cosa.id] === undefined) continue;
    const d = Math.abs(centroDi(cosa) - o.x);
    if (d >= meglio || (id < 0 && inCasa(m, cosa) >= OSPITA[cosa.id])) continue;
    meglio = d;
    scelta = cosa;
  }
  return scelta;
}

/** Un pozzo o un campo a portata di mano (vedi `Fonti`): la sua riga non deve essere troppo lontana da quella dei piedi. */
const aPortata = (riga: number, y: number): boolean => riga >= 0 && Math.abs(riga - y) < 14;

/** Un momento della vita di un omino. Restituisce di che cosa muore, se in questo momento muore. */
function vivi(m: Mondo, o: Omino, notte: boolean): Causa | null {
  const scottato = tocca(m, o);
  if (scottato) return scottato;
  if (o.casa === undefined) o.casa = o.x;

  if (o.dentro) {
    // Dorme in casa: esce al mattino, o se la casa non c'è più. Al chiuso fame e sete crescono piano.
    let casa: Cosa | null = null;
    for (const cosa of m.cose) if (cosa.n === o.dentro && OSPITA[cosa.id]) casa = cosa;
    if (notte && casa) {
      o.eta++;
      if (o.eta % 3 === 0) {
        o.sete++;
        o.fame++;
      }
      return o.sete > SETE_MAX ? 'sete' : o.fame > FAME_MAX ? 'fame' : null;
    }
    o.dentro = 0;
  }

  if (!posto(m, o.x, o.y)) {
    // Qualcosa gli è caduto addosso: prova a tirarsi fuori salendo.
    for (let su = 1; su <= ALTEZZA; su++) {
      if (posto(m, o.x, o.y - su)) {
        o.y -= su;
        o.sepolto = 0;
        return null;
      }
    }
    return ++o.sepolto > 20 ? 'sepolto' : null;
  }
  o.sepolto = 0;

  if (m.leggi(o.x, o.y - ALTEZZA + 1) === M.ACQUA) {
    // Ha la testa sott'acqua: risale, e intanto trattiene il fiato.
    if (libera(m, o.x, o.y - ALTEZZA)) o.y -= 1;
    if (++o.apnea > 40) return 'annegato';
  } else o.apnea = 0;

  o.stato = m.leggi(o.x, o.y) === M.ACQUA ? NUOTA : CAMMINA;
  o.eta++;
  o.sete++;
  o.fame++;
  if (o.sete > SETE_MAX) return 'sete';
  if (o.fame > FAME_MAX) return 'fame';
  if (o.eta > vecchiaia(o) && m.caso() < 0.02) return 'vecchiaia';

  // Si beve dall'acqua, o da un pozzo; si mangia quello che si trova, o dal campo. E ci si ricorda dove.
  const { fonti } = m;
  if (o.sete > 60 && (accanto(m, o, M.ACQUA, 2) >= 0 || aPortata(fonti.pozzo[o.x], o.y))) {
    o.sete = 0;
    o.bevuta = o.x;
  }
  if (o.fame > 250) {
    if (aPortata(fonti.campo[o.x], o.y)) {
      o.fame = 0;
      o.pasto = o.x;
    } else {
      const cibo = accanto(m, o, CIBO, 2);
      if (cibo >= 0) {
        o.fame = 0;
        o.pasto = o.x;
        // Un frutto o un fungo si mangia intero; di una pianta si bruca solo qualche foglia.
        if (m.tipo[cibo] !== M.PIANTA || m.caso() < 0.3) m.svuota(cibo);
      }
    }
  }

  const fuga = pericolo(m, o, 6);
  if (fuga !== 0) {
    o.dir = fuga === 1 ? -1 : 1;
    o.stato = SCAPPA;
    cammina(m, o, true);
    cammina(m, o, true);
    return null;
  }

  if (occupata(m, o, o.x, o.y)) {
    scostati(m, o);
    return null;
  }

  // Dove andare. Prima i bisogni: alla fonte più vicina, per quanto lontana o in basso sia; se il mondo non ne
  // mostra nessuna, dove ha bevuto (o mangiato) l'ultima volta.
  const chiusa = o.chiusa ? (o.chiusa > 0 ? 1 : -1) : 0;
  if (o.chiusa) o.chiusa -= chiusa;
  let meta = -1;
  if (o.sete > HA_SETE) {
    meta = fonti.bere(o.x, chiusa);
    if (meta < 0 && o.bevuta !== undefined) meta = o.bevuta;
  }
  if (meta < 0 && o.fame > HA_FAME) {
    meta = fonti.mangiare(o.x, chiusa);
    if (meta < 0 && o.pasto !== undefined) meta = o.pasto;
  }
  if (meta >= 0 && meta !== o.x) {
    const verso = meta > o.x ? 1 : -1;
    o.dir = verso;
    // Chi non ne può più salta giù anche da dove non potrà risalire (cadere non fa male). E se di lì proprio non
    // si passa, per un po' cerca dall'altra parte: forse c'è un'altra fonte.
    const allaDisperata = o.sete > SETE_NERA || o.fame > FAME_NERA;
    if (m.caso() < 0.7 && cammina(m, o, allaDisperata)) o.chiusa = verso * RICORDO;
    return null;
  }

  if (notte && meta < 0) {
    // Di notte si torna a casa, se c'è un posto; chi non ha un tetto si raduna intorno al falò.
    const tetto = ritrovo(m, o, UN_TETTO);
    const dove = tetto ?? ritrovo(m, o, C.FALO);
    if (dove) {
      const centro = centroDi(dove);
      const d = centro - o.x;
      if (tetto && Math.abs(d) <= 2) {
        o.dentro = tetto.n;
        o.casa = centro;
        return null;
      }
      // Dal falò ci si ferma a qualche passo: abbastanza vicino da scaldarsi, non tanto da bruciarsi.
      if (!tetto && Math.abs(d) <= 5) {
        o.casa = centro;
        return null;
      }
      o.dir = d > 0 ? 1 : -1;
      cammina(m, o, false);
      return null;
    }
  }

  // Niente da fare: si passeggia, senza perdere di vista casa.
  if (Math.abs(o.x - o.casa) > PASSEGGIO) o.dir = o.casa > o.x ? 1 : -1;
  else if (o.eta % 4 === 0 && m.caso() < 0.12) gira(o);
  if (m.caso() < 0.7) cammina(m, o, false);
  return null;
}

function figli(m: Mondo): void {
  const { omini } = m;
  for (const a of omini) if (a.attesa > 0) a.attesa--;
  // Il paese cresce quanto i suoi tetti: senza case, non più di sei.
  let posti = SENZA_TETTO;
  for (const cosa of m.cose) posti += OSPITA[cosa.id] ?? 0;
  if (omini.length >= Math.min(POPOLAZIONE_MAX, posti)) return;
  for (const a of omini) {
    if (a.attesa > 0 || a.dentro || a.sete > HA_SETE || a.fame > HA_FAME) continue;
    let b: Omino | null = null;
    for (const o of omini) {
      if (o === a || o.dentro || o.attesa > 0 || Math.abs(o.x - a.x) > 3 || Math.abs(o.y - a.y) > 3) continue;
      b = o;
      break;
    }
    if (!b) continue;
    a.attesa = 600;
    b.attesa = 600;
    // Il bambino nasce accanto ai genitori (in una cella tutta sua, appena la trova); la loro casa è anche la sua.
    const bimbo = nuovoOmino(m, a.x, a.y, 900, a.casa);
    omini.push(bimbo);
    scostati(m, bimbo);
    m.fatti.push({ cosa: 'nato', x: bimbo.x, y: bimbo.y - 2 });
    m.scopri(BAMBINO, bimbo.x, bimbo.y - 2);
    return;
  }
}

export function aggiornaOmini(m: Mondo): void {
  // La gravità vale a ogni istante (chi ha i piedi in acqua galleggia); camminare e pensare, più di rado.
  for (const o of m.omini) {
    if (o.dentro) continue;
    if (o.y < m.h - 1 && m.leggi(o.x, o.y) !== M.ACQUA && libera(m, o.x, o.y + 1)) o.y++;
  }
  if (m.tic % RITMO === 0 && m.omini.length > 0) {
    const notte = luceDelGiorno(m.tic) < 0.3;
    m.omini = m.omini.filter((o) => {
      const causa = vivi(m, o, notte);
      if (!causa) return true;
      m.fatti.push({ cosa: 'morto', causa, x: o.x, y: o.y - 1 });
      return false;
    });
    if (m.omini.length === 0) m.prossimoArrivo = m.tic + 1200;
    figli(m);
    if (m.omini.length >= ABITANTI_VILLAGGIO && m.visti.has(OMINO)) {
      const o = m.omini[0];
      m.scopri(VILLAGGIO, o.x, o.y - 1);
    }
  }
  if (m.tic % 120 === 0) arrivo(m);
}
