import * as THREE from 'three';
import { anello } from '../effetti/forme.js';
import type { Effetto, Gioco, Incantesimo } from '../gioco.js';
import { altezza } from '../mondo/terreno.js';

const DURATA = 3.8;

class Terremoto implements Effetto {
  private eta = 0;
  private attesa = 0;
  private readonly suolo: THREE.Vector3;

  constructor(p: THREE.Vector3) {
    this.suolo = new THREE.Vector3(p.x, altezza(p.x, p.z), p.z);
  }

  aggiorna(dt: number, g: Gioco): boolean {
    this.eta += dt;
    this.attesa -= dt;
    g.scossa(0.55, this.suolo);
    if (this.attesa <= 0) {
      this.attesa = 0.22;
      const raggio = 7 + this.eta * 4.5;
      anello(g, this.suolo, 0xc9a26a, raggio, 0.5, 0.6);
      // Ogni scossa dà uno strattone, in una direzione a caso, a tutto ciò che poggia lì attorno.
      const pos = g.pezzi.pos;
      for (let i = 0; i < g.pezzi.n; i++) {
        const dx = pos[i * 3]! - this.suolo.x;
        const dz = pos[i * 3 + 2]! - this.suolo.z;
        const d = Math.hypot(dx, dz);
        if (d > raggio || pos[i * 3 + 1]! - this.suolo.y > 16) continue;
        const k = 1 - (d / raggio) * 0.6;
        g.pezzi.accelera(i, (Math.random() - 0.5) * 7 * k, (2 + Math.random() * 3.5) * k, (Math.random() - 0.5) * 7 * k, 1);
      }
      for (let i = 0; i < 7; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * raggio;
        const x = this.suolo.x + Math.cos(a) * r;
        const z = this.suolo.z + Math.sin(a) * r;
        g.fumo.emetti({
          x, y: altezza(x, z) + 0.3, z, vx: (Math.random() - 0.5) * 2, vy: 1.5 + Math.random() * 2.5, vz: (Math.random() - 0.5) * 2,
          vita: 1.6 + Math.random(), dim: 1.5, dimFine: 5, r: 0.5, g: 0.43, b: 0.32, alfa: 0.4, attrito: 1,
        });
      }
      g.suoni.botto(0.28);
    }
    return this.eta < DURATA;
  }
}

export const terremoto: Incantesimo = {
  nome: 'Terremoto',
  cosaFa: 'La terra trema a ondate sempre più larghe: i muri si sbriciolano',
  simbolo: '🌋',
  colore: 0xc9a26a,
  ricarica: 4.2,
  lancia(g, l) {
    g.aggiungi(new Terremoto(l.bersaglio));
  },
};
