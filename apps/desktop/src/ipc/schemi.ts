/**
 * SCHEMI IPC (zod): un elenco di argomenti validato per ogni metodo di `ApiSpalla` (contratto.ts).
 *
 * Il processo principale valida OGNI chiamata prima di toccare il Nucleo: il renderer è codice nostro ma gira in
 * una sandbox e mostra contenuti scritti dall'assistente; lo trattiamo come non attendibile (docs/02 §10).
 * Il preload non importa questo file (resta piccolo e senza dipendenze): passa gli argomenti così come sono.
 */
import { z } from 'zod';
import type { NomeEvento, NomeInvoke } from './contratto.js';

// ---------------------------------------------------------------------------------------------------------
// Mattoni
// ---------------------------------------------------------------------------------------------------------

const MAX_TESTO = 100_000;

/** Id generati dal renderer (uuid o simili): niente spazi né caratteri strani. */
export const IdSchema = z.string().min(1).max(100).regex(/^[A-Za-z0-9_.:-]+$/, { error: 'id non valido' });

/** Id breve delle richieste di permesso (≤ 20 caratteri, docs/02 §6). */
export const IdPermessoSchema = z.string().min(1).max(20).regex(/^[A-Za-z0-9_-]+$/, { error: 'id non valido' });

/**
 * Percorso relativo alla cartella di lavoro: niente assoluti, niente "..", niente caratteri di controllo.
 * Il processo principale ricontrolla comunque, dopo aver risolto il percorso, che resti dentro la cartella.
 */
export const PercorsoRelativoSchema = z
  .string()
  .min(1)
  .max(1024)
  .refine((p) => !/[\u0000-\u001f]/.test(p), { error: 'caratteri non ammessi' })
  .refine((p) => !p.startsWith('/') && !p.startsWith('\\') && !/^[A-Za-z]:/.test(p) && !p.startsWith('~'), { error: 'percorso assoluto' })
  .refine((p) => !p.split(/[\\/]+/).includes('..'), { error: 'percorso fuori cartella' });

export const CanaleSchema = z.enum(['desktop', 'telegram', 'voce', 'sistema']);
export const ModalitaCervelloSchema = z.enum(['chiave_api', 'abbonamento']);
export const LivelloModelloSchema = z.enum(['economico', 'equilibrato', 'massima']);
const OraSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: 'ora attesa nel formato HH:MM' });
const TettoSchema = z.number().positive().max(100_000).nullable();

export const AvvioScambioSchema = z.object({
  scambioId: IdSchema,
  testo: z.string().max(MAX_TESTO),
  // Dalla finestra arriva solo "desktop" (o "voce" quando ci sarà il push-to-talk): gli altri canali hanno il loro ingresso.
  canale: z.enum(['desktop', 'voce']),
  allegati: z.array(PercorsoRelativoSchema).max(20).optional(),
  rituale: z.boolean().optional(),
});

export const RispostaSchema = z.object({
  scambioId: IdSchema,
  id: z.string().min(1).max(200),
  risposte: z.array(z.string().max(4000)).max(20),
});

/**
 * Decisione sul permesso. `inputAggiornato` NON è accettato dalla finestra (viene scartato): l'input dello strumento
 * lo decide l'assistente, la finestra può solo consentire o negare.
 */
export const DecisionePermessoSchema = z.discriminatedUnion('esito', [
  z.object({ esito: z.literal('consenti') }),
  z.object({ esito: z.literal('nega'), motivo: z.string().max(2000) }),
]);

export const ImpostazioniSchema = z.object({
  cervello: z.object({
    modalita: ModalitaCervelloSchema.optional(),
    livello: LivelloModelloSchema,
    tettoMensileEur: TettoSchema,
  }),
  orari: z.object({ silenzioDa: OraSchema, silenzioA: OraSchema, domenica: z.enum(['silenzio', 'normale']) }),
  brief: z.object({ attivo: z.boolean(), ora: OraSchema, canale: z.enum(['telegram', 'desktop']) }),
  riordinoNotturno: z.object({ attivo: z.boolean(), ora: OraSchema }),
  voce: z.object({ desktop: z.enum(['spento', 'push_to_talk']), risposteVocaliTelegram: z.boolean() }),
  avvioAutomatico: z.boolean(),
});

