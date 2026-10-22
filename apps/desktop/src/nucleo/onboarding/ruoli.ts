import { SEGNAPOSTO } from '@spalla/schema';
import { assoluto, elencaMarkdown, esiste, leggiTesto, rimuoviFile, scriviTesto } from './fs-util.js';
import { testiOnboarding as t } from './testi.js';

export const CARTELLA_RUOLI_ACCESI = '.claude/agents';
export const CARTELLA_RUOLI_SPENTI = '.claude/agents-spenti';
/** Ruoli sempre accesi che non occupano uno dei tre posti (docs/04 §4.1, PRIMO-AVVIO §S5). */
export const RUOLI_SEMPRE_ACCESI: readonly string[] = ['critico', 'archivista'];
/** Regola dei tre. */
export const MASSIMO_RUOLI_ACCESI = 3;

const NOME_RUOLO = /^[a-z0-9][a-z0-9-]{0,63}$/;
/** Riga che l'assistente lascia in .claude/agents/<ruolo>.md quando spegne un ruolo (CLAUDE.md "Squadra"). */
const MARCA_SPENTO = /^spento il \d{4}-\d{2}-\d{2}/i;

/** True se il file è il segnaposto "spento il AAAA-MM-GG" senza intestazione: Claude Code lo ignora. */
export function eMarcaSpento(testo: string): boolean {
  const prima = testo.split(/\r?\n/).find((r) => r.trim().length > 0) ?? '';
  return MARCA_SPENTO.test(prima.trim());
}

interface Intestazione {
  /** Offset del primo carattere del YAML. */
  inizio: number;
  /** Offset subito dopo l'ultimo carattere del YAML (prima dell'a-capo che precede "---"). */
  fine: number;
}

function trovaIntestazione(markdown: string): Intestazione | undefined {
  const apertura = /^---[ \t]*\r?\n/.exec(markdown);
  if (!apertura) return undefined;
  const inizio = apertura[0].length;
  const chiusura = /\r?\n---[ \t]*(?=\r?\n|$)/.exec(markdown.slice(inizio));
  if (!chiusura) return undefined;
  return { inizio, fine: inizio + chiusura.index };
}

export function haIntestazione(markdown: string): boolean {
  return trovaIntestazione(markdown) !== undefined;
}

/** Riscrive `attivo: true|false` nel blocco spalla dell'intestazione lasciando intatto tutto il resto (commenti compresi). */
export function impostaAttivo(markdown: string, attivo: boolean, file = 'ruolo'): string {
  const i = trovaIntestazione(markdown);
  if (!i) throw new Error(t.errori.ruoloSenzaIntestazione(file));
  const yaml = markdown.slice(i.inizio, i.fine);
  const daSpalla = yaml.search(/^spalla:[ \t]*$/m);
  const base = daSpalla >= 0 ? daSpalla : 0;
  const coda = yaml.slice(base);
  const m = /^([ \t]*attivo:[ \t]*)(true|false)\b/m.exec(coda);
  if (!m) throw new Error(t.errori.ruoloSenzaAttivo(file));
  const nuovaCoda = coda.slice(0, m.index) + (m[1] ?? '') + String(attivo) + coda.slice(m.index + m[0].length);
  return markdown.slice(0, i.inizio) + yaml.slice(0, base) + nuovaCoda + markdown.slice(i.fine);
}

export interface OpzioniAttivazione {
  /** Sostituisce {{NOME_UTENTE}} nel corpo del ruolo. */
  nomeUtente?: string;
  /** Sostituisce {{MESTIERE}} nel corpo del ruolo. */
  mestiere?: string;
  /** Sostituisce un eventuale {{DATA_OGGI}} rimasto (AAAA-MM-GG). */
  dataOggi?: string;
}

/** Compila i segnaposto del ruolo di cui si conosce il valore; gli altri restano. */
export function compilaSegnapostoRuolo(markdown: string, o: OpzioniAttivazione): string {
  let testo = markdown;
  if (o.nomeUtente) testo = testo.split(SEGNAPOSTO.NOME_UTENTE).join(o.nomeUtente);
  if (o.mestiere) testo = testo.split(SEGNAPOSTO.MESTIERE).join(o.mestiere);
  if (o.dataOggi) testo = testo.split(SEGNAPOSTO.DATA_OGGI).join(o.dataOggi);
  return testo;
}

