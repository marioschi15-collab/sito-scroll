import { aGalla, ingombroDi } from '../contenuti/registro.js';
import { C, type Cosa } from './cose.js';
import { GAS, LIQUIDO, M, N_TIPI, NULLA, POLVERE, SOLIDO, TRONCO } from './materiali.js';
import type { Mondo } from './mondo.js';

/** Quante cose posate regge un mondo. */
export const COSE_MAX = 120;
/** Di quante celle, al più, può salire o scendere il terreno sotto una cosa: oltre, pende troppo. */
export const PENDENZA_MAX = 3;
/**
 * Da quante celle di liquido in su, sopra il terreno, lì si affonda. Meno è una pozzanghera: l'acqua appena versata
 * su un piano si stende in un velo di due o tre celle, e non deve impedire di costruire.
 */
const ACQUA_FONDA = 4;

/** Perché una cosa non si può posare in un certo punto. */
export type Divieto = 'ignota' | 'troppe' | 'occupato' | 'pende' | 'bagnato' | 'asciutto' | 'stretto';

/** Dove finirebbe una cosa posata (la cella in basso a sinistra del suo ingombro), oppure perché lì non può stare. */
export type Posto = { si: true; x: number; y: number } | { si: false; perche: Divieto };

/** Ciò che sta a galla tra le cose di prima: si posa solo sull'acqua e ne segue il pelo. Tutto il resto vuole terreno fermo. */
const A_GALLA: Record<number, boolean> = { [C.BARCA]: true, [C.PONTE]: true };

/** Vero per ciò che sta a galla (barca e ponte, e le costruzioni delle schede segnate `aGalla`) e non a terra. */
export const staAGalla = (id: number): boolean => A_GALLA[id] === true || aGalla(id);

/** Ciò che cresce e non regge niente: una costruzione gli passa attraverso, e posandola lo si toglie. */
const VERDE = new Uint8Array(N_TIPI);
for (const t of [M.PIANTA, M.FRUTTO, M.FUNGO, M.ALGA]) VERDE[t] = 1;

const NO: Record<Divieto, Posto> = {
  ignota: { si: false, perche: 'ignota' },
  troppe: { si: false, perche: 'troppe' },
  occupato: { si: false, perche: 'occupato' },
  pende: { si: false, perche: 'pende' },
  bagnato: { si: false, perche: 'bagnato' },
  asciutto: { si: false, perche: 'asciutto' },
  stretto: { si: false, perche: 'stretto' },
};

/** Vero se la cella è una pianta, un frutto, un fungo o il tronco di un albero: roba che non regge. */
function verde(m: Mondo, i: number): boolean {
  const t = m.tipo[i];
  return VERDE[t] === 1 || (t === M.LEGNO && m.dato[i] === TRONCO);
}

/** Vero se la cella è terreno vero, di quello che regge una costruzione: non aria, non liquidi, non piante né tronchi. */
export function regge(m: Mondo, i: number): boolean {
  const s = m.stato[m.tipo[i]];
  return s !== NULLA && s !== GAS && s !== LIQUIDO && !verde(m, i);
}

/**
 * Vero se la cella è terreno su cui si può costruire: di quello che regge, e che sta fermo. Una polvere conta solo
 * se sotto ha altra polvere o un solido: un fiocco di neve che sta cadendo, o la cenere a galla su un lago, non sono
 * terreno (altrimenti durante una nevicata ogni punto «penderebbe troppo»).
 */
function fermo(m: Mondo, i: number): boolean {
  if (!regge(m, i)) return false;
  if (m.stato[m.tipo[i]] !== POLVERE || i + m.w >= m.tipo.length) return true;
  const sotto = m.stato[m.tipo[i + m.w]];
  return sotto === POLVERE || sotto === SOLIDO;
}

const liquida = (m: Mondo, i: number): boolean => m.stato[m.tipo[i]] === LIQUIDO;

/** Vero se sopra il terreno che affiora alla riga `cima` della colonna x c'è tanto liquido da affondarci. */
function fonda(m: Mondo, x: number, cima: number): boolean {
  if (cima < ACQUA_FONDA) return false;
  for (let k = 1; k <= ACQUA_FONDA; k++) if (!liquida(m, (cima - k) * m.w + x)) return false;
  return true;
}

/** Un liquido che sta fermo su qualcosa: una goccia di pioggia che sta cadendo non è uno specchio d'acqua. */
function specchio(m: Mondo, i: number): boolean {
  if (!liquida(m, i)) return false;
  if (i + m.w >= m.tipo.length) return true;
  const sotto = m.stato[m.tipo[i + m.w]];
  return sotto !== NULLA && sotto !== GAS;
}

/**
 * La riga in cui, nella colonna x, affiora il terreno fermo, cercando a partire dalla riga `da`: se lì è già
 * pieno si risale fino a dove affiora, altrimenti si scende. Per ciò che sta a galla regge anche un liquido.
 * Restituisce l'altezza del mondo se sotto non c'è niente.
 */
