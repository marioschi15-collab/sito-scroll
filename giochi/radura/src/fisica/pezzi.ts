import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { Particelle } from '../effetti/particelle.js';
import type { Campo } from '../mondo/campo.js';
import { INTONACO, LEGNO, PIETRA, TEGOLA, type Mattone } from '../mondo/costruzioni.js';

const DENSITA: Record<number, number> = { [PIETRA]: 2.2, [LEGNO]: 0.7, [INTONACO]: 1.3, [TEGOLA]: 1.2 };
const CARBONE = new THREE.Color(0.05, 0.04, 0.035);
const GHIACCIO = new THREE.Color(0.62, 0.86, 1.0);
const TIC = 0.2;

/**
 * Tutti i pezzi delle costruzioni: ognuno è un corpo con peso e attrito, disegnati tutti insieme in un colpo solo.
 * Appena fermi "si addormentano" (non costano più calcoli) e si risvegliano quando qualcosa li tocca.
 */
export class Pezzi {
  readonly mesh: THREE.InstancedMesh;
  readonly n: number;
  /** Posizioni aggiornate a ogni fotogramma (x, y, z di seguito), per i calcoli degli incantesimi. */
  readonly pos: Float32Array;
  readonly massa: Float32Array;
  private readonly corpi: RAPIER.RigidBody[] = [];
  private readonly collisori: RAPIER.Collider[] = [];
  private readonly perManiglia = new Map<number, number>();
  private readonly fiamma: Float32Array;
  private readonly carbone: Float32Array;
  private readonly ghiaccio: Float32Array;
  private readonly scala: Float32Array;
  private readonly ardenti = new Set<number>();
  private readonly gelati = new Set<number>();
  private attesa = 0;
  private fermo = true;
  svegli = 0;

  private readonly m = new THREE.Matrix4();
  private readonly p = new THREE.Vector3();
  private readonly q = new THREE.Quaternion();
  private readonly s = new THREE.Vector3();
  private readonly c = new THREE.Color();

