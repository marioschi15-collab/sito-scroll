import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { generatore, rumore } from '../base/matematica.js';
import type { Campo } from './campo.js';
import { altezza, LATO_ZOLLA } from './terreno.js';
import { DESERTO, GHIACCIO, lava, luoghiVicini, PALUDE, pesiZone, PRATO, QUOTA_ACQUA, sorte, VULCANO } from './zone.js';

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
export function geometriaQuercia(dettaglio = 1): THREE.BufferGeometry {
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
    parti.push(colora(new THREE.IcosahedronGeometry(r, dettaglio).translate(x, y, z), 0x4f9a2e, 0.45));
  }
  return unisci(parti);
}

/** Un pino carico di neve. */
function geometriaPinoInnevato(): THREE.BufferGeometry {
  const parti = [colora(new THREE.CylinderGeometry(0.22, 0.34, 2.4, 6).translate(0, 1.2, 0), 0x4a3424)];
  for (let i = 0; i < 3; i++) {
    const cono = new THREE.ConeGeometry(2.3 - i * 0.55, 3.4 - i * 0.4, 7);
    parti.push(colora(cono.translate(0, 3.4 + i * 2.1, 0), i === 0 ? 0x9fb8b4 : 0xe9f1f6, 0.25));
  }
  return unisci(parti);
}

/** Un cactus a candelabro. */
function geometriaCactus(): THREE.BufferGeometry {
  const verde = 0x4f8a45;
  return unisci([
    colora(new THREE.CylinderGeometry(0.34, 0.4, 3.6, 7).translate(0, 1.8, 0), verde, 0.3),
    colora(new THREE.SphereGeometry(0.34, 7, 4).translate(0, 3.6, 0), verde),
    colora(new THREE.CylinderGeometry(0.2, 0.2, 0.9, 6).rotateZ(Math.PI / 2).translate(0.6, 1.7, 0), verde),
    colora(new THREE.CylinderGeometry(0.2, 0.22, 1.3, 6).translate(1.0, 2.3, 0), verde, 0.3),
    colora(new THREE.CylinderGeometry(0.18, 0.18, 0.8, 6).rotateZ(Math.PI / 2).translate(-0.55, 2.3, 0), verde),
    colora(new THREE.CylinderGeometry(0.18, 0.2, 1.0, 6).translate(-0.9, 2.8, 0), verde, 0.3),
  ]);
}

/** Un masso: prende il colore del posto in cui sta. */
function geometriaRoccia(): THREE.BufferGeometry {
  return unisci([colora(new THREE.IcosahedronGeometry(1, 1).scale(1.5, 0.95, 1.2).translate(0, 0.5, 0), 0xb4b0aa, 0.35)]);
}

/** Un albero spoglio, con tre rami storti. */
function geometriaAlberoMorto(): THREE.BufferGeometry {
  const grigio = 0x5a4e44;
  return unisci([
    colora(new THREE.CylinderGeometry(0.13, 0.4, 5.2, 6).translate(0, 2.6, 0), grigio, 0.2),
    colora(new THREE.CylinderGeometry(0.05, 0.13, 2.4, 5).translate(0, 1.2, 0).rotateZ(0.9).translate(0, 3.0, 0), grigio),
    colora(new THREE.CylinderGeometry(0.05, 0.12, 2.0, 5).translate(0, 1.0, 0).rotateZ(-0.8).rotateY(1.2).translate(0, 3.8, 0), grigio),
    colora(new THREE.CylinderGeometry(0.04, 0.1, 1.7, 5).translate(0, 0.85, 0).rotateX(0.9).translate(0, 4.3, 0), grigio),
  ]);
}

/** Un fungo gigante dal cappello luminoso. */
function geometriaFungo(): THREE.BufferGeometry {
  return unisci([
    colora(new THREE.CylinderGeometry(0.26, 0.4, 2.4, 7).translate(0, 1.2, 0), 0xd9d2bd, 0.2),
    colora(new THREE.SphereGeometry(1.6, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.62, 1).translate(0, 2.3, 0), 0xffffff, 0.5),
    colora(new THREE.CircleGeometry(1.6, 9).rotateX(Math.PI / 2).translate(0, 2.3, 0), 0x6a6a72),
  ]);
}

/** Una guglia di roccia nera. */
function geometriaGuglia(): THREE.BufferGeometry {
  return unisci([
    colora(new THREE.ConeGeometry(1.5, 8, 5).translate(0, 3.6, 0), 0x2c2628, 0.5),
    colora(new THREE.ConeGeometry(0.8, 4, 5).translate(1.1, 1.8, 0.4), 0x241f21, 0.5),
  ]);
}

