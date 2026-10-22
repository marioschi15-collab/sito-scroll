import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { cervello, finestra, onboarding } from '@spalla/it-copy';
import { App } from '../src/renderer/App.js';
import { creaSpallaFinta, installa, statoDiProva } from './renderer/finto-spalla.js';

const PRONTO = statoDiProva({ schermataIniziale: 'chat', onboarding: 'completato', nomeAssistente: 'Bruno' });

async function vaiA(sezione: string): Promise<ReturnType<typeof userEvent.setup>> {
  const utente = userEvent.setup();
  await screen.findByRole('navigation', { name: finestra.navigazione.etichetta });
  await utente.click(screen.getByRole('button', { name: sezione }));
  return utente;
}

describe('Impostazioni', () => {
  it('salva le modifiche, scarica la voce con l\'avanzamento, esporta, apre la cartella', async () => {
    const finto = installa(creaSpallaFinta(PRONTO));
    let fineDownload: () => void = () => undefined;
    finto.api.voce.prepara = () => new Promise<void>((r) => (fineDownload = r));
    finto.api.app.esportaTutto = async () => '~/Desktop/spalla-esportazione.zip';
    render(<App />);
    const utente = await vaiA(finestra.navigazione.impostazioni);

    const avvio = await screen.findByRole('checkbox', { name: finestra.impostazioni.avvio.automatico });
    const salva = screen.getAllByRole('button', { name: finestra.impostazioni.salva })[0] as HTMLButtonElement;
    expect(salva.disabled).toBe(true);
    await utente.click(avvio);
    await utente.click(salva);
    expect(finto.api.impostazioni.salva).toHaveBeenCalledWith(expect.objectContaining({ avvioAutomatico: false }));
    expect(await screen.findByText(finestra.impostazioni.salvato)).toBeTruthy();

    await utente.click(screen.getByRole('button', { name: finestra.impostazioni.voce.scarica }));
    act(() => finto.emetti('voceAvanzamento', { frazione: 0.5, messaggio: 'Scarico il modello… 50%' }));
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('50');
    expect(screen.getByText('Scarico il modello… 50%')).toBeTruthy();
    finto.api.voce.stato = async () => ({ disponibile: true, motore: 'sherpa-onnx', inDownload: false });
    await act(async () => fineDownload());
    expect(await screen.findByText(finestra.impostazioni.voce.pronta('sherpa-onnx'))).toBeTruthy();

    await utente.click(screen.getByRole('button', { name: finestra.impostazioni.dati.esporta }));
    expect(await screen.findByText(finestra.impostazioni.dati.esportato('~/Desktop/spalla-esportazione.zip'))).toBeTruthy();
    await utente.click(screen.getByRole('button', { name: finestra.impostazioni.dati.apriCartella }));
    expect(finto.api.app.apriNelSistema).toHaveBeenCalledWith('.');
    expect(screen.getAllByText(finestra.impostazioni.versione('0.0.1')).length).toBeGreaterThan(0);
  });

  it('cervello: passare all\'abbonamento mostra l\'avviso di beta', async () => {
    const finto = installa(creaSpallaFinta({ ...PRONTO, cervello: { modalita: 'chiave_api', livello: 'equilibrato', tettoMensileEur: 25, collegato: true } }));
    render(<App />);
    const utente = await vaiA(finestra.navigazione.impostazioni);
    await screen.findByRole('heading', { name: finestra.impostazioni.cervello.titolo });
    expect(screen.queryByText(cervello.abbonamento.avvisoBeta)).toBeNull();
    await utente.click(screen.getByRole('radio', { name: new RegExp(finestra.impostazioni.cervello.abbonamento) }));
    expect(finto.api.cervello.cambiaModalita).toHaveBeenCalledWith('abbonamento');
    expect(await screen.findByText(cervello.abbonamento.avvisoBeta)).toBeTruthy();
  });
});

describe('Come mi sono presentato', () => {
  it('domande e risposte in sola lettura; [Ricomincia] "tutto" chiede di scrivere cancella', async () => {
    const finto = installa(creaSpallaFinta(PRONTO));
    finto.api.onboarding.risposte = async () => [{ id: 'Q1', domanda: 'Come mi chiami?', risposta: 'Bruno' }];
    render(<App />);
    const utente = await vaiA(finestra.navigazione.presentazioni);
    expect(await screen.findByText('Come mi chiami?')).toBeTruthy();
    expect(screen.getByText('Bruno', { selector: 'dd' })).toBeTruthy();

    await utente.click(screen.getByRole('button', { name: finestra.presentazioni.ricomincia }));
    await utente.click(screen.getByRole('radio', { name: new RegExp(onboarding.ricomincia.tutto.etichetta) }));
    const avvia = screen.getByRole('button', { name: finestra.presentazioni.avvia }) as HTMLButtonElement;
    expect(avvia.disabled).toBe(true);
    await utente.type(screen.getByLabelText(finestra.presentazioni.confermaCancella), 'cancella');
    expect(avvia.disabled).toBe(false);
    finto.api.app.stato = async () => ({ ...PRONTO, onboarding: 'da_fare' });
    await utente.click(avvia);
    expect(finto.api.onboarding.ricomincia).toHaveBeenCalledWith('tutto');
    // Si torna alla chat e le presentazioni ripartono.
    await waitFor(() => expect(finto.api.chat.invia).toHaveBeenCalledWith(expect.objectContaining({ rituale: true })));
    expect(await screen.findByRole('textbox', { name: finestra.chat.etichettaCasella })).toBeTruthy();
  });
});
