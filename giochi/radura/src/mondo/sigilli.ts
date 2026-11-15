import * as THREE from 'three';
import { creaCerchioMagico } from '../effetti/forme.js';
import type { Particelle } from '../effetti/particelle.js';
import { altezza } from './terreno.js';
import type { Luogo } from './zone.js';

const COLONNA = new THREE.CylinderGeometry(0.45, 1.2, 80, 12, 1, true).translate(0, 40, 0);
const QUANTI = 3;

interface Sigillo {
  gruppo: THREE.Group;
  cerchio: THREE.Mesh;
  luogo: Luogo | null;
}

/** Dove sta il sigillo di un luogo: sull'orlo dello spiazzo, sempre nello stesso punto. */
function posto(l: Luogo, esito: THREE.Vector3): THREE.Vector3 {
  const a = (l.seme % 628) / 100;
  const x = l.x + Math.cos(a) * (l.raggio + 3);
  const z = l.z + Math.sin(a) * (l.raggio + 3);
  return esito.set(x, altezza(x, z), z);
}

/**
 * I sigilli: colonne di luce dorata che si vedono da lontano, anche attraverso la nebbia. Segnano i luoghi in cui
 * c'è ancora un incantesimo perduto da trovare. Camminarci dentro lo fa proprio.
 */
export class Sigilli {
  private readonly sigilli: Sigillo[] = [];
  private readonly p = new THREE.Vector3();

  constructor(scena: THREE.Scene, private readonly scintille: Particelle) {
    const materiale = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0xffd86a).multiplyScalar(1.4), transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide, fog: false,
    });
    for (let i = 0; i < QUANTI; i++) {
      const gruppo = new THREE.Group();
      const cerchio = creaCerchioMagico(0xffd86a, 1.5);
      cerchio.scale.setScalar(3.2);
      cerchio.position.y = 0.3;
      gruppo.add(new THREE.Mesh(COLONNA, materiale), cerchio);
      gruppo.visible = false;
      scena.add(gruppo);
      this.sigilli.push({ gruppo, cerchio, luogo: null });
    }
  }

  /**
   * Mostra i sigilli dei luoghi più vicini che hanno ancora qualcosa da dare. Restituisce il luogo il cui sigillo
   * è stato appena raggiunto da chi gioca, oppure null.
   */
  aggiorna(dt: number, luoghi: readonly Luogo[], haAncora: (l: Luogo) => boolean, chi: THREE.Vector3): Luogo | null {
    const vicini = luoghi
      .filter(haAncora)
      .sort((a, b) => Math.hypot(a.x - chi.x, a.z - chi.z) - Math.hypot(b.x - chi.x, b.z - chi.z))
      .slice(0, QUANTI);
    let raggiunto: Luogo | null = null;
    this.sigilli.forEach((s, i) => {
      const l = vicini[i] ?? null;
      s.gruppo.visible = l !== null;
      if (!l) return;
      if (s.luogo !== l) {
        s.luogo = l;
        s.gruppo.position.copy(posto(l, this.p));
      }
      s.cerchio.rotation.y += dt * 0.9;
      const g = s.gruppo.position;
      if (Math.random() < dt * 24) {
        const a = Math.random() * Math.PI * 2;
        this.scintille.emetti({
          x: g.x + Math.cos(a) * 1.4, y: g.y + 0.3, z: g.z + Math.sin(a) * 1.4, vy: 2.5 + Math.random() * 3,
          vita: 2 + Math.random() * 1.5, dim: 0.22, dimFine: 0.05, r: 1.7, g: 1.3, b: 0.4, alfa: 0.9,
        });
      }
      if (Math.hypot(g.x - chi.x, g.z - chi.z) < 3.4 && Math.abs(g.y - chi.y) < 6) raggiunto = l;
    });
    return raggiunto;
  }
}
