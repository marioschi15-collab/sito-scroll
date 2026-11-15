import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { gradino } from '../base/matematica.js';
import type { Campo } from './campo.js';
import { atmosfera, NEBBIA_GLSL, NUBI_GLSL } from './atmosfera.js';
import { DIREZIONE_SOLE } from './cielo.js';
import { altezzaEsatta, campiona, lava, QUOTA_ACQUA, VULCANO, ZONE } from './zone.js';

/**
 * Il terreno di un mondo senza confini. È fatto a "zolle" quadrate che nascono attorno a chi gioca e,
 * quando restano indietro, vengono riusate per il terreno che compare davanti: in memoria ce n'è sempre
 * lo stesso numero, qualunque distanza si percorra.
 */
const PASSO = 3.25;
const CELLE = 16;
export const LATO_ZOLLA = PASSO * CELLE;
/** Quante zolle per lato si tengono attorno a chi gioca. */
const ZOLLE = 15;
const PUNTI = CELLE + 1;
const LATO_IMMAGINE = ZOLLE * CELLE;

interface Zolla {
  cx: number;
  cz: number;
  pronta: boolean;
  mesh: THREE.Mesh;
  quote: Float32Array;
  collisore: RAPIER.Collider | null;
}

const zolle: Zolla[] = [];
const resto = (a: number, n: number): number => ((a % n) + n) % n;

/**
 * Altezza del terreno in un punto. Dove la zolla è già pronta si legge dalle sue quote (veloce, e identica
 * a ciò che si vede); altrove si calcola da capo.
 */
export function altezza(x: number, z: number): number {
  const gx = x / LATO_ZOLLA;
  const gz = z / LATO_ZOLLA;
  const cx = Math.floor(gx);
  const cz = Math.floor(gz);
  const zolla = zolle[resto(cz, ZOLLE) * ZOLLE + resto(cx, ZOLLE)];
  if (!zolla || !zolla.pronta || zolla.cx !== cx || zolla.cz !== cz) return altezzaEsatta(x, z);
  const fx = Math.min(CELLE - 0.001, (gx - cx) * CELLE);
  const fz = Math.min(CELLE - 0.001, (gz - cz) * CELLE);
  const ix = Math.floor(fx);
  const iz = Math.floor(fz);
  const tx = fx - ix;
  const tz = fz - iz;
  const q = zolla.quote;
  const i = iz * PUNTI + ix;
  const a = q[i]!;
  const b = q[i + 1]!;
  const c = q[i + PUNTI]!;
  const d = q[i + PUNTI + 1]!;
  return a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz;
}

export interface Terreno {
  readonly gruppo: THREE.Group;
  readonly acqua: THREE.Mesh;
  /** Le altezze in una immagine, per far appoggiare i fili d'erba al terreno. */
  readonly altezze: THREE.DataTexture;
  /** Per ogni punto: quanta erba c'è e com'è (secca, innevata, scura). */
  readonly biomi: THREE.DataTexture;
  /** Prepara le zolle attorno a un punto. `quante` è il massimo da preparare in questa chiamata. */
  segui(x: number, z: number, quante: number): number;
}

