/**
 * Le mete: una sola cosa da fare, sempre scritta sullo schermo. Le prime insegnano il gioco in un paio di minuti
 * (distruggere, spegnere, afferrare, riparare, inventare, esplorare); poi diventano traguardi di esplorazione senza fine.
 */
export interface Fatti {
  /** Quante volte è stato lanciato ogni incantesimo, per nome. */
  lanci: Record<string, number>;
  /** Quante volte il Gelo è stato lanciato mentre qualcosa bruciava. */
  spenti: number;
  inventati: number;
  luoghi: number;
  /** Quante terre diverse sono state visitate. */
  terre: number;
  perduti: number;
}

interface Meta {
  testo: (dita: boolean) => string;
  fatta: (f: Fatti) => boolean;
}

const lanciato = (nome: string) => (f: Fatti): boolean => (f.lanci[nome] ?? 0) > 0;

const GUIDATE: readonly Meta[] = [
  { testo: (dita) => (dita ? 'Tieni premuto ✦ e lancia una palla di fuoco su una casa' : 'Fai clic e lancia una palla di fuoco su una casa'), fatta: lanciato('Fuoco') },
  { testo: () => 'Scegli Esplosione 💥 e provala su una torre', fatta: lanciato('Esplosione') },
  { testo: () => 'Dai fuoco a qualcosa, poi spegnilo con Gelo ❄️', fatta: (f) => f.spenti > 0 },
  { testo: () => 'Afferra dei pezzi con Presa 🧲 e scagliali', fatta: lanciato('Presa') },
  { testo: () => 'Rimetti tutto a posto con Rammendo ⏳', fatta: lanciato('Rammendo') },
  { testo: () => 'Inventa un incantesimo tuo: tocca ＋', fatta: (f) => f.inventati > 0 },
  { testo: () => 'Esci dal villaggio: raggiungi un cerchietto della mappa', fatta: (f) => f.luoghi >= 2 },
  { testo: () => 'Segui una colonna di luce: lì c’è un incantesimo perduto', fatta: (f) => f.perduti > 0 },
  { testo: () => 'Trova un’altra terra: neve, sabbia, palude o fuoco', fatta: (f) => f.terre >= 2 },
];

const CHIAVE = 'radura-mete';

export class Mete {
  private indice = 0;

  constructor(private readonly dita: boolean) {
    try {
      const n = Number(localStorage.getItem(CHIAVE));
      if (Number.isFinite(n) && n > 0) this.indice = Math.floor(n);
    } catch {
      // Senza memoria del browser si riparte dalla prima meta.
    }
  }

  /** Dopo le mete guidate: scoprire 5, 10, 20, 40… luoghi. */
  private traguardo(): number {
    return 5 * 2 ** (this.indice - GUIDATE.length);
  }

  /** La meta da mostrare adesso. */
  attuale(): string {
    const m = GUIDATE[this.indice];
    return m ? m.testo(this.dita) : `Scopri ${this.traguardo()} luoghi`;
  }

  /** Se la meta attuale è stata raggiunta passa alla prossima e restituisce il testo di quella appena fatta. */
  controlla(f: Fatti): string | null {
    const m = GUIDATE[this.indice];
    if (!(m ? m.fatta(f) : f.luoghi >= this.traguardo())) return null;
    const fatta = this.attuale();
    this.indice++;
    try {
      localStorage.setItem(CHIAVE, String(this.indice));
    } catch {
      // Pazienza.
    }
    return fatta;
  }
}
