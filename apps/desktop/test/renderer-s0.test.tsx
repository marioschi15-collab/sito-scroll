import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { cervello, finestra, onboarding } from '@spalla/it-copy';
import { App } from '../src/renderer/App.js';
import { formatoChiaveValido } from '../src/renderer/schermate/s0/ChiaveApi.js';
import { creaSpallaFinta, installa, statoDiProva } from './renderer/finto-spalla.js';

const CHIAVE_BUONA = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz012345';

async function arrivaAlCervello(utente: ReturnType<typeof userEvent.setup>): Promise<void> {
  await screen.findByRole('heading', { name: onboarding.s0.benvenuto.titolo });
  await utente.click(screen.getByRole('button', { name: 'Continua' }));
  await screen.findByRole('heading', { name: onboarding.s0.privacy.titolo });
  await utente.click(screen.getByRole('button', { name: onboarding.s0.privacy.accetto }));
  await screen.findByRole('heading', { name: onboarding.s0.avvioAutomatico.titolo });
  await utente.click(screen.getByRole('button', { name: 'Continua' }));
  await screen.findByRole('heading', { name: cervello.titolo });
}

describe('S0: la procedura iniziale', () => {
  it('benvenuto con italiano preselezionato, privacy, avvio, cervello; indietro funziona', async () => {
    const finto = installa(creaSpallaFinta());
    const utente = userEvent.setup();
    render(<App />);

    await screen.findByRole('heading', { name: onboarding.s0.benvenuto.titolo });
    expect((screen.getByLabelText(onboarding.s0.benvenuto.lingua) as HTMLSelectElement).value).toBe('it');
    expect(screen.getByText(finestra.s0.passo(1, 5))).toBeTruthy();

    await utente.click(screen.getByRole('button', { name: 'Continua' }));
    await screen.findByRole('heading', { name: onboarding.s0.privacy.titolo });
    expect(screen.getByText(onboarding.s0.privacy.anthropic)).toBeTruthy();
    expect(screen.getByText(onboarding.s0.privacy.noi)).toBeTruthy();
    expect(screen.getByText('~/Spalla')).toBeTruthy();

    await utente.click(screen.getByRole('button', { name: 'Indietro' }));
    await screen.findByRole('heading', { name: onboarding.s0.benvenuto.titolo });

    await arrivaAlCervello(utente);
    // L'avvio automatico resta acceso (predefinito) e non serve salvarlo di nuovo.
    expect(finto.api.impostazioni.salva).not.toHaveBeenCalled();
  });

  it('il cervello offre due pulsanti di pari peso e il confronto', async () => {
    installa(creaSpallaFinta());
    const utente = userEvent.setup();
    render(<App />);
    await arrivaAlCervello(utente);

    const abbonamento = screen.getByRole('button', { name: cervello.scelta.abbonamento });
    const chiave = screen.getByRole('button', { name: cervello.scelta.chiaveApi });
    expect(abbonamento.className).toBe(chiave.className);

    await utente.click(screen.getByRole('button', { name: cervello.scelta.nessuno }));
    await screen.findByRole('heading', { name: cervello.confronto.titolo });
    expect(screen.getByText(cervello.confronto.consiglio)).toBeTruthy();
    await utente.click(screen.getByRole('button', { name: 'Indietro' }));
    await screen.findByRole('heading', { name: cervello.titolo });
  });

  it('abbonamento: prima l\'avviso di beta, con la via d\'uscita verso la chiave', async () => {
    const finto = installa(creaSpallaFinta());
    const utente = userEvent.setup();
    render(<App />);
    await arrivaAlCervello(utente);

    await utente.click(screen.getByRole('button', { name: cervello.scelta.abbonamento }));
    expect(await screen.findByText(cervello.abbonamento.avvisoBeta)).toBeTruthy();
    expect(screen.getByRole('button', { name: cervello.abbonamento.continuo })).toBeTruthy();
    expect(finto.api.cervello.avviaPannelloLogin).not.toHaveBeenCalled();

    await utente.click(screen.getByRole('button', { name: cervello.abbonamento.preferiscoChiave }));
    await screen.findByRole('heading', { name: cervello.chiaveApi.titolo });
  });

  it('abbonamento: [Continuo] apre il pannello, [Ho finito, verifica] chiama la verifica e porta al motore pronto', async () => {
    const finto = installa(creaSpallaFinta());
    finto.api.cervello.avviaPannelloLogin = async () => ({ attivo: false, collegato: false });
    const utente = userEvent.setup();
    render(<App />);
    await arrivaAlCervello(utente);
    await utente.click(screen.getByRole('button', { name: cervello.scelta.abbonamento }));
    await utente.click(await screen.findByRole('button', { name: cervello.abbonamento.continuo }));
    await waitFor(() => expect(finto.api.cervello.cambiaModalita).toHaveBeenCalledWith('abbonamento'));

    await utente.click(screen.getByRole('button', { name: finestra.s0.cervello.hoFinitoVerifica }));
    await waitFor(() => expect(finto.api.cervello.verifica).toHaveBeenCalled());
    await utente.click(await screen.findByRole('button', { name: 'Continua' }));
    await screen.findByRole('heading', { name: onboarding.s0.pronto.titolo });
    expect(screen.getByText(cervello.motore.pronto)).toBeTruthy();
  });

  it('abbonamento, solo sviluppo: [Sono già collegato] appare con il login ereditato e salta il pannello', async () => {
    const senza = installa(creaSpallaFinta());
    const utente = userEvent.setup();
    const { unmount } = render(<App />);
    await arrivaAlCervello(utente);
    await utente.click(screen.getByRole('button', { name: cervello.scelta.abbonamento }));
    await screen.findByText(cervello.abbonamento.avvisoBeta);
    expect(screen.queryByRole('button', { name: finestra.s0.cervello.giaCollegatoSviluppo })).toBeNull();
    expect(senza.api.cervello.verifica).not.toHaveBeenCalled();
    unmount();

    const finto = installa(creaSpallaFinta(statoDiProva({ sviluppo: { accessoEreditato: true } })));
    render(<App />);
    await arrivaAlCervello(utente);
    await utente.click(screen.getByRole('button', { name: cervello.scelta.abbonamento }));
    await utente.click(await screen.findByRole('button', { name: finestra.s0.cervello.giaCollegatoSviluppo }));
    await screen.findByRole('heading', { name: onboarding.s0.pronto.titolo });
    expect(finto.api.cervello.cambiaModalita).toHaveBeenCalledWith('abbonamento');
    expect(finto.api.cervello.verifica).toHaveBeenCalled();
    expect(finto.api.cervello.avviaPannelloLogin).not.toHaveBeenCalled();
  });

  it('chiave API: formato sbagliato bloccato in locale; formato giusto collegato con tetto e qualità scelti', async () => {
    const finto = installa(creaSpallaFinta());
    const utente = userEvent.setup();
    render(<App />);
    await arrivaAlCervello(utente);
    await utente.click(screen.getByRole('button', { name: cervello.scelta.chiaveApi }));
    await screen.findByRole('heading', { name: cervello.chiaveApi.titolo });

    // Perché serve (tre frasi), il pulsante per la pagina di Anthropic, quattro passi numerati.
    for (const frase of cervello.chiaveApi.percheServe) expect(screen.getByText(frase)).toBeTruthy();
    for (const passo of cervello.chiaveApi.passi) expect(screen.getByText(passo)).toBeTruthy();
    await utente.click(screen.getByRole('button', { name: cervello.chiaveApi.apriPagina }));
    expect(finto.api.app.apriLink).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/console\.anthropic\.com\//));

    // Predefiniti: 25 € ed Equilibrato.
    expect((screen.getByRole('radio', { name: /25 €/ }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('radio', { name: /Equilibrato/ }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText('costa circa il doppio')).toBeTruthy();

    const campo = screen.getByLabelText(cervello.chiaveApi.incolla);
    const collega = screen.getByRole('button', { name: finestra.s0.cervello.collega });
    expect((collega as HTMLButtonElement).disabled).toBe(true);

    await utente.type(campo, 'ciao-non-sono-una-chiave');
    await utente.click(collega);
    expect((await screen.findByRole('alert')).textContent).toBe(cervello.chiaveApi.formatoNonValido);
    expect(campo.getAttribute('aria-invalid')).toBe('true');
    expect(finto.api.cervello.collegaChiaveApi).not.toHaveBeenCalled();

    await utente.clear(campo);
    await utente.type(campo, `  ${CHIAVE_BUONA} `);
    expect(screen.queryByRole('alert')).toBeNull();
    await utente.click(screen.getByRole('radio', { name: /10 €/ }));
    await utente.click(screen.getByRole('radio', { name: /Massima/ }));
    await utente.click(screen.getByRole('button', { name: finestra.s0.cervello.collega }));

    await screen.findByText('Collegato. Spalla può pensare.');
    // La modalità la scrive il processo principale solo se la chiave passa: nessun cambio di modalità prima della prova.
    expect(finto.api.cervello.cambiaModalita).not.toHaveBeenCalled();
    expect(finto.api.cervello.collegaChiaveApi).toHaveBeenCalledWith(CHIAVE_BUONA, 10, 'massima');

    await utente.click(screen.getByRole('button', { name: 'Continua' }));
    await screen.findByRole('heading', { name: onboarding.s0.pronto.titolo });

    // Fine di S0: si apre la chat e parte il rituale delle presentazioni.
    finto.api.app.stato = async () => statoDiProva({ schermataIniziale: 'chat', cervello: { livello: 'massima', tettoMensileEur: 10, collegato: true, modalita: 'chiave_api' } });
    await utente.click(screen.getByRole('button', { name: finestra.s0.motore.continua }));
    await waitFor(() => expect(finto.api.onboarding.prepara).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(finto.api.chat.invia).toHaveBeenCalledWith(expect.objectContaining({ rituale: true, canale: 'desktop', testo: 'Leggi onboarding/PRIMO-AVVIO.md e comincia.' })),
    );
    expect(screen.getByText(finestra.chat.presentazioniInCorso)).toBeTruthy();
  });

  it('chiave API rifiutata: si vede il messaggio e non si va avanti', async () => {
    const finto = installa(creaSpallaFinta());
    finto.api.cervello.collegaChiaveApi = async () => ({ ok: false, messaggio: cervello.verifica.chiaveRifiutata, codice: 'credenziali' });
    const utente = userEvent.setup();
    render(<App />);
    await arrivaAlCervello(utente);
    await utente.click(screen.getByRole('button', { name: cervello.scelta.chiaveApi }));
    await utente.type(await screen.findByLabelText(cervello.chiaveApi.incolla), CHIAVE_BUONA);
    await utente.click(screen.getByRole('button', { name: finestra.s0.cervello.collega }));
    expect((await screen.findByRole('alert')).textContent).toContain(cervello.verifica.chiaveRifiutata);
    expect(screen.queryByRole('button', { name: 'Continua' })).toBeNull();
  });

  it('formatoChiaveValido', () => {
    expect(formatoChiaveValido(CHIAVE_BUONA)).toBe(true);
    expect(formatoChiaveValido(` ${CHIAVE_BUONA}\n`)).toBe(true);
    expect(formatoChiaveValido('sk-ant-corta')).toBe(false);
    expect(formatoChiaveValido('sk-proj-abcdefghijklmnopqrstuvwxyz')).toBe(false);
    expect(formatoChiaveValido('')).toBe(false);
  });

  it('riprende dal passo indicato dal processo principale', async () => {
    installa(creaSpallaFinta(statoDiProva({ schermataIniziale: 'cervello' })));
    render(<App />);
    await screen.findByRole('heading', { name: cervello.titolo });
  });
});

describe('pannello terminale: link di accesso e copia', () => {
  it('trova l\'ultimo link di Anthropic anche tra sequenze di colore, OSC 8 e a capo del terminale', async () => {
    const { ultimoLinkDiAccesso } = await import('../src/renderer/componenti/Terminale.js');
    const url = 'https://claude.ai/oauth/authorize?code=true&client_id=abc&state=xyz';
    const uscita = `\x1b[1mBrowser didn't open? Use the url below:\x1b[0m\r\n\x1b]8;;${url}\x07${url}\x1b]8;;\x07\r\n`;
    expect(ultimoLinkDiAccesso(uscita)).toBe(url);
    expect(ultimoLinkDiAccesso('vai su https://esempio.invalid/login')).toBeUndefined();
    expect(ultimoLinkDiAccesso(`prima https://claude.com/a poi ${url}.`)).toBe(url);
  });

  it('Ctrl+Maiusc+C o Cmd+C copiano; Ctrl+C da solo va al programma', async () => {
    const { eTastoCopia } = await import('../src/renderer/componenti/Terminale.js');
    const tasto = (extra: Partial<KeyboardEvent>) => ({ type: 'keydown', key: 'C', ctrlKey: false, shiftKey: false, metaKey: false, ...extra });
    expect(eTastoCopia(tasto({ ctrlKey: true, shiftKey: true }))).toBe(true);
    expect(eTastoCopia(tasto({ metaKey: true, key: 'c' }))).toBe(true);
    expect(eTastoCopia(tasto({ ctrlKey: true, key: 'c' }))).toBe(false);
  });
});
