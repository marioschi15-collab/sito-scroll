import path from 'node:path';

/** ~400 token di testo italiano ≈ 1.600 caratteri (docs/03 §7). */
export const CARATTERI_PER_BLOCCO = 1600;
const LUNGHEZZA_MASSIMA_TITOLO = 120;

/** Un pezzo di file indicizzato da solo: ha un titolo (l'intestazione), il testo e le etichette del frontmatter. */
export interface Blocco {
  /** L'intestazione della sezione (o il titolo del file per il testo prima della prima intestazione). */
  titolo: string;
  /** Per le sotto-sezioni, il titolo del file: cercabile con peso basso, mostrato come "File › sezione". */
  contesto: string;
  testo: string;
  /** Valori di `type` e `tags` del frontmatter, solo sul primo blocco del file. */
  etichette: string;
  /** Posizione nel file (0, 1, 2…). */
  ordine: number;
}

interface Sezione {
  intestazione: string | undefined;
  livello: number;
  righe: string[];
}

const INTESTAZIONE = /^(#{1,6})\s+(.*?)\s*#*\s*$/;

/** Separa il frontmatter (`---` … `---` in testa) dal corpo. Senza chiusura, tutto è corpo. */
export function separaFrontmatter(contenuto: string): { frontmatter: string[]; corpo: string } {
  const righe = contenuto.split('\n');
  if (righe[0]?.trim() !== '---') return { frontmatter: [], corpo: contenuto };
  for (let i = 1; i < righe.length; i++) {
    if (righe[i]?.trim() === '---') return { frontmatter: righe.slice(1, i), corpo: righe.slice(i + 1).join('\n') };
  }
  return { frontmatter: [], corpo: contenuto };
}

/** Etichette cercabili dal frontmatter: i valori di `type` e `tags` ("[a, b]" oppure elenco "- a"). Lettura elementare, senza YAML. */
export function etichetteDaFrontmatter(frontmatter: string[]): string {
  const valori: string[] = [];
  let inElenco = false;
  for (const riga of frontmatter) {
    const campo = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(riga);
    if (campo) {
      const chiave = campo[1]!.toLowerCase();
      const valore = campo[2]!.trim();
      inElenco = false;
      if (chiave !== 'type' && chiave !== 'tags') continue;
      if (valore === '') {
        inElenco = true;
        continue;
      }
      valori.push(...valore.replace(/^\[|\]$/g, '').split(',').map(pulisciValore).filter(Boolean));
      continue;
    }
    const voce = /^\s*-\s+(.+)$/.exec(riga);
    if (inElenco && voce) valori.push(pulisciValore(voce[1]!));
    else inElenco = false;
  }
  return valori.join(' ');
}

function pulisciValore(v: string): string {
  return v.trim().replace(/^["']|["']$/g, '').trim();
}

/** Titolo di ripiego dal nome del file: "cliente-lamberti.md" → "cliente lamberti". */
export function titoloDaNomeFile(fileRelativo: string): string {
  const base = path.posix.basename(fileRelativo.replace(/\\/g, '/'), '.md');
  return base.replace(/[-_]+/g, ' ').trim() || fileRelativo;
}

/**
 * Spezza un file Markdown in blocchi per intestazione (`#`, `##`, …) e, se una sezione è lunga,
 * in pezzi di al massimo CARATTERI_PER_BLOCCO (prima per paragrafi, poi per righe, infine a forza).
 */
export function spezzaInBlocchi(contenuto: string, fileRelativo: string): Blocco[] {
  const normalizzato = contenuto.normalize('NFC').replace(/\r\n?/g, '\n');
  const { frontmatter, corpo } = separaFrontmatter(normalizzato);
  const etichette = etichetteDaFrontmatter(frontmatter);
  const sezioni = separaSezioni(corpo);
  const titoloFile = sezioni.find((s) => s.livello === 1)?.intestazione ?? titoloDaNomeFile(fileRelativo);

  const blocchi: Blocco[] = [];
  for (const sezione of sezioni) {
    const testo = sezione.righe.join('\n').trim();
    if (!testo) continue;
    const { titolo, contesto } = titoloSezione(sezione, titoloFile);
    for (const pezzo of spezzaTesto(testo, CARATTERI_PER_BLOCCO)) {
      blocchi.push({ titolo, contesto, testo: pezzo, etichette: blocchi.length === 0 ? etichette : '', ordine: blocchi.length });
    }
  }
  return blocchi;
}

function separaSezioni(corpo: string): Sezione[] {
  const sezioni: Sezione[] = [{ intestazione: undefined, livello: 0, righe: [] }];
  let inCodice = false;
  for (const riga of corpo.split('\n')) {
    if (/^\s*```/.test(riga)) inCodice = !inCodice;
    const m = inCodice ? null : INTESTAZIONE.exec(riga);
    if (m) sezioni.push({ intestazione: m[2]!.trim(), livello: m[1]!.length, righe: [] });
    else sezioni[sezioni.length - 1]!.righe.push(riga);
  }
  return sezioni;
}

/**
 * Titolo e contesto di un blocco: l'intestazione della sezione; per le sotto-sezioni il titolo del file va nel
 * contesto (peso basso nell'indice), così un blocco corto non "ruba" la rilevanza del titolo al blocco principale.
 */
function titoloSezione(sezione: Sezione, titoloFile: string): { titolo: string; contesto: string } {
  if (!sezione.intestazione) return { titolo: accorcia(titoloFile), contesto: '' };
  if (sezione.livello <= 1 || sezione.intestazione === titoloFile) return { titolo: accorcia(sezione.intestazione), contesto: '' };
  return { titolo: accorcia(sezione.intestazione), contesto: accorcia(titoloFile) };
}

function accorcia(titolo: string): string {
  return titolo.length > LUNGHEZZA_MASSIMA_TITOLO ? `${titolo.slice(0, LUNGHEZZA_MASSIMA_TITOLO - 1)}…` : titolo;
}

/** Spezza un testo in pezzi ≤ limite caratteri senza tagliare paragrafi o righe, finché possibile. */
export function spezzaTesto(testo: string, limite: number): string[] {
  if (testo.length <= limite) return [testo];
  const pezzi: string[] = [];
  let corrente = '';
  const aggiungi = (frammento: string, separatore: string) => {
    if (!corrente) {
      corrente = frammento;
    } else if (corrente.length + separatore.length + frammento.length <= limite) {
      corrente += separatore + frammento;
    } else {
      pezzi.push(corrente);
      corrente = frammento;
    }
  };
  for (const paragrafo of testo.split(/\n{2,}/)) {
    if (paragrafo.length <= limite) {
      aggiungi(paragrafo, '\n\n');
      continue;
    }
    for (const riga of paragrafo.split('\n')) {
      if (riga.length <= limite) {
        aggiungi(riga, '\n');
        continue;
      }
      for (let i = 0; i < riga.length; i += limite) aggiungi(riga.slice(i, i + limite), '\n');
    }
  }
  if (corrente) pezzi.push(corrente);
  return pezzi;
}
