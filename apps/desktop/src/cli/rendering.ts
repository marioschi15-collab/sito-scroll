import type { DomandaUtente, EventoAssistente, RispostaUtente } from '../nucleo/contratti.js';
import type { Terminale } from './terminale.js';
import { testiCli } from './testi.js';

/**
 * Mostra gli eventi dell'assistente nel terminale: testo in streaming, strumenti come righe attenuate,
 * fine con durata e costo, errori in evidenza. Domande e permessi hanno i loro gestori (vedi cli.ts).
 */
export interface Renderer {
  mostra(evento: EventoAssistente): void;
  /** Da chiamare a fine scambio per chiudere una riga rimasta aperta. */
  chiudiRiga(): void;
}

export function formattaCosto(usd: number | undefined): string | undefined {
  if (usd === undefined) return undefined;
  return usd < 0.01 ? usd.toFixed(4) : usd.toFixed(3);
}

export function creaRenderer(t: Terminale): Renderer {
  let inStreaming = false;   // abbiamo scritto frammenti del blocco corrente
  let rigaAperta = false;    // l'ultima scrittura non termina con un a capo

  function aCapoSeServe(): void {
    if (rigaAperta) {
      t.scrivi('\n');
      rigaAperta = false;
    }
  }

  return {
    mostra(evento) {
      switch (evento.tipo) {
        case 'testo':
          if (evento.parziale) {
            t.scrivi(evento.testo);
            inStreaming = true;
            rigaAperta = !evento.testo.endsWith('\n');
          } else {
            // Il testo completo sostituisce i frammenti: se li abbiamo già mostrati, chiudiamo solo la riga.
            if (inStreaming) aCapoSeServe();
            else { aCapoSeServe(); t.scrivi(evento.testo + '\n'); }
            inStreaming = false;
          }
          return;
        case 'strumento': {
          aCapoSeServe();
          const chi = evento.ruolo ? `[${evento.ruolo}] ` : '';
          t.scrivi(t.attenua(`  · ${chi}${evento.descrizione}`) + '\n');
          return;
        }
        case 'permesso':
        case 'domanda':
          // Gestiti dal canale conferme e da rispondiDomanda: qui basta chiudere la riga.
          aCapoSeServe();
          return;
        case 'fine':
          aCapoSeServe();
          inStreaming = false;
          t.scrivi(t.attenua(testiCli.fine(evento.durataMs / 1000, evento.costoUsd, evento.turni)) + '\n');
          return;
        case 'errore':
          aCapoSeServe();
          inStreaming = false;
          t.scrivi(t.evidenzia(testiCli.errore(evento.messaggio)) + '\n');
          return;
      }
    },
    chiudiRiga: aCapoSeServe,
  };
}

/** "1,3" → etichette 1 e 3; qualunque altro testo → risposta libera. */
export function interpretaScelta(testo: string, domanda: DomandaUtente): string[] {
  const pulito = testo.trim();
  if (!pulito) return [];
  const pezzi = pulito.split(',').map((p) => p.trim());
  const numeri = pezzi.map((p) => (/^\d+$/.test(p) ? Number(p) : NaN));
  const tuttiNumeri = numeri.every((n) => Number.isInteger(n) && n >= 1 && n <= domanda.opzioni.length);
  if (!tuttiNumeri) return [pulito];
  const scelte = numeri.map((n) => domanda.opzioni[n - 1]?.etichetta).filter((e): e is string => Boolean(e));
  return domanda.multiSelezione ? [...new Set(scelte)] : scelte.slice(0, 1);
}

/** Mostra la domanda come opzioni numerate e raccoglie la risposta (numero o testo libero). */
export function creaRispondiDomanda(t: Terminale): (domanda: DomandaUtente) => Promise<RispostaUtente> {
  return async (domanda) => {
    t.scrivi('\n' + t.evidenzia(domanda.intestazione ? `${domanda.intestazione}: ${domanda.testo}` : domanda.testo) + '\n');
    domanda.opzioni.forEach((o, i) => {
      t.scrivi(`  ${i + 1}) ${o.etichetta}${o.descrizione ? t.attenua(` — ${o.descrizione}`) : ''}\n`);
    });
    t.scrivi(t.attenua(domanda.multiSelezione ? testiCli.domanda.suggerimentoMultipla : testiCli.domanda.suggerimentoSingola) + '\n');
    for (;;) {
      const riga = await t.chiedi(testiCli.promptScelta);
      if (riga === null) return { id: domanda.id, risposte: [] };
      const risposte = interpretaScelta(riga, domanda);
      if (risposte.length > 0) return { id: domanda.id, risposte };
    }
  };
}
