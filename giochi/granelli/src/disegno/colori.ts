import { GAS, LIQUIDO, M, N_TIPI, OMINO, type Sostanza, VILLAGGIO } from '../motore/materiali.js';

/** Quattro sfumature per materiale: la "grana" che fa sembrare la terra terra e non una macchia piatta. */
export const TR = new Uint8Array(N_TIPI * 4);
export const TG = new Uint8Array(N_TIPI * 4);
export const TB = new Uint8Array(N_TIPI * 4);
/** Quanto è opaco un materiale, da 0 a 255 (per i gas: quanto è denso il velo che lasciano). */
export const TA = new Uint8Array(N_TIPI);

function tinte(t: number, r: number, g: number, b: number, grana: number, a = 255): void {
  for (let k = 0; k < 4; k++) {
    const f = 1 + ((k - 1.5) / 1.5) * grana;
    TR[t * 4 + k] = Math.min(255, r * f);
    TG[t * 4 + k] = Math.min(255, g * f);
    TB[t * 4 + k] = Math.min(255, b * f);
  }
  TA[t] = a;
}
tinte(M.TERRA, 150, 98, 64, 0.14);
tinte(M.ACQUA, 58, 140, 230, 0.05, 200);
tinte(M.ARIA, 215, 235, 250, 0.04, 60);
tinte(M.VAPORE, 232, 240, 246, 0.04, 115);
tinte(M.FANGO, 96, 68, 50, 0.12);
tinte(M.SABBIA, 236, 208, 146, 0.09);
tinte(M.PIETRA, 136, 144, 156, 0.12);
tinte(M.NUVOLA, 250, 252, 255, 0.03, 235);
tinte(M.VETRO, 176, 232, 238, 0.05, 150);
tinte(M.ARGILLA, 196, 124, 96, 0.08);
tinte(M.MATTONE, 188, 70, 50, 0.14);
tinte(M.PIANTA, 74, 180, 82, 0.2);
tinte(M.LEGNO, 118, 80, 48, 0.14);
tinte(M.CENERE, 176, 176, 180, 0.12);
tinte(M.FUMO, 92, 92, 104, 0.1, 140);
tinte(M.NEVE, 248, 251, 255, 0.03);
tinte(M.GHIACCIO, 182, 226, 252, 0.06, 235);
tinte(M.HUMUS, 70, 50, 34, 0.16);
tinte(M.OSSIDIANA, 52, 42, 72, 0.2);
tinte(M.ROCCIA, 78, 86, 118, 0.1);
tinte(M.FUOCO, 255, 150, 40, 0.1);
tinte(M.LAVA, 255, 110, 24, 0.12);
tinte(M.BRACE, 220, 90, 30, 0.15);
tinte(M.FULMINE, 255, 252, 220, 0);
tinte(M.CARBONE, 46, 44, 52, 0.25);
tinte(M.METALLO, 170, 178, 194, 0.08);
tinte(M.RUGGINE, 178, 90, 46, 0.16);
tinte(M.ZOLFO, 228, 212, 66, 0.1);
tinte(M.POLVERE_NERA, 60, 58, 68, 0.2);
tinte(M.ACIDO, 150, 228, 62, 0.06, 215);
tinte(M.DIAMANTE, 198, 242, 255, 0.05, 230);
tinte(M.MUSCHIO, 96, 152, 72, 0.16);
tinte(M.ALGA, 40, 152, 112, 0.18);
tinte(M.FUNGO, 216, 82, 72, 0.12);
tinte(M.FRUTTO, 234, 62, 62, 0.08);

/** Dà a una miscela i suoi colori nel posto che occupa in questo mondo. */
export function tinteMiscela(t: number, s: Sostanza): void {
  tinte(t, s.colore[0], s.colore[1], s.colore[2], 0.1, s.stato === GAS ? 150 : s.stato === LIQUIDO ? 215 : 255);
}

