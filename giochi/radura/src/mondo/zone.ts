import { gradino, rumore, rumoreStrati } from '../base/matematica.js';

/** I cinque tipi di terra. L'ordine conta: è lo stesso dei "pesi" restituiti da pesiZone. */
export const PRATO = 0;
export const DESERTO = 1;
export const GHIACCIO = 2;
export const PALUDE = 3;
export const VULCANO = 4;

export interface Zona {
  readonly nome: string;
  /** Dove sta nella "carta del clima": quanto è calda (da -1 a 1) e quanto è umida (da -1 a 1). */
  readonly caldo: number;
  readonly umido: number;
  /** Colore del terreno, della nebbia e dell'alto del cielo (esadecimali). */
  readonly terra: number;
  readonly nebbia: number;
  readonly cielo: number;
  readonly densitaNebbia: number;
  /** Quanta luce c'è (1 = pieno giorno). */
  readonly luce: number;
  /** Per l'erba: quanta ce n'è, quanto è secca, innevata, scura (da 0 a 1). */
  readonly erba: readonly [number, number, number, number];
  /** Che cosa ci si può trovare costruito. */
  readonly luoghi: readonly string[];
}

export const ZONE: readonly Zona[] = [
  { nome: 'La Radura', caldo: 0, umido: 0, terra: 0x4f8f2c, nebbia: 0xbcd7ea, cielo: 0x2a6bdb, densitaNebbia: 0.0062, luce: 1, erba: [1, 0, 0, 0], luoghi: ['borgo', 'fattoria', 'vedetta', 'borgo'] },
  { nome: 'Dune d’Ambra', caldo: 0.85, umido: -0.55, terra: 0xd7b56d, nebbia: 0xecd9b0, cielo: 0x3a86e0, densitaNebbia: 0.005, luce: 1.05, erba: [0.1, 1, 0, 0], luoghi: ['piramide', 'tempio', 'casbah'] },
  { nome: 'Terre Gelate', caldo: -0.9, umido: -0.1, terra: 0xe6eef5, nebbia: 0xdde8f2, cielo: 0x7a9fd8, densitaNebbia: 0.0095, luce: 0.95, erba: [0.28, 0, 1, 0], luoghi: ['castello', 'igloo', 'guglia'] },
  { nome: 'Palude dei Lumi', caldo: -0.1, umido: 0.95, terra: 0x34482b, nebbia: 0x5e7669, cielo: 0x3a5257, densitaNebbia: 0.014, luce: 0.75, erba: [1, 0, 0, 1], luoghi: ['palafitte', 'strega'] },
  { nome: 'Monte Brace', caldo: 0.9, umido: 0.6, terra: 0x2b2523, nebbia: 0x80564a, cielo: 0x55281f, densitaNebbia: 0.0098, luce: 0.9, erba: [0.03, 0.5, 0, 0.9], luoghi: ['fortezza', 'altare'] },
];

export const QUOTA_ACQUA = -0.55;

/** Un numero "a caso" ma sempre uguale per la stessa casella della mappa: è ciò che rende il mondo ripetibile. */
export function sorte(cx: number, cz: number, sale: number): number {
  let h = Math.imul(cx, 374761393) ^ Math.imul(cz, 668265263) ^ Math.imul(sale, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Quanto un punto appartiene a ciascun tipo di terra: cinque numeri che sommati danno 1.
 * Il mondo non ha confini: caldo e umidità cambiano dolcemente da un posto all'altro, e ogni terra nasce dove
 * il clima le somiglia. Attorno al punto di partenza c'è sempre prato.
 */
export function pesiZone(x: number, z: number, esito: Float32Array | number[]): void {
  const caldo = (rumoreStrati(x * 0.0017 + 11.3, z * 0.0017 + 5.1, 3) - 0.5) * 4.6;
  const umido = (rumoreStrati(x * 0.0017 + 71.7, z * 0.0017 + 33.9, 3) - 0.5) * 4.6;
  const casa = gradino(300, 150, Math.hypot(x, z));
  let somma = 0;
  for (let i = 0; i < ZONE.length; i++) {
    const zona = ZONE[i]!;
    const dc = caldo - zona.caldo;
    const du = umido - zona.umido;
    let f = Math.exp(-(dc * dc + du * du) / 0.085) + 1e-9;
    if (i === PRATO) f = f * 1.25 + casa * 40;
    esito[i] = f;
    somma += f;
  }
  for (let i = 0; i < ZONE.length; i++) esito[i] = esito[i]! / somma;
}

const LATO_CONI = 430;

/** Il vulcano più vicino, se ce n'è uno: dà la distanza dal suo cratere. */
function distanzaDalCratere(x: number, z: number): number {
  const cx = Math.floor(x / LATO_CONI);
  const cz = Math.floor(z / LATO_CONI);
  let vicino = Infinity;
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const kx = (cx + dx + 0.25 + sorte(cx + dx, cz + dz, 7) * 0.5) * LATO_CONI;
      const kz = (cz + dz + 0.25 + sorte(cx + dx, cz + dz, 8) * 0.5) * LATO_CONI;
      vicino = Math.min(vicino, Math.hypot(x - kx, z - kz));
    }
  }
  return vicino;
}