  constructor(
    private readonly mattoni: Mattone[],
    R: typeof RAPIER,
    fisica: RAPIER.World,
    ombre: boolean,
  ) {
    this.n = mattoni.length;
    this.pos = new Float32Array(this.n * 3);
    this.massa = new Float32Array(this.n);
    this.fiamma = new Float32Array(this.n);
    this.carbone = new Float32Array(this.n);
    this.ghiaccio = new Float32Array(this.n);
    this.scala = new Float32Array(this.n).fill(1);
    this.mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshLambertMaterial({ color: 0xffffff }),
      this.n,
    );
    this.mesh.castShadow = ombre;
    this.mesh.receiveShadow = ombre;
    this.mesh.frustumCulled = false;
    mattoni.forEach((b, i) => {
      const corpo = fisica.createRigidBody(
        R.RigidBodyDesc.dynamic().setTranslation(b.x, b.y, b.z).setRotation(b.q),
      );
      const collisore = fisica.createCollider(
        R.ColliderDesc.cuboid(b.sx / 2, b.sy / 2, b.sz / 2)
          .setDensity(DENSITA[b.materiale] ?? 1)
          .setFriction(b.materiale === TEGOLA ? 1.1 : 0.8)
          .setRestitution(0.04),
        corpo,
      );
      this.corpi.push(corpo);
      this.collisori.push(collisore);
      this.perManiglia.set(collisore.handle, i);
      this.massa[i] = corpo.mass();
      this.disegna(i, b.x, b.y, b.z, b.q);
      this.mesh.setColorAt(i, b.colore);
    });
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor!.needsUpdate = true;
  }

  private disegna(i: number, x: number, y: number, z: number, q: { x: number; y: number; z: number; w: number }): void {
    const b = this.mattoni[i]!;
    const k = this.scala[i]!;
    this.pos[i * 3] = x;
    this.pos[i * 3 + 1] = y;
    this.pos[i * 3 + 2] = z;
    this.m.compose(this.p.set(x, y, z), this.q.set(q.x, q.y, q.z, q.w), this.s.set(b.sx * k, b.sy * k, b.sz * k));
    this.mesh.setMatrixAt(i, this.m);
  }

  /** Quale pezzo è stato colpito, dato l'oggetto restituito dal motore fisico (oppure -1). */
  indiceDi(collisore: RAPIER.Collider): number {
    return this.perManiglia.get(collisore.handle) ?? -1;
  }

  /** Copia sullo schermo la posizione dei pezzi che si stanno muovendo. */
  sincronizza(): void {
    let svegli = 0;
    for (let i = 0; i < this.n; i++) {
      const corpo = this.corpi[i]!;
      if (corpo.isSleeping()) continue;
      svegli++;
      const t = corpo.translation();
      if (t.y < -30) {
        corpo.setTranslation({ x: t.x, y: -30, z: t.z }, false);
        corpo.sleep();
        continue;
      }
      this.disegna(i, t.x, t.y, t.z, corpo.rotation());
    }
    if (svegli > 0 || !this.fermo) this.mesh.instanceMatrix.needsUpdate = true;
    this.fermo = svegli === 0;
    this.svegli = svegli;
  }

  /** Spinta a raggiera da un punto: è lo scoppio. `alzata` aggiunge una spinta verso l'alto. */
  spinta(x: number, y: number, z: number, raggio: number, forza: number, alzata = 0.4): void {
    const r2 = raggio * raggio;
    for (let i = 0; i < this.n; i++) {
      const dx = this.pos[i * 3]! - x;
      const dy = this.pos[i * 3 + 1]! - y;
      const dz = this.pos[i * 3 + 2]! - z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > r2) continue;
      const d = Math.sqrt(d2) + 0.001;
      const k = (1 - d / raggio) * forza * this.massa[i]!;
      const corpo = this.corpi[i]!;
      corpo.applyImpulse({ x: (dx / d) * k, y: (dy / d + alzata) * k, z: (dz / d) * k }, true);
      const giro = k * 0.25;
      corpo.applyTorqueImpulse(
        { x: (Math.random() - 0.5) * giro, y: (Math.random() - 0.5) * giro, z: (Math.random() - 0.5) * giro },
        true,
      );
    }
  }

  /** Cambia la velocità di un pezzo di (ax, ay, az) per secondo: serve a tornado e singolarità. */
  accelera(i: number, ax: number, ay: number, az: number, dt: number): void {
    const m = this.massa[i]! * dt;
    this.corpi[i]!.applyImpulse({ x: ax * m, y: ay * m, z: az * m }, true);
  }

  velocita(i: number): { x: number; y: number; z: number } {
    return this.corpi[i]!.linvel();
  }

  frena(i: number, quanto: number): void {
    const corpo = this.corpi[i]!;
    const v = corpo.linvel();
    corpo.setLinvel({ x: v.x * quanto, y: v.y * quanto, z: v.z * quanto }, true);
  }

  private infiammabile(i: number): boolean {
    const m = this.mattoni[i]!.materiale;
    return (m === LEGNO || m === INTONACO) && this.carbone[i]! < 0.05 && this.fiamma[i] === 0 && this.ghiaccio[i]! < 0.3;
  }

  accendi(i: number): void {
    if (!this.infiammabile(i)) return;
    this.fiamma[i] = 5 + Math.random() * 5;
    this.ardenti.add(i);
  }

  accendiVicini(x: number, y: number, z: number, raggio: number): void {
    const r2 = raggio * raggio;
    for (let i = 0; i < this.n; i++) {
      const dx = this.pos[i * 3]! - x;
      const dy = this.pos[i * 3 + 1]! - y;
      const dz = this.pos[i * 3 + 2]! - z;
      if (dx * dx + dy * dy + dz * dz < r2) this.accendi(i);
    }
  }

  gela(x: number, y: number, z: number, raggio: number): void {
    const r2 = raggio * raggio;
    for (let i = 0; i < this.n; i++) {
      const dx = this.pos[i * 3]! - x;
      const dy = this.pos[i * 3 + 1]! - y;
      const dz = this.pos[i * 3 + 2]! - z;
      if (dx * dx + dy * dy + dz * dz > r2) continue;
      if (this.fiamma[i]! > 0) {
        this.fiamma[i] = 0;
        this.ardenti.delete(i);
      }
      this.ghiaccio[i] = 1;
      this.gelati.add(i);
      const corpo = this.corpi[i]!;
      if (!corpo.isSleeping()) {
        corpo.setLinvel({ x: 0, y: 0, z: 0 }, false);
        corpo.setAngvel({ x: 0, y: 0, z: 0 }, false);
        corpo.setLinearDamping(3);
        corpo.setAngularDamping(3);
      }
      this.tingi(i);
    }
    this.mesh.instanceColor!.needsUpdate = true;
  }

  private tingi(i: number, brace = 0): void {
    const c = this.c.copy(this.mattoni[i]!.colore).lerp(CARBONE, this.carbone[i]!);
    if (brace > 0) {
      c.r += 0.9 * brace;
      c.g += 0.22 * brace;
      c.b += 0.05 * brace;
    }
    c.lerp(GHIACCIO, this.ghiaccio[i]! * 0.75);
    this.mesh.setColorAt(i, c);
  }

  aggiorna(dt: number, campo: Campo, scintille: Particelle, fumo: Particelle): void {
    // Fiamme sui pezzi che bruciano (poche per fotogramma, a caso).
    if (this.ardenti.size > 0) {
      const quante = Math.min(10, Math.ceil(this.ardenti.size * 0.3));
      const lista = [...this.ardenti];
      for (let k = 0; k < quante; k++) {
        const i = lista[Math.floor(Math.random() * lista.length)]!;
        const b = this.mattoni[i]!;
        const x = this.pos[i * 3]! + (Math.random() - 0.5) * b.sx;
        const y = this.pos[i * 3 + 1]! + b.sy * 0.4;
        const z = this.pos[i * 3 + 2]! + (Math.random() - 0.5) * b.sz;
        scintille.emetti({
          x, y, z, vx: (Math.random() - 0.5) * 0.6, vy: 1.6 + Math.random() * 1.6, vz: (Math.random() - 0.5) * 0.6,
          vita: 0.5 + Math.random() * 0.5, dim: 0.9 + Math.random() * 0.7, dimFine: 0.12,
          r: 1.15, g: 0.44, b: 0.09, r1: 0.75, g1: 0.07, b1: 0.01, alfa: 0.4,
        });
        if (Math.random() < 0.12) {
          fumo.emetti({
            x, y: y + 0.8, z, vx: 0.4, vy: 2 + Math.random(), vz: 0.3, vita: 2.5 + Math.random() * 1.5,
            dim: 1, dimFine: 4, r: 0.1, g: 0.09, b: 0.09, alfa: 0.4, attrito: 0.3,
          });
        }
      }
    }

    this.attesa += dt;
    if (this.attesa < TIC) return;
    const passato = this.attesa;
    this.attesa = 0;
    let ritinto = false;

    for (const i of this.ardenti) {
      const resta = this.fiamma[i]! - passato;
      this.carbone[i] = Math.min(1, this.carbone[i]! + passato / 7);
      const x = this.pos[i * 3]!;
      const y = this.pos[i * 3 + 1]!;
      const z = this.pos[i * 3 + 2]!;
      if (resta <= 0) {
        // Finito di bruciare: il pezzo si consuma e ciò che reggeva crolla.
        this.fiamma[i] = 0;
        this.carbone[i] = 1;
        this.ardenti.delete(i);
        this.scala[i] = 0.72;
        const b = this.mattoni[i]!;
        this.collisori[i]!.setHalfExtents({ x: b.sx * 0.36, y: b.sy * 0.36, z: b.sz * 0.36 });
        const corpo = this.corpi[i]!;
        corpo.wakeUp();
        this.disegna(i, x, y, z, corpo.rotation());
        this.fermo = false;
        this.tingi(i);
      } else {
        this.fiamma[i] = resta;
        this.tingi(i, (1 - this.carbone[i]!) * (0.5 + Math.random() * 0.5));
        if (y < 1.4) campo.accendi(x, z, 0.9, 5);
        if (Math.random() < 0.45) {
          let accesi = 0;
          for (let j = 0; j < this.n && accesi < 2; j++) {
            const dx = this.pos[j * 3]! - x;
            const dy = this.pos[j * 3 + 1]! - y;
            const dz = this.pos[j * 3 + 2]! - z;
            if (dx * dx + dy * dy * 0.6 + dz * dz < 2.2 && this.infiammabile(j) && Math.random() < 0.5) {
              this.accendi(j);
              accesi++;
            }
          }
        }
      }
      ritinto = true;
    }

    // Il fuoco del prato si attacca ai pezzi vicini a terra (se ne controlla una manciata per volta).
    if (campo.celleAccese > 0) {
      for (let k = 0; k < 160; k++) {
        const i = Math.floor(Math.random() * this.n);
        if (this.pos[i * 3 + 1]! > 1.6 || !this.infiammabile(i)) continue;
        const cella = campo.cella(this.pos[i * 3]!, this.pos[i * 3 + 2]!);
        if (cella >= 0 && campo.fuoco[cella]! > 0.3) this.accendi(i);
      }
    }

    for (const i of this.gelati) {
      const g = this.ghiaccio[i]! - passato / 9;
      if (g <= 0) {
        this.ghiaccio[i] = 0;
        this.gelati.delete(i);
        this.corpi[i]!.setLinearDamping(0);
        this.corpi[i]!.setAngularDamping(0);
      } else {
        this.ghiaccio[i] = g;
      }
      this.tingi(i);
      ritinto = true;
    }
    if (ritinto) this.mesh.instanceColor!.needsUpdate = true;
  }

  get inFiamme(): number {
    return this.ardenti.size;
  }

  /** Rimette ogni pezzo al suo posto, come nuovo. */
  ricostruisci(): void {
    this.ardenti.clear();
    this.gelati.clear();
    this.fiamma.fill(0);
    this.carbone.fill(0);
    this.ghiaccio.fill(0);
    this.mattoni.forEach((b, i) => {
      const corpo = this.corpi[i]!;
      if (this.scala[i] !== 1) {
        this.scala[i] = 1;
        this.collisori[i]!.setHalfExtents({ x: b.sx / 2, y: b.sy / 2, z: b.sz / 2 });
      }
      // Rimessi a posto da svegli: si assestano e si riaddormentano da soli in un paio di secondi.
      corpo.setTranslation({ x: b.x, y: b.y, z: b.z }, true);
      corpo.setRotation(b.q, true);
      corpo.setLinvel({ x: 0, y: 0, z: 0 }, true);
      corpo.setAngvel({ x: 0, y: 0, z: 0 }, true);
      corpo.setLinearDamping(0);
      corpo.setAngularDamping(0);
      this.disegna(i, b.x, b.y, b.z, b.q);
      this.mesh.setColorAt(i, b.colore);
    });
    this.fermo = false;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor!.needsUpdate = true;
  }

  /** Di quanto si è spostato ogni pezzo dal suo posto d'origine (serve alle prove). */
  spostamenti(): number[] {
    return this.mattoni.map((b, i) => Math.hypot(this.pos[i * 3]! - b.x, this.pos[i * 3 + 1]! - b.y, this.pos[i * 3 + 2]! - b.z));
  }
}
