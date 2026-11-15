import * as THREE from 'three';
import type { Effetto, Gioco } from '../gioco.js';

const ANELLO = new THREE.RingGeometry(0.82, 1, 48).rotateX(-Math.PI / 2);
const SFERA = new THREE.IcosahedronGeometry(1, 2);

function materialeLuce(colore: number, forza: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(colore).multiplyScalar(forza),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
}

/** Un'onda ad anello che si allarga sul terreno e svanisce. */
export function anello(g: Gioco, dove: THREE.Vector3, colore: number, raggio: number, durata: number, forza = 1.6): void {
  const mesh = new THREE.Mesh(ANELLO, materialeLuce(colore, forza));
  mesh.position.copy(dove);
  mesh.position.y += 0.25;
  g.scena.add(mesh);
  let t = 0;
  g.aggiungi({
    aggiorna(dt) {
      t += dt / durata;
      const k = 1 - (1 - t) * (1 - t);
      mesh.scale.setScalar(Math.max(0.01, raggio * k));
      mesh.material.opacity = Math.max(0, 1 - t);
      if (t < 1) return true;
      mesh.removeFromParent();
      mesh.material.dispose();
      return false;
    },
  });
}

/** Una bolla di luce che si gonfia e svanisce: il cuore di uno scoppio. */
export function bolla(g: Gioco, dove: THREE.Vector3, colore: number, raggio: number, durata: number, forza = 1.4): void {
  const mesh = new THREE.Mesh(SFERA, materialeLuce(colore, forza));
  mesh.position.copy(dove);
  g.scena.add(mesh);
  let t = 0;
  g.aggiungi({
    aggiorna(dt) {
      t += dt / durata;
      mesh.scale.setScalar(Math.max(0.01, raggio * (1 - Math.pow(1 - Math.min(t, 1), 3))));
      mesh.material.opacity = Math.max(0, 1 - t) * 0.8;
      if (t < 1) return true;
      mesh.removeFromParent();
      mesh.material.dispose();
      return false;
    },
  });
}

/** Una scia di scintille tra due punti: il "filo" che lega il bastone al bersaglio. */
export function scia(g: Gioco, da: THREE.Vector3, a: THREE.Vector3, r: number, gr: number, b: number, quante = 26): void {
  for (let i = 0; i < quante; i++) {
    const t = (i + Math.random()) / quante;
    g.scintille.emetti({
      x: da.x + (a.x - da.x) * t, y: da.y + (a.y - da.y) * t, z: da.z + (a.z - da.z) * t,
      vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8, vz: (Math.random() - 0.5) * 0.8,
      vita: 0.25 + Math.random() * 0.35, dim: 0.5, dimFine: 0.05, r, g: gr, b, alfa: 0.8,
    });
  }
}

let disegnoCerchio: THREE.CanvasTexture | null = null;

/** Il disegno del cerchio magico, tracciato con compasso e righello (cioè con il codice). */
function cerchioMagico(): THREE.CanvasTexture {
  if (disegnoCerchio) return disegnoCerchio;
  const lato = 512;
  const tela = document.createElement('canvas');
  tela.width = tela.height = lato;
  const c = tela.getContext('2d')!;
  c.translate(lato / 2, lato / 2);
  c.strokeStyle = '#fff';
  c.fillStyle = '#fff';
  c.lineCap = 'round';
  const cerchio = (r: number, spessore: number): void => {
    c.lineWidth = spessore;
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.stroke();
  };
  cerchio(246, 7);
  cerchio(226, 2.5);
  cerchio(150, 4);
  cerchio(64, 3);
  // Tacche lungo il bordo.
  for (let i = 0; i < 56; i++) {
    const a = (i / 56) * Math.PI * 2;
    c.lineWidth = i % 4 === 0 ? 4 : 2;
    c.beginPath();
    c.moveTo(Math.cos(a) * 230, Math.sin(a) * 230);
    c.lineTo(Math.cos(a) * (i % 4 === 0 ? 206 : 216), Math.sin(a) * (i % 4 === 0 ? 206 : 216));
    c.stroke();
  }
  // Stella a sette punte.
  c.lineWidth = 4;
  c.beginPath();
  for (let i = 0; i <= 7; i++) {
    const a = ((i * 3) / 7) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * 200;
    const y = Math.sin(a) * 200;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.stroke();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
    c.beginPath();
    c.arc(Math.cos(a) * 200, Math.sin(a) * 200, 11, 0, Math.PI * 2);
    c.fill();
    c.lineWidth = 2.5;
    c.beginPath();
    c.arc(Math.cos(a + 0.45) * 108, Math.sin(a + 0.45) * 108, 20, 0, Math.PI * 2);
    c.stroke();
  }
  disegnoCerchio = new THREE.CanvasTexture(tela);
  disegnoCerchio.anisotropy = 4;
  return disegnoCerchio;
}

