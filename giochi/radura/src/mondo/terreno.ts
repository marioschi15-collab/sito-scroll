import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { gradino, rumoreStrati } from '../base/matematica.js';
import type { Campo } from './campo.js';

export const LATO_TERRENO = 640;
const CELLE = 160;
export const RAGGIO_GIOCO = 100;

/** Altezza del terreno in un punto: piatto al centro (dove c'è il villaggio), colline intorno, monti lontani. */
export function altezza(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const colline = (rumoreStrati(x * 0.013 + 10, z * 0.013 + 7) - 0.38) * 18 * gradino(46, 95, r);
  const monti = gradino(125, 290, r) * (26 + 46 * rumoreStrati(x * 0.006 + 3, z * 0.006 + 31, 3));
  return colline + monti;
}

export interface Terreno {
  readonly mesh: THREE.Mesh;
  /** Le altezze in una immagine, per far appoggiare i fili d'erba al terreno. */
  readonly altezze: THREE.DataTexture;
}

export function creaTerreno(R: typeof RAPIER, fisica: RAPIER.World, campo: Campo, ombre: boolean): Terreno {
  const geometria = new THREE.PlaneGeometry(LATO_TERRENO, LATO_TERRENO, CELLE, CELLE);
  geometria.rotateX(-Math.PI / 2);
  const pos = geometria.attributes.position as THREE.BufferAttribute;
  const lato = CELLE + 1;
  const mezzi = new Uint16Array(lato * lato);
  for (let i = 0; i < pos.count; i++) {
    const h = altezza(pos.getX(i), pos.getZ(i));
    pos.setY(i, h);
    mezzi[i] = THREE.DataUtils.toHalfFloat(h);
  }
  geometria.computeVertexNormals();

  const altezze = new THREE.DataTexture(mezzi, lato, lato, THREE.RedFormat, THREE.HalfFloatType);
  altezze.magFilter = THREE.LinearFilter;
  altezze.minFilter = THREE.LinearFilter;
  altezze.needsUpdate = true;

  const materiale = new THREE.MeshLambertMaterial({ color: 0x4f8f2c });
  materiale.onBeforeCompile = (shader) => {
    shader.uniforms.uStato = { value: campo.immagine };
    shader.uniforms.uLatoCampo = { value: campo.lato };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMondo;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMondo = (modelMatrix * vec4(position, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform sampler2D uStato; uniform float uLatoCampo; varying vec3 vMondo;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         vec4 stato = texture2D(uStato, vMondo.xz / uLatoCampo + 0.5);
         float chiazza = sin(vMondo.x * 0.07) * sin(vMondo.z * 0.09 + 1.7) * 0.5 + 0.5;
         diffuseColor.rgb *= mix(0.82, 1.12, chiazza);
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.36, 0.07), stato.b * 0.6);
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.035, 0.03, 0.025), stato.r * 0.92);
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.72, 0.86, 0.95), stato.g * 0.8);
         diffuseColor.rgb += vec3(1.0, 0.32, 0.04) * stato.a * 0.9;`,
      );
  };
  const mesh = new THREE.Mesh(geometria, materiale);
  mesh.receiveShadow = ombre;

  const vertici = new Float32Array(pos.array);
  const indici = new Uint32Array(geometria.index!.array);
  fisica.createCollider(R.ColliderDesc.trimesh(vertici, indici).setFriction(0.9));

  return { mesh, altezze };
}

/** Dove cade un punto del mondo dentro l'immagine delle altezze (scritto per le schede grafiche). */
export const UV_ALTEZZE_GLSL = /* glsl */ `
  vec2 uvAltezze(vec2 xz) {
    return ((xz + ${(LATO_TERRENO / 2).toFixed(1)}) / ${(LATO_TERRENO / CELLE).toFixed(1)} + 0.5) / ${(CELLE + 1).toFixed(1)};
  }
`;
