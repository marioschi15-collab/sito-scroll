import fsp from 'node:fs/promises';
import path from 'node:path';

/** I bot scaricano al massimo 20 MB (Bot API getFile). */
export const LIMITE_FILE_BYTE = 20 * 1024 * 1024;

/**
 * Nome di file sicuro per `lavoro/in-arrivo/`: il nome che arriva da Telegram è informazione non attendibile
 * (niente percorsi, niente caratteri di controllo, lunghezza limitata); il prefisso con data e ora evita collisioni.
 */
export function nomeFileSicuro(nomeOriginale: string | undefined, riserva: string, quando: Date): string {
  const base = (nomeOriginale ?? '')
    .replace(/[\\/]+/g, '_')
    .replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '')
    .replace(/\.{2,}/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^[._\s]+/, '')
    .trim();
  const nome = base.length > 0 ? base : riserva;
  const estensione = path.extname(nome).slice(0, 12);
  const radice = path.basename(nome, estensione).slice(0, 60) || 'file';
  const marca = `${quando.toISOString().slice(0, 10)}_${String(quando.getHours()).padStart(2, '0')}${String(quando.getMinutes()).padStart(2, '0')}`;
  return `${marca}_${radice}${estensione}`;
}

/** Percorso libero nella cartella: aggiunge -2, -3… se il nome esiste già. */
export async function percorsoLibero(cartella: string, nome: string): Promise<string> {
  await fsp.mkdir(cartella, { recursive: true });
  const estensione = path.extname(nome);
  const radice = path.basename(nome, estensione);
  let candidato = path.join(cartella, nome);
  for (let n = 2; n < 1000; n++) {
    try {
      await fsp.access(candidato);
      candidato = path.join(cartella, `${radice}-${n}${estensione}`);
    } catch {
      return candidato;
    }
  }
  throw new Error('troppi file con lo stesso nome');
}

/** Estensione plausibile per un tipo MIME quando il nome manca (foto, vocali). */
export function estensioneDaMime(mime: string | undefined, riserva: string): string {
  const tabella: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
    'audio/ogg': '.ogg',
    'audio/mpeg': '.mp3',
    'text/plain': '.txt',
  };
  return (mime && tabella[mime]) || riserva;
}

/** Cartella degli allegati in arrivo (docs/02 §8.4). */
export function cartellaInArrivo(cartellaLavoro: string): string {
  return path.join(cartellaLavoro, 'lavoro', 'in-arrivo');
}