function affiora(m: Mondo, x: number, da: number, aGalla: boolean): number {
  const { w, h } = m;
  const pieno = (y: number): boolean => fermo(m, y * w + x) || (aGalla && specchio(m, y * w + x));
  let y = Math.max(0, Math.min(h - 1, da));
  if (pieno(y)) {
    while (y > 0 && pieno(y - 1)) y--;
    return y;
  }
  while (y < h && !pieno(y)) y++;
  return y;
}

/** Vero se due ingombri si sovrappongono (toccarsi di fianco va bene: due tratti di mura fanno un muro solo). */
function sovrapposte(ax: number, ay: number, a: readonly [number, number], b: Cosa): boolean {
  const i = ingombroDi(b.id)!;
  return ax < b.x + i[0] && b.x < ax + a[0] && ay - a[1] < b.y && b.y - i[1] < ay;
}

/**
 * Dice se e dove una cosa si può posare con il centro sulla colonna x, vicino alla riga y; se no, perché.
 * La quota è il terreno vero più alto sotto l'ingombro (tronchi, foglie, frutti, funghi e liquidi non contano);
 * se sotto l'ingombro il terreno sale o scende di più di tre celle, pende troppo. Barca e Ponte vogliono l'acqua,
 * tutto il resto la terra ferma; e nessun ingombro ne copre un altro.
 */
export function puoPosare(m: Mondo, id: number, x: number, y: number): Posto {
  const ingombro = ingombroDi(id);
  if (!ingombro || !m.visti.has(id)) return NO.ignota;
  if (m.cose.length >= COSE_MAX) return NO.troppe;
  const [lw, lh] = ingombro;
  const { w, h } = m;
  if (lw > w || lh > h) return NO.stretto;
  const sx = Math.max(0, Math.min(w - lw, x - (lw >> 1)));
  const aGalla = staAGalla(id);
  let alto = h;
  let basso = 0;
  let acque = 0;
  let centroInAcqua = false;
  for (let k = 0; k < lw; k++) {
    const cima = affiora(m, sx + k, y, aGalla);
    // Per chi sta a terra conta solo l'acqua fonda: una pozzanghera non impedisce niente.
    const bagnata = aGalla ? cima < h && liquida(m, cima * w + sx + k) : fonda(m, sx + k, cima);
    if (bagnata) {
      acque++;
      if (k === lw >> 1) centroInAcqua = true;
    }
    // Chi sta a galla si regola solo sul pelo dell'acqua: una riva più alta, semplicemente, gli sta accanto.
    if (aGalla && !bagnata) continue;
    if (cima < alto) alto = cima;
    if (cima > basso) basso = cima;
  }
  if (aGalla) {
    if (!centroInAcqua || acque * 2 < lw) return NO.asciutto;
  } else {
    if (acque * 3 > lw) return NO.bagnato;
    if (basso - alto > PENDENZA_MAX) return NO.pende;
  }
  // A terra si sta sopra il terreno; a galla si pesca una cella: lo scafo sta nell'acqua, non sospeso sopra.
  const sy = aGalla ? alto : alto - 1;
  if (sy - lh + 1 < 0) return NO.stretto;
  for (const altra of m.cose) if (sovrapposte(sx, sy, ingombro, altra)) return NO.occupato;
  // Sotto un soffitto basso (una grotta, una tettoia di pietra) ci sta solo ciò che è abbastanza basso da entrarci.
  for (let k = 0; k < lw; k++) {
    // Di ciò che sta a galla conta solo la parte sull'acqua: la riva, più alta, gli sta accanto.
    if (aGalla && !liquida(m, sy * w + sx + k)) continue;
    for (let cy = sy - lh + 1; cy <= sy; cy++) if (fermo(m, cy * w + sx + k)) return NO.stretto;
  }
  return { si: true, x: sx, y: sy };
}

/**
 * Toglie un albero intero a partire da una cella del suo tronco: tutto il tronco che le sta attaccato (anche dove
 * piega di lato) e la chioma che ha in cima. Tagliato a metà resterebbe un ciuffo sospeso per aria.
 */
function abbatti(m: Mondo, da: number): void {
  const { w, h, tipo, dato } = m;
  const pila = [da];
  let cimaX = da % w;
  let cimaY = (da / w) | 0;
  while (pila.length > 0) {
    const i = pila.pop() as number;
    if (tipo[i] !== M.LEGNO || dato[i] !== TRONCO) continue;
    m.svuota(i);
    const x = i % w;
    const y = (i / w) | 0;
    if (y < cimaY) {
      cimaY = y;
      cimaX = x;
    }
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (x + dx >= 0 && x + dx < w && y + dy >= 0 && y + dy < h) pila.push(i + dy * w + dx);
      }
    }
  }
  // La chioma è un ciuffo di foglie largo al più tre celle intorno alla punta, con i suoi frutti e funghi: tolta
  // la chioma, nulla deve restare appeso al cielo.
  for (let y = Math.max(0, cimaY - 5); y <= Math.min(h - 1, cimaY + 2); y++) {
    for (let x = Math.max(0, cimaX - 4); x <= Math.min(w - 1, cimaX + 4); x++) {
      const t = tipo[y * w + x];
      if (t === M.PIANTA || t === M.FRUTTO || t === M.FUNGO) m.svuota(y * w + x);
    }
  }
}

