import * as THREE from 'three';
import { atmosfera } from './atmosfera.js';

export const DIREZIONE_SOLE = new THREE.Vector3(-0.45, 0.62, -0.64).normalize();

/** Il cielo: una grande cupola colorata da una formula, con sole e nuvole che scorrono. */
export function creaCielo(): THREE.Mesh {
  const materiale = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uSole: { value: DIREZIONE_SOLE },
      uOrizzonte: atmosfera.nebbiaColore,
      uLuce: atmosfera.luce,
      uTinta: atmosfera.tinta,
      uTempo: atmosfera.tempo,
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.0);
        gl_Position = p.xyww;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uSole; uniform vec3 uOrizzonte; uniform vec3 uTinta;
      uniform float uLuce; uniform float uTempo;
      varying vec3 vDir;
      float grana(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float rumore(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(grana(i), grana(i + vec2(1, 0)), f.x), mix(grana(i + vec2(0, 1)), grana(i + vec2(1, 1)), f.x), f.y);
      }
      float strati(vec2 p) {
        float s = 0.0; float a = 0.5;
        for (int i = 0; i < 5; i++) { s += a * rumore(p); p = p * 2.03 + 7.3; a *= 0.5; }
        return s;
      }
      void main() {
        vec3 d = normalize(vDir);
        float su = max(d.y, 0.0);
        vec3 alto = vec3(0.16, 0.42, 0.86);
        vec3 colore = mix(uOrizzonte, alto, pow(su, 0.55));
        float sole = max(dot(d, uSole), 0.0);
        colore += vec3(1.0, 0.85, 0.6) * (pow(sole, 900.0) * 3.0 + pow(sole, 12.0) * 0.28);
        if (d.y > 0.01) {
          vec2 uv = d.xz / (d.y + 0.12) * 0.9 + vec2(uTempo * 0.006, uTempo * 0.002);
          float n = strati(uv);
          float nube = smoothstep(0.48, 0.78, n) * smoothstep(0.01, 0.16, d.y);
          vec3 chiaro = mix(vec3(0.82, 0.86, 0.93), vec3(1.0, 0.98, 0.95), smoothstep(0.5, 0.9, n + sole * 0.3));
          colore = mix(colore, chiaro, nube * 0.9);
        }
        colore *= uTinta * mix(0.25, 1.0, uLuce);
        gl_FragColor = vec4(colore, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  const cupola = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), materiale);
  cupola.frustumCulled = false;
  cupola.renderOrder = -10;
  return cupola;
}
