/**
 * SHELL — processo principale di Electron (docs/02 §3-4): istanza singola, icona nella barra, una finestra,
 * sospensione/ripresa, avvio al login, chiusura ordinata. Il Nucleo gira qui dentro tramite `HostNucleo`
 * (nucleo-host.ts); i metodi di `window.spalla` arrivano come `ipcMain.handle('gruppo.metodo')`, validati con zod.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, Notification, powerMonitor, shell, Tray, type IpcMainInvokeEvent } from 'electron';
import { principale } from '@spalla/it-copy';
import { creaLoggerFile } from '../cli/logger.js';
import { NOMI_INVOKE } from '../ipc/schemi.js';
import { avviaNucleo } from '../nucleo/index.js';
import { calcolaPercorsi } from '../nucleo/percorsi.js';
import { autoverificaBinario, trovaBinarioClaude } from './binario.js';
import { creaFinestra, eUrlDellApp, type OpzioniFinestra } from './finestra.js';
import { bitmapIcona } from './icona.js';
import { creaPonteIpc } from './ipc-ponte.js';
import { creaHostNucleo, type Emetti, type HostNucleo, type PiattaformaShell } from './nucleo-host.js';

const NOME_PRODOTTO = 'Spalla';
/** Deve coincidere con `appId` della configurazione di electron-builder (notifiche su Windows). */
const ID_APP = 'it.spalla.desktop';
/** Argomento con cui il sistema ci avvia al login: si parte nella barra, senza finestra. */
const ARG_NASCOSTO = '--nascosto';
/** Prova del pacchetto (release.yml): avvia il binario di Claude Code dal percorso dato al Nucleo ed esce (0 = ok). */
const ARG_AUTOVERIFICA = '--autoverifica';
const ATTESA_MASSIMA_CHIUSURA_MS = 10_000;

const cartellaMain = path.dirname(fileURLToPath(import.meta.url));
const sviluppo = !app.isPackaged;

