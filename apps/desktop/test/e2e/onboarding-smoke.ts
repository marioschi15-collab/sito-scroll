#!/usr/bin/env -S node --import tsx
/**
 * Prova end-to-end delle presentazioni (docs/05 §5: le prime tre risposte di Marco) con il vero SDK e il binario incluso.
 *
 * Uso: `pnpm smoke:onboarding` dalla radice (oppure `pnpm --filter @spalla/desktop exec tsx test/e2e/onboarding-smoke.ts`).
 * Richiede un login di Claude Code già presente sulla macchina (modalità abbonamento con CLAUDE_CONFIG_DIR ereditato)
 * oppure ANTHROPIC_API_KEY nell'ambiente (allora si usa la modalità chiave API).
 *
 * Cosa fa: SPALLA_HOME in una cartella temporanea → avviaNucleo → prepara() → il messaggio iniziale (il rituale) come
 * primo messaggio utente → risponde come Marco a tre domande (Q1 nome e tu/lei, Q2 nome dell'assistente, Q3 tono), poi
 * chiede di fermarsi; infine controlla che profilo/IDENTITA.md contenga il nome scelto ("Bruno").
 * Tetto: 12 passi per scambio, al massimo 6 scambi. Esce con 0 se passa, 1 se l'asserzione fallisce, 2 se il cervello
 * non risponde (credenziali, rete, limite), stampando l'errore esatto.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { DomandaUtente, EventoAssistente, Logger, RispostaUtente } from '../../src/nucleo/contratti.js';
import { avviaNucleo } from '../../src/nucleo/index.js';
import { calcolaPercorsi } from '../../src/nucleo/percorsi.js';

// Dentro un'altra sessione di Claude Code (sviluppo) il binario erediterebbe l'id della sessione esterna.
delete process.env.CLAUDE_CODE_SESSION_ID;

const NOME_SCELTO = 'Bruno';
const MAX_TURNI = 12;
const MAX_SCAMBI = 6;
const TIMEOUT_MS = 8 * 60 * 1000;

/** Le risposte di Marco (docs/05 §5), nell'ordine in cui il rituale fa le domande. */
const RISPOSTE_MARCO = ['Marco, del tu.', `${NOME_SCELTO}.`, 'Diretto e pratico. E niente faccine.'];
const CHIUSURA = `Fermiamoci qui per oggi: salva quello che sai di me in profilo/IDENTITA.md e profilo/ANIMA.md (mi chiamo Marco, tu ti chiami ${NOME_SCELTO}, ci diamo del tu, tono diretto e pratico, niente emoji), aggiorna onboarding/stato.json con "rinviato": true e poi fermati senza altre domande.`;

const radice = fs.mkdtempSync(path.join(os.tmpdir(), 'spalla-smoke-'));
process.env.SPALLA_HOME = radice;
const percorsi = calcolaPercorsi();
const conChiave = Boolean(process.env.ANTHROPIC_API_KEY);
fs.mkdirSync(percorsi.datiApp, { recursive: true });
fs.writeFileSync(
  path.join(percorsi.datiApp, 'config.json'),
  JSON.stringify({ cervello: { modalita: conChiave ? 'chiave_api' : 'abbonamento', livello: 'equilibrato', tetto_mensile_eur: conChiave ? 25 : null } }, null, 2),
);

const logger: Logger = {
  info: (e, d) => void (process.env.SMOKE_VERBOSE && process.stderr.write(`  [info] ${e} ${JSON.stringify(d ?? {})}\n`)),
  avviso: (e, d) => void process.stderr.write(`  [avviso] ${e} ${JSON.stringify(d ?? {})}\n`),
  errore: (e, d) => void process.stderr.write(`  [errore] ${e} ${JSON.stringify(d ?? {})}\n`),
};

function stampa(testo: string): void {
  process.stdout.write(testo);
}

function identita(): string {
  try {
    return fs.readFileSync(path.join(percorsi.cartellaLavoro, 'profilo', 'IDENTITA.md'), 'utf8');
  } catch {
    return '';
  }
}

function nomeScritto(): boolean {
  return new RegExp(`Nome dell'assistente\\s*:\\s*\\*{0,2}${NOME_SCELTO}`, 'i').test(identita());
}

