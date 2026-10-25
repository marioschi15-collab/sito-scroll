// src/utilita/copia.ts — copia un testo negli appunti. Non lancia mai errori.

/** Metodo di riserva per i browser (o le app, come Instagram) dove navigator.clipboard non c'è o non funziona. */
function copiaDiRiserva(testo: string): boolean {
  const attivoPrima = document.activeElement;
  const area = document.createElement('textarea');
  try {
    area.value = testo;
    area.setAttribute('readonly', '');
    area.setAttribute('aria-hidden', 'true');
    area.tabIndex = -1;
    // Fuori schermo; 16px evitano lo zoom automatico su iPhone.
    area.style.position = 'fixed';
    area.style.top = '0';
    area.style.left = '-9999px';
    area.style.opacity = '0';
    area.style.fontSize = '16px';
    document.body.appendChild(area);
    area.focus({ preventScroll: true });
    area.select();
    area.setSelectionRange(0, testo.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
    if (attivoPrima instanceof HTMLElement) attivoPrima.focus({ preventScroll: true });
  }
}

export async function copiaTesto(testo: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function') {
      await navigator.clipboard.writeText(testo);
      return true;
    }
  } catch {
    // Permesso negato o pagina non sicura: si prova il metodo di riserva.
  }
  try {
    return copiaDiRiserva(testo);
  } catch {
    return false;
  }
}
