/* Boccone — i giganti (B.giganti): come si comportano il gigante dell'ultimo livello di ogni ambiente e il capobranco
   degli altri livelli, e i loro attacchi per nome.
   Il gigante è un abitante del mondo come gli altri (sta in M.predatori): qui c'è solo ciò che lo rende speciale.
   Il mondo (50-mondo.js) chiama prepara() alla nascita, pensa() a ogni fotogramma quando non è stordito né in avviso né
   in carica, colpisce() quando finisce l'avviso, e morso() quando l'eroe, abbastanza cresciuto, lo morde.
   Lo scontro con il gigante: ha una vita in milioni (è il suo numero, e.p); ogni morso gliene toglie quanto vale il
   numero dell'eroe. Dopo un morso resta stordito, poi è "furente": finché non ha sferrato i suoi contrattacchi non si
   può mordere di nuovo, e toccarlo fa male. Vedi ARCHITETTURA.md §5 e §8. */
(() => {
'use strict';
const B = window.B;
const { caso } = B.util;

// ---------------------------------------------------------------- taratura
const PAUSA_ATTACCHI = [4, 6];       // secondi fra un attacco e l'altro dei giganti
const CARICA_GIGANTE = 2.9, CARICA_CAPO = 2.7;   // quante volte la sua velocità, durante lo scatto della carica
// La furia va da 0 a 2 secondo la vita che gli resta: 0 sopra i due terzi, 1 fra un terzo e due terzi, 2 sotto un terzo.
const FURIA_PAUSA = 0.22;            // a ogni grado di furia la pausa si accorcia di questa parte
const FURIA_VEL = 0.1;               // … e nuota più svelto di questa parte
const FURIA_AVVISO = 0.12;           // … e gli avvisi si accorciano di questa parte
const NON_TI_DEGNA = 40;             // si accorge dell'eroe solo quando la potenza di lui × 40 arriva alla soglia del morso
const STORDITO_DOPO_MORSO = 1.6;
const INTOCCABILE_DOPO_MORSO = 2.4;  // secondi in cui non si può mordere di nuovo (e toccarlo non fa male)
const CONTRATTACCHI = [2, 2, 2];      // attacchi che sferra dopo un morso prima che lo si possa mordere di nuovo, per grado di furia
const RITIRATA = [2.6, 2, 1.4];      // dopo lo stordimento arretra per questi secondi (accusa il colpo), poi torna alla carica
const RITIRATA_VEL = 1.25;           // … a questa parte della sua velocità
const RINCORSA = 1.7;                // furente e fuori tiro, rincorre l'eroe a questa parte della sua velocità
const CONTRATTACCO = [1, 0.7, 0.45]; // secondi fra la fine della ritirata e il primo contrattacco, per grado di furia
const SEGUITO = [1.4, 1.1, 0.8];     // secondi fra un contrattacco e il successivo
const SPINTA_MORSO = 520;            // quanto viene respinto
const ARRETRA = 0.6;                 // quando il numero dell'eroe supera la vita che gli resta indietreggia piano: si lascia raggiungere

const RISUCCHIO = { raggio: 640, forza: 0.74, durata: 2.6 };          // forza: parte della velocità dell'eroe
const ONDA = { vel: 560, tentacoli: { rMax: 440, rMale: 300 }, onda: { rMax: 600, rMale: 330 } };
const SPARO = { vel: 225, r: 22, vita: 4.5, ventaglio: 0.3 };
const RAFFICA = { vel: 250, r: 18, vita: 3.6, ogni: 0.24, colpi: 5 };
const BUIO = { durata: 6, vel: 1.15 };

// ---------------------------------------------------------------- attacchi
/* Un attacco è { portata, inizia(e, s, M), colpisce?(e, M), aggiorna?(e, s, m, dt, M) }.
     portata   distanza dall'eroe (da centro a centro) entro cui può partire
     inizia    lo fa cominciare: mette l'avviso (e.stato diventa 'avviso' ed e.carica sale da 0 a 1; durante l'avviso
               il gigante sta fermo e prende la mira, ci pensa il mondo)
     colpisce  che cosa succede quando l'avviso finisce. Se manca, il gigante parte in carica (scatto in linea retta).
     aggiorna  facoltativo, per gli attacchi che durano dopo il colpo: decide la mossa m a ogni fotogramma e risponde
               true finché l'attacco non è finito. e.attT sono i secondi passati dal colpo, e.attN un contatore libero.
   Gli attrezzi del mondo (suoni, onde, proiettili, nuvole, risucchio, buio, branco…) sono in B.partita.attrezzi.
   Per aggiungere un attacco: una voce qui (o in B.giganti.attacchi) e il nome nel campo "attacchi" del cast. */
const at = () => B.partita.attrezzi;
const avviso = (e, secondi) => { at().preparaAvviso(e, secondi * Math.max(0.5, 1 - FURIA_AVVISO * e.furia)); at().suono('avviso'); };
const carica = (e, secondi, scatto, molt) => { at().preparaCarica(e, secondi * Math.max(0.5, 1 - FURIA_AVVISO * e.furia), scatto, molt + 0.15 * e.furia); at().suono('avviso'); };
const boccaX = e => e.x + Math.cos(e.ang) * e.r * 0.8, boccaY = e => e.y + Math.sin(e.ang) * e.r * 0.8;

function spara(e, ang, c, tipo) { at().proiettile(boccaX(e), boccaY(e), ang, c.vel, c.r, c.vita, e, tipo); }
function scuoti(e, c) { at().onda(e.x, e.y, e.r * 0.8, c.rMax + 30 * e.furia, ONDA.vel, c.rMale + 15 * e.furia, e, 'onda'); at().suono('scoppio'); at().vibra(40); }

const ATTACCHI = {
  /* Prende la mira e parte dritto come una freccia. */
  carica: { portata: 520, inizia(e) { carica(e, 0.75, 0.85, e.gigante ? CARICA_GIGANTE : CARICA_CAPO); } },

  /* Uno scatto corto e fulmineo, da vicino. */
  morso: { portata: 360, inizia(e) { carica(e, 0.5, 0.5, 3.3); } },

  /* Una carica lunga che lascia dietro una scia torbida. */
  scia: { portata: 600, inizia(e) { carica(e, 0.8, 1.05, 2.6); e.scia = true; e.sciaT = 0; } },

  /* Spalanca la bocca e aspira: l'eroe e i pesciolini vengono tirati verso di lui per qualche secondo. */
  risucchio: {
    portata: 600,
    inizia(e) { avviso(e, 0.7); },
    colpisce(e) { e.attDurata = RISUCCHIO.durata + 0.3 * e.furia; at().suono('carica'); },
    aggiorna(e, s, m) {
      if (e.attT >= e.attDurata) return false;
      m.vel = 0; m.verso = Math.atan2(s.dy, s.dx); m.gira = 1.4; m.insegue = true; m.bocca = 1;
      at().tira(boccaX(e), boccaY(e), RISUCCHIO.raggio, Math.min(0.9, RISUCCHIO.forza + 0.05 * e.furia));
      return true;
    },
  },

  /* Grandi nuvole di inchiostro addosso all'eroe e lungo la strada: poi attacca di nuovo, presto. */
  inchiostro: {
    portata: 620,
    inizia(e) { avviso(e, 0.6); },
    colpisce(e, M) {
      const h = M.eroe, quante = 3 + Math.min(2, e.furia);
      for (let i = 0; i < quante; i++) {
        const k = i / (quante - 1), r = caso(210, 290);
        at().nuvola(e.x + (h.x + h.vx * 0.5 - e.x) * (1.15 - k * 0.75) + caso(-90, 90), e.y + (h.y + h.vy * 0.5 - e.y) * (1.15 - k * 0.75) + caso(-90, 90), r, caso(5.5, 7), 'inchiostro');
      }
      at().suono('inchiostro');
      e.prossimoAttacco = Math.min(e.prossimoAttacco, 1.8);
    },
  },

  /* Frusta l'acqua tutt'attorno: un'onda d'urto corta che respinge, e da vicino fa male. */
  tentacoli: { portata: 420, inizia(e) { avviso(e, 0.7); }, colpisce(e) { scuoti(e, ONDA.tentacoli); } },

  /* Un'onda d'urto larga; da infuriato ne arriva subito una seconda. */
  onda: {
    portata: 540,
    inizia(e) { avviso(e, 0.85); },
    colpisce(e) { scuoti(e, ONDA.onda); e.attN = e.furia > 0 ? 1 : 0; },
    aggiorna(e, s, m) {
      if (e.attN <= 0) return false;
      m.vel = 0; m.insegue = true;
      if (e.attT >= 0.6) { e.attN = 0; scuoti(e, ONDA.onda); }
      return true;
    },
  },

  /* Un ventaglio di proiettili lenti. */
  sparo: {
    portata: 780,
    inizia(e) { avviso(e, 0.6); },
    colpisce(e, M) {
      const h = M.eroe, verso = Math.atan2(h.y - e.y, h.x - e.x), quanti = 3 + Math.min(2, e.furia);
      for (let i = 0; i < quanti; i++) spara(e, verso + (i - (quanti - 1) / 2) * SPARO.ventaglio, SPARO, 'sparo');
      at().suono('scatto');
    },
  },

  /* Una fila di proiettili, uno dopo l'altro, ognuno puntato dove sta l'eroe in quel momento. */
  raffica: {
    portata: 820,
    inizia(e) { avviso(e, 0.6); },
    colpisce(e) { e.attN = RAFFICA.colpi + e.furia; e.attDurata = 0; },
    aggiorna(e, s, m) {
      if (e.attN <= 0) return false;
      m.vel = e.vel * 0.35; m.verso = Math.atan2(s.dy, s.dx); m.insegue = true; m.bocca = 0.9;
      if (e.attT >= e.attDurata) {
        e.attDurata += RAFFICA.ogni; e.attN--;
        spara(e, Math.atan2(s.dy, s.dx) + caso(-0.07, 0.07), RAFFICA, 'raffica');
        at().suono('scatto');
      }
      return true;
    },
  },

  /* Chiama un branco in aiuto. */
  evoca: {
    portata: 720,
    inizia(e) { avviso(e, 0.7); },
    colpisce(e) {
      if (at().evoca(e, 3 + Math.min(1, e.furia)) > 0) { at().testo(e.x, e.y - e.r, 'Arriva il branco!', '#ffe066', true); at().suono('avviso'); }
      else e.prossimoAttacco = Math.min(e.prossimoAttacco, 1.5);         // il branco c'è già: passa all'attacco dopo
    },
  },

  /* Spegne la luce: per qualche secondo si vede pochissimo (M.buio sale), e lui ne approfitta per avvicinarsi. */
  buio: {
    portata: 820,
    inizia(e) { avviso(e, 0.6); },
    colpisce(e) { e.attDurata = BUIO.durata + e.furia; at().oscura(e.attDurata); at().suono('inchiostro'); },
    aggiorna(e, s, m) {
      if (e.attT >= e.attDurata || !s.forte) return false;
      m.verso = Math.atan2(s.dy, s.dx); m.vel = e.vel * BUIO.vel; m.insegue = true;
      return true;
    },
  },
};
/* Un nome che non c'è (ancora) ricade sulla carica. */
const attacco = nome => ATTACCHI[nome] || ATTACCHI.carica;

function pausa(e) { return caso(e.pausa[0], e.pausa[1]) * Math.max(0.35, 1 - FURIA_PAUSA * e.furia); }
function smette(e) { e.attacco = null; e.inAttacco = null; e.attaccoNome = ''; e.scia = false; }

// ---------------------------------------------------------------- vita del gigante
/* Aggiunge all'abitante i campi del gigante (o del capobranco). ob è l'obiettivo della configurazione del livello. */
function prepara(e, ob) {
  e.morsi = 0; e.vita = 1; e.furia = 0; e.furente = 0; e.ritirata = 0; e.inCorso = false; e.mordibile = false;
  e.vitaTotale = e.gigante ? ob.vita || e.p : 0;                  // il capobranco non ha vita: si mangia in un boccone
  e.sogliaMorso = e.gigante ? ob.sogliaMorso || e.p : e.p; e.nutre = ob.nutre || 0;
  e.attacchi = ob.attacchi && ob.attacchi.length ? ob.attacchi : ['carica'];
  e.pausa = ob.pausa || PAUSA_ATTACCHI; e.degna = ob.degna || (e.gigante ? 12 : NON_TI_DEGNA);
  e.indiceAttacco = 0; e.prossimoAttacco = caso(3, 5);
  e.velCalmo = e.vel; e.intoccabile = 0; e.sconfitto = 0; e.attT = 0; e.attN = 0; e.attDurata = 0;
  smette(e);
}

/* Decide la mossa m del gigante per questo fotogramma. s sono i sensi calcolati dal mondo (distanza dall'eroe, se è
   più forte, se gli interessa). Finché il suo numero è più alto di quello dell'eroe lo insegue e, quando è a tiro, lancia
   i suoi attacchi a turno. Il mondo non chiama pensa() durante l'avviso e la carica: la prima chiamata dopo un attacco
   (o dopo l'ultima mossa di un attacco che dura) vuol dire che l'attacco è finito, e che la rabbia del morso è sfogata. */
function pensa(e, s, m, dt, M) {
  if (e.attacco) {                                  // un attacco che dura si gestisce da solo
    e.attT += dt;
    if (s.inGioco && e.attacco.aggiorna(e, s, m, dt, M)) return;
    smette(e);
  }
  if (e.inCorso) {                                  // un attacco è appena finito: un contrattacco in meno da sferrare
    e.inCorso = false;
    if (e.furente > 0 && --e.furente > 0) e.prossimoAttacco = Math.min(e.prossimoAttacco, SEGUITO[e.furia]);
  }
  if (e.ritirata > 0) {                             // ha appena preso un morso: si allontana per riprendersi
    e.ritirata -= dt;
    if (s.inGioco && s.forte) { m.verso = Math.atan2(-s.dy, -s.dx); m.vel = e.vel * RITIRATA_VEL; m.fugge = true; return; }
    e.ritirata = 0;
  }
  const furente = e.furente > 0 && s.inGioco;       // deve ancora sfogarsi: cerca l'eroe dovunque sia
  if (!s.vicino && !furente) return;                // lontano: gira per conto suo
  if (!s.forte) {                                   // il numero dell'eroe è più alto: indietreggia
    m.verso = Math.atan2(-s.dy, -s.dx); m.vel = e.vel * ARRETRA; m.fugge = true;
    return;
  }
  if (s.ignora) return;                             // riposa, o l'eroe è ancora troppo piccolo per interessargli
  m.verso = Math.atan2(s.dy, s.dx); m.vel = e.vel; m.insegue = true;
  e.prossimoAttacco -= dt;
  const nome = e.attacchi[e.indiceAttacco % e.attacchi.length], a = attacco(nome);
  if (s.d > a.portata + e.r * 0.5) {                // aspetta di essere a tiro (furente, ci arriva di corsa)
    if (furente) m.vel = e.vel * RINCORSA;
    return;
  }
  if (e.prossimoAttacco > 0) return;
  e.indiceAttacco++; e.prossimoAttacco = pausa(e);
  e.inAttacco = a; e.attaccoNome = ATTACCHI[nome] ? nome : 'carica'; e.inCorso = true;
  a.inizia(e, s, M);
}

/* Finito l'avviso: se l'attacco in corso ha un colpo suo lo fa e risponde true; altrimenti false (il mondo fa partire
   la carica). */
function colpisce(e, M) {
  const a = e.inAttacco;
  if (!a || !a.colpisce) { e.inAttacco = null; return false; }
  e.attT = 0; e.attN = 0;
  a.colpisce(e, M);
  e.attacco = a.aggiorna ? a : null;
  if (!e.attacco) { e.inAttacco = null; e.attaccoNome = ''; }
  return true;
}

/* Il grado di furia per la vita che resta (0..1). */
function furiaDi(vita) { return vita > 2 / 3 ? 0 : vita > 1 / 3 ? 1 : 2; }

/* Un morso dell'eroe che toglie "danno" alla vita del gigante. Risponde la vita che resta: a zero il gigante è sconfitto.
   Altrimenti resta stordito, viene respinto, e torna furente (e.furente = quanti contrattacchi deve ancora sferrare):
   finché non li ha fatti non si può mordere di nuovo. Più la vita scende, più si infuria: più svelto, attacchi più
   frequenti, avvisi più corti. */
function morso(e, M, danno) {
  e.morsi++;
  e.p = Math.max(0, e.p - Math.max(0, Math.round(danno) || 0)); e.soglia = e.p;
  e.vita = e.vitaTotale > 0 ? e.p / e.vitaTotale : 0;
  e.avviso = 0; e.sprint = 0; e.carica = 0; e.inCorso = false; e.mordibile = false; smette(e);
  if (e.p <= 0) { e.furente = 0; e.ritirata = 0; e.stato = 'sconfitto'; e.sconfitto = 1.3; e.stordito = 9; return 0; }
  e.furia = furiaDi(e.vita);
  e.vel = e.velCalmo * (1 + FURIA_VEL * e.furia);
  e.stato = 'stordito'; e.stordito = STORDITO_DOPO_MORSO; e.intoccabile = INTOCCABILE_DOPO_MORSO; e.furente = CONTRATTACCHI[e.furia];
  e.ritirata = RITIRATA[e.furia]; e.prossimoAttacco = CONTRATTACCO[e.furia];
  const h = M.eroe, a = h ? Math.atan2(e.y - h.y, e.x - h.x) : 0;
  e.kx = Math.cos(a) * SPINTA_MORSO; e.ky = Math.sin(a) * SPINTA_MORSO;
  return e.p;
}

B.giganti = { attacchi: ATTACCHI, attacco, prepara, pensa, colpisce, morso, furiaDi };
})();
