import { assoluto, leggiTesto } from './fs-util.js';
import { FILE_ONBOARDING, MARCA_DA_COMPILARE } from './stato.js';
import { testiOnboarding as t } from './testi.js';

/** Una voce di profilo/UTENTE.md (docs/03 §4.3): direttiva + commento osservato/stato/fonte. */
export interface Direttiva {
  testo: string;
  /** AAAA-MM-GG */
  osservato?: string;
  stato: 'attivo' | 'superato';
  superatoIl?: string;
  fonte?: string;
  /** La riga è ancora quella del modello "(da compilare…)". */
  daCompilare: boolean;
}

const META = /^<!--\s*osservato:\s*(.*?)\s*\|\s*stato:\s*(.*?)\s*\|\s*fonte:\s*(.*?)\s*-->$/;

/** Legge le direttive di UTENTE.md: una per voce "- …", con il commento di provenienza che la precede. */
export function leggiDirettive(markdown: string): Direttiva[] {
  const direttive: Direttiva[] = [];
  let meta: Pick<Direttiva, 'osservato' | 'stato' | 'superatoIl' | 'fonte'> | undefined;
  let corrente: Direttiva | undefined;
  let inCommento = false;

  for (const grezza of markdown.split(/\r?\n/)) {
    const riga = grezza.trim();
    if (inCommento) {
      if (riga.includes('-->')) inCommento = false;
      continue;
    }
    const m = META.exec(riga);
    if (m) {
      const stato = (m[2] ?? '').toLowerCase();
      meta = {
        osservato: m[1] || undefined,
        stato: stato.startsWith('superato') ? 'superato' : 'attivo',
        superatoIl: /\d{4}-\d{2}-\d{2}/.exec(stato)?.[0],
        fonte: m[3] || undefined,
      };
      corrente = undefined;
      continue;
    }
    if (riga.startsWith('<!--')) {
      if (!riga.includes('-->')) inCommento = true;
      corrente = undefined;
      continue;
    }
    if (riga.startsWith('- ')) {
      const testo = riga.slice(2).trim();
      corrente = { testo, stato: meta?.stato ?? 'attivo', osservato: meta?.osservato, superatoIl: meta?.superatoIl, fonte: meta?.fonte, daCompilare: testo.includes(MARCA_DA_COMPILARE) };
      direttive.push(corrente);
      meta = undefined;
      continue;
    }
    if (riga.length === 0 || riga.startsWith('#')) {
      corrente = undefined;
      continue;
    }
    if (corrente) {
      corrente.testo += ` ${riga}`;
      corrente.daCompilare = corrente.daCompilare || riga.includes(MARCA_DA_COMPILARE);
    }
  }
  return direttive;
}

function dataItaliana(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

function provenienza(d: Direttiva): string {
  const parti: string[] = [];
  if (d.fonte) parti.push(t.profilo.fonte[d.fonte] ?? d.fonte);
  const data = dataItaliana(d.osservato);
  if (data) parti.push(data);
  return parti.length > 0 ? ` (${parti.join(', ')})` : '';
}

/** "Lavoro: …" → "Lavoro"; senza due punti, le prime parole. */
function etichetta(d: Direttiva): string {
  const i = d.testo.indexOf(':');
  if (i > 0) return d.testo.slice(0, i).trim();
  const parole = d.testo.split(/\s+/);
  return parole.length > 5 ? `${parole.slice(0, 5).join(' ')}…` : d.testo;
}

function righeIdentita(cartella: string): string[] {
  const identita = leggiTesto(assoluto(cartella, FILE_ONBOARDING.identita)) ?? '';
  const righe: string[] = [];
  for (const grezza of identita.split(/\r?\n/)) {
    const m = /^-\s*([^:]+):\s*(.+)$/.exec(grezza.trim());
    if (!m) continue;
    const chiave = (m[1] ?? '').toLowerCase();
    const valore = (m[2] ?? '').trim();
    if (valore.includes(MARCA_DA_COMPILARE)) continue;
    if (chiave.startsWith('nome dell')) righe.push(t.profilo.mioNome(valore));
    else if (chiave === 'utente') righe.push(t.profilo.utente(valore.replace(/\.$/, '')));
  }
  return righe;
}

/**
 * "Cosa sai di me?" (docs/05 §7): le direttive attive di profilo/UTENTE.md in italiano semplice, con la
 * provenienza tra parentesi; prima, se già scelti, il nome dell'assistente e come chiamare l'utente.
 */
export function componiRiepilogoProfilo(cartella: string): string {
  const direttive = leggiDirettive(leggiTesto(assoluto(cartella, FILE_ONBOARDING.utente)) ?? '');
  const attive = direttive.filter((d) => d.stato === 'attivo' && !d.daCompilare);
  const daCompilare = direttive.filter((d) => d.stato === 'attivo' && d.daCompilare);
  const superate = direttive.filter((d) => d.stato === 'superato').length;

  const righe = righeIdentita(cartella);
  if (attive.length === 0) {
    righe.push(t.profilo.vuoto);
    if (daCompilare.length > 0) righe.push(t.profilo.mancano(daCompilare.map(etichetta).join(', ')));
    return righe.join('\n');
  }
  righe.push(t.profilo.intestazione);
  for (const d of attive) righe.push(`- ${d.testo}${provenienza(d)}`);
  if (daCompilare.length > 0) righe.push(t.profilo.mancano(daCompilare.map(etichetta).join(', ')));
  if (superate > 0) righe.push(t.profilo.superate(superate));
  return righe.join('\n');
}

/** Versione asincrona, per il resto dell'app ("cosa sai di me?" dal terminale o da Telegram). */
export async function riepilogoProfilo(cartella: string): Promise<string> {
  return componiRiepilogoProfilo(cartella);
}
