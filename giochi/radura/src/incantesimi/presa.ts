import * as THREE from 'three';
import { bolla } from '../effetti/forme.js';
import type { Effetto, Gioco, Incantesimo } from '../gioco.js';

class Presa implements Effetto {
  private eta = 0;
  private readonly scostamenti: THREE.Vector3[];
  private readonly ancora = new THREE.Vector3();
  private readonly dir = new THREE.Vector3();

  constructor(g: Gioco, private readonly presi: number[]) {
    this.scostamenti = presi.map(() => new THREE.Vector3().randomDirection().multiplyScalar(0.6 + Math.random() * 1.9));
    g.impegnato = true;
    g.suoni.soffio();
  }

  aggiorna(dt: number, g: Gioco): boolean {
    this.eta += dt;
    g.camera.getWorldDirection(this.dir);
    this.ancora.copy(g.camera.position).addScaledVector(this.dir, 9.5);
    this.ancora.y += 0.8;
    const pos = g.pezzi.pos;
    // Si tiene finché il lancio resta premuto (almeno un secondo, così funziona anche con un tocco solo).
    const tenuto = (g.premuto() || this.eta < 1) && this.eta < 9;
    this.presi.forEach((i, k) => {
      if (!tenuto) {
        g.pezzi.scaglia(i, this.dir.x * 52 + (Math.random() - 0.5) * 5, this.dir.y * 52 + 2 + (Math.random() - 0.5) * 5, this.dir.z * 52 + (Math.random() - 0.5) * 5);
        return;
      }
      const s = this.scostamenti[k]!;
      const v = g.pezzi.velocita(i);
      let ax = (this.ancora.x + s.x - pos[i * 3]!) * 42 - v.x * 10;
      let ay = (this.ancora.y + s.y - pos[i * 3 + 1]!) * 42 - v.y * 10 + 16;
      let az = (this.ancora.z + s.z - pos[i * 3 + 2]!) * 42 - v.z * 10;
      const forza = Math.hypot(ax, ay, az);
      if (forza > 260) {
        ax *= 260 / forza;
        ay *= 260 / forza;
        az *= 260 / forza;
      }
      g.pezzi.accelera(i, ax, ay, az, dt);
      if (Math.random() < 0.1) {
        g.scintille.emetti({
          x: pos[i * 3]!, y: pos[i * 3 + 1]!, z: pos[i * 3 + 2]!, vy: 0.6, vita: 0.5, dim: 0.5, dimFine: 0.05,
          r: 1.5, g: 0.6, b: 1.5, alfa: 0.7,
        });
      }
    });
    if (tenuto) return true;
    bolla(g, this.ancora, 0xe070ff, 3.5, 0.3, 0.7);
    g.scossa(0.3, this.ancora);
    g.suoni.botto(0.3);
    g.impegnato = false;
    return false;
  }
}

export const presa: Incantesimo = {
  nome: 'Presa',
  cosaFa: 'Tieni premuto per afferrare i pezzi e portarli con te; rilascia per scagliarli',
  simbolo: '🧲',
  colore: 0xe070ff,
  ricarica: 0.5,
  lancia(g, l) {
    const presi = g.pezzi.vicini(l.bersaglio.x, l.bersaglio.y, l.bersaglio.z, 5.5, 34);
    if (presi.length === 0) {
      bolla(g, l.bersaglio, 0xe070ff, 1.5, 0.3, 0.5);
      return;
    }
    g.aggiungi(new Presa(g, presi));
  },
};
