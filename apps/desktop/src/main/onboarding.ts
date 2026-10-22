import fs from 'node:fs';
import path from 'node:path';
import { RisposteSchema, StatoOnboardingSchema, cartellaTemplates, parseDomande } from '@spalla/schema';
import type { RispostaOnboardingVista } from '../ipc/contratto.js';
import { dataLocaleIso } from './esporta.js';

/**
 * Pagina "Come mi sono presentato" (docs/05 §4.7) e ri-onboarding a tre ampiezze (docs/05 §7).
 * Legge onboarding/RISPOSTE.json (o, se manca, le risposte di stato.json) e la banca domande per i testi.
 */

const FILE = {
  risposte: path.join('onboarding', 'RISPOSTE.json'),
  stato: path.join('onboarding', 'stato.json'),
  domande: path.join('onboarding', 'domande.md'),
  primoAvvio: path.join('onboarding', 'PRIMO-AVVIO.md'),
} as const;

function leggiJson(file: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return undefined;
  }
}

function testiDomande(cartellaLavoro: string): Map<string, string> {
  const candidati = [path.join(cartellaLavoro, FILE.domande)];
  try {
    candidati.push(path.join(cartellaTemplates(), FILE.domande));
  } catch {
    // modelli non trovati: si mostrano gli id
  }
  for (const file of candidati) {
    try {
      const banca = parseDomande(fs.readFileSync(file, 'utf8'));
      return new Map(banca.domande.map((d) => [d.id, d.testo]));
    } catch {
      // prossimo candidato
    }
  }
  return new Map();
}

export function risposteOnboarding(cartellaLavoro: string, testiScelta: (n: number, file?: string) => string): RispostaOnboardingVista[] {
  const finali = RisposteSchema.safeParse(leggiJson(path.join(cartellaLavoro, FILE.risposte)));
  let risposte = finali.success ? finali.data.risposte : undefined;
  if (!risposte) {
    const stato = StatoOnboardingSchema.safeParse(leggiJson(path.join(cartellaLavoro, FILE.stato)));
    risposte = stato.success ? stato.data.risposte : [];
  }
  const domande = testiDomande(cartellaLavoro);
  return risposte.map((r) => ({
    id: r.id,
    domanda: domande.get(r.id) ?? r.id,
    risposta: r.testo !== undefined ? (Array.isArray(r.testo) ? r.testo.join(', ') : r.testo) : testiScelta(r.scelta ?? 0, r.file),
  }));
}

/**
 * Ri-onboarding "presentazioni": sposta stato.json e RISPOSTE.json in onboarding/precedenti-AAAA-MM-GG/ e rimette
 * il rituale dai modelli. Il profilo resta: l'assistente chiede solo cosa è cambiato.
 */
export function riapriPresentazioni(cartellaLavoro: string, opzioni: { adesso: Date; nomeProdotto: string; cartellaArchivio: (dataIso: string) => string }): void {
  const data = dataLocaleIso(opzioni.adesso);
  const archivio = path.join(cartellaLavoro, opzioni.cartellaArchivio(data));
  fs.mkdirSync(archivio, { recursive: true });
  for (const rel of [FILE.stato, FILE.risposte]) {
    const da = path.join(cartellaLavoro, rel);
    if (fs.existsSync(da)) fs.renameSync(da, path.join(archivio, path.basename(rel)));
  }
  const modello = fs.readFileSync(path.join(cartellaTemplates(), FILE.primoAvvio), 'utf8');
  const rituale = modello.split('{{DATA_OGGI}}').join(data).split('{{NOME_PRODOTTO}}').join(opzioni.nomeProdotto);
  fs.writeFileSync(path.join(cartellaLavoro, FILE.primoAvvio), rituale);
}

/** Nome libero accanto alla cartella di lavoro per la copia di prima ("Spalla-precedente-2026-10-22", "-2", …). */
export function percorsoPrecedente(cartellaLavoro: string, nome: (dataIso: string) => string, adesso: Date): string {
  const base = path.join(path.dirname(cartellaLavoro), nome(dataLocaleIso(adesso)));
  let candidato = base;
  for (let n = 2; fs.existsSync(candidato) && n < 1000; n++) candidato = `${base}-${n}`;
  return candidato;
}
