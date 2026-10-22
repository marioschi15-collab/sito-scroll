import fs from 'node:fs';
import path from 'node:path';
import { RUOLI_CATALOGO, parseRuolo } from '@spalla/schema';
import type { RuoloVista } from '../ipc/contratto.js';

/**
 * Squadra (docs/04): i ruoli accesi (.claude/agents/) e spenti (.claude/agents-spenti/), con le frasi per l'utente
 * del blocco `spalla:` del frontmatter. Accendere e spegnere passa dall'onboarding del Nucleo (`attivaRuolo`,
 * `disattivaRuolo`): qui si legge soltanto.
 */

const CARTELLE = { accesi: path.join('.claude', 'agents'), spenti: path.join('.claude', 'agents-spenti') } as const;

function leggiRuolo(file: string, nome: string, attivo: boolean, etichettaPredefinita: (n: string) => string): RuoloVista | undefined {
  let testo: string;
  try {
    testo = fs.readFileSync(file, 'utf8');
  } catch {
    return undefined;
  }
  try {
    const { frontmatter } = parseRuolo(testo);
    const s = frontmatter.spalla;
    return {
      nome,
      etichetta: s.etichetta,
      attivo,
      spiegazione: s.spiegazione_utente,
      puoFareDaSolo: s.puo_fare_da_solo,
      chiedeSempre: s.chiede_sempre,
    };
  } catch {
    // File modificato a mano e non più valido: lo mostriamo comunque con il nome di catalogo.
    return { nome, etichetta: etichettaPredefinita(nome), attivo, spiegazione: '', puoFareDaSolo: '', chiedeSempre: '' };
  }
}

function nomiIn(cartella: string): string[] {
  try {
    return fs
      .readdirSync(cartella)
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.slice(0, -3))
      .filter((n) => /^[a-z][a-z0-9-]{1,40}$/.test(n));
  } catch {
    return [];
  }
}

export function elencoRuoli(cartellaLavoro: string, etichettaPredefinita: (nome: string) => string): RuoloVista[] {
  const accesi = nomiIn(path.join(cartellaLavoro, CARTELLE.accesi));
  const spenti = nomiIn(path.join(cartellaLavoro, CARTELLE.spenti)).filter((n) => !accesi.includes(n));
  const ruoli: RuoloVista[] = [];
  for (const nome of accesi) {
    const r = leggiRuolo(path.join(cartellaLavoro, CARTELLE.accesi, `${nome}.md`), nome, true, etichettaPredefinita);
    if (r) ruoli.push(r);
  }
  for (const nome of spenti) {
    const r = leggiRuolo(path.join(cartellaLavoro, CARTELLE.spenti, `${nome}.md`), nome, false, etichettaPredefinita);
    if (r) ruoli.push(r);
  }
  // Ordine del catalogo (docs/04 §4), poi gli eventuali ruoli creati dall'utente.
  const ordine = (n: string): number => {
    const i = (RUOLI_CATALOGO as readonly string[]).indexOf(n);
    return i === -1 ? RUOLI_CATALOGO.length : i;
  };
  return ruoli.sort((a, b) => Number(b.attivo) - Number(a.attivo) || ordine(a.nome) - ordine(b.nome) || a.nome.localeCompare(b.nome));
}

/** True se il ruolo esiste (acceso o spento) nella cartella. */
export function ruoloEsiste(cartellaLavoro: string, nome: string): boolean {
  return (
    fs.existsSync(path.join(cartellaLavoro, CARTELLE.accesi, `${nome}.md`)) ||
    fs.existsSync(path.join(cartellaLavoro, CARTELLE.spenti, `${nome}.md`))
  );
}
