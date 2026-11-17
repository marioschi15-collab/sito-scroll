import { GAS, M, N_TIPI, TRONCO } from './materiali.js';
import type { Mondo } from './mondo.js';

/** Un omino è largo una cella e alto tre: (x, y) sono i piedi, (x, y-2) la testa. */
export const ALTEZZA = 3;
/**
 * Quanto è alto, al più, un gradino che si scavalca arrampicandosi. La roccia del mondo fa gradini di due celle,
 * ma la terra che ci si posa sopra, trattenuta dall'erba e dai tronchi, ne aggiunge spesso due o tre: sui pendii
 * ripidi coperti di bosco si trovano sponde di cinque celle, e con meno ogni paese avrebbe i suoi fossi da cui
 * non si esce (e le sue rive da cui non si scende all'acqua). Un muro vero è più alto: dalle sei celle in su ferma.
 */
const GRADINO = 5;
/**
 * Da quante celle in su un salto è un dirupo: chi cammina tranquillo non ci si butta. È un gradino più di quello
 * che si risale: così nessuno scende, passeggiando, dove poi non può tornare su.
 */
const DIRUPO = GRADINO + 1;

/** Ciò in cui un omino può stare o passare, oltre ai gas e al tronco degli alberi: il vuoto, l'erba, l'acqua. */
const PASSA = new Uint8Array(N_TIPI);
for (const t of [M.VUOTO, M.PIANTA, M.ACQUA, M.ALGA, M.FUNGO, M.FRUTTO]) PASSA[t] = 1;

/**
 * Un omino può stare (o passare) in una cella vuota, nell'erba, nell'acqua, nei gas e davanti al tronco di un
 * albero: il tronco è uno sfondo, non un muro. Il legno messo da chi gioca, invece, ferma. Fuori dal mondo è roccia.
 */
export function libera(m: Mondo, x: number, y: number): boolean {
  if (x < 0 || x >= m.w || y < 0 || y >= m.h) return false;
  const i = y * m.w + x;
  const t = m.tipo[i];
  return PASSA[t] === 1 || m.stato[t] === GAS || (t === M.LEGNO && m.dato[i] === TRONCO);
}

/** C'è posto per un omino in piedi con i piedi in (x, y)? */
export function posto(m: Mondo, x: number, y: number): boolean {
  for (let k = 0; k < ALTEZZA; k++) if (!libera(m, x, y - k)) return false;
  return true;
}

/**
 * A che quota arrivano i piedi di chi da (x, y) fa un passo nella direzione `dir`; -1 se di lì non si passa.
 * Un gradino fino a cinque celle si scavalca (se c'è spazio sopra la testa); un muro più alto ferma. Chi cammina
 * tranquillo non si butta da un dirupo (in acqua, invece, si tuffa); chi scappa (`diCorsa`) sì.
 */
export function quotaDelPasso(m: Mondo, x: number, y: number, dir: number, diCorsa: boolean): number {
  const nx = x + dir;
  if (nx < 0 || nx >= m.w) return -1;
  if (posto(m, nx, y)) {
    if (!diCorsa) {
      let salto = 0;
      while (salto < DIRUPO && libera(m, nx, y + 1 + salto) && m.leggi(nx, y + 1 + salto) !== M.ACQUA) salto++;
      if (salto >= DIRUPO) return -1;
    }
    return y;
  }
  for (let su = 1; su <= GRADINO; su++) {
    if (!libera(m, x, y - ALTEZZA - su + 1)) break;
    if (posto(m, nx, y - su)) return y - su;
  }
  return -1;
}

/** Dove si fermano i piedi di chi viene lasciato in (x, y): cade finché non trova un appoggio, e in acqua galleggia. */
export function appoggio(m: Mondo, x: number, y: number): number {
  while (y < m.h - 1 && m.leggi(x, y) !== M.ACQUA && libera(m, x, y + 1)) y++;
  return y;
}

/**
 * La riga in cui poserebbe i piedi un omino lasciato cadere dal cielo nella colonna x: appena sopra la prima cosa
 * che lo regge (o a galla, se sotto c'è acqua).
 */
export function piedi(m: Mondo, x: number): number {
  let y = 0;
  while (y < m.h - 1 && libera(m, x, y + 1) && m.leggi(x, y + 1) !== M.ACQUA) y++;
  return y;
}

/**
 * Vero se, camminando come cammina un omino, da (x, y) si arriva a non più di `vicino` celle dalla colonna `meta`.
 * Serve a non far arrivare nessuno in un posto da cui non si esce.
 */
export function siArriva(m: Mondo, x: number, y: number, meta: number, vicino: number): boolean {
  const dir = meta > x ? 1 : -1;
  while (Math.abs(meta - x) > vicino) {
    const ny = quotaDelPasso(m, x, y, dir, false);
    if (ny < 0) return false;
    x += dir;
    y = appoggio(m, x, ny);
  }
  return true;
}
