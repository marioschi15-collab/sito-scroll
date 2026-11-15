import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { geometriaQuercia } from './alberi.js';
import type { Campo } from './campo.js';
import { altezza } from './terreno.js';

interface Albero {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>;
  collisore: RAPIER.Collider;
  eta: number;
  taglia: number;
  nero: boolean;
}

const MASSIMO = 14;

/** Gli alberi fatti spuntare dall'incantesimo di crescita: nascono piccoli e si allargano in un paio di secondi. */
export class AlberiMagici {
  private readonly alberi: Albero[] = [];
  private readonly geometria = geometriaQuercia();

  constructor(
    private readonly scena: THREE.Scene,
    private readonly R: typeof RAPIER,
    private readonly fisica: RAPIER.World,
    private readonly ombre: boolean,
  ) {}

  vicino(x: number, z: number, raggio: number): boolean {
    return this.alberi.some((a) => Math.hypot(a.mesh.position.x - x, a.mesh.position.z - z) < raggio);
  }

  pianta(x: number, z: number): void {
    if (this.alberi.length >= MASSIMO) this.togli(this.alberi[0]!);
    const y = altezza(x, z);
    const mesh = new THREE.Mesh(this.geometria, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    mesh.position.set(x, y - 0.1, z);
    mesh.rotation.y = Math.random() * 6.28;
    mesh.scale.setScalar(0.01);
    mesh.castShadow = this.ombre;
    this.scena.add(mesh);
    const taglia = 0.9 + Math.random() * 0.5;
    const collisore = this.fisica.createCollider(
      this.R.ColliderDesc.cylinder(1.7 * taglia, 0.4 * taglia).setTranslation(x, y + 1.7 * taglia, z),
    );
    this.alberi.push({ mesh, collisore, eta: 0, taglia, nero: false });
  }

  private togli(a: Albero): void {
    a.mesh.removeFromParent();
    a.mesh.material.dispose();
    this.fisica.removeCollider(a.collisore, false);
    this.alberi.splice(this.alberi.indexOf(a), 1);
  }

  azzera(): void {
    while (this.alberi.length > 0) this.togli(this.alberi[0]!);
  }

  aggiorna(dt: number, campo: Campo): void {
    for (const a of this.alberi) {
      if (a.eta < 3) {
        a.eta += dt;
        const t = Math.min(1, a.eta / 2.2);
        // Cresce di slancio, supera un po' la misura e poi si assesta.
        const k = 1 - Math.pow(1 - t, 3) * Math.cos(t * 7);
        a.mesh.scale.set(a.taglia * (0.4 + 0.6 * k) * Math.min(1, t * 3), a.taglia * k, a.taglia * (0.4 + 0.6 * k) * Math.min(1, t * 3));
      }
      const c = campo.cella(a.mesh.position.x, a.mesh.position.z);
      const nero = c >= 0 && campo.bruciato[c]! > 0.6;
      if (nero !== a.nero) {
        a.nero = nero;
        a.mesh.material.color.setScalar(nero ? 0.08 : 1);
      }
    }
  }
}
