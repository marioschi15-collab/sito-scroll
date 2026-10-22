import { z } from 'zod';
import { FaseSchema, IdDomandaSchema, NomeRuoloSchema, NomeSkillSchema, RamoSchema, RAMI } from './comune.js';
import { ErroreSchema, formattaProblemi, type Esito } from './errori.js';
import { parseYamlOggetto } from './frontmatter.js';

export const TipoDomandaSchema = z.enum(['chip', 'chip_multiple', 'testo', 'testo_chip']);
export type TipoDomanda = z.infer<typeof TipoDomandaSchema>;

/** Una domanda della banca (docs/05 §3). L'intestazione è il titolo corto del riquadro (max 12 caratteri). */
export const DomandaSchema = z
  .strictObject({
    id: IdDomandaSchema,
    fase: FaseSchema,
    ramo: RamoSchema,
    tipo: TipoDomandaSchema,
    intestazione: z.string().min(1).max(12).optional(),
    testo: z.string().min(5),
    chip: z.array(z.string().min(1)).default([]),
    scrive_in: z.array(z.string().min(1)).min(1),
    nota: z.string().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.tipo === 'testo' && d.chip.length > 0) {
      ctx.addIssue({ code: 'custom', path: ['chip'], message: 'una domanda di tipo "testo" non ha chip' });
    }
    if ((d.tipo === 'chip' || d.tipo === 'chip_multiple') && d.chip.length < 2) {
      ctx.addIssue({ code: 'custom', path: ['chip'], message: 'una domanda a chip ha almeno 2 opzioni' });
    }
    if (d.tipo === 'testo_chip' && d.chip.length < 1) {
      ctx.addIssue({ code: 'custom', path: ['chip'], message: 'una domanda "testo_chip" ha almeno una chip di aiuto' });
    }
    if (new Set(d.chip).size !== d.chip.length) {
      ctx.addIssue({ code: 'custom', path: ['chip'], message: 'chip duplicate' });
    }
  });
export type Domanda = z.infer<typeof DomandaSchema>;

export const PrimoColpoSchema = z.strictObject({
  numero: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  titolo: z.string().min(5),
  serve: z.string().min(3),
  produce: z.string().min(3),
  skill: NomeSkillSchema.nullable(),
});
export type PrimoColpo = z.infer<typeof PrimoColpoSchema>;

export const SquadraRamoSchema = z.strictObject({
  accesi: z.array(NomeRuoloSchema).min(1).max(3),
  candidati: z.array(z.strictObject({ ruolo: NomeRuoloSchema, se: z.string().min(3) })).default([]),
  spenti: z.array(NomeRuoloSchema),
  nascosti: z.array(NomeRuoloSchema).optional(),
  nota: z.string().optional(),
});
export type SquadraRamo = z.infer<typeof SquadraRamoSchema>;

export const SquadreSchema = z.strictObject({
  venditore: SquadraRamoSchema,
  freelance: SquadraRamoSchema,
  titolare: SquadraRamoSchema,
  artigiano: SquadraRamoSchema,
  dipendente: SquadraRamoSchema,
  comune: SquadraRamoSchema,
  sempre: z.array(z.strictObject({ ruolo: NomeRuoloSchema, perche: z.string().min(3) })),
});

/** L'intero blocco yaml di onboarding/domande.md. */
export const DomandeSchema = z
  .strictObject({
    versione: z.literal(1),
    domande: z.array(DomandaSchema).min(1),
    primi_colpi: z.partialRecord(RamoSchema, z.array(PrimoColpoSchema).length(3)).optional(),
    squadre: SquadreSchema.optional(),
  })
  .superRefine((banca, ctx) => {
    const viste = new Set<string>();
    banca.domande.forEach((d, i) => {
      const chiave = `${d.ramo}/${d.id}`;
      if (viste.has(chiave)) {
        ctx.addIssue({ code: 'custom', path: ['domande', i, 'id'], message: `domanda duplicata per il ramo: ${chiave}` });
      }
      viste.add(chiave);
    });
    for (const id of ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6'] as const) {
      if (!viste.has(`comune/${id}`)) {
        ctx.addIssue({ code: 'custom', path: ['domande'], message: `manca la domanda comune ${id}` });
      }
    }
  });
export type BancaDomande = z.infer<typeof DomandeSchema>;

const BLOCCO_YAML = /^```ya?ml[^\n]*\n([\s\S]*?)\n```[ \t]*$/gm;

/** Estrae l'UNICO blocco ```yaml di un Markdown; errore se non c'è o ce n'è più di uno. */
export function estraiBloccoYaml(markdown: string): Esito<string> {
  const blocchi = [...markdown.matchAll(BLOCCO_YAML)].map((m) => m[1] ?? '');
  if (blocchi.length === 0) return { ok: false, problemi: ['nessun blocco ```yaml trovato'] };
  if (blocchi.length > 1) return { ok: false, problemi: [`attesi 1 blocco \`\`\`yaml, trovati ${blocchi.length}`] };
  return { ok: true, valore: blocchi[0] ?? '' };
}

/** Versione senza eccezioni di `parseDomande`. */
export function provaParseDomande(markdownDomande: string): Esito<BancaDomande> {
  const blocco = estraiBloccoYaml(markdownDomande);
  if (!blocco.ok) return blocco;
  let grezzo: Record<string, unknown>;
  try {
    grezzo = parseYamlOggetto(blocco.valore, 'domande.md');
  } catch (e) {
    return { ok: false, problemi: [(e as Error).message] };
  }
  const esito = DomandeSchema.safeParse(grezzo);
  if (!esito.success) return { ok: false, problemi: formattaProblemi(esito.error) };
  return { ok: true, valore: esito.data };
}

/** Legge onboarding/domande.md (il blocco yaml) e restituisce la banca domande validata. Lancia ErroreSchema. */
export function parseDomande(markdownDomande: string): BancaDomande {
  const esito = provaParseDomande(markdownDomande);
  if (!esito.ok) throw new ErroreSchema('Banca domande non valida', esito.problemi);
  return esito.valore;
}

/** Le domande di un ramo: quelle del ramo sostituiscono le omonime comuni (es. Q4a, Q5), il resto è comune. */
export function domandePerRamo(banca: BancaDomande, ramo: Domanda['ramo']): Domanda[] {
  const delRamo = new Map(banca.domande.filter((d) => d.ramo === ramo).map((d) => [d.id, d]));
  const comuni = banca.domande.filter((d) => d.ramo === 'comune').map((d) => delRamo.get(d.id) ?? d);
  const soloDelRamo = banca.domande.filter((d) => d.ramo === ramo && !comuni.some((c) => c.id === d.id));
  return ramo === 'comune' ? comuni : [...comuni, ...soloDelRamo];
}

export { RAMI };
