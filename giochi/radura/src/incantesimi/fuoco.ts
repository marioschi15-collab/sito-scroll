import * as THREE from 'three';
import { anello, bolla } from '../effetti/forme.js';
import type { Effetto, Gioco, Incantesimo } from '../gioco.js';
import { altezza } from '../mondo/terreno.js';

const PALLA = new THREE.IcosahedronGeometry(0.22, 1);
const MATERIALE = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.1, 0.3), fog: false });

class PallaDiFuoco implements Effetto {
  private readonly mesh = new THREE.Mesh(PALLA, MATERIALE);
  private readonly vel: THREE.Vector3;
  private eta = 0;

  constructor(g: Gioco, origine: THREE.Vector3, direzione: THREE.Vector3) {
    this.mesh.position.copy(origine);
    this.vel = direzione.clone().multiplyScalar(52);
    g.scena.add(this.mesh);
  }

  aggiorna(dt: number, g: Gioco): boolean {
    this.eta += dt;
    this.vel.y -= 7 * dt;
    const p = this.mesh.position;
    const passo = this.vel.length() * dt;
    const dir = this.vel.clone().normalize();
    const colpo = g.fisica.castRay(new g.R.Ray(p, dir), passo, true, undefined, undefined, undefined, g.corpoGiocatore);
    if (colpo) {
      p.addScaledVector(dir, colpo.timeOfImpact);
      this.scoppia(g);
      return false;
    }
    p.addScaledVector(dir, passo);
    if (p.y < altezza(p.x, p.z) || this.eta > 5) {
      this.scoppia(g);
      return false;
    }
    for (let i = 0; i < 3; i++) {
      g.scintille.emetti({
        x: p.x - dir.x * passo * Math.random(), y: p.y - dir.y * passo * Math.random(), z: p.z - dir.z * passo * Math.random(),
        vx: (Math.random() - 0.5) * 1.5, vy: Math.random() * 1.5, vz: (Math.random() - 0.5) * 1.5,
        vita: 0.3 + Math.random() * 0.3, dim: 0.9, dimFine: 0.1, r: 1.6, g: 0.7, b: 0.15, r1: 0.9, g1: 0.1, b1: 0, alfa: 0.7,
      });
    }
    return true;
  }

  private scoppia(g: Gioco): void {
    const p = this.mesh.position;
    this.mesh.removeFromParent();
    for (let i = 0; i < 46; i++) {
      const a = Math.random() * Math.PI * 2;
      const su = Math.random();
      const v = 3 + Math.random() * 9;
      g.scintille.emetti({
        x: p.x, y: p.y + 0.2, z: p.z,
        vx: Math.cos(a) * v * (1 - su * 0.5), vy: su * v, vz: Math.sin(a) * v * (1 - su * 0.5),
        vita: 0.4 + Math.random() * 0.6, dim: 1.2 + Math.random() * 1.4, dimFine: 0.1,
        r: 1.7, g: 0.75, b: 0.18, r1: 0.8, g1: 0.08, b1: 0, alfa: 0.75, gravita: 6, attrito: 1.5,
      });
    }
    for (let i = 0; i < 5; i++) {
      g.fumo.emetti({
        x: p.x, y: p.y + 0.5, z: p.z, vx: (Math.random() - 0.5) * 2, vy: 1.5 + Math.random() * 2, vz: (Math.random() - 0.5) * 2,
        vita: 2 + Math.random(), dim: 1.5, dimFine: 5, r: 0.12, g: 0.1, b: 0.1, alfa: 0.45, attrito: 0.6,
      });
    }
    bolla(g, p, 0xff8a2a, 2.4, 0.3, 0.7);
    anello(g, new THREE.Vector3(p.x, altezza(p.x, p.z), p.z), 0xff7a22, 4, 0.4, 1);
    g.pezzi.spinta(p.x, p.y, p.z, 3.6, 8, 0.35);
    g.pezzi.accendiVicini(p.x, p.y, p.z, 2.6);
    if (p.y - altezza(p.x, p.z) < 2.5) g.campo.accendi(p.x, p.z, 2.4, 11);
    g.lampi.lampo(p, 0xff8030, 22, 0.5);
    g.scossa(0.35, p);
    g.suoni.botto(0.35);
  }
}

export const fuoco: Incantesimo = {
  nome: 'Fuoco',
  cosaFa: 'Una palla di fuoco: incendia erba e legno',
  simbolo: '🔥',
  colore: 0xff6a1a,
  ricarica: 0.28,
  lancia(g, l) {
    // Si mira al punto sotto il mirino partendo dalla punta del bastone, con un filo di alzo per la gravità.
    const dir = l.bersaglio.clone().sub(l.origine);
    const distanza = dir.length();
    dir.normalize();
    dir.y += distanza * 0.0013;
    g.aggiungi(new PallaDiFuoco(g, l.origine, dir.normalize()));
    g.suoni.soffio();
  },
};
