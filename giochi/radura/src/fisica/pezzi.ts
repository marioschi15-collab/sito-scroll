import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { Particelle } from '../effetti/particelle.js';
import type { Campo } from '../mondo/campo.js';
import {
  ARENARIA, BLOCCO_GHIACCIO, BRACE, INTONACO, LEGNO, OSSIDIANA, PAGLIA, PIETRA, TEGOLA,
  type Mattone,
} from '../mondo/costruzioni.js';

const DENSITA: Record<number, number> = {
  [PIETRA]: 2.2, [LEGNO]: 0.7, [INTONACO]: 1.3, [TEGOLA]: 1.2,
  [ARENARIA]: 1.9, [BLOCCO_GHIACCIO]: 0.9, [OSSIDIANA]: 2.6, [PAGLIA]: 0.35, [BRACE]: 2,
};
/** A che distanza da chi gioca un luogo "prende vita" (i suoi pezzi ricevono peso e attrito). */
const DISTANZA_VIVA = 135;

/** I pezzi di un luogo: stanno tutti di seguito, da `da` (compreso) ad `a` (escluso). */
export interface Gruppo {
  readonly x: number;
  readonly z: number;
  readonly raggio: number;
  readonly da: number;
  readonly a: number;
  /** Vero da quando il luogo ha cominciato a prendere vita. */
  vivo: boolean;
  /** I pezzi da `da` a `fin` (escluso) hanno già peso e attrito: un luogo prende vita un po' per fotogramma. */
  fin: number;
  /** Quanti controlli di fila hanno trovato pezzi svegli ma fermi (vedi `fermaChiTrema`). */
  tremito: number;
}
const CARBONE = new THREE.Color(0.05, 0.04, 0.035);
const GHIACCIO = new THREE.Color(0.62, 0.86, 1.0);
const TIC = 0.2;

/**
 * Tutti i pezzi delle costruzioni: ognuno è un corpo con peso e attrito, disegnati tutti insieme in un colpo solo.
 * Appena fermi "si addormentano" (non costano più calcoli) e si risvegliano quando qualcosa li tocca.
 * I luoghi lontani restano solo disegnati: prendono vita quando chi gioca si avvicina.
 * Il mondo è senza confini, quindi i luoghi si aggiungono e si tolgono mentre si cammina: i posti lasciati liberi
 * da un luogo ormai lontano vengono riusati per quelli nuovi.
 */
export class Pezzi {
  readonly mesh: THREE.InstancedMesh;
  /** Fin dove arrivano i posti usati finora (alcuni, in mezzo, possono essere vuoti). */
  n = 0;
  private readonly mattoni: (Mattone | undefined)[] = [];
  private readonly gruppi: Gruppo[] = [];
  private readonly liberi: { da: number; a: number }[] = [];
  /** Posizioni aggiornate a ogni fotogramma (x, y, z di seguito), per i calcoli degli incantesimi. */
  readonly pos: Float32Array;
  readonly massa: Float32Array;
  private readonly corpi: (RAPIER.RigidBody | undefined)[] = [];
  private readonly collisori: (RAPIER.Collider | undefined)[] = [];
  private readonly vivi: Gruppo[] = [];
  /** Ogni rammendo è un gruppo di pezzi che tornano a posto insieme e arrivano nello stesso istante. */
  private readonly rammendi: { t: number; pezzi: { i: number; ritardo: number; da: THREE.Vector3; qDa: THREE.Quaternion }[] }[] = [];
  private readonly perManiglia = new Map<number, number>();
  private readonly fiamma: Float32Array;
  private readonly carbone: Float32Array;
  private readonly ghiaccio: Float32Array;
  private readonly scala: Float32Array;
  /** Dove stava ogni pezzo all'ultimo controllo dei tremiti. */
  private readonly rif: Float32Array;
  /** Per ogni pezzo, dove comincia e dove finisce il suo luogo: il fuoco si propaga solo lì dentro. */
  private readonly inizio: Int32Array;
  private readonly fine: Int32Array;
  /** Quanto ogni pezzo è incandescente (0 spento): lo legge la scheda grafica per farlo brillare. */
  private ardore!: THREE.InstancedBufferAttribute;
  private elencoArdenti: number[] = [];
  private fiammeDaFare = 0;
  private attesaTremito = 0;
  private readonly ardenti = new Set<number>();
  private readonly gelati = new Set<number>();
  private attesa = 0;
  private fermo = true;
  svegli = 0;
  /** Di quanti metri, sommati, sono scesi i pezzi nell'ultimo fotogramma: è ciò che fa rombare i crolli. */
  caduta = 0;

