/* Boccone — nucleo: spazio dei nomi B, utilità, eventi e registri dei contenuti.
   Nessuna dipendenza. Tutti gli altri file partono da qui (vedi ARCHITETTURA.md). */
(() => {
'use strict';
const B = window.B = window.B || {};
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- utilità
B.util = {
  TAU,
  caso: (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a),
  intero: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  limita: (v, a, b) => v < a ? a : v > b ? b : v,
  scegli: lista => lista[Math.floor(Math.random() * lista.length)],
  lerp: (a, b, t) => a + (b - a) * t,
  dolce: t => { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); },
  differenzaAngolo: (da, a) => ((a - da + Math.PI * 3) % TAU) - Math.PI,
  /* Generatore casuale ripetibile: const caso = B.util.semi(42); caso() → [0,1) */
  semi(seme) {
    let s = (seme >>> 0) || 1;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
  /* Numero fisso in [0,1) a partire da un indice: per variare i dettagli di un modello senza Math.random. */
  rumore(i, seme = 0) {
    let h = (Math.imul((i | 0) + 1, 0x9E3779B1) ^ Math.imul((seme | 0) + 7, 0x85EBCA6B)) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 0x2C1B3C6D) >>> 0; h = Math.imul(h ^ (h >>> 12), 0x297A2D39) >>> 0;
    return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
  },
  numero: n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + ' mln' : Math.round(n).toLocaleString('it-IT'),
  tela(w, h) { const t = document.createElement('canvas'); t.width = Math.max(1, Math.round(w)); t.height = Math.max(1, Math.round(h)); return t; },
};

// ---------------------------------------------------------------- eventi
const ascoltatori = new Map();
B.eventi = {
  su(nome, fn) { if (!ascoltatori.has(nome)) ascoltatori.set(nome, new Set()); ascoltatori.get(nome).add(fn); return () => B.eventi.via(nome, fn); },
  via(nome, fn) { const s = ascoltatori.get(nome); if (s) s.delete(fn); },
  emetti(nome, dati) {
    const s = ascoltatori.get(nome); if (!s) return;
    for (const fn of [...s]) { try { fn(dati); } catch (e) { console.error('[Boccone] errore in un ascoltatore di "' + nome + '"', e); } }
  },
};

// ---------------------------------------------------------------- registri
const ID_VALIDO = /^[a-z][a-z0-9_]*$/;
function schedaCast(elenco, id) { return (B.cast && B.cast[elenco] || []).find(v => v.id === id) || null; }

function registro(etichetta, elencoCast, completa) {
  const mappa = new Map();
  return {
    /* Registra una definizione. I campi mancanti si ereditano dalla scheda con lo stesso id in B.cast.
       Una definizione vera sostituisce sempre una provvisoria (provvisoria: true), mai il contrario. */
    registra(def) {
      if (!def || typeof def !== 'object') throw new Error(etichetta + ': la definizione deve essere un oggetto');
      if (!ID_VALIDO.test(def.id || '')) throw new Error(etichetta + ': id non valido "' + def.id + '" (solo minuscole, cifre e _)');
      const scheda = schedaCast(elencoCast, def.id);
      if (!scheda && !def.provvisoria) console.warn('[Boccone] ' + etichetta + ' "' + def.id + '" non è nel cast (01-cast.js)');
      const pieno = completa(Object.assign({}, scheda || {}, def), etichetta);
      const gia = mappa.get(pieno.id);
      if (gia && !gia.provvisoria && pieno.provvisoria) return gia;
      if (gia && !gia.provvisoria && !pieno.provvisoria) console.warn('[Boccone] ' + etichetta + ' "' + pieno.id + '" registrato due volte: vale l\'ultimo');
      mappa.set(pieno.id, pieno);
      return pieno;
    },
    prendi: id => mappa.get(id) || null,
    ha: id => mappa.has(id),
    tutte: () => [...mappa.values()],
  };
}

function pretendi(cond, messaggio) { if (!cond) throw new Error(messaggio); }

const TIPI = ['pesce', 'gigante', 'banco', 'pericolo'];
B.specie = registro('specie', 'specie', (d, e) => {
  d.tipo = d.tipo || 'pesce';
  pretendi(TIPI.includes(d.tipo), e + ' ' + d.id + ': tipo sconosciuto "' + d.tipo + '"');
  pretendi(typeof d.disegna === 'function', e + ' ' + d.id + ': manca disegna(c, o)');
  pretendi(typeof d.nome === 'string' && d.nome, e + ' ' + d.id + ': manca il nome');
  d.plurale = d.plurale || d.nome;
  d.forma = Object.assign({ lx: 1.2, ly: 0.8 }, d.forma || {});
  if (!d.ingombro) d.ingombro = { x0: -(d.forma.lx + 1.1), y0: -(d.forma.ly + 0.9), x1: d.forma.lx + 0.5, y1: d.forma.ly + 0.9 };
  d.assetto = d.assetto || 'libero';
  d.indole = d.indole || 'cacciatore';
  d.ambienti = d.ambienti || [];
  d.fotogrammi = d.fotogrammi || 8;
  if (d.tipo === 'pesce') pretendi(d.taglia >= 1 && d.taglia <= 5, e + ' ' + d.id + ': taglia deve essere tra 1 e 5');
  return d;
});
B.specie.diTipo = tipo => B.specie.tutte().filter(s => s.tipo === tipo);

B.eroi = registro('eroe', 'eroi', (d, e) => {
  pretendi(typeof d.disegna === 'function', e + ' ' + d.id + ': manca disegna(c, o)');
  pretendi(typeof d.nome === 'string' && d.nome, e + ' ' + d.id + ': manca il nome');
  d.stadi = d.stadi || 3;
  d.costo = d.costo || 0;
  d.effetti = d.effetti || {};
  if (!d.ingombro) d.ingombro = { x0: -2.2, y0: -1.6, x1: 1.5, y1: 1.6 };
  return d;
});

B.ambienti = registro('ambiente', 'ambienti', (d, e) => {
  for (const f of ['crea', 'sfondo', 'dietro', 'davanti', 'velo']) pretendi(typeof d[f] === 'function', e + ' ' + d.id + ': manca ' + f + '()');
  pretendi(typeof d.nome === 'string' && d.nome, e + ' ' + d.id + ': manca il nome');
  d.mondo = Object.assign({ w: 2600, h: 2600 }, d.mondo || {});
  d.colori = d.colori || {};
  d.banchi = d.banchi || []; d.pericoli = d.pericoli || [];
  return d;
});
B.ambienti.inOrdine = () => B.ambienti.tutte().sort((a, b) => (a.ordine || 99) - (b.ordine || 99));
})();
