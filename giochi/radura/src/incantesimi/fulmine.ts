import * as THREE from 'three';
import { anello, bolla, Saetta } from '../effetti/forme.js';
import type { Incantesimo } from '../gioco.js';
import { altezza } from '../mondo/terreno.js';

export const fulmine: Incantesimo = {
  nome: 'Fulmine',
  cosaFa: 'Una saetta dal cielo: colpo secco che spacca e incendia',
  simbolo: '⚡',
  colore: 0xfff06a,
  ricarica: 0.55,
  lancia(g, l) {
    const p = l.bersaglio;
    const cielo = new THREE.Vector3(p.x + (Math.random() - 0.5) * 14, p.y + 70, p.z + (Math.random() - 0.5) * 14);
    g.aggiungi(new Saetta(g, cielo, p.clone(), 0xcfe0ff));
    g.aggiungi(new Saetta(g, cielo, p.clone(), 0xffffff, 0.2, 0.3));
    bolla(g, p, 0xdfe8ff, 3.5, 0.25, 0.8);
    anello(g, new THREE.Vector3(p.x, altezza(p.x, p.z), p.z), 0xcfe0ff, 7, 0.4, 1.4);
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 4 + Math.random() * 16;
      const su = Math.random();
      g.scintille.emetti({
        x: p.x, y: p.y + 0.2, z: p.z, vx: Math.cos(a) * v * (1 - su * 0.5), vy: su * v, vz: Math.sin(a) * v * (1 - su * 0.5),
        vita: 0.3 + Math.random() * 0.6, dim: 0.35, dimFine: 0.03, r: 1.6, g: 1.7, b: 2, alfa: 0.9, gravita: 22, attrito: 0.6,
      });
    }
    g.pezzi.spinta(p.x, p.y + 0.5, p.z, 6, 17, 0.25);
    g.pezzi.accendiVicini(p.x, p.y, p.z, 1.8);
    if (p.y - altezza(p.x, p.z) < 2) g.campo.accendi(p.x, p.z, 1.6, 9);
    g.lampi.lampo(new THREE.Vector3(p.x, p.y + 4, p.z), 0xdfe8ff, 110, 0.45);
    g.umore(0.2, 1.3, 1.3, 1.5);
    g.scossa(0.7, p);
    g.suoni.saetta();
  },
};
