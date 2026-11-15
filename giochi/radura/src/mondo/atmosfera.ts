import * as THREE from 'three';

/**
 * Valori condivisi da tutti i materiali scritti a mano: nebbia, luce generale, tempo.
 * Sono gli stessi oggetti per tutti, così basta cambiarli in un punto solo.
 */
export const atmosfera = {
  nebbiaColore: { value: new THREE.Color(0xbcd7ea) },
  cieloAlto: { value: new THREE.Color(0x2a6bdb) },
  nebbiaDensita: { value: 0.0075 },
  luce: { value: 1 },
  tinta: { value: new THREE.Color(1, 1, 1) },
  tempo: { value: 0 },
};

/** Le ombre delle nuvole che scorrono sul terreno: un numero tra 0,7 (ombra) e 1 (sole). */
export const NUBI_GLSL = /* glsl */ `
  float ombraNubi(vec2 w, float t) {
    vec2 p = w * 0.011 + vec2(t * 0.012, t * 0.004);
    float n = sin(p.x * 1.7 + sin(p.y * 1.3)) * sin(p.y * 1.9 + sin(p.x * 0.7)) * 0.5 + 0.5;
    return mix(0.68, 1.0, smoothstep(0.25, 0.6, n));
  }
`;

/** Pezzetto di codice per le schede grafiche: sfuma il colore verso la nebbia con la distanza. */
export const NEBBIA_GLSL = /* glsl */ `
  vec3 conNebbia(vec3 colore, float distanza, vec3 nebbiaColore, float densita) {
    float f = 1.0 - exp(-densita * densita * distanza * distanza);
    return mix(colore, nebbiaColore, clamp(f, 0.0, 1.0));
  }
`;