/**
 * Toglie le piante che stanno dove va una cosa appena posata: l'erba, i funghi, e per intero ogni albero che ha il
 * tronco lì dentro. La chioma di un albero vicino che sporge sopra il tetto resta dov'è, attaccata al suo albero.
 */
export function sgombra(m: Mondo, id: number, x: number, y: number): void {
  const [lw, lh] = ingombroDi(id)!;
  for (let cx = x; cx < x + lw; cx++) {
    // Anche l'erba rimasta nel piccolo vuoto sotto la cosa, dove il terreno è un po' più basso.
    for (let cy = Math.max(0, y - lh + 1); cy <= Math.min(m.h - 1, y + PENDENZA_MAX); cy++) {
      const i = cy * m.w + cx;
      if (m.tipo[i] === M.LEGNO && m.dato[i] === TRONCO) abbatti(m, i);
      else if (VERDE[m.tipo[i]]) m.svuota(i);
    }
  }
}

/**
 * Le cose posate scendono quando il terreno sotto cede, e non salgono mai: né la sabbia che ci cade sopra né un
 * albero che ci cresce accanto le sollevano. Restano dove sono finché almeno una colonna le regge. Fa eccezione ciò
 * che sta a galla, che segue il pelo dell'acqua anche quando sale. Intanto si segnano le colonne coperte da una
 * cosa: lì sotto non germoglia niente (vedi `sottoUnaCosa`).
 */
export function assestaCose(m: Mondo): void {
  const { w, h, coperta } = m;
  coperta.fill(0);
  for (const c of m.cose) {
    const [lw, lh] = ingombroDi(c.id)!;
    const x0 = Math.max(0, c.x);
    const x1 = Math.min(w, c.x + lw);
    for (let x = x0; x < x1; x++) coperta[x] = 1;
    if (staAGalla(c.id)) {
      galleggia(m, c, x0, x1, lh);
      continue;
    }
    // L'appoggio: la cella più alta di terreno vero sotto l'ingombro. Quasi sempre è subito sotto, e basta una colonna.
    let appoggio = h;
    for (let x = x0; x < x1 && appoggio > c.y + 1; x++) {
      let y = c.y + 1;
      while (y < appoggio && !regge(m, y * w + x)) y++;
      appoggio = y;
    }
    if (appoggio - 1 > c.y) c.y = Math.min(appoggio - 1, c.y + 2);
  }
}

/**
 * Una barca (o un ponte) sta sul pelo dell'acqua, con lo scafo immerso di una cella: scende e sale con lei, e se
 * l'acqua se ne va si posa sul fondo. Sale solo quando sotto più di metà di lei l'acqua l'ha coperta di un'altra
 * cella ancora: un'onda, o lo scroscio di un temporale in un punto solo, non la fanno ballare.
 */
function galleggia(m: Mondo, c: Cosa, x0: number, x1: number, lh: number): void {
  const { w, h } = m;
  const cima = Math.max(0, c.y - lh + 1);
  // La riga più alta in cui la cosa può stare: quella del pelo dell'acqua, oppure appena sopra il terreno.
  let quota = h - 1;
  let sommerse = 0;
  for (let x = x0; x < x1; x++) {
    let y = cima;
    while (y < h && !specchio(m, y * w + x) && !regge(m, y * w + x)) y++;
    if (y >= h) continue;
    if (liquida(m, y * w + x)) {
      if (y < c.y - 1) sommerse++;
      if (y < quota) quota = y;
    } else {
      // Il terreno che le è caduto dentro la tiene ferma, ma non la solleva.
      quota = Math.min(quota, Math.max(y - 1, c.y));
    }
  }
  if (quota > c.y) c.y = Math.min(quota, c.y + 2);
  else if (sommerse * 2 > x1 - x0 && c.y - lh >= 0) c.y--;
}

/** Vero se la cella sta dentro l'ingombro di una cosa posata, o subito sotto: lì non germoglia niente. */
export function sottoUnaCosa(m: Mondo, x: number, y: number): boolean {
  if (!m.coperta[x]) return false;
  for (const c of m.cose) {
    const [lw, lh] = ingombroDi(c.id)!;
    if (x >= c.x && x < c.x + lw && y > c.y - lh && y <= c.y + PENDENZA_MAX + 1) return true;
  }
  return false;
}
