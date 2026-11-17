import { M, N_MATERIALI, OMINO, VILLAGGIO } from '../motore/materiali.js';

/** Quattro sfumature per materiale: la "grana" che fa sembrare la terra terra e non una macchia piatta. */
export const TR = new Uint8Array(N_MATERIALI * 4);
export const TG = new Uint8Array(N_MATERIALI * 4);
export const TB = new Uint8Array(N_MATERIALI * 4);
/** Quanto è opaco un materiale, da 0 a 255 (per i gas: quanto è denso il velo che lasciano). */
export const TA = new Uint8Array(N_MATERIALI);

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
export function campione(id: number): string {
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
      } else {
        const k = id * 4 + ((c * 4) | 0);
        const fiore = id === M.PIANTA && c > 0.9;
        const f = fiore ? FIORI[(x + y) & 3] : [TR[k], TG[k], TB[k]];
        punto(x, y, f[0], f[1], f[2], TA[id] / 255);
      }
    }
  }
  const url = tela.toDataURL();
  campioni.set(id, url);
  return url;
}
