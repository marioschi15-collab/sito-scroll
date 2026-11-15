import * as THREE from 'three';

const N = 256;
const LATO = 512;
const PASSO = LATO / N;
const TIC = 0.12;
const resto = (a: number): number => ((a % N) + N) % N;

/**
 * Lo stato del prato, a quadretti di due metri: quanto è bruciato, gelato, rigoglioso, e dove c'è fuoco.
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
    // Il mondo è infinito e l'immagine no: "gira su se stessa" e copre sempre il pezzo attorno a chi gioca.
    this.immagine.wrapS = this.immagine.wrapT = THREE.RepeatWrapping;
    this.immagine.needsUpdate = true;
  }

  get celleAccese(): number {
    return this.accese.size;
  }

  /** La colonna e la riga (del mondo) attorno a cui è centrata la finestra che il prato ricorda. */
  private cx0 = 0;
  private cz0 = 0;

  /** Numero del quadretto sotto un punto, oppure -1 se è più lontano di quanto il prato ricordi. */
  cella(x: number, z: number): number {
    const cx = Math.floor(x / PASSO);
    const cz = Math.floor(z / PASSO);
    if (Math.abs(cx - this.cx0) >= N / 2 - 1 || Math.abs(cz - this.cz0) >= N / 2 - 1) return -1;
    return resto(cz) * N + resto(cx);
  }

  centro(cella: number, esito: THREE.Vector3): THREE.Vector3 {
    const mx = cella % N;
    const mz = (cella - mx) / N;
    // Tra tutte le colonne del mondo che cadono su questo quadretto, quella dentro la finestra attuale.
    const cx = this.cx0 + resto(mx - this.cx0 + N / 2) - N / 2;
    const cz = this.cz0 + resto(mz - this.cz0 + N / 2) - N / 2;
    return esito.set((cx + 0.5) * PASSO, 0, (cz + 0.5) * PASSO);
  }

  /**
   * Sposta la finestra attorno a chi gioca. Le strisce di prato che entrano dalla parte opposta
   * tornano vergini: ciò che era successo laggiù, troppo lontano, viene dimenticato.
   */
  segui(x: number, z: number): void {
    const cx = Math.floor(x / PASSO);
    const cz = Math.floor(z / PASSO);
    const pulisci = (da: number, a: number, colonne: boolean): void => {
      for (let c = da; c <= a; c++) {
        const m = resto(c);
        for (let k = 0; k < N; k++) {
          const i = colonne ? k * N + m : m * N + k;
          this.bruciato[i] = this.gelo[i] = this.crescita[i] = this.fuoco[i] = 0;
          this.accese.delete(i);
        }
      }
      this.sporco = true;
    };
    const passiX = Math.min(N, Math.abs(cx - this.cx0));
    const passiZ = Math.min(N, Math.abs(cz - this.cz0));
    if (passiX > 0) {
      if (cx > this.cx0) pulisci(cx + N / 2 - passiX, cx + N / 2 - 1, true);
      else pulisci(cx - N / 2, cx - N / 2 + passiX - 1, true);
    }
    if (passiZ > 0) {
      if (cz > this.cz0) pulisci(cz + N / 2 - passiZ, cz + N / 2 - 1, false);
      else pulisci(cz - N / 2, cz - N / 2 + passiZ - 1, false);
    }
    this.cx0 = cx;
    this.cz0 = cz;
  }

  private cerchio(x: number, z: number, raggio: number, fai: (cella: number, vicinanza: number) => void): void {
    const r = Math.ceil(raggio / PASSO);
    const cx = Math.floor(x / PASSO);
    const cz = Math.floor(z / PASSO);
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const d = Math.hypot(dx, dz) * PASSO;
        if (d > raggio) continue;
        const ix = cx + dx;
        const iz = cz + dz;
        if (Math.abs(ix - this.cx0) >= N / 2 - 1 || Math.abs(iz - this.cz0) >= N / 2 - 1) continue;
        fai(resto(iz) * N + resto(ix), 1 - d / raggio);
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

  /** Toglie bruciature, gelo e fiamme senza far crescere nulla: il prato torna com'era. */
  risana(x: number, z: number, raggio: number): void {
    this.cerchio(x, z, raggio, (i) => {
      this.spegniCella(i);
      this.bruciato[i] = 0;
      this.gelo[i] = 0;
    });
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
    // Il tempo di scioglimento si conta solo mentre c'è qualcosa di gelato: altrimenti il primo gelo dopo
    // una lunga pausa si scioglierebbe tutto in un colpo, prima ancora di essere visto.
    if (this.gelate > 0) this.attesaGelo += dt;
    else this.attesaGelo = 0;
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
        const mx = i % N;
        const mz = (i - mx) / N;
        const passo = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(Math.random() * 4)]!;
        const vicino = resto(mz + passo[1]!) * N + resto(mx + passo[0]!);
        if (this.fuoco[vicino] === 0) {
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
