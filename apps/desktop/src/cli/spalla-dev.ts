#!/usr/bin/env -S node --import tsx
/**
 * Terminale di sviluppo di Spalla (docs/06 "pnpm dev"): calcola i percorsi (SPALLA_HOME), chiede la modalità del
 * cervello se non è configurata, avvia il Nucleo (memoria, Broker, agente, onboarding, scheduler, Telegram se c'è un
 * token) e apre la chat. Le presentazioni partono da sole la prima volta.
 *
 * Variabili utili: SPALLA_HOME (sposta tutto in una cartella), SPALLA_CONFIG_EREDITATA=1 (usa il login di Claude Code
 * già presente sulla macchina invece della cartella isolata: solo sviluppo), TELEGRAM_BOT_TOKEN (token del bot, in
 * alternativa alla procedura guidata /telegram).
 */
import path from 'node:path';
import { calcolaPercorsi } from '../nucleo/percorsi.js';
import { creaAuthChiaveApi, creaStoreSegreti, formatoChiaveValido } from '../nucleo/auth/index.js';
import { avviaNucleo } from '../nucleo/index.js';
import { creaCli } from './cli.js';
import { configIniziale, leggiConfig, scriviConfig, type ConfigDev } from './config-dev.js';
import { creaLoggerFile } from './logger.js';
import { creaTerminale, type Terminale } from './terminale.js';
import { testiCli } from './testi.js';

const NOME_PRODOTTO = 'Spalla';

async function scegliModalita(t: Terminale, datiApp: string, salvaChiave: (chiave: string) => Promise<void>): Promise<ConfigDev> {
  t.scrivi(t.evidenzia(testiCli.sceltaModalita.titolo) + '\n' + testiCli.sceltaModalita.chiaveApi + '\n' + testiCli.sceltaModalita.abbonamento + '\n');
  for (;;) {
    const scelta = (await t.chiedi(testiCli.promptScelta))?.trim();
    if (scelta === null || scelta === undefined) process.exit(0);
    if (scelta === '1') {
      for (;;) {
        const chiave = (await t.chiedi(testiCli.chiaveApi.incolla))?.trim();
        if (chiave === undefined) process.exit(0);
        if (!formatoChiaveValido(chiave)) { t.scrivi(testiCli.chiaveApi.nonValida + '\n'); continue; }
        await salvaChiave(chiave);
        t.scrivi(testiCli.chiaveApi.salvata + '\n');
        break;
      }
      const config = configIniziale('chiave_api');
      scriviConfig(datiApp, config);
      return config;
    }
    if (scelta === '2') {
      t.scrivi(testiCli.abbonamento.avviso + '\n');
      const config = configIniziale('abbonamento');
      scriviConfig(datiApp, config);
      return config;
    }
    t.scrivi(testiCli.sceltaModalita.nonValida + '\n');
  }
}

async function main(): Promise<void> {
  const percorsi = calcolaPercorsi(NOME_PRODOTTO);
  const usaConfigEreditata = process.env.SPALLA_CONFIG_EREDITATA === '1';
  const logger = creaLoggerFile(percorsi.logs, { ancheSuStderr: false });
  const terminale = creaTerminale(process.stdin, process.stdout);

  // L'SDK avvisa che le regole allow nude (Glob, Grep, WebSearch...) non passano da canUseTool: è voluto (docs/02 §3.2).
  // Lo registriamo nel log invece che sul terminale; gli altri avvisi di Node restano visibili.
  process.removeAllListeners('warning');
  process.on('warning', (w) => {
    if ((w as NodeJS.ErrnoException).code === 'CLAUDE_SDK_CAN_USE_TOOL_SHADOWED') logger.info('sdk.avviso_allow', { messaggio: w.message.slice(0, 160) });
    else process.stderr.write(`${w.name}: ${w.message}\n`);
  });

  // Prima configurazione: la scelta del cervello precede il Nucleo, che la legge da config.json.
  let configDev = leggiConfig(percorsi.datiApp);
  const primaConfigurazione = !configDev;
  if (!configDev) {
    const store = creaStoreSegreti(percorsi.segreti);
    configDev = await scegliModalita(terminale, percorsi.datiApp, (chiave) => creaAuthChiaveApi(store).salvaChiave(chiave));
  }

  const nucleo = await avviaNucleo({
    percorsi,
    modalitaDev: true,
    usaConfigEreditata,
    logger,
    nomeProdotto: NOME_PRODOTTO,
    suEventoTelegram: (e) => {
      if (e.tipo === 'pairing_richiesto') terminale.scrivi('\n' + testiCli.telegram.inAttesaCodice(e.codice, e.nomeMostrato) + '\n');
      if (e.tipo === 'collegato') terminale.scrivi('\n' + testiCli.telegram.confermato(nucleo.controlloTelegram.username() ?? '?') + '\n');
    },
  });
  const { config } = nucleo;

  if (config.cervello.modalita === 'abbonamento' && !usaConfigEreditata) {
    terminale.scrivi(testiCli.abbonamento.comeCollegare(`CLAUDE_CONFIG_DIR=${percorsi.configClaude} claude /login`) + '\n');
  }
  if (primaConfigurazione) {
    terminale.scrivi(terminale.attenua(testiCli.verifica.inCorso) + '\n');
    const esito = await nucleo.auth.verifica();
    terminale.scrivi(esito.messaggio + '\n\n');
  }

  const cli = creaCli({
    runtime: nucleo.agente,
    broker: nucleo.broker,
    terminale,
    logger,
    dispatcher: nucleo.dispatcher,
    onboarding: nucleo.onboarding,
    telegramControllo: nucleo.controlloTelegram,
    memoria: nucleo.memoria,
    avviaServizi: false,
    cartellaLavoro: percorsi.cartellaLavoro,
    info: { prodotto: NOME_PRODOTTO, modalita: config.cervello.modalita },
  });
  logger.info('cli.avvio', { cartellaLavoro: path.basename(percorsi.cartellaLavoro), modalita: config.cervello.modalita, configEreditata: usaConfigEreditata });
  try {
    await cli.avvia();
  } finally {
    await nucleo.ferma();
  }
  process.exit(0);
}

main().catch((errore: unknown) => {
  process.stderr.write(`${errore instanceof Error ? errore.message : String(errore)}\n`);
  process.exit(1);
});