  private readonly m = new THREE.Matrix4();
  private readonly p = new THREE.Vector3();
  private readonly q = new THREE.Quaternion();
  private readonly s = new THREE.Vector3();
  private readonly c = new THREE.Color();

  constructor(
    private readonly R: typeof RAPIER,
    private readonly fisica: RAPIER.World,
    ombre: boolean,
    private readonly capienza = 20000,
  ) {
    this.pos = new Float32Array(capienza * 3);
    this.massa = new Float32Array(capienza);
    this.fiamma = new Float32Array(capienza);
    this.carbone = new Float32Array(capienza);
    this.ghiaccio = new Float32Array(capienza);
    this.scala = new Float32Array(capienza).fill(1);
    this.rif = new Float32Array(capienza * 3);
    this.inizio = new Int32Array(capienza);
    this.fine = new Int32Array(capienza);
    const materiale = new THREE.MeshLambertMaterial({ color: 0xffffff });
    // Ogni blocco è un po' più scuro in basso e lungo gli spigoli: dà volume e stacca un blocco dall'altro.
    materiale.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aArdore; varying vec3 vLocale; varying float vArdore;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocale = position; vArdore = aArdore;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vLocale; varying float vArdore;')
        // I pezzi di brace e quelli in fiamme emettono luce propria, abbastanza forte da far scattare il bagliore.
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(4.0, 1.1, 0.14) * vArdore;')
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
           vec3 bordo = smoothstep(0.38, 0.5, abs(vLocale));
           float spigolo = max(bordo.x * bordo.y, max(bordo.y * bordo.z, bordo.x * bordo.z));
           diffuseColor.rgb *= mix(0.78, 1.05, smoothstep(-0.5, 0.3, vLocale.y)) * (1.0 - 0.3 * spigolo);`,
        );
    };
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), materiale, capienza);
    this.mesh.count = 0;
    this.mesh.castShadow = ombre;
    this.mesh.receiveShadow = ombre;
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.setColorAt(0, new THREE.Color(1, 1, 1));
    this.ardore = new THREE.InstancedBufferAttribute(new Float32Array(capienza), 1).setUsage(THREE.DynamicDrawUsage);
    this.mesh.geometry.setAttribute('aArdore', this.ardore);
  }

  /** Aggiunge i pezzi di un luogo (per ora solo disegnati). Restituisce null se non c'è più posto. */
  aggiungi(mattoni: Mattone[], x: number, z: number, raggio: number): Gruppo | null {
    const quanti = mattoni.length;
    let da = -1;
    const buco = this.liberi.findIndex((l) => l.a - l.da >= quanti);
    if (buco >= 0) {
      const l = this.liberi[buco]!;
      da = l.da;
      l.da += quanti;
      if (l.da >= l.a) this.liberi.splice(buco, 1);
    } else if (this.n + quanti <= this.capienza) {
      da = this.n;
      this.n += quanti;
      this.mesh.count = this.n;
    } else {
      return null;
    }
    mattoni.forEach((b, k) => {
      const i = da + k;
      this.mattoni[i] = b;
      this.fiamma[i] = this.carbone[i] = this.ghiaccio[i] = 0;
      this.scala[i] = 1;
      this.disegna(i, b.x, b.y, b.z, b.q);
      this.mesh.setColorAt(i, b.colore);
      this.ardore.setX(i, b.materiale === BRACE ? 0.7 : 0);
    });
    this.ardore.needsUpdate = true;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor!.needsUpdate = true;
    this.inizio.fill(da, da, da + quanti);
    this.fine.fill(da + quanti, da, da + quanti);
    this.mesh.instanceMatrix.clearUpdateRanges();
    const g: Gruppo = { x, z, raggio, da, a: da + quanti, vivo: false, fin: da, tremito: 0 };
    this.gruppi.push(g);
    return g;
  }

  /** Toglie dal mondo i pezzi di un luogo rimasto lontano e libera i loro posti. */
  togli(g: Gruppo): void {
    this.m.makeScale(0, 0, 0);
    for (let i = g.da; i < g.a; i++) {
      const corpo = this.corpi[i];
      if (corpo) {
        this.perManiglia.delete(this.collisori[i]!.handle);
        this.fisica.removeRigidBody(corpo);
        this.corpi[i] = undefined;
        this.collisori[i] = undefined;
      }
      this.mattoni[i] = undefined;
      this.ardenti.delete(i);
      this.gelati.delete(i);
      this.pos[i * 3 + 1] = -1e6;
      this.ardore.setX(i, 0);
      this.mesh.setMatrixAt(i, this.m);
    }
    for (const r of this.rammendi) r.pezzi = r.pezzi.filter((p) => p.i < g.da || p.i >= g.a);
    this.mesh.instanceMatrix.clearUpdateRanges();
    this.mesh.instanceMatrix.needsUpdate = true;
    // I posti liberati si ricuciono con quelli liberi accanto; se in fondo all'elenco non c'è più niente, lo si accorcia.
    this.liberi.push({ da: g.da, a: g.a });
    this.liberi.sort((p, q) => p.da - q.da);
    for (let k = this.liberi.length - 1; k > 0; k--) {
      if (this.liberi[k - 1]!.a !== this.liberi[k]!.da) continue;
      this.liberi[k - 1]!.a = this.liberi[k]!.a;
      this.liberi.splice(k, 1);
    }
    const ultimo = this.liberi[this.liberi.length - 1];
    if (ultimo && ultimo.a === this.n) {
      this.n = ultimo.da;
      this.mesh.count = this.n;
      this.liberi.pop();
    }
    this.gruppi.splice(this.gruppi.indexOf(g), 1);
    const k = this.vivi.indexOf(g);
    if (k >= 0) this.vivi.splice(k, 1);
  }

  /**
   * Dà vita ai luoghi vicini a un punto (di solito: dove sta chi gioca), pochi pezzi per volta:
   * creare duemila corpi in un fotogramma solo farebbe scattare il gioco. I pezzi sono elencati dal basso
   * verso l'alto, quindi ognuno trova già vivo ciò su cui poggia.
   */
  avvicina(x: number, z: number, quanti = 260): void {
    for (const g of this.gruppi) {
      if (g.fin >= g.a || Math.hypot(g.x - x, g.z - z) - g.raggio > DISTANZA_VIVA) continue;
      quanti -= this.daiVita(g, quanti);
      if (quanti <= 0) return;
    }
  }

  /** Dà vita a tutti i luoghi presenti in una volta (serve alle prove). */
  daiVitaATutto(): void {
    for (const g of this.gruppi) this.daiVita(g, Infinity);
  }

  private daiVita(g: Gruppo, quanti: number): number {
    const R = this.R;
    const fino = Math.min(g.a, g.fin + quanti);
    const fatti = fino - g.fin;
    for (let i = g.fin; i < fino; i++) {
      const b = this.mattoni[i]!;
      const corpo = this.fisica.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(b.x, b.y, b.z).setRotation(b.q));
      const collisore = this.fisica.createCollider(
        R.ColliderDesc.cuboid(b.sx / 2, b.sy / 2, b.sz / 2)
          .setDensity(DENSITA[b.materiale] ?? 1)
          .setFriction(b.materiale === TEGOLA ? 1.1 : b.materiale === BLOCCO_GHIACCIO ? 0.55 : 0.8)
          .setRestitution(0.04),
        corpo,
      );
      this.corpi[i] = corpo;
      this.collisori[i] = collisore;
      this.perManiglia.set(collisore.handle, i);
      this.massa[i] = corpo.mass();
    }
    g.fin = fino;
    if (!g.vivo && fatti > 0) {
      g.vivo = true;
      this.vivi.push(g);
    }
    return fatti;
  }

  /**
   * Addormenta i pezzi svegli che non vanno da nessuna parte. Certe pile continuano a tremare di un millimetro
   * senza mai fermarsi, e un pezzo sveglio costa calcoli a ogni fotogramma: se per due secondi nessun pezzo
   * sveglio di un luogo si è mosso di più di mezzo centimetro, li si mette a dormire.
   */
  private fermaChiTrema(): void {
    for (const g of this.vivi) {
      let svegli = 0;
      let mosso = false;
      for (let i = g.da; i < g.fin; i++) {
        if (this.corpi[i]!.isSleeping()) continue;
        svegli++;
        const k = i * 3;
        const d = Math.abs(this.pos[k]! - this.rif[k]!) + Math.abs(this.pos[k + 1]! - this.rif[k + 1]!) + Math.abs(this.pos[k + 2]! - this.rif[k + 2]!);
        if (d > 0.005) mosso = true;
        this.rif[k] = this.pos[k]!;
        this.rif[k + 1] = this.pos[k + 1]!;
        this.rif[k + 2] = this.pos[k + 2]!;
      }
      g.tremito = svegli > 0 && !mosso && g.fin >= g.a ? g.tremito + 1 : 0;
      if (g.tremito < 4) continue;
      g.tremito = 0;
      for (let i = g.da; i < g.fin; i++) if (!this.corpi[i]!.isSleeping()) this.corpi[i]!.sleep();
    }
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
    let caduta = 0;
    // Mentre un rammendo riporta i pezzi a posto (scendono lungo un arco) non si conta: non è un crollo.
    const conta = this.rammendi.length === 0;
    for (const g of this.vivi) for (let i = g.da; i < g.fin; i++) {
      const corpo = this.corpi[i]!;
      if (corpo.isSleeping()) continue;
      svegli++;
      const t = corpo.translation();
      if (t.y < -30) {
        corpo.setTranslation({ x: t.x, y: -30, z: t.z }, false);
        corpo.sleep();
        continue;
      }
      const y0 = this.pos[i * 3 + 1]!;
      if (conta && t.y < y0) caduta += y0 - t.y;
      this.disegna(i, t.x, t.y, t.z, corpo.rotation());
    }
    this.caduta = caduta;
    if (svegli > 0 || !this.fermo) {
      // Si manda alla scheda grafica solo la parte usata dell'elenco, non tutti i ventimila posti.
      this.mesh.instanceMatrix.clearUpdateRanges();
      this.mesh.instanceMatrix.addUpdateRange(0, this.n * 16);
      this.mesh.instanceMatrix.needsUpdate = true;
    }
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
      const corpo = this.corpi[i];
      if (!corpo) continue;
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
    this.corpi[i]?.applyImpulse({ x: ax * m, y: ay * m, z: az * m }, true);
  }

  velocita(i: number): { x: number; y: number; z: number } {
    return this.corpi[i]?.linvel() ?? { x: 0, y: 0, z: 0 };
  }

  /** Lancia un pezzo: gli dà di colpo questa velocità. */
  scaglia(i: number, vx: number, vy: number, vz: number): void {
    this.corpi[i]?.setLinvel({ x: vx, y: vy, z: vz }, true);
  }

  /** I pezzi più vicini a un punto, dal più vicino al più lontano (solo quelli che hanno preso vita). */
  vicini(x: number, y: number, z: number, raggio: number, quanti: number): number[] {
    const trovati: { i: number; d: number }[] = [];
    const r2 = raggio * raggio;
    for (const g of this.vivi) for (let i = g.da; i < g.fin; i++) {
      const dx = this.pos[i * 3]! - x;
      const dy = this.pos[i * 3 + 1]! - y;
      const dz = this.pos[i * 3 + 2]! - z;
      const d = dx * dx + dy * dy + dz * dz;
      if (d < r2) trovati.push({ i, d });
    }
    return trovati.sort((a, b) => a.d - b.d).slice(0, quanti).map((t) => t.i);
  }

  frena(i: number, quanto: number): void {
    const corpo = this.corpi[i];
    if (!corpo) return;
    const v = corpo.linvel();
    corpo.setLinvel({ x: v.x * quanto, y: v.y * quanto, z: v.z * quanto }, true);
  }

  private infiammabile(i: number): boolean {
    const b = this.mattoni[i];
    if (!b || !this.corpi[i]) return false;
    const m = b.materiale;
    return (m === LEGNO || m === INTONACO || m === PAGLIA) && this.carbone[i]! < 0.05 && this.fiamma[i] === 0 && this.ghiaccio[i]! < 0.3;
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
      const corpo = this.corpi[i];
      if (!corpo) continue;
      this.ghiaccio[i] = 1;
      this.gelati.add(i);
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
    const b = this.mattoni[i]!;
    const c = this.c.copy(b.colore).lerp(CARBONE, this.carbone[i]!);
    c.lerp(GHIACCIO, this.ghiaccio[i]! * 0.75);
    this.mesh.setColorAt(i, c);
    this.ardore.setX(i, b.materiale === BRACE ? 0.7 : brace * 0.6);
    this.ardore.needsUpdate = true;
  }

  aggiorna(dt: number, campo: Campo, scintille: Particelle, fumo: Particelle): void {
    if (this.rammendi.length > 0) this.avanzaRammendi(dt);
    // Fiamme sui pezzi che bruciano (poche per fotogramma, a caso).
    if (this.ardenti.size > 0) {
      // Tante fiamme al secondo, non per fotogramma: così il fuoco è uguale a 30 e a 120 fotogrammi al secondo.
      this.fiammeDaFare += Math.min(10, this.ardenti.size * 0.3) * dt * 60;
      const lista = this.elencoArdenti;
      for (; this.fiammeDaFare >= 1 && lista.length > 0; this.fiammeDaFare--) {
        const i = lista[Math.floor(Math.random() * lista.length)]!;
        if (!(this.fiamma[i]! > 0) || !this.mattoni[i]) continue;
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

    this.attesaTremito += dt;
    if (this.attesaTremito > 0.5) {
      this.attesaTremito = 0;
      this.fermaChiTrema();
    }
    this.attesa += dt;
    if (this.attesa < TIC) return;
    const passato = this.attesa;
    this.attesa = 0;
    this.elencoArdenti = Array.from(this.ardenti);
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
        if (y - this.mattoni[i]!.quota < 1.4) campo.accendi(x, z, 0.9, 5);
        if (Math.random() < 0.45) {
          let accesi = 0;
          // Il fuoco passa solo ai pezzi a un metro e mezzo: stanno per forza nello stesso luogo.
          for (let j = this.inizio[i]!; j < this.fine[i]! && accesi < 2; j++) {
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
        const b = this.mattoni[i];
        if (!b || this.pos[i * 3 + 1]! - b.quota > 1.6 || !this.infiammabile(i)) continue;
        const cella = campo.cella(this.pos[i * 3]!, this.pos[i * 3 + 2]!);
        if (cella >= 0 && campo.fuoco[cella]! > 0.3) this.accendi(i);
      }
    }

    for (const i of this.gelati) {
      const g = this.ghiaccio[i]! - passato / 9;
      if (g <= 0) {
        this.ghiaccio[i] = 0;
        this.gelati.delete(i);
        this.corpi[i]?.setLinearDamping(0);
        this.corpi[i]?.setAngularDamping(0);
      } else {
        this.ghiaccio[i] = g;
      }
      this.tingi(i);
      ritinto = true;
    }
    if (ritinto) this.mesh.instanceColor!.needsUpdate = true;
  }

  /**
   * Riavvolge il tempo attorno a un punto: i pezzi che in origine stavano lì tornano al loro posto, come nuovi.
   * Durante il volo non urtano niente (cambiando il loro "gruppo d'urto": spegnere e riaccendere il collisore
   * ne altererebbe il peso, e le case rammendate crollavano di nuovo); arrivati, tornano a urtare come prima.
   */
  rammenda(x: number, z: number, raggio: number): number {
    const r2 = raggio * raggio;
    const inVolo = new Set(this.rammendi.flatMap((r) => r.pezzi.map((p) => p.i)));
    const pezzi: { i: number; ritardo: number; da: THREE.Vector3; qDa: THREE.Quaternion }[] = [];
    for (const g of this.vivi) for (let i = g.da; i < g.fin; i++) {
      const b = this.mattoni[i]!;
      // Si guarda solo la pianta, non l'altezza: così tornano su colonne intere, ognuna con il suo appoggio sotto.
      const dx = b.x - x;
      const dz = b.z - z;
      if (dx * dx + dz * dz > r2 || inVolo.has(i)) continue;
      const corpo = this.corpi[i]!;
      const t = corpo.translation();
      const q = corpo.rotation();
      const lontano = Math.hypot(t.x - b.x, t.y - b.y, t.z - b.z) > 0.03;
      if (!lontano && this.carbone[i] === 0 && this.scala[i] === 1 && this.fiamma[i] === 0) continue;
      this.collisori[i]!.setCollisionGroups(0);
      this.fiamma[i] = 0;
      this.ardenti.delete(i);
      pezzi.push({ i, ritardo: Math.random() * 0.3, da: new THREE.Vector3(t.x, t.y, t.z), qDa: new THREE.Quaternion(q.x, q.y, q.z, q.w) });
    }
    if (pezzi.length > 0) this.rammendi.push({ t: 0, pezzi });
    return pezzi.length;
  }

  private avanzaRammendi(dt: number): void {
    const v = this.p;
    for (let k = this.rammendi.length - 1; k >= 0; k--) {
      const r = this.rammendi[k]!;
      r.t += dt / 1.3;
      const finito = r.t >= 1;
      for (const pezzo of r.pezzi) {
        const i = pezzo.i;
        const b = this.mattoni[i]!;
        const corpo = this.corpi[i]!;
        // Partono un po' alla spicciolata, ma arrivano tutti insieme: così nessuno trova il vuoto sotto di sé.
        const t = Math.min(1, Math.max(0, (r.t - pezzo.ritardo) / (1 - pezzo.ritardo)));
        const dolce = t * t * (3 - 2 * t);
        v.lerpVectors(pezzo.da, v.set(b.x, b.y, b.z), dolce);
        v.y += Math.sin(dolce * Math.PI) * 1.5;
        this.q.slerpQuaternions(pezzo.qDa, b.q, dolce);
        corpo.setTranslation(finito ? { x: b.x, y: b.y, z: b.z } : v, true);
        corpo.setRotation(finito ? b.q : this.q, true);
        corpo.setLinvel({ x: 0, y: 0, z: 0 }, true);
        corpo.setAngvel({ x: 0, y: 0, z: 0 }, true);
        this.carbone[i] = finito ? 0 : this.carbone[i]! * (1 - dolce);
        if (!finito) continue;
        this.ghiaccio[i] = 0;
        this.gelati.delete(i);
        if (this.scala[i] !== 1) {
          this.scala[i] = 1;
          this.collisori[i]!.setHalfExtents({ x: b.sx / 2, y: b.sy / 2, z: b.sz / 2 });
        }
        corpo.setLinearDamping(0);
        corpo.setAngularDamping(0);
        this.collisori[i]!.setCollisionGroups(0xffffffff);
        this.mesh.setColorAt(i, b.colore);
        this.ardore.setX(i, b.materiale === BRACE ? 0.7 : 0);
      }
      if (!finito) continue;
      this.ardore.needsUpdate = true;
      this.mesh.instanceColor!.needsUpdate = true;
      this.rammendi.splice(k, 1);
    }
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
    this.rammendi.length = 0;
    this.mattoni.forEach((b, i) => {
      const corpo = this.corpi[i];
      if (!b || !corpo) return;
      // Un pezzo già al suo posto, fermo e intatto non si tocca: svegliarli tutti farebbe scattare il gioco per niente.
      const t = corpo.translation();
      const intatto = this.carbone[i] === 0 && this.scala[i] === 1 && this.ghiaccio[i] === 0 && this.fiamma[i] === 0;
      if (intatto && corpo.isSleeping() && Math.hypot(t.x - b.x, t.y - b.y, t.z - b.z) < 0.03) return;
      this.collisori[i]!.setCollisionGroups(0xffffffff);
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
      this.ardore.setX(i, b.materiale === BRACE ? 0.7 : 0);
    });
    this.ardore.needsUpdate = true;
    this.fermo = false;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor!.needsUpdate = true;
  }

  /** Quanti pezzi di un luogo non sono più al loro posto (spostati di oltre mezzo metro, o consumati dal fuoco). */
  fuoriPosto(g: Gruppo): number {
    let n = 0;
    for (let i = g.da; i < g.a; i++) {
      const b = this.mattoni[i];
      if (!b) continue;
      const dx = this.pos[i * 3]! - b.x;
      const dy = this.pos[i * 3 + 1]! - b.y;
      const dz = this.pos[i * 3 + 2]! - b.z;
      if (dx * dx + dy * dy + dz * dz > 0.25 || this.scala[i] !== 1) n++;
    }
    return n;
  }

  /** Vero se il pezzo si sta ancora muovendo (serve alle prove). */
  sveglio(i: number): boolean {
    const corpo = this.corpi[i];
    return !!corpo && !corpo.isSleeping();
  }

  /**
   * Di quanto si è spostato ogni pezzo dal suo posto d'origine (serve alle prove).
   * Si chiede la posizione vera al motore fisico: quella tenuta per il disegno non si aggiorna per i pezzi addormentati.
   */
  spostamenti(): number[] {
    return this.mattoni.map((b, i) => {
      const t = this.corpi[i]?.translation();
      return t && b ? Math.hypot(t.x - b.x, t.y - b.y, t.z - b.z) : 0;
    });
  }
}
