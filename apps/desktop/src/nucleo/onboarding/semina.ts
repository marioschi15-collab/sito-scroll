import fs from 'node:fs';
import path from 'node:path';
import { CONFIG_PREDEFINITA, RUOLI_CATALOGO, SEGNAPOSTO, SKILL_CATALOGO } from '@spalla/schema';
import type { Logger } from '../contratti.js';
import { assicuraCartella, assoluto, esiste, scriviJson, scriviTesto } from './fs-util.js';
import { testiOnboarding as t } from './testi.js';

/** File copiati come testo (con i segnaposto sostituiti); tutto il resto è copiato tale e quale. */
export const ESTENSIONI_TESTO: ReadonlySet<string> = new Set(['.md', '.json', '.txt', '.yaml', '.yml', '.log']);

/**
 * Lo scheletro che ~/Spalla deve avere in ogni caso (build-spec "Workspace templates layout").
 * Se un modello manca nei template, la semina crea il file con un commento TODO e lo segnala.
 */
export const FILE_ATTESI: readonly string[] = [
  'CLAUDE.md',
  '.claude/settings.json',
  '.claude/rules/confini.md',
  '.claude/rules/canali.md',
  '.claude/agents/.gitkeep',
  ...RUOLI_CATALOGO.map((r) => `.claude/agents-spenti/${r}.md`),
  ...SKILL_CATALOGO.map((s) => `.claude/skills/${s}/SKILL.md`),
  'profilo/IDENTITA.md',
  'profilo/ANIMA.md',
  'profilo/UTENTE.md',
  'profilo/SQUADRA.md',
  'memoria/MEMORIA.md',
  'memoria/agenda.md',
  'memoria/temi/.gitkeep',
  'memoria/diario/.gitkeep',
  'memoria/archivio/.gitkeep',
  'lavoro/messaggi/.gitkeep',
  'lavoro/riferimenti/.gitkeep',
  'lavoro/preventivi/.gitkeep',
  'lavoro/liste/.gitkeep',
  'lavoro/report/.gitkeep',
  'lavoro/in-arrivo/.gitkeep',
  'lavoro/cestino/.gitkeep',
  'onboarding/PRIMO-AVVIO.md',
  'onboarding/domande.md',
];

/** Cartelle garantite anche se vuote (la cartella dei ruoli accesi deve esistere per Claude Code). */
export const CARTELLE_ATTESE: readonly string[] = [...new Set(FILE_ATTESI.map((f) => path.posix.dirname(f)))];

export interface Segnaposto {
  /** AAAA-MM-GG */
  dataOggi: string;
  nomeProdotto: string;
}

/** Sostituisce i due segnaposto dell'app; {{NOME_UTENTE}} e {{MESTIERE}} restano per l'assistente. */
export function sostituisciSegnaposto(testo: string, s: Segnaposto): string {
  return testo.split(SEGNAPOSTO.DATA_OGGI).join(s.dataOggi).split(SEGNAPOSTO.NOME_PRODOTTO).join(s.nomeProdotto);
}

export interface OpzioniSemina {
  /** Cartella dei modelli (packages/workspace-templates/templates o una copia). */
  templates: string;
  /** La cartella di lavoro dell'utente. */
  destinazione: string;
  segnaposto: Segnaposto;
  /** File (relativi, con "/") da non copiare né creare: es. il rituale quando le presentazioni sono finite. */
  escludi?: ReadonlySet<string>;
  logger?: Logger;
}

export interface EsitoSemina {
  /** File scritti in questa semina (compresi gli stub). */
  creati: string[];
  /** File già presenti, lasciati intatti. */
  saltati: string[];
  /** File dei modelli non copiati perché esclusi. */
  esclusi: string[];
  /** File attesi ma assenti nei modelli: creati come stub con un commento TODO. */
  mancanti: string[];
}

/** Contenuto del segnaposto per un file atteso che manca nei modelli. */
export function contenutoStub(relativo: string): string {
  const nome = path.posix.basename(relativo);
  if (nome === '.gitkeep') return '';
  if (nome.endsWith('.json')) return `${JSON.stringify({ _TODO: t.stub(relativo) }, null, 2)}\n`;
  return `<!-- ${t.stub(relativo)} -->\n`;
}

/**
 * Copia l'albero dei modelli nella cartella di lavoro senza mai sovrascrivere (idempotente), sostituendo
 * {{DATA_OGGI}} e {{NOME_PRODOTTO}} nei file di testo, poi garantisce scheletro e cartelle attese.
 */
export function semina(o: OpzioniSemina): EsitoSemina {
  if (!esiste(o.templates) || !fs.statSync(o.templates).isDirectory()) {
    throw new Error(t.errori.modelliNonTrovati(o.templates));
  }
  const esito: EsitoSemina = { creati: [], saltati: [], esclusi: [], mancanti: [] };
  assicuraCartella(o.destinazione);
  visita('', o, esito);

  for (const rel of CARTELLE_ATTESE) assicuraCartella(assoluto(o.destinazione, rel));
  for (const rel of FILE_ATTESI) {
    if (o.escludi?.has(rel)) continue;
    const dest = assoluto(o.destinazione, rel);
    if (esiste(dest)) continue;
    scriviTesto(dest, contenutoStub(rel));
    esito.mancanti.push(rel);
    esito.creati.push(rel);
  }
  return esito;
}

function visita(relDir: string, o: OpzioniSemina, esito: EsitoSemina): void {
  const sorgente = relDir ? assoluto(o.templates, relDir) : o.templates;
  const voci = fs.readdirSync(sorgente, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const voce of voci) {
    const rel = relDir ? `${relDir}/${voce.name}` : voce.name;
    if (voce.isSymbolicLink()) {
      o.logger?.avviso('onboarding.modello_saltato', { file: rel, motivo: 'collegamento simbolico' });
      continue;
    }
    if (voce.isDirectory()) {
      assicuraCartella(assoluto(o.destinazione, rel));
      visita(rel, o, esito);
      continue;
    }
    if (!voce.isFile()) continue;
    if (o.escludi?.has(rel)) {
      esito.esclusi.push(rel);
      continue;
    }
    const dest = assoluto(o.destinazione, rel);
    if (esiste(dest)) {
      esito.saltati.push(rel);
      continue;
    }
    copia(assoluto(o.templates, rel), dest, o.segnaposto);
    esito.creati.push(rel);
  }
}

function copia(da: string, a: string, s: Segnaposto): void {
  assicuraCartella(path.dirname(a));
  const nome = path.basename(a);
  if (ESTENSIONI_TESTO.has(path.extname(nome).toLowerCase()) || nome === '.gitkeep') {
    fs.writeFileSync(a, sostituisciSegnaposto(fs.readFileSync(da, 'utf8'), s), 'utf8');
  } else {
    fs.copyFileSync(da, a, fs.constants.COPYFILE_EXCL);
  }
}

/** Scrive datiApp/config.json con tutti i predefiniti (ConfigSchema) se manca. True se l'ha creato. */
export function scriviConfigPredefinita(datiApp: string): boolean {
  const file = path.join(datiApp, 'config.json');
  if (esiste(file)) return false;
  scriviJson(file, CONFIG_PREDEFINITA);
  return true;
}
