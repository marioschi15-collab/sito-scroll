import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { BrowserWindow, nativeTheme, session, shell, type WebContents } from 'electron';

/**
 * L'unica finestra di Spalla (docs/02 §4, §10): sandbox, contextIsolation, niente Node nella pagina, niente
 * contenuti remoti, niente nuove finestre (i link http/https si aprono nel browser), niente navigazione fuori
 * dalla pagina dell'app, nessun permesso del browser tranne la copia negli appunti.
 */

export interface OpzioniFinestra {
  /** Cartella compilata del processo principale (out/main): preload e pagina si trovano da qui. */
  cartellaMain: string;
  /** URL del server di sviluppo (electron-vite: ELECTRON_RENDERER_URL); assente in produzione. */
  urlSviluppo?: string;
  titolo: string;
  strumentiSviluppo: boolean;
}

export function percorsoPagina(o: OpzioniFinestra): string {
  return path.join(o.cartellaMain, '..', 'renderer', 'index.html');
}

/** True se `url` è la pagina dell'app (server di sviluppo o file della build). */
export function eUrlDellApp(url: string, o: OpzioniFinestra): boolean {
  try {
    const u = new URL(url);
    if (o.urlSviluppo) {
      const sviluppo = new URL(o.urlSviluppo);
      if (u.origin === sviluppo.origin) return true;
    }
    return u.protocol === 'file:' && u.pathname === pathToFileURL(percorsoPagina(o)).pathname;
  } catch {
    return false;
  }
}

function linkEsterno(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Permessi del browser: tutto negato tranne scrivere negli appunti (pulsante "Copia"). */
function proteggiSessione(): void {
  const consentiti = new Set(['clipboard-sanitized-write']);
  session.defaultSession.setPermissionRequestHandler((_wc, permesso, risposta) => risposta(consentiti.has(permesso)));
  session.defaultSession.setPermissionCheckHandler((_wc, permesso) => consentiti.has(permesso));
}

function proteggiContenuti(wc: WebContents, o: OpzioniFinestra): void {
  wc.setWindowOpenHandler(({ url }) => {
    if (linkEsterno(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  // Anche un file trascinato fuori dalla zona di rilascio non deve sostituire la pagina.
  wc.on('will-navigate', (evento, url) => {
    if (!eUrlDellApp(url, o)) evento.preventDefault();
  });
  wc.on('will-redirect', (evento, url) => {
    if (!eUrlDellApp(url, o)) evento.preventDefault();
  });
  wc.on('will-attach-webview', (evento) => evento.preventDefault());
}

export function creaFinestra(o: OpzioniFinestra): BrowserWindow {
  proteggiSessione();
  const scura = nativeTheme.shouldUseDarkColors;
  const finestra = new BrowserWindow({
    width: 1180,
    height: 800,
    minWidth: 980,
    minHeight: 680,
    show: false,
    title: o.titolo,
    backgroundColor: scura ? '#17181b' : '#fbfaf7',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(o.cartellaMain, '..', 'preload', 'index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      navigateOnDragDrop: false,
      // Spento: su Windows e Linux Chromium scaricherebbe i dizionari da un server di Google (docs/02 §10.2:
      // nessuna chiamata a terzi). Sul Mac il correttore di sistema non scarica nulla, ma resta spento per coerenza.
      spellcheck: false,
      devTools: o.strumentiSviluppo,
    },
  });
  proteggiContenuti(finestra.webContents, o);
  if (o.urlSviluppo) void finestra.loadURL(o.urlSviluppo);
  else void finestra.loadFile(percorsoPagina(o));
  return finestra;
}
