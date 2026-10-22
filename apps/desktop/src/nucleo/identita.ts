import fs from 'node:fs';
import path from 'node:path';

/** Nome dell'assistente e dell'utente come stanno in profilo/IDENTITA.md (docs/03 §4), se già compilati. */
export interface Identita {
  nomeAssistente?: string;
  nomeUtente?: string;
}

const DA_COMPILARE = /\(da compilare/i;

function valoreRiga(testo: string, etichetta: RegExp): string | undefined {
  const riga = testo.split(/\r?\n/).find((r) => etichetta.test(r));
  if (!riga) return undefined;
  const valore = riga.replace(etichetta, '').trim();
  if (!valore || DA_COMPILARE.test(valore)) return undefined;
  return valore;
}

/** "Marco, del tu" → "Marco"; "Marco Benassi (Marco), tu" → "Marco Benassi". */
function primoNome(valore: string): string | undefined {
  const nome = valore.split(/[,;(—–-]/)[0]?.trim().replace(/^\*+|\*+$/g, '');
  return nome || undefined;
}

export function leggiIdentita(cartellaLavoro: string): Identita {
  let testo: string;
  try {
    testo = fs.readFileSync(path.join(cartellaLavoro, 'profilo', 'IDENTITA.md'), 'utf8');
  } catch {
    return {};
  }
  const assistente = valoreRiga(testo, /^\s*[-*]?\s*Nome dell'assistente\s*:\s*/i);
  const utente = valoreRiga(testo, /^\s*[-*]?\s*Utente\s*:\s*/i);
  return {
    ...(assistente ? { nomeAssistente: primoNome(assistente) } : {}),
    ...(utente ? { nomeUtente: primoNome(utente) } : {}),
  };
}
