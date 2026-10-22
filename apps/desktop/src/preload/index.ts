/**
 * PRELOAD (sandbox, contextIsolation): espone SOLO `window.spalla` (ApiSpalla). Nessuna API di Node o di Electron
 * arriva alla finestra: `ipcRenderer` e `webUtils` restano qui dentro.
 * Viene compilato in CommonJS (out/preload/index.cjs): un preload in sandbox non può essere un modulo ES.
 */
import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { creaApiSpalla, type IpcMinimo } from './api.js';

const ipc: IpcMinimo = {
  invoke: (canale, ...argomenti) => ipcRenderer.invoke(canale, ...argomenti),
  on: (canale, ascoltatore) => ipcRenderer.on(canale, ascoltatore),
  removeListener: (canale, ascoltatore) => ipcRenderer.removeListener(canale, ascoltatore),
};

contextBridge.exposeInMainWorld('spalla', creaApiSpalla(ipc, (file) => webUtils.getPathForFile(file as File)));
