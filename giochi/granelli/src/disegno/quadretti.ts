import { rifila } from '../contenuti/registro.js';

/**
 * Un disegno a metà grandezza, sempre a quadretti netti: ogni quadrato di 2x2 quadretti diventa il colore che ci
 * compare di più (vuoto se è vuoto per più di metà). Serve a ciò che un omino tiene in mano e ai fumetti.
 */
export function dimezza(righe: readonly string[]): string[] {
  const fuori: string[] = [];
  const largo = Math.max(...righe.map((r) => r.length));
  for (let y = 0; y < righe.length; y += 2) {
    let riga = '';
    for (let x = 0; x < largo; x += 2) {
      const quanti = new Map<string, number>();
      let pieni = 0;
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
        const c = righe[y + dy]?.[x + dx] ?? '.';
        if (c === '.') continue;
        pieni++;
        quanti.set(c, (quanti.get(c) ?? 0) + 1);
      }
      let meglio = '.';
      let n = 0;
      for (const [c, k] of quanti) if (k > n) [meglio, n] = [c, k];
      riga += pieni >= 2 ? meglio : '.';
    }
    fuori.push(riga);
  }
  return rifila(fuori);
}
