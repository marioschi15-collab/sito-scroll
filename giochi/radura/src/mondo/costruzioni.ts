import * as THREE from 'three';
import { generatore } from '../base/matematica.js';

export const PIETRA = 0;
export const LEGNO = 1;
export const INTONACO = 2;
export const TEGOLA = 3;

/** Un buco in un muro: dove sta il suo centro lungo il muro, quanto è largo (metà) e tra quali altezze. */
interface Apertura {
  centro: number;
  mezza: number;
  daY: number;
  aY: number;
}

/** Un pezzo di costruzione: dove sta, com'è girato, quanto è grande, di cosa è fatto. */
export interface Mattone {
  x: number;
  y: number;
  z: number;
  q: THREE.Quaternion;
  sx: number;
  sy: number;
  sz: number;
  materiale: number;
  colore: THREE.Color;
}

const TINTE: Record<number, number[]> = {
  [PIETRA]: [0x9a9488, 0x8b867b, 0xa8a195, 0x7d796f, 0x948c7c],
  [LEGNO]: [0x7a5230, 0x6b4526, 0x8a6038, 0x5e3d22],
  [INTONACO]: [0xe9dcc0, 0xdfd0b0, 0xf0e6cf, 0xd8c8a6],
  [TEGOLA]: [0xb5482f, 0xa33f2a, 0xc25536, 0x993a28],
};

