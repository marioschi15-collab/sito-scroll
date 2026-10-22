import { telegram as testiTelegramItCopy } from '@spalla/it-copy';
import { Api, GrammyError, type ApiClientOptions } from 'grammy';

/** Formato del token di BotFather: id numerico, due punti, 35 caratteri. */
export const REGEX_TOKEN = /^\d{8,10}:[A-Za-z0-9_-]{35}$/;
export const LINK_BOTFATHER = 'https://t.me/BotFather';

export interface TestiBotFather {
  codiceNonValido: string;
  verificaOk: (username: string) => string;
  verificaFallita: string;
}

/** Predefiniti da @spalla/it-copy (`telegram.botfather`): nessuna copia locale che possa divergere. */
const testiRiserva: TestiBotFather = testiBotFatherDa(testiTelegramItCopy.botfather);

export interface OpzioniBotFather {
  /** `fetch` iniettabile (test offline). */
  fetch?: typeof fetch;
  testi?: Partial<TestiBotFather>;
  /** Suffisso casuale dello username suggerito (iniettabile nei test). */
  suffisso?: () => string;
}

export type EsitoVerifica = { ok: true; username: string; id: number; messaggio: string } | { ok: false; messaggio: string };

/** Toglie spazi, virgolette e un eventuale "token:" o "bot" incollati per sbaglio davanti alla riga. */
export function normalizzaToken(incollato: string): string {
  const pulito = incollato.replace(/["'`\s]+/g, '');
  if (REGEX_TOKEN.test(pulito)) return pulito;
  const senzaPrefisso = pulito.replace(/^(token[:=]?|bot)/i, '');
  return REGEX_TOKEN.test(senzaPrefisso) ? senzaPrefisso : pulito;
}

/** Da "Bruno di Marco" → "bruno_di_marco_7k3p_bot" (5-32 caratteri, finisce con "bot"). */
export function suggerisciUsername(nomeAssistente: string, nomeUtente: string, suffisso: string): string {
  const base = `${nomeAssistente} di ${nomeUtente}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_')
    .slice(0, 20)
    .replace(/_+$/g, '');
  const radice = /^[a-z]/.test(base) ? base : `spalla_${base}`;
  return `${radice}_${suffisso}_bot`.slice(-32).replace(/^_+/, '');
}

function suffissoCasuale(): string {
  const alfabeto = 'abcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < 4; i++) s += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  return s;
}

/**
 * Procedura BotFather di riserva (docs/02 §8.3): suggerimenti da copiare, controllo del formato del token
 * e verifica con `getMe`. I testi di schermata vengono da @spalla/it-copy (`telegram.botfather`).
 */
export function creaProceduraBotFather(opzioni: OpzioniBotFather = {}) {
  const testi: TestiBotFather = { ...testiRiserva, ...opzioni.testi };
  const suffisso = opzioni.suffisso ?? suffissoCasuale;
  const client: ApiClientOptions | undefined = opzioni.fetch ? { fetch: opzioni.fetch } : undefined;

  return {
    linkBotFather: LINK_BOTFATHER,
    regexToken: REGEX_TOKEN,
    /** Nome e username da incollare in BotFather. */
    suggerisci(nomeAssistente: string, nomeUtente: string): { nome: string; username: string } {
      return { nome: `${nomeAssistente} di ${nomeUtente}`, username: suggerisciUsername(nomeAssistente, nomeUtente, suffisso()) };
    },
    validaFormato(incollato: string): boolean {
      return REGEX_TOKEN.test(normalizzaToken(incollato));
    },
    normalizza: normalizzaToken,
    /** Controlla formato e, con `getMe`, che Telegram riconosca il token. Non registra mai il token. */
    async verifica(incollato: string): Promise<EsitoVerifica> {
      const token = normalizzaToken(incollato);
      if (!REGEX_TOKEN.test(token)) return { ok: false, messaggio: testi.codiceNonValido };
      try {
        const me = await new Api(token, client).getMe();
        if (!me.is_bot || !me.username) return { ok: false, messaggio: testi.verificaFallita };
        return { ok: true, username: me.username, id: me.id, messaggio: testi.verificaOk(me.username) };
      } catch (errore) {
        if (errore instanceof GrammyError) return { ok: false, messaggio: testi.verificaFallita };
        return { ok: false, messaggio: testi.verificaFallita };
      }
    },
  };
}

export type ProceduraBotFather = ReturnType<typeof creaProceduraBotFather>;

/** Comodità per l'integratore: testi BotFather dal blocco `telegram.botfather` di @spalla/it-copy. */
export function testiBotFatherDa(botfather: { codiceNonValido: string; verificaOk: (u: string) => string; verificaFallita: string }): TestiBotFather {
  return { codiceNonValido: botfather.codiceNonValido, verificaOk: botfather.verificaOk, verificaFallita: botfather.verificaFallita };
}