export function creaTerreno(R: typeof RAPIER, fisica: RAPIER.World, campo: Campo, ombre: boolean): Terreno {
  const mezzi = new Uint16Array(LATO_IMMAGINE * LATO_IMMAGINE);
  const punti = new Uint8Array(LATO_IMMAGINE * LATO_IMMAGINE * 4);
  const altezze = new THREE.DataTexture(mezzi, LATO_IMMAGINE, LATO_IMMAGINE, THREE.RedFormat, THREE.HalfFloatType);
  const biomi = new THREE.DataTexture(punti, LATO_IMMAGINE, LATO_IMMAGINE, THREE.RGBAFormat, THREE.UnsignedByteType);
  for (const immagine of [altezze, biomi]) {
    immagine.magFilter = immagine.minFilter = THREE.LinearFilter;
    // Le immagini "girano su se stesse": il mondo è infinito, loro coprono solo il pezzo attorno a chi gioca.
    immagine.wrapS = immagine.wrapT = THREE.RepeatWrapping;
    immagine.needsUpdate = true;
  }

  const materiale = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true });
  materiale.onBeforeCompile = (shader) => {
    shader.uniforms.uStato = { value: campo.immagine };
    shader.uniforms.uLatoCampo = { value: campo.lato };
    shader.uniforms.uTempo = atmosfera.tempo;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aLava; varying vec3 vMondo; varying float vLava;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvMondo = (modelMatrix * vec4(position, 1.0)).xyz; vLava = aLava;',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform sampler2D uStato; uniform float uLatoCampo; uniform float uTempo;
         varying vec3 vMondo; varying float vLava;
         ${NUBI_GLSL}`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         vec4 stato = texture2D(uStato, vMondo.xz / uLatoCampo);
         float chiazza = sin(vMondo.x * 0.07) * sin(vMondo.z * 0.09 + 1.7) * 0.5 + 0.5;
         diffuseColor.rgb *= mix(0.84, 1.1, chiazza) * ombraNubi(vMondo.xz, uTempo);
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.36, 0.07), stato.b * 0.6);
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.035, 0.03, 0.025), stato.r * 0.92);
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.72, 0.86, 0.95), stato.g * 0.8);
         diffuseColor.rgb += vec3(1.0, 0.32, 0.04) * stato.a * 0.9;
         float colata = smoothstep(0.35, 0.8, vLava) * (1.0 - stato.g);
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.05, 0.02, 0.01), smoothstep(0.1, 0.5, vLava));`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         float bolle = 0.75 + 0.25 * sin(vMondo.x * 0.9 + uTempo * 1.3) * sin(vMondo.z * 0.8 - uTempo * 0.9);
         totalEmissiveRadiance += vec3(1.5, 0.36, 0.04) * colata * bolle;`,
      );
  };

  // Gli indici dei triangoli sono uguali per tutte le zolle.
  const indici: number[] = [];
  for (let j = 0; j < CELLE; j++) {
    for (let i = 0; i < CELLE; i++) {
      const a = j * PUNTI + i;
      indici.push(a, a + PUNTI, a + 1, a + 1, a + PUNTI, a + PUNTI + 1);
    }
  }
  const indiciFisica = new Uint32Array(indici);
  const gruppo = new THREE.Group();
  for (let k = 0; k < ZOLLE * ZOLLE; k++) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PUNTI * PUNTI * 3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(PUNTI * PUNTI * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(PUNTI * PUNTI * 3), 3));
    g.setAttribute('aLava', new THREE.BufferAttribute(new Float32Array(PUNTI * PUNTI), 1));
    g.setIndex(indici);
    g.boundingSphere = new THREE.Sphere();
    const mesh = new THREE.Mesh(g, materiale);
    mesh.receiveShadow = ombre;
    mesh.visible = false;
    gruppo.add(mesh);
    zolle.push({ cx: NaN, cz: NaN, pronta: false, mesh, quote: new Float32Array(PUNTI * PUNTI), collisore: null });
  }

  const terre = ZONE.map((z) => new THREE.Color(z.terra));
  // Altezze di una zolla più un bordo di un punto tutt'intorno: serve a calcolare le pendenze senza scalini ai confini.
  const BORDO = PUNTI + 2;
  const blocco = new Float32Array(BORDO * BORDO);
  const verticiFisica = new Float32Array(PUNTI * PUNTI * 3);

  const prepara = (zolla: Zolla, cx: number, cz: number): void => {
    if (zolla.collisore) fisica.removeCollider(zolla.collisore, false);
    zolla.cx = cx;
    zolla.cz = cz;
    const x0 = cx * LATO_ZOLLA;
    const z0 = cz * LATO_ZOLLA;
    const g = zolla.mesh.geometry;
    const pos = g.attributes.position!.array as Float32Array;
    const nor = g.attributes.normal!.array as Float32Array;
    const col = g.attributes.color!.array as Float32Array;
    const lav = g.attributes.aLava!.array as Float32Array;
    let minimo = Infinity;
    let massimo = -Infinity;
    for (let j = -1; j <= PUNTI; j++) {
      for (let i = -1; i <= PUNTI; i++) {
        const x = x0 + i * PASSO;
        const z = z0 + j * PASSO;
        const dentro = i >= 0 && j >= 0 && i < PUNTI && j < PUNTI;
        const c = campiona(x, z);
        blocco[(j + 1) * BORDO + i + 1] = c.h;
        if (!dentro) continue;
        const k = j * PUNTI + i;
        zolla.quote[k] = c.h;
        pos[k * 3] = x;
        pos[k * 3 + 1] = c.h;
        pos[k * 3 + 2] = z;
        minimo = Math.min(minimo, c.h);
        massimo = Math.max(massimo, c.h);
        let r = 0, gg = 0, b = 0;
        const erba = [0, 0, 0, 0];
        for (let n = 0; n < ZONE.length; n++) {
          const w = c.pesi[n]!;
          r += terre[n]!.r * w;
          gg += terre[n]!.g * w;
          b += terre[n]!.b * w;
          for (let e = 0; e < 4; e++) erba[e] = erba[e]! + ZONE[n]!.erba[e]! * w;
        }
        const l = lava(x, z, c.pesi[VULCANO]!);
        lav[k] = l;
        col[k * 3] = r;
        col[k * 3 + 1] = gg;
        col[k * 3 + 2] = b;
        // Nelle immagini per l'erba ogni zolla scrive i suoi punti tranne l'ultima fila e colonna (sono della vicina).
        if (i < CELLE && j < CELLE) {
          const t = resto(cz * CELLE + j, LATO_IMMAGINE) * LATO_IMMAGINE + resto(cx * CELLE + i, LATO_IMMAGINE);
          mezzi[t] = THREE.DataUtils.toHalfFloat(c.h);
          punti[t * 4] = erba[0]! * (1 - l) * 255;
          punti[t * 4 + 1] = erba[1]! * 255;
          punti[t * 4 + 2] = erba[2]! * 255;
          punti[t * 4 + 3] = erba[3]! * 255;
        }
      }
    }
    for (let j = 0; j < PUNTI; j++) {
      for (let i = 0; i < PUNTI; i++) {
        const k = j * PUNTI + i;
        const b = (j + 1) * BORDO + i + 1;
        const dx = blocco[b - 1]! - blocco[b + 1]!;
        const dz = blocco[b - BORDO]! - blocco[b + BORDO]!;
        const lung = Math.hypot(dx, 2 * PASSO, dz);
        nor[k * 3] = dx / lung;
        nor[k * 3 + 1] = (2 * PASSO) / lung;
        nor[k * 3 + 2] = dz / lung;
        // Dove il terreno è ripido affiora la roccia; sotto il pelo dell'acqua, il fango.
        const roccia = gradino(0.9, 0.7, nor[k * 3 + 1]!) * 0.85;
        const fango = gradino(QUOTA_ACQUA + 0.5, QUOTA_ACQUA - 0.2, zolla.quote[k]!) * 0.6;
        const resta = (1 - roccia) * (1 - fango);
        col[k * 3] = col[k * 3]! * resta + 0.34 * roccia + 0.2 * fango;
        col[k * 3 + 1] = col[k * 3 + 1]! * resta + 0.32 * roccia + 0.17 * fango;
        col[k * 3 + 2] = col[k * 3 + 2]! * resta + 0.3 * roccia + 0.1 * fango;
        if (roccia > 0.3 && i < CELLE && j < CELLE) {
          const t = resto(cz * CELLE + j, LATO_IMMAGINE) * LATO_IMMAGINE + resto(cx * CELLE + i, LATO_IMMAGINE);
          punti[t * 4] = punti[t * 4]! * (1 - roccia);
        }
      }
    }
    for (const nome of ['position', 'normal', 'color', 'aLava']) g.attributes[nome]!.needsUpdate = true;
    g.boundingSphere!.center.set(x0 + LATO_ZOLLA / 2, (minimo + massimo) / 2, z0 + LATO_ZOLLA / 2);
    g.boundingSphere!.radius = Math.hypot(LATO_ZOLLA * 0.71, (massimo - minimo) / 2);
    verticiFisica.set(pos);
    zolla.collisore = fisica.createCollider(R.ColliderDesc.trimesh(verticiFisica.slice(), indiciFisica).setFriction(0.9));
    zolla.mesh.visible = true;
    zolla.pronta = true;
    altezze.needsUpdate = true;
    biomi.needsUpdate = true;
  };

  // L'acqua: riflette il cielo quando la si guarda di striscio, lascia vedere il fondo da sopra, e luccica al sole.
  const acqua = new THREE.Mesh(
    new THREE.PlaneGeometry(LATO_ZOLLA * ZOLLE, LATO_ZOLLA * ZOLLE).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTempo: atmosfera.tempo, uOrizzonte: atmosfera.nebbiaColore, uAlto: atmosfera.cieloAlto, uLuce: atmosfera.luce,
        uTinta: atmosfera.tinta, uNebbiaDensita: atmosfera.nebbiaDensita, uSole: { value: DIREZIONE_SOLE },
      },
      vertexShader: /* glsl */ `
        varying vec3 vMondo; varying float vDistanza;
        void main() {
          vMondo = (modelMatrix * vec4(position, 1.0)).xyz;
          vec4 mv = viewMatrix * vec4(vMondo, 1.0);
          vDistanza = -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTempo; uniform vec3 uOrizzonte; uniform vec3 uAlto; uniform float uLuce; uniform vec3 uTinta;
        uniform float uNebbiaDensita; uniform vec3 uSole;
        varying vec3 vMondo; varying float vDistanza;
        ${NEBBIA_GLSL}
        void main() {
          vec3 vista = normalize(cameraPosition - vMondo);
          float a = sin(vMondo.x * 0.9 + uTempo * 1.2) * sin(vMondo.z * 1.1 - uTempo * 0.9);
          float b = sin((vMondo.x + vMondo.z) * 2.3 + uTempo * 2.0) + sin((vMondo.x - vMondo.z) * 3.1 - uTempo * 1.6);
          vec3 n = normalize(vec3(a * 0.07 + b * 0.025, 1.0, a * 0.05 - b * 0.03));
          float striscio = pow(1.0 - max(dot(n, vista), 0.0), 3.0);
          vec3 c = mix(vec3(0.05, 0.22, 0.27), mix(uOrizzonte, uAlto, 0.45), clamp(striscio * 1.3 + 0.12, 0.0, 1.0));
          c *= uTinta * mix(0.3, 1.0, min(uLuce, 1.0));
          c += vec3(1.0, 0.94, 0.8) * pow(max(dot(reflect(-uSole, n), vista), 0.0), 140.0) * 1.6 * uLuce;
          gl_FragColor = vec4(conNebbia(c, vDistanza, uOrizzonte, uNebbiaDensita), mix(0.55, 0.93, striscio));
          #include <colorspace_fragment>
        }
      `,
    }),
  );
  acqua.position.y = QUOTA_ACQUA;
  acqua.renderOrder = 2;
  acqua.frustumCulled = false;

  const daFare: { zolla: Zolla; cx: number; cz: number; d: number }[] = [];
  return {
    gruppo, acqua, altezze, biomi,
    segui(x, z, quante) {
      const ccx = Math.floor(x / LATO_ZOLLA);
      const ccz = Math.floor(z / LATO_ZOLLA);
      acqua.position.x = ccx * LATO_ZOLLA;
      acqua.position.z = ccz * LATO_ZOLLA;
      const mezzo = (ZOLLE - 1) / 2;
      daFare.length = 0;
      for (let dz = -mezzo; dz <= mezzo; dz++) {
        for (let dx = -mezzo; dx <= mezzo; dx++) {
          const cx = ccx + dx;
          const cz = ccz + dz;
          const zolla = zolle[resto(cz, ZOLLE) * ZOLLE + resto(cx, ZOLLE)]!;
          if (zolla.cx === cx && zolla.cz === cz) continue;
          // La zolla che occupa questo posto è rimasta indietro: non si legge più e non si mostra più.
          zolla.pronta = false;
          zolla.mesh.visible = false;
          daFare.push({ zolla, cx, cz, d: dx * dx + dz * dz });
        }
      }
      daFare.sort((a, b) => a.d - b.d);
      const fatte = Math.min(quante, daFare.length);
      for (let i = 0; i < fatte; i++) prepara(daFare[i]!.zolla, daFare[i]!.cx, daFare[i]!.cz);
      return daFare.length - fatte;
    },
  };
}

/** Dove cade un punto del mondo dentro le immagini di altezze e biomi (scritto per le schede grafiche). */
export const UV_ALTEZZE_GLSL = /* glsl */ `
  vec2 uvAltezze(vec2 xz) {
    return (xz / ${PASSO.toFixed(4)} + 0.5) / ${LATO_IMMAGINE.toFixed(1)};
  }
`;
