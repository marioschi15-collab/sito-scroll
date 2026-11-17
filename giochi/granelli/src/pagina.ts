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
  const bPausa = el('button', 'tasto', 'Pausa');
  const bNuovo = el('button', 'tasto', 'Nuovo');
  barra.append(el('h1', 'titolo', 'Granelli'), bLibro, bPausa, bNuovo);

  const cielo = el('main', 'cielo');
  const quadro = el('div', 'quadro');
  const tela = el('canvas', 'tela');
  const telaLuce = el('canvas', 'tela tela-luce');
  const telaOmini = el('canvas', 'tela tela-omini');
  const scintille = el('div', 'scintille');
  quadro.append(tela, telaLuce, telaOmini, scintille);
  const suggerimento = el('p', 'suggerimento', 'Scegli un elemento qui sotto e trascina il dito nel cielo.');
  cielo.append(quadro, suggerimento);

  const piede = el('footer', 'piede');
  const pennelli = el('div', 'pennelli');
  const tavolozza = el('div', 'tavolozza');
  piede.append(pennelli, tavolozza);

  const avvisi = el('div', 'avvisi');
  app.append(barra, cielo, piede, avvisi);

  return { bLibro, bPausa, bNuovo, cielo, quadro, tela, telaLuce, telaOmini, scintille, suggerimento, pennelli, tavolozza, avvisi };
}