/** Solo sviluppo: SPALLA_MAX_TURNI=8 limita i passi di ogni scambio (prove a costo contenuto). */
function maxTurniSviluppo(): number | undefined {
  const n = Number.parseInt(process.env.SPALLA_MAX_TURNI ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

// Prima del blocco di istanza singola (che vive nella cartella userData): nome e cartella dei dati di Chromium.
// Senza, in sviluppo Electron userebbe "@spalla/desktop" dal package.json. Con SPALLA_HOME (prove, smoke) tutto
// resta lì sotto, così una prova non si scontra con l'app aperta; in sviluppo una cartella a parte dall'app installata.
app.setName(NOME_PRODOTTO);
app.setPath(
  'userData',
  process.env.SPALLA_HOME
    ? path.join(path.resolve(process.env.SPALLA_HOME), 'electron')
    : path.join(app.getPath('appData'), sviluppo ? `${NOME_PRODOTTO} (sviluppo)` : NOME_PRODOTTO),
);

if (process.argv.includes(ARG_AUTOVERIFICA)) {
  // Niente finestra, niente blocco di istanza singola: solo lo spawn che farebbe l'SDK, poi si esce.
  void autoverificaBinario(trovaBinarioClaude()).then((esito) => {
    for (const riga of esito.righe) console.log(riga);
    app.exit(esito.ok ? 0 : 1);
  });
} else if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  avviaShell();
}

function avviaShell(): void {
  app.setName(NOME_PRODOTTO);
  if (process.platform === 'win32') app.setAppUserModelId(ID_APP);

  const percorsi = calcolaPercorsi(NOME_PRODOTTO);
  const logger = creaLoggerFile(percorsi.logs, { ancheSuStderr: sviluppo });
  // Un solo percorso del binario per tutto (chat, prova di collegamento, lavori di sfondo, pannello): già fuori da
  // app.asar. Senza, l'SDK lo cercherebbe da sé dentro l'archivio e ogni richiesta fallirebbe (ENOTDIR).
  const binario = trovaBinarioClaude();
  if (!binario) logger.avviso('shell.binario_non_trovato', {});
  const opzioniFinestra: OpzioniFinestra = {
    cartellaMain,
    ...(sviluppo && process.env.ELECTRON_RENDERER_URL ? { urlSviluppo: process.env.ELECTRON_RENDERER_URL } : {}),
    titolo: NOME_PRODOTTO,
    strumentiSviluppo: sviluppo,
  };

  let finestra: BrowserWindow | undefined;
  let tray: Tray | undefined;
  let staUscendo = false;
  let nucleoFermato = false;
  const avviatoNascosto = process.argv.includes(ARG_NASCOSTO) || (process.platform === 'darwin' && app.isPackaged && app.getLoginItemSettings().wasOpenedAtLogin);

  // ----- eventi verso la finestra -----

  const emetti: Emetti = (nome, dati) => {
    const wc = finestra?.webContents;
    if (wc && !wc.isDestroyed()) wc.send(`evento.${nome}`, dati);
    if (nome === 'statoApp') void aggiornaMenuTray();
  };

  function mostraFinestra(): void {
    if (!app.isReady()) return;
    if (!finestra || finestra.isDestroyed()) {
      finestra = creaFinestra(opzioniFinestra);
      collegaFinestra(finestra);
    }
    if (process.platform === 'darwin') void app.dock?.show();
    if (finestra.isMinimized()) finestra.restore();
    finestra.show();
    finestra.focus();
  }

  function nascondiFinestra(): void {
    finestra?.hide();
    // Su Mac l'app resta solo nella barra dei menu: niente icona nel Dock finché la finestra è nascosta.
    if (process.platform === 'darwin') app.dock?.hide();
  }

  function collegaFinestra(f: BrowserWindow): void {
    f.once('ready-to-show', () => {
      if (!avviatoNascosto || f.isVisible()) f.show();
    });
    f.on('close', (evento) => {
      if (staUscendo) return;
      evento.preventDefault();
      nascondiFinestra();
    });
    f.on('focus', () => host.segnaAttivitaUtente());
    f.webContents.on('before-input-event', () => host.segnaAttivitaUtente());
  }

  // ----- piattaforma per l'host -----

  const piattaforma: PiattaformaShell = {
    versione: app.getVersion(),
    nomeProdotto: NOME_PRODOTTO,
    finestraAttiva: () => Boolean(finestra && !finestra.isDestroyed() && finestra.isVisible() && finestra.isFocused()),
    apriPercorso: (assoluto) => shell.openPath(assoluto),
    mostraNellaCartella: (assoluto) => shell.showItemInFolder(assoluto),
    apriLink: (url) => shell.openExternal(url),
    async scegliDestinazioneZip(nomeProposto) {
      const opzioni = {
        title: principale.esporta.titoloDialogo,
        buttonLabel: principale.esporta.pulsante,
        defaultPath: path.join(app.getPath('documents'), nomeProposto),
        filters: [{ name: principale.esporta.filtroZip, extensions: ['zip'] }],
      };
      const esito = finestra ? await dialog.showSaveDialog(finestra, opzioni) : await dialog.showSaveDialog(opzioni);
      if (esito.canceled || !esito.filePath) return undefined;
      return esito.filePath.toLowerCase().endsWith('.zip') ? esito.filePath : `${esito.filePath}.zip`;
    },
    // Fuori dall'app pacchettizzata non registriamo l'avvio al login (sarebbe l'eseguibile di Electron di sviluppo).
    avvioAutomatico: () => (app.isPackaged ? app.getLoginItemSettings().openAtLogin : undefined),
    impostaAvvioAutomatico(attivo) {
      if (!app.isPackaged) return;
      app.setLoginItemSettings({ openAtLogin: attivo, args: [ARG_NASCOSTO] });
    },
    notificaSistema(titolo, testo) {
      if (!Notification.isSupported()) return;
      const n = new Notification({ title: titolo, body: testo, silent: false });
      n.on('click', () => mostraFinestra());
      n.show();
    },
    nascondiFinestra,
  };

  const host: HostNucleo = creaHostNucleo({
    percorsi,
    piattaforma,
    emetti,
    logger,
    avviaNucleo: (opzioni) =>
      avviaNucleo({ percorsi, logger, modalitaDev: sviluppo, nomeProdotto: NOME_PRODOTTO, ...(binario ? { percorsoEseguibile: binario } : {}), ...opzioni }),
    trovaBinario: (riserva) => binario ?? trovaBinarioClaude(riserva ? { riserva } : {}),
    ...(sviluppo && maxTurniSviluppo() ? { maxTurniPerScambio: maxTurniSviluppo() } : {}),
  });

  // ----- IPC: un gestore per metodo del contratto, solo dalla nostra pagina -----

  const ponte = creaPonteIpc(host, () => logger);
  function mittenteValido(evento: IpcMainInvokeEvent): boolean {
    const url = evento.senderFrame?.url ?? '';
    return Boolean(finestra && evento.sender === finestra.webContents && eUrlDellApp(url, opzioniFinestra));
  }
  for (const nome of NOMI_INVOKE) {
    ipcMain.handle(nome, async (evento, ...argomenti: unknown[]) => {
      if (!mittenteValido(evento)) {
        logger.avviso('ipc.mittente_rifiutato', { metodo: nome });
        throw new Error(principale.errori.metodoSconosciuto(nome));
      }
      return ponte(nome, argomenti);
    });
  }

  // ----- icona nella barra -----

  function iconaTray(): Electron.NativeImage {
    if (process.platform === 'darwin') {
      // Immagine "template": il sistema la colora per tema chiaro e scuro.
      const img = nativeImage.createFromBitmap(bitmapIcona(32, { r: 0, g: 0, b: 0 }), { width: 32, height: 32, scaleFactor: 2 });
      img.setTemplateImage(true);
      return img;
    }
    return nativeImage.createFromBitmap(bitmapIcona(32, { r: 0x2f, g: 0x6f, b: 0x5e }), { width: 32, height: 32 });
  }

  async function aggiornaMenuTray(): Promise<void> {
    if (!tray || tray.isDestroyed()) return;
    const righe = await host.righeStato().catch(() => [principale.errori.nucleoNonPronto]);
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: principale.tray.apri, click: () => mostraFinestra() },
        { label: principale.tray.stato, submenu: righe.map((r) => ({ label: r, enabled: false })) },
        { type: 'separator' },
        { label: principale.tray.esci, click: () => app.quit() },
      ]),
    );
  }

  function creaTray(): void {
    tray = new Tray(iconaTray());
    tray.setToolTip(principale.tray.descrizione(NOME_PRODOTTO));
    // Su Windows e Linux il clic apre la finestra; su Mac il clic mostra il menu.
    if (process.platform !== 'darwin') tray.on('click', () => mostraFinestra());
    void aggiornaMenuTray();
  }

  // ----- ciclo di vita -----

  app.on('second-instance', () => mostraFinestra());
  // L'app resta nella barra anche senza finestre: il listener sostituisce l'uscita predefinita.
  app.on('window-all-closed', () => undefined);
  app.on('activate', () => mostraFinestra());

  app.on('before-quit', (evento) => {
    staUscendo = true;
    if (nucleoFermato) return;
    evento.preventDefault();
    const limite = setTimeout(() => {
      logger.avviso('shell.chiusura_forzata', {});
      nucleoFermato = true;
      app.quit();
    }, ATTESA_MASSIMA_CHIUSURA_MS);
    void host
      .ferma()
      .catch((e: unknown) => logger.errore('shell.nucleo_non_fermato', { errore: e instanceof Error ? e.message : String(e) }))
      .finally(() => {
        clearTimeout(limite);
        nucleoFermato = true;
        tray?.destroy();
        app.quit();
      });
  });

  powerMonitor.on('suspend', () => logger.info('shell.sospensione', {}));
  powerMonitor.on('resume', () => {
    logger.info('shell.ripresa', {});
    void host.ripresaDalSonno().catch((e: unknown) => logger.avviso('shell.ripresa_fallita', { errore: e instanceof Error ? e.message : String(e) }));
  });

  void app.whenReady().then(async () => {
    Menu.setApplicationMenu(process.platform === 'darwin' ? Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' }]) : null);
    creaTray();
    finestra = creaFinestra(opzioniFinestra);
    collegaFinestra(finestra);
    if (avviatoNascosto && process.platform === 'darwin') app.dock?.hide();
    try {
      await host.avvia();
      logger.info('shell.avviata', { piattaforma: process.platform, versione: app.getVersion() });
    } catch (e) {
      logger.errore('shell.nucleo_non_avviato', { errore: e instanceof Error ? e.message : String(e) });
      // Non bloccante (showErrorBox fermerebbe il processo principale): la barra resta usabile per uscire.
      void dialog.showMessageBox({ type: 'error', title: NOME_PRODOTTO, message: principale.errori.nucleoNonPronto });
    }
    void aggiornaMenuTray();
    setInterval(() => void aggiornaMenuTray(), 60_000).unref();
  });
}