/** Quanta lava c'è in un punto (0 niente, 1 piena): i crateri e i fiumi che scendono dai vulcani. */
export function lava(x: number, z: number, pesoVulcano: number): number {
  if (pesoVulcano < 0.35) return 0;
  const d = distanzaDalCratere(x, z);
  const cratere = gradino(15, 11, d);
  const fiume = gradino(0.045, 0.02, Math.abs(rumore(x * 0.021 + 50, z * 0.021 + 9) - 0.5)) * gradino(22, 34, d);
  return Math.max(cratere, fiume) * gradino(0.35, 0.7, pesoVulcano);
}

const p = new Float32Array(5);

/** L'altezza "naturale" del terreno, prima di spianare i luoghi costruiti. Lascia i pesi delle zone in `p`. */
function grezza(x: number, z: number): number {
  pesiZone(x, z, p);
  let h = 0;
  if (p[PRATO]! > 0.001) h += p[PRATO]! * (rumoreStrati(x * 0.013 + 10, z * 0.013 + 7) - 0.36) * 15;
  if (p[DESERTO]! > 0.001) {
    const duna = Math.abs(Math.sin((x * 0.6 + z * 0.8) * 0.036 + rumore(x * 0.012, z * 0.012) * 5));
    h += p[DESERTO]! * (1.2 + duna * 6.5 + rumoreStrati(x * 0.01 + 70, z * 0.01, 3) * 6);
  }
  if (p[GHIACCIO]! > 0.001) h += p[GHIACCIO]! * (rumoreStrati(x * 0.009 + 21, z * 0.009 + 40) * 34 - 9);
  if (p[PALUDE]! > 0.001) h += p[PALUDE]! * (rumoreStrati(x * 0.024 + 5, z * 0.024 + 60, 3) * 3.4 - 1.9);
  if (p[VULCANO]! > 0.001) {
    const d = distanzaDalCratere(x, z);
    const cono = 44 * Math.max(0, 1 - d / 78) - 20 * gradino(19, 8, d);
    const l = lava(x, z, p[VULCANO]!);
    h += p[VULCANO]! * (1.5 + rumoreStrati(x * 0.017 + 33, z * 0.017 + 12) * 9 + cono - l * 1.2);
  }
  // Il fondo dei laghi non scende oltre il ginocchio.
  return h < -1 ? -1 - (1 - Math.exp(h + 1)) * 0.5 : h;
}

// ---------------------------------------------------------------------------------------------------------------
// I luoghi costruiti: il mondo è diviso in grandi caselle, e in molte di esse la sorte ne mette uno.

export interface Luogo {
  /** Nome unico della casella: serve a ricordare che lo si è scoperto. */
  readonly chiave: string;
  readonly tipo: string;
  readonly nome: string;
  readonly x: number;
  readonly z: number;
  readonly raggio: number;
  /** L'altezza a cui il terreno viene spianato. */
  readonly quota: number;
  readonly seme: number;
}

export const TIPI: Readonly<Record<string, { nome: string; raggio: number }>> = {
  villaggio: { nome: 'Il villaggio', raggio: 48 },
  borgo: { nome: 'Un borgo', raggio: 21 },
  fattoria: { nome: 'Una fattoria', raggio: 17 },
  vedetta: { nome: 'Una torre di vedetta', raggio: 10 },
  piramide: { nome: 'Una piramide', raggio: 17 },
  tempio: { nome: 'Un tempio delle colonne', raggio: 15 },
  casbah: { nome: 'Case di sabbia', raggio: 15 },
  castello: { nome: 'Un castello di ghiaccio', raggio: 21 },
  igloo: { nome: 'Un villaggio di igloo', raggio: 14 },
  guglia: { nome: 'Una guglia di cristallo', raggio: 10 },
  palafitte: { nome: 'Palafitte', raggio: 17 },
  strega: { nome: 'Una torre storta', raggio: 10 },
  fortezza: { nome: 'Una fortezza nera', raggio: 19 },
  altare: { nome: 'Un altare di brace', raggio: 10 },
};

