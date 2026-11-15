import * as THREE from 'three';
import type { Effetto, Gioco, Incantesimo } from '../gioco.js';
import { altezza } from '../mondo/terreno.js';

const DURATA = 7.5;
const RAGGIO = 9.5;
const SFERA = new THREE.IcosahedronGeometry(1, 3);

class Levitazione implements Effetto {
  private eta = 0;
  private readonly c: THREE.Vector3;
  private readonly bolla: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;

  constructor(g: Gioco, p: THREE.Vector3) {
    this.c = new THREE.Vector3(p.x, altezza(p.x, p.z) + 3, p.z);
    this.bolla = new THREE.Mesh(
      SFERA,
      new THREE.MeshBasicMaterial({
        color: 0x9fd4ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
        side: THREE.DoubleSide, fog: false,
      }),
    );
    this.bolla.position.copy(this.c);
    g.scena.add(this.bolla);
    g.suoni.fioritura();
  }

  aggiorna(dt: number, g: Gioco): boolean {
    this.eta += dt;
    const vigore = Math.min(1, this.eta * 2) * Math.min(1, (DURATA - this.eta) * 1.5);
    this.bolla.scale.setScalar(Math.max(0.01, RAGGIO * (0.6 + 0.4 * Math.min(1, this.eta * 2))));
    this.bolla.material.opacity = 0.13 * vigore + Math.sin(this.eta * 3) * 0.015;
    // Dentro la bolla il peso sparisce: i pezzi salgono piano e ruotano lenti attorno al centro.
    const pos = g.pezzi.pos;
    for (let i = 0; i < g.pezzi.n; i++) {
      const dx = pos[i * 3]! - this.c.x;
      const dy = pos[i * 3 + 1]! - this.c.y;
      const dz = pos[i * 3 + 2]! - this.c.z;
      if (dx * dx + dy * dy + dz * dz > RAGGIO * RAGGIO) continue;
      const v = g.pezzi.velocita(i);
      g.pezzi.accelera(
        i,
        (-dz * 0.35 - v.x * 0.9) * vigore,
        16 * vigore + (1.3 - v.y) * 2.2 * vigore,
        (dx * 0.35 - v.z * 0.9) * vigore,
        dt,
      );
    }
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * RAGGIO * 0.9;
      g.scintille.emetti({
        x: this.c.x + Math.cos(a) * r, y: this.c.y - 3 + Math.random() * 2, z: this.c.z + Math.sin(a) * r,
        vy: 1.5 + Math.random() * 2, vita: 1.6 + Math.random(), dim: 0.22, dimFine: 0.05, r: 0.8, g: 1.2, b: 1.7, alfa: 0.8,
      });
    }
    if (this.eta < DURATA) return true;
    this.bolla.removeFromParent();
    this.bolla.material.dispose();
    return false;
  }
}

export const levitazione: Incantesimo = {
  nome: 'Levitazione',
  cosaFa: 'Una bolla dove il peso sparisce: tutto galleggia, poi ricade',
  simbolo: '🎈',
  colore: 0x9fd4ff,
  ricarica: 2.5,
  lancia(g, l) {
    g.aggiungi(new Levitazione(g, l.bersaglio));
  },
};
