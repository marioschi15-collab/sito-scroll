/** Crea un elemento della pagina con la sua classe e, se serve, il suo testo. */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, classe = '', testo = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (testo) e.textContent = testo;
  return e;
}

/** Lo scheletro della pagina: la barra in alto, il cielo con il mondo, la tavolozza in basso. */
export function costruisciPagina(app: HTMLElement) {
  app.innerHTML = '';

  const barra = el('header', 'barra');
  const bLibro = el('button', 'tasto tasto-libro');
  const bUnisci = el('button', 'tasto tasto-unisci', 'Unisci');
  const era = el('span', 'era');
  const bPausa = el('button', 'tasto', 'Pausa');
  const bNuovo = el('button', 'tasto', 'Nuovo');
  const titoli = el('div', 'titoli');
  titoli.append(el('h1', 'titolo', 'Granelli'), era);
  barra.append(titoli, bUnisci, bLibro, bPausa, bNuovo);

  const cielo = el('main', 'cielo');
  const quadro = el('div', 'quadro');
  // Le tele del mondo, dalla più lontana alla più vicina (vedi `Tele` in disegno/pittore.ts).
  const tele = {
    cielo: el('canvas', 'tela'),
    granelli: el('canvas', 'tela'),
    gas: el('canvas', 'tela tela-liscia tela-mezza'),
    luce: el('canvas', 'tela tela-liscia tela-mezza tela-luce'),
    sopra: el('canvas', 'tela'),
  };
  const bagliore = el('div', 'bagliore');
  // Il mondo è più grande della vista: le sue tele stanno in un foglio che scorre dietro la finestra.
  const foglio = el('div', 'foglio');
  foglio.append(tele.granelli, tele.gas, tele.luce);
  quadro.append(tele.cielo, foglio, tele.sopra, bagliore);
  const suggerimento = el('p', 'suggerimento', 'Scegli un elemento qui sotto e trascina il dito nel cielo. Con la Mano sposti la vista.');
  // Una frase breve che spiega quello che è appena successo (una posa rifiutata, un lutto): chi usa un lettore di schermo la sente.
  const riga = el('p', 'riga');
  riga.setAttribute('role', 'status');
  // Dove il browser non lascia salvare, un segno piccolo e fisso lo ricorda (vedi deposito.ts).
  const nonSalvata = el('p', 'non-salvata');
  nonSalvata.hidden = true;
  // Dopo «Nuovo», per qualche secondo, il modo di tornare indietro.
  const ripensa = el('div', 'ripensa');
  ripensa.hidden = true;
  cielo.append(quadro, suggerimento, riga, nonSalvata, ripensa);

  const piede = el('footer', 'piede');
  const pennelli = el('div', 'pennelli');
  const tavolozza = el('div', 'tavolozza');
  piede.append(pennelli, tavolozza);

  const avvisi = el('div', 'avvisi');
  app.append(barra, cielo, piede, avvisi);

  return { bLibro, bUnisci, bPausa, bNuovo, era, foglio, cielo, quadro, tele, suggerimento, riga, nonSalvata, ripensa, pennelli, tavolozza, avvisi };
}

/**
 * Una piccola vibrazione, solo dopo che chi gioca ha toccato davvero la pagina: prima il browser la vieta (e dentro
 * un riquadro lo scrive tra gli errori).
 */
export function vibra(ms: number): void {
  const n = navigator as Navigator & { userActivation?: { hasBeenActive: boolean } };
  if (n.userActivation && !n.userActivation.hasBeenActive) return;
  n.vibrate?.(ms);
}