export const LATO_CASELLA = 150;
const caselle = new Map<string, Luogo | null>();

/** Il luogo (se c'è) nella casella indicata. Chiesto due volte, dà sempre la stessa risposta. */
export function luogoDiCasella(cx: number, cz: number): Luogo | null {
  const chiave = `${cx},${cz}`;
  const gia = caselle.get(chiave);
  if (gia !== undefined) return gia;
  let luogo: Luogo | null = null;
  if (cx === 0 && cz === 0) {
    luogo = { chiave, tipo: 'villaggio', nome: TIPI.villaggio!.nome, x: 0, z: 0, raggio: 48, quota: 0, seme: 11 };
  } else if (sorte(cx, cz, 1) < 0.62) {
    const x = (cx + 0.5 + (sorte(cx, cz, 2) - 0.5) * 0.44) * LATO_CASELLA;
    const z = (cz + 0.5 + (sorte(cx, cz, 3) - 0.5) * 0.44) * LATO_CASELLA;
    // Abbastanza lontano dal villaggio di partenza, e ben dentro una terra sola (non a cavallo di un confine).
    if (Math.hypot(x, z) > 85) {
      // Dove il terreno è sott'acqua (nella palude capita spesso) il luogo sorge su un isolotto appena sopra il pelo.
      const quota = Math.max(0.45, grezza(x, z));
      let zona = 0;
      for (let i = 1; i < ZONE.length; i++) if (p[i]! > p[zona]!) zona = i;
      if (p[zona]! > 0.62 && lava(x, z, p[VULCANO]!) < 0.05) {
        const scelte = ZONE[zona]!.luoghi;
        const tipo = scelte[Math.floor(sorte(cx, cz, 4) * scelte.length)]!;
        const dati = TIPI[tipo]!;
        luogo = { chiave, tipo, nome: dati.nome, x, z, raggio: dati.raggio, quota, seme: Math.floor(sorte(cx, cz, 5) * 1e6) };
      }
    }
  }
  caselle.set(chiave, luogo);
  return luogo;
}

/** Tutti i luoghi entro una certa distanza da un punto. */
export function luoghiVicini(x: number, z: number, distanza: number): Luogo[] {
  const trovati: Luogo[] = [];
  const da = Math.floor((x - distanza - LATO_CASELLA) / LATO_CASELLA);
  const a = Math.floor((x + distanza + LATO_CASELLA) / LATO_CASELLA);
  const daZ = Math.floor((z - distanza - LATO_CASELLA) / LATO_CASELLA);
  const aZ = Math.floor((z + distanza + LATO_CASELLA) / LATO_CASELLA);
  for (let cz = daZ; cz <= aZ; cz++) {
    for (let cx = da; cx <= a; cx++) {
      const l = luogoDiCasella(cx, cz);
      if (l && Math.hypot(l.x - x, l.z - z) - l.raggio < distanza) trovati.push(l);
    }
  }
  return trovati;
}

export interface Campione {
  h: number;
  pesi: Float32Array;
}
const campione: Campione = { h: 0, pesi: new Float32Array(5) };

/** Altezza esatta e pesi delle zone in un punto (lento: per l'uso di tutti i giorni c'è `altezza` in terreno.ts). */
export function campiona(x: number, z: number): Campione {
  // I luoghi vanno cercati prima: cercarli calcola altre altezze e sporcherebbe i pesi di questo punto.
  const cx = Math.floor(x / LATO_CASELLA);
  const cz = Math.floor(z / LATO_CASELLA);
  const vicini: Luogo[] = [];
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const l = luogoDiCasella(cx + dx, cz + dz);
      if (l && Math.hypot(x - l.x, z - l.z) < l.raggio + 20) vicini.push(l);
    }
  }
  let h = grezza(x, z);
  campione.pesi.set(p);
  for (const l of vicini) h += (l.quota - h) * gradino(l.raggio + 20, l.raggio + 2, Math.hypot(x - l.x, z - l.z));
  campione.h = h;
  return campione;
}

export function altezzaEsatta(x: number, z: number): number {
  return campiona(x, z).h;
}