const UrlSchema = z
  .string()
  .max(2048)
  .refine(
    (u) => {
      try {
        const url = new URL(u);
        return url.protocol === 'https:' || url.protocol === 'http:';
      } catch {
        return false;
      }
    },
    { error: 'indirizzo non valido' },
  );

/** Percorsi assoluti dei file trascinati, ricavati dal preload con `webUtils.getPathForFile`. */
const PercorsiTrascinatiSchema = z.array(z.string().min(1).max(4096).refine((p) => !/[\u0000]/.test(p))).min(1).max(20);

const nessuno = z.tuple([]);

// ---------------------------------------------------------------------------------------------------------
// Tabella: metodo → argomenti
// ---------------------------------------------------------------------------------------------------------

export const SCHEMI_INVOKE = {
  'app.stato': nessuno,
  'app.apriNelSistema': z.tuple([PercorsoRelativoSchema]),
  'app.apriLink': z.tuple([UrlSchema]),
  'app.esportaTutto': nessuno,
  'app.chiudi': nessuno,

  'onboarding.stato': nessuno,
  'onboarding.prepara': nessuno,
  'onboarding.completa': nessuno,
  'onboarding.risposte': nessuno,
  'onboarding.ricomincia': z.tuple([z.enum(['presentazioni', 'squadra', 'tutto'])]),

  'chat.invia': z.tuple([AvvioScambioSchema]),
  'chat.rispondi': z.tuple([RispostaSchema]),
  'chat.nuovaSessione': nessuno,
  'chat.interrompi': z.tuple([IdSchema]),

  'permessi.decidi': z.tuple([IdPermessoSchema, DecisionePermessoSchema]),
  'permessi.inAttesa': nessuno,

  // La chiave: forma larga qui (lunghezza), il formato esatto lo controlla il Nucleo con un messaggio in italiano.
  'cervello.collegaChiaveApi': z.tuple([z.string().min(1).max(500), TettoSchema, LivelloModelloSchema]),
  'cervello.rimuoviChiaveApi': nessuno,
  'cervello.avviaPannelloLogin': nessuno,
  'cervello.chiudiPannelloLogin': nessuno,
  'cervello.verifica': nessuno,
  'cervello.cambiaModalita': z.tuple([ModalitaCervelloSchema]),

  'terminale.scrivi': z.tuple([z.string().max(64 * 1024)]),
  'terminale.ridimensiona': z.tuple([z.number().int().min(2).max(1000), z.number().int().min(2).max(500)]),

  'telegram.stato': nessuno,
  'telegram.suggerimenti': nessuno,
  'telegram.collegaConToken': z.tuple([z.string().min(1).max(2000)]),
  'telegram.collegaInDueTocchi': nessuno,
  'telegram.confermaPairing': z.tuple([z.string().trim().min(1).max(32)]),
  'telegram.scollega': nessuno,

  'squadra.elenco': nessuno,
  'squadra.attiva': z.tuple([z.string().regex(/^[a-z][a-z0-9-]{1,40}$/)]),
  'squadra.disattiva': z.tuple([z.string().regex(/^[a-z][a-z0-9-]{1,40}$/)]),

  'memoria.elenco': nessuno,
  'memoria.leggi': z.tuple([PercorsoRelativoSchema]),
  'memoria.cerca': z.tuple([z.string().max(500)]),
  'memoria.contatori': nessuno,
  'memoria.ricostruisciIndice': nessuno,
  'memoria.riepilogoProfilo': nessuno,

  'impostazioni.leggi': nessuno,
  'impostazioni.salva': z.tuple([ImpostazioniSchema]),

  'voce.stato': nessuno,
  'voce.prepara': nessuno,

  'allegati.aggiungi': z.tuple([PercorsiTrascinatiSchema]),
} as const satisfies Record<NomeInvoke, z.ZodTuple>;

/** Gli argomenti già validati di un metodo. */
export type ArgomentiDi<N extends NomeInvoke> = z.infer<(typeof SCHEMI_INVOKE)[N]>;

export const NOMI_INVOKE = Object.keys(SCHEMI_INVOKE) as NomeInvoke[];