const PIANO = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);

/** Un cerchio magico orizzontale, luminoso, da far girare e ingrandire a piacere. */
export function creaCerchioMagico(colore: number, forza = 1.8): THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> {
  const m = materialeLuce(colore, forza);
  m.map = cerchioMagico();
  return new THREE.Mesh(PIANO, m);
}

const CILINDRO = new THREE.CylinderGeometry(1, 1, 1, 5, 1, true);
const SU = new THREE.Vector3(0, 1, 0);

/** Una saetta: una linea spezzata fatta di bastoncini luminosi, ridisegnata più volte perché tremi. */
export class Saetta implements Effetto {
  private readonly mesh: THREE.InstancedMesh;
  private eta = 0;
  private prossimo = 0;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly a = new THREE.Vector3();
  private readonly b = new THREE.Vector3();
  private readonly d = new THREE.Vector3();

  constructor(
    g: Gioco,
    private readonly da: THREE.Vector3,
    private readonly fino: THREE.Vector3,
    colore: number,
    private readonly durata = 0.38,
    private readonly spessore = 0.16,
  ) {
    this.mesh = new THREE.InstancedMesh(CILINDRO, materialeLuce(colore, 1.5), 64);
    this.mesh.frustumCulled = false;
    g.scena.add(this.mesh);
    this.disegna();
  }

  private tratto(n: number, da: THREE.Vector3, a: THREE.Vector3, raggio: number): number {
    this.d.subVectors(a, da);
    const lung = this.d.length();
    this.q.setFromUnitVectors(SU, this.d.normalize());
    this.m.compose(this.d.addVectors(da, a).multiplyScalar(0.5), this.q, this.b.set(raggio, lung, raggio));
    this.mesh.setMatrixAt(n, this.m);
    return n + 1;
  }

  private ramo(n: number, da: THREE.Vector3, a: THREE.Vector3, pezzi: number, sbando: number, raggio: number): number {
    const prima = new THREE.Vector3().copy(da);
    const dopo = new THREE.Vector3();
    for (let i = 1; i <= pezzi && n < 64; i++) {
      const t = i / pezzi;
      dopo.lerpVectors(da, a, t);
      if (i < pezzi) {
        dopo.x += (Math.random() - 0.5) * sbando;
        dopo.y += (Math.random() - 0.5) * sbando * 0.4;
        dopo.z += (Math.random() - 0.5) * sbando;
      }
      n = this.tratto(n, prima, dopo, raggio);
      if (raggio > this.spessore * 0.9 && Math.random() < 0.3 && n < 56) {
        this.a.copy(dopo).add(this.d.set((Math.random() - 0.5) * 16, -6 - Math.random() * 8, (Math.random() - 0.5) * 16));
        n = this.ramo(n, dopo.clone(), this.a.clone(), 4, sbando * 0.6, raggio * 0.45);
      }
      prima.copy(dopo);
    }
    return n;
  }

  private disegna(): void {
    const n = this.ramo(0, this.da, this.fino, 14, 5, this.spessore);
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  aggiorna(dt: number): boolean {
    this.eta += dt;
    if (this.eta >= this.prossimo) {
      this.prossimo += 0.07;
      this.disegna();
    }
    const m = this.mesh.material as THREE.MeshBasicMaterial;
    m.opacity = Math.max(0, 1 - this.eta / this.durata);
    if (this.eta < this.durata) return true;
    this.mesh.removeFromParent();
    this.mesh.dispose();
    m.dispose();
    return false;
  }
}
