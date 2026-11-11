/* Boccone — le schermate: casa, mappa, negozio, acquario, traguardi, impostazioni, aiuto, pausa, risultato.
   Ognuna si registra in B.schermate con crea(radice) (una volta), mostra(dati) (ogni volta che compare) e, se serve,
   aggiorna() (quando cambiano i progressi mentre è aperta). I pezzi comuni arrivano da B.interfaccia. */
(() => {
'use strict';
const B = window.B, I = B.interfaccia, P = B.progressi, L = B.livelli, S = B.schermate;
const { el, bottone } = I;

function colonna(radice, classe) {
  const corpo = el('div', 'corpo'), col = el('div', 'colonna' + (classe ? ' ' + classe : ''));
  corpo.append(col); radice.append(corpo);
  return col;
}
const perle = n => { const s = el('span', 'borsa'); s.append(el('i', 'perla'), el('span', '', '+' + I.numero(n))); return s; };
const PACCO = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><rect x="3" y="10" width="18" height="11" rx="2" fill="#ff5c7a"/><rect x="2" y="6.5" width="20" height="5" rx="1.5" fill="#ff8fa3"/><rect x="10.5" y="6.5" width="3" height="14.5" fill="#fff3a8"/><path d="M12 6.5C10 2 5.5 3 6.6 5.2 7.4 6.8 10 6.5 12 6.5zm0 0c2-4.5 6.500-3.500 5.400-1.300C16.600 6.800 14 6.500 12 6.500z" fill="#fff3a8"/></svg>';
const veroEroe = id => { const d = B.eroi.prendi(id); return d && !d.provvisoria ? d : null; };

// =====================================================================  casa
(() => {
  let gioca, sopra, regalo, regaloTesto, regaloSotto, giorni, pallino;
  function aggiorna() {
    const max = P.livelloMax(), finito = P.livelliSuperati() >= L.totale;
    I.scrivi(gioca, 'Gioca', finito ? 'Hai finito l\'avventura: rigioca i livelli' : 'Livello ' + max + ' · ' + L.ambienteDi(max).nome);
    const aperta = P.sopravvivenzaSbloccata(), rec = P.recordSopravvivenza();
    sopra.disabled = !aperta;
    I.scrivi(sopra, 'Sopravvivenza', aperta ? (rec.tempo > 0 ? 'Il tuo record: ' + I.minuti(rec.tempo) : 'Resisti più che puoi') : 'Si apre dopo il livello ' + Math.min(5, L.totale));
    const r = P.regalo(), fatti = r.disponibile ? r.giorno - 1 : (r.giorno - 1) || (r.serie > 0 ? 7 : 0);
    regalo.classList.toggle('preso', !r.disponibile);
    regaloTesto.textContent = r.disponibile ? 'Regalo del giorno: +' + r.perle + ' perle' : 'Regalo di oggi ritirato';
    regaloSotto.textContent = r.disponibile ? 'Giorno ' + r.giorno + ' di 7 · tocca per ritirarlo' : 'Torna domani: ti aspettano ' + r.perle + ' perle';
    giorni.forEach((g, i) => g.classList.toggle('on', i < fatti));
    const n = P.daRiscuotere();
    pallino.hidden = n === 0; pallino.textContent = String(n);
    I.aggiornaGettoni();
  }
  S.registra('casa', {
    crea(r) {
      const c = colonna(r, 'centro');
      c.style.paddingTop = 'calc(var(--sopra) + 8px)';
      const borsa = el('div'); borsa.append(I.gettonePerle());
      regalo = el('button', 'regalo'); regalo.type = 'button';
      const testi = el('div'); regaloTesto = el('span'); regaloSotto = el('small'); const fila = el('div', 'giorni');
      giorni = []; for (let i = 0; i < 7; i++) { const g = el('i'); giorni.push(g); fila.append(g); }
      testi.append(regaloTesto, regaloSotto, fila); const fiocco = el('span', 'fiocco'); fiocco.innerHTML = PACCO; regalo.append(fiocco, testi);
      regalo.addEventListener('click', () => {
        const preso = P.riscuotiRegalo();
        if (!preso) { I.suono('tasto'); return; }
        I.suono('regalo'); I.avviso('Regalo del giorno: +' + preso.perle + ' perle', { segno: '★', sotto: preso.serie > 1 ? preso.serie + ' giorni di fila: domani vale di più' : 'Torna domani: ogni giorno vale di più' });
        aggiorna();
      });
      gioca = bottone('Gioca', 'grande', () => S.mostra('mappa'), '');
      sopra = bottone('Sopravvivenza', 'medio', () => I.gioca({ modalita: 'sopravvivenza' }), '');
      const r1 = el('div', 'coppia'), r2 = el('div', 'coppia');
      const traguardi = bottone('Traguardi', 'medio', () => S.mostra('traguardi'));
      pallino = el('span', 'pallino'); pallino.hidden = true; traguardi.append(pallino);
      r1.append(bottone('Negozio', 'medio', () => S.mostra('negozio')), bottone('Acquario', 'medio', () => S.mostra('acquario')));
      r2.append(traguardi, bottone('Impostazioni', 'medio', () => S.mostra('impostazioni')));
      c.append(el('h1', '', 'Boccone'), el('p', 'sottotitolo', 'Mangia, cresci, sopravvivi.'), borsa, regalo, gioca, sopra, r1, r2, bottone('Come si gioca', 'medio', () => S.mostra('aiuto')));
      borsa.style.marginBottom = '14px';
    },
    mostra: aggiorna, aggiorna,
  });
})();

// =====================================================================  mappa
(() => {
  const tasti = new Map(), conti = new Map();
  let scelto = 1, titolo, riga, vai;
  /* La vita di un gigante in parole: "3 milioni", "un milione"; se non è un numero tondo, come lo scrive il gioco. */
  const milioni = v => v >= 1e6 && v % 1e6 === 0 ? (v === 1e6 ? 'un milione' : I.numero(v / 1e6) + ' milioni') : I.numero(v);
  function scegli(n) {
    scelto = n;
    for (const [k, b] of tasti) b.classList.toggle('scelto', k === n);
    const cfg = L.config(n), ob = cfg.obiettivo, aperto = P.livelloSbloccato(n);
    titolo.textContent = 'Livello ' + n + ' · ' + cfg.ambiente.nome;
    let s = ob.tipo === 'gigante' ? 'Affronta ' + ob.nome + ': ' + milioni(ob.vita) + ' di vita.' : 'Cresci e mangia il capobranco' + (ob.def ? ' (' + ob.def.nome.toLowerCase() + ').' : '.');
    if (cfg.particolarita) s += ' ' + cfg.particolarita.nome + ': ' + cfg.particolarita.descrizione.charAt(0).toLowerCase() + cfg.particolarita.descrizione.slice(1);
    s += ' Terza stella entro ' + I.minuti(cfg.tempoStella) + '.';
    riga.textContent = aperto ? s : 'Per aprirlo supera prima il livello ' + (n - 1) + '.';
    vai.disabled = !aperto;
    I.scrivi(vai, aperto ? 'Gioca il livello ' + n : 'Livello chiuso');
  }
  function aggiorna() {
    for (const [n, b] of tasti) {
      b.classList.toggle('chiuso', !P.livelloSbloccato(n));
      b.lastChild.innerHTML = I.stelline(P.stelle(n));
    }
    for (const [id, c] of conti) { const primo = L.primoLivelloDi(id); let q = 0; for (let i = 0; i < L.perAmbiente; i++) q += P.stelle(primo + i); c.textContent = '★ ' + q + ' su ' + L.perAmbiente * 3; }
    I.aggiornaGettoni();
  }
  S.registra('mappa', {
    crea(r) {
      r.append(I.testata('Mappa'));
      const c = colonna(r);
      for (const scheda of B.cast.ambienti) {
        const def = B.ambienti.prendi(scheda.id), col = (def && def.colori) || {}, primo = L.primoLivelloDi(scheda.id);
        const carta = el('div', 'ambiente' + (primo ? '' : ' chiuso')), capo = el('div', 'capo');
        carta.style.background = 'linear-gradient(165deg, ' + (col.acquaAlta || '#3fa0dc') + ', ' + (col.acquaBassa || '#0b2a5c') + ' 85%)';
        capo.append(el('strong', '', scheda.nome));
        carta.append(capo, el('div', 'riga-desc', (def && def.descrizione) || ''));
        if (!primo) { capo.append(el('span', 'conto', 'In arrivo')); c.append(carta); continue; }
        const conto = el('span', 'conto', ''); capo.append(conto); conti.set(scheda.id, conto);
        const fila = el('div', 'livelli');
        for (let i = 0; i < L.perAmbiente; i++) {
          const n = primo + i, b = el('button', 'livello' + (i === L.perAmbiente - 1 ? ' gigante' : ''));
          b.type = 'button'; b.append(el('b', '', String(n)), el('span', ''));
          b.addEventListener('click', () => { I.suono('tasto'); scegli(n); });
          tasti.set(n, b); fila.append(b);
        }
        carta.append(fila); c.append(carta);
      }
      const piede = el('div', 'piede'), dentro = el('div', 'colonna');
      titolo = el('strong'); riga = el('div', 'piccolo');
      vai = bottone('Gioca', 'grande', () => I.gioca({ livello: scelto, modalita: 'avventura' }));
      dentro.append(titolo, riga, vai); piede.append(dentro); r.append(piede);
    },
    mostra(dati) {
      aggiorna();
      scegli(U_limita((dati && dati.livello) || P.livelloMax()));
      const b = tasti.get(scelto);
      if (b) requestAnimationFrame(() => { try { b.closest('.ambiente').scrollIntoView({ block: 'center' }); } catch (e) {} });
    },
    aggiorna,
  });
  function U_limita(n) { return B.util.limita(Math.round(n) || 1, 1, L.totale); }
})();

// =====================================================================  negozio
(() => {
  let eroi, potenziamenti, nota;
  function disegna() {
    const ho = P.perle(), scelto = P.eroeScelto();
    eroi.textContent = '';
    let lista = B.cast.eroi.filter(e => veroEroe(e.id));
    if (!lista.length) lista = B.cast.eroi.filter(e => !(e.costo > 0) && B.eroi.prendi(e.id));
    for (const e of lista) {
      const def = B.eroi.prendi(e.id), mio = P.eroePosseduto(e.id), riga = el('div', 'eroe' + (e.id === scelto ? ' scelto' : '')), tela = el('canvas'), testi = el('div');
      testi.append(el('strong', '', e.nome), el('small', '', e.vantaggio || ''));
      let tasto;
      if (mio && e.id === scelto) { tasto = el('button', 'compra fatto', 'Scelto'); tasto.disabled = true; }
      else if (mio) tasto = bottone('Scegli', 'compra scegli', () => { P.scegliEroe(e.id); I.suono('acquisto'); disegna(); });
      else {
        tasto = el('button', 'compra'); tasto.type = 'button'; tasto.append(el('i', 'perla'), el('span', '', I.numero(e.costo)));
        tasto.disabled = ho < e.costo;
        tasto.addEventListener('click', () => { if (P.compraEroe(e.id)) { I.suono('acquisto'); I.avviso(e.nome + ' nuota con te!', { segno: '★' }); } else I.suono('errore'); disegna(); });
      }
      riga.append(tela, testi, tasto); eroi.append(riga);
      I.modelloVivo(tela, def, { w: 84, h: 72, minaccia: false });
    }
    nota.hidden = lista.length >= B.cast.eroi.length;
    potenziamenti.textContent = '';
    for (const p of P.POTENZIAMENTI) {
      const liv = P.livelloPotenziamento(p.id), costo = P.costoPotenziamento(p.id), riga = el('div', 'voce'), testi = el('div'), tacche = el('div', 'tacche');
      const adesso = liv > 0 && p.beneficio ? p.beneficio(liv) : '', desc = el('small', '', p.descrizione);
      if (adesso) { desc.append(' '); desc.append(el('em', '', adesso)); }
      p.costi.forEach((_, i) => tacche.append(el('i', i < liv ? 'on' : '')));
      testi.append(el('strong', '', p.nome), desc, tacche);
      let tasto;
      if (costo === null) { tasto = el('button', 'compra fatto', 'Al massimo'); tasto.disabled = true; }
      else {
        tasto = el('button', 'compra'); tasto.type = 'button'; tasto.append(el('i', 'perla'), el('span', '', I.numero(costo)));
        tasto.disabled = ho < costo;
        tasto.addEventListener('click', () => { I.suono(P.compraPotenziamento(p.id) ? 'acquisto' : 'errore'); disegna(); });
      }
      riga.append(testi, tasto); potenziamenti.append(riga);
    }
    I.aggiornaGettoni();
  }
  S.registra('negozio', {
    crea(r) {
      r.append(I.testata('Negozio'));
      const c = colonna(r);
      eroi = el('div'); potenziamenti = el('div'); nota = el('p', 'piccolo', 'Altri compagni sono in arrivo.');
      c.append(el('h3', '', 'Compagni'), eroi, nota, el('h3', '', 'Potenziamenti'), potenziamenti);
    },
    mostra: disegna,
  });
})();

// =====================================================================  acquario
(() => {
  const INDOLI = { cacciatore: 'Ti insegue, se è più grosso di te.', timido: 'Timido: scappa e non fa male.', agguato: 'Sta in agguato e scatta quando gli passi vicino.',
    scattante: 'Insegue a strappi velocissimi.', pattuglia: 'Fa la ronda e vede lontano.', branco: 'Gira in gruppo.', pigro: 'Lento: si accorge di te solo da vicino.' };
  const SPECIALI = { inchiostro: 'Se lo insegui lascia una nuvola di inchiostro.', scossa: 'Dà la scossa a chi gli sta vicino.', veleno: 'Velenoso: mangialo solo quando sei almeno il doppio di lui.',
    corazza: 'Corazzato: per mangiarlo devi essere parecchio più forte.', luce: 'Brilla nel buio.' };
  let corpo, conto, velo, scheda;
  const nomiAmbienti = def => def.ambienti.map(id => (B.cast.ambienti.find(a => a.id === id) || {}).nome).filter(Boolean).join(', ');
  function apri(def, nota) {
    const a = P.acquario(def.id), visto = a.visti > 0 || a.mangiati > 0, tela = el('canvas');
    scheda.textContent = '';
    scheda.append(tela, el('h2', '', visto ? def.nome : '???'));
    if (visto) {
      scheda.append(el('div', 'dove', (def.tipo === 'gigante' ? 'Gigante · ' : 'Taglia ' + def.taglia + ' di 5 · ') + nomiAmbienti(def)));
      scheda.append(el('p', '', def.descrizione || ''));
      const carattere = def.tipo === 'gigante' ? 'Ha milioni di vita: ogni morso gliene toglie quanto vale il tuo numero. Quando il tuo numero supera il suo, lo mangi in un boccone.' : [INDOLI[def.indole], SPECIALI[def.speciale]].filter(Boolean).join(' ');
      if (carattere) scheda.append(el('p', 'piccolo', carattere));
      const conti = el('div', 'conti'), c1 = el('div'), c2 = el('div');
      c1.append(el('b', '', I.numero(a.visti)), def.tipo === 'gigante' ? 'volte incontrato' : 'volte visto'); c2.append(el('b', '', I.numero(a.mangiati)), def.tipo === 'gigante' ? 'volte sconfitto' : 'volte mangiato');
      conti.append(c1, c2); scheda.append(conti);
    } else scheda.append(el('p', '', 'Non l\'hai ancora incontrato.'), el('p', 'piccolo', 'Cercalo qui: ' + nomiAmbienti(def) + '.'));
    scheda.append(bottone('Chiudi', 'grande', chiudi));
    velo.classList.add('visibile');
    I.modelloVivo(tela, def, { w: 320, h: 170, sagoma: !visto, fermo: !visto, pieno: .82 });
  }
  function chiudi() { velo.classList.remove('visibile'); scheda.textContent = ''; }
  function disegna() {
    const su = corpo.parentNode.scrollTop;
    corpo.textContent = '';
    conto.textContent = P.scoperte() + ' su ' + P.totaleSpecie();
    const messe = new Set();
    for (const id of L.aperti) {
      const amb = B.cast.ambienti.find(a => a.id === id);
      const lista = B.cast.specie.filter(s => (s.tipo === 'pesce' || s.tipo === 'gigante') && s.ambienti.includes(id) && !messe.has(s.id) && B.specie.prendi(s.id));
      if (!amb || !lista.length) continue;
      lista.sort((a, b) => (a.taglia || 9) - (b.taglia || 9));
      const vasca = el('div', 'vasca');
      let viste = 0;
      for (const s of lista) {
        messe.add(s.id);
        const def = B.specie.prendi(s.id), a = P.acquario(s.id), visto = a.visti > 0 || a.mangiati > 0, cella = el('button', 'specie' + (visto ? '' : ' ignota') + (s.tipo === 'gigante' ? ' gigante' : '')), tela = el('canvas');
        cella.type = 'button'; cella.append(tela, el('span', '', visto ? def.nome : '???'));
        cella.addEventListener('click', () => { I.suono('tasto'); apri(def); });
        vasca.append(cella);
        I.modelloVivo(tela, def, { w: 110, h: 62, fermo: true, sagoma: !visto, minaccia: false, stadio: 1 });
        if (visto) viste++;
      }
      corpo.append(el('h3', '', amb.nome + ' · ' + viste + ' su ' + lista.length), vasca);
    }
    corpo.parentNode.scrollTop = su;
  }
  S.registra('acquario', {
    crea(r) {
      const t = I.testata('Acquario', { perle: false });
      conto = el('span', 'borsa', ''); t.append(conto); r.append(t);
      corpo = colonna(r);
      velo = el('div', 'scheda-velo'); scheda = el('div', 'scheda'); velo.append(scheda); r.append(velo);
      velo.addEventListener('click', e => { if (e.target === velo) chiudi(); });
    },
    mostra() { chiudi(); disegna(); },
    nascondi: chiudi,
  });
})();

// =====================================================================  traguardi
(() => {
  let corpo, tutti;
  function disegna() {
    const su = corpo.parentNode.scrollTop, da = P.daRiscuotere();
    corpo.textContent = '';
    tutti.hidden = da < 2;
    I.scrivi(tutti, 'Ritira tutti i premi (' + da + ')');
    if (da >= 2) corpo.append(tutti);
    let gruppo = '';
    // prima quelli da ritirare, poi gli altri nell'ordine del gioco
    for (const t of P.TRAGUARDI) {
      const st = P.traguardo(t.id), riga = el('div', 'traguardo' + (st.fatto ? ' fatto' : '') + (st.riscosso ? ' riscosso' : '')), testi = el('div'), misura = el('div', 'misura'), barra = el('i'), piena = el('b');
      if (t.gruppo !== gruppo) { gruppo = t.gruppo; corpo.append(el('h3', '', gruppo)); }
      piena.style.width = Math.min(100, st.valore / Math.max(1, t.obiettivo) * 100).toFixed(0) + '%';
      barra.append(piena); misura.append(barra, el('span', '', I.numero(st.valore) + ' su ' + I.numero(t.obiettivo)));
      testi.append(el('strong', '', t.nome), el('small', '', t.descrizione), misura);
      riga.append(testi);
      if (st.fatto && !st.riscosso) {
        const b = el('button', 'compra'); b.type = 'button'; b.append('Ritira ', el('i', 'perla'), el('span', '', String(t.premio)));
        b.addEventListener('click', () => { const q = P.riscuoti(t.id); if (q) { I.suono('acquisto'); I.avviso('+' + q + ' perle', { segno: '★', sotto: t.nome }); } disegna(); });
        riga.append(b);
      } else {
        const p = el('span', 'premio'); p.append(st.riscosso ? '✓ ' : '+' + t.premio + ' ', el('i', 'perla piccola'));
        if (st.riscosso) p.append(' ' + t.premio);
        riga.append(p);
      }
      corpo.append(riga);
    }
    corpo.parentNode.scrollTop = su;
    I.aggiornaGettoni();
  }
  S.registra('traguardi', {
    crea(r) {
      r.append(I.testata('Traguardi'));
      corpo = colonna(r);
      tutti = bottone('Ritira tutti i premi', 'medio oro', () => { const q = P.riscuotiTutti(); if (q) { I.suono('regalo'); I.avviso('+' + q + ' perle', { segno: '★', sotto: 'Premi dei traguardi' }); } disegna(); });
      tutti.style.margin = '4px 0 6px';
    },
    mostra: disegna,
  });
})();

// =====================================================================  impostazioni
(() => {
  const righe = [];
  let conferma, azzera;
  function interruttore(c, chiave, nome, sotto) {
    const riga = el('div', 'scelta'), testi = el('div'), b = el('button', 'interruttore');
    b.type = 'button'; b.setAttribute('role', 'switch'); b.setAttribute('aria-label', nome);
    testi.append(el('strong', '', nome), el('small', '', sotto)); riga.append(testi, b); c.append(riga);
    const leggi = () => { const on = P.impostazione(chiave) !== false; b.classList.toggle('acceso', on); b.setAttribute('aria-checked', String(on)); };
    b.addEventListener('click', () => { P.imposta(chiave, P.impostazione(chiave) === false); if (B.audio) B.audio.avvia(); I.suono('tasto'); leggi(); });
    righe.push(leggi);
  }
  function opzioni(c, chiave, nome, sotto, voci) {
    const riga = el('div', 'scelta pila'), testi = el('div'), fila = el('div', 'opzioni'), tasti = [];
    testi.append(el('strong', '', nome), el('small', '', sotto)); riga.append(testi, fila); c.append(riga);
    const leggi = () => tasti.forEach(([v, b]) => b.classList.toggle('scelto', P.impostazione(chiave) === v));
    for (const [valore, scritta] of voci) {
      const b = el('button', '', scritta); b.type = 'button';
      b.addEventListener('click', () => { P.imposta(chiave, valore); I.suono('tasto'); leggi(); });
      tasti.push([valore, b]); fila.append(b);
    }
    righe.push(leggi);
  }
  S.registra('impostazioni', {
    crea(r) {
      r.append(I.testata('Impostazioni', { perle: false }));
      const c = colonna(r);
      interruttore(c, 'suoni', 'Suoni', 'Morsi, bolle, avvisi.');
      interruttore(c, 'musica', 'Musica', 'Una melodia diversa per ogni mare.');
      interruttore(c, 'vibrazione', 'Vibrazione', 'Il telefono vibra quando ti colpiscono.');
      opzioni(c, 'qualita', 'Qualità grafica', 'Se il gioco va a scatti, scegli Media o Bassa.', [['auto', 'Automatica'], ['alta', 'Alta'], ['media', 'Media'], ['bassa', 'Bassa']]);
      opzioni(c, 'mano', 'Tasto Scatto', 'Da che parte dello schermo lo vuoi.', [['sinistra', 'A sinistra'], ['destra', 'A destra']]);
      c.append(el('h3', '', 'Progressi'));
      azzera = bottone('Azzera i progressi', 'medio pericolo', () => { azzera.hidden = true; conferma.hidden = false; });
      azzera.style.marginTop = '0';
      conferma = el('div', 'scelta pila'); conferma.hidden = true;
      const testi = el('div'), fila = el('div', 'coppia');
      testi.append(el('strong', '', 'Sei sicuro?'), el('small', '', 'Perdi livelli, stelle, perle, compagni, acquario e traguardi. Le impostazioni restano.'));
      const si = bottone('Sì, azzera tutto', 'medio pericolo', () => {
        P.azzera(); conferma.hidden = true; azzera.hidden = false;
        I.esci('casa'); I.avviso('Progressi azzerati: si ricomincia!', { segno: '✓' });
      });
      fila.append(si, bottone('No, li tengo', 'medio', () => { conferma.hidden = true; azzera.hidden = false; }));
      conferma.append(testi, fila); c.append(azzera, conferma);
    },
    mostra() { conferma.hidden = true; azzera.hidden = false; for (const leggi of righe) leggi(); },
  });
})();

// =====================================================================  aiuto
S.registra('aiuto', {
  crea(r) {
    r.append(I.testata('Come si gioca', { perle: false }));
    const c = colonna(r), lista = el('ul', 'elenco regole');
    const REGOLE = [
      ['verde', '12', 'Numero <strong>verde</strong>: è più piccolo di te. Mangialo e cresci.'],
      ['rosso', '99', 'Numero <strong>rosso</strong>: è più grosso di te. Se ti tocca perdi un cuore.'],
      ['grigio', '40', 'Numero <strong>grigio</strong>: non fa male, ma non lo puoi ancora mangiare. Con lo scudetto è corazzato, con il lucchetto è velenoso: devi essere molto più forte di lui.'],
      ['giallo', '×5', 'Le <strong>bolle</strong> regalano aiuti: tutto vale di più, calamita, scudo, perle, cuori.'],
      ['giallo', '⚡', 'Il tasto <strong>Scatto</strong> ti dà uno sprint, per scappare o per acchiappare.'],
      ['rosso', '!', 'Meduse, ricci, mine e gli altri <strong>pericoli</strong> fanno male sempre, anche se sei enorme.'],
      ['verde', '♛', 'Diventa il più grosso e mangia il <strong>capobranco</strong> con la corona: il livello è superato.'],
      ['rosso', '♛', 'Ogni quinto livello c\'è un <strong>gigante</strong> con milioni di vita: cresci finché puoi morderlo. Ogni morso gli toglie quanto vale il tuo numero; dopo, schiva i suoi attacchi e mordi ancora.'],
      ['giallo', '★', 'Tre <strong>stelle</strong>: supera il livello, non perdere cuori, fai in fretta.'],
    ];
    for (const [colore, segno, testo] of REGOLE) {
      const li = el('li'), b = el('b', colore, segno), s = el('span');
      s.innerHTML = testo; li.append(b, s); lista.append(li);
    }
    c.append(lista, el('p', 'piccolo', 'Trascina il dito in un punto qualsiasi dello schermo per nuotare. Con le perle compri potenziamenti e nuovi compagni nel negozio.'), bottone('Ho capito', 'grande', () => S.indietro()));
  },
});

// =====================================================================  pausa
S.registra('pausa', {
  crea(r) {
    const c = colonna(r, 'centro'), fila = el('div', 'coppia');
    fila.append(bottone('Ricomincia', 'medio', () => I.gioca()), bottone('Impostazioni', 'medio', () => S.mostra('impostazioni')));
    c.append(el('h2', 'titolo', 'In pausa'), el('p', '', 'Riprendi fiato, il mare ti aspetta.'), bottone('Riprendi', 'grande', () => I.riprendi()), fila,
      bottone('Come si gioca', 'medio', () => S.mostra('aiuto')), bottone('Torna all\'inizio', 'medio', () => I.esci('casa')));
  },
});

// =====================================================================  risultato
(() => {
  const CONSIGLI = ['Nel negozio i potenziamenti aiutano parecchio.', 'Resta vicino ai banchi di pesciolini finché non sei cresciuto.', 'Lo scatto serve anche per scappare: tienilo pronto.',
    'Le bolle con lo scudo ti salvano da un colpo.', 'Chi ti insegue si stanca presto: nuota via in linea retta.', 'Le conchiglie sul fondale nascondono perle.'];
  let col;
  function disegna(d) {
    col.textContent = '';
    if (!d) return;
    const sopravvivenza = d.modalita === 'sopravvivenza', fila = el('div', 'coppia');
    if (d.esito === 'vinto') {
      const cfg = L.config(d.livello), ob = cfg.obiettivo, stelle = el('div', 'stelle'), lista = el('ul', 'elenco');
      col.append(el('h2', 'titolo', ob.tipo === 'gigante' ? 'Hai sconfitto ' + ob.nome + '!' : 'Livello ' + d.livello + ' superato!'));
      for (let i = 0; i < 3; i++) { if (i < d.stelle) stelle.append(el('b', '', '★')); else stelle.append(el('i', '', '★')); }
      const voce = (fatto, testo) => { const li = el('li', fatto ? 'fatto' : 'mancato'); li.append(el('b', '', fatto ? '★' : '·'), el('span', '', testo)); lista.append(li); };
      voce(true, ob.tipo === 'gigante' ? 'Gigante sconfitto' : 'Capobranco mangiato');
      voce(!!d.senzaColpi, d.senzaColpi ? 'Senza perdere cuori' : 'Senza perdere cuori (ne hai persi ' + d.colpi + ')');
      voce(!!d.inTempo, 'Entro ' + I.minuti(d.tempoStella || cfg.tempoStella) + ' (tu: ' + I.minuti(d.tempo) + ')');
      const p = el('p'); p.append(perle(d.perle));
      col.append(stelle, lista);
      if (ob.tipo === 'gigante' && d.morsoMassimo > 0) {                    // lo scontro in una riga: il morso più forte
        const m = el('p', 'morso-forte');
        m.append('Il tuo morso più forte: ', el('b', '', '−' + I.numero(d.morsoMassimo)), el('small', '', d.morsi === 1 ? 'Sconfitto con un morso solo!' : 'Sconfitto con ' + d.morsi + ' morsi'));
        col.append(m);
      }
      col.append(p);
      if (d.livello < L.totale) col.append(bottone('Prossimo livello', 'grande', () => I.gioca({ livello: d.livello + 1, modalita: 'avventura' }), 'Livello ' + (d.livello + 1) + ' · ' + L.ambienteDi(d.livello + 1).nome));
      else col.append(el('p', '', 'Hai finito l\'avventura: sei il re degli oceani!'), bottone('Torna all\'inizio', 'grande', () => I.esci('casa')));
      fila.append(bottone('Rigioca', 'medio', () => I.gioca()), bottone('Negozio', 'medio', () => S.mostra('negozio')));
      col.append(fila);
      if (d.livello < L.totale) col.append(bottone('Torna all\'inizio', 'medio', () => I.esci('casa')));
      return;
    }
    if (sopravvivenza) {
      const rec = P.recordSopravvivenza(), nuovo = d.tempo >= rec.tempo - 0.01 && d.tempo > 5;
      col.append(el('h2', 'titolo', nuovo ? 'Nuovo record!' : 'Fine della corsa!'), el('p', '', 'Hai resistito'), el('div', 'numero', I.minuti(d.tempo)),
        el('p', 'piccolo', 'Potenza raggiunta: ' + I.numero(d.potenza) + (nuovo ? '' : ' · Il tuo record: ' + I.minuti(rec.tempo))));
    } else {
      col.append(el('h2', 'titolo', 'Ti hanno mangiato!'), el('p', '', 'Eri arrivato a'), el('div', 'numero', I.numero(d.potenza)));
      const ob = d.esito === 'perso' && d.danni > 0 ? L.config(d.livello).obiettivo : null;   // perso contro il gigante: quanto gli si è tolto
      if (ob && ob.tipo === 'gigante') col.append(el('p', 'piccolo', 'Hai tolto a ' + ob.nome + ' ' + I.numero(Math.min(d.danni, ob.vita)) + ' di vita su ' + I.numero(ob.vita) + '.'));
    }
    const p = el('p'); p.append(perle(d.perle));
    col.append(p, el('p', 'piccolo', CONSIGLI[Math.floor(Math.random() * CONSIGLI.length)]), bottone('Riprova', 'grande', () => I.gioca()));
    fila.append(bottone('Negozio', 'medio', () => S.mostra('negozio')), bottone('Inizio', 'medio', () => I.esci('casa')));
    col.append(fila);
  }
  S.registra('risultato', { crea(r) { col = colonna(r, 'centro'); }, mostra: disegna });
})();
})();
