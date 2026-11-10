/* Boccone — avvio: il ciclo principale, i collegamenti fra i moduli (eventi → suoni, annunci, vibrazione, schermate),
   la pausa quando la pagina va in secondo piano e gli agganci per le prove (B.prova). */
(() => {
'use strict';
const B = window.B, I = B.interfaccia, P = B.progressi, L = B.livelli;
let errori = 0, fotogrammi = 0, timerFine = 0, cruscotto = false;
function segnala(dove, e) { errori++; if (errori <= 5) console.error('[Boccone] ' + dove, e); }

// ---------------------------------------------------------------- agganci di prova
/* B.prova.pilota(M) → { x, y } sostituisce i comandi (lo legge il mondo); B.prova.effetti si somma agli effetti dei
   potenziamenti; passo(dt) fa avanzare il mondo senza aspettare lo schermo; stato() riassume la situazione. */
const prova = B.prova = Object.assign({ pilota: null, effetti: null }, B.prova || {});
prova.passo = dt => B.partita.aggiorna(dt);
prova.stato = () => {
  const M = B.partita.mondo, h = M && M.eroe;
  return { stato: B.partita.stato, schermata: B.schermate.corrente(), livello: M ? M.livello : 0, modalita: M ? M.modalita : '', ambiente: M ? M.ambiente.id : '',
    potenza: h ? h.p : 0, cuori: M ? M.cuori : 0, perle: P.perle(), perlePartita: M ? M.perle : 0, tempo: M ? M.tempo : 0, fascia: M ? M.fascia : 0,
    qualita: B.vista.qualita, dpr: B.vista.dpr, figurine: B.figurine.stato(), fotogrammi, errori, musica: B.audio.brano };
};

// ---------------------------------------------------------------- collegamenti
function mostraCruscotto(si) { cruscotto = si; I.cruscotto.mostra(si); }

B.eventi.su('annuncio', d => I.annuncio(d.titolo, d.sotto, d.durata));
B.eventi.su('vibra', d => {
  if (P.impostazione('vibrazione') === false) return;
  try { if (navigator.vibrate) navigator.vibrate(d.ms); } catch (e) {}
});
B.eventi.su('partita:inizio', d => {
  clearTimeout(timerFine);
  I.ultima.livello = d.livello || 1; I.ultima.modalita = d.modalita;
  if (B.schermate.corrente()) B.schermate.chiudi();
  mostraCruscotto(true); I.avviaConsigli();
  B.audio.musica(d.ambiente);
});
B.eventi.su('partita:fine', d => {
  clearTimeout(timerFine);
  if (d.esito === 'abbandonato') { B.audio.musica('menu'); return; }
  // un attimo per vedere la festa (o la fine), poi il risultato
  timerFine = setTimeout(() => {
    if (B.partita.stato !== 'vinto' && B.partita.stato !== 'perso') return;
    mostraCruscotto(false); I.consiglio('');
    B.schermate.mostra('risultato', d);
    B.audio.musica('menu');
    if (d.esito === 'vinto') for (let i = 0; i < d.stelle; i++) setTimeout(() => B.audio.effetto('stella'), 150 + i * 250);
  }, d.esito === 'vinto' ? 1700 : 1300);
});
B.eventi.su('schermata', d => { if (d.id === 'casa') { mostraCruscotto(false); B.audio.musica('menu'); } });
B.eventi.su('traguardo', d => {
  I.avviso('Traguardo: ' + d.nome, { segno: '★', sotto: 'Premio di ' + d.premio + ' perle da ritirare', durata: 3.4 });
  B.audio.effetto('traguardo');
});
B.eventi.su('scoperta', d => {
  if (d.tipo !== 'pesce' && d.tipo !== 'gigante') return;
  I.avviso('Nuova specie: ' + d.nome, { classe: 'scoperta', segno: '+', sotto: 'La ritrovi nell\'acquario', durata: 2.4, leggero: true });
});
B.eventi.su('perle', () => I.aggiornaGettoni());
B.eventi.su('progressi', () => { if (B.partita.stato !== 'gioco') B.schermate.aggiorna(); });
B.eventi.su('impostazioni', d => { if (d && d.chiave === 'mano') I.cruscotto.mano(); });
B.eventi.su('comando', d => {
  if (!d || d.tipo !== 'pausa') return;
  if (B.partita.stato === 'gioco') I.pausa();
  else if (B.partita.stato === 'pausa' && B.schermate.corrente() === 'pausa') I.riprendi();
});

// La pagina va in secondo piano (telefonata, cambio di app): pausa.
document.addEventListener('visibilitychange', () => { if (document.hidden) I.pausa(); });
window.addEventListener('pagehide', () => I.pausa());
// I telefoni fanno suonare qualcosa solo dopo il primo tocco.
document.addEventListener('pointerdown', () => B.audio.avvia(), { passive: true });
document.addEventListener('keydown', () => B.audio.avvia());

// ---------------------------------------------------------------- ciclo
let prima = 0;
function ciclo(ora) {
  const dt = prima ? Math.min(0.05, Math.max(0, (ora - prima) / 1000)) : 1 / 60;
  prima = ora; fotogrammi++;
  try {
    if (B.partita.stato !== 'pausa') B.partita.aggiorna(dt);
    B.disegno.fotogramma();
    if (cruscotto) I.cruscotto.aggiorna();
    I.anima(dt);
  } catch (e) { segnala('errore nel ciclo', e); }
  requestAnimationFrame(ciclo);
}

// ---------------------------------------------------------------- si parte
try { B.partita.sfondoMenu(L.ambienteDi(P.livelloMax()).id); } catch (e) { segnala('lo sfondo del menu non si è creato', e); }
B.schermate.mostra('casa');
B.audio.musica('menu');
requestAnimationFrame(ciclo);
window.__pronto = true;
})();
