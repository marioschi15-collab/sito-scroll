import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { Effetto, Gioco, Incantesimo } from '../gioco.js';
import { altezza } from '../mondo/terreno.js';

const SPUNTONE = new THREE.ConeGeometry(0.6, 1, 5).translate(0, 0.5, 0);
const VITA = 11;

interface Spuntone {
  mesh: THREE.Mesh;
  nasce: number;
  alto: number;
  collisore: RAPIER.Collider | null;
}

export class Cristalli implements Effetto {
  private eta = 0;
  private readonly spuntoni: Spuntone[] = [];
  private readonly materiali = [0x6ff0ff, 0xc77dff].map(
    (c) => new THREE.MeshLambertMaterial({ color: 0x223040, emissive: new THREE.Color(c).multiplyScalar(0.75), flatShading: true }),
  );

  /** Una fila di spuntoni da un punto verso un altro. */
  static inFila(g: Gioco, da: THREE.Vector3, verso: THREE.Vector3): Cristalli {
    const dir = new THREE.Vector3(verso.x - da.x, 0, verso.z - da.z);
    const distanza = dir.length();
    dir.normalize();
    const quanti = Math.min(15, Math.max(6, Math.round(distanza / 2.3)));
    const punti: { x: number; z: number }[] = [];
    for (let k = 0; k < quanti; k++) {
      const lato = (Math.random() - 0.5) * 1.6;
      punti.push({ x: da.x + dir.x * (5.5 + k * 2.3) - dir.z * lato, z: da.z + dir.z * (5.5 + k * 2.3) + dir.x * lato });
    }
    return new Cristalli(g, punti);
  }

  constructor(g: Gioco, punti: { x: number; z: number }[]) {
    for (let k = 0; k < punti.length; k++) {
      const { x, z } = punti[k]!;
      const mesh = new THREE.Mesh(SPUNTONE, this.materiali[k % 2]!);
      mesh.position.set(x, altezza(x, z) - 0.3, z);
      mesh.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * 6.28, (Math.random() - 0.5) * 0.5);
      mesh.scale.set(1, 0.01, 1);
      mesh.visible = false;
      g.scena.add(mesh);
      this.spuntoni.push({ mesh, nasce: k * 0.06, alto: 2 + Math.min(k, 4) * 0.5 + Math.random() * 2.2 + (k % 3 === 2 ? 1.5 : 0), collisore: null });
    }
  }

  aggiorna(dt: number, g: Gioco): boolean {
    const prima = this.eta;
    this.eta += dt;
    for (const s of this.spuntoni) {
      const p = s.mesh.position;
      if (prima <= s.nasce && this.eta > s.nasce) {
        // Lo spuntone erutta: scaglia in alto ciò che ha sopra e resta lì come un ostacolo.
        s.mesh.visible = true;
        g.pezzi.spinta(p.x, p.y - 0.6, p.z, 3.6, 16, 1.3);
        s.collisore = g.fisica.createCollider(
          g.R.ColliderDesc.cylinder(s.alto / 2, 0.35).setTranslation(p.x, p.y + s.alto / 2, p.z),
        );
        for (let i = 0; i < 10; i++) {
          const a = Math.random() * Math.PI * 2;
          g.scintille.emetti({
            x: p.x, y: p.y + 0.5, z: p.z, vx: Math.cos(a) * 4, vy: 4 + Math.random() * 7, vz: Math.sin(a) * 4,
            vita: 0.5 + Math.random() * 0.5, dim: 0.35, dimFine: 0.04, r: 0.7, g: 1.4, b: 1.8, alfa: 0.9, gravita: 14,
          });
        }
        g.lampi.lampo(new THREE.Vector3(p.x, p.y + 2, p.z), 0x8fe8ff, 14, 0.4);
        g.suoni.gelo();
      }
      const t = this.eta - s.nasce;
      if (t <= 0) continue;
      const cresce = Math.min(1, t / 0.14);
      const cala = Math.min(1, Math.max(0, (VITA - t) / 0.6));
      s.mesh.scale.set(cala, Math.max(0.01, s.alto * cresce * cala), cala);
      if (t > VITA - 0.6 && s.collisore) {
        g.fisica.removeCollider(s.collisore, true);
        s.collisore = null;
      }
    }
    if (this.eta < VITA + this.spuntoni.length * 0.06) return true;
    for (const s of this.spuntoni) s.mesh.removeFromParent();
    for (const m of this.materiali) m.dispose();
    return false;
  }
}

export const cristalli: Incantesimo = {
  nome: 'Cristalli',
  cosaFa: 'Una fila di spuntoni di cristallo erutta dal terreno verso il bersaglio',
  simbolo: '💎',
  colore: 0x6ff0ff,
  ricarica: 1.4,
  lancia(g, l) {
    g.aggiungi(Cristalli.inFila(g, g.camera.position, l.bersaglio));
    g.scossa(0.3, g.camera.position);
  },
};
