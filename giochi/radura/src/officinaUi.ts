import {
  codifica, COLORI, decodifica, EFFETTI, FORME, MASSIMO_EFFETTI, MASSIMO_RICETTE, SIMBOLI, type Ricetta, type Scelta,
} from './incantesimi/officina.js';

const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const esadecimale = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

const NUOVA: Ricetta = { nome: '', simbolo: SIMBOLI[0]!, colore: COLORI[6]!, forma: 'palla', effetti: ['scoppio'], potenza: 2, ampiezza: 2 };
const POTENZE = ['Lieve', 'Forte', 'Devastante'];
const AMPIEZZE = ['Stretta', 'Media', 'Vasta'];

/** La schermata dell'officina: si sceglie tutto toccando, senza scrivere altro che il nome. */
export class OfficinaUi {
  private readonly pannello = el('officina');
  private readonly nome = el<HTMLInputElement>('of-nome');
  private readonly avviso = el('of-avviso');
  private readonly codice = el<HTMLInputElement>('of-codice');
  private ricette: Ricetta[] = [];
  private bozza: Ricetta = { ...NUOVA, effetti: [...NUOVA.effetti] };
  /** Quale ricetta si sta ritoccando (-1 = una nuova). */
  private indice = -1;
  onCambio: (ricette: Ricetta[], daUsare: number) => void = () => undefined;
  onChiudi: () => void = () => undefined;

  constructor() {
    el('of-chiudi').addEventListener('click', () => this.chiudi());
    el('of-salva').addEventListener('click', () => this.salva());
    el('of-elimina').addEventListener('click', () => this.elimina());
    el('of-copia').addEventListener('click', () => this.copia());
    el('of-aggiungi').addEventListener('click', () => this.aggiungiDaCodice());
    this.nome.addEventListener('input', () => (this.bozza.nome = this.nome.value));
  }

  get aperta(): boolean {
    return this.pannello.classList.contains('aperta');
  }

  apri(ricette: Ricetta[]): void {
    this.ricette = ricette.map((r) => ({ ...r, effetti: [...r.effetti] }));
    this.carica(-1);
    this.pannello.classList.add('aperta');
  }

  chiudi(): void {
    this.pannello.classList.remove('aperta');
    this.onChiudi();
  }

  private carica(indice: number): void {
    this.indice = indice;
    const base = indice >= 0 ? this.ricette[indice]! : NUOVA;
    this.bozza = { ...base, effetti: [...base.effetti] };
    this.nome.value = this.bozza.nome;
    this.dici('');
    this.disegna();
  }

  private dici(testo: string): void {
    this.avviso.textContent = testo;
  }

  private gettoni(
    contenitore: string, scelte: readonly { etichetta: string; titolo?: string; acceso: boolean; tinta?: string }[],
    tocca: (i: number) => void,
  ): void {
    const dove = el(contenitore);
    dove.replaceChildren();
    scelte.forEach((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'gettone' + (s.acceso ? ' acceso' : '');
      b.textContent = s.etichetta;
      if (s.titolo) b.title = s.titolo;
      if (s.tinta) b.style.setProperty('--tinta', s.tinta);
      b.setAttribute('aria-pressed', String(s.acceso));
      b.addEventListener('click', () => tocca(i));
      dove.append(b);
    });
  }

