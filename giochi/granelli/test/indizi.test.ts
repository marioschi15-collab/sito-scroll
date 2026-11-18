import { describe, expect, it } from 'vitest';
import { INIZIALI, voce, voci } from '../src/contenuti/registro.js';
import { ATTESA_INDIZIO, INDIZIO, NIENTE, NIENTE_PER_UN_INDIZIO, Suggeritore, rigaDelNiente, testoDellaCoppia } from '../src/indizi.js';
import { M } from '../src/motore/materiali.js';
import { quadro } from '../src/motore/suggerimenti.js';

const GERGO = /\b(agente|prompt|token|api|bug|sprite|render|mestolo|null|undefined|NaN)\b/i;

/** Vero se nel testo c'è il nome di quella scoperta, come parola intera (maiuscole o no). */
function nomina(testo: string, id: number): boolean {
  const nome = voce(id)!.nome.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-zàèéìòù])${nome}($|[^a-zàèéìòù])`, 'i').test(testo);
}

/** Libri di prova: l'inizio, un quarto, metà, tre quarti (le ere arrivano da sole e restano fuori). */
function libri(): Set<number>[] {
  const tutte = voci().filter((v) => v.tipo !== 'era');
  return [0, 0.25, 0.5, 0.75].map((parte) => new Set<number>([...INIZIALI, ...tutte.slice(0, Math.round(tutte.length * parte)).map((v) => v.id)]));
}

describe('gli indizi', () => {
  it('nominano una sola delle due cose e fanno intuire l’altra, ai due livelli: mai la soluzione intera', () => {
    let provati = 0;
    for (const visti of libri()) {
      for (const c of quadro(visti).daProvare) {
        for (const chi of [c.a, c.b]) {
          const altra = chi === c.a ? c.b : c.a;
          for (const livello of [1, 2] as const) {
            const testo = testoDellaCoppia(c, chi, livello);
            const dove = `${voce(c.a)!.nome} + ${voce(c.b)!.nome} (livello ${livello}): ${testo}`;
            expect(nomina(testo, chi), dove).toBe(true);
            expect(nomina(testo, altra), dove).toBe(false);
            expect(nomina(testo, c.nato), dove).toBe(false);
            expect(GERGO.test(testo), dove).toBe(false);
            provati++;
          }
        }
      }
    }
    expect(provati).toBeGreaterThan(100);
  });

  it('il secondo livello dice di più del primo: la lettera con cui comincia l’altra cosa', () => {
    const c = quadro(new Set(INIZIALI)).daProvare.find((x) => x.nato === M.FANGO)!;
    const uno = testoDellaCoppia(c, M.TERRA, 1);
    const due = testoDellaCoppia(c, M.TERRA, 2);
    expect(uno).toBe('La terra ha ancora qualcosa da dare: prova a unirla con uno dei quattro elementi.');
    expect(due).toBe('Ci sei quasi: la terra insieme a uno dei quattro elementi. L’altra cosa comincia per «A».');
  });

  it('dopo tre «niente» di fila arriva un indizio, su una delle cose appena provate e mai su cose che non si hanno', () => {
    const visti = new Set<number>([...INIZIALI, M.FANGO, M.SABBIA, M.VAPORE, M.FUMO, M.LAVA]);
    const s = new Suggeritore();
    expect(s.dopo(M.FANGO, M.SABBIA, true, visti, 0)).toBeNull();
    expect(s.dopo(M.FANGO, M.FUMO, true, visti, 0)).toBeNull();
    const indizio = s.dopo(M.FANGO, M.VAPORE, true, visti, 0)!;
    expect(NIENTE_PER_UN_INDIZIO).toBe(3);
    expect(indizio.coppia).toBeDefined();
    expect(indizio.livello).toBe(1);
    // Il fango è in tutti e tre i tentativi: l'indizio parla di una coppia col fango, e nomina il fango.
    expect([indizio.coppia!.a, indizio.coppia!.b]).toContain(M.FANGO);
    expect(indizio.nomina).toBe(M.FANGO);
    expect(visti.has(indizio.coppia!.a) && visti.has(indizio.coppia!.b)).toBe(true);
    expect(visti.has(indizio.coppia!.nato)).toBe(false);
    // Il conto riparte: servono altri tre «niente».
    expect(s.dopo(M.SABBIA, M.FUMO, true, visti, 0)).toBeNull();
    // E per un minuto il tasto Indizio ripete questo, invece di regalarne subito uno più chiaro.
    expect(s.chiedi(visti, 10_000)).toEqual({ indizio, attendi: 50 });
  });

  it('un esito che non è «niente» azzera il conto', () => {
    const visti = new Set<number>(INIZIALI);
    const s = new Suggeritore();
    s.dopo(M.TERRA, M.TERRA, true, visti, 0);
    s.dopo(M.ACQUA, M.ACQUA, true, visti, 0);
    expect(s.dopo(M.TERRA, M.ACQUA, false, visti, 0)).toBeNull();
    expect(s.dopo(M.FUOCO, M.FUOCO, true, visti, 0)).toBeNull();
    expect(s.dopo(M.ARIA, M.ARIA, true, visti, 0)).toBeNull();
    expect(s.dopo(M.ARIA, M.FUOCO, true, visti, 0)).not.toBeNull();
  });

  it('il tasto Indizio: al più uno nuovo al minuto, prima più chiaro sulla stessa coppia, poi un’altra coppia', () => {
    const visti = new Set<number>(INIZIALI);
    const s = new Suggeritore();
    const primo = s.chiedi(visti, 0);
    expect(primo.attendi).toBe(0);
    expect(primo.indizio.livello).toBe(1);
    const presto = s.chiedi(visti, 20_000);
    expect(presto.indizio).toBe(primo.indizio);
    expect(presto.attendi).toBe(40);
    expect(INDIZIO.attendi(presto.attendi)).toBe('Un altro indizio tra 40 secondi.');
    const secondo = s.chiedi(visti, ATTESA_INDIZIO + 1);
    expect(secondo.attendi).toBe(0);
    expect(secondo.indizio.livello).toBe(2);
    expect(secondo.indizio.coppia).toBe(primo.indizio.coppia);
    expect(secondo.indizio.nomina).toBe(primo.indizio.nomina);
    const terzo = s.chiedi(visti, 2 * ATTESA_INDIZIO + 2);
    expect(terzo.indizio.livello).toBe(1);
    expect(terzo.indizio.coppia).not.toBe(primo.indizio.coppia);
    // Due indizi di fila non sembrano uguali: il terzo non ripete la frase del primo.
    expect(terzo.indizio.testo).not.toBe(primo.indizio.testo);
  });

  it('un indizio già seguito (la cosa è nata) non fa aspettare: il prossimo arriva subito', () => {
    const visti = new Set<number>(INIZIALI);
    const s = new Suggeritore();
    const primo = s.chiedi(visti, 0).indizio;
    visti.add(primo.coppia!.nato);
    const dopo = s.chiedi(visti, 5000);
    expect(dopo.attendi).toBe(0);
    expect(dopo.indizio.coppia).not.toBe(primo.coppia);
  });

  it('con tutto scritto già scoperto parla del mondo, e alla fine lo dice', () => {
    const lago = voci().find((v) => v.nome === 'Lago')!;
    const s = new Suggeritore();
    const quasi = new Set(voci().filter((v) => v.id !== lago.id).map((v) => v.id));
    expect(s.chiedi(quasi, 0).indizio).toEqual({ testo: `Prova nel mondo: «${lago.indizio}»`, voce: lago.id });
    expect(new Suggeritore().chiedi(new Set(voci().map((v) => v.id)), 0).indizio.testo).toBe(INDIZIO.tutto);
  });

  it('un indizio sul mondo già seguito (la voce si è vista) non fa aspettare il minuto', () => {
    const lago = voci().find((v) => v.nome === 'Lago')!;
    const s = new Suggeritore();
    const visti = new Set(voci().filter((v) => v.id !== lago.id).map((v) => v.id));
    expect(s.chiedi(visti, 0).indizio.voce).toBe(lago.id);
    visti.add(lago.id);
    expect(s.chiedi(visti, 5000)).toEqual({ indizio: { testo: INDIZIO.tutto }, attendi: 0 });
  });

  it('un «niente» ha sempre una riga gentile, e due di fila non sono mai uguali', () => {
    expect(NIENTE.length).toBeGreaterThanOrEqual(5);
    for (let n = 0; n < 20; n++) {
      expect(rigaDelNiente(n)).not.toBe(rigaDelNiente(n + 1));
      expect(rigaDelNiente(n).length).toBeGreaterThan(5);
    }
    for (const riga of [...NIENTE, INDIZIO.tutto, INDIZIO.tasto]) expect(GERGO.test(riga), riga).toBe(false);
  });
});
