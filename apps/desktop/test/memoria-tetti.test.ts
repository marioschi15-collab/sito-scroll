import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TETTI_MEMORIA } from '@spalla/schema';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Logger, Percorsi } from '../src/nucleo/contratti.js';
import { calcolaPercorsi } from '../src/nucleo/percorsi.js';
import {
  contaRighe,
  controllaTetti,
  creaMemoryService,
  LIMITE_PRIMA_RIGA,
  pulisciPrimaRiga,
  testiMemoria,
  type MemoryServiceEsteso,
} from '../src/nucleo/memoria/index.js';

const logger: Logger = { info: vi.fn(), avviso: vi.fn(), errore: vi.fn() };
let radice: string;
let percorsi: Percorsi;
let servizi: MemoryServiceEsteso[] = [];

function scrivi(rel: string, contenuto: string): void {
  const assoluto = path.join(percorsi.cartellaLavoro, rel);
  fs.mkdirSync(path.dirname(assoluto), { recursive: true });
  fs.writeFileSync(assoluto, contenuto, 'utf8');
}
function leggi(rel: string): string {
  return fs.readFileSync(path.join(percorsi.cartellaLavoro, rel), 'utf8');
}
function righe(n: number, testo = 'riga'): string {
  return Array.from({ length: n }, (_, i) => `- ${testo} ${i + 1}`).join('\n') + '\n';
}
function servizio(adesso?: () => Date): MemoryServiceEsteso {
  const s = creaMemoryService({ percorsi, logger, adesso });
  servizi.push(s);
  return s;
}

beforeEach(() => {
  radice = fs.mkdtempSync(path.join(os.tmpdir(), 'spalla-memoria-tetti-'));
  process.env.SPALLA_HOME = radice;
  percorsi = calcolaPercorsi();
});
afterEach(async () => {
  for (const s of servizi) await s.ferma();
  servizi = [];
  delete process.env.SPALLA_HOME;
  fs.rmSync(radice, { recursive: true, force: true });
  vi.clearAllMocks();
});