  private disegna(): void {
    const b = this.bozza;
    const voce = (s: Scelta): string => `${s.simbolo} ${s.nome}`;
    this.gettoni(
      'of-miei',
      [
        ...this.ricette.map((r, i) => ({ etichetta: `${r.simbolo} ${r.nome}`, acceso: i === this.indice, tinta: esadecimale(r.colore) })),
        ...(this.ricette.length < MASSIMO_RICETTE ? [{ etichetta: '＋ Nuovo', acceso: this.indice < 0 }] : []),
      ],
      (i) => this.carica(i < this.ricette.length ? i : -1),
    );
    this.gettoni('of-simboli', SIMBOLI.map((s) => ({ etichetta: s, acceso: s === b.simbolo })), (i) => {
      b.simbolo = SIMBOLI[i]!;
      this.disegna();
    });
    this.gettoni(
      'of-colori',
      COLORI.map((c) => ({ etichetta: '', acceso: c === b.colore, tinta: esadecimale(c) })),
      (i) => {
        b.colore = COLORI[i]!;
        this.disegna();
      },
    );
    this.gettoni('of-forme', FORME.map((f) => ({ etichetta: voce(f), titolo: f.cosaFa, acceso: f.id === b.forma })), (i) => {
      b.forma = FORME[i]!.id;
      this.disegna();
    });
    this.gettoni(
      'of-effetti',
      EFFETTI.map((e) => ({ etichetta: voce(e), titolo: e.cosaFa, acceso: b.effetti.includes(e.id) })),
      (i) => {
        const id = EFFETTI[i]!.id;
        if (b.effetti.includes(id)) b.effetti = b.effetti.filter((e) => e !== id);
        else if (b.effetti.length < MASSIMO_EFFETTI) b.effetti.push(id);
        else this.dici(`Al massimo ${MASSIMO_EFFETTI} effetti: togline uno per metterne un altro.`);
        this.disegna();
      },
    );
    this.gettoni('of-potenza', POTENZE.map((p, i) => ({ etichetta: p, acceso: b.potenza === i + 1 })), (i) => {
      b.potenza = i + 1;
      this.disegna();
    });
    this.gettoni('of-ampiezza', AMPIEZZE.map((p, i) => ({ etichetta: p, acceso: b.ampiezza === i + 1 })), (i) => {
      b.ampiezza = i + 1;
      this.disegna();
    });
    const forma = FORME.find((f) => f.id === b.forma)!;
    const cosa = b.effetti.map((e) => EFFETTI.find((x) => x.id === e)!.cosaFa);
    el('of-riassunto').textContent =
      b.effetti.length === 0 ? 'Scegli almeno un effetto.' : `${forma.nome} (${forma.cosaFa}): ${cosa.join('; ')}.`;
    el('of-elimina').style.display = this.indice >= 0 ? '' : 'none';
    el('of-copia').style.display = this.indice >= 0 ? '' : 'none';
  }

  private salva(): void {
    const b = this.bozza;
    if (b.effetti.length === 0) return this.dici('Scegli almeno un effetto.');
    b.nome = b.nome.replace(/[<>&"']/g, '').trim().slice(0, 18) || 'Senza nome';
    if (this.indice >= 0) this.ricette[this.indice] = b;
    else {
      this.ricette.push(b);
      this.indice = this.ricette.length - 1;
    }
    this.onCambio(this.ricette, this.indice);
    this.chiudi();
  }

  private elimina(): void {
    if (this.indice < 0) return;
    this.ricette.splice(this.indice, 1);
    this.onCambio(this.ricette, -1);
    this.carica(-1);
  }

  private copia(): void {
    if (this.indice < 0) return;
    const codice = codifica(this.ricette[this.indice]!);
    this.codice.value = codice;
    this.codice.select();
    // Se il browser non lascia copiare da solo, il codice resta nella casella, già selezionato.
    navigator.clipboard?.writeText(codice).then(
      () => this.dici('Codice copiato: incollalo in un messaggio per un amico.'),
      () => this.dici('Il codice è nella casella qui sotto: tienilo premuto e copialo.'),
    );
    if (!navigator.clipboard) this.dici('Il codice è nella casella qui sotto: tienilo premuto e copialo.');
  }

  private aggiungiDaCodice(): void {
    const ricetta = decodifica(this.codice.value);
    if (!ricetta) return this.dici('Questo codice non è valido. Deve cominciare con RAD1.');
    if (this.ricette.length >= MASSIMO_RICETTE) return this.dici(`Hai già ${MASSIMO_RICETTE} incantesimi: eliminane uno per fare posto.`);
    this.ricette.push(ricetta);
    this.codice.value = '';
    this.onCambio(this.ricette, this.ricette.length - 1);
    this.carica(this.ricette.length - 1);
    this.dici(`«${ricetta.nome}» è tuo: lo trovi nella barra.`);
  }
}