export interface EsitoRuolo {
  nome: string;
  /** Dove sta ora il file del ruolo (relativo alla cartella di lavoro). */
  file: string;
  /** False se non c'era niente da fare (già acceso / già spento). */
  cambiato: boolean;
}

function controllaNome(nome: string): void {
  if (!NOME_RUOLO.test(nome)) throw new Error(t.errori.nomeRuoloNonValido(nome));
}

/** Nomi dei ruoli con intestazione valida in agents/ e agents-spenti/ (i segnaposto "spento il…" non contano). */
export function elencoRuoli(cartella: string): { accesi: string[]; spenti: string[] } {
  const nomi = (dir: string): string[] =>
    elencaMarkdown(assoluto(cartella, dir))
      .filter((f) => {
        const testo = leggiTesto(assoluto(cartella, `${dir}/${f}`));
        return testo !== undefined && haIntestazione(testo);
      })
      .map((f) => f.slice(0, -'.md'.length));
  return { accesi: nomi(CARTELLA_RUOLI_ACCESI), spenti: nomi(CARTELLA_RUOLI_SPENTI) };
}

/**
 * Accende un ruolo: sposta .claude/agents-spenti/<nome>.md in .claude/agents/<nome>.md con `attivo: true`
 * e, se forniti, nome dell'utente e mestiere al posto dei segnaposto. Se è già acceso, allinea solo `attivo`.
 */
export async function attivaRuolo(cartella: string, nome: string, opzioni: OpzioniAttivazione = {}): Promise<EsitoRuolo> {
  controllaNome(nome);
  const relAcceso = `${CARTELLA_RUOLI_ACCESI}/${nome}.md`;
  const relSpento = `${CARTELLA_RUOLI_SPENTI}/${nome}.md`;
  const acceso = assoluto(cartella, relAcceso);
  const spento = assoluto(cartella, relSpento);

  const testoAcceso = leggiTesto(acceso);
  if (testoAcceso !== undefined && haIntestazione(testoAcceso)) {
    const nuovo = compilaSegnapostoRuolo(impostaAttivo(testoAcceso, true, relAcceso), opzioni);
    if (nuovo !== testoAcceso) scriviTesto(acceso, nuovo);
    return { nome, file: relAcceso, cambiato: nuovo !== testoAcceso };
  }
  const testoSpento = leggiTesto(spento);
  if (testoSpento === undefined) throw new Error(t.errori.ruoloSconosciuto(nome));
  scriviTesto(acceso, compilaSegnapostoRuolo(impostaAttivo(testoSpento, true, relSpento), opzioni));
  rimuoviFile(spento);
  return { nome, file: relAcceso, cambiato: true };
}

/** Spegne un ruolo: sposta .claude/agents/<nome>.md in .claude/agents-spenti/<nome>.md (sovrascrivendo) con `attivo: false`. */
export async function disattivaRuolo(cartella: string, nome: string): Promise<EsitoRuolo> {
  controllaNome(nome);
  const relAcceso = `${CARTELLA_RUOLI_ACCESI}/${nome}.md`;
  const relSpento = `${CARTELLA_RUOLI_SPENTI}/${nome}.md`;
  const acceso = assoluto(cartella, relAcceso);
  const spento = assoluto(cartella, relSpento);

  const testoAcceso = leggiTesto(acceso);
  if (testoAcceso === undefined || !haIntestazione(testoAcceso)) {
    // Nessun ruolo vero acceso: al massimo il segnaposto "spento il…" lasciato dall'assistente.
    if (!esiste(spento)) throw new Error(t.errori.ruoloSconosciuto(nome));
    const rimosso = testoAcceso !== undefined && rimuoviFile(acceso);
    return { nome, file: relSpento, cambiato: rimosso };
  }
  scriviTesto(spento, impostaAttivo(testoAcceso, false, relAcceso));
  rimuoviFile(acceso);
  return { nome, file: relSpento, cambiato: true };
}
