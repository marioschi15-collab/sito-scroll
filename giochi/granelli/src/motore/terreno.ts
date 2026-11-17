import { M } from './materiali.js';
import type { Mondo } from './mondo.js';

/**
 * Dà al mondo appena nato il suo fondo di roccia nuda: colline morbide e qualche conca dove l'acqua potrà fermarsi.
 * Ogni mondo ha un profilo diverso; nessun gradino è più alto di due celle, così un omino può sempre passare.
 */
export function terreno(m: Mondo): void {
  const { w, h } = m;
  const giro = Math.PI * 2;
  const onde = [
    { ampiezza: h * 0.05, passo: w * (0.7 + m.caso() * 0.5), fase: m.caso() * giro },
    { ampiezza: h * 0.03, passo: w * (0.25 + m.caso() * 0.2), fase: m.caso() * giro },
    { ampiezza: h * 0.012, passo: w * (0.08 + m.caso() * 0.06), fase: m.caso() * giro },
  ];
  const quote: number[] = [];
  for (let x = 0; x < w; x++) {
    let quota = h * 0.1;
    for (const o of onde) quota += o.ampiezza * Math.sin((x / o.passo) * giro + o.fase);
    quote.push(Math.max(2, Math.round(quota)));
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
