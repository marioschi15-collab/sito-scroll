// src/utilita/geometria.ts — misure dei tracciati SVG (lunghezze, riquadri, punti) e linee di tratteggio.
// Tutte le misure passano da un unico <svg> nascosto, creato la prima volta che serve e messo in cache.

const NS_SVG = 'http://www.w3.org/2000/svg';

export interface Riquadro { x: number; y: number; larghezza: number; altezza: number }

export interface Punto { x: number; y: number }

/** Lunghezze per chiave (di solito l'id del disegno) e riquadri per tracciato. */
const cacheLunghezze = new Map<string, readonly number[]>();
const cacheRiquadri = new Map<string, Riquadro>();

let svgMisure: SVGSVGElement | null = null;
/** Tracciato fisso usato dall'ago: cambia `d` solo quando l'ago passa a un altro tratto. */
let tracciatoPunti: SVGPathElement | null = null;
let percorsoPunti = '';

/** L'<svg> invisibile delle misure: 0×0, fuori dal flusso, nascosto ai lettori di schermo. */
function contenitoreMisure(): SVGSVGElement | null {
  if (typeof document === 'undefined' || !document.body) return null;
  if (svgMisure?.isConnected) return svgMisure;
  const svg = document.createElementNS(NS_SVG, 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.style.cssText =
    'position:absolute;left:0;top:0;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none';
  document.body.appendChild(svg);
  svgMisure = svg;
  tracciatoPunti = null;
  percorsoPunti = '';
  return svg;
}

function nuovoTracciato(percorso: string): SVGPathElement {
  const el = document.createElementNS(NS_SVG, 'path');
  el.setAttribute('d', percorso);
  return el;
}

function lunghezzaDi(el: SVGPathElement): number {
  try {
    const l = el.getTotalLength();
    return Number.isFinite(l) && l > 0 ? l : 0;
  } catch {
    return 0;
  }
}

/** Lunghezze dei tracciati, misurate una volta e messe in cache con `chiave`. */
export function misuraLunghezze(chiave: string, percorsi: readonly string[]): readonly number[] {
  const inCache = cacheLunghezze.get(chiave);
  if (inCache && inCache.length === percorsi.length) return inCache;
  const svg = contenitoreMisure();
  // Senza DOM (prerender, test) le lunghezze valgono 0 e non finiscono in cache.
  if (!svg) return percorsi.map(() => 0);
  // Tutti i tracciati entrano insieme e si misurano in blocco: un solo ricalcolo di stile.
  const elementi = percorsi.map(nuovoTracciato);
  const gruppo = document.createDocumentFragment();
  for (const el of elementi) gruppo.appendChild(el);
  svg.appendChild(gruppo);
  const lunghezze = elementi.map(lunghezzaDi);
  for (const el of elementi) el.remove();
  cacheLunghezze.set(chiave, lunghezze);
  return lunghezze;
}

/** Riquadro di un tracciato (getBBox), in cache. */
export function misuraRiquadro(percorso: string): Riquadro {
  const inCache = cacheRiquadri.get(percorso);
  if (inCache) return inCache;
  const vuoto: Riquadro = { x: 0, y: 0, larghezza: 0, altezza: 0 };
  const svg = contenitoreMisure();
  if (!svg) return vuoto;
  const el = nuovoTracciato(percorso);
  svg.appendChild(el);
  let riquadro = vuoto;
  try {
    const r = el.getBBox();
    riquadro = { x: r.x, y: r.y, larghezza: r.width, altezza: r.height };
  } catch {
    // Tracciato non valido: resta il riquadro vuoto.
  }
  el.remove();
  cacheRiquadri.set(percorso, riquadro);
  return riquadro;
}

/**
 * Punto alla distanza `distanza` (unità del viewBox) lungo `percorso`. Lo usa l'ago, una volta per fotogramma.
 * Misura su un tracciato nascosto senza l'attributo pathLength (che Motion mette a 1 sui tratti animati),
 * così il risultato non dipende da come il browser tratta quell'attributo. Null se non si può misurare.
 */
export function puntoSulTracciato(percorso: string, distanza: number): Punto | null {
  const svg = contenitoreMisure();
  if (!svg) return null;
  if (!tracciatoPunti || tracciatoPunti.parentNode !== svg) {
    tracciatoPunti = nuovoTracciato(percorso);
    percorsoPunti = percorso;
    svg.appendChild(tracciatoPunti);
  } else if (percorsoPunti !== percorso) {
    tracciatoPunti.setAttribute('d', percorso);
    percorsoPunti = percorso;
  }
  try {
    const p = tracciatoPunti.getPointAtLength(Math.max(0, distanza));
    return { x: p.x, y: p.y };
  } catch {
    return null;
  }
}

const arrotonda = (n: number): number => Math.round(n * 100) / 100;

/**
 * Un solo tracciato di linee parallele che copre il riquadro, con passo e inclinazione dati.
 * `passo` è la distanza tra due linee (predefinito 5). `angolo` 45 = linee "/" che salgono verso destra,
 * -45 = linee "\" (predefinito 45). Il riquadro si allarga di `passo` per lato, così il ritaglio non lascia vuoti.
 */
export function lineeTratteggio(riquadro: Riquadro, passo = 5, angolo: 45 | -45 = 45): string {
  const p = Number.isFinite(passo) && passo > 0 ? passo : 5;
  const x0 = riquadro.x - p;
  const y0 = riquadro.y - p;
  const x1 = riquadro.x + riquadro.larghezza + p;
  const y1 = riquadro.y + riquadro.altezza + p;
  // Linee x + y = c ("/") oppure x - y = c ("\"): tra due linee vicine c cambia di passo·√2.
  const salto = p * Math.SQRT2;
  const segmenti: string[] = [];
  if (angolo === 45) {
    for (let c = x0 + y0 + salto / 2; c < x1 + y1; c += salto) {
      const xa = Math.max(x0, c - y1);
      const xb = Math.min(x1, c - y0);
      if (xb - xa > 0.01) {
        segmenti.push(`M${arrotonda(xa)} ${arrotonda(c - xa)} L${arrotonda(xb)} ${arrotonda(c - xb)}`);
      }
    }
  } else {
    for (let c = x0 - y1 + salto / 2; c < x1 - y0; c += salto) {
      const xa = Math.max(x0, c + y0);
      const xb = Math.min(x1, c + y1);
      if (xb - xa > 0.01) {
        segmenti.push(`M${arrotonda(xa)} ${arrotonda(xa - c)} L${arrotonda(xb)} ${arrotonda(xb - c)}`);
      }
    }
  }
  return segmenti.join(' ');
}
