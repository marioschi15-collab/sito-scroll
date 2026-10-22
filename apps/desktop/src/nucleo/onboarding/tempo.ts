/**
 * Date e ore nel fuso dell'utente, senza dipendere dal fuso del processo: così i test sono riproducibili
 * e la data che diamo all'assistente è quella che vede l'utente.
 */

export function fusoDiSistema(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** True se il nome IANA è accettato dal sistema (es. "Europe/Rome"). */
export function fusoValido(fuso: string): boolean {
  try {
    new Intl.DateTimeFormat('it-IT', { timeZone: fuso });
    return true;
  } catch {
    return false;
  }
}

interface PartiData {
  anno: number;
  mese: number;
  giorno: number;
  ora: number;
  minuto: number;
  secondo: number;
}

function parti(d: Date, fuso: string): PartiData {
  const formato = new Intl.DateTimeFormat('en-US', {
    timeZone: fuso,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const valori = new Map<Intl.DateTimeFormatPartTypes, number>(
    formato.formatToParts(d).filter((p) => p.type !== 'literal').map((p) => [p.type, Number(p.value)]),
  );
  const n = (tipo: Intl.DateTimeFormatPartTypes): number => valori.get(tipo) ?? 0;
  return { anno: n('year'), mese: n('month'), giorno: n('day'), ora: n('hour') % 24, minuto: n('minute'), secondo: n('second') };
}

const due = (n: number): string => String(n).padStart(2, '0');

/** AAAA-MM-GG nel fuso indicato. */
export function dataIso(d: Date, fuso: string): string {
  const p = parti(d, fuso);
  return `${p.anno}-${due(p.mese)}-${due(p.giorno)}`;
}

/** HH:MM nel fuso indicato. */
export function oraBreve(d: Date, fuso: string): string {
  const p = parti(d, fuso);
  return `${due(p.ora)}:${due(p.minuto)}`;
}

/** "giovedì 22 ottobre 2026 alle ore 09:41" */
export function dataOraLunga(d: Date, fuso: string): string {
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'full', timeStyle: 'short', timeZone: fuso }).format(d);
}

/** ISO 8601 con lo scostamento del fuso (es. 2026-10-22T09:41:00+02:00), come vuole IstanteSchema. */
export function istanteConFuso(d: Date, fuso: string): string {
  const p = parti(d, fuso);
  const comeUtc = Date.UTC(p.anno, p.mese - 1, p.giorno, p.ora, p.minuto, p.secondo);
  const scostamentoMin = Math.round((comeUtc - (d.getTime() - d.getMilliseconds())) / 60_000);
  const segno = scostamentoMin >= 0 ? '+' : '-';
  const ass = Math.abs(scostamentoMin);
  return `${p.anno}-${due(p.mese)}-${due(p.giorno)}T${due(p.ora)}:${due(p.minuto)}:${due(p.secondo)}${segno}${due(Math.floor(ass / 60))}:${due(ass % 60)}`;
}
