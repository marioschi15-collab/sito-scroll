import os from 'node:os';
import path from 'node:path';
import { RisposteSchema, TETTI_MEMORIA, formattaProblemi, haSegnapostoDaCompilare, provaParseRuolo, separaFrontmatter } from '@spalla/schema';
import { assoluto, contaCaratteri, contaRighe, eOggetto, elencaMarkdown, esiste, leggiJson, leggiTesto, relativoPosix } from './fs-util.js';
import { CARTELLA_RUOLI_ACCESI, CARTELLA_RUOLI_SPENTI, MASSIMO_RUOLI_ACCESI, RUOLI_SEMPRE_ACCESI, eMarcaSpento } from './ruoli.js';
import { FILE_ONBOARDING, MARCA_DA_COMPILARE, leggiStato } from './stato.js';
import { testiOnboarding as t } from './testi.js';

export interface OpzioniValidazione {
  cartella: string;
  /** True se le presentazioni risultano finite: si controlla anche che il profilo sia compilato e i ruoli fissi accesi. */
  completato: boolean;
  /** Home dell'utente per gli import "@~/…" (predefinita quella del sistema). */
  home?: string;
}

/** Tutti i controlli di docs/04 §6.4 e docs/05 §8 ("file generati validi"): problemi in italiano, vuoto se tutto ok. */
export function validaCartella(o: OpzioniValidazione): string[] {
  const problemi = [
    ...validaScheletro(o.cartella),
    ...validaRuoli(o.cartella),
    ...validaImport(o.cartella, o.home ?? os.homedir()),
    ...validaTetti(o.cartella),
    ...validaSettings(o.cartella),
    ...validaStatoERisposte(o.cartella),
    ...(o.completato ? validaCompletamento(o.cartella) : []),
  ];
  return [...new Set(problemi)];
}

const FILE_SCHELETRO: readonly string[] = [
  FILE_ONBOARDING.claudeMd,
  FILE_ONBOARDING.settings,
  FILE_ONBOARDING.identita,
  FILE_ONBOARDING.anima,
  FILE_ONBOARDING.utente,
  FILE_ONBOARDING.squadra,
  FILE_ONBOARDING.memoria,
  FILE_ONBOARDING.agenda,
];

export function validaScheletro(cartella: string): string[] {
  return FILE_SCHELETRO.filter((f) => !esiste(assoluto(cartella, f))).map((f) => t.problemi.fileMancante(f));
}

/**
 * Ruoli in .claude/agents/ e .claude/agents-spenti/: intestazione valida (FrontmatterRuoloSchema: strumenti
 * ammessi, modello ammesso…), nome uguale al file e unico nella cartella, `attivo` coerente con la cartella,
 * niente segnaposto nei ruoli accesi, regola dei tre.
 */
export function validaRuoli(cartella: string): string[] {
  const problemi: string[] = [];
  let accesiCheContano = 0;

  for (const dir of [CARTELLA_RUOLI_ACCESI, CARTELLA_RUOLI_SPENTI]) {
    const nomi = new Map<string, string[]>();
    for (const f of elencaMarkdown(assoluto(cartella, dir))) {
      const rel = `${dir}/${f}`;
      const testo = leggiTesto(assoluto(cartella, rel));
      if (testo === undefined) continue;
      if (!separaFrontmatter(testo)) {
        if (!eMarcaSpento(testo)) problemi.push(t.problemi.fileSenzaIntestazione(rel));
        continue;
      }
      const esito = provaParseRuolo(testo);
      if (!esito.ok) {
        problemi.push(t.problemi.ruoloNonValido(rel, esito.problemi));
        continue;
      }
      const { frontmatter, corpo } = esito.valore;
      if (frontmatter.name !== f.slice(0, -'.md'.length)) problemi.push(t.problemi.nomeDiverso(rel, frontmatter.name));
      nomi.set(frontmatter.name, [...(nomi.get(frontmatter.name) ?? []), f]);
      if (dir === CARTELLA_RUOLI_ACCESI) {
        if (!frontmatter.spalla.attivo) problemi.push(t.problemi.accesoMaSpento(rel));
        if (haSegnapostoDaCompilare(corpo)) problemi.push(t.problemi.segnapostoNelRuolo(rel));
        if (!RUOLI_SEMPRE_ACCESI.includes(frontmatter.name)) accesiCheContano++;
      } else if (frontmatter.spalla.attivo) {
        problemi.push(t.problemi.spentoMaAcceso(rel));
      }
    }
    for (const [nome, file] of nomi) if (file.length > 1) problemi.push(t.problemi.nomeDuplicato(dir, nome, file));
  }
  if (accesiCheContano > MASSIMO_RUOLI_ACCESI) problemi.push(t.problemi.troppiAccesi(accesiCheContano, MASSIMO_RUOLI_ACCESI));
  return problemi;
}

