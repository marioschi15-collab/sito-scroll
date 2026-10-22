import fs from 'node:fs';
import path from 'node:path';

/** Stato della sessione principale, in datiApp/sessione.json. */
export interface StatoSessione {
  id: string;
  /** ISO 8601 della prima apertura. */
  creataIl: string;
  /** ISO 8601 dell'ultimo scambio. */
  ultimoUso: string;
}

export interface ArchivioSessione {
  /** La sessione principale corrente, se c'è ed è di oggi (una sessione al giorno: docs/02 §3.1). */
  leggi(): StatoSessione | undefined;
  salva(id: string): StatoSessione;
  cancella(): void;
}

function stessoGiorno(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function creaArchivioSessione(datiApp: string, adesso: () => Date = () => new Date()): ArchivioSessione {
  const file = path.join(datiApp, 'sessione.json');
  let cache: StatoSessione | undefined | null = null; // null = non ancora letto

  function leggiDaDisco(): StatoSessione | undefined {
    try {
      const dati = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<StatoSessione>;
      if (typeof dati.id !== 'string' || typeof dati.creataIl !== 'string') return undefined;
      return { id: dati.id, creataIl: dati.creataIl, ultimoUso: typeof dati.ultimoUso === 'string' ? dati.ultimoUso : dati.creataIl };
    } catch {
      return undefined;
    }
  }

  return {
    leggi() {
      if (cache === null) cache = leggiDaDisco();
      if (!cache) return undefined;
      // Contesto fresco ogni mattina: la sessione di ieri non si riprende.
      if (!stessoGiorno(new Date(cache.creataIl), adesso())) return undefined;
      return cache;
    },
    salva(id) {
      const ora = adesso().toISOString();
      const precedente = cache === null ? leggiDaDisco() : cache;
      const stato: StatoSessione = precedente && precedente.id === id ? { ...precedente, ultimoUso: ora } : { id, creataIl: ora, ultimoUso: ora };
      fs.mkdirSync(datiApp, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(stato, null, 2));
      cache = stato;
      return stato;
    },
    cancella() {
      cache = undefined;
      try { fs.unlinkSync(file); } catch { /* già assente */ }
    },
  };
}
