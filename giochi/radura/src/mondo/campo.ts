import * as THREE from 'three';

const N = 128;
const LATO = 192;
const PASSO = LATO / N;
const TIC = 0.12;

/**
 * Lo stato del prato, a quadretti di un metro e mezzo: quanto è bruciato, gelato, rigoglioso, e dove c'è fuoco.
 * L'erba e il terreno lo leggono da un'immagine, così cambiano aspetto senza ricostruire nulla.
 */
export class Campo {
  readonly lato = LATO;
  readonly bruciato = new Float32Array(N * N);
  readonly gelo = new Float32Array(N * N);
  readonly crescita = new Float32Array(N * N);
  readonly fuoco = new Float32Array(N * N);
  private readonly energia = new Uint8Array(N * N);
  private readonly accese = new Set<number>();
  /** Fotografia dei quadretti accesi, rifatta a ogni passo del fuoco: serve a pescarne uno a caso in fretta. */
  private elenco: number[] = [];
  private readonly punti = new Uint8Array(N * N * 4);
  readonly immagine: THREE.DataTexture;
  private sporco = false;
  private attesa = 0;
  private attesaGelo = 0;
  private gelate = 0;

  constructor() {
    this.immagine = new THREE.DataTexture(this.punti, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.immagine.magFilter = THREE.LinearFilter;
    this.immagine.minFilter = THREE.LinearFilter;
    this.immagine.needsUpdate = true;
  }

  get celleAccese(): number {
    return this.accese.size;
  }

  /** Numero del quadretto sotto un punto, oppure -1 se è fuori dal prato (o sul bordo, che resta intatto). */
  cella(x: number, z: number): number {
    const cx = Math.floor((x + LATO / 2) / PASSO);
    const cz = Math.floor((z + LATO / 2) / PASSO);
    if (cx < 1 || cz < 1 || cx > N - 2 || cz > N - 2) return -1;
    return cz * N + cx;
  }

  centro(cella: number, esito: THREE.Vector3): THREE.Vector3 {
    const cx = cella % N;
    const cz = (cella - cx) / N;
    return esito.set((cx + 0.5) * PASSO - LATO / 2, 0, (cz + 0.5) * PASSO - LATO / 2);
  }

  private cerchio(x: number, z: number, raggio: number, fai: (cella: number, vicinanza: number) => void): void {
    const r = Math.ceil(raggio / PASSO);
    const cx = Math.floor((x + LATO / 2) / PASSO);
    const cz = Math.floor((z + LATO / 2) / PASSO);
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const d = Math.hypot(dx, dz) * PASSO;
        if (d > raggio) continue;
        const ix = cx + dx;
        const iz = cz + dz;
        if (ix < 1 || iz < 1 || ix > N - 2 || iz > N - 2) continue;
        fai(iz * N + ix, 1 - d / raggio);
      }
    }
    this.sporco = true;
  }

  private accendiCella(i: number, energia: number): void {
    if (this.fuoco[i]! > 0 || this.bruciato[i]! > 0.55 || this.gelo[i]! > 0.3) return;
    this.fuoco[i] = 0.3;
    this.energia[i] = energia;
    this.accese.add(i);
  }

  accendi(x: number, z: number, raggio: number, energia = 14): void {
    this.cerchio(x, z, raggio, (i) => {
      if (Math.random() < 0.8) this.accendiCella(i, energia + Math.floor(Math.random() * 6));
    });
  }

  private spegniCella(i: number): void {
    if (this.fuoco[i]! > 0) {
      this.fuoco[i] = 0;
      this.accese.delete(i);
    }
  }

  gela(x: number, z: number, raggio: number): void {
    this.cerchio(x, z, raggio, (i, v) => {
      this.spegniCella(i);
      this.gelo[i] = Math.max(this.gelo[i]!, Math.min(1, v * 2.5));
    });
    this.gelate = 1;
  }

  spegni(x: number, z: number, raggio: number): void {
    this.cerchio(x, z, raggio, (i) => this.spegniCella(i));
  }

  fiorisci(x: number, z: number, raggio: number, forza: number): void {
    this.cerchio(x, z, raggio, (i, v) => {
      const q = Math.min(1, v * 2) * forza;
      this.spegniCella(i);
      this.bruciato[i] = Math.max(0, this.bruciato[i]! - q);
      this.gelo[i] = Math.max(0, this.gelo[i]! - q);
      this.crescita[i] = Math.min(1, this.crescita[i]! + q);
    });
  }

  /** Riporta tutto il prato com'era all'inizio. */
  azzera(): void {
    this.bruciato.fill(0);
    this.gelo.fill(0);
    this.crescita.fill(0);
    this.fuoco.fill(0);
    this.accese.clear();
    this.elenco = [];
    this.sporco = true;
  }

  /** Un quadretto acceso a caso (per farci nascere le fiamme), oppure -1 se non brucia niente. */
  accesaACaso(): number {
    const n = this.elenco.length;
    if (n === 0) return -1;
    const i = this.elenco[Math.floor(Math.random() * n)]!;
    return this.fuoco[i]! > 0 ? i : -1;
  }

  aggiorna(dt: number): void {
    this.attesa += dt;
    if (this.attesa >= TIC) {
      this.attesa = 0;
      if (this.accese.size > 0) this.avanzaFuoco();
      this.elenco = Array.from(this.accese);
    }
    this.attesaGelo += dt;
    if (this.attesaGelo > 0.5 && this.gelate > 0) {
      // Il gelo si scioglie piano piano.
      this.gelate = 0;
      for (let i = 0; i < N * N; i++) {
        const g = this.gelo[i]!;
        if (g > 0) {
          this.gelo[i] = Math.max(0, g - this.attesaGelo * 0.035);
          this.gelate++;
        }
      }
      this.attesaGelo = 0;
      this.sporco = true;
    }
    if (this.sporco) this.scriviImmagine();
  }

  private avanzaFuoco(): void {
    const nuove: number[] = [];
    for (const i of this.accese) {
      const b = this.bruciato[i]! + 0.026 + Math.random() * 0.012;
      this.bruciato[i] = Math.min(1, b);
      this.crescita[i] = Math.max(0, this.crescita[i]! - 0.05);
      this.fuoco[i] = Math.sin(Math.min(1, b) * Math.PI) * 0.8 + 0.2;
      if (b >= 1) {
        this.fuoco[i] = 0;
        this.accese.delete(i);
        continue;
      }
      const e = this.energia[i]!;
      if (e > 0 && b > 0.15 && Math.random() < 0.3) {
        const vicino = i + [1, -1, N, -N][Math.floor(Math.random() * 4)]!;
        const cx = vicino % N;
        const cz = (vicino - cx) / N;
        if (cx >= 1 && cz >= 1 && cx <= N - 2 && cz <= N - 2 && this.fuoco[vicino] === 0) {
          this.energia[vicino] = Math.max(0, e - 1 - Math.floor(Math.random() * 2));
          nuove.push(vicino);
        }
      }
    }
    for (const i of nuove) this.accendiCella(i, this.energia[i]!);
    this.sporco = true;
  }

  private scriviImmagine(): void {
    const p = this.punti;
    for (let i = 0, j = 0; i < N * N; i++, j += 4) {
      p[j] = this.bruciato[i]! * 255;
      p[j + 1] = this.gelo[i]! * 255;
      p[j + 2] = this.crescita[i]! * 255;
      p[j + 3] = this.fuoco[i]! * 255;
    }
    this.immagine.needsUpdate = true;
    this.sporco = false;
  }
}