/** Claude Code espande gli import fino a quattro salti (memory.md). */
export const PROFONDITA_IMPORT = 4;
const BLOCCO_CODICE = /```[\s\S]*?(```|$)/g;
const CODICE_INLINE = /`[^`\n]*`/g;
const IMPORT = /(?:^|(?<=\s))@((?:\\ |[^\s`"'()<>])+)/gm;

/**
 * Riferimenti "@percorso" di un Markdown, con le regole di memory.md: fuori da blocchi e porzioni di codice,
 * spazi protetti da barra inversa, punteggiatura finale ignorata. Con `soloPercorsi` tiene solo i riferimenti
 * che sembrano file (contengono "/", finiscono in .md o partono da "~"): nei file scritti dall'assistente
 * una chiocciola può essere un profilo social, non un import.
 */
export function estraiImport(markdown: string, soloPercorsi = false): string[] {
  const pulito = markdown.replace(BLOCCO_CODICE, '').replace(CODICE_INLINE, '');
  const trovati: string[] = [];
  for (const m of pulito.matchAll(IMPORT)) {
    const token = (m[1] ?? '').replace(/[.,;:!?]+$/, '').replace(/\\ /g, ' ');
    if (!token) continue;
    if (soloPercorsi && !(token.includes('/') || token.endsWith('.md') || token.startsWith('~'))) continue;
    trovati.push(token);
  }
  return trovati;
}

function risolviImport(riferimento: string, fileCorrente: string, home: string): string {
  if (riferimento === '~') return home;
  if (riferimento.startsWith('~/')) return path.join(home, riferimento.slice(2));
  if (path.isAbsolute(riferimento)) return riferimento;
  return path.resolve(path.dirname(fileCorrente), riferimento);
}

/** Ogni "@import" di CLAUDE.md (e, a cascata, dei file importati dentro la cartella) deve esistere. */
export function validaImport(cartella: string, home: string): string[] {
  const problemi: string[] = [];
  const visti = new Set<string>();
  const radice = path.resolve(cartella);

  const visita = (file: string, profondita: number): void => {
    if (profondita > PROFONDITA_IMPORT || visti.has(file)) return;
    visti.add(file);
    const testo = leggiTesto(file);
    if (testo === undefined) return;
    const rel = relativoPosix(cartella, file);
    for (const riferimento of estraiImport(testo, profondita > 0)) {
      const destinazione = risolviImport(riferimento, file, home);
      const dentro = destinazione.startsWith(radice + path.sep);
      if (!esiste(destinazione)) {
        problemi.push(t.problemi.importNonRisolto(rel, riferimento, dentro ? relativoPosix(cartella, destinazione) : destinazione));
        continue;
      }
      if (dentro && destinazione.endsWith('.md')) visita(destinazione, profondita + 1);
    }
  };
  visita(assoluto(cartella, FILE_ONBOARDING.claudeMd), 0);
  return problemi;
}

/** I tetti di docs/03 §2 (TETTI_MEMORIA), sui file che esistono. */
export function validaTetti(cartella: string): string[] {
  const problemi: string[] = [];
  const leggi = (rel: string): string | undefined => leggiTesto(assoluto(cartella, rel));
  const righe = (rel: string, tetto: number): void => {
    const testo = leggi(rel);
    if (testo === undefined) return;
    const n = contaRighe(testo);
    if (n > tetto) problemi.push(t.problemi.troppeRighe(rel, n, tetto));
  };
  const caratteri = (rel: string, tetto: number): void => {
    const testo = leggi(rel);
    if (testo === undefined) return;
    const n = contaCaratteri(testo);
    if (n > tetto) problemi.push(t.problemi.troppiCaratteri(rel, n, tetto));
  };
  const byte = (rel: string, tetto: number): void => {
    const testo = leggi(rel);
    if (testo === undefined) return;
    const n = Buffer.byteLength(testo, 'utf8');
    if (n > tetto) problemi.push(t.problemi.troppiByte(rel, Math.round(n / 1024), Math.round(tetto / 1024)));
  };

  righe(FILE_ONBOARDING.claudeMd, TETTI_MEMORIA.CLAUDE_MD_RIGHE);
  caratteri(FILE_ONBOARDING.utente, TETTI_MEMORIA.UTENTE_CARATTERI);
  caratteri(FILE_ONBOARDING.anima, TETTI_MEMORIA.ANIMA_CARATTERI);
  righe(FILE_ONBOARDING.identita, TETTI_MEMORIA.IDENTITA_RIGHE);
  righe(FILE_ONBOARDING.squadra, TETTI_MEMORIA.SQUADRA_RIGHE);
  righe(FILE_ONBOARDING.memoria, TETTI_MEMORIA.MEMORIA_RIGHE);
  byte(FILE_ONBOARDING.memoria, TETTI_MEMORIA.MEMORIA_BYTE);
  righe(FILE_ONBOARDING.agenda, TETTI_MEMORIA.AGENDA_RIGHE);
  for (const f of elencaMarkdown(assoluto(cartella, FILE_ONBOARDING.temi))) righe(`${FILE_ONBOARDING.temi}/${f}`, TETTI_MEMORIA.SCHEDA_RIGHE);
  return problemi;
}

