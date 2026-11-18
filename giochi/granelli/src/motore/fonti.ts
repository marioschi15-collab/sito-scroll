import { libera } from './cammino.js';
import { ingombroDi } from '../contenuti/registro.js';
import { C } from './cose.js';
import { GAS, LIQUIDO, M, POLVERE } from './materiali.js';
import type { Mondo } from './mondo.js';

/** Da quante colonne di distanza si attinge a un pozzo, e da quante si raccoglie in un campo. */
export const AL_POZZO = 4;
export const AL_CAMPO = 6;
/** Quanto in alto sopra il terreno arriva la mano di un omino: l'erba sì, la chioma di un albero no. */
const A_PORTATA = 3;

/**
 * Dove si beve e dove si mangia, colonna per colonna. Il Mondo lo ricalcola ogni due secondi circa (e subito
 * quando una cosa viene posata o tolta): così un omino che ha sete sa da che parte andare a qualunque distanza,
 * senza guardarsi intorno cella per cella.
 */
export class Fonti {
  /** Per ogni colonna, 1 se lì in superficie c'è acqua ferma. */
  readonly acqua: Uint8Array;
  /** Per ogni colonna, la riga del pozzo (o del campo) a portata di mano; -1 se non ce n'è. */
  readonly pozzo: Int16Array;
  readonly campo: Int16Array;
  /** Vero finché l'elenco non è stato calcolato, e ogni volta che una cosa viene posata o tolta. */
  daRifare = true;
  /** Per ogni colonna, la colonna più vicina (da quella parte, o lì stessa) dove si beve o si mangia; -1 se non c'è. */
  private readonly bereSx: Int16Array;
  private readonly bereDx: Int16Array;
  private readonly ciboSx: Int16Array;
  private readonly ciboDx: Int16Array;
  private readonly siBeve: Uint8Array;
  private readonly siMangia: Uint8Array;

  constructor(w: number) {
    this.acqua = new Uint8Array(w);
    this.pozzo = new Int16Array(w).fill(-1);
    this.campo = new Int16Array(w).fill(-1);
    this.bereSx = new Int16Array(w).fill(-1);
    this.bereDx = new Int16Array(w).fill(-1);
    this.ciboSx = new Int16Array(w).fill(-1);
    this.ciboDx = new Int16Array(w).fill(-1);
    this.siBeve = new Uint8Array(w);
    this.siMangia = new Uint8Array(w);
  }

  /** Guarda il mondo com'è adesso: l'acqua in superficie, il cibo che si raggiunge da terra, i pozzi e i campi. */
  aggiorna(m: Mondo): void {
    const { w, h, tipo } = m;
    const { acqua, pozzo, campo, siBeve, siMangia } = this;
    this.daRifare = false;
    pozzo.fill(-1);
    campo.fill(-1);
    for (let x = 0; x < w; x++) {
      // Si scende dal cielo fino alla prima cosa che ferma un omino, o all'acqua; e intanto si nota l'ultimo boccone.
      // Una goccia o un fiocco che stanno cadendo non fermano lo sguardo: durante un temporale il lago resta un lago.
      let y = 0;
      let boccone = -99;
      while (y < h) {
        const t = tipo[y * w + x];
        if (m.cibo[t]) boccone = y;
        if ((t === M.ACQUA || !libera(m, x, y)) && !inCaduta(m, y * w + x)) break;
        y++;
      }
      // L'acqua vale se è ferma: una goccia di pioggia che sta cadendo non è una fonte.
      const ferma = y < h && tipo[y * w + x] === M.ACQUA && (y === h - 1 || tipo[(y + 1) * w + x] !== M.VUOTO);
      acqua[x] = ferma ? 1 : 0;
      siBeve[x] = acqua[x];
      siMangia[x] = y - boccone <= A_PORTATA ? 1 : 0;
    }
    for (const cosa of m.cose) {
      if (cosa.id !== C.POZZO && cosa.id !== C.CAMPO) continue;
      const centro = cosa.x + (ingombroDi(cosa.id)![0] >> 1);
      if (centro < 0 || centro >= w) continue;
      const delPozzo = cosa.id === C.POZZO;
      const portata = delPozzo ? AL_POZZO : AL_CAMPO;
      const mani = delPozzo ? pozzo : campo;
      for (let x = Math.max(0, centro - portata); x <= Math.min(w - 1, centro + portata); x++) mani[x] = cosa.y;
      (delPozzo ? siBeve : siMangia)[centro] = 1;
    }
    vicine(siBeve, this.bereSx, this.bereDx);
    vicine(siMangia, this.ciboSx, this.ciboDx);
  }

  /**
   * La colonna più vicina a x dove si beve (acqua in superficie o un pozzo); -1 se nel mondo non ce n'è.
   * Con `evita` (-1 o 1) si guarda prima dall'altra parte: serve a chi da quella parte ha trovato la strada chiusa.
   */
  bere(x: number, evita = 0): number {
    return scegli(x, this.bereSx[x], this.bereDx[x], evita);
  }

  /** Come `bere`, per il cibo: erba, frutti e funghi che si raggiungono da terra, oppure un campo. */
  mangiare(x: number, evita = 0): number {
    return scegli(x, this.ciboSx[x], this.ciboDx[x], evita);
  }
}

/** Vero per un liquido o una polvere sospesi a mezz'aria (sotto hanno il vuoto o un gas): stanno cadendo. */
function inCaduta(m: Mondo, i: number): boolean {
  const s = m.stato[m.tipo[i]];
  if ((s !== LIQUIDO && s !== POLVERE) || i + m.w >= m.tipo.length) return false;
  const sotto = m.tipo[i + m.w];
  return sotto === M.VUOTO || m.stato[sotto] === GAS;
}

/** Per ogni colonna, la colonna segnata più vicina a sinistra (o lì stessa) e a destra (o lì stessa). */
function vicine(segnate: Uint8Array, sx: Int16Array, dx: Int16Array): void {
  let ultima = -1;
  for (let x = 0; x < segnate.length; x++) {
    if (segnate[x]) ultima = x;
    sx[x] = ultima;
  }
  ultima = -1;
  for (let x = segnate.length - 1; x >= 0; x--) {
    if (segnate[x]) ultima = x;
    dx[x] = ultima;
  }
}

function scegli(x: number, sx: number, dx: number, evita: number): number {
  if (sx < 0 || (evita < 0 && dx >= 0)) return dx;
  if (dx < 0 || evita > 0) return sx;
  return x - sx <= dx - x ? sx : dx;
}
