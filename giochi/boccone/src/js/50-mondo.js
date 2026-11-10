/* Boccone — il mondo (B.partita): tutta la logica di gioco. Qui non si disegna nulla e non si tocca la pagina.
   Lo stato della partita è B.partita.mondo (qui "M"); la vista lo legge a ogni fotogramma e lo disegna.
   I livelli arrivano da B.livelli (51-livelli.js), giganti e capobranco da B.giganti (52-giganti.js).
   Campi di M, B.partita.dati, eventi e modi per estendere il gioco: ARCHITETTURA.md §8.

   Indice del file:
     1. taratura e stato del modulo          5. nascite (eroe, pesci, banchi, pericoli, bolle, mondo)
     2. attrezzi (suoni, scoppi, scritte…)   6. regole (guadagna, colpito, mangia, vittoria, sconfitta)
     3. indoli e capacità speciali           7. aggiornamento, un pezzo per volta
     4. comportamenti dei pericoli           8. B.partita */
(() => {
'use strict';
const B = window.B;
const { TAU, caso, intero, limita, scegli, differenzaAngolo, numero } = B.util;
const emetti = (nome, dati) => B.eventi.emetti(nome, dati);

// =====================================================================
//  1. Taratura e stato del modulo
// =====================================================================
// I numeri vengono dalla versione precedente, già provata: non cambiarli senza una prova con prova-mondo.mjs.
const VEL_EROE = 250, VEL_PER_RAGGIO = 1.4;       // l'eroe grosso nuota un po' più svelto
const SCATTO_MOLT = 2.3, SCATTO_DURATA = 0.55, SCATTO_RICARICA = 3.5;
const FRENESIA_DURATA = 7, FRENESIA_VEL = 1.2;
const CALAMITA_DURATA = 9, MOLT_DURATA = 8;
const INVUL_INIZIO = 3, INVUL_COLPO = 2.6, INVUL_SCUDO = 1.6;
const PARTE_GUADAGNATA = 0.3;                     // mangiando un pesce si guadagna il 30% della sua potenza
const PARTE_MORSO_GIGANTE = 0.1;                  // un morso al gigante (non l'ultimo) rende meno
const NON_TI_DEGNA = 6, GIGANTE_NON_TI_DEGNA = 40;   // chi è più forte di tua × 6 + 20 non ti insegue (gigante: × 40)
const CONTATTO = 0.72;                            // ci si tocca a questa parte della somma dei raggi
const PERLA_DAL_PESCE = 0.35;                     // probabilità di una perla mangiando un pesce grosso
const PERLE_CONCHIGLIA = 6, PERLE_BOLLA = 5, PERLE_CUORE_PIENO = 8, PERLE_OBIETTIVO = 15, PERLE_LIVELLO = 15, PERLE_STELLA = 5;
const CONCHIGLIA_ATTESA = 45;
const BOLLA_OGNI = 4.5, BOLLE_ALL_INIZIO = 5, BOLLE_MAX = 7;
const RINASCITA = 2.5;
const DORATO_PESCI = 28, DORATO_VALE = 8, DORATO_DURATA = 24, DORATI_PER_PERLA = 4;
const TETTO = { particelle: 260, testi: 44, nuvole: 8, rinascite: 40, riserva: 300 };
const MAI = 1e9;                                  // "morto" di un pesciolino che non torna (banco dorato a riposo)

const COLORI = {
  spruzzo: '#ffffff', oro: '#ffe066', perla: '#ffd9f0', scudo: '#9be7ff', cuore: '#ff5c7a', cuoreScritta: '#ff8fa3',
  boccone: '#b9ffd0', scia: 'rgba(255,255,255,.7)', calamita: '#ff9ecb', duro: '#d7e3f4', veleno: '#c9a8ff',
  festa: ['#ffe066', '#ff9ecb', '#35e0c8', '#ffffff'],
};

/* Effetti neutri: valgono se B.progressi non c'è (strumenti di prova) e per l'acquario dietro al menu. */
const NEUTRI = { velocita: 1, ricaricaScatto: 1, durataScatto: 1, risucchio: 1, bolle: 1, perle: 1, morso: 1,
  cuori: 0, durataCalamita: 0, durataFrenesia: 0, invulnerabile: 0, scudoIniziale: false };

let M = null;                 // il mondo: la partita in corso, oppure l'acquario dietro al menu
let stato = 'ferma';          // 'ferma' | 'gioco' | 'pausa' | 'vinto' | 'perso'
let E = Object.assign({}, NEUTRI);   // effetti di potenziamenti ed eroe, letti a inizio partita

// Oggetti riusati a ogni fotogramma (per non crearne a raffica).
const dir = { x: 0, y: 0 };
const punto = { x: 0, y: 0 };
const S = { inGioco: false, dx: 0, dy: 0, d: 0, forte: false, vicino: false, ignora: false };   // sensi di un pesce
const mossa = { vel: 0, verso: NaN, gira: 0, accel: 0, insegue: false, fugge: false };          // ciò che decide di fare
const riserva = { particelle: [], testi: [], nuvole: [] };
const scenaInCassa = { id: '', seme: -1, scena: null };

const dati = {
  livello: 0, modalita: 'avventura', nomeAmbiente: '', potenza: 0, obiettivo: null, avanzamento: 0,
  cuori: 0, cuoriMax: 0, perle: 0, tempo: 0, frenesia: 0, frenesiaT: 0, molt: 1, moltT: 0, calamitaT: 0, scudo: false,
  scatto: 1, fascia: 0, ottava: 0,
};
const datiObiettivo = { nome: '', potenza: 0, morsi: 0, morsiTotali: 0 };

const raggioEroe = p => 18 * (1 + 0.7 * Math.log10(p + 1));
const stadioDi = fascia => fascia < 2 ? 0 : fascia < 4 ? 1 : 2;
const inPartita = () => stato === 'gioco' && !!M && !!M.eroe && M.eroe.vivo;

// =====================================================================
//  2. Attrezzi: suoni, vibrazione, annunci, scoppi, scritte, perle, punti
// =====================================================================
function suono(nome, opzioni) {
  if (!B.audio || !B.audio.effetto) return;
  try { B.audio.effetto(nome, opzioni); } catch (e) { console.error('[Boccone] suono "' + nome + '"', e); }
}
function vibra(ms) { emetti('vibra', { ms }); }
function annuncia(titolo, sotto, durata = 2.4) { emetti('annuncio', { titolo, sotto: sotto || '', durata }); }

function scoppio(x, y, colore, quanti, forza, grandezza = 1) {
  for (let i = 0; i < quanti && M.particelle.length < TETTO.particelle; i++) {
    const a = caso(TAU), v = caso(0.3, 1) * forza, p = riserva.particelle.pop() || {};
    p.x = x; p.y = y; p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v;
    p.vita = caso(0.35, 0.85); p.eta = 0; p.r = caso(2, 6) * grandezza; p.c = colore;
    M.particelle.push(p);
  }
}
function scia(h) {
  if (M.particelle.length >= 200) return;
  const p = riserva.particelle.pop() || {};
  p.x = h.x - Math.cos(h.ang) * h.r; p.y = h.y - Math.sin(h.ang) * h.r + caso(-h.r, h.r) * 0.5;
  p.vx = 0; p.vy = 0; p.vita = 0.4; p.eta = 0; p.r = caso(3, 7); p.c = COLORI.scia;
  M.particelle.push(p);
}
function testo(x, y, scritta, colore, grande, perla) {
  if (M.testi.length >= TETTO.testi) riserva.testi.push(M.testi.shift());
  const s = riserva.testi.pop() || {};
  s.x = x; s.y = y; s.s = scritta; s.c = colore; s.eta = 0; s.grande = !!grande; s.perla = !!perla;
  M.testi.push(s);
}
/* Una nuvola (di inchiostro) che copre la vista: la disegna la vista, sopra le creature. */
function nuvola(x, y, r, vita) {
  if (M.nuvole.length >= TETTO.nuvole) riserva.nuvole.push(M.nuvole.shift());
  const n = riserva.nuvole.pop() || {};
  n.x = x; n.y = y; n.r = r; n.eta = 0; n.vita = vita;
  M.nuvole.push(n);
}
function togliVeloce(lista, i, cassetto) {
  const v = lista[i], ultimo = lista.pop();
  if (i < lista.length) lista[i] = ultimo;
  if (cassetto.length < TETTO.riserva) cassetto.push(v);
}

/* Perle guadagnate in partita: applica il moltiplicatore dell'eroe e dei potenziamenti, poi le consegna a
   B.progressi (che emette l'evento 'perle'). I decimali diventano una perla in più con quella probabilità. */
function prendiPerle(n, x, y, motivo) {
  const esatte = n * E.perle;
  let q = Math.floor(esatte);
  if (Math.random() < esatte - q) q++;
  if (q <= 0) return 0;
  M.perle += q;
  if (B.progressi && B.progressi.guadagna) B.progressi.guadagna(q, motivo); else emetti('perle', { quante: q, motivo });
  if (x !== undefined) testo(x, y, '+' + q, COLORI.perla, false, true);
  return q;
}

/* Un punto a caso del mondo lontano dall'eroe almeno "distanza" (nell'oggetto riusato "punto"). */
function puntoLontano(distanza, margine = 160) {
  const h = M.eroe, L = M.largo, A = M.alto;
  for (let i = 0; i < 50; i++) {
    punto.x = caso(margine, L - margine); punto.y = caso(margine, A - margine);
    if (!h || Math.hypot(punto.x - h.x, punto.y - h.y) > distanza) return punto;
  }
  punto.x = h.x < L / 2 ? L - margine : margine; punto.y = h.y < A / 2 ? A - margine : margine;
  return punto;
}

/* Fa partire la carica di un pesce: prima l'avviso (fermo, si gira verso l'eroe, e.carica sale da 0 a 1), poi lo
   scatto in linea retta. La usano il gigante, il capobranco e i pesci da agguato. */
function preparaCarica(e, avviso, scatto, molt) {
  e.avviso = avviso; e.avvisoDurata = avviso; e.carica = 0; e.sprintDurata = scatto; e.sprintMolt = molt;
}

// =====================================================================
//  3. Indoli e capacità speciali
// =====================================================================
/* Un'indole è { vel, senso, crociera, nasce?(e, iniziale), pensa(e, s, m, dt) }.
     vel, senso   moltiplicano velocità e vista della fascia (li legge nuovoPesce)
     crociera     parte della velocità usata quando gira per conto suo
     nasce        facoltativa: prepara i campi propri dell'indole
     pensa        a ogni fotogramma decide la mossa m (già impostata su "gira per conto suo"):
                    m.verso (angolo; NaN = vaga), m.vel, m.gira (rad/s), m.accel, m.insegue, m.fugge
                  s sono i sensi: s.dx, s.dy, s.d verso l'eroe; s.vicino = l'eroe è a portata di vista;
                  s.forte = è più forte dell'eroe; s.ignora = riposa o l'eroe è troppo piccolo per interessargli.
   Per aggiungere un'indole: una voce qui (o in B.partita.indoli) e il nome nel campo "indole" del cast. */
function insegui(e, s, m, dt, molt) {
  m.verso = Math.atan2(s.dy, s.dx); m.vel = e.vel * molt; m.insegue = true;
  e.fiato -= dt;                                   // chi insegue si stanca e molla la presa per un po'
  if (e.fiato <= 0) { e.fiato = caso(3.5, 5.5); e.riposo = caso(2.5, 4); }
}
function fuggi(e, s, m, molt) { m.verso = Math.atan2(-s.dy, -s.dx); m.vel = e.vel * molt; m.fugge = true; }

/* Il modo di fare di base: scappa se è più debole, insegue se è più forte e l'eroe gli interessa. */
function daCacciatore(e, s, m, dt, fuga) {
  if (!s.vicino) return false;
  if (!s.forte) { fuggi(e, s, m, fuga); return true; }
  if (s.ignora) return false;
  insegui(e, s, m, dt, 1);
  return true;
}

function cercaGuida(e) {
  for (const o of M.predatori) {
    if (o === e || o.def !== e.def || o.via || o.guida || o.seguaci >= 4) continue;
    e.guida = o; o.seguaci++;
    return;
  }
}

const INDOLI = {
  cacciatore: { vel: 1, senso: 1, crociera: 0.38,
    pensa(e, s, m, dt) { daCacciatore(e, s, m, dt, 0.85); } },

  /* Non attacca mai e non fa male: scappa appena ti vede, anche se è più grosso di te. */
  timido: { vel: 1, senso: 1.25, crociera: 0.38,
    pensa(e, s, m) { if (s.vicino) fuggi(e, s, m, 1); } },

  /* Lento, e si accorge di te solo da vicino. */
  pigro: { vel: 0.72, senso: 0.6, crociera: 0.3,
    pensa(e, s, m, dt) { daCacciatore(e, s, m, dt, 0.8); } },

  /* Insegue (e scappa) a strappi: accelera forte per circa un secondo, poi rallenta e riprende fiato. */
  scattante: { vel: 1, senso: 1.1, crociera: 0.4,
    pensa(e, s, m, dt) {
      if (!s.vicino || (s.forte && s.ignora)) { e.inStrappo = false; e.strappo = 0; return; }
      e.strappo -= dt;
      if (e.strappo <= 0) { e.inStrappo = !e.inStrappo; e.strappo = e.inStrappo ? caso(0.9, 1.2) : caso(1.1, 1.6); }
      if (s.forte) insegui(e, s, m, dt, e.inStrappo ? 1.6 : 0.5); else fuggi(e, s, m, e.inStrappo ? 1.3 : 0.55);
      m.accel = e.inStrappo ? 7 : 3;
    } },

  /* Quasi fermo; quando gli passi a tiro si avvicina piano e poi scatta. (Prima versione: da rifinire.) */
  agguato: { vel: 1, senso: 1.1, crociera: 0.15,
    pensa(e, s, m, dt) {
      if (!s.vicino) return;
      if (!s.forte) { fuggi(e, s, m, 0.9); return; }
      if (s.ignora) return;
      if (s.d < e.senso * 0.7 + M.eroe.r + e.r) preparaCarica(e, 0.45, 0.6, 2.5);
      else { m.verso = Math.atan2(s.dy, s.dx); m.vel = e.vel * 0.3; m.insegue = true; }
    } },

  /* Fa la ronda su un grande giro attorno al punto in cui è nato e vede lontano. (Prima versione: da rifinire.) */
  pattuglia: { vel: 0.95, senso: 1.5, crociera: 0.55,
    nasce(e) { e.cx = e.x; e.cy = e.y; e.rondaRaggio = caso(380, 560); e.rondaAng = caso(TAU); e.rondaVerso = Math.random() < 0.5 ? -1 : 1; },
    pensa(e, s, m, dt) {
      if (daCacciatore(e, s, m, dt, 0.85)) return;
      e.rondaAng += e.rondaVerso * dt * e.vel * e.crociera / e.rondaRaggio;
      const bordo = e.r + 80;
      const tx = limita(e.cx + Math.cos(e.rondaAng) * e.rondaRaggio, bordo, M.largo - bordo);
      const ty = limita(e.cy + Math.sin(e.rondaAng) * e.rondaRaggio, bordo, M.alto - bordo);
      m.verso = Math.atan2(ty - e.y, tx - e.x); m.gira = 1.6;
    } },

  /* Gira in gruppo: segue un compagno della stessa specie (la guida). (Prima versione: da rifinire.) */
  branco: { vel: 1, senso: 1, crociera: 0.42,
    nasce(e, iniziale) {
      cercaGuida(e);
      if (!e.guida || !iniziale) return;
      e.x = limita(e.guida.x + caso(-110, 110), e.r, M.largo - e.r); e.y = limita(e.guida.y + caso(-110, 110), e.r, M.alto - e.r);
    },
    pensa(e, s, m, dt) {
      if (daCacciatore(e, s, m, dt, 0.85)) return;
      if (e.guida && e.guida.via) e.guida = null;
      if (!e.guida) {
        if (e.seguaci > 0) return;                 // è lui la guida
        e.cercaT -= dt;
        if (e.cercaT <= 0) { e.cercaT = 2; cercaGuida(e); }
        return;
      }
      const g = e.guida, dx = g.x - e.x, dy = g.y - e.y, d = Math.hypot(dx, dy);
      if (d > e.r * 2 + 50) { m.verso = Math.atan2(dy, dx); m.vel = e.vel * e.crociera * (1 + Math.min(1.2, d / 250)); }
      else { m.verso = g.ang; m.vel = g.vAtt; }    // vicino alla guida: nuota come lei
    } },
};

/* Una capacità speciale è { soglia, punge, aggiorna?(e, s, m, dt) }.
     soglia   per mangiarlo l'eroe deve essere più forte di potenza × soglia
     punge    se l'eroe lo tocca senza poterlo mangiare perde un cuore (anche se è più forte di lui)
     aggiorna facoltativa, a ogni fotogramma dopo l'indole
   Chi ha la corazza e non si può ancora mangiare non fa male: ci si rimbalza contro. */
const SPECIALI = {
  veleno: { soglia: 2, punge: true },
  corazza: { soglia: 1.5, punge: false },
  luce: { soglia: 1, punge: false },               // solo aspetto: ci pensa la vista
  /* Se è inseguito lascia una nuvola che copre la vista e scappa via più svelto. (Prima versione.) */
  inchiostro: { soglia: 1, punge: false,
    aggiorna(e, s, m, dt) {
      e.specialeT -= dt;
      if (e.specialeT > 0 || !m.fugge || s.d > 190 + e.r + M.eroe.r) return;
      e.specialeT = caso(5, 8);
      nuvola(e.x, e.y, e.r * 2.6 + 40, 4.5); suono('inchiostro');
      e.vAtt = e.vel * 1.8;                        // schizza via
    } },
  // 'scossa' (alone elettrico che stordisce) non è ancora scritta: vedi ARCHITETTURA §8 "che cosa resta da fare".
};

// =====================================================================
//  4. Comportamenti dei pericoli
// =====================================================================
/* Un comportamento è { posa(p), aggiorna(p, dt, inGioco) }: posa sceglie dove nasce il pericolo, aggiorna lo fa
   vivere (posizione, p.fase 0..1, p.attivo 0..1). Il contatto con l'eroe lo controlla il mondo: fa sempre male.
   Per ora sono scritti 'deriva' e 'fermo'; mina, pendolo, eruzione e caduta stanno fermi in un punto sensato. */
function postoFermo(p, yMin, yMax) {
  const h = M.eroe, bordo = p.r + 110;
  for (let i = 0; i < 30; i++) {
    p.x = caso(bordo, M.largo - bordo); p.y = caso(yMin, yMax);
    if (!h || Math.hypot(p.x - h.x, p.y - h.y) > 420) return;
  }
}
/* Un appoggio offerto dallo scenario (facoltativo: scena.appoggi = [{x, y}], punti su scogli e rocce), usato a turno. */
function appoggio(p) {
  const lista = M.scena && M.scena.appoggi;
  if (!Array.isArray(lista) || !lista.length || Math.random() < 0.5) return false;
  const a = lista[M.appoggiUsati++ % lista.length];
  if (!a || !(a.x >= 0) || !(a.y >= 0)) return false;
  p.x = limita(a.x, p.r, M.largo - p.r); p.y = limita(a.y - p.r * 0.8, p.r, M.alto - p.r);
  return true;
}
function vivoFermo(p, dt, inGioco) {
  p.fase = (p.fase + dt * 0.35) % 1;
  let vicino = 0;
  if (inGioco) { const h = M.eroe; vicino = 1 - limita((Math.hypot(p.x - h.x, p.y - h.y) - h.r - p.r) / 220, 0, 1); }
  p.attivo += (vicino - p.attivo) * Math.min(1, dt * 5);
}
const sulFondo = p => { if (!appoggio(p)) postoFermo(p, M.alto - p.r * 0.85, M.alto - p.r * 0.85); };

const COMPORTAMENTI = {
  /* La medusa: sale a spinte e ridiscende, andando piano alla deriva. */
  deriva: {
    posa(p) { puntoLontano(500); p.x = punto.x; p.y = punto.y; p.dx = caso(-12, 12); p.dy = caso(3, 9) * (Math.random() < 0.5 ? -1 : 1); },
    aggiorna(p, dt) {
      p.fase = (p.fase + dt * 2.2 / TAU) % 1;
      const spinta = Math.max(0, Math.sin(p.fase * TAU));
      p.attivo = spinta;
      p.y += (19.7 - spinta * 62 + p.dy) * dt; p.x += p.dx * dt;
      if (p.y < 150) p.dy = Math.abs(p.dy); else if (p.y > M.alto - 250) p.dy = -Math.abs(p.dy);
      if (p.x < 80) p.dx = Math.abs(p.dx); else if (p.x > M.largo - 80) p.dx = -Math.abs(p.dx);
    },
  },
  /* Il riccio: fermo sul fondale (o su uno scoglio); rizza gli aculei quando ti avvicini. */
  fermo: { posa: sulFondo, aggiorna: vivoFermo },
  // Da scrivere (per ora fermi dove starebbero): vedi ARCHITETTURA §8.
  mina:     { posa(p) { postoFermo(p, M.alto * 0.35, M.alto * 0.82); }, aggiorna: vivoFermo },   // a mezz'acqua, come ancorata
  pendolo:  { posa(p) { postoFermo(p, M.alto * 0.12, M.alto * 0.45); }, aggiorna: vivoFermo },   // appeso dalla superficie
  eruzione: { posa: sulFondo, aggiorna: vivoFermo },                                             // sul fondale
  caduta:   { posa(p) { postoFermo(p, p.r * 0.9, p.r * 0.9); }, aggiorna: vivoFermo },           // attaccato al soffitto
};

// =====================================================================
//  5. Nascite
// =====================================================================
function leggiEffetti() {
  const e = Object.assign({}, NEUTRI);
  if (B.progressi && B.progressi.effetti) Object.assign(e, B.progressi.effetti());
  if (B.prova && B.prova.effetti) Object.assign(e, B.prova.effetti);     // per gli strumenti di prova
  return e;
}

function nuovoEroe() {
  const scelto = B.progressi && B.progressi.eroeScelto ? B.progressi.eroeScelto() : '';
  const def = (scelto && B.eroi.prendi(scelto)) || B.eroi.tutte()[0] || null;
  return {
    def, x: M.largo / 2, y: M.alto / 2, vx: 0, vy: 0, kx: 0, ky: 0, ang: 0, p: 1, r: raggioEroe(1),
    bocca: 0, attesa: 0, pulsa: 0, invul: INVUL_INIZIO, vivo: true, stadio: 0, espressione: 'normale',
    felice: 0, colpitoT: 0,
  };
}

/* Un abitante di M.predatori: tutti hanno gli stessi campi (pesci, capobranco, gigante). */
function nuovoAbitante(def, fascia, p, r) {
  return {
    def, fascia, gigante: false, capo: false, neutro: false, indole: null, speciale: null,
    x: 0, y: 0, ang: caso(-Math.PI, Math.PI), vAtt: 0, kx: 0, ky: 0, p, soglia: p, r,
    vel: fascia.vel, senso: fascia.senso, crociera: 0.38,
    fase: Math.random(), giro: caso(-1, 1), bocca: 0, nasce: 1, mangiato: 0, via: false, stordito: 0,
    minaccia: false, mangiabile: false, stato: 'calmo',
    avviso: 0, avvisoDurata: 1, carica: 0, sprint: 0, sprintDurata: 0.85, sprintMolt: 2.7,
    fiato: caso(3.5, 5.5), riposo: 0,
    // campi delle indoli e delle capacità speciali
    strappo: 0, inStrappo: false, guida: null, seguaci: 0, cercaT: caso(0, 2),
    cx: 0, cy: 0, rondaRaggio: 0, rondaAng: 0, rondaVerso: 1, specialeT: caso(1, 4),
    // campi di gigante e capobranco (li riempie B.giganti.prepara)
    morsi: 1, morsiTotali: 1, vita: 1, furia: 0, attacchi: null, indiceAttacco: 0, attacco: null, prossimoAttacco: 0,
    velCalmo: 0, intoccabile: 0, sconfitto: 0,
  };
}

function nuovoPesce(fascia, distanza, iniziale) {
  const def = scegli(fascia.specie), indole = INDOLI[def.indole] || INDOLI.cacciatore;
  const e = nuovoAbitante(def, fascia, intero(fascia.min, fascia.max), fascia.r * caso(0.92, 1.08));
  puntoLontano(distanza || 560, e.r + 60);
  e.x = punto.x; e.y = punto.y;
  e.indole = indole; e.neutro = def.indole === 'timido'; e.speciale = SPECIALI[def.speciale] || null;
  e.soglia = e.p * (e.speciale ? e.speciale.soglia : 1);
  e.vel = fascia.vel * indole.vel; e.senso = fascia.senso * indole.senso; e.crociera = indole.crociera;
  if (indole.nasce) indole.nasce(e, iniziale);
  return e;
}

/* Il capobranco o il gigante del livello. */
function nuovoObiettivo(ob) {
  const e = nuovoAbitante(ob.def, ob, ob.potenza, ob.r);
  puntoLontano(1000, e.r + 60);
  e.x = punto.x; e.y = punto.y;
  e.gigante = ob.tipo === 'gigante'; e.capo = !e.gigante;
  B.giganti.prepara(e, ob);
  return e;
}

/* Rimette un pesce nei valori (cresciuti) della sua fascia: serve alla sopravvivenza quando il mare "cresce". */
function rinnova(e) {
  const f = e.fascia;
  e.p = intero(f.min, f.max); e.soglia = e.p * (e.speciale ? e.speciale.soglia : 1);
  e.r = f.r * caso(0.92, 1.08); e.vel = f.vel * e.indole.vel; e.senso = f.senso * e.indole.senso;
}

function nuovoBanco(def, dorato) {
  return { def, dorato, attivo: !dorato, x: caso(260, M.largo - 260), y: caso(260, M.alto - 260), ang: caso(TAU),
    vel: dorato ? caso(55, 70) : caso(22, 42), raggio: dorato ? caso(80, 110) : caso(120, 200) };
}
function popola(banco, quanti) {
  for (let i = 0; i < quanti; i++) {
    const a = caso(TAU), d = Math.sqrt(Math.random()) * banco.raggio;
    M.pesciolini.push({
      b: banco, def: banco.def, dorato: banco.dorato, a, d, w: caso(0.15, 0.5) * (Math.random() < 0.5 ? -1 : 1),
      x: banco.x + Math.cos(a) * d, y: banco.y + Math.sin(a) * d, vx: 0, vy: 0, ang: caso(-Math.PI, Math.PI),
      fase: Math.random(), morto: banco.dorato ? MAI : 0,
    });
  }
}
function creaBanchi() {
  const c = M.cfg.banchi;
  for (let i = 0; i < c.quanti; i++) {
    const banco = nuovoBanco(c.specie[i % c.specie.length], false);
    if (i === 0) { banco.x = M.largo / 2 + 170; banco.y = M.alto / 2 - 60; }      // due banchi a portata di pinna
    if (i === 1) { banco.x = M.largo / 2 - 260; banco.y = M.alto / 2 + 220; }
    M.banchi.push(banco);
    popola(banco, c.perBanco);
  }
  if (!c.dorato) return;
  const spesso = !!M.cfg.particolarita && M.cfg.particolarita.tipo === 'dorato';
  const banco = nuovoBanco(c.dorato, true), primo = M.pesciolini.length;
  popola(banco, DORATO_PESCI);
  M.dorato = { banco, attivo: false, t: spesso ? caso(8, 14) : caso(45, 80), spesso, primo, quanti: DORATO_PESCI, vivi: 0, presi: 0 };
}

function creaPredatori() {
  for (const f of M.cfg.fasce) for (let i = 0; i < f.quanti; i++) M.predatori.push(nuovoPesce(f, 430 + f.k * 210, true));
  const ob = M.cfg.obiettivo;
  if (ob && ob.def) { M.obiettivo = nuovoObiettivo(ob); M.predatori.push(M.obiettivo); }
}

function nuovoPericolo(gruppo) {
  const p = { def: gruppo.def, comportamento: COMPORTAMENTI[gruppo.comportamento] || COMPORTAMENTI.fermo,
    x: 0, y: 0, r: gruppo.r * caso(0.92, 1.08), ang: 0, fase: Math.random(), attivo: 0, stordito: 0, dx: 0, dy: 0 };
  p.comportamento.posa(p);
  return p;
}
function creaPericoli() { for (const g of M.cfg.pericoli) for (let i = 0; i < g.quanti; i++) M.pericoli.push(nuovoPericolo(g)); }

function nuovaBolla() {
  puntoLontano(300, 150);
  const x = Math.random();
  const tipo = x < 0.27 ? 'x2' : x < 0.39 ? 'x5' : x < 0.61 ? 'calamita' : x < 0.75 ? 'scudo' : x < 0.88 ? 'perla' : 'cuore';
  return { tipo, x: punto.x, y: punto.y, f: caso(TAU) };
}

function creaConchiglie() {
  const n = M.cfg.conchiglie;
  for (let i = 0; i < n; i++) M.conchiglie.push({ x: 150 + i * (M.largo - 300) / Math.max(1, n - 1) + caso(-60, 60), y: M.alto, attesa: 0, apre: 0 });
}

/* Lo scenario lo prepara l'ambiente (può costare: si tiene da parte l'ultimo, così "riprova" è immediato). */
function creaScena(amb, seme) {
  if (typeof amb.crea !== 'function') return null;
  if (scenaInCassa.id === amb.id && scenaInCassa.seme === seme) return scenaInCassa.scena;
  let scena = null;
  try { scena = amb.crea({ w: amb.mondo.w, h: amb.mondo.h }, B.util.semi(seme * 7919 + 17)); }
  catch (e) { console.error('[Boccone] lo scenario di "' + amb.id + '" non si è creato', e); return null; }
  scenaInCassa.id = amb.id; scenaInCassa.seme = seme; scenaInCassa.scena = scena;
  return scena;
}

function creaMondo(cfg, conEroe) {
  const amb = cfg.ambiente, largo = amb.mondo.w, alto = amb.mondo.h, part = cfg.particolarita ? cfg.particolarita.tipo : '';
  E = conEroe ? leggiEffetti() : Object.assign({}, NEUTRI);
  for (const nome of ['particelle', 'testi', 'nuvole']) if (M) while (M[nome].length && riserva[nome].length < TETTO.riserva) riserva[nome].push(M[nome].pop());
  const cuori = 3 + Math.max(0, Math.round(E.cuori));
  M = {
    livello: cfg.n, modalita: cfg.modalita, cfg, ambiente: amb, scena: null, largo, alto,
    t: 0, tempo: 0, eroe: null, obiettivo: null, inseguitore: null,
    banchi: [], pesciolini: [], predatori: [], pericoli: [], bolle: [], conchiglie: [], particelle: [], testi: [], nuvole: [],
    rinascite: [], dorato: null,
    aiuti: { molt: 1, moltT: 0, calamitaT: 0, scudo: !!E.scudoIniziale, frenesia: 0, frenesiaT: 0, frenesiaDurata: FRENESIA_DURATA + E.durataFrenesia },
    scatto: { attivo: 0, ricarica: 0, durataRicarica: SCATTO_RICARICA * E.ricaricaScatto, durata: SCATTO_DURATA * E.durataScatto },
    cuori, cuoriMax: cuori, perle: 0, colpi: 0, fascia: 0, ottava: 0,
    cam: { x: largo / 2, y: alto / 2, z: 1 }, scossa: 0, lampo: 0, pericolo: 0,
    corrente: { x: 0, y: 0, forza: part === 'corrente' ? 70 : 0, fase: caso(TAU) },
    buio: part === 'buio' ? 0.55 : 0,
    mangiati: {}, visti: {}, effetti: E,
    // contatori interni
    guida: { x: largo / 2, y: alto / 2 }, vistaPesci: part === 'buio' ? 0.85 : 1, valore: 1,
    accumulo: 0, accumuloT: 0, bollaT: 3, gruppoQuanti: 0, gruppoDorati: 0, gruppoT: 0.5, vistoT: 0, gnamT: 0, duroT: 0,
    pericoloT: cfg.pericoloOgni || 0, appoggiUsati: 0, avvisatoObiettivo: false,
  };
  M.scena = creaScena(amb, cfg.seme);
  if (conEroe) M.eroe = nuovoEroe();
  creaBanchi(); creaPredatori(); creaPericoli(); creaConchiglie();
  for (let i = 0; i < BOLLE_ALL_INIZIO; i++) M.bolle.push(nuovaBolla());
  aggiornaVisuale(10, false);                     // la visuale parte già al suo posto
  aggiornaDati();
}

// =====================================================================
//  6. Regole
// =====================================================================
function valorePesciolino() { const v = M.cfg.valorePesciolino; return v[Math.min(M.fascia, v.length - 1)] * M.valore; }

function fasciaDi(p) {
  const fasce = M.cfg.fasce; let fascia = 0;
  for (let i = 0; i < fasce.length; i++) if (p > fasce[i].min) fascia = i + 1;
  return fascia;
}
function nomiDi(fascia) {
  const nomi = [];
  for (const s of fascia.specie) if (!nomi.includes(s.plurale)) nomi.push(s.plurale);
  return nomi.join(' e ');
}

/* L'eroe mangia e cresce. base = potenza guadagnata prima dei moltiplicatori (che valgono pieni sui pesciolini,
   in radice sui pesci grossi). Risponde il guadagno vero. */
function guadagna(base, x, y, grosso) {
  const h = M.eroe, a = M.aiuti;
  const mm = Math.max(a.molt, a.frenesiaT > 0 ? 2 : 1), m = grosso ? Math.sqrt(mm) : mm, g = Math.max(1, Math.round(base * m));
  h.p += g; h.r = raggioEroe(h.p); h.bocca = 1; h.pulsa = grosso ? 1 : Math.max(h.pulsa, 0.35);
  if (grosso) {
    testo(x, y, '+' + numero(g), COLORI.oro, true);
    M.scossa = Math.max(M.scossa, 6); h.felice = 0.8; vibra(25); suono('gnamGrosso');
  } else {
    M.accumulo += g;
    if (M.t >= M.gnamT) { M.gnamT = M.t + 0.05; suono('gnam'); }
  }
  if (a.frenesiaT <= 0) {
    a.frenesia += grosso ? 0.1 : 0.008;
    if (a.frenesia >= 1) {
      a.frenesia = 0; a.frenesiaT = a.frenesiaDurata;
      annuncia('Frenesia!', 'Per ' + Math.round(a.frenesiaDurata) + ' secondi tutto vale doppio', 1.8);
      suono('frenesia'); vibra(60); emetti('frenesia', {});
    }
  }
  controllaCrescita();
  return g;
}

/* Salto di fascia: avvisa quando una nuova taglia diventa mangiabile, e quando si può affrontare l'obiettivo. */
function controllaCrescita() {
  const h = M.eroe, fasce = M.cfg.fasce, fascia = fasciaDi(h.p), ob = M.cfg.obiettivo;
  if (fascia > M.fascia) {
    M.fascia = fascia; h.stadio = stadioDi(fascia + M.ottava);
    suono('cresciuto'); scoppio(h.x, h.y, COLORI.oro, 24, 300); emetti('cresciuto', { fascia: fascia + M.ottava });
    if (M.modalita === 'sopravvivenza' && fascia >= fasce.length) saleOttava();
    else annuncia('Sei cresciuto!', fasce[fascia - 1].specie.length ? 'Ora puoi mangiare: ' + nomiDi(fasce[fascia - 1]) : '');
  }
  if (!ob || stato !== 'gioco') return;
  if (!M.obiettivo) { if (h.p > ob.potenza) vittoria(); return; }      // nessun modello registrato: basta crescere
  if (!M.avvisatoObiettivo && h.p * E.morso > M.obiettivo.soglia) {
    M.avvisatoObiettivo = true;
    if (M.obiettivo.gigante) annuncia('Sei più forte del gigante!', 'Segui la freccia e mordilo: servono ' + M.obiettivo.morsiTotali + ' morsi', 3);
    else annuncia('Sei il più grosso!', 'Segui la freccia e mangia il capobranco', 3);
  }
}

/* Sopravvivenza: quando l'eroe supera l'ultima fascia, tutte le fasce salgono di un gradino. I pesci lontani
   crescono subito, quelli vicini restano come sono finché non vengono mangiati (rinascono più forti). */
function saleOttava() {
  const o = M.cfg.ottava, h = M.eroe;
  M.ottava++; M.valore *= o.potenza;
  for (const f of M.cfg.fasce) { f.min *= o.potenza; f.max *= o.potenza; f.r += o.raggio; f.vel += o.vel; f.senso += o.senso; }
  const lontano = 520 / M.cam.z;
  for (const e of M.predatori) if (!e.via && e.indole && Math.hypot(e.x - h.x, e.y - h.y) > lontano + e.r) rinnova(e);
  M.fascia = fasciaDi(h.p);
  annuncia('Il mare cresce con te!', 'Arrivano pesci più grossi', 2.6);
}

function colpito(nemico) {
  const h = M.eroe, a = M.aiuti;
  if (h.invul > 0 || !h.vivo) return;
  const ang = Math.atan2(h.y - nemico.y, h.x - nemico.x);
  nemico.stordito = 1.3;
  if (nemico.sprint !== undefined) { nemico.sprint = 0; nemico.avviso = 0; nemico.carica = 0; }
  // chi è nei paraggi molla la presa per qualche secondo
  for (const e of M.predatori) if (Math.hypot(e.x - h.x, e.y - h.y) < 450 + e.r) e.riposo = Math.max(e.riposo, caso(2.5, 4));
  h.colpitoT = 0.9;
  if (a.scudo) {
    a.scudo = false; h.invul = INVUL_SCUDO;
    scoppio(h.x, h.y, COLORI.scudo, 26, 320); testo(h.x, h.y - h.r, 'Scudo!', COLORI.scudo, true);
    suono('scudo'); M.scossa = 10; vibra(60);
    h.kx = Math.cos(ang) * 420; h.ky = Math.sin(ang) * 420;
    emetti('colpito', { da: nemico.def.id, cuori: M.cuori });
    return;
  }
  M.cuori--; M.colpi++; M.lampo = 1; M.scossa = 16;
  suono('colpo'); vibra(140);
  emetti('colpito', { da: nemico.def.id, cuori: M.cuori });
  if (M.cuori > 0) {
    h.invul = INVUL_COLPO + E.invulnerabile; h.kx = Math.cos(ang) * 620; h.ky = Math.sin(ang) * 620;
    scoppio(h.x, h.y, COLORI.cuore, 18, 300); testo(h.x, h.y - h.r, '−1 cuore', COLORI.cuoreScritta, true);
    return;
  }
  sconfitta();
}

/* Contro una corazza che non si riesce ancora a rompere si rimbalza, senza farsi male. */
function rimbalza(e) {
  const h = M.eroe, ang = Math.atan2(h.y - e.y, h.x - e.x);
  h.kx = Math.cos(ang) * 300; h.ky = Math.sin(ang) * 300;
  if (M.t < M.duroT) return;
  M.duroT = M.t + 1.2;
  testo(h.x, h.y - h.r, 'Troppo duro!', COLORI.duro, false); suono('scudo'); vibra(15);
}

function segnaMangiato(e, guadagno) {
  const id = e.def.id;
  M.mangiati[id] = (M.mangiati[id] || 0) + 1;
  emetti('mangiato', { id, tipo: e.def.tipo, taglia: e.def.taglia || 0, potenza: e.p, guadagno });
}

/* L'eroe mangia un pesce (o il capobranco, che chiude il livello). */
function mangia(e) {
  scoppio(e.x, e.y, COLORI.spruzzo, e.capo ? 70 : 18, e.capo ? 560 : 260, e.capo ? 1.8 : 1);
  const g = guadagna(e.p * PARTE_GUADAGNATA, e.x, e.y - e.r, true);
  if (e.capo) prendiPerle(PERLE_OBIETTIVO, e.x, e.y, 'capobranco');
  else if (Math.random() < PERLA_DAL_PESCE) prendiPerle(e.fascia.k >= 2 ? 2 : 1, e.x, e.y, 'pesce');
  e.mangiato = 0.18; e.via = true;
  if (e.guida && !e.guida.via) e.guida.seguaci--;
  segnaMangiato(e, g);
  if (e.capo) { vittoria(); return; }
  if (M.rinascite.length < TETTO.rinascite) M.rinascite.push({ fascia: e.fascia, t: RINASCITA });
}

/* Un morso al gigante: ne servono tre, e a ogni morso si infuria (vedi 52-giganti.js). */
function mordiGigante(e) {
  const h = M.eroe, potenza = e.p, rimasti = B.giganti.morso(e, M);
  suono('morso'); vibra(80); M.scossa = Math.max(M.scossa, 14);
  scoppio(e.x, e.y, COLORI.spruzzo, 40, 460, 1.5);
  emetti('gigante:morso', { id: e.def.id, rimasti });
  if (rimasti > 0) {
    guadagna(potenza * PARTE_MORSO_GIGANTE, e.x, e.y - e.r, true);
    h.invul = Math.max(h.invul, 1.4);
    annuncia('Bel morso!', (rimasti === 1 ? 'Ancora un morso' : 'Ancora ' + rimasti + ' morsi') + ': attento, si è infuriato', 2.6);
    M.avvisatoObiettivo = h.p * E.morso > e.soglia;
    return;
  }
  const g = guadagna(potenza * PARTE_GUADAGNATA, e.x, e.y - e.r, true);
  prendiPerle(PERLE_OBIETTIVO, e.x, e.y, 'gigante');
  segnaMangiato(e, g);
  h.invul = 30;                                    // la partita è vinta: nessuno gli fa più male
}

function chiudi(esito, stelle, extra) {
  const h = M.eroe;
  emetti('partita:fine', Object.assign({
    esito, livello: M.livello, modalita: M.modalita, ambiente: M.ambiente.id, tempo: M.tempo, potenza: h ? h.p : 0,
    colpi: M.colpi, perle: M.perle, stelle, mangiati: Object.assign({}, M.mangiati),
  }, extra));
}

function vittoria() {
  const h = M.eroe, cfg = M.cfg;
  stato = 'vinto';
  for (let i = 0; i < 7; i++) scoppio(h.x + caso(-140, 140), h.y + caso(-140, 140), COLORI.festa[i % 4], 30, 440, 1.4);
  suono('vittoria'); vibra(120);
  const senzaColpi = M.colpi === 0, inTempo = M.tempo <= cfg.tempoStella, stelle = 1 + (senzaColpi ? 1 : 0) + (inTempo ? 1 : 0);
  prendiPerle(PERLE_LIVELLO + stelle * PERLE_STELLA, undefined, undefined, 'livello');
  aggiornaDati();
  chiudi('vinto', stelle, { senzaColpi, inTempo, tempoStella: cfg.tempoStella });
}

function sconfitta() {
  const h = M.eroe;
  h.vivo = false; stato = 'perso';
  scoppio(h.x, h.y, COLORI.cuore, 40, 380); scoppio(h.x, h.y, COLORI.spruzzo, 20, 260);
  suono('sconfitta');
  aggiornaDati();
  chiudi('perso', 0);
}

// =====================================================================
//  7. Aggiornamento
// =====================================================================
function leggiDirezione() {
  let d = null;
  if (B.prova && typeof B.prova.pilota === 'function') d = B.prova.pilota(M);
  else if (B.comandi && B.comandi.direzione) d = B.comandi.direzione();
  let x = d && d.x === d.x ? +d.x || 0 : 0, y = d && d.y === d.y ? +d.y || 0 : 0;
  const m = Math.hypot(x, y);
  if (m > 1) { x /= m; y /= m; }
  dir.x = x; dir.y = y;
}

function aggiornaEroe(dt) {
  const h = M.eroe, a = M.aiuti, sc = M.scatto, co = M.corrente;
  M.tempo += dt;
  leggiDirezione();
  let vel = VEL_EROE * E.velocita + (h.r - 22) * VEL_PER_RAGGIO;
  if (a.frenesiaT > 0) vel *= FRENESIA_VEL;
  if (sc.attivo > 0) {
    vel *= SCATTO_MOLT; sc.attivo -= dt;
    scia(h);
    if (Math.hypot(dir.x, dir.y) < 0.2) { dir.x = Math.cos(h.ang); dir.y = Math.sin(h.ang); }
  }
  sc.ricarica = Math.max(0, sc.ricarica - dt);
  const k = Math.min(1, dt * 8), frena = Math.max(0, 1 - 5 * dt);
  h.vx += (dir.x * vel - h.vx) * k; h.vy += (dir.y * vel - h.vy) * k;
  h.kx *= frena; h.ky *= frena;
  h.x = limita(h.x + (h.vx + h.kx + co.x) * dt, h.r, M.largo - h.r);
  h.y = limita(h.y + (h.vy + h.ky + co.y) * dt, h.r, M.alto - h.r);
  if (Math.hypot(h.vx, h.vy) > 12) h.ang = Math.atan2(h.vy, h.vx);
  h.invul = Math.max(0, h.invul - dt);
  if (a.moltT > 0) { a.moltT -= dt; if (a.moltT <= 0) { a.moltT = 0; a.molt = 1; } }
  if (a.calamitaT > 0) a.calamitaT = Math.max(0, a.calamitaT - dt);
  if (a.frenesiaT > 0) a.frenesiaT = Math.max(0, a.frenesiaT - dt); else a.frenesia = Math.max(0, a.frenesia - dt * 0.045);
}

function aggiornaEspressione(h, dt) {
  h.bocca = Math.max(0, h.bocca - dt * 5); h.pulsa = Math.max(0, h.pulsa - dt * 4);
  h.felice = Math.max(0, h.felice - dt); h.colpitoT = Math.max(0, h.colpitoT - dt);
  h.espressione = h.colpitoT > 0 ? 'colpito' : M.pericolo > 0.4 ? 'spaventato' : h.felice > 0 ? 'felice' : 'normale';
}

/* Senza eroe (acquario dietro al menu) la visuale segue un punto che passeggia per il mondo. */
function aggiornaGuida() {
  const g = M.guida, ax = Math.min(520, M.largo / 2 - 420), ay = Math.min(520, M.alto / 2 - 420);
  g.x = M.largo / 2 + Math.cos(M.t * 0.12) * ax; g.y = M.alto / 2 + Math.sin(M.t * 0.17) * ay;
}

function aggiornaCorrente() {
  const co = M.corrente;
  if (!co.forza) return;
  co.x = co.forza * Math.sin(M.t * 0.2 + co.fase); co.y = co.forza * 0.35 * Math.sin(M.t * 0.13 + co.fase * 2);
}

function aggiornaBanchi(dt) {
  const L = M.largo, A = M.alto;
  for (const b of M.banchi) muoviBanco(b, dt, L, A);
  if (M.dorato && M.dorato.attivo) muoviBanco(M.dorato.banco, dt, L, A);
}
function muoviBanco(b, dt, L, A) {
  b.ang += caso(-1, 1) * dt * 0.8;
  b.x += Math.cos(b.ang) * b.vel * dt; b.y += Math.sin(b.ang) * b.vel * dt;
  const m = b.raggio + 60;
  if (b.x < m || b.x > L - m || b.y < m || b.y > A - m) b.ang = Math.atan2(A / 2 - b.y, L / 2 - b.x);
}

function rinasce(f) {
  const h = M.eroe;
  if (h && Math.hypot(f.b.x - h.x, f.b.y - h.y) <= 640) { f.morto = 1.5; return; }     // non sotto gli occhi del giocatore
  f.x = f.b.x + Math.cos(f.a) * f.d; f.y = f.b.y + Math.sin(f.a) * f.d; f.vx = 0; f.vy = 0; f.morto = 0;
}

function mangiaPesciolino(f, valore) {
  if (f.dorato) {
    const D = M.dorato;
    f.morto = MAI; D.vivi--; D.presi++; M.gruppoDorati++;
    guadagna(valore * DORATO_VALE, f.x, f.y, false);
    if (D.presi % DORATI_PER_PERLA === 0) prendiPerle(1, f.x, f.y, 'dorato');
    if (M.particelle.length < 160) scoppio(f.x, f.y, COLORI.oro, 3, 120);
  } else {
    f.morto = caso(8, 16);
    guadagna(valore, f.x, f.y, false);
    if (M.particelle.length < 120) scoppio(f.x, f.y, COLORI.spruzzo, 2, 90);
  }
  M.gruppoQuanti++;
}

function aggiornaPesciolini(dt, inGioco) {
  const h = M.eroe, a = M.aiuti, lista = M.pesciolini;
  const calamita = inGioco && a.calamitaT > 0;
  let fuga = 0, presa = 0, risucchio = 0, raggioCal = 0, valore = 0, hx = 0, hy = 0;
  if (inGioco) {
    hx = h.x; hy = h.y; fuga = h.r + 85; presa = h.r * 0.9 + 5;
    risucchio = h.r + 30 * E.risucchio + (a.frenesiaT > 0 ? 40 : 0);
    raggioCal = 420 * (1 + (E.risucchio - 1) / 3);
    valore = valorePesciolino();
  }
  const smorza = Math.max(0, 1 - 3 * dt), vmax = calamita ? 440 : 140, kGira = Math.min(1, dt * 8), kFase = dt * 2.4;
  for (let i = 0; i < lista.length; i++) {
    const f = lista[i];
    if (f.morto > 0) {
      if (f.morto < MAI) { f.morto -= dt; if (f.morto <= 0) rinasce(f); }
      continue;
    }
    f.a += f.w * dt;
    const tx = f.b.x + Math.cos(f.a) * f.d, ty = f.b.y + Math.sin(f.a) * f.d;
    f.vx += (tx - f.x) * 4 * dt; f.vy += (ty - f.y) * 4 * dt;
    if (inGioco) {
      const dx = f.x - hx, dy = f.y - hy, d = Math.hypot(dx, dy) || 1;
      if (d < presa) { mangiaPesciolino(f, valore); continue; }
      if (calamita && d < raggioCal) { const s = 1500 * dt / d; f.vx -= dx * s; f.vy -= dy * s; }
      else if (d < risucchio) { const s = 900 * dt / d; f.vx -= dx * s; f.vy -= dy * s; }
      else if (d < fuga) { const s = 520 * dt / d * (1 - d / fuga); f.vx += dx * s; f.vy += dy * s; }
    }
    f.vx *= smorza; f.vy *= smorza;
    const v = Math.hypot(f.vx, f.vy);
    if (v > vmax) { f.vx *= vmax / v; f.vy *= vmax / v; }
    f.x += f.vx * dt; f.y += f.vy * dt;
    if (v > 6) f.ang += differenzaAngolo(f.ang, Math.atan2(f.vy, f.vx)) * kGira;
    f.fase += kFase * (1 + v * 0.01); if (f.fase >= 1) f.fase -= Math.floor(f.fase);
  }
}

/* Il banco dorato: raro, passa di corsa, resta poco e vale molto. */
function aggiornaDorato(dt) {
  const D = M.dorato;
  if (!D) return;
  D.t -= dt;
  if (!D.attivo) {
    if (D.t > 0) return;
    const b = D.banco, h = M.eroe;
    for (let i = 0; i < 20; i++) { puntoLontano(520, 320); if (Math.hypot(punto.x - h.x, punto.y - h.y) < 1300) break; }
    b.x = punto.x; b.y = punto.y; b.ang = Math.atan2(h.y - b.y, h.x - b.x) + caso(-0.6, 0.6); b.attivo = true;
    for (let i = D.primo; i < D.primo + D.quanti; i++) {
      const f = M.pesciolini[i];
      f.x = b.x + Math.cos(f.a) * f.d; f.y = b.y + Math.sin(f.a) * f.d; f.vx = 0; f.vy = 0; f.morto = 0;
    }
    D.attivo = true; D.vivi = D.quanti; D.t = DORATO_DURATA;
    annuncia('Banco dorato!', 'Vale molto di più: acchiappalo', 2.2); suono('perla');
    return;
  }
  if (D.t > 0 && D.vivi > 0) return;
  for (let i = D.primo; i < D.primo + D.quanti; i++) M.pesciolini[i].morto = MAI;      // se ne va
  D.attivo = false; D.banco.attivo = false; D.vivi = 0; D.t = D.spesso ? caso(35, 55) : caso(80, 130);
}

// ----- pesci grossi -----
function senti(e, inGioco) {
  S.inGioco = inGioco;
  if (!inGioco) {
    S.dx = 0; S.dy = 0; S.d = MAI; S.forte = false; S.vicino = false; S.ignora = true;
    e.minaccia = false; e.mangiabile = false; e.avviso = 0; e.sprint = 0; e.carica = 0;
    return;
  }
  const h = M.eroe, hp = h.p * E.morso;
  S.dx = h.x - e.x; S.dy = h.y - e.y; S.d = Math.hypot(S.dx, S.dy);
  S.forte = e.p >= hp;
  S.vicino = S.d < e.senso * M.vistaPesci + h.r + e.r;
  S.ignora = e.riposo > 0 || e.p > hp * (e.indole ? NON_TI_DEGNA : GIGANTE_NON_TI_DEGNA) + 20;
  e.mangiabile = hp > e.soglia;
  e.minaccia = !e.neutro && (S.forte || (!e.mangiabile && e.speciale !== null && e.speciale.punge));
}

function decidi(e, dt) {
  const m = mossa;
  m.vel = e.vel * e.crociera; m.verso = NaN; m.gira = 3.2; m.accel = 3; m.insegue = false; m.fugge = false;
  if (e.intoccabile > 0) e.intoccabile -= dt;
  if (e.sconfitto > 0) { m.vel = 0; e.stato = 'sconfitto'; return; }
  if (e.stordito > 0) { e.stordito -= dt; m.vel = 0; e.stato = 'stordito'; return; }
  if (e.sprint > 0) {                              // la carica: dritto come una freccia
    e.sprint -= dt; m.vel = e.vel * e.sprintMolt; m.gira = 0.5; m.accel = 9; m.verso = e.ang; m.insegue = true;
    if (e.sprint <= 0) { e.sprint = 0; e.carica = 0; if (e.indole) e.riposo = Math.max(e.riposo, caso(2.5, 4)); }
  } else if (e.avviso > 0) {                       // l'avviso: fermo, prende la mira
    e.avviso -= dt; e.carica = 1 - Math.max(0, e.avviso) / e.avvisoDurata;
    m.vel = 0; m.gira = 6; m.verso = Math.atan2(S.dy, S.dx); m.insegue = true;
    if (e.avviso <= 0) { e.avviso = 0; e.carica = 1; e.sprint = e.sprintDurata; if (!e.indole) suono('carica'); }
  } else if (e.indole) {
    e.indole.pensa(e, S, m, dt);
    if (S.inGioco && e.speciale && e.speciale.aggiorna) e.speciale.aggiorna(e, S, m, dt);
  } else B.giganti.pensa(e, S, m, dt, M);
  e.stato = e.sprint > 0 ? 'carica' : e.avviso > 0 ? 'avviso' : m.insegue ? 'caccia' : m.fugge ? 'fuga' : 'calmo';
}

function muovi(e, dt) {
  const m = mossa, L = M.largo, A = M.alto, bordo = e.r + 40;
  const fuori = e.x < bordo || e.x > L - bordo || e.y < bordo || e.y > A - bordo;
  if (fuori && !(m.insegue && m.verso === m.verso)) m.verso = Math.atan2(A / 2 - e.y, L / 2 - e.x);
  if (m.verso !== m.verso) {                       // gira per conto suo
    if (Math.random() < dt * 0.6) e.giro = caso(-1, 1);
    e.ang += e.giro * dt * 0.7;
  } else e.ang += limita(differenzaAngolo(e.ang, m.verso), -m.gira * dt, m.gira * dt);
  if (e.ang > Math.PI) e.ang -= TAU; else if (e.ang < -Math.PI) e.ang += TAU;
  e.vAtt += (m.vel - e.vAtt) * Math.min(1, dt * m.accel);
  e.fase = (e.fase + dt * (5 + e.vAtt * 0.04) / TAU) % 1;
  const bocca = m.insegue ? 0.55 + 0.4 * Math.sin(M.t * 9 + e.fase * TAU) : 0;
  e.bocca += (bocca - e.bocca) * Math.min(1, dt * 8);
  if (e.kx !== 0 || e.ky !== 0) {                  // spinta ricevuta (morso al gigante)
    const frena = Math.max(0, 1 - 4 * dt);
    e.kx *= frena; e.ky *= frena;
    if (Math.abs(e.kx) + Math.abs(e.ky) < 2) { e.kx = 0; e.ky = 0; }
  }
  e.x = limita(e.x + (Math.cos(e.ang) * e.vAtt + e.kx) * dt, e.r, L - e.r);
  e.y = limita(e.y + (Math.sin(e.ang) * e.vAtt + e.ky) * dt, e.r, A - e.r);
}

/* I pesci non si accavallano: si scostano un po', il più piccolo di più. */
function scosta(e, i, dt) {
  const lista = M.predatori, k = Math.min(1, dt * 6);
  for (let j = i - 1; j >= 0; j--) {
    const o = lista[j];
    if (o.mangiato > 0) continue;
    const ox = o.x - e.x, oy = o.y - e.y, min = (e.r + o.r) * 0.9, d2 = ox * ox + oy * oy;
    if (d2 >= min * min || d2 < 0.01) continue;
    const dd = Math.sqrt(d2), s = (min - dd) / dd * k, pe = o.r / (e.r + o.r);
    e.x -= ox * s * pe; e.y -= oy * s * pe; o.x += ox * s * (1 - pe); o.y += oy * s * (1 - pe);
  }
}

/* L'eroe e un pesce si toccano: si mangia, ci si fa male, si rimbalza, oppure niente (i timidi non fanno male). */
function tocca(e) {
  const h = M.eroe;
  if (e.nasce > 0 || e.intoccabile > 0 || e.sconfitto > 0 || S.d >= (h.r + e.r) * CONTATTO) return;
  if (e.mangiabile) { if (e.gigante) mordiGigante(e); else mangia(e); }
  else if (e.minaccia) colpito(e);
  else if (!e.neutro) rimbalza(e);
}

/* Risucchiato nella bocca dell'eroe; risponde true quando è sparito. */
function inghiotti(e, dt) {
  const h = M.eroe;
  e.mangiato -= dt;
  if (h) {
    const k = Math.min(1, dt * 14);
    e.x += (h.x + Math.cos(h.ang) * h.r * 0.7 - e.x) * k; e.y += (h.y + Math.sin(h.ang) * h.r * 0.7 - e.y) * k;
  }
  return e.mangiato <= 0;
}

function aggiornaPredatori(dt) {
  const lista = M.predatori, h = M.eroe;
  let inGioco = inPartita(), pericolo = 0, preda = 0, inseguitore = null;
  for (let i = lista.length - 1; i >= 0; i--) {
    const e = lista[i];
    if (e.mangiato > 0) { if (inghiotti(e, dt)) lista.splice(i, 1); continue; }
    e.nasce = Math.max(0, e.nasce - dt * 1.5);
    e.riposo = Math.max(0, e.riposo - dt);
    senti(e, inGioco);
    decidi(e, dt);
    if (inGioco) {
      if (S.forte && mossa.insegue && S.d < 420 + e.r) {
        const q = 1 - (S.d - e.r - h.r) / 420;
        if (q > pericolo) { pericolo = q; inseguitore = e; }
      }
      if (e.mangiabile && S.d < h.r * 2.6 + e.r) preda = 1;
    }
    muovi(e, dt);
    scosta(e, i, dt);
    if (inGioco) { tocca(e); inGioco = inPartita(); }
    if (e.sconfitto > 0) {                         // il gigante battuto: un attimo di scena, poi la vittoria
      e.sconfitto -= dt;
      if (e.sconfitto <= 0) { e.sconfitto = 0; e.mangiato = 0.3; e.via = true; if (stato === 'gioco') vittoria(); inGioco = false; }
    }
  }
  M.inseguitore = inseguitore;
  M.pericolo += (Math.min(1, pericolo) - M.pericolo) * Math.min(1, dt * 5);
  if (h) h.attesa += (preda - h.attesa) * Math.min(1, dt * 10);
}

function aggiornaRinascite(dt) {
  const lista = M.rinascite;
  for (let i = lista.length - 1; i >= 0; i--) {
    const r = lista[i];
    r.t -= dt;
    if (r.t > 0) continue;
    lista.splice(i, 1);
    if (stato === 'gioco') M.predatori.push(nuovoPesce(r.fascia, 0, false));
  }
}

function aggiornaPericoli(dt) {
  const h = M.eroe, inGioco = inPartita();
  for (const p of M.pericoli) {
    p.stordito = Math.max(0, p.stordito - dt);
    p.comportamento.aggiorna(p, dt, inGioco);
    if (inGioco && p.stordito <= 0 && Math.hypot(p.x - h.x, p.y - h.y) < h.r * 0.8 + p.r * 0.75) { colpito(p); if (!inPartita()) return; }
  }
}

/* Sopravvivenza: ogni tanto arriva un pericolo in più. */
function aggiungiPericoli(dt) {
  const cfg = M.cfg;
  if (!cfg.pericoloOgni || !cfg.pericoli.length) return;
  M.pericoloT -= dt;
  if (M.pericoloT > 0) return;
  M.pericoloT = cfg.pericoloOgni;
  if (M.pericoli.length < cfg.pericoliMax) M.pericoli.push(nuovoPericolo(cfg.pericoli[M.pericoli.length % cfg.pericoli.length]));
}

function aggiornaConchiglie(dt) {
  const h = M.eroe;
  for (const c of M.conchiglie) {
    c.attesa = Math.max(0, c.attesa - dt); c.apre = Math.max(0, c.apre - dt);
    if (c.attesa > 0 || Math.hypot(c.x - h.x, c.y - 22 - h.y) >= h.r + 46) continue;
    c.attesa = CONCHIGLIA_ATTESA; c.apre = 1.2;
    prendiPerle(PERLE_CONCHIGLIA, c.x, c.y - 60, 'conchiglia');
    scoppio(c.x, c.y - 30, COLORI.perla, 12, 200); suono('conchiglia');
  }
}

function prendiBolla(b) {
  const h = M.eroe, a = M.aiuti;
  scoppio(b.x, b.y, COLORI.spruzzo, 16, 240); suono('bolla'); vibra(20);
  emetti('aiuto', { tipo: b.tipo });
  if (b.tipo === 'x2' || b.tipo === 'x5') {
    const m = b.tipo === 'x2' ? 2 : 5;
    a.molt = Math.max(a.moltT > 0 ? a.molt : 1, m); a.moltT = MOLT_DURATA;
    testo(b.x, b.y, 'Tutto ×' + m + '!', COLORI.oro, true);
  } else if (b.tipo === 'calamita') { a.calamitaT = CALAMITA_DURATA + E.durataCalamita; testo(b.x, b.y, 'Calamita!', COLORI.calamita, true); }
  else if (b.tipo === 'scudo') { a.scudo = true; testo(b.x, b.y, 'Scudo!', COLORI.scudo, true); suono('scudo'); }
  else if (b.tipo === 'perla') { prendiPerle(PERLE_BOLLA, b.x, b.y, 'bolla'); suono('perla'); }
  else if (M.cuori < M.cuoriMax) { M.cuori++; testo(b.x, b.y, '+1 cuore', COLORI.cuoreScritta, true); suono('cuore'); h.felice = 0.8; }
  else { prendiPerle(PERLE_CUORE_PIENO, b.x, b.y, 'bolla'); suono('perla'); }
}

function aggiornaBolle(dt) {
  const h = M.eroe, lista = M.bolle;
  M.bollaT -= dt;
  if (M.bollaT <= 0) {
    M.bollaT = BOLLA_OGNI / E.bolle;
    if (lista.length < Math.min(12, BOLLE_MAX + Math.round((E.bolle - 1) * 3))) lista.push(nuovaBolla());
  }
  for (let i = lista.length - 1; i >= 0; i--) {
    const b = lista[i];
    if (Math.hypot(b.x - h.x, b.y - h.y) >= h.r + 30) continue;
    lista.splice(i, 1);
    prendiBolla(b);
  }
}

/* I guadagni dei pesciolini escono a gruppi (per non riempire lo schermo), e così l'evento 'pesciolini'. */
function aggiornaGruppi(dt) {
  const h = M.eroe;
  M.accumuloT -= dt;
  if (M.accumulo > 0 && M.accumuloT <= 0) {
    testo(h.x + caso(-h.r, h.r), h.y - h.r - 6, '+' + numero(M.accumulo), COLORI.boccone, false);
    M.accumulo = 0; M.accumuloT = 0.28;
  }
  M.gruppoT -= dt;
  if (M.gruppoT > 0) return;
  M.gruppoT = 0.5;
  if (M.gruppoQuanti > 0) { emetti('pesciolini', { quanti: M.gruppoQuanti, dorati: M.gruppoDorati }); M.gruppoQuanti = 0; M.gruppoDorati = 0; }
}

/* 'visto': la prima volta nella partita che un esemplare di una specie arriva a tiro d'occhio (circa 400 unità, di più
   quando l'eroe è grosso e la visuale è larga). */
function controllaVisti(dt) {
  M.vistoT -= dt;
  if (M.vistoT > 0) return;
  M.vistoT = 0.3;
  const h = M.eroe, raggio = 400 * Math.pow(Math.max(1, h.r / 22), 0.55);
  for (const e of M.predatori) {
    const id = e.def.id;
    if (M.visti[id] || e.nasce > 0.5 || Math.hypot(e.x - h.x, e.y - h.y) - e.r > raggio) continue;
    M.visti[id] = true;
    emetti('visto', { id });
  }
}

function aggiornaEffetti(dt) {
  const pp = M.particelle, frena = 1 - 2.5 * dt;
  for (let i = pp.length - 1; i >= 0; i--) {
    const p = pp[i];
    p.eta += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= frena; p.vy *= frena;
    if (p.eta >= p.vita) togliVeloce(pp, i, riserva.particelle);
  }
  const tt = M.testi;
  for (let i = 0; i < tt.length; i++) { tt[i].eta += dt; tt[i].y -= 46 * dt; }
  while (tt.length && tt[0].eta > 1) riserva.testi.push(tt.shift());
  const nn = M.nuvole;
  for (let i = 0; i < nn.length; i++) nn[i].eta += dt;
  while (nn.length && nn[0].eta >= nn[0].vita) riserva.nuvole.push(nn.shift());
}

/* La visuale segue l'eroe (guardando un po' avanti) e si allarga quando cresce. */
function aggiornaVisuale(dt, inGioco) {
  const v = B.vista, vw = (v && v.vw) || 390, vh = (v && v.vh) || 844, base = Math.min(vw, vh) / 400, cam = M.cam, h = M.eroe;
  let z = base * 0.8, x = M.guida.x, y = M.guida.y, k = Math.min(1, dt * 1.5);
  if (h) {
    const avanti = inGioco ? 0.22 : 0;
    z = base * Math.pow(22 / h.r, 0.55) * (M.scatto.attivo > 0 ? 0.94 : 1);
    x = h.x + h.vx * avanti; y = h.y + h.vy * avanti; k = Math.min(1, dt * 6);
  }
  cam.z += (z - cam.z) * Math.min(1, dt * 2.5);
  cam.x += (x - cam.x) * k; cam.y += (y - cam.y) * k;
  M.scossa = Math.max(0, M.scossa - dt * 30); M.lampo = Math.max(0, M.lampo - dt * 2.5);
}

function aggiornaDati() {
  const d = dati, h = M.eroe, a = M.aiuti, sc = M.scatto, ob = M.cfg.obiettivo, e = M.obiettivo, p = h ? h.p : 0;
  d.livello = M.livello; d.modalita = M.modalita; d.nomeAmbiente = M.ambiente.nome; d.potenza = p;
  if (ob) {
    const o = datiObiettivo;
    o.nome = ob.nome; o.potenza = e ? e.p : ob.potenza; o.morsi = e ? e.morsi : ob.morsi; o.morsiTotali = ob.morsi;
    d.obiettivo = o;
    d.avanzamento = Math.min(1, Math.log(p + 1) / Math.log(o.potenza + 2));
  } else {
    d.obiettivo = null;
    const fasce = M.cfg.fasce, cima = fasce.length ? fasce[fasce.length - 1].min : 1, base = M.ottava > 0 ? cima / M.cfg.ottava.potenza : 0;
    d.avanzamento = limita((Math.log(p + 1) - Math.log(base + 1)) / (Math.log(cima + 1) - Math.log(base + 1) || 1), 0, 1);
  }
  d.cuori = M.cuori; d.cuoriMax = M.cuoriMax; d.perle = M.perle; d.tempo = M.tempo;
  d.frenesia = a.frenesiaT > 0 ? a.frenesiaT / a.frenesiaDurata : a.frenesia; d.frenesiaT = a.frenesiaT;
  d.molt = a.moltT > 0 ? a.molt : 1; d.moltT = a.moltT; d.calamitaT = a.calamitaT; d.scudo = a.scudo;
  d.scatto = sc.durataRicarica > 0 ? 1 - sc.ricarica / sc.durataRicarica : 1;
  d.fascia = M.fascia; d.ottava = M.ottava;
}

/* Un passo del mondo. Vive anche fuori dalla partita (menu, vittoria, sconfitta): i pesci girano tranquilli. */
function passo(dt) {
  M.t += dt;
  const h = M.eroe;
  if (inPartita()) aggiornaEroe(dt); else if (!h) aggiornaGuida();
  aggiornaCorrente();
  aggiornaBanchi(dt);
  aggiornaPesciolini(dt, inPartita());
  aggiornaPredatori(dt);
  aggiornaRinascite(dt);
  aggiornaPericoli(dt);
  if (inPartita()) {
    aggiornaConchiglie(dt);
    aggiornaBolle(dt);
    aggiornaDorato(dt);
    aggiornaGruppi(dt);
    controllaVisti(dt);
    aggiungiPericoli(dt);
  }
  if (h) aggiornaEspressione(h, dt);
  aggiornaEffetti(dt);
  aggiornaVisuale(dt, inPartita());
  aggiornaDati();
}

// =====================================================================
//  8. B.partita
// =====================================================================
function avvia(opzioni) {
  const o = opzioni || {}, modalita = o.modalita === 'sopravvivenza' ? 'sopravvivenza' : 'avventura';
  if (stato === 'gioco' || stato === 'pausa') abbandona();
  const cfg = modalita === 'sopravvivenza' ? B.livelli.configSopravvivenza(o.ambiente) : B.livelli.config(o.livello || 1);
  creaMondo(cfg, true);
  stato = 'gioco';
  emetti('partita:inizio', { livello: M.livello, modalita, ambiente: M.ambiente.id, eroe: M.eroe.def ? M.eroe.def.id : '' });
  const ob = cfg.obiettivo;
  if (!ob) annuncia('Sopravvivenza', M.ambiente.nome + ' · resisti più che puoi', 2.6);
  else annuncia('Livello ' + cfg.n, M.ambiente.nome + (ob.tipo === 'gigante' ? ' · affronta ' + ob.nome : ' · mangia il capobranco'), 2.6);
  return M;
}

function pausa() { if (stato === 'gioco') stato = 'pausa'; }
function riprendi() { if (stato === 'pausa') stato = 'gioco'; }

/* Lascia la partita in corso: il mondo resta, senza eroe, come acquario dietro alle schermate. */
function abbandona() {
  if (stato === 'gioco' || stato === 'pausa') chiudi('abbandonato', 0);
  stato = 'ferma';
  if (M && M.eroe) { M.guida.x = M.eroe.x; M.guida.y = M.eroe.y; M.eroe = null; M.pericolo = 0; M.inseguitore = null; }
}

function scatta() {
  if (stato !== 'gioco' || !inPartita()) return false;
  const sc = M.scatto;
  if (sc.ricarica > 0) return false;
  sc.attivo = sc.durata; sc.ricarica = sc.durataRicarica;
  suono('scatto'); vibra(15); emetti('scatto', {});
  return true;
}

/* Un mondo senza eroe per fare da sfondo vivo al menu. */
function sfondoMenu(idAmbiente) {
  if (stato === 'gioco' || stato === 'pausa') abbandona();
  const scheda = B.cast.ambienti.find(a => a.id === idAmbiente) || B.cast.ambienti[0];
  creaMondo(B.livelli.config((scheda.ordine - 1) * B.livelli.perAmbiente + 2), false);
  stato = 'ferma';
  return M;
}

function aggiorna(dt) {
  if (!M || stato === 'pausa' || !(dt > 0)) return;
  passo(Math.min(dt, 0.05));
}

B.partita = {
  avvia, aggiorna, pausa, riprendi, abbandona, scatta, sfondoMenu,
  get stato() { return stato; },
  get mondo() { return M; },
  dati,
  raggioEroe,
  // tabelle da estendere (vedi ARCHITETTURA §8) e attrezzi per chi scrive attacchi e comportamenti
  indoli: INDOLI, speciali: SPECIALI, comportamenti: COMPORTAMENTI,
  attrezzi: { suono, vibra, annuncia, scoppio, testo, nuvola, prendiPerle, puntoLontano, preparaCarica, colpito, insegui, fuggi },
};
})();
