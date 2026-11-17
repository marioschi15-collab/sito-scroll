import { M } from './materiali.js';
import type { Mondo } from './mondo.js';

/** A che altezza del mondo sta, più o meno, la superficie (0 in cima, 1 in fondo). */
export const SUPERFICIE = 0.56;

const liscio = (da: number, a: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - da) / (a - da)));
  return t * t * (3 - 2 * t);
};

/**
 * Dà al mondo appena nato il suo fondo di roccia nuda: colline morbide, una grande conca dove l'acqua potrà
 * fermarsi e un pianoro buono per costruire. Ogni mondo ha un profilo diverso; nessun gradino è più alto di due
 * celle, così un omino può sempre passare.
 */
export function terreno(m: Mondo): void {
  const { w, h } = m;
  const giro = Math.PI * 2;
  const onde = [
    { ampiezza: Math.min(14, h * 0.07), passo: w * (0.35 + m.caso() * 0.25), fase: m.caso() * giro },
    { ampiezza: Math.min(6, h * 0.04), passo: w * (0.1 + m.caso() * 0.08), fase: m.caso() * giro },
    { ampiezza: Math.min(2, h * 0.015), passo: w * (0.03 + m.caso() * 0.02), fase: m.caso() * giro },
  ];
  // Al centro, dove il giocatore comincia, c'è il pianoro; la conca del lago gli sta a sinistra o a destra.
  const pianoro = 0.39;
  const conca = m.caso() < 0.5 ? 0.2 + m.caso() * 0.06 : 0.72 + m.caso() * 0.06;
  const quote: number[] = [];
  for (let x = 0; x < w; x++) {
    const dove = x / w;
    let cima = h * SUPERFICIE;
    for (const o of onde) cima -= o.ampiezza * Math.sin((x / o.passo) * giro + o.fase);
    cima += Math.sin(liscio(conca - 0.1, conca, dove) * liscio(conca + 0.16, conca + 0.06, dove) * (Math.PI / 2)) * Math.min(26, h * 0.14);
    const piano = liscio(pianoro, pianoro + 0.05, dove) * liscio(pianoro + 0.22, pianoro + 0.17, dove) * 0.85;
    cima = cima * (1 - piano) + (h * SUPERFICIE - 6) * piano;
    quote.push(Math.max(2, Math.min(h - 2, h - Math.round(cima))));
  }
  for (let x = 1; x < w; x++) quote[x] = Math.min(quote[x], quote[x - 1] + 2);
  for (let x = w - 2; x >= 0; x--) quote[x] = Math.min(quote[x], quote[x + 1] + 2);
  for (let x = 0; x < w; x++) {
    for (let y = h - quote[x]; y < h; y++) {
      const i = y * w + x;
      m.tipo[i] = M.ROCCIA;
      m.dato[i] = 0;
      m.tinta[i] = (m.caso() * 256) | 0;
    }
  }
}