async function main(): Promise<number> {
  stampa(`Cartella di prova: ${radice}\nModalità: ${conChiave ? 'chiave API' : 'abbonamento (login ereditato)'}\n`);
  const nucleo = await avviaNucleo({
    percorsi, modalitaDev: true, usaConfigEreditata: !conChiave, logger, avviaTelegram: false, motoreVoce: 'nessuno', nomeProdotto: 'Spalla',
  });
  // Se Spalla usa la chiave API, la chiave arriva dall'ambiente: la si mette nel deposito come farebbe la schermata.
  if (conChiave && 'salvaChiave' in nucleo.auth) await (nucleo.auth as { salvaChiave(c: string): Promise<void> }).salvaChiave(process.env.ANTHROPIC_API_KEY as string);

  // Nessuna conferma automatica: quello che esce dalla cartella viene negato (la prova non deve toccare altro).
  nucleo.broker.registraCanale({
    nome: 'desktop',
    disponibile: () => true,
    async chiediConferma(r) {
      stampa(`\n  [permesso negato dalla prova] ${r.descrizione}\n`);
      return { esito: 'nega', motivo: 'Prova automatica: non consentito.' };
    },
  });
  nucleo.broker.segnaAttivita('desktop');

  let risposteDate = 0;
  const prossimaRisposta = (): string => {
    const r = RISPOSTE_MARCO[risposteDate] ?? CHIUSURA;
    risposteDate++;
    return r;
  };
  const rispondiDomanda = async (domanda: DomandaUtente): Promise<RispostaUtente> => {
    const r = prossimaRisposta();
    stampa(`\n  [chip] ${domanda.intestazione ? `${domanda.intestazione}: ` : ''}${domanda.testo} ${domanda.opzioni.map((o) => `[${o.etichetta}]`).join(' ')}\n  [Marco] ${r}\n`);
    return { id: domanda.id, risposte: [r] };
  };

  let errore: Extract<EventoAssistente, { tipo: 'errore' }> | undefined;
  let costoTotale = 0;
  async function scambio(testo: string): Promise<void> {
    stampa(`\n[Marco → assistente] ${testo.length > 160 ? testo.slice(0, 157) + '…' : testo}\n[assistente] `);
    await nucleo.dispatcher.gestisci(
      { testo, canale: 'desktop' },
      async (e) => {
        if (e.tipo === 'testo' && e.parziale) stampa(e.testo);
        else if (e.tipo === 'strumento') stampa(`\n  · ${e.descrizione}\n`);
        else if (e.tipo === 'fine') {
          costoTotale += e.costoUsd ?? 0;
          stampa(`\n  — fine (${(e.durataMs / 1000).toFixed(1)} s, ${e.turni ?? '?'} passi, ${(e.costoUsd ?? 0).toFixed(3)} $)\n`);
        } else if (e.tipo === 'errore') {
          errore = e;
          stampa(`\n  ! ERRORE ${e.codice ?? 'altro'}: ${e.messaggio}\n`);
        }
      },
      { rispondiDomanda, maxTurni: MAX_TURNI },
    );
  }

  try {
    await nucleo.onboarding.prepara();
    const iniziale = await nucleo.onboarding.messaggioIniziale();
    stampa(`Stato presentazioni: ${await nucleo.onboarding.stato()}\n`);
    await scambio(iniziale);
    // Se l'assistente fa le domande a testo (senza chip), ogni risposta è un messaggio nuovo.
    for (let scambi = 1; scambi < MAX_SCAMBI && !errore; scambi++) {
      if (nomeScritto() && risposteDate >= RISPOSTE_MARCO.length) break;
      await scambio(prossimaRisposta());
    }
  } finally {
    await nucleo.ferma();
  }

  stampa(`\n\n--- profilo/IDENTITA.md ---\n${identita()}\n---\nSpesa della prova: ${costoTotale.toFixed(3)} $ · stato presentazioni: ${await nucleo.onboarding.stato()}\n`);
  if (errore) {
    stampa(`\nIl cervello non ha risposto: codice=${errore.codice ?? 'altro'} messaggio="${errore.messaggio}"${errore.riprovaAlle ? ` riprovaAlle=${errore.riprovaAlle}` : ''}\n`);
    return 2;
  }
  if (!nomeScritto()) {
    stampa(`\nASSERZIONE FALLITA: profilo/IDENTITA.md non contiene "Nome dell'assistente: ${NOME_SCELTO}".\n`);
    return 1;
  }
  stampa(`\nOK: profilo/IDENTITA.md riporta il nome scelto (${NOME_SCELTO}).\n`);
  return 0;
}

const orologio = setTimeout(() => {
  process.stderr.write(`\nTempo scaduto (${TIMEOUT_MS / 1000} s).\n`);
  process.exit(2);
}, TIMEOUT_MS);

main()
  .then((codice) => {
    clearTimeout(orologio);
    if (!process.env.SMOKE_TIENI) fs.rmSync(radice, { recursive: true, force: true });
    else stampa(`Cartella conservata: ${radice}\n`);
    process.exit(codice);
  })
  .catch((e: unknown) => {
    clearTimeout(orologio);
    process.stderr.write(`\nErrore inatteso: ${e instanceof Error ? e.stack ?? e.message : String(e)}\n`);
    process.exit(2);
  });