describe('controllaTetti (docs/03 §6)', () => {
  it('UTENTE.md: 4.000 caratteri', () => {
    expect(controllaTetti('profilo/UTENTE.md', 'à'.repeat(TETTI_MEMORIA.UTENTE_CARATTERI))).toBeNull();
    expect(controllaTetti('profilo/UTENTE.md', 'à'.repeat(TETTI_MEMORIA.UTENTE_CARATTERI + 1))).toBe(
      'UTENTE.md supera 4.000 caratteri: unisci le direttive simili, segna come superate quelle vecchie e riscrivi.',
    );
  });

  it('MEMORIA.md: 200 righe oppure 25 KB', () => {
    expect(controllaTetti('memoria/MEMORIA.md', righe(TETTI_MEMORIA.MEMORIA_RIGHE))).toBeNull();
    expect(controllaTetti('memoria/MEMORIA.md', righe(TETTI_MEMORIA.MEMORIA_RIGHE + 1))).toBe(
      "MEMORIA.md supera 200 righe: sposta i dettagli in temi/ e riscrivi l'indice con una riga per ricordo.",
    );
    // 150 righe da 200 byte = 30.000 byte > 25 KB
    const pesante = righe(150, 'x'.repeat(190));
    expect(contaRighe(pesante)).toBe(150);
    expect(controllaTetti('memoria/MEMORIA.md', pesante)).toBe(
      "MEMORIA.md supera 25 KB: sposta i dettagli in temi/ e riscrivi l'indice con una riga per ricordo.",
    );
  });

  it('schede in temi/: 300 righe, anche nelle sottocartelle', () => {
    expect(controllaTetti('memoria/temi/cliente-lamberti.md', righe(TETTI_MEMORIA.SCHEDA_RIGHE))).toBeNull();
    expect(controllaTetti('memoria/temi/cliente-lamberti.md', righe(TETTI_MEMORIA.SCHEDA_RIGHE + 1))).toBe(
      'La scheda è troppo lunga: sposta la cronologia vecchia in archivio/ o dividi per argomento.',
    );
    expect(controllaTetti('memoria/temi/clienti/conti.md', righe(301))).toBe(testiMemoria.tetti.scheda);
  });

  it('agenda: 100 righe', () => {
    expect(controllaTetti('memoria/agenda.md', righe(TETTI_MEMORIA.AGENDA_RIGHE))).toBeNull();
    expect(controllaTetti('memoria/agenda.md', righe(TETTI_MEMORIA.AGENDA_RIGHE + 1))).toBe('Agenda troppo lunga: archivia le voci spuntate.');
  });

  it('ANIMA.md: 2.500 caratteri', () => {
    expect(controllaTetti('profilo/ANIMA.md', 'a'.repeat(TETTI_MEMORIA.ANIMA_CARATTERI))).toBeNull();
    expect(controllaTetti('profilo/ANIMA.md', 'a'.repeat(TETTI_MEMORIA.ANIMA_CARATTERI + 1))).toBe(
      'ANIMA.md è troppo lunga: la persona si descrive in dieci righe.',
    );
  });

  it('SQUADRA.md (40 righe) e IDENTITA.md (20 righe) completano la tabella di docs/03 §2', () => {
    expect(controllaTetti('profilo/SQUADRA.md', righe(TETTI_MEMORIA.SQUADRA_RIGHE))).toBeNull();
    expect(controllaTetti('profilo/SQUADRA.md', righe(TETTI_MEMORIA.SQUADRA_RIGHE + 1))).toBe(testiMemoria.tetti.squadra);
    expect(controllaTetti('profilo/IDENTITA.md', righe(TETTI_MEMORIA.IDENTITA_RIGHE))).toBeNull();
    expect(controllaTetti('profilo/IDENTITA.md', righe(TETTI_MEMORIA.IDENTITA_RIGHE + 1))).toBe(testiMemoria.tetti.identita);
  });

  it('percorsi Windows e maiuscole diverse sono riconosciuti; i file non sorvegliati passano sempre', () => {
    expect(controllaTetti('memoria\\MEMORIA.md', righe(201))).toBe(testiMemoria.tetti.memoriaRighe);
    expect(controllaTetti('./Memoria/memoria.md', righe(201))).toBe(testiMemoria.tetti.memoriaRighe);
    expect(controllaTetti('lavoro/report/mensile.md', righe(5000))).toBeNull();
    expect(controllaTetti('memoria/RIORDINO.log', righe(5000))).toBeNull();
    expect(controllaTetti('memoria/diario/2026-10-24.md', righe(5000))).toBeNull();
    expect(controllaTetti('memoria/archivio/vecchia-scheda.md', righe(5000))).toBeNull();
    expect(controllaTetti('CLAUDE.md', righe(5000))).toBeNull();
  });

  it('conta le righe come una persona: l\'a capo finale non aggiunge una riga', () => {
    expect(contaRighe('')).toBe(0);
    expect(contaRighe('una')).toBe(1);
    expect(contaRighe('una\n')).toBe(1);
    expect(contaRighe('una\r\ndue\r\n')).toBe(2);
    expect(contaRighe('una\n\n')).toBe(2);
  });

  it('il servizio espone la stessa funzione', () => {
    expect(servizio().controllaTetti('memoria/agenda.md', righe(101))).toBe(testiMemoria.tetti.agenda);
  });
});