/** Percorsi assoluti a una barra sola: nella sintassi delle regole sono relativi alla cartella delle impostazioni (docs/05 §4.3). */
const PERCORSO_ASSOLUTO_SBAGLIATO = /\((\/Users\/|\/home\/|[A-Za-z]:[\\/])/;

/** .claude/settings.json: JSON valido, sezione permissions, elenchi, niente percorsi assoluti a una barra. */
export function validaSettings(cartella: string): string[] {
  const rel = FILE_ONBOARDING.settings;
  const lettura = leggiJson(assoluto(cartella, rel));
  if (lettura.tipo === 'assente') return []; // già segnalato dallo scheletro
  if (lettura.tipo === 'non_valido') return [t.problemi.jsonNonValido(rel, lettura.problema)];
  const permessi = eOggetto(lettura.valore) ? lettura.valore.permissions : undefined;
  if (!eOggetto(permessi)) return [t.problemi.settingsSenzaPermessi(rel)];
  const problemi: string[] = [];
  for (const chiave of ['allow', 'ask', 'deny']) {
    const regole = permessi[chiave];
    if (regole === undefined) continue;
    if (!Array.isArray(regole)) {
      problemi.push(t.problemi.settingsListaNonValida(rel, chiave));
      continue;
    }
    for (const regola of regole) {
      if (typeof regola === 'string' && PERCORSO_ASSOLUTO_SBAGLIATO.test(regola)) problemi.push(t.problemi.settingsPercorsoAssoluto(rel, regola));
    }
  }
  return problemi;
}

/** stato.json e RISPOSTE.json, quando ci sono, devono rispettare gli schemi di @spalla/schema. */
export function validaStatoERisposte(cartella: string): string[] {
  const problemi: string[] = [];
  const stato = leggiStato(cartella);
  if (stato.tipo === 'non_valido') problemi.push(t.problemi.schemaNonValido(FILE_ONBOARDING.stato, stato.problemi));
  const risposte = leggiJson(assoluto(cartella, FILE_ONBOARDING.risposte));
  if (risposte.tipo === 'non_valido') problemi.push(t.problemi.jsonNonValido(FILE_ONBOARDING.risposte, risposte.problema));
  else if (risposte.tipo === 'valido') {
    const esito = RisposteSchema.safeParse(risposte.valore);
    if (!esito.success) problemi.push(t.problemi.schemaNonValido(FILE_ONBOARDING.risposte, formattaProblemi(esito.error)));
  }
  return problemi;
}

/** A presentazioni finite: niente "(da compilare…)" nel profilo e i ruoli sempre accesi al loro posto. */
export function validaCompletamento(cartella: string): string[] {
  const problemi: string[] = [];
  for (const rel of [FILE_ONBOARDING.identita, FILE_ONBOARDING.anima, FILE_ONBOARDING.utente, FILE_ONBOARDING.squadra]) {
    const testo = leggiTesto(assoluto(cartella, rel));
    if (testo?.includes(MARCA_DA_COMPILARE)) problemi.push(t.problemi.daCompilare(rel));
  }
  for (const nome of RUOLI_SEMPRE_ACCESI) {
    if (!esiste(assoluto(cartella, `${CARTELLA_RUOLI_ACCESI}/${nome}.md`))) problemi.push(t.problemi.mancaRuoloSempreAcceso(nome));
  }
  return problemi;
}
