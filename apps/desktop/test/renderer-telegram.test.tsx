import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { finestra, telegram as testiTelegram } from '@spalla/it-copy';
import { TETTI_MEMORIA } from '@spalla/schema';
import { Memoria, TETTI_VISTI, gruppoDi, raggruppa } from '../src/renderer/schermate/memoria/Memoria.js';
import { Squadra } from '../src/renderer/schermate/squadra/Squadra.js';
import { Telegram, formatoTokenValido } from '../src/renderer/schermate/telegram/Telegram.js';
import { FornitoreStore } from '../src/renderer/stato/store.js';
import { creaSpallaFinta, installa, statoDiProva, type SpallaFinta } from './renderer/finto-spalla.js';
import { PAIRING_PER_FINESTRA } from './renderer/fixture-telegram.js';

const TOKEN = '123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsawQ';

function mostra(finto: SpallaFinta, schermata: React.ReactNode): void {
  installa(finto);
  render(<FornitoreStore>{schermata}</FornitoreStore>);
}

describe('Telegram', () => {
  it('non collegato, senza Managed Bots: procedura BotFather con i valori da copiare e il controllo della riga', async () => {
    const finto = creaSpallaFinta();
    mostra(finto, <Telegram />);
    const utente = userEvent.setup();

    await screen.findByRole('heading', { name: testiTelegram.botfather.titolo });
    expect(screen.getByText(finestra.telegram.stato.nonCollegato)).toBeTruthy();
    expect(screen.queryByRole('button', { name: finestra.telegram.dueTocchi })).toBeNull();
    expect(screen.getByText('/newbot')).toBeTruthy();
    expect(screen.getByText('Bruno di Marco')).toBeTruthy();
    expect(screen.getByText('bruno_marco_bot')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^Copia / })).toHaveLength(3);

    await utente.click(screen.getByRole('button', { name: testiTelegram.botfather.apriBotFather }));
    expect(finto.api.app.apriLink).toHaveBeenCalledWith('https://t.me/BotFather');

    const campo = screen.getByLabelText(testiTelegram.botfather.incollaCodice);
    await utente.type(campo, 'non è una riga');
    await utente.click(screen.getByRole('button', { name: finestra.telegram.collega }));
    expect((await screen.findByRole('alert')).textContent).toBe(testiTelegram.botfather.codiceNonValido);
    expect(finto.api.telegram.collegaConToken).not.toHaveBeenCalled();

    await utente.clear(campo);
    await utente.type(campo, TOKEN);
    finto.api.telegram.stato = async () => ({ collegato: true, username: 'bruno_marco_bot', proprietarioConfermato: false });
    await utente.click(screen.getByRole('button', { name: finestra.telegram.collega }));
    expect(finto.api.telegram.collegaConToken).toHaveBeenCalledWith(TOKEN);
    // Ricaricato lo stato: collegato, in attesa del "ciao" dal telefono.
    expect(await screen.findByText(finestra.telegram.stato.collegato('bruno_marco_bot'))).toBeTruthy();
    expect(screen.getByText(finestra.telegram.stato.aspettaCiao)).toBeTruthy();
  });

  it('con il link in due tocchi: il pulsante c\'è e chiama collegaInDueTocchi; l\'esito negativo si vede', async () => {
    const finto = creaSpallaFinta();
    finto.api.telegram.suggerimenti = async () => ({
      nomeBot: 'Bruno',
      usernameSuggerito: 'bruno_bot',
      linkBotFather: 'https://t.me/BotFather',
      linkDueTocchi: 'https://t.me/newbot/SpallaBot/bruno_bot',
    });
    finto.api.telegram.collegaInDueTocchi = async () => ({ ok: false, messaggio: 'Il collegamento non è riuscito.', codice: 'tempo' });
    mostra(finto, <Telegram />);
    const utente = userEvent.setup();
    const pulsante = await screen.findByRole('button', { name: finestra.telegram.dueTocchi });
    expect(screen.getByText(finestra.telegram.oppure)).toBeTruthy();
    await utente.click(pulsante);
    expect(await screen.findByText('Il collegamento non è riuscito.')).toBeTruthy();
  });

  it('codice di pairing in attesa: il codice si digita (la finestra non lo riceve) e [Sì, sono io] conferma quello digitato', async () => {
    const finto = creaSpallaFinta();
    finto.api.telegram.stato = async () => ({ collegato: true, username: 'bruno_bot', proprietarioConfermato: false, pairingInAttesa: PAIRING_PER_FINESTRA });
    mostra(finto, <Telegram />);
    const utente = userEvent.setup();
    const riquadro = (await screen.findByText(finestra.telegram.pairing.titolo)).closest('[role="group"]') as HTMLElement;
    expect(within(riquadro).getByText(finestra.telegram.pairing.testo('Marco'))).toBeTruthy();
    // Senza codice digitato non si chiama il processo principale (che rifiuterebbe la stringa vuota).
    await utente.click(within(riquadro).getByRole('button', { name: finestra.telegram.pairing.conferma }));
    expect(within(riquadro).getByText(finestra.telegram.pairing.codiceVuoto)).toBeTruthy();
    expect(finto.api.telegram.confermaPairing).not.toHaveBeenCalled();

    await utente.type(within(riquadro).getByLabelText(finestra.telegram.pairing.etichettaCodice), ' k7p2qx ');
    finto.api.telegram.stato = async () => ({ collegato: true, username: 'bruno_bot', proprietarioConfermato: true });
    await utente.click(within(riquadro).getByRole('button', { name: finestra.telegram.pairing.conferma }));
    expect(finto.api.telegram.confermaPairing).toHaveBeenCalledWith('k7p2qx');
    await waitFor(() => expect(screen.queryByText(finestra.telegram.pairing.titolo)).toBeNull());
    expect(await screen.findByText(finestra.telegram.stato.soloTe)).toBeTruthy();
  });

  it('[No, non sono io] nasconde solo quella richiesta: una nuova richiesta (altro nome o scadenza) ricompare', async () => {
    const finto = creaSpallaFinta();
    finto.api.telegram.stato = async () => ({ collegato: true, username: 'bruno_bot', proprietarioConfermato: false, pairingInAttesa: PAIRING_PER_FINESTRA });
    mostra(finto, <Telegram />);
    const utente = userEvent.setup();
    await screen.findByText(finestra.telegram.pairing.titolo);
    await utente.click(screen.getByRole('button', { name: finestra.telegram.pairing.ignora }));
    await waitFor(() => expect(screen.queryByText(finestra.telegram.pairing.titolo)).toBeNull());
    act(() =>
      finto.emetti('telegramStato', {
        collegato: true,
        username: 'bruno_bot',
        proprietarioConfermato: false,
        pairingInAttesa: { ...PAIRING_PER_FINESTRA, nome: 'Lucia', scadeAlle: '2026-10-22T10:45:00.000Z' },
      }),
    );
    expect(await screen.findByText(finestra.telegram.pairing.testo('Lucia'))).toBeTruthy();
  });

  it('collegato: [Scollega] chiede conferma e poi scollega; gli aggiornamenti arrivano dagli eventi', async () => {
    const finto = creaSpallaFinta();
    finto.api.telegram.stato = async () => ({ collegato: true, username: 'bruno_bot', proprietarioConfermato: true });
    mostra(finto, <Telegram />);
    const utente = userEvent.setup();
    await screen.findByText(finestra.telegram.stato.collegato('bruno_bot'));
    await utente.click(screen.getByRole('button', { name: finestra.telegram.scollega }));
    expect(screen.getByText(finestra.telegram.scollegaConferma)).toBeTruthy();
    expect(finto.api.telegram.scollega).not.toHaveBeenCalled();
    finto.api.telegram.stato = async () => ({ collegato: false, proprietarioConfermato: false });
    await utente.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: finestra.telegram.scollega }));
    expect(finto.api.telegram.scollega).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(finestra.telegram.scollegato)).toBeTruthy();
    expect(await screen.findByRole('heading', { name: testiTelegram.botfather.titolo })).toBeTruthy();

    act(() => finto.emetti('telegramStato', { collegato: true, username: 'altro_bot', proprietarioConfermato: true }));
    expect(await screen.findByText(finestra.telegram.stato.collegato('altro_bot'))).toBeTruthy();
  });

  it('formatoTokenValido', () => {
    expect(formatoTokenValido(TOKEN)).toBe(true);
    expect(formatoTokenValido(` ${TOKEN} `)).toBe(true);
    expect(formatoTokenValido('123:abc')).toBe(false);
    expect(formatoTokenValido('sk-ant-qualcosa')).toBe(false);
  });
});

