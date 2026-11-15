import * as THREE from 'three';

/** Il bastone che si vede in basso a destra: legno contorto, tre artigli e un cristallo sospeso. */
export class Bastone {
  readonly gruppo = new THREE.Group();
  private readonly cristallo: THREE.Mesh;
  private readonly alone: THREE.Sprite;
  private readonly colore = new THREE.Color(0xff6a1a);
  private readonly meta = new THREE.Color(0xff6a1a);
  private rinculo = 0;
  private passo = 0;
  private dondoloX = 0;
  private dondoloY = 0;
  private tempo = 0;

  constructor() {
    const legno = new THREE.MeshLambertMaterial({ color: 0x5b3a20, flatShading: true });
    const scuro = new THREE.MeshLambertMaterial({ color: 0x3a2413, flatShading: true });
    const asse = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.02, -1.0, 0),
      new THREE.Vector3(-0.015, -0.6, 0.01),
      new THREE.Vector3(0.02, -0.2, -0.012),
      new THREE.Vector3(-0.01, 0.15, 0.01),
      new THREE.Vector3(0, 0.36, 0),
    ]);
    this.gruppo.add(new THREE.Mesh(new THREE.TubeGeometry(asse, 24, 0.026, 6), legno));
    for (const y of [-0.28, -0.22, 0.2]) {
      const fascia = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.009, 5, 10), scuro);
      fascia.rotation.x = Math.PI / 2;
      fascia.position.set(asse.getPoint((y + 1) / 1.36).x, y, 0);
      this.gruppo.add(fascia);
    }
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const artiglio = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.34, 0),
        new THREE.Vector3(c * 0.05, 0.39, s * 0.05),
        new THREE.Vector3(c * 0.066, 0.47, s * 0.066),
        new THREE.Vector3(c * 0.036, 0.56, s * 0.036),
      ]);
      this.gruppo.add(new THREE.Mesh(new THREE.TubeGeometry(artiglio, 10, 0.011, 5), legno));
    }
    this.cristallo = new THREE.Mesh(
      new THREE.OctahedronGeometry(1, 0),
      new THREE.MeshLambertMaterial({ color: 0x555555, emissive: 0xffffff, flatShading: true }),
    );
    this.cristallo.scale.set(0.026, 0.055, 0.026);
    this.cristallo.position.set(0, 0.47, 0);
    this.gruppo.add(this.cristallo);

    const tela = document.createElement('canvas');
    tela.width = tela.height = 64;
    const c2 = tela.getContext('2d')!;
    const sfumatura = c2.createRadialGradient(32, 32, 0, 32, 32, 32);
    sfumatura.addColorStop(0, 'rgba(255,255,255,1)');
    sfumatura.addColorStop(0.25, 'rgba(255,255,255,0.45)');
    sfumatura.addColorStop(1, 'rgba(255,255,255,0)');
    c2.fillStyle = sfumatura;
    c2.fillRect(0, 0, 64, 64);
    this.alone = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(tela),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        transparent: true,
      }),
    );
    this.alone.position.copy(this.cristallo.position);
    this.alone.scale.setScalar(0.3);
    this.gruppo.add(this.alone);
    // Il bastone si disegna in una fetta di profondità tutta sua, davanti al mondo: così non sparisce dentro
    // i muri quando ci si avvicina a una parete.
    this.gruppo.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.onBeforeRender = (r: THREE.WebGLRenderer) => r.getContext().depthRange(0, 0.03);
      o.onAfterRender = (r: THREE.WebGLRenderer) => r.getContext().depthRange(0, 1);
    });
    this.gruppo.position.set(0.4, -0.56, -0.7);
    this.gruppo.rotation.set(0.12, -0.1, -0.18);
  }

  coloreMagia(esadecimale: number): void {
    this.meta.set(esadecimale);
  }

  colpo(): void {
    this.rinculo = 1;
  }

  /** Il punto del mondo da cui partono gli incantesimi. */
  punta(esito: THREE.Vector3): THREE.Vector3 {
    return this.cristallo.getWorldPosition(esito);
  }

  aggiorna(dt: number, andatura: number, guardaX: number, guardaY: number, stretto: boolean): void {
    this.tempo += dt;
    this.passo += dt * andatura * 9;
    this.rinculo = Math.max(0, this.rinculo - dt * 3.2);
    this.dondoloX += (-guardaX * 0.0006 - this.dondoloX) * Math.min(1, dt * 8);
    this.dondoloY += (guardaY * 0.0006 - this.dondoloY) * Math.min(1, dt * 8);
    const r = this.rinculo * this.rinculo;
    const peso = Math.min(1, andatura);
    this.gruppo.position.set(
      (stretto ? 0.22 : 0.42) + Math.sin(this.passo * 0.5) * 0.012 * peso + this.dondoloX,
      -0.58 + Math.abs(Math.sin(this.passo * 0.5)) * 0.014 * peso + this.dondoloY + Math.sin(this.tempo * 1.3) * 0.004,
      -0.72 + r * 0.1,
    );
    this.gruppo.rotation.set(0.12 + r * 0.45, -0.1, -0.18 - r * 0.08);
    this.colore.lerp(this.meta, Math.min(1, dt * 7));
    const lampo = 1 + r * 2.2 + Math.sin(this.tempo * 5) * 0.08;
    (this.cristallo.material as THREE.MeshLambertMaterial).emissive.copy(this.colore).multiplyScalar(0.7 * lampo);
    this.alone.material.color.copy(this.colore);
    this.alone.material.opacity = 0.4;
    this.alone.scale.setScalar(0.3 * lampo);
    this.cristallo.rotation.y += dt * (1.5 + r * 14);
    this.cristallo.position.y = 0.47 + Math.sin(this.tempo * 2.1) * 0.008;
    this.alone.position.y = this.cristallo.position.y;
  }
}
