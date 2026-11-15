import { gradino, rumore, rumoreStrati } from '../base/matematica.js';

/** Le cinque zone del mondo. L'ordine conta: è lo stesso dei "pesi" restituiti da pesiZone. */
export const PRATO = 0;
export const DESERTO = 1;
export const GHIACCIO = 2;
export const PALUDE = 3;
export const VULCANO = 4;

export interface Zona {
  readonly nome: string;
  readonly x: number;
  readonly z: number;
  /** Colore del terreno, della nebbia e dell'alto del cielo (esadecimali). */
  readonly terra: number;
  readonly nebbia: number;
  readonly cielo: number;
  readonly densitaNebbia: number;
  /** Quanta luce c'è (1 = pieno giorno). */
  readonly luce: number;
  /** Per l'erba: quanta ce n'è, quanto è secca, innevata, scura (da 0 a 1). */
  readonly erba: readonly [number, number, number, number];
}

export const ZONE: readonly Zona[] = [
  { nome: 'La Radura', x: 0, z: 0, terra: 0x4f8f2c, nebbia: 0xbcd7ea, cielo: 0x2a6bdb, densitaNebbia: 0.0068, luce: 1, erba: [1, 0, 0, 0] },
  { nome: 'Dune d’Ambra', x: 205, z: -30, terra: 0xd7b56d, nebbia: 0xecd9b0, cielo: 0x3a86e0, densitaNebbia: 0.0055, luce: 1.05, erba: [0.1, 1, 0, 0] },
  { nome: 'Terre Gelate', x: -40, z: -210, terra: 0xe6eef5, nebbia: 0xdde8f2, cielo: 0x7a9fd8, densitaNebbia: 0.0105, luce: 0.95, erba: [0.28, 0, 1, 0] },
  { nome: 'Palude dei Lumi', x: -210, z: 30, terra: 0x34482b, nebbia: 0x5e7669, cielo: 0x3a5257, densitaNebbia: 0.0155, luce: 0.75, erba: [1, 0, 0, 1] },
  { nome: 'Monte Brace', x: 40, z: 210, terra: 0x2b2523, nebbia: 0x80564a, cielo: 0x55281f, densitaNebbia: 0.0105, luce: 0.9, erba: [0.03, 0.5, 0, 0.9] },
];

/** I posti dove c'è qualcosa di costruito: lì il terreno viene spianato. */
export interface Luogo {
  readonly id: string;
  readonly nome: string;
  readonly x: number;
  readonly z: number;
  readonly raggio: number;
}

export const LUOGHI: readonly Luogo[] = [
  { id: 'villaggio', nome: 'Il villaggio', x: 0, z: 0, raggio: 48 },
  { id: 'fattoria', nome: 'La fattoria', x: 84, z: 78, raggio: 17 },
  { id: 'vedetta', nome: 'La torre di vedetta', x: -84, z: -78, raggio: 10 },
  { id: 'piramide', nome: 'La piramide', x: 180, z: -52, raggio: 17 },
  { id: 'tempio', nome: 'Il tempio delle colonne', x: 222, z: 8, raggio: 15 },
  { id: 'casbah', nome: 'Le case di sabbia', x: 152, z: 14, raggio: 15 },
  { id: 'castello', nome: 'Il castello di ghiaccio', x: -46, z: -186, raggio: 21 },
  { id: 'igloo', nome: 'Gli igloo', x: -100, z: -158, raggio: 14 },
  { id: 'guglia', nome: 'La guglia di cristallo', x: 14, z: -236, raggio: 10 },
  { id: 'palafitte', nome: 'Le palafitte', x: -182, z: 22, raggio: 17 },
  { id: 'strega', nome: 'La torre storta', x: -228, z: -28, raggio: 10 },
  { id: 'fortezza', nome: 'La fortezza nera', x: -8, z: 164, raggio: 19 },
  { id: 'altare', nome: 'L’altare di brace', x: 98, z: 182, raggio: 10 },
];

export const RAGGIO_GIOCO = 300;
export const CRATERE = { x: 40, z: 212 };
export const QUOTA_ACQUA = -0.55;

const SIGMA2 = 2 * 46 * 46;

/** Quanto un punto appartiene a ciascuna zona: cinque numeri che sommati danno 1. I confini sono ondulati. */
export function pesiZone(x: number, z: number, esito: Float32Array | number[]): void {
  const px = x + (rumore(x * 0.011 + 3, z * 0.011) - 0.5) * 70;
  const pz = z + (rumore(x * 0.011, z * 0.011 + 8) - 0.5) * 70;
  let somma = 0;
  for (let i = 0; i < ZONE.length; i++) {
    const zona = ZONE[i]!;
    const dx = px - zona.x;
    const dz = pz - zona.z;
    // Lontano dal proprio centro ogni zona continua a "tirare": si confronta la distanza, non un bordo fisso.
    const f = Math.exp(-(dx * dx + dz * dz) / SIGMA2 + 40) + 1e-30;
    esito[i] = f;
    somma += f;
  }
  for (let i = 0; i < ZONE.length; i++) esito[i] = esito[i]! / somma;
}

const p = new Float32Array(5);

/** Quanta lava c'è in un punto (0 niente, 1 piena): il cratere e i fiumi che scendono dal vulcano. */
export function lava(x: number, z: number, pesoVulcano: number): number {
  if (pesoVulcano < 0.35) return 0;
  const d = Math.hypot(x - CRATERE.x, z - CRATERE.z);
  const cratere = gradino(15, 11, d);
  const fiume = gradino(0.045, 0.02, Math.abs(rumore(x * 0.021 + 50, z * 0.021 + 9) - 0.5)) * gradino(22, 34, d);
  return Math.max(cratere, fiume) * gradino(0.35, 0.7, pesoVulcano);
}

/** L'altezza "naturale" del terreno, prima di spianare i luoghi costruiti. */
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
    const d = Math.hypot(x - CRATERE.x, z - CRATERE.z);
    const cono = 44 * Math.max(0, 1 - d / 78) - 20 * gradino(19, 8, d);
    const l = lava(x, z, p[VULCANO]!);
    h += p[VULCANO]! * (1.5 + rumoreStrati(x * 0.017 + 33, z * 0.017 + 12) * 9 + cono - l * 1.2);
  }
  // Le montagne che chiudono il mondo.
  const r = Math.hypot(x, z);
  h += gradino(RAGGIO_GIOCO + 5, RAGGIO_GIOCO + 90, r) * (30 + 50 * rumoreStrati(x * 0.006 + 3, z * 0.006 + 31, 3));
  // Il fondo dei laghi non scende oltre il ginocchio.
  return h < -1 ? -1 - (1 - Math.exp(h + 1)) * 0.5 : h;
}

const quote: number[] = LUOGHI.map((l) => (l.id === 'villaggio' ? 0 : Math.max(0.4, grezza(l.x, l.z))));

/** La quota (altezza del terreno spianato) di un luogo costruito. */
export function quotaLuogo(id: string): number {
  return quote[LUOGHI.findIndex((l) => l.id === id)]!;
}

/** L'altezza esatta del terreno in un punto, calcolata da capo (lenta: per l'uso di tutti i giorni c'è `altezza`). */
export function altezzaEsatta(x: number, z: number): number {
  let h = grezza(x, z);
  for (let i = 0; i < LUOGHI.length; i++) {
    const l = LUOGHI[i]!;
    const d = Math.hypot(x - l.x, z - l.z);
    if (d < l.raggio + 20) h += (quote[i]! - h) * gradino(l.raggio + 20, l.raggio + 2, d);
  }
  return h;
}
