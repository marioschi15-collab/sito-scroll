import { GAS, M, MORTALE, OMINO, STATO, VILLAGGIO } from './materiali.js';
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
}

export const CAMMINA = 0;
export const SCAPPA = 1;
export const NUOTA = 2;

export const ALTEZZA = 3;
/** Ogni quanti istanti del mondo un omino fa un passo e pensa. */
const RITMO = 8;
const SETE_MAX = 900;
const FAME_MAX = 1350;
const ETA_MAX = 4500;
export const POPOLAZIONE_MAX = 24;
/** Quanti omini vivi insieme fanno un villaggio. */
export const ABITANTI_VILLAGGIO = 6;
/** Cosa serve al mondo perché arrivino i primi omini (in celle). */
export const SERVE = { acqua: 120, piante: 50, riparo: 30 };

export function nuovoOmino(m: Mondo, x: number, y: number, attesa: number): Omino {
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
  };
}

/** Un omino può stare (o passare) in una cella vuota, nell'erba, nell'acqua e nei gas. */
function libero(t: number): boolean {
  return t === M.VUOTO || t === M.PIANTA || t === M.ACQUA || STATO[t] === GAS;
}

/** C'è posto per un omino in piedi con i piedi in (x, y)? */
function posto(m: Mondo, x: number, y: number): boolean {
  for (let k = 0; k < ALTEZZA; k++) if (!libero(m.leggi(x, y - k))) return false;
  return true;
}

/** Da che parte si trova la cosa cercata, guardando fino a 40 celle di distanza: -1, 1, oppure 0 se non c'è. */
function cerca(m: Mondo, o: Omino, cosa: number): -1 | 0 | 1 {
  for (let dx = 1; dx <= 40; dx++) {
    for (let dy = -6; dy <= 6; dy++) {
      if (m.leggi(o.x + dx, o.y + dy) === cosa) return 1;
      if (m.leggi(o.x - dx, o.y + dy) === cosa) return -1;
    }
  }
  return 0;
}

/** La prima cella di quel tipo a portata di mano; -1 se non ce n'è. */
function accanto(m: Mondo, o: Omino, cosa: number, raggio: number): number {
  for (let dy = -ALTEZZA; dy <= 1; dy++) {
    for (let dx = -raggio; dx <= raggio; dx++) {
      if (m.leggi(o.x + dx, o.y + dy) === cosa) return (o.y + dy) * m.w + o.x + dx;
    }
  }
  return -1;
}

/** Da che parte c'è qualcosa che brucia, entro `raggio` celle: -1, 1, oppure 0. */
function pericolo(m: Mondo, o: Omino, raggio: number): -1 | 0 | 1 {
  for (let dx = 0; dx <= raggio; dx++) {
    for (let dy = -ALTEZZA - 1; dy <= 2; dy++) {
      if (MORTALE[m.leggi(o.x + dx, o.y + dy)]) return 1;
      if (MORTALE[m.leggi(o.x - dx, o.y + dy)]) return -1;
    }
  }
  return 0;
}

function tocca(m: Mondo, o: Omino): boolean {
  for (let dy = -ALTEZZA; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (MORTALE[m.leggi(o.x + dx, o.y + dy)]) return true;
    }
  }
  return false;
}

function gira(o: Omino): void {
  o.dir = o.dir === 1 ? -1 : 1;
}

function cammina(m: Mondo, o: Omino, inFuga: boolean): void {
  const nx = o.x + o.dir;
  if (nx < 0 || nx >= m.w) {
    gira(o);
    return;
  }
  if (posto(m, nx, o.y)) {
    if (!inFuga) {
      // Non si butta da un dirupo: guarda quanto è profondo il salto (in acqua, invece, si tuffa).
      let salto = 0;
      while (salto < 6) {
        const sotto = m.leggi(nx, o.y + 1 + salto);
        if (!libero(sotto) || sotto === M.ACQUA) break;
        salto++;
      }
      if (salto >= 6) {
        gira(o);
        return;
      }
    }
    o.x = nx;
    return;
  }
  // Un gradino di una o due celle si scavalca, se c'è spazio sopra la testa.
  for (let su = 1; su <= 2; su++) {
    if (!libero(m.leggi(o.x, o.y - ALTEZZA - su + 1))) break;
    if (posto(m, nx, o.y - su)) {
      o.x = nx;
      o.y -= su;
      return;
    }
  }
  gira(o);
}

