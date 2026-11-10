/* Boccone — suoni e musica (B.audio), tutto sintetizzato con WebAudio: nessun file.
   B.audio.avvia()                 da chiamare al primo tocco (i telefoni non fanno suonare nulla prima)
   B.audio.effetto(nome, opzioni)  gnam, gnamGrosso, bolla, perla, cuore, scudo, colpo, sconfitta, vittoria, frenesia, cresciuto,
                                   scatto, conchiglia, avviso, carica, morso, inchiostro, scossa, scoppio; per le schermate:
                                   tasto, acquisto, errore, traguardo, regalo, stella
   B.audio.musica(id)              id di un ambiente, 'menu' oppure null (silenzio): ogni ambiente ha la sua scala e il suo passo
   Rispetta le impostazioni "suoni" e "musica". */
(() => {
'use strict';
const B = window.B;
const { limita, intero, scegli } = B.util;

let ac = null, uscitaEffetti = null, uscitaMusica = null, fruscio = null, timer = null;
const acceso = chiave => !B.progressi || !B.progressi.impostazione || B.progressi.impostazione(chiave) !== false;
const pronto = () => !!ac && ac.state === 'running';

function avvia() {
  if (ac) { if (ac.state === 'suspended' && !document.hidden) ac.resume().catch(() => {}); return; }
  try {
    const Classe = window.AudioContext || window.webkitAudioContext;
    if (!Classe) return;
    ac = new Classe();
    uscitaEffetti = ac.createGain(); uscitaEffetti.gain.value = 1; uscitaEffetti.connect(ac.destination);
    uscitaMusica = ac.createGain(); uscitaMusica.gain.value = 1; uscitaMusica.connect(ac.destination);
    if (!timer) timer = setInterval(suonaMusica, 110);
  } catch (e) { ac = null; }
}

/* Una nota che scivola da f1 a f2. */
function tono(f1, f2, durata, tipo, volume, ritardo, uscita) {
  if (!pronto()) return;
  try {
    const osc = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + (ritardo || 0);
    osc.type = tipo || 'sine'; osc.frequency.setValueAtTime(f1, t); osc.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + durata);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(volume || .07, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + durata);
    osc.connect(g); g.connect(uscita || uscitaEffetti); osc.start(t); osc.stop(t + durata + .03);
  } catch (e) {}
}
/* Uno sbuffo di rumore filtrato (scoppi, inchiostro, morsi). */
function sbuffo(durata, volume, f1, f2, ritardo) {
  if (!pronto()) return;
  try {
    if (!fruscio) {
      fruscio = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = fruscio.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime + (ritardo || 0);
    s.buffer = fruscio; s.loop = true;
    f.type = 'lowpass'; f.frequency.setValueAtTime(f1, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f2), t + durata);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(volume, t + .015); g.gain.exponentialRampToValueAtTime(.0001, t + durata);
    s.connect(f); f.connect(g); g.connect(uscitaEffetti); s.start(t); s.stop(t + durata + .05);
  } catch (e) {}
}

let ultimoGnam = 0, notaGnam = 0;
const EFFETTI = {
  gnam() {
    const ora = performance.now();
    if (ora - ultimoGnam < 50) return;
    notaGnam = ora - ultimoGnam < 400 ? Math.min(notaGnam + 1, 14) : 0; ultimoGnam = ora;
    tono(520 * Math.pow(1.06, notaGnam), 880 * Math.pow(1.06, notaGnam), .06, 'sine', .04);
  },
  gnamGrosso() { tono(170, 540, .17, 'triangle', .13); tono(95, 55, .22, 'sine', .11); },
  bolla() { tono(660, 1320, .22, 'triangle', .09); },
  perla() { tono(880, 1760, .22, 'sine', .07); tono(1320, 2640, .2, 'sine', .04, .08); },
  cuore() { tono(523, 784, .18, 'triangle', .09); tono(784, 1046, .26, 'triangle', .09, .12); },
  scudo() { tono(700, 200, .25, 'square', .06); },
  colpo() { tono(320, 60, .4, 'sawtooth', .09); sbuffo(.2, .08, 900, 200); },
  sconfitta() { tono(392, 330, .26, 'triangle', .1); tono(330, 262, .26, 'triangle', .1, .22); tono(262, 110, .7, 'triangle', .1, .44); },
  vittoria() { tono(392, 784, .18, 'triangle', .1); tono(523, 1046, .22, 'triangle', .1, .16); tono(659, 1318, .4, 'triangle', .1, .34); tono(784, 1568, .6, 'sine', .07, .56); },
  frenesia() { tono(440, 1760, .4, 'triangle', .1); },
  cresciuto() { tono(523, 1046, .25, 'triangle', .09); tono(784, 1568, .22, 'triangle', .06, .14); },
  scatto() { tono(300, 900, .2, 'sawtooth', .04); },
  conchiglia() { tono(880, 1760, .25, 'sine', .07); tono(1175, 2350, .22, 'sine', .05, .1); },
  avviso() { tono(90, 180, .6, 'square', .05); },
  carica() { tono(140, 60, .5, 'sawtooth', .07); },
  morso() { tono(240, 70, .25, 'sawtooth', .1); sbuffo(.16, .1, 2400, 500); },
  inchiostro() { sbuffo(.55, .12, 500, 120); tono(180, 60, .5, 'sine', .07); },
  scossa() { for (let i = 0; i < 3; i++) tono(1300 - i * 150, 320, .07, 'square', .045, i * .07); },
  scoppio() { sbuffo(.65, .22, 1400, 90); tono(120, 35, .5, 'sine', .14); },
  // schermate
  tasto() { tono(520, 700, .06, 'sine', .035); },
  acquisto() { tono(660, 1320, .2, 'triangle', .09); },
  errore() { tono(200, 150, .15, 'square', .04); },
  traguardo() { tono(784, 1568, .16, 'triangle', .08); tono(1046, 2093, .3, 'triangle', .08, .13); },
  regalo() { tono(523, 1046, .14, 'triangle', .08); tono(659, 1318, .14, 'triangle', .08, .11); tono(784, 1568, .3, 'triangle', .08, .22); },
  stella() { tono(988, 1976, .2, 'sine', .07); },
};
const ultimi = Object.create(null);

function effetto(nome) {
  if (!pronto() || !acceso('suoni')) return;
  const fn = EFFETTI[nome];
  if (!fn) return;
  const ora = performance.now();
  if (nome !== 'gnam' && ora - (ultimi[nome] || 0) < 45) return;      // lo stesso suono non si accavalla
  ultimi[nome] = ora;
  fn();
}

// ---------------------------------------------------------------- musica
/* scala: le note della melodia; passo: secondi fra una nota e l'altra; ritmo: su 8 passi, quali suonano;
   bassi: le note lunghe d'accompagnamento (una ogni "giro" passi); onda e ottava della melodia. */
const MUSICHE = {
  menu:        { scala: [196, 246.9, 293.7, 329.6, 392, 493.9], passo: .42, ritmo: [1, 0, 1, 0, 1, 0, 0, 0], bassi: [98, 123.5, 147], giro: 8, onda: 'sine', ottava: 2, volume: .013 },
  laguna:      { scala: [196, 220, 261.6, 293.7, 329.6, 392, 440, 523.3], passo: .3, ritmo: [1, 0, 1, 0, 1, 0, 1, 0], bassi: [98, 110, 130.8], giro: 8, onda: 'sine', ottava: 2, volume: .016 },
  alghe:       { scala: [146.8, 174.6, 196, 220, 261.6, 293.7, 349.2, 392], passo: .34, ritmo: [1, 0, 0, 1, 0, 1, 0, 0], bassi: [73.4, 98, 87.3], giro: 8, onda: 'triangle', ottava: 2, volume: .014 },
  relitto:     { scala: [220, 246.9, 261.6, 293.7, 329.6, 349.2, 392, 440], passo: .36, ritmo: [1, 0, 0, 0, 1, 0, 1, 0], bassi: [110, 82.4, 98], giro: 8, onda: 'triangle', ottava: 1, volume: .02 },
  mare_aperto: { scala: [196, 220, 246.9, 293.7, 329.6, 392, 440, 493.9], passo: .26, ritmo: [1, 1, 0, 1, 0, 1, 1, 0], bassi: [98, 146.8, 123.5], giro: 8, onda: 'sine', ottava: 2, volume: .015 },
  ghiacci:     { scala: [261.6, 293.7, 329.6, 370, 415.3, 466.2, 523.3, 587.3], passo: .4, ritmo: [1, 0, 0, 1, 0, 0, 1, 0], bassi: [130.8, 164.8], giro: 12, onda: 'sine', ottava: 4, volume: .01 },
  rovine:      { scala: [164.8, 174.6, 207.7, 220, 246.9, 261.6, 293.7, 329.6], passo: .32, ritmo: [1, 0, 1, 1, 0, 0, 1, 0], bassi: [82.4, 110, 87.3], giro: 8, onda: 'triangle', ottava: 2, volume: .014 },
  vulcano:     { scala: [110, 130.8, 146.8, 155.6, 164.8, 196, 220, 261.6], passo: .24, ritmo: [1, 0, 1, 0, 0, 1, 0, 1], bassi: [55, 65.4, 73.4], giro: 8, onda: 'triangle', ottava: 2, volume: .017 },
  abisso:      { scala: [98, 116.5, 130.8, 146.8, 174.6, 196, 233.1, 261.6], passo: .5, ritmo: [1, 0, 0, 0, 1, 0, 0, 0], bassi: [49, 58.3], giro: 8, onda: 'sine', ottava: 2, volume: .02 },
};
const brano = { id: null, def: null, prossima: 0, passo: 0, nota: 3 };

function musica(id) {
  const def = id ? MUSICHE[id] || MUSICHE.laguna : null;
  if (brano.def === def) return;
  brano.id = id || null; brano.def = def; brano.passo = 0; brano.nota = 3; brano.prossima = 0;
}
function suonaMusica() {
  const d = brano.def;
  if (!d || !pronto() || !acceso('musica') || document.hidden) return;
  const stato = B.partita ? B.partita.stato : 'ferma';
  if (stato === 'pausa') return;
  const ora = ac.currentTime, veloce = stato === 'gioco' && B.partita.dati.frenesiaT > 0;
  if (brano.prossima < ora) brano.prossima = ora + .05;
  while (brano.prossima < ora + .25) {
    const rit = brano.prossima - ora, p = brano.passo;
    if (d.ritmo[p % d.ritmo.length] || veloce) {
      brano.nota = limita(brano.nota + intero(-2, 2), 0, d.scala.length - 1);
      const f = d.scala[brano.nota] * d.ottava;
      tono(f, f, d.passo * 1.7, d.onda, d.volume, rit, uscitaMusica);
    }
    if (p % d.giro === 0) tono(scegli(d.bassi), d.bassi[0] * .98, d.passo * 6, 'triangle', d.volume * 1.8, rit, uscitaMusica);
    brano.passo++; brano.prossima += veloce ? d.passo * .66 : d.passo;
  }
}

document.addEventListener('visibilitychange', () => {
  if (!ac) return;
  try { const esito = document.hidden ? ac.suspend() : ac.resume(); if (esito && esito.catch) esito.catch(() => {}); } catch (e) {}
});

B.audio = { avvia, effetto, musica, get attivo() { return pronto(); }, get brano() { return brano.id; } };
})();
