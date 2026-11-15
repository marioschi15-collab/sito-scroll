import * as THREE from 'three';
import { Nuvola } from '../effetti/particelle.js';
import type { Effetto, Gioco, Incantesimo } from '../gioco.js';
import { altezza } from '../mondo/terreno.js';

const DURATA = 12;
const ALTO = 22;
const RAGGIO = 8.5;
const PUNTI = 520;

class Tornado implements Effetto {
  private readonly p: THREE.Vector3;
  private rotta: number;
  private readonly polvere = new Nuvola(PUNTI, false);
  private readonly fiamme = new Nuvola(PUNTI / 2, true);
  private readonly semi = new Float32Array(PUNTI * 3);
  private eta = 0;
  private infuocato = 0;
  private attesaFuoco = 0;
  private attesaSuono = 0;

  constructor(g: Gioco, bersaglio: THREE.Vector3, direzione: THREE.Vector3) {
    this.p = new THREE.Vector3(bersaglio.x, altezza(bersaglio.x, bersaglio.z), bersaglio.z);
    this.rotta = Math.atan2(direzione.z, direzione.x);
    g.scena.add(this.polvere.punti, this.fiamme.punti);
    for (let i = 0; i < PUNTI; i++) {
      this.semi[i * 3] = Math.random() * Math.PI * 2;
      this.semi[i * 3 + 1] = Math.pow(Math.random(), 0.8);
      this.semi[i * 3 + 2] = 0.75 + Math.random() * 0.5;
    }
  }

  private punto(i: number, vigore: number, esito: THREE.Vector3): THREE.Vector3 {
    const h = (this.semi[i * 3 + 1]! + this.eta * 0.12 * this.semi[i * 3 + 2]!) % 1;
    const r = (0.7 + Math.pow(h, 1.4) * 6.5) * this.semi[i * 3 + 2]! * vigore;
    const a = this.semi[i * 3]! + this.eta * (7.5 - h * 4);
    const sbanda = h * 1.8;
    return esito.set(
      this.p.x + Math.cos(a) * r + Math.sin(this.eta * 1.3 + h * 4) * sbanda,
      this.p.y + h * ALTO * vigore,
      this.p.z + Math.sin(a) * r + Math.cos(this.eta * 1.1 + h * 3) * sbanda,
    );
  }

  aggiorna(dt: number, g: Gioco): boolean {
    this.eta += dt;
    const vigore = Math.min(1, this.eta / 1.2) * Math.min(1, (DURATA - this.eta) / 1.5);
    // Avanza serpeggiando.
    this.rotta += Math.sin(this.eta * 0.7) * dt * 0.9;
    this.p.x += Math.cos(this.rotta) * 3.6 * dt;
    this.p.z += Math.sin(this.rotta) * 3.6 * dt;
    this.p.y = altezza(this.p.x, this.p.z);

    const cella = g.campo.cella(this.p.x, this.p.z);
    const sulFuoco = cella >= 0 && g.campo.fuoco[cella]! > 0.15;
    this.infuocato = Math.min(1, Math.max(0, this.infuocato + (sulFuoco ? dt * 1.2 : -dt * 0.06)));

    const v = new THREE.Vector3();
    const grigio = 1 - this.infuocato * 0.75;
    for (let i = 0; i < PUNTI; i++) {
      this.punto(i, vigore, v);
      const h = (v.y - this.p.y) / ALTO;
      this.polvere.metti(i, v.x, v.y, v.z, 0.4 * grigio, 0.37 * grigio, 0.33 * grigio, 0.42 * vigore, 2 + h * 4);
      if (i < PUNTI / 2) {
        this.fiamme.metti(i, v.x, v.y + 0.4, v.z, 1.6, 0.6 - h * 0.3, 0.12, 0.5 * this.infuocato * vigore, 2 + h * 2.5);
      }
    }
    this.polvere.fatto();
    this.fiamme.fatto();

    // Terra e foglie strappate alla base.
    for (let i = 0; i < 2; i++) {
      const a = Math.random() * Math.PI * 2;
      g.fumo.emetti({
        x: this.p.x + Math.cos(a) * 2, y: this.p.y + 0.3, z: this.p.z + Math.sin(a) * 2,
        vx: -Math.sin(a) * 7, vy: 1 + Math.random() * 3, vz: Math.cos(a) * 7,
        vita: 1 + Math.random(), dim: 1.2, dimFine: 3.5, r: 0.42, g: 0.4, b: 0.3, alfa: 0.3 * vigore, attrito: 1,
      });
    }

    if (this.infuocato > 0.3) {
      this.attesaFuoco += dt;
      if (this.attesaFuoco > 0.25) {
        this.attesaFuoco = 0;
        g.campo.accendi(this.p.x, this.p.z, 2.6, 9);
        g.pezzi.accendiVicini(this.p.x, this.p.y + 2, this.p.z, 4.5);
      }
      g.lampi.lampo(new THREE.Vector3(this.p.x, this.p.y + 5, this.p.z), 0xff7a30, 18 * this.infuocato, 0.2);
    }

    this.attesaSuono -= dt;
    if (this.attesaSuono <= 0) {
      this.attesaSuono = 1.1;
      g.suoni.vento();
    }

    // Solleva e fa ruotare i pezzi dentro il vortice.
    const pos = g.pezzi.pos;
    for (let i = 0; i < g.pezzi.n; i++) {
      const y = pos[i * 3 + 1]! - this.p.y;
      if (y > ALTO + 4) continue;
      const dx = this.p.x - pos[i * 3]!;
      const dz = this.p.z - pos[i * 3 + 2]!;
      const d = Math.hypot(dx, dz);
      const raggio = RAGGIO + Math.max(0, y) * 0.25;
      if (d > raggio) continue;
      const k = (1 - d / raggio) * vigore;
      const inv = 1 / (d + 0.05);
      const dentro = d > 2.5 ? 16 : -6;
      g.pezzi.accelera(
        i,
        (dx * inv * dentro - dz * inv * 38) * k,
        (y < ALTO * 0.8 ? 46 : -10) * k,
        (dz * inv * dentro + dx * inv * 38) * k,
        dt,
      );
    }

    if (this.eta < DURATA) return true;
    this.polvere.butta();
    this.fiamme.butta();
    return false;
  }
}

export const tornado: Incantesimo = {
  nome: 'Tornado',
  cosaFa: 'Una tromba d’aria che avanza e solleva tutto; sopra il fuoco diventa di fiamme',
  simbolo: '🌪️',
  colore: 0xbfe8f2,
  ricarica: 2.5,
  lancia(g, l) {
    g.aggiungi(new Tornado(g, l.bersaglio, l.direzione));
    g.suoni.vento();
  },
};