export const FIORI: readonly (readonly [number, number, number])[] = [
  [255, 214, 92],
  [250, 130, 170],
  [245, 245, 250],
  [190, 140, 250],
];

const campioni = new Map<number, string>();

/**
 * Un quadratino di materiale da mostrare nella tavolozza e nel libro: la stessa grana che ha nel mondo,
 * così il giocatore riconosce a colpo d'occhio cosa sta per versare.
 */
export function campione(id: number, miscela?: Sostanza | null): string {
  const pronto = campioni.get(id);
  if (pronto) return pronto;
  const lato = 7;
  const tela = document.createElement('canvas');
  tela.width = tela.height = lato;
  const ctx = tela.getContext('2d')!;
  // Sempre lo stesso disegno per lo stesso materiale: i numeri "a caso" dipendono solo dalla posizione.
  const caso = (x: number, y: number): number => {
    let s = (x * 374761393 + y * 668265263 + id * 2246822519) | 0;
    s = (s ^ (s >>> 13)) * 1274126177;
    return ((s ^ (s >>> 16)) >>> 0) / 4294967296;
  };
  const punto = (x: number, y: number, r: number, g: number, b: number, a = 1): void => {
    ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${a})`;
    ctx.fillRect(x, y, 1, 1);
  };
  ctx.fillStyle = '#131a33';
  ctx.fillRect(0, 0, lato, lato);
  for (let y = 0; y < lato; y++) {
    for (let x = 0; x < lato; x++) {
      const c = caso(x, y);
      if (id === OMINO) {
        if (y < 2) punto(x, y, 60, 40, 28);
        else if (y < 5) punto(x, y, 242, 200, 158);
        else punto(x, y, 80, 150, 240);
        if (y === 3 && (x === 2 || x === 4)) punto(x, y, 26, 26, 36);
      } else if (id === VILLAGGIO) {
        const tetto = y < 3 && Math.abs(x - 3) <= y;
        if (tetto) punto(x, y, 190, 70, 50);
        else if (y >= 3 && x > 0 && x < 6) punto(x, y, y > 4 && x === 3 ? 90 : 236, y > 4 && x === 3 ? 60 : 208, y > 4 && x === 3 ? 40 : 146);
      } else if (id === M.FUOCO) {
        const caldo = (lato - y) / lato + (c - 0.5) * 0.3;
        if (caldo < 0.85 && Math.abs(x - 3) <= 1 + y / 2.2) punto(x, y, 255, 240 - caldo * 190, 150 - caldo * 150);
      } else if (id === M.FULMINE) {
        const zig = [3, 4, 3, 2, 3, 4, 3][y];
        if (x === zig) punto(x, y, 255, 252, 200);
      } else if (id === M.LAVA) {
        punto(x, y, 255, c > 0.7 ? 214 : c > 0.3 ? 110 : 62, c > 0.7 ? 90 : 20);
      } else if (miscela) {
        const f = 0.86 + c * 0.28;
        punto(x, y, Math.min(255, miscela.colore[0] * f), Math.min(255, miscela.colore[1] * f), Math.min(255, miscela.colore[2] * f), miscela.stato === GAS ? 0.6 : 1);
      } else if (id < N_TIPI) {
        const k = id * 4 + ((c * 4) | 0);
        const fiore = id === M.PIANTA && c > 0.9;
        const f = fiore ? FIORI[(x + y) & 3] : [TR[k], TG[k], TB[k]];
        punto(x, y, f[0], f[1], f[2], TA[id] / 255);
      } else {
        // Un fenomeno: un cielo piccolo, con una striscia che ne ricorda il colore.
        const tono = (id * 47) % 360;
        punto(x, y, 0, 0, 0, 0);
        ctx.fillStyle = `hsl(${tono} ${y < 3 ? 70 : 45}% ${78 - y * 7}%)`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  const url = tela.toDataURL();
  campioni.set(id, url);
  return url;
}