/** Tutti gli eventi che il processo principale può mandare (stesso ordine di `ApiSpalla['on']`). */
export const NOMI_EVENTO = [
  'evento.eventoScambio',
  'evento.domanda',
  'evento.permesso',
  'evento.permessoChiuso',
  'evento.terminaleDati',
  'evento.terminaleStato',
  'evento.telegramStato',
  'evento.statoApp',
  'evento.voceAvanzamento',
  'evento.notifica',
  'evento.apriSchermata',
  'evento.domandaChiusa',
] as const satisfies readonly NomeEvento[];

// Controllo a tempo di compilazione: nessun evento del contratto manca dall'elenco.
type EventiMancanti = Exclude<NomeEvento, (typeof NOMI_EVENTO)[number]>;
const _tuttiGliEventi: EventiMancanti extends never ? true : never = true;
void _tuttiGliEventi;

/** Errore di validazione: il messaggio è già in italiano (arriva alla finestra). */
export class ErroreIpc extends Error {
  constructor(messaggio: string, readonly codice: 'parametri' | 'sconosciuto') {
    super(messaggio);
    this.name = 'ErroreIpc';
  }
}

export function eNomeInvoke(nome: string): nome is NomeInvoke {
  return Object.prototype.hasOwnProperty.call(SCHEMI_INVOKE, nome);
}

/** Frasi per i motivi di rifiuto (da @spalla/it-copy, `principale.errori.validazione`). */
export interface TestiValidazione {
  testoTroppoLungo(n: number): string;
  testoMancante: string;
  testoTroppoCorto(n: number): string;
  troppiElementi(n: number): string;
  pochiElementi(n: number): string;
  numeroTroppoGrande(n: number): string;
  numeroTroppoPiccolo(n: number): string;
  formato: string;
  scelta: string;
  generico: string;
}

/**
 * Il motivo di un rifiuto in italiano, dal codice del problema (mai il messaggio inglese della libreria, mai il nome
 * del campo né il valore). I controlli scritti da noi (`refine`) hanno già una frase italiana e la tengono.
 */
export function fraseProblema(problema: z.core.$ZodIssue | undefined, v: TestiValidazione): string {
  if (!problema) return v.generico;
  const p = problema as { code: string; origin?: string; maximum?: number | bigint; minimum?: number | bigint; message: string };
  const n = (x: number | bigint | undefined): number => Number(x ?? 0);
  switch (p.code) {
    case 'too_big':
      if (p.origin === 'string') return v.testoTroppoLungo(n(p.maximum));
      if (p.origin === 'array' || p.origin === 'set') return v.troppiElementi(n(p.maximum));
      return v.numeroTroppoGrande(n(p.maximum));
    case 'too_small':
      if (p.origin === 'string') return n(p.minimum) <= 1 ? v.testoMancante : v.testoTroppoCorto(n(p.minimum));
      if (p.origin === 'array' || p.origin === 'set') return v.pochiElementi(n(p.minimum));
      return v.numeroTroppoPiccolo(n(p.minimum));
    case 'invalid_format':
      return v.formato;
    case 'invalid_value':
    case 'invalid_union':
      return v.scelta;
    case 'custom':
      return p.message || v.generico;
    default:
      return v.generico;
  }
}

/**
 * Valida gli argomenti di una chiamata. Lancia `ErroreIpc` con una frase breve in italiano (il motivo, mai i valori:
 * potrebbero essere una chiave o un token; mai il nome tecnico del campo).
 */
export function validaArgomenti<N extends NomeInvoke>(
  nome: N,
  argomenti: readonly unknown[],
  testi: { parametriNonValidi(dettaglio: string): string; metodoSconosciuto(nome: string): string; validazione: TestiValidazione },
): ArgomentiDi<N> {
  if (!eNomeInvoke(nome)) throw new ErroreIpc(testi.metodoSconosciuto(String(nome).slice(0, 60)), 'sconosciuto');
  const schema = SCHEMI_INVOKE[nome] as z.ZodTuple;
  const esito = schema.safeParse([...argomenti]);
  if (!esito.success) throw new ErroreIpc(testi.parametriNonValidi(fraseProblema(esito.error.issues[0], testi.validazione)), 'parametri');
  return esito.data as ArgomentiDi<N>;
}
