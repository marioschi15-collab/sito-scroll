import * as THREE from 'three';
import { generatore } from '../base/matematica.js';
import { LUOGHI, quotaLuogo } from './zone.js';

export const PIETRA = 0;
export const LEGNO = 1;
export const INTONACO = 2;
export const TEGOLA = 3;
export const ARENARIA = 4;
export const BLOCCO_GHIACCIO = 5;
export const OSSIDIANA = 6;
export const PAGLIA = 7;
export const BRACE = 8;

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
  /** A quale luogo appartiene (posizione nell'elenco dei gruppi). */
  gruppo: number;
}

/** I pezzi di un luogo stanno tutti di seguito nell'elenco: da `da` (compreso) ad `a` (escluso). */
export interface Gruppo {
  x: number;
  z: number;
  raggio: number;
  da: number;
  a: number;
}

const TINTE: Record<number, number[]> = {
  [PIETRA]: [0x9a9488, 0x8b867b, 0xa8a195, 0x7d796f, 0x948c7c],
  [LEGNO]: [0x7a5230, 0x6b4526, 0x8a6038, 0x5e3d22],
  [INTONACO]: [0xe9dcc0, 0xdfd0b0, 0xf0e6cf, 0xd8c8a6],
  [TEGOLA]: [0xb5482f, 0xa33f2a, 0xc25536, 0x993a28],
  [ARENARIA]: [0xd8b878, 0xcfae6c, 0xe2c489, 0xc6a362],
  [BLOCCO_GHIACCIO]: [0xa9d8f2, 0x97cdea, 0xbfe5f8, 0x8ec3e4],
  [OSSIDIANA]: [0x2a2530, 0x221e28, 0x332d3a, 0x1c1922],
  [PAGLIA]: [0xd9b24a, 0xcfa640, 0xe3bf5a],
  [BRACE]: [0xff7a1e],
};

