import * as THREE from 'three';

/**
 * Valori condivisi da tutti i materiali scritti a mano: nebbia, luce generale, tempo.
 * Sono gli stessi oggetti per tutti, così basta cambiarli in un punto solo.
 */
export const atmosfera = {
  nebbiaColore: { value: new THREE.Color(0xbcd7ea) },
  nebbiaDensita: { value: 0.0075 },
  luce: { value: 1 },
  tinta: { value: new THREE.Color(1, 1, 1) },
  tempo: { value: 0 },
};

/** Pezzetto di codice per le schede grafiche: sfuma il colore verso la nebbia con la distanza. */
export const NEBBIA_GLSL = /* glsl */ `
  vec3 conNebbia(vec3 colore, float distanza, vec3 nebbiaColore, float densita) {
    float f = 1.0 - exp(-densita * densita * distanza * distanza);
    return mix(colore, nebbiaColore, clamp(f, 0.0, 1.0));
  }
`;
