/**
 * I colori delle figure e delle icone: ogni lettera dei disegni a quadretti è uno di questi (il punto è il vuoto).
 * Sta in un file suo, senza niente che serva alla pagina, perché anche il controllo delle schede la legge.
 * Le lettere che ci sono non cambiano colore: le schede le usano. Se serve un colore nuovo, si aggiunge una lettera.
 */
export const P: Readonly<Record<string, string>> = {
  k: '#1b1420', n: '#3b2a22', b: '#6b4426', B: '#8f5e36', D: '#b07a48', g: '#1f5a3a', G: '#2f8048', l: '#4fae58', L: '#86d66c',
  r: '#a8362b', R: '#d2553c', O: '#ef7d55', o: '#ff9a2e', y: '#ffd95a', Y: '#fff3b0', w: '#efe6cf', W: '#ffffff', V: '#d8ceb4',
  s: '#7f8794', S: '#aab1bd', d: '#555c68', c: '#3f7fd6', C: '#8fc4ff', p: '#f2c79b', q: '#cf9a6c', h: '#3a2a20', m: '#34426e',
  t: '#c9a55e', T: '#e8cf8a', U: '#f6e6b0', F: '#9fd0ff', A: '#b06ce0', z: '#e0a030', Z: '#a86a18', e: '#9aa4b4', x: '#c8d0dc',
};

/** Le lettere che una figura o un'icona può usare. */
export const LETTERE: ReadonlySet<string> = new Set(Object.keys(P));
