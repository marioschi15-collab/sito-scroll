import * as THREE from 'three';
import { anello, bolla, scia } from '../effetti/forme.js';
import type { Incantesimo } from '../gioco.js';
import { altezza } from '../mondo/terreno.js';

const RAGGIO = 9;

export const gelo: Incantesimo = {
  nome: 'Gelo',
  cosaFa: 'Un’ondata di ghiaccio: spegne gli incendi e blocca ciò che cade',
  simbolo: '❄️',
  colore: 0x7fd8ff,
  ricarica: 0.9,
  lancia(g, l) {
    const p = l.bersaglio;
    const suolo = new THREE.Vector3(p.x, altezza(p.x, p.z), p.z);
    scia(g, l.origine, p, 0.6, 1.1, 1.6);
    g.campo.gela(p.x, p.z, RAGGIO);
    g.pezzi.gela(p.x, p.y, p.z, RAGGIO);
    anello(g, suolo, 0x9fe4ff, RAGGIO, 0.7);
    bolla(g, p, 0x7fd0ff, RAGGIO * 0.8, 0.5, 0.45);
    for (let i = 0; i < 150; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 4 + Math.random() * 12;
      g.scintille.emetti({
        x: p.x, y: suolo.y + 0.3 + Math.random() * 0.6, z: p.z,
        vx: Math.cos(a) * v, vy: Math.random() * 2.5, vz: Math.sin(a) * v,
        vita: 0.5 + Math.random() * 0.7, dim: 0.5 + Math.random() * 0.8, dimFine: 0.05,
        r: 0.7, g: 1.1, b: 1.5, alfa: 0.6, attrito: 2.2,
      });
    }
    // Nevischio che resta sospeso sopra la zona gelata.
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * RAGGIO;
      g.scintille.emetti({
        x: p.x + Math.cos(a) * r, y: suolo.y + 1 + Math.random() * 5, z: p.z + Math.sin(a) * r,
        vx: (Math.random() - 0.5) * 0.5, vy: -0.5 - Math.random(), vz: (Math.random() - 0.5) * 0.5,
        vita: 1.5 + Math.random() * 2, dim: 0.16, dimFine: 0.1, r: 1.2, g: 1.4, b: 1.6, alfa: 0.9,
      });
    }
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      g.fumo.emetti({
        x: p.x + Math.cos(a) * 3, y: suolo.y + 0.5, z: p.z + Math.sin(a) * 3,
        vx: Math.cos(a) * 3, vy: 0.4, vz: Math.sin(a) * 3,
        vita: 2 + Math.random(), dim: 2, dimFine: 6, r: 0.85, g: 0.93, b: 1, alfa: 0.3, attrito: 1.2,
      });
    }
    g.lampi.lampo(new THREE.Vector3(p.x, p.y + 2, p.z), 0x8fd8ff, 26, 0.7);
    g.suoni.gelo();
  },
};
