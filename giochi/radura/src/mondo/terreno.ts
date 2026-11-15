import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { gradino, limita } from '../base/matematica.js';
import type { Campo } from './campo.js';
import { atmosfera, NEBBIA_GLSL, NUBI_GLSL } from './atmosfera.js';
import { DIREZIONE_SOLE } from './cielo.js';
import { altezzaEsatta, lava, pesiZone, QUOTA_ACQUA, ZONE } from './zone.js';

export { RAGGIO_GIOCO } from './zone.js';

export const LATO_TERRENO = 832;
const CELLE = 256;
const PASSO = LATO_TERRENO / CELLE;
const LATO_GRIGLIA = CELLE + 1;

let griglia: Float32Array | null = null;

/**
 * Altezza del terreno in un punto. Una volta creato il terreno si legge da una griglia già calcolata
 * (veloce, e identica a ciò che si vede); prima, o fuori dalla griglia, si calcola da capo.
 */
export function altezza(x: number, z: number): number {
  if (!griglia) return altezzaEsatta(x, z);
  const gx = limita((x + LATO_TERRENO / 2) / PASSO, 0, CELLE - 0.001);
  const gz = limita((z + LATO_TERRENO / 2) / PASSO, 0, CELLE - 0.001);
  const ix = Math.floor(gx);
  const iz = Math.floor(gz);
  const fx = gx - ix;
  const fz = gz - iz;
  const i = iz * LATO_GRIGLIA + ix;
  const a = griglia[i]!;
  const b = griglia[i + 1]!;
  const c = griglia[i + LATO_GRIGLIA]!;
  const d = griglia[i + LATO_GRIGLIA + 1]!;
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}

export interface Terreno {
  readonly mesh: THREE.Mesh;
  readonly acqua: THREE.Mesh;
  /** Le altezze in una immagine, per far appoggiare i fili d'erba al terreno. */
  readonly altezze: THREE.DataTexture;
  /** Per ogni punto: quanta erba c'è e com'è (secca, innevata, scura). */
  readonly biomi: THREE.DataTexture;
}

export function creaTerreno(R: typeof RAPIER, fisica: RAPIER.World, campo: Campo, ombre: boolean): Terreno {
  const geometria = new THREE.PlaneGeometry(LATO_TERRENO, LATO_TERRENO, CELLE, CELLE);
  geometria.rotateX(-Math.PI / 2);
  const pos = geometria.attributes.position as THREE.BufferAttribute;
  const n = pos.count;
  const quote = new Float32Array(n);
  const mezzi = new Uint16Array(n);
  const biomi = new Uint8Array(n * 4);
  const colori = new Float32Array(n * 3);
  const lave = new Float32Array(n);
  const pesi = new Float32Array(5);
  const terre = ZONE.map((z) => new THREE.Color(z.terra));
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = altezzaEsatta(x, z);
    quote[i] = h;
    pos.setY(i, h);
    mezzi[i] = THREE.DataUtils.toHalfFloat(h);
    pesiZone(x, z, pesi);
    let r = 0, g = 0, b = 0;
    const erba = [0, 0, 0, 0];
    for (let k = 0; k < ZONE.length; k++) {
      const w = pesi[k]!;
      r += terre[k]!.r * w;
      g += terre[k]!.g * w;
      b += terre[k]!.b * w;
      for (let j = 0; j < 4; j++) erba[j] = erba[j]! + ZONE[k]!.erba[j]! * w;
    }
    const l = lava(x, z, pesi[4]!);
    lave[i] = l;
    colori[i * 3] = r;
    colori[i * 3 + 1] = g;
    colori[i * 3 + 2] = b;
    biomi[i * 4] = erba[0]! * (1 - l) * 255;
    biomi[i * 4 + 1] = erba[1]! * 255;
    biomi[i * 4 + 2] = erba[2]! * 255;
    biomi[i * 4 + 3] = erba[3]! * 255;
  }
  griglia = quote;
  geometria.computeVertexNormals();
  // Dove il terreno è ripido affiora la roccia; sotto il pelo dell'acqua, il fango.
  const normali = geometria.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < n; i++) {
    const roccia = gradino(0.9, 0.7, normali.getY(i)) * 0.85;
    const fango = gradino(QUOTA_ACQUA + 0.5, QUOTA_ACQUA - 0.2, quote[i]!) * 0.6;
    colori[i * 3] = colori[i * 3]! * (1 - roccia) * (1 - fango) + 0.34 * roccia + 0.2 * fango;
    colori[i * 3 + 1] = colori[i * 3 + 1]! * (1 - roccia) * (1 - fango) + 0.32 * roccia + 0.17 * fango;
    colori[i * 3 + 2] = colori[i * 3 + 2]! * (1 - roccia) * (1 - fango) + 0.3 * roccia + 0.1 * fango;
    if (roccia > 0.3) biomi[i * 4] = biomi[i * 4]! * (1 - roccia);
  }
  geometria.setAttribute('color', new THREE.BufferAttribute(colori, 3));
  geometria.setAttribute('aLava', new THREE.BufferAttribute(lave, 1));

  const altezze = new THREE.DataTexture(mezzi, LATO_GRIGLIA, LATO_GRIGLIA, THREE.RedFormat, THREE.HalfFloatType);
  altezze.magFilter = altezze.minFilter = THREE.LinearFilter;
  altezze.needsUpdate = true;
  const immagineBiomi = new THREE.DataTexture(biomi, LATO_GRIGLIA, LATO_GRIGLIA, THREE.RGBAFormat, THREE.UnsignedByteType);
  immagineBiomi.magFilter = immagineBiomi.minFilter = THREE.LinearFilter;
  immagineBiomi.needsUpdate = true;

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
         vec4 stato = texture2D(uStato, vMondo.xz / uLatoCampo + 0.5);
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
  const mesh = new THREE.Mesh(geometria, materiale);
  mesh.receiveShadow = ombre;

  // L'acqua: riflette il cielo quando la si guarda di striscio, lascia vedere il fondo da sopra, e luccica al sole.
  const acqua = new THREE.Mesh(
    new THREE.PlaneGeometry(LATO_TERRENO, LATO_TERRENO).rotateX(-Math.PI / 2),
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

  const vertici = new Float32Array(pos.array);
  const indici = new Uint32Array(geometria.index!.array);
  fisica.createCollider(R.ColliderDesc.trimesh(vertici, indici).setFriction(0.9));

  return { mesh, acqua, altezze, biomi: immagineBiomi };
}

/** Dove cade un punto del mondo dentro l'immagine delle altezze (scritto per le schede grafiche). */
export const UV_ALTEZZE_GLSL = /* glsl */ `
  vec2 uvAltezze(vec2 xz) {
    return ((xz + ${(LATO_TERRENO / 2).toFixed(1)}) / ${PASSO.toFixed(4)} + 0.5) / ${LATO_GRIGLIA.toFixed(1)};
  }
`;
