import fs from 'node:fs';
import path from 'node:path';
import type { Canale, TipoSessione } from '../contratti.js';

/** Una riga del registro costi (docs/02 §5.2: usage/AAAA-MM.json). */
export interface VoceCosto {
  quando: string;
  sessione: string;
  tipo: TipoSessione;
  canale: Canale;
  usd: number;
  turni: number;
  durataMs: number;
}

export interface RegistroMese {
  mese: string;
  totaleUsd: number;
  voci: VoceCosto[];
  /** Ultimo totale cumulativo visto per sessione: il `total_cost_usd` dell'SDK è cumulativo e, alla ripresa, riparte dal totale salvato. */
  totaliPerSessione: Record<string, number>;
}

export interface ContatoreCosti {
  /** Registra il `result` di una chiamata e restituisce la spesa aggiunta (differenza rispetto all'ultimo totale della sessione). */
  registra(voce: { sessione: string; tipo: TipoSessione; canale: Canale; totaleCumulativoUsd: number; turni: number; durataMs: number }): number;
  totaleMese(mese?: string): number;
  registro(mese?: string): RegistroMese;
}

export function chiaveMese(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
}

function mesePrecedente(mese: string): string {
  const [anno, m] = mese.split('-').map(Number) as [number, number];
  const d = new Date(anno, m - 2, 1);
  return chiaveMese(d);
}

export function creaContatoreCosti(datiApp: string, adesso: () => Date = () => new Date()): ContatoreCosti {
  const cartella = path.join(datiApp, 'usage');

  function fileDi(mese: string): string {
    return path.join(cartella, `${mese}.json`);
  }

  function leggi(mese: string): RegistroMese {
    try {
      const dati = JSON.parse(fs.readFileSync(fileDi(mese), 'utf8')) as Partial<RegistroMese>;
      return {
        mese,
        totaleUsd: typeof dati.totaleUsd === 'number' ? dati.totaleUsd : 0,
        voci: Array.isArray(dati.voci) ? dati.voci : [],
        totaliPerSessione: dati.totaliPerSessione && typeof dati.totaliPerSessione === 'object' ? dati.totaliPerSessione : {},
      };
    } catch {
      return { mese, totaleUsd: 0, voci: [], totaliPerSessione: {} };
    }
  }

  function scrivi(registro: RegistroMese): void {
    fs.mkdirSync(cartella, { recursive: true });
    const temporaneo = `${fileDi(registro.mese)}.tmp`;
    fs.writeFileSync(temporaneo, JSON.stringify(registro, null, 2));
    fs.renameSync(temporaneo, fileDi(registro.mese));
  }

  return {
    registra(voce) {
      const ora = adesso();
      const mese = chiaveMese(ora);
      const registro = leggi(mese);
      // Sessione iniziata il mese scorso: il cumulativo già conteggiato sta nel file precedente.
      const precedente = registro.totaliPerSessione[voce.sessione] ?? leggi(mesePrecedente(mese)).totaliPerSessione[voce.sessione] ?? 0;
      const delta = voce.totaleCumulativoUsd >= precedente ? voce.totaleCumulativoUsd - precedente : voce.totaleCumulativoUsd;
      const usd = Math.max(0, Number(delta.toFixed(6)));
      registro.totaliPerSessione[voce.sessione] = voce.totaleCumulativoUsd;
      registro.totaleUsd = Number((registro.totaleUsd + usd).toFixed(6));
      registro.voci.push({ quando: ora.toISOString(), sessione: voce.sessione, tipo: voce.tipo, canale: voce.canale, usd, turni: voce.turni, durataMs: voce.durataMs });
      scrivi(registro);
      return usd;
    },
    totaleMese(mese = chiaveMese(adesso())) {
      return leggi(mese).totaleUsd;
    },
    registro(mese = chiaveMese(adesso())) {
      return leggi(mese);
    },
  };
}
