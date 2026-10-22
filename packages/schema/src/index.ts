import { z } from 'zod';
import * as locales from 'zod/locales';

// Messaggi di validazione in italiano per tutto il processo: l'app è italiana e i problemi arrivano all'utente.
z.config(locales.it());

export { TETTI_MEMORIA, CAMBIO_USD_EUR } from './tetti.js';
export { ErroreSchema, formattaProblemi, type Esito } from './errori.js';
export { separaFrontmatter, parseYamlOggetto, type FrontmatterSeparato } from './frontmatter.js';
export {
  RAMI,
  RamoSchema,
  type Ramo,
  FASI,
  FaseSchema,
  type FaseOnboarding,
  RUOLI_CATALOGO,
  NomeRuoloSchema,
  type NomeRuolo,
  SKILL_CATALOGO,
  NomeSkillSchema,
  type NomeSkill,
  STRUMENTI_AMMESSI,
  StrumentoSchema,
  type StrumentoRuolo,
  CANALI,
  CanaleSchema,
  IdDomandaSchema,
  DataSchema,
  OraSchema,
  IstanteSchema,
  SEGNAPOSTO,
} from './comune.js';
export {
  FrontmatterRuoloSchema,
  MetadatiSpallaSchema,
  parseRuolo,
  provaParseRuolo,
  haSegnapostoDaCompilare,
  type FrontmatterRuolo,
  type MetadatiSpalla,
  type Ruolo,
} from './ruolo.js';
export {
  DomandeSchema,
  DomandaSchema,
  TipoDomandaSchema,
  PrimoColpoSchema,
  SquadraRamoSchema,
  SquadreSchema,
  parseDomande,
  provaParseDomande,
  estraiBloccoYaml,
  domandePerRamo,
  type BancaDomande,
  type Domanda,
  type TipoDomanda,
  type PrimoColpo,
  type SquadraRamo,
} from './domande.js';
export { ConfigSchema, OrariSchema, BriefSchema, CONFIG_PREDEFINITA, type Config, type ConfigParziale } from './config.js';
export {
  StatoOnboardingSchema,
  RisposteSchema,
  RispostaOnboardingSchema,
  ImpostazioniOnboardingSchema,
  SquadraSceltaSchema,
  MARCATORI_APP,
  PRIMO_AVVIO_COMPLETATO_PREFISSO,
  type StatoOnboarding,
  type Risposte,
  type RispostaOnboarding,
  type ImpostazioniOnboarding,
} from './onboarding.js';
export { cartellaTemplates, PERCORSI_MODELLI } from './modelli.js';