export const materialeAlberi = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

export interface Bosco {
  readonly oggetti: THREE.Object3D[];
  /**
   * Fa nascere piante e rocce attorno a un punto e toglie quelle rimaste lontane; annerisce quelle che stanno
   * dove il prato è bruciato.
   */
  aggiorna(campo: Campo, x: number, z: number): void;
}

interface Pianta {
  tipo: number;
  x: number;
  y: number;
  z: number;
  scala: number;
  giro: number;
  tinta: THREE.Color;
}

const BIANCO = new THREE.Color(1, 1, 1);
const CARBONE = new THREE.Color(0.09, 0.07, 0.06);
const PINO = 0, QUERCIA = 1, PINO_INNEVATO = 2, CACTUS = 3, ROCCIA = 4, ALBERO_MORTO = 5, FUNGO = 6, GUGLIA = 7;
/** La quercia vista da lontano: stessa forma, un quarto dei triangoli. */
const QUERCIA_LONTANA = 8;
/** Entro quante zolle da chi gioca una pianta fa ombra e si disegna per intero. */
const VICINO = 2;
/** Fin dove (in zolle) si vedono piante attorno a chi gioca. */
const VISTA = 6;
const CAPIENZA = 1800;

/** Tutta la vegetazione e le rocce: ogni terra ha le sue, e nascono zolla per zolla mentre si cammina. */
export function creaBosco(ombre: boolean): Bosco {
  const tinte = {
    sabbia: new THREE.Color(0xd9b98a), ghiaccio: new THREE.Color(0xc4e2f4), lavica: new THREE.Color(0x4a3f3d),
    viola: new THREE.Color(0xa56bff).multiplyScalar(1.25), acqua: new THREE.Color(0x4fe0c8).multiplyScalar(1.2),
    ombra: new THREE.Color(0x6f8f78), bruciato: new THREE.Color(0x3a3230),
  };
  const pesi = new Float32Array(5);
  const zolle = new Map<string, Pianta[]>();

  /** Le piante di una zolla: sempre le stesse, perché la sorte dipende solo da dove sta la zolla. */
  const semina = (cx: number, cz: number): Pianta[] => {
    const rnd = generatore(Math.floor(sorte(cx, cz, 9) * 4294967295));
    const piante: Pianta[] = [];
    for (let tentativo = 0; tentativo < 22; tentativo++) {
      const x = (cx + rnd()) * LATO_ZOLLA;
      const z = (cz + rnd()) * LATO_ZOLLA;
      const dado = rnd();
      const scala = rnd();
      const giro = rnd() * 6.28;
      const colore = rnd();
      if (luoghiVicini(x, z, 5).length > 0) continue;
      pesiZone(x, z, pesi);
      let zona = 0;
      for (let k = 1; k < 5; k++) if (pesi[k]! > pesi[zona]!) zona = k;
      const y = altezza(x, z);
      const inAcqua = y < QUOTA_ACQUA + 0.15;
      const bosco = rumore(x * 0.03 + 5, z * 0.03);
      const metti = (tipo: number, s: number, tinta = BIANCO): void => {
        piante.push({ tipo, x, y: y - 0.25, z, scala: s, giro, tinta });
      };
      if (zona === PRATO) {
        if (inAcqua || bosco < 0.44 || dado > 0.75) continue;
        metti(rumore(x * 0.02, z * 0.02 + 40) > 0.48 ? PINO : QUERCIA, 0.7 + scala * 0.8);
      } else if (zona === DESERTO) {
        if (inAcqua) continue;
        if (dado < 0.1) metti(CACTUS, 0.7 + scala * 0.7);
        else if (dado < 0.16) metti(ROCCIA, 0.6 + scala * 1.6, tinte.sabbia);
      } else if (zona === GHIACCIO) {
        if (inAcqua) continue;
        if (bosco > 0.42 && dado < 0.55) metti(PINO_INNEVATO, 0.7 + scala * 0.9);
        else if (dado > 0.94) metti(ROCCIA, 0.8 + scala * 2, tinte.ghiaccio);
      } else if (zona === PALUDE) {
        if (dado < 0.24) metti(ALBERO_MORTO, 0.8 + scala * 0.9);
        else if (inAcqua) continue;
        else if (dado < 0.34 && bosco > 0.5) metti(FUNGO, 0.5 + scala * 1.1, colore < 0.5 ? tinte.viola : tinte.acqua);
        else if (dado < 0.5 && bosco > 0.4) metti(QUERCIA, 0.8 + scala * 0.7, tinte.ombra);
      } else if (zona === VULCANO) {
        if (inAcqua || lava(x, z, pesi[VULCANO]!) > 0.05) continue;
        if (dado < 0.11) metti(GUGLIA, 0.6 + scala * 1.3);
        else if (dado < 0.19) metti(ALBERO_MORTO, 0.7 + scala * 0.6, tinte.bruciato);
        else if (dado < 0.27) metti(ROCCIA, 0.7 + scala * 1.8, tinte.lavica);
      }
    }
    return piante;
  };

  const geometrie = [
    geometriaPino(), geometriaQuercia(), geometriaPinoInnevato(), geometriaCactus(),
    geometriaRoccia(), geometriaAlberoMorto(), geometriaFungo(), geometriaGuglia(), geometriaQuercia(0),
  ];
  const mesh = geometrie.map((g) => {
    const m = new THREE.InstancedMesh(g, materialeAlberi, CAPIENZA);
    m.count = 0;
    m.castShadow = ombre;
    m.receiveShadow = ombre;
    m.frustumCulled = false;
    m.setColorAt(0, BIANCO);
    return m;
  });
  // La mappa delle ombre copre meno di cento metri: per quella passata bastano le piante vicine, che stanno
  // in testa all'elenco di ogni tipo. Prima si elaboravano tutte quante, fino a 340 metri, per niente.
  const vicine = mesh.map(() => 0);
  const quante = mesh.map(() => 0);
  mesh.forEach((m, i) => {
    m.onBeforeShadow = () => {
      m.count = vicine[i]!;
    };
    m.onAfterShadow = () => {
      m.count = quante[i]!;
    };
  });
  mesh[QUERCIA_LONTANA]!.castShadow = false;
  const o = new THREE.Object3D();
  let ultimoCx = NaN;
  let ultimoCz = NaN;

  return {
    oggetti: mesh,
    aggiorna(campo, x, z) {
      const ccx = Math.floor(x / LATO_ZOLLA);
      const ccz = Math.floor(z / LATO_ZOLLA);
      let cambiato = false;
      if (ccx !== ultimoCx || ccz !== ultimoCz) {
        ultimoCx = ccx;
        ultimoCz = ccz;
        for (const chiave of zolle.keys()) {
          const [cx, cz] = chiave.split(',').map(Number) as [number, number];
          if (Math.abs(cx - ccx) > VISTA + 1 || Math.abs(cz - ccz) > VISTA + 1) zolle.delete(chiave);
        }
        for (let dz = -VISTA; dz <= VISTA; dz++) {
          for (let dx = -VISTA; dx <= VISTA; dx++) {
            const chiave = `${ccx + dx},${ccz + dz}`;
            if (!zolle.has(chiave)) zolle.set(chiave, semina(ccx + dx, ccz + dz));
          }
        }
        cambiato = true;
      }
      // Si riscrivono posizioni e colori di tutte le piante in vista: sono poche migliaia, costa poco.
      // Due giri: prima le zolle vicine (finiscono in testa agli elenchi), poi le lontane.
      quante.fill(0);
      for (let giro = 0; giro < 2; giro++) {
        for (const [chiave, piante] of zolle) {
          const virgola = chiave.indexOf(',');
          const dx = Math.abs(Number(chiave.slice(0, virgola)) - ccx);
          const dz = Math.abs(Number(chiave.slice(virgola + 1)) - ccz);
          const vicina = dx <= VICINO && dz <= VICINO;
          if (vicina !== (giro === 0)) continue;
          for (const p of piante) {
            const tipo = p.tipo === QUERCIA && !vicina ? QUERCIA_LONTANA : p.tipo;
            const n = quante[tipo]!;
            if (n >= CAPIENZA) continue;
            quante[tipo] = n + 1;
            const m = mesh[tipo]!;
            if (cambiato) {
              o.position.set(p.x, p.y, p.z);
              o.rotation.set(0, p.giro, 0);
              o.scale.setScalar(p.scala);
              o.updateMatrix();
              m.setMatrixAt(n, o.matrix);
            }
            const c = campo.cella(p.x, p.z);
            m.setColorAt(n, c >= 0 && campo.bruciato[c]! > 0.6 ? CARBONE : p.tinta);
          }
        }
        if (giro === 0) for (let i = 0; i < quante.length; i++) vicine[i] = quante[i]!;
      }
      mesh.forEach((m, i) => {
        m.count = quante[i]!;
        if (cambiato) m.instanceMatrix.needsUpdate = true;
        m.instanceColor!.needsUpdate = true;
      });
    },
  };
}
