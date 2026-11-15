import * as THREE from 'three';
import { atmosfera } from '../mondo/atmosfera.js';

export interface Scintilla {
  x: number; y: number; z: number;
  vx?: number; vy?: number; vz?: number;
  vita: number;
  /** Grandezza in metri alla nascita e alla fine. */
  dim: number; dimFine?: number;
  /** Colore alla nascita e alla fine (valori sopra 1 = più luminoso). */
  r: number; g: number; b: number;
  r1?: number; g1?: number; b1?: number;
  alfa?: number;
  gravita?: number;
  attrito?: number;
}

function materialePunti(luminoso: boolean, scala: { value: number }): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: luminoso ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { uScala: scala, uLuce: atmosfera.luce, uLuminoso: { value: luminoso ? 1 : 0 } },
    vertexShader: /* glsl */ `
      attribute vec4 colore; attribute float dim;
      uniform float uScala;
      varying vec4 vColore;
      void main() {
        vColore = colore;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = min(dim * uScala / max(-mv.z, 0.1), 600.0);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uLuce; uniform float uLuminoso;
      varying vec4 vColore;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = smoothstep(1.0, 0.0, d);
        a = mix(a, a * a, uLuminoso);
        if (a * vColore.a < 0.004) discard;
        vec3 c = vColore.rgb * mix(mix(0.35, 1.0, uLuce), 1.0, uLuminoso);
        gl_FragColor = vec4(c, a * vColore.a);
        #include <colorspace_fragment>
      }
    `,
  });
}

/** Quanto è grande in pixel un metro a un metro di distanza: serve a dare ai puntini la misura giusta. */
export const scalaPunti = { value: 800 };

/**
 * Un serbatoio di puntini luminosi (fiamme, scintille, magia) oppure opachi (fumo, polvere).
 * Quando è pieno, i più vecchi lasciano il posto ai nuovi.
 */
export class Particelle {
  readonly punti: THREE.Points;
  private readonly n: number;
  private prossima = 0;
  private readonly pos: Float32Array;
  private readonly col: Float32Array;
  private readonly dim: Float32Array;
  private readonly vel: Float32Array;
  private readonly vita: Float32Array;
  private readonly durata: Float32Array;
  private readonly extra: Float32Array; // dim0, dim1, gravità, attrito
  private readonly colori: Float32Array; // r,g,b, r1,g1,b1, alfa