export function costruisciMondo(): { mattoni: Mattone[]; gruppi: Gruppo[] } {
  const rnd = generatore(11);
  const pezzi: Mattone[] = [];
  const gruppi: Gruppo[] = [];
  const euler = new THREE.Euler();
  // Dove si sta costruendo: ogni luogo ha il suo centro e la sua quota, e i pezzi si misurano da lì.
  let ox = 0;
  let oz = 0;
  let quota = 0;

  /** Costruisce un luogo dell'elenco: dentro `fai` le misure partono dal suo centro. */
  const luogo = (id: string, fai: () => void): void => {
    const l = LUOGHI.find((x) => x.id === id)!;
    ox = l.x;
    oz = l.z;
    quota = quotaLuogo(id);
    const da = pezzi.length;
    fai();
    gruppi.push({ x: l.x, z: l.z, raggio: l.raggio, da, a: pezzi.length });
  };

  const blocco = (
    x: number, y: number, z: number, sx: number, sy: number, sz: number, materiale: number,
    rotY = 0, rotX = 0, tinta?: number,
  ): void => {
    const scelte = TINTE[materiale]!;
    const colore = new THREE.Color(tinta ?? scelte[Math.floor(rnd() * scelte.length)]!);
    colore.multiplyScalar(0.92 + rnd() * 0.16);
    if (materiale === BRACE) colore.multiplyScalar(1.6);
    pezzi.push({
      x: x + ox, y: y + quota, z: z + oz, sx, sy, sz, materiale, colore, gruppo: gruppi.length,
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

  const torreTonda = (cx: number, cz: number, raggio: number, anelli: number, perAnello: number, materiale = PIETRA, tinta?: number): void => {
    // Lunghezza misurata sul lato interno dell'anello, così i blocchi vicini non si compenetrano.
    const lungo = 2 * (raggio - 0.375) * Math.tan(Math.PI / perAnello);
    // Niente porta: in un muro curvo un architrave dritto non trova appoggio, e i filari sopra cedevano.
    for (let k = 0; k <= anelli; k++) {
      const merli = k === anelli;
      for (let i = 0; i < perAnello; i++) {
        if (merli && i % 2 === 1) continue;
        const a = ((i + (k % 2) * 0.5) / perAnello) * Math.PI * 2;
        blocco(
          cx + Math.cos(a) * raggio, 0.3 + k * 0.6, cz + Math.sin(a) * raggio,
          lungo - 0.02, 0.6, 0.75, materiale, -a + Math.PI / 2, 0, tinta,
        );
      }
    }
  };

  const torreQuadra = (cx: number, cz: number, lato: number, filari: number, materiale = PIETRA): void => {
    const m = lato / 2 - 0.3;
    const porta: Apertura = { centro: 0, mezza: 0.6, daY: 0, aY: 2.4 };
    muro(cx, cz - m, lato, filari, false, materiale, 1, 0.6, 0.6);
    muro(cx, cz + m, lato, filari, false, materiale, 1, 0.6, 0.6, [porta]);
    muro(cx - m, cz, lato - 1.2, filari, true, materiale, 0.95, 0.6, 0.6);
    muro(cx + m, cz, lato - 1.2, filari, true, materiale, 0.95, 0.6, 0.6);
    const yTetto = filari * 0.6 + 0.1;
    for (let i = 0; i < lato; i++) blocco(cx - lato / 2 + 0.5 + i, yTetto, cz, 0.96, 0.2, lato + 0.6, LEGNO);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
      blocco(cx + dx * (lato / 2 - 0.2), yTetto + 0.45, cz + dz * (lato / 2 - 0.2), 0.8, 0.7, 0.8, materiale);
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
    // Il tetto a gradoni: strati di lastre piatte, ognuno più stretto di quello sotto e appoggiato per intero su di lui.
    // Il primo poggia sulle travi dei muri davanti e dietro. Niente pesa di sbieco, quindi niente spinge in fuori i muri
    // (un tetto a falde, e poi uno a scandole sporgenti, facevano cedere le case da sole).
    const base = top + 0.3;
    const spessore = 0.4;
    const colonne = Math.round((w + 1) / 1.4);
    const largo = (w + 1) / colonne;
    for (let k = 0; d + 0.9 - k >= 0.8; k++) {
      for (let i = 0; i < colonne; i++) {
        blocco(
          cx - (w + 1) / 2 + largo * (i + 0.5), base + spessore * (k + 0.5), cz,
          largo - 0.02, spessore, d + 0.9 - k, TEGOLA, 0, 0, tintaTetto,
        );
      }
    }
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

  const catasta = (cx: number, cz: number, base: number, lato = 0.8, materiale = LEGNO): void => {
    for (let k = 0; k < base; k++) {
      const n = base - k;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          blocco(
            cx + (i - (n - 1) / 2) * lato, lato / 2 + k * lato, cz + (j - (n - 1) / 2) * lato,
            lato - 0.03, lato - 0.01, lato - 0.03, materiale,
          );
        }
      }
    }
  };

  /** Una staccionata: paletti con sopra un corrente, che poggia a metà su ogni paletto. */
  const staccionata = (x0: number, z0: number, x1: number, z1: number): void => {
    const lunghezza = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.round(lunghezza / 2);
    const rot = -Math.atan2(z1 - z0, x1 - x0);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      blocco(x0 + (x1 - x0) * t, 0.5, z0 + (z1 - z0) * t, 0.34, 1, 0.34, LEGNO, rot);
      if (i < n) {
        const tm = (i + 0.5) / n;
        blocco(x0 + (x1 - x0) * tm, 1.08, z0 + (z1 - z0) * tm, lunghezza / n - 0.03, 0.16, 0.2, LEGNO, rot);
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

  /** Una piramide a gradoni, piena. */
  const piramide = (cx: number, cz: number, base: number, lato: number, alto: number): void => {
    for (let k = 0; base - 2 * k >= 1; k++) {
      const n = base - 2 * k;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          blocco(cx + (i - (n - 1) / 2) * lato, alto / 2 + k * alto, cz + (j - (n - 1) / 2) * lato, lato - 0.03, alto, lato - 0.03, ARENARIA);
        }
      }
    }
  };

  const obelisco = (cx: number, cz: number, materiale = ARENARIA): void => {
    for (let k = 0; k < 5; k++) blocco(cx, 0.7 + k * 1.4, cz, 1.2 - k * 0.14, 1.4, 1.2 - k * 0.14, materiale);
    blocco(cx, 7.2, cz, 0.45, 0.4, 0.45, materiale);
  };

  /** Due file di colonne con sopra gli architravi e le lastre del tetto. */
  const tempio = (cx: number, cz: number, colonne: number, passo: number, largo: number): void => {
    for (let i = 0; i < colonne; i++) {
      const x = cx + (i - (colonne - 1) / 2) * passo;
      for (const lato of [-1, 1]) {
        const z = cz + (lato * largo) / 2;
        for (let k = 0; k < 4; k++) blocco(x, 0.5 + k, z, 0.9, 1, 0.9, ARENARIA);
        blocco(x, 4.2, z, 1.3, 0.4, 1.3, ARENARIA);
        if (i < colonne - 1) blocco(x + passo / 2, 4.75, z, passo - 0.04, 0.7, 1.0, ARENARIA);
      }
    }
    for (let i = 0; i < colonne - 1; i++) {
      for (let j = 0; j < 2; j++) {
        blocco(cx + (i - (colonne - 2) / 2) * passo + (j - 0.5) * (passo / 2), 5.3, cz, passo / 2 - 0.04, 0.4, largo + 1.4, ARENARIA);
      }
    }
  };

  /** Una casa di sabbia a tetto piatto. */
  const casaCubica = (cx: number, cz: number, w: number, d: number): void => {
    const porta: Apertura = { centro: 0, mezza: 0.5, daY: 0, aY: 2 };
    muro(cx, cz + d / 2 - 0.25, w, 5, false, ARENARIA, 1, 0.5, 0.5, [porta]);
    muro(cx, cz - d / 2 + 0.25, w, 5, false, ARENARIA, 1, 0.5, 0.5);
    muro(cx - w / 2 + 0.25, cz, d - 1, 5, true, ARENARIA, 1, 0.5, 0.5);
    muro(cx + w / 2 - 0.25, cz, d - 1, 5, true, ARENARIA, 1, 0.5, 0.5);
    const n = Math.round(w);
    for (let i = 0; i < n; i++) blocco(cx - w / 2 + (w / n) * (i + 0.5), 2.65, cz, w / n - 0.03, 0.3, d + 0.3, ARENARIA);
  };

  /** Un igloo: anelli di blocchi sempre più stretti e una lastra in cima. */
  const igloo = (cx: number, cz: number, raggio: number): void => {
    let r = raggio;
    let k = 0;
    for (; k < 6; k++, r -= 0.25) {
      const n = Math.round((2 * Math.PI * r) / 1.05);
      const lungo = 2 * (r - 0.3) * Math.tan(Math.PI / n);
      for (let i = 0; i < n; i++) {
        const a = ((i + (k % 2) * 0.5) / n) * Math.PI * 2;
        blocco(cx + Math.cos(a) * r, 0.25 + k * 0.5, cz + Math.sin(a) * r, lungo - 0.02, 0.5, 0.6, BLOCCO_GHIACCIO, -a + Math.PI / 2, 0, 0xeef6fb);
      }
    }
    // Una lastra sola in cima: divisa in due, ogni metà aveva il peso sopra il buco e ci cadeva dentro.
    const lato = 2 * (r + 0.25) + 0.5;
    blocco(cx, 0.2 + k * 0.5, cz, lato, 0.4, lato, BLOCCO_GHIACCIO, 0, 0, 0xeef6fb);
  };

  /** Una capanna su pali, con il pavimento di tavole. */
  const palafitta = (cx: number, cz: number): void => {
    for (const dx of [-1.7, 1.7]) {
      for (const dz of [-1.7, 1.7]) blocco(cx + dx, 1, cz + dz, 0.55, 2, 0.55, LEGNO);
      blocco(cx + dx, 2.15, cz, 0.5, 0.3, 4.2, LEGNO);
    }
    for (let i = 0; i < 6; i++) blocco(cx, 2.4, cz - 1.75 + i * 0.7, 4.4, 0.2, 0.66, LEGNO);
    const pavimento = quota + 2.5;
    const salvata = quota;
    quota = pavimento;
    const porta: Apertura = { centro: 0, mezza: 0.45, daY: 0, aY: 1.5 };
    muro(cx, cz + 1.4, 3.2, 4, false, LEGNO, 0.8, 0.5, 0.3, [porta]);
    muro(cx, cz - 1.4, 3.2, 4, false, LEGNO, 0.8, 0.5, 0.3);
    muro(cx - 1.45, cz, 2.5, 4, true, LEGNO, 0.8, 0.5, 0.3);
    muro(cx + 1.45, cz, 2.5, 4, true, LEGNO, 0.8, 0.5, 0.3);
    for (let i = 0; i < 4; i++) blocco(cx - 1.35 + i * 0.9, 2.15, cz, 0.86, 0.3, 3.6, PAGLIA);
    quota = salvata;
  };

  /** Un tetto a punta fatto di lastre quadrate sempre più piccole. */
  const cuspide = (cx: number, y: number, cz: number, lato: number, tinta: number): void => {
    for (let k = 0; lato - k * 1 >= 0.8; k++) blocco(cx, y + 0.25 + k * 0.5, cz, lato - k, 0.5, lato - k, TEGOLA, 0, 0, tinta);
  };

  luogo('villaggio', () => {
    torreTonda(-17, -15, 3.7, 17, 18);
    torreQuadra(18, -22, 5, 16);
    // Le mura tra le due torri, con una porta in mezzo.
    muro(0.5, -22, 27, 8, false, PIETRA, 1.2, 0.6, 0.85, [{ centro: 0, mezza: 1.2, daY: 0, aY: 3 }]);
    for (let i = 0; i < 12; i++) blocco(-12 + i * 2.25, 5.15, -22, 1.1, 0.7, 0.85, PIETRA);
    casa(8, -7, 7, 5);
    casa(-6, 1, 6, 5, 0x4c6a8a);
    casa(21, 5, 6, 6);
    casa(-22, 7, 7, 5, 0x6d7a45);
    casa(5, -15, 5, 5, 0x4c6a8a);
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
  });

  luogo('fattoria', () => {
    casa(-3, -4, 9, 6, 0x8a2f2a);
    casa(8, 6, 5, 5);
    catasta(-9, 7, 4, 1, PAGLIA);
    catasta(-4, 9, 3, 1, PAGLIA);
    catasta(1, 8, 3, 1, PAGLIA);
    staccionata(-13, 12, 5, 12);
    staccionata(-13, 12, -13, 2);
    pozzo(10, -6);
  });

  luogo('vedetta', () => {
    torreQuadra(0, 0, 4, 18);
    catasta(5, 3, 3);
  });

  luogo('piramide', () => {
    piramide(0, -2, 9, 1.7, 1.1);
    obelisco(-11, 9);
    obelisco(11, 9);
    piramide(-10, -9, 3, 1.4, 1);
    piramide(10, -9, 3, 1.4, 1);
  });

  luogo('tempio', () => {
    tempio(0, 0, 5, 3.4, 6);
    obelisco(0, 9);
    for (let i = 0; i < 4; i++) blocco(-4.5 + i * 3, 0.5, -8, 1, 1, 1, ARENARIA);
  });

  luogo('casbah', () => {
    casaCubica(-6, -5, 6, 5);
    casaCubica(5, -6, 5, 5);
    casaCubica(7, 5, 6, 4);
    casaCubica(-5, 6, 5, 4);
    pozzo(0, 0);
  });

  luogo('castello', () => {
    for (const dx of [-9.5, 9.5]) for (const dz of [-9.5, 9.5]) torreTonda(dx, dz, 2.5, 8, 12, BLOCCO_GHIACCIO);
    torreTonda(0, -1, 3.4, 13, 16, BLOCCO_GHIACCIO);
    const portone: Apertura = { centro: 0, mezza: 1.1, daY: 0, aY: 2.4 };
    muro(0, 9.5, 12.6, 5, false, BLOCCO_GHIACCIO, 1.2, 0.6, 0.8, [portone]);
    muro(0, -9.5, 12.6, 5, false, BLOCCO_GHIACCIO, 1.2, 0.6, 0.8);
    muro(-9.5, 0, 12.6, 5, true, BLOCCO_GHIACCIO, 1.2, 0.6, 0.8);
    muro(9.5, 0, 12.6, 5, true, BLOCCO_GHIACCIO, 1.2, 0.6, 0.8);
  });

  luogo('igloo', () => {
    igloo(-5, -3, 3);
    igloo(5, -4, 2.6);
    igloo(1, 6, 3.2);
    catasta(-7, 6, 3, 0.9, BLOCCO_GHIACCIO);
  });

  luogo('guglia', () => {
    for (let k = 0; k < 10; k++) blocco(0, 0.8 + k * 1.6, 0, 2 - k * 0.16, 1.6, 2 - k * 0.16, BLOCCO_GHIACCIO, k * 0.35, 0, 0x9fe8ff);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      for (let k = 0; k < 2 + (i % 2); k++) blocco(Math.cos(a) * 5.5, 0.7 + k * 1.4, Math.sin(a) * 5.5, 0.9, 1.4, 0.9, BLOCCO_GHIACCIO, a);
    }
  });

  luogo('palafitte', () => {
    palafitta(-7, -6);
    palafitta(6, -7);
    palafitta(8, 6);
    palafitta(-6, 7);
    // Passerelle basse tra una capanna e l'altra.
    for (let i = 0; i < 7; i++) blocco(-4.2 + i * 1.3, 0.15, 0, 1.2, 0.3, 1.6, LEGNO);
    for (let i = 0; i < 6; i++) blocco(0, 0.15, -3.9 + i * 1.3 + (i > 2 ? 1.3 : 0), 1.6, 0.3, 1.2, LEGNO);
  });

  luogo('strega', () => {
    torreTonda(0, 0, 2.3, 17, 11, PIETRA, 0x5d5a66);
    const cima = 18 * 0.6;
    for (let i = 0; i < 6; i++) blocco(-2.75 + i * 1.1, cima + 0.15, 0, 1.06, 0.3, 6.4, LEGNO);
    cuspide(0, cima + 0.3, 0, 5.4, 0x5a3a7a);
    catasta(5, 4, 3);
  });

  luogo('fortezza', () => {
    torreQuadra(0, -3, 6, 13, OSSIDIANA);
    for (const dx of [-9, 9]) torreQuadra(dx, 9, 4, 8, OSSIDIANA);
    const portone: Apertura = { centro: 0, mezza: 1.2, daY: 0, aY: 3 };
    muro(0, 9, 13.6, 6, false, OSSIDIANA, 1.2, 0.6, 0.8, [portone]);
    muro(0, -12, 21, 5, false, OSSIDIANA, 1.2, 0.6, 0.8);
    muro(-10.6, -1.4, 16.4, 5, true, OSSIDIANA, 1.2, 0.6, 0.8);
    muro(10.6, -1.4, 16.4, 5, true, OSSIDIANA, 1.2, 0.6, 0.8);
  });

  luogo('altare', () => {
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) blocco((i - 1) * 2, 0.3, (j - 1) * 2, 1.97, 0.6, 1.97, OSSIDIANA);
    blocco(0, 1.1, 0, 1.4, 1, 1.4, OSSIDIANA);
    blocco(0, 1.95, 0, 0.9, 0.7, 0.9, BRACE);
    for (const dx of [-4.5, 4.5]) for (const dz of [-4.5, 4.5]) {
      for (let k = 0; k < 3; k++) blocco(dx, 0.7 + k * 1.4, dz, 1, 1.4, 1, OSSIDIANA);
      blocco(dx, 4.5, dz, 0.6, 0.6, 0.6, BRACE);
    }
  });

  return { mattoni: pezzi, gruppi };
}
