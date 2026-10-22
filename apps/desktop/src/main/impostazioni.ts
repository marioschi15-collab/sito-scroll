import type { Config, ConfigParziale } from '@spalla/schema';
import type { Impostazioni } from '../ipc/contratto.js';

/**
 * Impostazioni della finestra ↔ config.json del Nucleo (docs/05 §4.4). La lettura e la scrittura passano dal
 * modulo `configurazione` del Nucleo (`leggiConfigurazione`/`aggiornaConfigurazione`): qui solo la traduzione
 * dei nomi. L'avvio automatico non sta in config.json: lo tiene il sistema (login items) o lo stato della finestra.
 */

export function impostazioniDaConfig(config: Config, avvioAutomatico: boolean, modalitaScelta?: Config['cervello']['modalita']): Impostazioni {
  return {
    cervello: {
      ...(modalitaScelta ? { modalita: modalitaScelta } : {}),
      livello: config.cervello.livello,
      tettoMensileEur: config.cervello.tetto_mensile_eur,
    },
    orari: { silenzioDa: config.orari.silenzio_da, silenzioA: config.orari.silenzio_a, domenica: config.orari.domenica },
    brief: { attivo: config.brief.attivo, ora: config.brief.ora, canale: config.brief.canale },
    riordinoNotturno: { attivo: config.riordino_notturno.attivo, ora: config.riordino_notturno.ora },
    voce: { desktop: config.voce.desktop, risposteVocaliTelegram: config.telegram.risposte_vocali },
    avvioAutomatico,
  };
}

/**
 * Le modifiche da unire a config.json. La modalità del cervello NON passa da qui: si cambia con
 * `cervello.cambiaModalita` (serve un riavvio del Nucleo e, per la chiave, la chiave stessa).
 */
export function modificheConfig(i: Impostazioni): ConfigParziale {
  return {
    cervello: { livello: i.cervello.livello, tetto_mensile_eur: i.cervello.tettoMensileEur },
    orari: { silenzio_da: i.orari.silenzioDa, silenzio_a: i.orari.silenzioA, domenica: i.orari.domenica },
    brief: { attivo: i.brief.attivo, ora: i.brief.ora, canale: i.brief.canale },
    riordino_notturno: { attivo: i.riordinoNotturno.attivo, ora: i.riordinoNotturno.ora },
    voce: { desktop: i.voce.desktop },
    telegram: { risposte_vocali: i.voce.risposteVocaliTelegram },
  };
}

/** True se due configurazioni differiscono in ciò che il Nucleo legge all'avvio (serve un riavvio per applicarle). */
export function richiedeRiavvio(prima: Config, dopo: Config): boolean {
  return JSON.stringify(prima) !== JSON.stringify(dopo);
}
