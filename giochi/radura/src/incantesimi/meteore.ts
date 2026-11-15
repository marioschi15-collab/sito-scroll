import * as THREE from 'three';
import { anello, bolla } from '../effetti/forme.js';
import type { Effetto, Gioco, Incantesimo } from '../gioco.js';
import { altezza } from '../mondo/terreno.js';

const SASSO = new THREE.IcosahedronGeometry(0.9, 1);
const MATERIALE = new THREE.MeshLambertMaterial({ color: 0x2a1c18, emissive: new THREE.Color(4.0, 1.2, 0.2), flatShading: true });

class Meteora implements Effetto {
  private readonly mesh = new THREE.Mesh(SASSO, MATERIALE);
  private readonly vel = new THREE.Vector3();
  private attesa: number;

  constructor(meta: THREE.Vector3, ritardo: number) {
    this.attesa = ritardo;
    this.mesh.position.set(meta.x - 30 + Math.random() * 12, meta.y + 85, meta.z + 14 - Math.random() * 28);
    this.vel.subVectors(meta, this.mesh.position).normalize().multiplyScalar(78);
    this.mesh.scale.setScalar(0.7 + Math.random() * 0.8);
  }

  aggiorna(dt: number, g: Gioco): boolean {
    if (this.attesa > 0) {
      this.attesa -= dt;
      if (this.attesa <= 0) g.scena.add(this.mesh);
      return true;
    }
    const p = this.mesh.position;
    const passo = this.vel.length() * dt;
    const dir = this.vel.clone().normalize();
    const colpo = g.fisica.castRay(new g.R.Ray(p, dir), passo, true, undefined, undefined, undefined, g.corpoGiocatore);
    this.mesh.rotation.x += dt * 5;
    this.mesh.rotation.z += dt * 3;
    for (let i = 0; i < 5; i++) {
      const t = Math.random() * passo;
      g.scintille.emetti({
        x: p.x + dir.x * t, y: p.y + dir.y * t, z: p.z + dir.z * t,
        vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, vz: (Math.random() - 0.5) * 3,
        vita: 0.5 + Math.random() * 0.5, dim: 2.2, dimFine: 0.2, r: 1.3, g: 0.5, b: 0.1, r1: 0.6, g1: 0.05, b1: 0, alfa: 0.5,
      });
    }
    if (Math.random() < 0.5) {
      g.fumo.emetti({ x: p.x, y: p.y, z: p.z, vita: 2, dim: 1.5, dimFine: 5, r: 0.14, g: 0.12, b: 0.11, alfa: 0.35 });
    }
    if (colpo) p.addScaledVector(dir, colpo.timeOfImpact);
    else p.addScaledVector(dir, passo);
    if (!colpo && p.y > altezza(p.x, p.z)) return true;
    this.schianto(g);
    return false;
  }

  private schianto(g: Gioco): void {
    const p = this.mesh.position;
    this.mesh.removeFromParent();
    const suolo = new THREE.Vector3(p.x, altezza(p.x, p.z), p.z);
    g.pezzi.spinta(p.x, p.y - 0.5, p.z, 7.5, 18, 0.5);
    g.pezzi.accendiVicini(p.x, p.y, p.z, 3.5);
    if (p.y - suolo.y < 3) g.campo.accendi(p.x, p.z, 3.6, 10);
    bolla(g, p, 0xff8a3a, 5, 0.4, 0.8);
    anello(g, suolo, 0xff8a3a, 10, 0.6, 1.2);
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * Math.PI * 2;
      const su = Math.random();
      const v = 4 + Math.random() * 16;
      g.scintille.emetti({
        x: p.x, y: p.y + 0.3, z: p.z, vx: Math.cos(a) * v * (1 - su * 0.5), vy: su * v, vz: Math.sin(a) * v * (1 - su * 0.5),
        vita: 0.5 + Math.random() * 0.9, dim: 1.6 + Math.random() * 2, dimFine: 0.15,
        r: 1.4, g: 0.6, b: 0.15, r1: 0.7, g1: 0.07, b1: 0, alfa: 0.55, gravita: 8, attrito: 1.4,
      });
    }
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2;
      g.fumo.emetti({
        x: p.x, y: p.y + 0.5, z: p.z, vx: Math.cos(a) * 4, vy: 2 + Math.random() * 4, vz: Math.sin(a) * 4,
        vita: 2.5 + Math.random() * 2, dim: 2, dimFine: 8, r: 0.12, g: 0.1, b: 0.09, alfa: 0.5, attrito: 0.8,
      });
    }
    g.lampi.lampo(new THREE.Vector3(p.x, p.y + 2, p.z), 0xff8a40, 45, 0.6);
    g.scossa(0.8, p);
    g.suoni.botto(0.6);
  }
}

export const meteore: Incantesimo = {
  nome: 'Meteore',
  cosaFa: 'Una pioggia di sassi infuocati dal cielo',
  simbolo: '☄️',
  colore: 0xff8a3a,
  ricarica: 3.2,
  lancia(g, l) {
    for (let i = 0; i < 7; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = i === 0 ? 0 : 2 + Math.random() * 9;
      const x = l.bersaglio.x + Math.cos(a) * r;
      const z = l.bersaglio.z + Math.sin(a) * r;
      const y = i === 0 ? l.bersaglio.y : altezza(x, z);
      g.aggiungi(new Meteora(new THREE.Vector3(x, y, z), 0.25 + i * 0.38 + Math.random() * 0.15));
    }
    g.suoni.carica(1.2);
  },
};
