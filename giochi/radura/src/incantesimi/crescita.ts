import * as THREE from 'three';
import { anello, creaCerchioMagico, scia } from '../effetti/forme.js';
import type { Effetto, Gioco, Incantesimo } from '../gioco.js';
import { altezza } from '../mondo/terreno.js';

const RAGGIO = 9;
const PETALI: [number, number, number][] = [[1.6, 0.4, 0.7], [1.5, 1.3, 0.4], [1.4, 1.4, 1.4], [0.6, 0.9, 1.7]];

class Crescita implements Effetto {
  private eta = 0;
  private readonly cerchio = creaCerchioMagico(0x6dff6a, 1.3);
  private readonly suolo: THREE.Vector3;

  constructor(g: Gioco, p: THREE.Vector3, albero: boolean) {
    this.suolo = new THREE.Vector3(p.x, altezza(p.x, p.z), p.z);
    this.cerchio.position.copy(this.suolo).y += 0.35;
    g.scena.add(this.cerchio);
    anello(g, this.suolo, 0x8dff7a, RAGGIO, 1.2, 1);
    if (albero) g.alberi.pianta(p.x, p.z);
    g.lampi.lampo(new THREE.Vector3(p.x, this.suolo.y + 2, p.z), 0x7dff70, 16, 1.2);
    g.suoni.fioritura();
  }

  aggiorna(dt: number, g: Gioco): boolean {
    this.eta += dt;
    const t = Math.min(1, this.eta / 1.6);
    const raggio = 1.5 + (RAGGIO - 1.5) * t;
    // La vita si allarga dal centro verso fuori, un po' per volta.
    g.campo.fiorisci(this.suolo.x, this.suolo.z, raggio, dt * 2.2);
    this.cerchio.scale.setScalar(raggio * 0.75);
    this.cerchio.rotation.y += dt * 0.8;
    this.cerchio.material.opacity = 1 - t * t;
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * raggio;
      const x = this.suolo.x + Math.cos(a) * r;
      const z = this.suolo.z + Math.sin(a) * r;
      const petalo = Math.random() < 0.35 ? PETALI[Math.floor(Math.random() * PETALI.length)]! : null;
      g.scintille.emetti({
        x, y: altezza(x, z) + 0.2, z,
        vx: -Math.sin(a) * 1.5, vy: 1.5 + Math.random() * 3.5, vz: Math.cos(a) * 1.5,
        vita: 1 + Math.random() * 1.2, dim: petalo ? 0.3 : 0.4, dimFine: 0.04,
        r: petalo ? petalo[0] : 0.5, g: petalo ? petalo[1] : 1.6, b: petalo ? petalo[2] : 0.4, alfa: 0.8, attrito: 0.8,
      });
    }
    if (this.eta < 1.8) return true;
    this.cerchio.removeFromParent();
    this.cerchio.material.dispose();
    return false;
  }
}

export const crescita: Incantesimo = {
  nome: 'Crescita',
  cosaFa: 'Fa rinascere il prato bruciato, sbocciare i fiori e spuntare un albero',
  simbolo: '🌱',
  colore: 0x58e04a,
  ricarica: 0.9,
  lancia(g, l) {
    const p = l.bersaglio;
    scia(g, l.origine, p, 0.5, 1.6, 0.4);
    const libero = l.aTerra && !g.alberi.vicino(p.x, p.z, 7);
    g.aggiungi(new Crescita(g, p, libero));
  },
};