/** Un momento della vita di un omino. Restituisce false se in questo momento muore. */
function vivi(m: Mondo, o: Omino): boolean {
  if (tocca(m, o)) return false;

  if (!posto(m, o.x, o.y)) {
    // Qualcosa gli è caduto addosso: prova a tirarsi fuori salendo.
    for (let su = 1; su <= ALTEZZA; su++) {
      if (posto(m, o.x, o.y - su)) {
        o.y -= su;
        o.sepolto = 0;
        return true;
      }
    }
    return ++o.sepolto <= 20;
  }
  o.sepolto = 0;

  if (m.leggi(o.x, o.y - ALTEZZA + 1) === M.ACQUA) {
    // Ha la testa sott'acqua: risale, e intanto trattiene il fiato.
    if (libero(m.leggi(o.x, o.y - ALTEZZA))) o.y -= 1;
    if (++o.apnea > 40) return false;
  } else o.apnea = 0;

  o.stato = m.leggi(o.x, o.y) === M.ACQUA ? NUOTA : CAMMINA;
  o.eta++;
  o.sete++;
  o.fame++;
  if (o.sete > SETE_MAX || o.fame > FAME_MAX) return false;
  if (o.eta > ETA_MAX && m.caso() < 0.02) return false;

  if (o.sete > 60 && accanto(m, o, M.ACQUA, 2) >= 0) o.sete = 0;
  if (o.fame > 250) {
    const cibo = accanto(m, o, M.PIANTA, 2);
    if (cibo >= 0) {
      o.fame = 0;
      if (m.caso() < 0.3) m.svuota(cibo);
    }
  }

  const fuga = pericolo(m, o, 6);
  if (fuga !== 0) {
    o.dir = fuga === 1 ? -1 : 1;
    o.stato = SCAPPA;
    cammina(m, o, true);
    cammina(m, o, true);
    return true;
  }

  if (o.eta % 4 === 0) {
    let verso: -1 | 0 | 1 = 0;
    if (o.sete > 300) verso = cerca(m, o, M.ACQUA);
    if (verso === 0 && o.fame > 450) verso = cerca(m, o, M.PIANTA);
    if (verso !== 0) o.dir = verso;
    else if (m.caso() < 0.12) gira(o);
  }
  if (m.caso() < 0.7) cammina(m, o, false);
  return true;
}

function figli(m: Mondo): void {
  const { omini } = m;
  for (const a of omini) if (a.attesa > 0) a.attesa--;
  if (omini.length >= POPOLAZIONE_MAX) return;
  for (const a of omini) {
    if (a.attesa > 0 || a.sete > 300 || a.fame > 450) continue;
    const b = omini.find((o) => o !== a && o.attesa <= 0 && Math.abs(o.x - a.x) <= 3 && Math.abs(o.y - a.y) <= 3);
    if (!b) continue;
    a.attesa = 600;
    b.attesa = 600;
    omini.push(nuovoOmino(m, a.x, a.y, 900));
    m.nati.push({ x: a.x, y: a.y - 2 });
    return;
  }
}

/**
 * I primi omini arrivano da soli quando il mondo ha da bere, da mangiare e un riparo fatto dal giocatore
 * (pietra o mattoni: la roccia nuda del fondo non conta).
 */
function arrivo(m: Mondo): void {
  if (m.omini.length > 0 || m.tic < m.prossimoArrivo) return;
  const c = m.conta;
  const riparo = c[M.PIETRA] + c[M.MATTONE];
  if (c[M.ACQUA] < SERVE.acqua || c[M.PIANTA] < SERVE.piante || riparo < SERVE.riparo) return;
  // Cerca una pianta, scende fino a terra e controlla che lì si possa stare in piedi.
  for (let prova = 0; prova < 200; prova++) {
    const x = (m.caso() * m.w) | 0;
    let y = ALTEZZA + ((m.caso() * (m.h - ALTEZZA)) | 0);
    if (m.leggi(x, y) !== M.PIANTA) continue;
    while (y < m.h - 1 && libero(m.leggi(x, y + 1)) && m.leggi(x, y + 1) !== M.ACQUA) y++;
    if (!posto(m, x, y)) continue;
    m.aggiungiOmino(x, y);
    m.aggiungiOmino(x, y);
    m.prossimoArrivo = m.tic + 1200;
    return;
  }
}

export function aggiornaOmini(m: Mondo): void {
  // La gravità vale a ogni istante (chi ha i piedi in acqua galleggia); camminare e pensare, più di rado.
  for (const o of m.omini) {
    if (o.y < m.h - 1 && m.leggi(o.x, o.y) !== M.ACQUA && libero(m.leggi(o.x, o.y + 1))) o.y++;
  }
  if (m.tic % RITMO === 0 && m.omini.length > 0) {
    m.omini = m.omini.filter((o) => {
      if (vivi(m, o)) return true;
      m.caduti.push({ x: o.x, y: o.y - 1 });
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
