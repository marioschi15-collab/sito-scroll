import path from 'node:path';
import type { Percorsi } from '../contratti.js';

/**
 * Protezioni che valgono per OGNI sessione, qualunque sia il tipo o il ruolo (docs/02 §2.3, §10.2).
 *
 * Perché: con `settingSources: ['project']` il binario USA il blocco `env`, gli `hooks` e i comandi ausiliari
 * (quello della chiave API compreso) delle impostazioni di progetto, le skill con i loro `hooks`/`allowed-tools` e collega i server di `.mcp.json`
 * senza chiedere (permissions.md, "What runs before you trust a folder"). Se il modello potesse riscrivere quei
 * file, un contenuto ostile (Telegram, pagina web, documento in lavoro/in-arrivo) potrebbe far eseguire codice
 * alla sessione successiva o far uscire la chiave API. CLAUDE.md lo vieta a parole; qui lo si impone.
 */

/** Percorsi, relativi alla cartella di lavoro e con "/", che il modello non deve mai scrivere. Le cartelle finiscono con "/". */
export const PERCORSI_PROTETTI: readonly string[] = [
  '.claude/settings.json',
  '.claude/settings.local.json',
  '.mcp.json',
  '.claude/skills/',
  '.claude/hooks/',
];

/**
 * Regole `deny` per `disallowedTools` (e per il `deny` del settings.json dei modelli, che le ripete).
 * Solo `Edit(...)`: il binario controlla i permessi sui file contro le regole `Edit`/`Read`, e una regola `Edit`
 * copre anche Write e NotebookEdit; una regola `Write(percorso)` viene accettata ma mai consultata
 * (permissions.md, "Read and Edit").
 */
export function regoleProtezioneCartella(): string[] {
  return PERCORSI_PROTETTI.map((p) => (p.endsWith('/') ? `Edit(./${p}**)` : `Edit(./${p})`));
}

/**
 * Un percorso assoluto nella sintassi delle regole: due barre iniziali ("//Users/marco/x"); su Windows
 * "C:\Users\x" diventa "//c/Users/x" (permissions.md, tabella dei pattern).
 */
export function percorsoAssolutoPerRegola(percorso: string): string {
  let posix = percorso.replace(/\\/g, '/');
  const disco = /^([A-Za-z]):\//.exec(posix);
  if (disco) posix = `/${disco[1]!.toLowerCase()}${posix.slice(2)}`;
  return `//${posix.replace(/^\/+/, '')}`;
}

/**
 * Le credenziali del binario e il deposito dei segreti non si leggono mai (docs/02 §2.3 punto 2). I modelli
 * conoscono solo le posizioni di produzione; qui si usano i percorsi veri (anche con SPALLA_HOME o XDG_DATA_HOME).
 */
export function regoleProtezioneCredenziali(percorsi: Pick<Percorsi, 'configClaude' | 'segreti'>): string[] {
  return [`Read(${percorsoAssolutoPerRegola(percorsi.configClaude)}/**)`, `Read(${percorsoAssolutoPerRegola(percorsi.segreti)})`];
}

/**
 * Percorso relativo alla cartella di lavoro, con "/", oppure undefined se il file sta fuori.
 * Un percorso relativo si risolve rispetto alla cartella di lavoro (il cwd del binario), non a quello del processo.
 */
export function relativoAllaCartella(filePath: string | undefined, cartellaLavoro: string): string | undefined {
  if (!filePath) return undefined;
  const assoluto = path.resolve(cartellaLavoro, filePath);
  const rel = path.relative(path.resolve(cartellaLavoro), assoluto).replace(/\\/g, '/');
  if (rel === '' || rel === '..' || rel.startsWith('../') || path.isAbsolute(rel)) return undefined;
  return rel;
}

/** Il percorso protetto che il file tocca (confronto senza distinzione di maiuscole), oppure undefined. */
export function percorsoProtetto(filePath: string | undefined, cartellaLavoro: string): string | undefined {
  const rel = relativoAllaCartella(filePath, cartellaLavoro);
  if (!rel) return undefined;
  const minuscolo = rel.toLowerCase();
  const colpito = PERCORSI_PROTETTI.find((p) => (p.endsWith('/') ? minuscolo.startsWith(p) : minuscolo === p));
  return colpito ? rel : undefined;
}
