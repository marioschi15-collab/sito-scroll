/* Boccone — i giganti (B.giganti): come si comportano il gigante dell'ultimo livello di ogni ambiente e il capobranco
   degli altri livelli, e i loro attacchi per nome.
   Il gigante è un abitante del mondo come gli altri (sta in M.predatori): qui c'è solo ciò che lo rende speciale.
   Il mondo (50-mondo.js) chiama prepara() alla nascita, pensa() a ogni fotogramma quando non è stordito né in carica,
   e morso() quando l'eroe, diventato più forte, lo tocca. Vedi ARCHITETTURA.md §8. */
(() => {
'use strict';
const B = window.B;
const { caso } = B.util;

// ---------------------------------------------------------------- taratura
const PAUSA_ATTACCHI = [4.5, 6.5];   // secondi fra un attacco e l'altro (come nella versione precedente)
const FURIA_PAUSA = 0.22;            // a ogni morso la pausa si accorcia di questa parte
const FURIA_VEL = 0.1;               // … e nuota più svelto di questa parte
const FURIA_POTENZA = 1.25;          // … e diventa più forte: l'eroe deve crescere ancora prima di morderlo di nuovo
const STORDITO_DOPO_MORSO = 1.6;
const INTOCCABILE_DOPO_MORSO = 2.4;  // secondi in cui non si può mordere di nuovo (e non fa male)
const SPINTA_MORSO = 520;            // quanto viene respinto
const ARRETRA = 0.6;                 // quando l'eroe è più forte indietreggia piano: si lascia raggiungere

// ---------------------------------------------------------------- attacchi
/* Un attacco è { portata, inizia(e, s, M), aggiorna?(e, s, m, dt, M) }.
     portata   distanza dall'eroe entro cui può partire
     inizia    lo fa cominciare (di solito mette l'avviso: e.stato diventa 'avviso' ed e.carica sale da 0 a 1)
     aggiorna  facoltativo, per gli attacchi che durano: decide la mossa m a ogni fotogramma e risponde true finché
               l'attacco non è finito. Senza aggiorna, l'attacco è tutto nell'avviso + scatto gestiti dal mondo.
   Gli attrezzi del mondo (suoni, scoppi, nuvole, carica…) sono in B.partita.attrezzi.
   Per ora c'è solo 'carica': gli altri nomi del cast ricadono su quella finché non vengono scritti qui. */
const ATTACCHI = {
  carica: {
    portata: 520,
    inizia(e) {
      const at = B.partita.attrezzi;
      at.preparaCarica(e, 0.75 * (1 - 0.12 * e.furia), 0.85, 2.7 + 0.15 * e.furia);
      at.suono('avviso');
    },
  },
};
/* Gli attacchi previsti dal cast e non ancora scritti: risucchio, inchiostro, tentacoli, onda, sparo, evoca, buio,
   morso, raffica, scia. */
const attacco = nome => ATTACCHI[nome] || ATTACCHI.carica;

function pausa(e) { return caso(PAUSA_ATTACCHI[0], PAUSA_ATTACCHI[1]) * Math.max(0.35, 1 - FURIA_PAUSA * e.furia); }

// ---------------------------------------------------------------- vita del gigante
/* Aggiunge all'abitante i campi del gigante (o del capobranco). ob è l'obiettivo della configurazione del livello. */
function prepara(e, ob) {
  e.morsi = ob.morsi; e.morsiTotali = ob.morsi; e.vita = 1; e.furia = 0;
  e.attacchi = ob.attacchi && ob.attacchi.length ? ob.attacchi : ['carica'];
  e.indiceAttacco = 0; e.attacco = null; e.prossimoAttacco = caso(3, 5);
  e.velCalmo = e.vel; e.intoccabile = 0; e.sconfitto = 0;
}

/* Decide la mossa m del gigante per questo fotogramma. s sono i sensi calcolati dal mondo (distanza dall'eroe, se è
   più forte, se gli interessa). Finché l'eroe è più debole lo insegue e, da vicino, lancia i suoi attacchi a turno. */
function pensa(e, s, m, dt, M) {
  if (e.attacco) {                                  // un attacco che dura si gestisce da solo
    if (e.attacco.aggiorna && e.attacco.aggiorna(e, s, m, dt, M)) return;
    e.attacco = null;
  }
  if (!s.vicino) return;                            // lontano: gira per conto suo
  if (!s.forte) {                                   // l'eroe è più forte: indietreggia
    m.verso = Math.atan2(-s.dy, -s.dx); m.vel = e.vel * ARRETRA; m.fugge = true;
    return;
  }
  if (s.ignora) return;                             // riposa, o l'eroe è ancora troppo piccolo per interessargli
  m.verso = Math.atan2(s.dy, s.dx); m.vel = e.vel; m.insegue = true;
  e.prossimoAttacco -= dt;
  if (e.prossimoAttacco > 0) return;
  const a = attacco(e.attacchi[e.indiceAttacco % e.attacchi.length]);
  if (s.d > a.portata) return;                      // aspetta di essere a tiro
  e.indiceAttacco++; e.prossimoAttacco = pausa(e);
  e.attacco = a.aggiorna ? a : null;
  a.inizia(e, s, M);
}

/* Un morso dell'eroe. Risponde quanti morsi mancano: a zero il gigante è sconfitto.
   Altrimenti resta stordito, viene respinto, perde una parte della vita e si infuria: più svelto, attacchi più
   frequenti e più forte di prima (così l'eroe deve crescere ancora un po' prima del morso successivo). */
function morso(e, M) {
  e.morsi = Math.max(0, e.morsi - 1);
  e.vita = e.morsi / e.morsiTotali;
  e.avviso = 0; e.sprint = 0; e.carica = 0; e.attacco = null;
  if (e.morsi === 0) { e.stato = 'sconfitto'; e.sconfitto = 1.3; e.stordito = 9; return 0; }
  e.furia++;
  e.p = Math.round(e.p * FURIA_POTENZA / 1000) * 1000; e.soglia = e.p;
  e.vel = e.velCalmo * (1 + FURIA_VEL * e.furia);
  e.stordito = STORDITO_DOPO_MORSO; e.intoccabile = INTOCCABILE_DOPO_MORSO; e.prossimoAttacco = 1;
  const h = M.eroe, a = h ? Math.atan2(e.y - h.y, e.x - h.x) : 0;
  e.kx = Math.cos(a) * SPINTA_MORSO; e.ky = Math.sin(a) * SPINTA_MORSO;
  return e.morsi;
}

B.giganti = { attacchi: ATTACCHI, attacco, prepara, pensa, morso };
})();