describe('appendiDiario (hook Stop, ADR-007)', () => {
  const sera = () => new Date(2026, 9, 24, 18, 35, 12); // 24 ottobre 2026, 18:35 ora locale

  it('crea il diario di oggi con intestazione e appende "- hh:mm [canale] prima riga"', async () => {
    const s = servizio(sera);
    await s.appendiDiario('desktop', 'Nuova regola: i follow-up dopo le visite si mandano entro 24 ore, mai dopo le 21');
    expect(leggi('memoria/diario/2026-10-24.md')).toBe(
      '# Diario 2026-10-24\n- 18:35 [desktop] Nuova regola: i follow-up dopo le visite si mandano entro 24 ore, mai dopo le 21\n',
    );
    await s.appendiDiario('telegram', 'la Lamberti ha richiamato');
    expect(leggi('memoria/diario/2026-10-24.md').split('\n')).toEqual([
      '# Diario 2026-10-24',
      '- 18:35 [desktop] Nuova regola: i follow-up dopo le visite si mandano entro 24 ore, mai dopo le 21',
      '- 18:35 [telegram] la Lamberti ha richiamato',
      '',
    ]);
  });

  it('usa solo la prima riga non vuota, compatta gli spazi e tronca a 120 caratteri con "…"', async () => {
    const s = servizio(sera);
    const lunga = 'parola '.repeat(40).trim(); // 279 caratteri
    await s.appendiDiario('voce', `\n\n   ${lunga}\nseconda riga da ignorare`);
    const riga = leggi('memoria/diario/2026-10-24.md').split('\n')[1]!;
    const testo = riga.replace('- 18:35 [voce] ', '');
    expect(Array.from(testo)).toHaveLength(LIMITE_PRIMA_RIGA);
    expect(testo.endsWith('…')).toBe(true);
    expect(riga).not.toContain('seconda riga');
    expect(pulisciPrimaRiga('a\tb\u0007c')).toBe('a b c');
    expect(pulisciPrimaRiga('x'.repeat(120))).toBe('x'.repeat(120));
  });

  it('con una prima riga vuota non scrive nulla', async () => {
    const s = servizio(sera);
    await s.appendiDiario('desktop', '   \n\n');
    expect(fs.existsSync(path.join(percorsi.cartellaLavoro, 'memoria/diario/2026-10-24.md'))).toBe(false);
  });

  it('se il diario esiste senza a capo finale, la riga nuova non si incolla all\'ultima', async () => {
    scrivi('memoria/diario/2026-10-24.md', '# Diario 2026-10-24\n- 08:00 [telegram] Brief del mattino inviato');
    await servizio(sera).appendiDiario('desktop', 'ciao');
    expect(leggi('memoria/diario/2026-10-24.md')).toBe('# Diario 2026-10-24\n- 08:00 [telegram] Brief del mattino inviato\n- 18:35 [desktop] ciao\n');
  });

  it('il giorno è quello locale dell\'orologio iniettato (mezzanotte e un minuto)', async () => {
    await servizio(() => new Date(2026, 0, 1, 0, 1)).appendiDiario('sistema', 'riordino');
    expect(leggi('memoria/diario/2026-01-01.md')).toBe('# Diario 2026-01-01\n- 00:01 [sistema] riordino\n');
  });
});

describe('contatori', () => {
  it('conta righe e byte dell\'indice, caratteri di UTENTE.md, schede e diari', async () => {
    scrivi('memoria/MEMORIA.md', '# MEMORIA\n- uno\n- due\n- tre\n');
    scrivi('profilo/UTENTE.md', 'àèì ok');
    scrivi('memoria/temi/a.md', '# A\n');
    scrivi('memoria/temi/clienti/b.md', '# B\n');
    scrivi('memoria/temi/.nascosto.md', '# nascosto\n');
    scrivi('memoria/temi/appunti.txt', 'non è markdown');
    scrivi('memoria/diario/2026-10-23.md', '# Diario\n');
    scrivi('memoria/diario/2026-10-24.md', '# Diario\n');
    const c = await servizio().contatori();
    expect(c).toEqual({ memoriaRighe: 4, memoriaByte: Buffer.byteLength('# MEMORIA\n- uno\n- due\n- tre\n'), utenteCaratteri: 6, schede: 2, diari: 2 });
  });

  it('cartella vuota o assente → tutti zero', async () => {
    expect(await servizio().contatori()).toEqual({ memoriaRighe: 0, memoriaByte: 0, utenteCaratteri: 0, schede: 0, diari: 0 });
  });
});
