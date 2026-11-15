import * as THREE from 'three';
import type { Qualita } from '../base/qualita.js';
import { generatore } from '../base/matematica.js';
import { atmosfera, NEBBIA_GLSL } from './atmosfera.js';
import type { Campo } from './campo.js';
import { UV_ALTEZZE_GLSL } from './terreno.js';

/**
 * L'erba e i fiori. I fili sono sempre gli stessi e "seguono" chi gioca: quelli che restano indietro
 * ricompaiono davanti, così il prato sembra infinito con un numero fisso di fili.
 */
export interface Prato {
  readonly oggetti: THREE.Object3D[];
  aggiorna(camera: THREE.Vector3): void;
}

const COMUNE_VERTICE = /* glsl */ `
  uniform vec3 uCam; uniform float uLato; uniform float uTempo; uniform float uLatoCampo;
  uniform sampler2D uAltezze; uniform sampler2D uStato; uniform sampler2D uBiomi;
  ${UV_ALTEZZE_GLSL}
`;

export function creaPrato(q: Qualita, campo: Campo, altezze: THREE.DataTexture, biomi: THREE.DataTexture): Prato {
  const uniformi = {
    uCam: { value: new THREE.Vector3() },
    uLato: { value: q.latoErba },
    uTempo: atmosfera.tempo,
    uLatoCampo: { value: campo.lato },
    uAltezze: { value: altezze },
    uBiomi: { value: biomi },
    uStato: { value: campo.immagine },
    uNebbiaColore: atmosfera.nebbiaColore,
    uNebbiaDensita: atmosfera.nebbiaDensita,
    uLuce: atmosfera.luce,
    uTinta: atmosfera.tinta,
  };
  const rnd = generatore(77);

  // --- fili d'erba ---
  const filo = new THREE.InstancedBufferGeometry();
  filo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, -0.36, 0.5, 0, 0.36, 0.5, 0, 0, 1, 0], 3),
  );
  filo.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4]);
  const basi = new Float32Array(q.filiErba * 2);
  const casi = new Float32Array(q.filiErba * 4);
  for (let i = 0; i < q.filiErba; i++) {
    basi[i * 2] = rnd() * q.latoErba;
    basi[i * 2 + 1] = rnd() * q.latoErba;
    casi[i * 4] = rnd();
    casi[i * 4 + 1] = 0.45 + rnd() * rnd() * 0.75;
    casi[i * 4 + 2] = rnd();
    casi[i * 4 + 3] = rnd();
  }
  filo.setAttribute('aBase', new THREE.InstancedBufferAttribute(basi, 2));
  filo.setAttribute('aCaso', new THREE.InstancedBufferAttribute(casi, 4));
  filo.instanceCount = q.filiErba;

  const materialeErba = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: uniformi,
    vertexShader: /* glsl */ `
      ${COMUNE_VERTICE}
      attribute vec2 aBase; attribute vec4 aCaso;
      varying vec3 vColore; varying float vDistanza;
      void main() {
        vec2 rel = mod(aBase - uCam.xz, uLato) - uLato * 0.5;
        vec2 w = rel + uCam.xz;
        float dist = length(rel);
        float bordo = 1.0 - smoothstep(uLato * 0.36, uLato * 0.5, dist);
        float terra = texture2D(uAltezze, uvAltezze(w)).r;
        vec4 stato = texture2D(uStato, w / uLatoCampo + 0.5);
        vec4 bio = texture2D(uBiomi, uvAltezze(w));
        // Dove c'è poca erba (sabbia, cenere) ne spunta solo qualche ciuffo; la magia della crescita la fa nascere ovunque.
        float quanta = max(bio.r, stato.b);
        float presente = step(aCaso.z * 0.98 + 0.01, quanta) * smoothstep(-0.5, -0.15, terra);
        float t = position.y;
        float alto = aCaso.y * (1.0 + 1.4 * stato.b + 0.5 * bio.a) * (1.0 - 0.82 * stato.r) * bordo * presente;
        float ang = aCaso.x * 6.2832;
        vec2 lato = vec2(cos(ang), sin(ang));
        float larghezza = mix(0.075, 0.13, aCaso.z) * (1.0 + 0.5 * stato.b);
        vec3 p = vec3(w.x, terra, w.y);
        p.xz += lato * position.x * larghezza;
        float onda = sin(uTempo * 1.5 + w.x * 0.32 + w.y * 0.21) * 0.6
                   + sin(uTempo * 2.9 + w.x * 0.83 - w.y * 0.71 + aCaso.w * 6.0) * 0.3;
        vec2 piega = vec2(0.8, 0.6) * onda * 0.42 * (1.0 - stato.g * 0.92)
                   + vec2(-lato.y, lato.x) * (aCaso.w - 0.5) * 0.7;
        p.xz += piega * t * t * alto;
        p.y += t * alto * (1.0 - 0.18 * dot(piega, piega) * t);

        float chiazza = sin(w.x * 0.07) * sin(w.y * 0.09 + 1.7) * 0.5 + 0.5;
        vec3 base = mix(vec3(0.045, 0.19, 0.03), vec3(0.09, 0.23, 0.03), chiazza);
        vec3 punta = mix(vec3(0.30, 0.62, 0.10), vec3(0.55, 0.72, 0.16), chiazza * aCaso.z);
        punta = mix(punta, vec3(0.22, 0.78, 0.16), stato.b * 0.7);
        vec3 c = mix(base, punta, t);
        float naturale = 1.0 - stato.b;
        c = mix(c, mix(vec3(0.42, 0.33, 0.12), vec3(0.8, 0.68, 0.3), t), bio.g * naturale);
        c = mix(c, c * vec3(0.3, 0.5, 0.46), bio.a * naturale);
        c = mix(c, vec3(0.88, 0.94, 1.0), bio.b * naturale * (0.35 + 0.6 * t));
        c = mix(c, vec3(0.02, 0.016, 0.012), stato.r * 0.96);
        c = mix(c, vec3(0.78, 0.92, 1.0), stato.g * (0.45 + 0.5 * t));
        c += vec3(1.6, 0.5, 0.06) * stato.a * (1.0 - t) * 1.2;
        vColore = c;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        vDistanza = -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uNebbiaColore; uniform float uNebbiaDensita; uniform float uLuce; uniform vec3 uTinta;
      varying vec3 vColore; varying float vDistanza;
      ${NEBBIA_GLSL}
      void main() {
        vec3 c = vColore * uTinta * mix(0.3, 1.0, uLuce);
        gl_FragColor = vec4(conNebbia(c, vDistanza, uNebbiaColore, uNebbiaDensita), 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  const erba = new THREE.Mesh(filo, materialeErba);
  erba.frustumCulled = false;

  // --- fiori ---
  const fiore = new THREE.InstancedBufferGeometry();
  const punti: number[] = [0, 0, 0];
  const indici: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    punti.push(Math.cos(a), 0, Math.sin(a));
    indici.push(0, 1 + ((i + 1) % 6), 1 + i);
  }
  fiore.setAttribute('position', new THREE.Float32BufferAttribute(punti, 3));
  fiore.setIndex(indici);
  const basiFiori = new Float32Array(q.fiori * 2);
  const casiFiori = new Float32Array(q.fiori * 4);
  const coloriFiori = new Float32Array(q.fiori * 3);
  const tavolozza = [0xe8302a, 0x2f5fe0, 0xf07ab0, 0xfff4e0, 0xf5c518, 0xe8302a, 0x9a5bf0].map(
    (c) => new THREE.Color(c),
  );
  for (let i = 0; i < q.fiori; i++) {
    basiFiori[i * 2] = rnd() * q.latoErba;
    basiFiori[i * 2 + 1] = rnd() * q.latoErba;
    for (let k = 0; k < 4; k++) casiFiori[i * 4 + k] = rnd();
    const c = tavolozza[Math.floor(rnd() * tavolozza.length)]!;
    coloriFiori[i * 3] = c.r;
    coloriFiori[i * 3 + 1] = c.g;
    coloriFiori[i * 3 + 2] = c.b;
  }
  fiore.setAttribute('aBase', new THREE.InstancedBufferAttribute(basiFiori, 2));
  fiore.setAttribute('aCaso', new THREE.InstancedBufferAttribute(casiFiori, 4));
  fiore.setAttribute('aColore', new THREE.InstancedBufferAttribute(coloriFiori, 3));
  fiore.instanceCount = q.fiori;

  const materialeFiori = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: uniformi,
    vertexShader: /* glsl */ `
      ${COMUNE_VERTICE}
      attribute vec2 aBase; attribute vec4 aCaso; attribute vec3 aColore;
      varying vec3 vColore; varying float vDistanza;
      void main() {
        vec2 rel = mod(aBase - uCam.xz, uLato) - uLato * 0.5;
        vec2 w = rel + uCam.xz;
        float bordo = 1.0 - smoothstep(uLato * 0.34, uLato * 0.48, length(rel));
        float terra = texture2D(uAltezze, uvAltezze(w)).r;
        vec4 stato = texture2D(uStato, w / uLatoCampo + 0.5);
        float aiuola = sin(w.x * 0.11 + 1.3) * sin(w.y * 0.13 + 0.7) + 0.45 * sin(w.x * 0.31 + w.y * 0.27);
        vec4 bio = texture2D(uBiomi, uvAltezze(w));
        float prato = bio.r * (1.0 - bio.g) * (1.0 - bio.b) * (1.0 - bio.a);
        float spontaneo = smoothstep(0.5, 0.85, aiuola) * step(aCaso.z, 0.3) * smoothstep(0.6, 0.9, prato) * smoothstep(-0.5, -0.15, terra);
        float magico = smoothstep(aCaso.w * 0.7, aCaso.w * 0.7 + 0.25, stato.b);
        float mostra = max(spontaneo, magico) * (1.0 - smoothstep(0.1, 0.5, stato.r)) * bordo;
        float raggio = mix(0.05, 0.09, aCaso.x) * mostra * (1.0 + 0.4 * stato.b);
        float gambo = (0.5 + aCaso.y * 0.45) * (1.0 + 1.3 * stato.b);
        float onda = sin(uTempo * 1.5 + w.x * 0.32 + w.y * 0.21) * 0.6;
        vec3 centro = vec3(w.x, terra + gambo, w.y);
        centro.xz += vec2(0.8, 0.6) * onda * 0.3 * gambo;
        // Il fiore è un dischetto inclinato verso chi guarda.
        vec3 versoCam = normalize(uCam - centro);
        vec3 n = normalize(mix(vec3(0.0, 1.0, 0.0), versoCam, 0.55));
        vec3 a = normalize(cross(n, vec3(0.0, 0.0, 1.0)));
        vec3 b = cross(n, a);
        vec3 p = centro + (a * position.x + b * position.z) * raggio;
        float cuore = 1.0 - step(0.5, length(position.xz));
        vec3 c = mix(aColore, vec3(1.0, 0.78, 0.1), cuore);
        c = mix(c, vec3(0.85, 0.95, 1.0), stato.g * 0.6);
        vColore = c;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        vDistanza = -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: materialeErba.fragmentShader,
  });
  const fiori = new THREE.Mesh(fiore, materialeFiori);
  fiori.frustumCulled = false;

  return {
    oggetti: [erba, fiori],
    aggiorna(camera) {
      uniformi.uCam.value.copy(camera);
    },
  };
}
