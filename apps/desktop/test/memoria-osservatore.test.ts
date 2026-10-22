import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Logger, Percorsi } from '../src/nucleo/contratti.js';
import { calcolaPercorsi } from '../src/nucleo/percorsi.js';
import { creaMemoryService, creaOsservatore, type MemoryServiceEsteso } from '../src/nucleo/memoria/index.js';

const logger: Logger = { info: vi.fn(), avviso: vi.fn(), errore: vi.fn() };
const ATTESA = { timeout: 15_000, interval: 150 };
let radice: string;
let percorsi: Percorsi;
let servizi: MemoryServiceEsteso[] = [];

function scrivi(rel: string, contenuto: string): void {
  const assoluto = path.join(percorsi.cartellaLavoro, rel);
  fs.mkdirSync(path.dirname(assoluto), { recursive: true });
  fs.writeFileSync(assoluto, contenuto, 'utf8');
}
function servizio(extra: Partial<Parameters<typeof creaMemoryService>[0]> = {}): MemoryServiceEsteso {
  const s = creaMemoryService({ percorsi, logger, debounceMs: 100, ...extra });
  servizi.push(s);
  return s;
}
async function attendiFile(s: MemoryServiceEsteso, parola: string, file: string | undefined): Promise<void> {
  await vi.waitFor(async () => {
    const trovati = (await s.cerca(parola)).map((r) => r.file);
    if (file) expect(trovati).toContain(file);
    else expect(trovati).toEqual([]);
  }, ATTESA);
}

beforeEach(() => {
  radice = fs.mkdtempSync(path.join(os.tmpdir(), 'spalla-memoria-oss-'));
  process.env.SPALLA_HOME = radice;
  percorsi = calcolaPercorsi();
  scrivi('memoria/MEMORIA.md', '# MEMORIA\n- [cliente] Sig.ra Lamberti → temi/cliente-lamberti.md\n');
  scrivi('profilo/UTENTE.md', '# UTENTE\n- Lavoro: agente immobiliare.\n');
});
afterEach(async () => {
  for (const s of servizi) await s.ferma();
  servizi = [];
  delete process.env.SPALLA_HOME;
  fs.rmSync(radice, { recursive: true, force: true });
  vi.clearAllMocks();
});

describe('osservatore con fs.watch', () => {
  it('un file nuovo, poi modificato, poi cancellato entra ed esce dall\'indice da solo', async () => {
    const s = servizio();
    await s.avvia();
    expect((await s.statoIndice()).osservazione).toBe('fs.watch');

    scrivi('memoria/temi/geometra-nuovo.md', '# Geometra Nuovo\n- Ha una piscina da periziare a Casalecchio.\n');
    await attendiFile(s, 'piscina', 'memoria/temi/geometra-nuovo.md');

    fs.appendFileSync(path.join(percorsi.cartellaLavoro, 'memoria/temi/geometra-nuovo.md'), '- Vende anche un gazebo.\n');
    await attendiFile(s, 'gazebo', 'memoria/temi/geometra-nuovo.md');

    fs.rmSync(path.join(percorsi.cartellaLavoro, 'memoria/temi/geometra-nuovo.md'));
    await attendiFile(s, 'piscina', undefined);
  }, 40_000);

  it('vede anche una sottocartella creata dopo l\'avvio e le modifiche in profilo/', async () => {
    const s = servizio();
    await s.avvia();
    scrivi('memoria/temi/fornitori/idraulico.md', '# Idraulico Rossi\n- Interviene sulle autoclavi in 24 ore.\n');
    await attendiFile(s, 'idraulico', 'memoria/temi/fornitori/idraulico.md');
    scrivi('profilo/UTENTE.md', '# UTENTE\n- Lavoro: agente immobiliare.\n- Strumenti: Excel "Incarichi 2026".\n');
    await attendiFile(s, 'Incarichi', 'profilo/UTENTE.md');
  }, 40_000);

  it('dopo ferma() non osserva più', async () => {
    const s = servizio();
    await s.avvia();
    await s.ferma();
    expect((await s.statoIndice()).osservazione).toBe('fermo');
  });
});

describe('osservatore in polling (ripiego)', () => {
  it('re-indicizza con il polling quando fs.watch non è disponibile', async () => {
    const s = servizio({ forzaPolling: true, intervalloPollingMs: 200, debounceMs: 50 });
    await s.avvia();
    expect((await s.statoIndice()).osservazione).toBe('polling');
    expect(logger.info).toHaveBeenCalledWith('memoria.osservatore_avviato', expect.objectContaining({ modo: 'polling' }));

    scrivi('memoria/temi/cliente-conti.md', '# Famiglia Conti\n- Cercano una villetta con giardino a Casalecchio.\n');
    await attendiFile(s, 'villetta', 'memoria/temi/cliente-conti.md');
    fs.rmSync(path.join(percorsi.cartellaLavoro, 'memoria/temi/cliente-conti.md'));
    await attendiFile(s, 'villetta', undefined);
  }, 40_000);

  it('creaOsservatore: il debounce raggruppa una raffica di eventi in una chiamata sola', async () => {
    const cartella = path.join(radice, 'raffica');
    const suCambiamento = vi.fn();
    const o = creaOsservatore({ cartelle: [cartella], suCambiamento, logger, debounceMs: 150 });
    o.avvia();
    expect(o.modo()).toBe('fs.watch');
    for (let i = 0; i < 10; i++) fs.writeFileSync(path.join(cartella, `f${i}.md`), `# ${i}\n`);
    await vi.waitFor(() => expect(suCambiamento).toHaveBeenCalled(), ATTESA);
    await new Promise((r) => setTimeout(r, 400));
    expect(suCambiamento.mock.calls.length).toBeLessThanOrEqual(2);
    o.ferma();
    expect(o.modo()).toBe('fermo');
  }, 20_000);
});
