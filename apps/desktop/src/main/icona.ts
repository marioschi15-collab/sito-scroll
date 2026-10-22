/**
 * Icona della barra disegnata in codice (un anello con un punto): niente file binari nel prototipo.
 * Restituisce pixel BGRA per `nativeImage.createFromBitmap`. L'icona definitiva arriverà con la pacchettizzazione.
 */
export function bitmapIcona(lato: number, colore: { r: number; g: number; b: number }): Buffer {
  const pixel = Buffer.alloc(lato * lato * 4);
  const centro = (lato - 1) / 2;
  const esterno = lato * 0.46;
  const interno = lato * 0.3;
  const punto = lato * 0.14;
  for (let y = 0; y < lato; y++) {
    for (let x = 0; x < lato; x++) {
      const d = Math.hypot(x - centro, y - centro);
      // Copertura con bordi morbidi (mezzo pixel di sfumatura).
      const anello = Math.min(Math.max(esterno + 0.5 - d, 0), 1) * Math.min(Math.max(d - interno + 0.5, 0), 1);
      const nucleo = Math.min(Math.max(punto + 0.5 - d, 0), 1);
      const copertura = Math.max(anello, nucleo);
      const i = (y * lato + x) * 4;
      // Alfa premoltiplicato, come si aspetta Skia.
      pixel[i] = Math.round(colore.b * copertura);
      pixel[i + 1] = Math.round(colore.g * copertura);
      pixel[i + 2] = Math.round(colore.r * copertura);
      pixel[i + 3] = Math.round(copertura * 255);
    }
  }
  return pixel;
}
