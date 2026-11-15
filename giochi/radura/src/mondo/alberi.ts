import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { generatore, rumore } from '../base/matematica.js';
import type { Campo } from './campo.js';
import { altezza } from './terreno.js';

function colora(g: THREE.BufferGeometry, colore: number, variazione = 0): THREE.BufferGeometry {
  const c = new THREE.Color(colore);
  const n = g.attributes.position!.count;
  const dati = new Float32Array(n * 3);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < n; i++) {
    // Più chiaro in alto, più scuro in basso: dà volume senza bisogno di immagini.
    const k = 1 + variazione * (pos.getY(i) > 0 ? 0.5 : -0.5);
    dati[i * 3] = c.r * k;
    dati[i * 3 + 1] = c.g * k;
    dati[i * 3 + 2] = c.b * k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(dati, 3));
  return g;
}

function unisci(parti: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pronte = parti.map((p) => {
    const g = p.index ? p.toNonIndexed() : p;
    g.deleteAttribute('uv');
    return g;
  });
  const unita = mergeGeometries(pronte)!;
  unita.computeVertexNormals();
  return unita;
}

/** Un pino: tronco e tre coni. Alto circa 9 metri. */
export function geometriaPino(): THREE.BufferGeometry {
  const parti = [colora(new THREE.CylinderGeometry(0.22, 0.34, 2.4, 6).translate(0, 1.2, 0), 0x5a3a22)];
  for (let i = 0; i < 3; i++) {
    const cono = new THREE.ConeGeometry(2.3 - i * 0.55, 3.4 - i * 0.4, 7);
    parti.push(colora(cono.translate(0, 3.4 + i * 2.1, 0), i === 2 ? 0x2f6f3a : 0x245a33, 0.5));
  }
  return unisci(parti);
}

/** Un albero a chioma tonda: tronco e ciuffi di foglie. Alto circa 7 metri. */
export function geometriaQuercia(): THREE.BufferGeometry {
  const parti = [colora(new THREE.CylinderGeometry(0.28, 0.5, 3.4, 7).translate(0, 1.7, 0), 0x6a4526)];
  const ciuffi: [number, number, number, number][] = [
    [0, 5.0, 0, 2.3],
    [1.5, 4.2, 0.4, 1.6],
    [-1.3, 4.4, -0.7, 1.7],
    [0.2, 4.1, 1.5, 1.5],
    [-0.4, 6.2, -0.3, 1.5],
    [0.6, 4.3, -1.5, 1.4],
  ];
  for (const [x, y, z, r] of ciuffi) {
    parti.push(colora(new THREE.IcosahedronGeometry(r, 1).translate(x, y, z), 0x4f9a2e, 0.45));
  }
  return unisci(parti);
}

export const materialeAlberi = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

export interface Bosco {
  readonly oggetti: THREE.Object3D[];
  /** Annerisce gli alberi dove il prato è bruciato e li fa rinverdire dove è rifiorito. */
  aggiorna(campo: Campo): void;
}

export function creaBosco(ombre: boolean): Bosco {
  const rnd = generatore(2024);
  const posti: { x: number; z: number; pino: boolean; scala: number }[] = [];
  let tentativi = 0;
  while (posti.length < 320 && tentativi++ < 6000) {
    const a = rnd() * Math.PI * 2;
    const r = 52 + rnd() * rnd() * 220;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (rumore(x * 0.03 + 5, z * 0.03) < 0.42) continue;
    posti.push({ x, z, pino: rumore(x * 0.02, z * 0.02 + 40) > 0.48, scala: 0.7 + rnd() * 0.8 });
  }
  const crea = (geometria: THREE.BufferGeometry, lista: typeof posti): THREE.InstancedMesh => {
    const m = new THREE.InstancedMesh(geometria, materialeAlberi, lista.length);
    const o = new THREE.Object3D();
    lista.forEach((p, i) => {
      o.position.set(p.x, altezza(p.x, p.z) - 0.2, p.z);
      o.rotation.y = rnd() * 6.28;
      o.scale.setScalar(p.scala);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, BIANCO);
    });
    m.castShadow = ombre;
    m.instanceColor!.needsUpdate = true;
    return m;
  };
  const pini = posti.filter((p) => p.pino);
  const querce = posti.filter((p) => !p.pino);
  const gruppi = [
    { mesh: crea(geometriaPino(), pini), lista: pini, neri: new Uint8Array(pini.length) },
    { mesh: crea(geometriaQuercia(), querce), lista: querce, neri: new Uint8Array(querce.length) },
  ];
  return {
    oggetti: gruppi.map((g) => g.mesh),
    aggiorna(campo) {
      for (const g of gruppi) {
        let cambiato = false;
        g.lista.forEach((p, i) => {
          const c = campo.cella(p.x, p.z);
          if (c < 0) return;
          const nero = campo.bruciato[c]! > 0.6 ? 1 : 0;
          if (nero !== g.neri[i]) {
            g.neri[i] = nero;
            g.mesh.setColorAt(i, nero ? CARBONE : BIANCO);
            cambiato = true;
          }
        });
        if (cambiato) g.mesh.instanceColor!.needsUpdate = true;
      }
    },
  };
}

const BIANCO = new THREE.Color(1, 1, 1);
const CARBONE = new THREE.Color(0.09, 0.07, 0.06);
