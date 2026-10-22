import fs from 'node:fs';
import path from 'node:path';
import type { ContatoriMemoria } from '../contratti.js';
import { contaByte, contaCaratteri, contaRighe } from './tetti.js';

function leggi(assoluto: string): string | undefined {
  try {
    return fs.readFileSync(assoluto, 'utf8');
  } catch {
    return undefined;
  }
}

/** Quanti .md ci sono in una cartella (anche nelle sottocartelle, file nascosti esclusi). */
export function contaMarkdown(cartella: string): number {
  let voci: fs.Dirent[];
  try {
    voci = fs.readdirSync(cartella, { withFileTypes: true });
  } catch {
    return 0;
  }
  let n = 0;
  for (const voce of voci) {
    if (voce.name.startsWith('.')) continue;
    if (voce.isDirectory()) n += contaMarkdown(path.join(cartella, voce.name));
    else if (voce.isFile() && /\.md$/i.test(voce.name)) n++;
  }
  return n;
}

/** I numeri della scheda Memoria ("memoria: 9/200 righe"), letti dai file: sono loro la verità, non l'indice. */
export function contaMemoria(cartellaLavoro: string): ContatoriMemoria {
  const memoria = leggi(path.join(cartellaLavoro, 'memoria', 'MEMORIA.md')) ?? '';
  const utente = leggi(path.join(cartellaLavoro, 'profilo', 'UTENTE.md')) ?? '';
  return {
    memoriaRighe: contaRighe(memoria),
    memoriaByte: contaByte(memoria),
    utenteCaratteri: contaCaratteri(utente),
    schede: contaMarkdown(path.join(cartellaLavoro, 'memoria', 'temi')),
    diari: contaMarkdown(path.join(cartellaLavoro, 'memoria', 'diario')),
  };
}
