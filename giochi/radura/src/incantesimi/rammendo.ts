import * as THREE from 'three';
import { anello, creaCerchioMagico, rendi, scia } from '../effetti/forme.js';
import type { Effetto, Gioco, Incantesimo } from '../gioco.js';
import { altezza } from '../mondo/terreno.js';

const RAGGIO = 11;

class Rammendo implements Effetto {
  private eta = 0;
  private readonly cerchio = creaCerchioMagico(0xffd86a, 1.3);
  private readonly suolo: THREE.Vector3;

  constructor(g: Gioco, p: THREE.Vector3) {
    this.suolo = new THREE.Vector3(p.x, altezza(p.x, p.z), p.z);
    this.cerchio.position.copy(this.suolo).y += 0.4;
    this.cerchio.scale.setScalar(RAGGIO * 0.8);
    g.scena.add(this.cerchio);
  }

  aggiorna(dt: number, g: Gioco): boolean {
    this.eta += dt;
    const t = Math.min(1, this.eta / 1.6);
    // Il cerchio gira all'indietro, come le lancette di un orologio riavvolto.
    this.cerchio.rotation.y += dt * 2.4;
    this.cerchio.material.opacity = Math.min(1, this.eta * 4) * (1 - t * t);
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = RAGGIO * (0.4 + Math.random() * 0.6);
      const x = this.suolo.x + Math.cos(a) * r;
      const z = this.suolo.z + Math.sin(a) * r;
      g.scintille.emetti({
        x, y: this.suolo.y + Math.random() * 5, z,
        vx: -Math.cos(a) * 5 + Math.sin(a) * 4, vy: 1, vz: -Math.sin(a) * 5 - Math.cos(a) * 4,
        vita: 0.8, dim: 0.35, dimFine: 0.04, r: 1.7, g: 1.3, b: 0.4, alfa: 0.8,
      });
    }
    if (this.eta < 1.7) return true;
    this.cerchio.removeFromParent();
    rendi(this.cerchio.material);
    return false;
  }
}

export const rammendo: Incantesimo = {
  nome: 'Rammendo',
  cosaFa: 'Riavvolge il tempo: ciò che era rotto o bruciato torna al suo posto',
  simbolo: '⏳',
  colore: 0xffd86a,
  ricarica: 1.8,
  lancia(g, l) {
    const p = l.bersaglio;
    scia(g, l.origine, p, 1.7, 1.3, 0.4);
    g.pezzi.rammenda(p.x, p.z, RAGGIO);
    g.campo.risana(p.x, p.z, RAGGIO);
    anello(g, new THREE.Vector3(p.x, altezza(p.x, p.z), p.z), 0xffd86a, RAGGIO, 0.9, 1);
    g.aggiungi(new Rammendo(g, p));
    g.lampi.lampo(new THREE.Vector3(p.x, p.y + 3, p.z), 0xffd86a, 18, 1);
    g.suoni.ricostruzione();
  },
};
