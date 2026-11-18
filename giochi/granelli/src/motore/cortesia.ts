import { chiaveDi, tipoDi } from '../contenuti/registro.js';
import type { Creatura } from './creature.js';
import { CIBO, GAS, LIQUIDO, M, MORTALE, N_BASE, POLVERE, PRIMA_ID_MISCELA, STATO } from './materiali.js';
import { SOGLIA, faMale, siMangia } from './miscele.js';
import type { Mondo } from './mondo.js';
import type { Omino } from './omini.js';

/**
 * Le reazioni di cortesia: quando chi gioca porta su un omino (o su una creatura) una cosa con cui non nasce niente,
 * il bersaglio reagisce lo stesso, secondo che cosa gli è arrivato addosso. Mai un «niente» muto.
 * Ogni reazione è un numero negativo, da mettere nella `nuvoletta` di chi reagisce (i numeri positivi, lì, sono le
 * idee che un omino sta pensando): chi disegna ci mette sopra il suo segno.
 */
/** Scappa: il fuoco, la lava, un fulmine, qualcosa che fa male. Si gira e corre via per un po'. */
export const SCAPPA = -1;
/** Beve: l'acqua. A un omino passa la sete. */
export const BEVE = -2;
/** Annusa: qualcosa da mangiare. */
export const ANNUSA = -3;
/** Guarda la cosa e scuote la testa: un oggetto, una costruzione, qualcosa che non gli serve. */
export const GUARDA = -4;
/** Starnutisce: polvere, fumo, aria che soffia. */
export const STARNUTISCE = -5;
/** Trema: la neve, il ghiaccio. */
export const TREMA = -6;
/** Saltella contento: un animale. */
export const SALTELLA = -7;
/** Ci pensa su: un'idea, un mestiere, un posto, qualcosa che non si tocca con le mani. */
export const PENSA = -8;

/** Tutte le reazioni, per chi le vuole elencare (le prove, chi disegna i segni). */
export const REAZIONI_DI_CORTESIA = [SCAPPA, BEVE, ANNUSA, GUARDA, STARNUTISCE, TREMA, SALTELLA, PENSA] as const;

/** Per quanti istanti dura una reazione (due secondi e mezzo). */
export const DURATA_CORTESIA = 150;

/** Le cose da mangiare tra gli oggetti: le riconosce dalla chiave, che non cambia mai. */
const CIBI = new Set(['pane', 'focaccia', 'minestra', 'miele', 'farina', 'raccolto']);

/** Come reagisce chi riceve una sostanza (un materiale o una miscela) che con lui non fa niente. */
function perSostanza(m: Mondo, id: number): number {
  if (id < N_BASE) {
    if (MORTALE[id]) return SCAPPA;
    if (id === M.ACQUA) return BEVE;
    if (id === M.NEVE || id === M.GHIACCIO) return TREMA;
    if (CIBO[id]) return ANNUSA;
    const stato = STATO[id];
    if (stato === GAS || stato === POLVERE) return STARNUTISCE;
    return stato === LIQUIDO ? ANNUSA : GUARDA;
  }
  const s = m.sostanzaDi(id);
  if (!s) return GUARDA;
  if (s.calore > SOGLIA.calore || faMale(s)) return SCAPPA;
  if (siMangia(s)) return ANNUSA;
  if (s.stato === GAS || s.stato === POLVERE) return STARNUTISCE;
  return s.stato === LIQUIDO ? ANNUSA : GUARDA;
}

/** La reazione di chi si vede arrivare addosso la cosa `id`, con cui non nasce niente. */
export function reazioneA(m: Mondo, id: number): number {
  if (id >= PRIMA_ID_MISCELA || (id > 0 && id < N_BASE)) return perSostanza(m, id);
  switch (tipoDi(id)) {
    case 'creatura':
      return SALTELLA;
    case 'oggetto':
      return CIBI.has(chiaveDi(id) ?? '') ? ANNUSA : GUARDA;
    case 'idea':
    case 'mestiere':
    case 'luogo':
    case 'fenomeno':
    case 'era':
      return PENSA;
    default:
      return GUARDA;
  }
}

/**
 * Fa reagire un omino o una creatura alla cosa `id` che gli è stata portata addosso senza esito. La reazione si vede
 * per un paio di secondi; chi scappa si gira e corre via, chi beve si leva la sete. Restituisce la reazione.
 */
export function reagisciConCortesia(m: Mondo, chi: Omino | Creatura, id: number): number {
  const r = reazioneA(m, id);
  chi.nuvoletta = r;
  chi.nuvolettaFino = m.tic + DURATA_CORTESIA;
  if (r === SCAPPA) chi.dir = chi.dir === 1 ? -1 : 1;
  if (r === BEVE && 'sete' in chi) chi.sete = 0;
  return r;
}
