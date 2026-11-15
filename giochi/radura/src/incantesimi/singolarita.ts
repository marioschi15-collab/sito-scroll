import * as THREE from 'three';
import { anello, bolla } from '../effetti/forme.js';
import { Nuvola } from '../effetti/particelle.js';
import type { Effetto, Gioco, Incantesimo } from '../gioco.js';
import { altezza } from '../mondo/terreno.js';

const DURATA = 6.5;
const RAGGIO = 20;
const PUNTI = 300;
const BUCO = new THREE.IcosahedronGeometry(1, 3);
const NERO = new THREE.MeshBasicMaterial({ color: 0x000000, fog: false });

class Singolarita implements Effetto {
  private readonly c: THREE.Vector3;
  private readonly buco: THREE.Mesh;
  private readonly disco = new Nuvola(PUNTI, true);
  private readonly semi = new Float32Array(PUNTI * 3);
  private eta = 0;

  constructor(g: Gioco, bersaglio: THREE.Vector3) {
    this.c = new THREE.Vector3(bersaglio.x, Math.max(bersaglio.y, altezza(bersaglio.x, bersaglio.z)) + 7.5, bersaglio.z);
    this.buco = new THREE.Mesh(BUCO, NERO);
    this.buco.position.copy(this.c);
    g.scena.add(this.buco, this.disco.punti);
    for (let i = 0; i < PUNTI; i++) {
      this.semi[i * 3] = Math.random() * Math.PI * 2;
      this.semi[i * 3 + 1] = 0.25 + Math.random() * 0.75;
      this.semi[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    }
    g.suoni.risucchio(DURATA);
  }

  aggiorna(dt: number, g: Gioco): boolean {
    this.eta += dt;
    const t = this.eta / DURATA;
    const forza = Math.min(1, this.eta * 1.5) * (t > 0.93 ? 1 + (t - 0.93) * 20 : 1);
    const raggioBuco = 2.2 * Math.min(1, this.eta * 2) * (t > 0.93 ? Math.max(0.05, 1 - (t - 0.93) * 14) : 1);
    this.buco.scale.setScalar(Math.max(0.01, raggioBuco));
    g.umore(0.62 * Math.min(1, this.eta * 2), 0.72, 0.6, 1);

    // Il disco che gira attorno al buco: più veloce vicino al centro.
    for (let i = 0; i < PUNTI; i++) {
      const r = raggioBuco * 1.15 + this.semi[i * 3 + 1]! * 7.5;
      const a = this.semi[i * 3]! + this.eta * (14 / Math.sqrt(r));
      const caldo = 1 - this.semi[i * 3 + 1]!;
      this.disco.metti(
        i,
        this.c.x + Math.cos(a) * r, this.c.y + this.semi[i * 3 + 2]! * (0.3 + r * 0.12) + Math.sin(a) * r * 0.18, this.c.z + Math.sin(a) * r,
        0.55 + caldo * 0.9, 0.16 + caldo * 0.5, 1.5, 0.6 * forza, 0.4 + caldo * 0.8,
      );
    }
    this.disco.fatto();

    // Detriti di luce risucchiati da lontano.
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 8 + Math.random() * 10;
      const x = this.c.x + Math.cos(a) * r;
      const z = this.c.z + Math.sin(a) * r;
      const y = this.c.y - 7 + Math.random() * 10;
      g.scintille.emetti({
        x, y, z,
        vx: (this.c.x - x) * 1.6 - Math.sin(a) * 6, vy: (this.c.y - y) * 1.6, vz: (this.c.z - z) * 1.6 + Math.cos(a) * 6,
        vita: 0.55, dim: 0.5, dimFine: 0.05, r: 0.9, g: 0.5, b: 1.7, alfa: 0.7,
      });
    }

    // Attira i pezzi e li fa orbitare.
    const pos = g.pezzi.pos;
    for (let i = 0; i < g.pezzi.n; i++) {
      const dx = this.c.x - pos[i * 3]!;
      const dy = this.c.y - pos[i * 3 + 1]!;
      const dz = this.c.z - pos[i * 3 + 2]!;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > RAGGIO) continue;
      // Vicino al centro la presa si allenta: i pezzi restano in orbita, in vista, invece di sparire nel buco.
      const tira = Math.min(70, 420 / (d + 1)) * forza * (1 - d / RAGGIO + 0.15) * Math.min(1, d / 4);
      const giro = 22 * forza;
      const inv = 1 / (d + 0.01);
      g.pezzi.accelera(i, dx * inv * tira - dz * inv * giro, dy * inv * tira + 16, dz * inv * tira + dx * inv * giro, dt);
      if (d < 9) g.pezzi.frena(i, 1 - Math.min(0.5, dt * 1.6));
    }

    if (this.eta < DURATA) return true;
    // Collasso: tutto ciò che era stato raccolto viene scagliato via.
    g.pezzi.spinta(this.c.x, this.c.y, this.c.z, 14, 30, 0.1);
    bolla(g, this.c, 0xa070ff, 13, 0.6, 1);
    anello(g, new THREE.Vector3(this.c.x, altezza(this.c.x, this.c.z), this.c.z), 0x9a6aff, 20, 0.9);
    for (let i = 0; i < 160; i++) {
      const a = Math.random() * Math.PI * 2;
      const su = Math.random() * 2 - 1;
      const v = 8 + Math.random() * 20;
      g.scintille.emetti({
        x: this.c.x, y: this.c.y, z: this.c.z,
        vx: Math.cos(a) * v * Math.sqrt(1 - su * su), vy: su * v, vz: Math.sin(a) * v * Math.sqrt(1 - su * su),
        vita: 0.5 + Math.random() * 0.8, dim: 1.4, dimFine: 0.1, r: 1, g: 0.55, b: 1.8, alfa: 0.7, attrito: 1.5,
      });
    }
    g.lampi.lampo(this.c, 0xa070ff, 80, 0.9);
    g.scossa(1.2, this.c);
    g.suoni.botto(0.8);
    this.buco.removeFromParent();
    this.disco.butta();
    return false;
  }
}

export const singolarita: Incantesimo = {
  nome: 'Singolarità',
  cosaFa: 'Un buco nero che risucchia i pezzi, li fa girare e poi li scaglia via',
  simbolo: '🌀',
  colore: 0x9a5cff,
  ricarica: 2.2,
  lancia(g, l) {
    g.aggiungi(new Singolarita(g, l.bersaglio));
  },
};
