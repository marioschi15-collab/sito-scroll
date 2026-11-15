import * as THREE from 'three';

/** Poche luci riutilizzate per i bagliori improvvisi (scoppi, fulmini): si accendono e si spengono da sole. */
export class Lampi {
  private readonly luci: { luce: THREE.PointLight; forza: number; durata: number; resta: number }[] = [];

  constructor(scena: THREE.Scene, quante: number) {
    for (let i = 0; i < quante; i++) {
      const luce = new THREE.PointLight(0xffffff, 0, 70, 1.2);
      scena.add(luce);
      this.luci.push({ luce, forza: 0, durata: 1, resta: 0 });
    }
  }

  lampo(dove: THREE.Vector3, colore: number, forza: number, durata: number): void {
    let scelta = this.luci[0]!;
    for (const l of this.luci) if (l.resta < scelta.resta) scelta = l;
    scelta.luce.position.copy(dove);
    scelta.luce.color.set(colore);
    scelta.forza = forza;
    scelta.durata = durata;
    scelta.resta = durata;
  }

  aggiorna(dt: number): void {
    for (const l of this.luci) {
      if (l.resta <= 0) continue;
      l.resta -= dt;
      const t = Math.max(0, l.resta / l.durata);
      l.luce.intensity = l.forza * t * t;
    }
  }
}