  constructor(capienza: number, luminoso: boolean) {
    this.n = capienza;
    this.pos = new Float32Array(capienza * 3);
    this.col = new Float32Array(capienza * 4);
    this.dim = new Float32Array(capienza);
    this.vel = new Float32Array(capienza * 3);
    this.vita = new Float32Array(capienza);
    this.durata = new Float32Array(capienza);
    this.extra = new Float32Array(capienza * 4);
    this.colori = new Float32Array(capienza * 7);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('colore', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('dim', new THREE.BufferAttribute(this.dim, 1).setUsage(THREE.DynamicDrawUsage));
    this.punti = new THREE.Points(g, materialePunti(luminoso, scalaPunti));
    this.punti.frustumCulled = false;
    this.punti.renderOrder = luminoso ? 6 : 5;
  }

  emetti(s: Scintilla): void {
    const i = this.prossima;
    this.prossima = (i + 1) % this.n;
    this.pos[i * 3] = s.x;
    this.pos[i * 3 + 1] = s.y;
    this.pos[i * 3 + 2] = s.z;
    this.vel[i * 3] = s.vx ?? 0;
    this.vel[i * 3 + 1] = s.vy ?? 0;
    this.vel[i * 3 + 2] = s.vz ?? 0;
    this.vita[i] = s.vita;
    this.durata[i] = s.vita;
    this.extra[i * 4] = s.dim;
    this.extra[i * 4 + 1] = s.dimFine ?? s.dim * 0.2;
    this.extra[i * 4 + 2] = s.gravita ?? 0;
    this.extra[i * 4 + 3] = s.attrito ?? 0;
    const c = i * 7;
    this.colori[c] = s.r;
    this.colori[c + 1] = s.g;
    this.colori[c + 2] = s.b;
    this.colori[c + 3] = s.r1 ?? s.r;
    this.colori[c + 4] = s.g1 ?? s.g;
    this.colori[c + 5] = s.b1 ?? s.b;
    this.colori[c + 6] = s.alfa ?? 1;
  }

  aggiorna(dt: number): void {
    const { pos, vel, vita, durata, extra, colori, col, dim } = this;
    for (let i = 0; i < this.n; i++) {
      let v = vita[i]!;
      if (v <= 0) continue;
      v -= dt;
      vita[i] = v;
      if (v <= 0) {
        dim[i] = 0;
        col[i * 4 + 3] = 0;
        continue;
      }
      const i3 = i * 3;
      const e = i * 4;
      const frena = Math.max(0, 1 - extra[e + 3]! * dt);
      vel[i3] = vel[i3]! * frena;
      vel[i3 + 1] = vel[i3 + 1]! * frena - extra[e + 2]! * dt;
      vel[i3 + 2] = vel[i3 + 2]! * frena;
      pos[i3] = pos[i3]! + vel[i3]! * dt;
      pos[i3 + 1] = pos[i3 + 1]! + vel[i3 + 1]! * dt;
      pos[i3 + 2] = pos[i3 + 2]! + vel[i3 + 2]! * dt;
      const t = 1 - v / durata[i]!;
      const c = i * 7;
      col[e] = colori[c]! + (colori[c + 3]! - colori[c]!) * t;
      col[e + 1] = colori[c + 1]! + (colori[c + 4]! - colori[c + 1]!) * t;
      col[e + 2] = colori[c + 2]! + (colori[c + 5]! - colori[c + 2]!) * t;
      // Compare in fretta e svanisce piano.
      col[e + 3] = colori[c + 6]! * Math.min(1, t * 8) * (1 - t * t);
      dim[i] = extra[e]! + (extra[e + 1]! - extra[e]!) * t;
    }
    const g = this.punti.geometry;
    g.attributes.position!.needsUpdate = true;
    g.attributes.colore!.needsUpdate = true;
    g.attributes.dim!.needsUpdate = true;
  }
}

/** Un gruppo di puntini mossi a mano uno per uno (il vortice del tornado, il disco della singolarità). */
export class Nuvola {
  readonly punti: THREE.Points;
  readonly pos: Float32Array;
  readonly col: Float32Array;
  readonly dim: Float32Array;

  constructor(readonly n: number, luminoso: boolean) {
    this.pos = new Float32Array(n * 3);
    this.col = new Float32Array(n * 4);
    this.dim = new Float32Array(n);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('colore', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('dim', new THREE.BufferAttribute(this.dim, 1).setUsage(THREE.DynamicDrawUsage));
    this.punti = new THREE.Points(g, materialePunti(luminoso, scalaPunti));
    this.punti.frustumCulled = false;
    this.punti.renderOrder = luminoso ? 6 : 5;
  }

  metti(i: number, x: number, y: number, z: number, r: number, g: number, b: number, a: number, dim: number): void {
    this.pos[i * 3] = x;
    this.pos[i * 3 + 1] = y;
    this.pos[i * 3 + 2] = z;
    this.col[i * 4] = r;
    this.col[i * 4 + 1] = g;
    this.col[i * 4 + 2] = b;
    this.col[i * 4 + 3] = a;
    this.dim[i] = dim;
  }

  fatto(): void {
    const g = this.punti.geometry;
    g.attributes.position!.needsUpdate = true;
    g.attributes.colore!.needsUpdate = true;
    g.attributes.dim!.needsUpdate = true;
  }

  butta(): void {
    this.punti.removeFromParent();
    this.punti.geometry.dispose();
    (this.punti.material as THREE.Material).dispose();
  }
}
