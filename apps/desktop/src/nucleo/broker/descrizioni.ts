import os from 'node:os';
import { comuni, etichettaRuolo, permessi } from '@spalla/it-copy';

export interface DescrizioneRichiesta {
  /** Frase per l'utente: "Il Contabile vuole scrivere in ~/Fatture/nota.md". */
  descrizione: string;
  /** Anteprima breve (comando, prime righe), se utile. */
  anteprima?: string;
}

const LIMITE_ANTEPRIMA = 240;

function campo(input: unknown, nome: string): string | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const valore = (input as Record<string, unknown>)[nome];
  return typeof valore === 'string' ? valore : undefined;
}

/** Accorcia e sostituisce la home con "~", come la vede l'utente nel Finder/Esplora file. */
export function percorsoLeggibile(percorso: string): string {
  const home = os.homedir();
  const normale = percorso.replace(/\\/g, '/');
  const homeNormale = home.replace(/\\/g, '/');
  return normale.startsWith(homeNormale) ? '~' + normale.slice(homeNormale.length) : normale;
}

function accorcia(testo: string, limite = LIMITE_ANTEPRIMA): string {
  const pulito = testo.replace(/\s+$/, '');
  return pulito.length > limite ? pulito.slice(0, limite - 1) + '…' : pulito;
}

function primeRighe(testo: string, n = 3): string {
  return accorcia(testo.split(/\r?\n/).slice(0, n).join('\n'));
}

/** "La Segretaria" / "Il Contabile" / "L'assistente" / "Il ruolo «fornitori»". */
export function soggetto(ruolo?: string): string {
  if (!ruolo) return comuni.chiAgisce.assistente;
  return ruolo in comuni.ruoli ? comuni.chiAgisce.ruolo(etichettaRuolo(ruolo)) : comuni.chiAgisce.ruoloGenerico(ruolo);
}

/** "alla Segretaria" / "al Copywriter" / "a un ruolo" (complemento per la delega). */
function destinatario(ruolo?: string): string {
  if (!ruolo) return 'a un ruolo';
  return ruolo in comuni.ruoli ? comuni.chiAgisce.a(etichettaRuolo(ruolo)) : `a «${ruolo}»`;
}

/**
 * Costruisce la frase italiana per una richiesta di permesso a partire da strumento e input
 * (docs/02 §6: la scheda nomina il ruolo che agisce e mostra un'anteprima dell'azione).
 */
export function descriviRichiesta(strumento: string, input: unknown, ruolo?: string): DescrizioneRichiesta {
  const chi = soggetto(ruolo);
  const a = permessi.azioni;
  const percorso = campo(input, 'file_path') ?? campo(input, 'notebook_path') ?? campo(input, 'path');

  switch (strumento) {
    case 'Write': {
      const contenuto = campo(input, 'content');
      return {
        descrizione: a.scrivere(chi, percorsoLeggibile(percorso ?? '?')),
        anteprima: contenuto ? primeRighe(contenuto) : undefined,
      };
    }
    case 'Edit':
    case 'NotebookEdit': {
      const vecchio = campo(input, 'old_string') ?? campo(input, 'new_source');
      const nuovo = campo(input, 'new_string');
      const anteprima = vecchio !== undefined && nuovo !== undefined ? `− ${accorcia(vecchio, 100)}\n+ ${accorcia(nuovo, 100)}` : undefined;
      return { descrizione: a.modificare(chi, percorsoLeggibile(percorso ?? '?')), anteprima };
    }
    case 'Read':
      return { descrizione: a.leggere(chi, percorsoLeggibile(percorso ?? '?')) };
    case 'Bash': {
      const comando = campo(input, 'command') ?? '';
      const spiegazione = campo(input, 'description');
      return {
        descrizione: a.eseguire(chi),
        anteprima: accorcia(spiegazione ? `${spiegazione}\n$ ${comando}` : `$ ${comando}`),
      };
    }
    case 'WebFetch':
      return { descrizione: a.aprirePagina(chi, campo(input, 'url') ?? '?') };
    case 'WebSearch':
      return { descrizione: a.cercareWeb(chi, accorcia(campo(input, 'query') ?? '', 80)) };
    case 'Glob':
    case 'Grep':
      return { descrizione: a.cercareFile(chi, percorsoLeggibile(percorso ?? os.homedir())) };
    case 'Agent':
      return { descrizione: a.delegare(chi, destinatario(campo(input, 'subagent_type'))) };
    case 'Skill':
      return { descrizione: a.procedura(chi) };
    case 'TodoWrite':
    case 'TaskCreate':
    case 'TaskUpdate':
    case 'TaskList':
    case 'TaskGet':
      return { descrizione: a.listaCose(chi) };
    case 'EndConversation':
      return { descrizione: a.chiudere(chi) };
    default:
      if (strumento.startsWith('mcp__spalla__memoria')) return { descrizione: a.memoria(chi) };
      // Niente nome tecnico nella scheda (docs/04 §1, docs/05 §1.12): il nome resta in RichiestaPermesso.strumento.
      return { descrizione: a.generico(chi) };
  }
}
