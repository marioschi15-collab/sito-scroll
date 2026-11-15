import * as THREE from 'three';
import { anello, bolla, creaCerchioMagico, rendi } from '../effetti/forme.js';
import type { Effetto, Gioco, Incantesimo } from '../gioco.js';
import { altezza } from '../mondo/terreno.js';

const CARICA = 1.35;

class Esplosione implements Effetto {
  private readonly cerchi: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>[] = [];
  private eta = 0;
  private readonly suolo: THREE.Vector3;

  constructor(g: Gioco, private readonly p: THREE.Vector3) {
    this.suolo = new THREE.Vector3(p.x, altezza(p.x, p.z), p.z);
    // Tre cerchi magici impilati in cielo, sempre più piccoli verso il basso, come un imbuto.
    [[17, 9], [12.5, 5.5], [9, 3]].forEach(([quota, raggio]) => {
      const c = creaCerchioMagico(0xff5a3a, 2);
      c.position.set(p.x, this.suolo.y + quota!, p.z);
      c.userData.raggio = raggio;
      g.scena.add(c);
      this.cerchi.push(c);
    });
    g.suoni.carica(CARICA);
  }

  aggiorna(dt: number, g: Gioco): boolean {
    this.eta += dt;
    const t = Math.min(1, this.eta / CARICA);
    this.cerchi.forEach((c, i) => {
      const comparsa = Math.min(1, Math.max(0, t * 3 - i * 0.5));
      c.scale.setScalar(Math.max(0.01, (c.userData.raggio as number) * (1 - Math.pow(1 - comparsa, 3))));
      c.rotation.y += dt * (i % 2 === 0 ? 1.4 : -2) * (1 + t * 3);
      c.material.opacity = comparsa;
    });
    g.umore(0.45 * t, 1, 0.55, 0.5);
    // Scintille che piovono dai cerchi verso il bersaglio.
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 2.5 * (1 - t * 0.6);
      g.scintille.emetti({
        x: this.p.x + Math.cos(a) * r, y: this.suolo.y + 9 + Math.random() * 8, z: this.p.z + Math.sin(a) * r,
        vy: -18 - Math.random() * 14, vita: 0.5, dim: 0.55, dimFine: 0.15, r: 1.8, g: 0.5, b: 0.25, alfa: 0.8,
      });
    }
    if (this.eta < CARICA) return true;
    this.scoppia(g);
    for (const c of this.cerchi) {
      c.removeFromParent();
      rendi(c.material);
    }
    return false;
  }

  private scoppia(g: Gioco): void {
    const p = new THREE.Vector3(this.p.x, Math.max(this.p.y, this.suolo.y + 0.8), this.p.z);
    g.pezzi.spinta(p.x, p.y - 1, p.z, 15, 24, 0.55);
    g.pezzi.accendiVicini(p.x, p.y, p.z, 6.5);
    g.campo.accendi(p.x, p.z, 7, 15);
    bolla(g, p, 0xffa040, 12, 0.55, 1);
    bolla(g, p, 0xffffff, 6, 0.25, 1);
    anello(g, this.suolo, 0xff9040, 22, 0.9, 1.8);
    for (let i = 0; i < 260; i++) {
      const a = Math.random() * Math.PI * 2;
      const su = Math.random();
      const v = 5 + Math.random() * 22;
      g.scintille.emetti({
        x: p.x + Math.cos(a) * 1.5, y: p.y + su * 2, z: p.z + Math.sin(a) * 1.5,
        vx: Math.cos(a) * v * (1 - su * 0.6), vy: su * v * 1.1, vz: Math.sin(a) * v * (1 - su * 0.6),
        vita: 0.6 + Math.random() * 1.1, dim: 2.5 + Math.random() * 3.5, dimFine: 0.3,
        r: 1.6, g: 0.72, b: 0.2, r1: 0.7, g1: 0.07, b1: 0, alfa: 0.6, gravita: 3, attrito: 1.6,
      });
    }
    // La palla di fuoco che sale e si allarga a fungo.
    for (let i = 0; i < 90; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 4;
      g.scintille.emetti({
        x: p.x + Math.cos(a) * r, y: p.y + Math.random() * 3, z: p.z + Math.sin(a) * r,
        vx: Math.cos(a) * (2 + r), vy: 5 + Math.random() * 9, vz: Math.sin(a) * (2 + r),
        vita: 1.4 + Math.random() * 1.4, dim: 5 + Math.random() * 4, dimFine: 2,
        r: 1.3, g: 0.5, b: 0.12, r1: 0.35, g1: 0.03, b1: 0, alfa: 0.4, attrito: 1.1,
      });
    }
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 2 + Math.random() * 7;
      g.fumo.emetti({
        x: p.x + Math.cos(a) * 2, y: p.y + Math.random() * 3, z: p.z + Math.sin(a) * 2,
        vx: Math.cos(a) * v, vy: 3 + Math.random() * 6, vz: Math.sin(a) * v,
        vita: 3 + Math.random() * 3, dim: 3, dimFine: 11, r: 0.1, g: 0.085, b: 0.08, alfa: 0.55, attrito: 0.7,
      });
    }
    g.lampi.lampo(new THREE.Vector3(p.x, p.y + 3, p.z), 0xff9a50, 90, 1.1);
    g.scossa(1.6, p);
    g.suoni.botto(1);
  }
}

export const esplosione: Incantesimo = {
  nome: 'Esplosione',
  cosaFa: 'Carica un cerchio magico in cielo e poi fa saltare tutto',
  simbolo: '💥',
  colore: 0xff3d2e,
  ricarica: 1.6,
  lancia(g, l) {
    g.aggiungi(new Esplosione(g, l.bersaglio.clone()));
  },
};