describe('Memoria e Squadra', () => {
  it('i tetti mostrati sono quelli imposti dalla memoria', () => {
    expect(TETTI_VISTI.MEMORIA_RIGHE).toBe(TETTI_MEMORIA.MEMORIA_RIGHE);
    expect(TETTI_VISTI.UTENTE_CARATTERI).toBe(TETTI_MEMORIA.UTENTE_CARATTERI);
  });

  it('raggruppa i file: profilo, memoria, schede, diario (dal più recente)', () => {
    expect(gruppoDi('profilo/UTENTE.md')).toBe('profilo');
    expect(gruppoDi('memoria/MEMORIA.md')).toBe('memoria');
    expect(gruppoDi('memoria/temi/cliente.md')).toBe('temi');
    expect(gruppoDi('memoria/diario/2026-10-21.md')).toBe('diario');
    const f = (percorso: string, titolo = percorso) => ({ percorso, titolo, modificato: '2026-10-22T08:00:00Z', byte: 1 });
    const gruppi = raggruppa([f('memoria/diario/2026-10-20.md'), f('profilo/UTENTE.md'), f('memoria/diario/2026-10-21.md'), f('memoria/MEMORIA.md')]);
    expect(gruppi.map(([g]) => g)).toEqual(['profilo', 'memoria', 'diario']);
    expect(gruppi[2]?.[1].map((x) => x.percorso)).toEqual(['memoria/diario/2026-10-21.md', 'memoria/diario/2026-10-20.md']);
  });

  it('memoria: contatori, lettura in monospazio, ricerca, "Cosa sai di me?", ricostruisci indice', async () => {
    const finto = creaSpallaFinta(statoDiProva({ nomeAssistente: 'Bruno' }));
    finto.api.memoria.elenco = async () => [
      { percorso: 'profilo/UTENTE.md', titolo: 'Chi sei', modificato: '2026-10-22T08:00:00Z', byte: 10 },
      { percorso: 'memoria/temi/lamberti.md', titolo: 'Cliente Lamberti', modificato: '2026-10-21T08:00:00Z', byte: 10 },
    ];
    finto.api.memoria.leggi = async (p: string) => (p === 'profilo/UTENTE.md' ? '# Chi sei\nMarco, commercialista.' : '# Lamberti\nPaga a 60 giorni.');
    finto.api.memoria.cerca = async () => [{ file: 'memoria/temi/lamberti.md', titolo: 'Cliente Lamberti', estratto: 'Paga a 60 giorni', punteggio: 1, modificato: '2026-10-21T08:00:00Z' }];
    mostra(finto, <Memoria />);
    const utente = userEvent.setup();

    expect(await screen.findByText('memoria: 9/200 righe')).toBeTruthy();
    expect(screen.getByText(finestra.memoria.gruppi.profilo)).toBeTruthy();
    expect(screen.getByText(finestra.memoria.gruppi.temi)).toBeTruthy();

    await utente.click(screen.getByRole('button', { name: /Chi sei/ }));
    const testo = await screen.findByText(/Marco, commercialista\./);
    expect(testo.tagName).toBe('PRE');

    await utente.type(screen.getByRole('searchbox', { name: finestra.memoria.cerca }), 'Lamberti{Enter}');
    expect(await screen.findByText(finestra.memoria.risultati(1))).toBeTruthy();
    await utente.click(screen.getByRole('button', { name: /Paga a 60 giorni/ }));
    expect(await screen.findByText(/Paga a 60 giorni\./, { selector: 'pre' })).toBeTruthy();

    await utente.click(screen.getByRole('button', { name: finestra.memoria.cosaSai }));
    expect(await screen.findByText('Sei Marco, fai il commercialista.')).toBeTruthy();
    await utente.click(screen.getByRole('button', { name: finestra.memoria.ricostruisci }));
    expect(finto.api.memoria.ricostruisciIndice).toHaveBeenCalledTimes(1);
  });

  it('squadra: schede con interruttore e le due righe; lo spegnimento chiama disattiva', async () => {
    const finto = creaSpallaFinta();
    let attivo = true;
    finto.api.squadra.elenco = async () => [
      { nome: 'segretaria', etichetta: 'Segretaria', attivo, spiegazione: 'Mail e agenda.', puoFareDaSolo: 'bozze', chiedeSempre: 'invii' },
    ];
    finto.api.squadra.disattiva = async () => {
      attivo = false;
    };
    mostra(finto, <Squadra />);
    const utente = userEvent.setup();
    const interruttore = await screen.findByRole('switch', { name: finestra.squadra.interruttore('Segretaria') });
    expect(interruttore.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText(finestra.squadra.puoDaSola)).toBeTruthy();
    expect(screen.getByText(finestra.squadra.chiedeSempre)).toBeTruthy();
    await utente.click(interruttore);
    await waitFor(() => expect(screen.getByRole('switch', { name: finestra.squadra.interruttore('Segretaria') }).getAttribute('aria-checked')).toBe('false'));
  });
});