export function costruisciVillaggio(): Mattone[] {
  const rnd = generatore(11);
  const pezzi: Mattone[] = [];
  const euler = new THREE.Euler();

  const blocco = (
    x: number, y: number, z: number, sx: number, sy: number, sz: number, materiale: number,
    rotY = 0, rotX = 0, tinta?: number,
  ): void => {
    const scelte = TINTE[materiale]!;
    const colore = new THREE.Color(tinta ?? scelte[Math.floor(rnd() * scelte.length)]!);
    colore.multiplyScalar(0.92 + rnd() * 0.16);
    pezzi.push({
      x, y, z, sx, sy, sz, materiale, colore,
      q: new THREE.Quaternion().setFromEuler(euler.set(rotX, rotY, 0, 'YXZ')),
    });
  };

  /**
   * Un muro dritto a filari sfalsati, lungo x (lungoZ = false) oppure lungo z.
   * Le aperture (porte e finestre) tolgono i blocchi che le attraversano; sopra ognuna va un architrave
   * di legno, largo abbastanza da poggiare sui blocchi ai lati: senza, i filari sopra resterebbero sospesi.
   */
  const muro = (
    cx: number, cz: number, lunghezza: number, filari: number, lungoZ: boolean, materiale: number,
    lung: number, alt: number, spess: number, aperture: Apertura[] = [],
  ): void => {
    const n = Math.round(lunghezza / lung);
    const passo = lunghezza / n;
    const metti = (centro: number, y: number, lungo: number, mat: number): void => {
      if (lungoZ) blocco(cx, y, cz + centro, spess, alt, lungo - 0.02, mat);
      else blocco(cx + centro, y, cz, lungo - 0.02, alt, spess, mat);
    };
    /** I blocchi di un filare: [inizio, fine] lungo il muro. */
    const trattiDi = (k: number): [number, number][] => {
      const tratti: [number, number][] = [];
      if (k % 2 === 0) {
        for (let i = 0; i < n; i++) tratti.push([-lunghezza / 2 + passo * i, -lunghezza / 2 + passo * (i + 1)]);
      } else {
        tratti.push([-lunghezza / 2, -lunghezza / 2 + passo / 2]);
        for (let i = 0; i < n - 1; i++) tratti.push([-lunghezza / 2 + passo * (i + 0.5), -lunghezza / 2 + passo * (i + 1.5)]);
        tratti.push([lunghezza / 2 - passo / 2, lunghezza / 2]);
      }
      return tratti;
    };
    const tocca = (t: [number, number], da: number, a: number): boolean => t[1] > da + 0.01 && t[0] < a - 0.01;
    const nelBuco = (ap: Apertura, k: number): boolean => k * alt > ap.daY - 0.01 && (k + 1) * alt < ap.aY + 0.01;
    const filareArchitrave = (ap: Apertura, k: number): boolean => k * alt >= ap.aY - 0.01 && k * alt < ap.aY + alt - 0.01;
    // Quanto è largo davvero ogni buco, contando i blocchi tolti in tutti i suoi filari (i bordi sono a dente).
    const buchi = aperture.map((ap) => {
      let da = ap.centro - ap.mezza;
      let a = ap.centro + ap.mezza;
      for (let k = 0; k < filari; k++) {
        if (!nelBuco(ap, k)) continue;
        for (const t of trattiDi(k)) {
          if (!tocca(t, ap.centro - ap.mezza, ap.centro + ap.mezza)) continue;
          da = Math.min(da, t[0]);
          a = Math.max(a, t[1]);
        }
      }
      return { da, a };
    });
    for (let k = 0; k < filari; k++) {
      const y = alt / 2 + k * alt;
      const tratti = trattiDi(k);
      const architravi: [number, number][] = [];
      aperture.forEach((ap, i) => {
        if (!filareArchitrave(ap, k)) return;
        // L'architrave sporge di almeno venti centimetri oltre il buco, da una parte e dall'altra.
        const coperti = tratti.filter((t) => tocca(t, buchi[i]!.da - 0.2, buchi[i]!.a + 0.2));
        if (coperti.length === 0) return;
        architravi.push([Math.min(...coperti.map((t) => t[0])), Math.max(...coperti.map((t) => t[1]))]);
      });
      // Architravi che si toccano diventano uno solo.
      architravi.sort((p, q) => p[0] - q[0]);
      const uniti: [number, number][] = [];
      for (const t of architravi) {
        const ultimo = uniti[uniti.length - 1];
        if (ultimo && t[0] <= ultimo[1] + 0.01) ultimo[1] = Math.max(ultimo[1], t[1]);
        else uniti.push([t[0], t[1]]);
      }
      for (const t of tratti) {
        if (uniti.some((u) => tocca(t, u[0], u[1]))) continue;
        if (aperture.some((ap) => nelBuco(ap, k) && tocca(t, ap.centro - ap.mezza, ap.centro + ap.mezza))) continue;
        metti((t[0] + t[1]) / 2, y, t[1] - t[0], materiale);
      }
      for (const u of uniti) metti((u[0] + u[1]) / 2, y, u[1] - u[0], LEGNO);
    }
  };

  const torreTonda = (cx: number, cz: number, raggio: number, anelli: number, perAnello: number): void => {
    // Lunghezza misurata sul lato interno dell'anello, così i blocchi vicini non si compenetrano.
    const lungo = 2 * (raggio - 0.375) * Math.tan(Math.PI / perAnello);
    const delta = (a: number): number => Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2)));
    for (let k = 0; k <= anelli; k++) {
      const merli = k === anelli;
      for (let i = 0; i < perAnello; i++) {
        if (merli && i % 2 === 1) continue;
        const a = ((i + (k % 2) * 0.5) / perAnello) * Math.PI * 2;
        // La porta guarda verso chi arriva; al quinto anello, sopra la porta, c'è un architrave.
        if (k < 4 && delta(a) < 0.2) continue;
        if (k === 4 && delta(a) < 0.4) continue;
        blocco(
          cx + Math.cos(a) * raggio, 0.3 + k * 0.6, cz + Math.sin(a) * raggio,
          lungo - 0.02, 0.6, 0.75, PIETRA, -a + Math.PI / 2,
        );
      }
    }
    const mezzoAngolo = (Math.PI * 2 * 1.5) / perAnello;
    blocco(
      cx, 0.3 + 4 * 0.6, cz + raggio * (1 + Math.cos(mezzoAngolo)) / 2,
      2 * raggio * Math.sin(mezzoAngolo) - 0.04, 0.6, 0.75, LEGNO,
    );
  };

  const torreQuadra = (cx: number, cz: number, lato: number, filari: number): void => {
    const m = lato / 2 - 0.3;
    const porta: Apertura = { centro: 0, mezza: 0.6, daY: 0, aY: 2.4 };
    muro(cx, cz - m, lato, filari, false, PIETRA, 1, 0.6, 0.6);
    muro(cx, cz + m, lato, filari, false, PIETRA, 1, 0.6, 0.6, [porta]);
    muro(cx - m, cz, lato - 1.2, filari, true, PIETRA, 0.95, 0.6, 0.6);
    muro(cx + m, cz, lato - 1.2, filari, true, PIETRA, 0.95, 0.6, 0.6);
    const yTetto = filari * 0.6 + 0.1;
    for (let i = 0; i < lato; i++) blocco(cx - lato / 2 + 0.5 + i, yTetto, cz, 0.96, 0.2, lato + 0.6, LEGNO);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
      blocco(cx + dx * (lato / 2 - 0.2), yTetto + 0.45, cz + dz * (lato / 2 - 0.2), 0.8, 0.7, 0.8, PIETRA);
    }
  };

  const casa = (cx: number, cz: number, w: number, d: number, tintaTetto?: number): void => {
    const filari = 6;
    const porta: Apertura = { centro: 0, mezza: 0.5, daY: 0, aY: 2 };
    const finestre: Apertura[] = [-1, 1].map((lato) => ({ centro: lato * (w / 4 + 0.1), mezza: 0.3, daY: 1, aY: 2 }));
    muro(cx, cz + d / 2 - 0.2, w, filari, false, INTONACO, 1, 0.5, 0.4, [porta]);
    muro(cx, cz - d / 2 + 0.2, w, filari, false, INTONACO, 1, 0.5, 0.4, finestre);
    muro(cx - w / 2 + 0.2, cz, d - 0.8, filari, true, INTONACO, 1, 0.5, 0.4);
    muro(cx + w / 2 - 0.2, cz, d - 0.8, filari, true, INTONACO, 1, 0.5, 0.4);
    const top = filari * 0.5;
    // Travi sopra i muri.
    blocco(cx, top + 0.15, cz + d / 2 - 0.2, w + 0.3, 0.3, 0.45, LEGNO);
    blocco(cx, top + 0.15, cz - d / 2 + 0.2, w + 0.3, 0.3, 0.45, LEGNO);
    blocco(cx - w / 2 + 0.2, top + 0.15, cz, 0.45, 0.3, d - 0.9, LEGNO);
    blocco(cx + w / 2 - 0.2, top + 0.15, cz, 0.45, 0.3, d - 0.9, LEGNO);
    // Il tetto a scandole: file di lastre piatte, ognuna appoggiata per più di metà su quella sotto e un gradino
    // più in dentro. Stando piatte non spingono in fuori i muri, e il tetto regge da solo. Ai due capi, i timpani
    // (i triangoli di muro sotto il tetto) salgono a gradini insieme alle lastre.
    const base = top + 0.3;
    const gradino = 0.5;
    const spessore = 0.4;
    const colonne = Math.round((w + 1) / 1.4);
    const largo = (w + 1) / colonne;
    const lastre = (y: number, z: number, profonde: number): void => {
      for (let i = 0; i < colonne; i++) {
        blocco(cx - (w + 1) / 2 + largo * (i + 0.5), y, cz + z, largo - 0.02, spessore, profonde, TEGOLA, 0, 0, tintaTetto);
      }
    };
    let k = 0;
    for (; d / 2 - 0.7 - gradino * k >= 0.25; k++) {
      const mezzo = d / 2 - 0.7 - gradino * k;
      const y = base + spessore * (k + 0.5);
      for (const lato of [-1, 1]) {
        blocco(cx + lato * (w / 2 - 0.2), y, cz, 0.4, spessore, mezzo * 2 - 0.04, INTONACO);
        lastre(y, lato * (mezzo + 0.02 + 0.6), 1.2);
      }
    }
    lastre(base + spessore * (k + 0.5), 0, 2 * (d / 2 - 0.7 - gradino * (k - 1)) + 1.4);
  };

  const cerchioDiPietre = (cx: number, cz: number, raggio: number, n: number): void => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = cx + Math.cos(a) * raggio;
      const z = cz + Math.sin(a) * raggio;
      blocco(x, 0.8, z, 1.3, 1.6, 0.8, PIETRA, -a + Math.PI / 2, 0, 0x6f7377);
      blocco(x, 2.4, z, 1.2, 1.6, 0.75, PIETRA, -a + Math.PI / 2, 0, 0x777b7f);
      if (i % 3 !== 2) {
        const am = ((i + 0.5) / n) * Math.PI * 2;
        const corda = 2 * raggio * Math.sin(Math.PI / n);
        blocco(
          cx + Math.cos(am) * raggio * Math.cos(Math.PI / n), 3.5, cz + Math.sin(am) * raggio * Math.cos(Math.PI / n),
          corda - 0.1, 0.6, 0.85, PIETRA, -am + Math.PI / 2, 0, 0x65696d,
        );
      }
    }
  };

  const catasta = (cx: number, cz: number, base: number, lato = 0.8): void => {
    for (let k = 0; k < base; k++) {
      const n = base - k;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          blocco(
            cx + (i - (n - 1) / 2) * lato, lato / 2 + k * lato, cz + (j - (n - 1) / 2) * lato,
            lato - 0.03, lato - 0.01, lato - 0.03, LEGNO,
          );
        }
      }
    }
  };

  const staccionata = (x0: number, z0: number, x1: number, z1: number): void => {
    const lunghezza = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.round(lunghezza / 2);
    const rot = -Math.atan2(z1 - z0, x1 - x0);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      blocco(x0 + (x1 - x0) * t, 0.6, z0 + (z1 - z0) * t, 0.18, 1.2, 0.18, LEGNO);
      if (i < n) {
        const tm = (i + 0.5) / n;
        for (const y of [0.5, 0.95]) {
          blocco(x0 + (x1 - x0) * tm, y, z0 + (z1 - z0) * tm, lunghezza / n - 0.2, 0.12, 0.08, LEGNO, rot);
        }
      }
    }
  };

  const pozzo = (cx: number, cz: number): void => {
    for (let k = 0; k < 3; k++) {
      for (let i = 0; i < 8; i++) {
        const a = ((i + (k % 2) * 0.5) / 8) * Math.PI * 2;
        blocco(cx + Math.cos(a) * 1.1, 0.2 + k * 0.4, cz + Math.sin(a) * 1.1, 0.72, 0.4, 0.4, PIETRA, -a + Math.PI / 2);
      }
    }
    blocco(cx - 1.1, 1.9, cz, 0.2, 1.4, 0.2, LEGNO);
    blocco(cx + 1.1, 1.9, cz, 0.2, 1.4, 0.2, LEGNO);
    blocco(cx, 2.7, cz, 2.8, 0.2, 0.3, LEGNO);
  };

  torreTonda(-17, -15, 3.7, 17, 18);
  torreQuadra(18, -22, 5, 16);
  // Le mura tra le due torri, con una porta in mezzo.
  muro(0.5, -22, 27, 8, false, PIETRA, 1.2, 0.6, 0.85, [{ centro: 0, mezza: 1.2, daY: 0, aY: 3 }]);
  for (let i = 0; i < 12; i++) blocco(-12 + i * 2.25, 5.15, -22, 1.1, 0.7, 0.85, PIETRA);

  casa(8, -7, 7, 5);
  casa(-6, 1, 6, 5, 0x4c6a8a);
  casa(21, 5, 6, 6);
  casa(-22, 7, 7, 5, 0x6d7a45);
  casa(5, -15, 5, 4.4, 0x4c6a8a);

  pozzo(2, 9);
  cerchioDiPietre(25, 25, 5.2, 9);
  catasta(12, 15, 5);
  catasta(-12, 17, 4);
  catasta(-27, -6, 4, 1);
  catasta(28, -8, 5);
  muro(-27, 24, 9, 4, false, PIETRA, 1.2, 0.6, 0.8);
  muro(31.5, 14, 8, 4, true, PIETRA, 1, 0.6, 0.8);
  staccionata(-12, 22, -2, 22);
  staccionata(6, 22, 16, 22);
  staccionata(-30, 14, -30, 2);

  return pezzi;
}
