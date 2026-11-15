/**
 * Prove senza grafica di tre regole del gioco, nate da difetti trovati in revisione:
 * 1) il gelo sul prato deve restare anche se lo si lancia dopo una lunga pausa;
 * 2) chi cammina contro il muro di una casa si ferma, non la butta giù;
 * 3) i pezzi di un luogo tolto dal mondo non restano "in fiamme" né "gelati" per chi prende il loro posto.
 */
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { Comandi } from '../src/comandi.js';
import { Particelle } from '../src/effetti/particelle.js';
import { Pezzi } from '../src/fisica/pezzi.js';
import { Giocatore } from '../src/giocatore.js';
import { Campo } from '../src/mondo/campo.js';
import { costruisciLuogo } from '../src/mondo/costruzioni.js';

const errori: string[] = [];

// --- 1) il gelo dopo una lunga pausa ---
{
  const campo = new Campo();
  for (let i = 0; i < 60 * 60; i++) campo.aggiorna(1 / 60);
  campo.gela(10, 10, 9);
  campo.aggiorna(1 / 60);
  const gelo = campo.gelo[campo.cella(10, 10)]!;
  console.log(`gelo al centro, un fotogramma dopo il lancio (a un minuto dall'avvio): ${gelo.toFixed(2)}`);
  if (gelo < 0.9) errori.push(`il gelo si scioglie subito: resta ${gelo.toFixed(2)} invece di 1`);
}

await RAPIER.init();
const fisica = new RAPIER.World({ x: 0, y: -16, z: 0 });
fisica.timestep = 1 / 60;
fisica.createCollider(RAPIER.ColliderDesc.cuboid(60, 1, 60).setTranslation(0, -1, 0).setFriction(0.9));
const pezzi = new Pezzi(RAPIER, fisica, false);
const villaggio = pezzi.aggiungi(costruisciLuogo({ tipo: 'villaggio', x: 0, z: 0, quota: 0, seme: 11 }), 0, 0, 48)!;
pezzi.daiVitaATutto();
const campo = new Campo();
const scintille = new Particelle(10, true);
const fumo = new Particelle(10, false);
const camera = new THREE.PerspectiveCamera();
const giocatore = new Giocatore(RAPIER, fisica);
const comandi = { avanti: 0, lato: 0, corri: false, salta: false, saltoSingolo: false, guardaX: 0, guardaY: 0 } as unknown as Comandi;
const scorri = (secondi: number): void => {
  for (let i = 0; i < secondi * 60; i++) {
    giocatore.aggiorna(1 / 60, comandi, camera, 0);
    fisica.step();
    pezzi.sincronizza();
    pezzi.aggiorna(1 / 60, campo, scintille, fumo);
  }
};

// --- 2) correre contro il muro di una casa ---
{
  scorri(5);
  // La casa in (8, -7) ha il muro davanti a z = -4,7; in x = 10 non ci sono né porta né finestre.
  // Si guarda solo la casa: altrove nel villaggio qualche pezzo si assesta ancora di qualche centimetro per conto suo.
  const dellaCasa = (): number[] => pezzi.spostamenti().filter((_, i) => Math.abs(pezzi.pos[i * 3]! - 8) < 5 && Math.abs(pezzi.pos[i * 3 + 2]! + 7) < 4);
  const prima = dellaCasa();
  giocatore.posizione.set(10, 0.9, 1);
  giocatore.imbardata = 0;
  scorri(0.5);
  comandi.avanti = 1;
  comandi.corri = true;
  scorri(1.2);
  comandi.avanti = 0;
  const mossi = dellaCasa().filter((d, i) => d - prima[i]! > 0.05).length;
  console.log(`di corsa contro un muro: ci si ferma a z = ${giocatore.posizione.z.toFixed(2)}, pezzi della casa spostati ${mossi}`);
  if (mossi > 0) errori.push(`correndo contro il muro si spostano ${mossi} pezzi: la casa non deve muoversi`);
  if (giocatore.posizione.z < -4.5) errori.push(`chi gioca attraversa il muro: arriva a z = ${giocatore.posizione.z.toFixed(2)}`);
  if (giocatore.posizione.z > -3.5) errori.push(`chi gioca non è arrivato al muro (z = ${giocatore.posizione.z.toFixed(2)}): la prova non prova niente`);
}

// --- 3) un luogo tolto non lascia strascichi a chi prende il suo posto ---
{
  pezzi.accendiVicini(-22, 2, 7, 6);
  pezzi.gela(8, 2, -7, 6);
  scorri(0.5);
  const inFiamme = pezzi.inFiamme;
  pezzi.togli(villaggio);
  const borgo = pezzi.aggiungi(costruisciLuogo({ tipo: 'borgo', x: 0, z: 0, quota: 0, seme: 5 }), 0, 0, 21)!;
  pezzi.daiVitaATutto();
  scorri(8);
  const mossi = pezzi.spostamenti().filter((d) => d > 0.25).length;
  console.log(`villaggio tolto mentre ${inFiamme} pezzi bruciavano, borgo al suo posto: in fiamme ${pezzi.inFiamme}, spostati ${mossi}, svegli ${pezzi.svegli}`);
  if (inFiamme === 0) errori.push('la prova non prova niente: nel villaggio non bruciava nessun pezzo');
  if (pezzi.inFiamme > 0) errori.push(`${pezzi.inFiamme} pezzi del nuovo luogo risultano in fiamme senza che nessuno li abbia accesi`);
  if (mossi > 0) errori.push(`${mossi} pezzi del nuovo luogo si sono spostati da soli`);
  if (borgo.fin !== borgo.a) errori.push('il nuovo luogo non ha preso vita per intero');
}

if (errori.length > 0) {
  console.error('\nPROVA FALLITA:\n- ' + errori.join('\n- '));
  process.exit(1);
}
console.log('\nProva superata: gelo, muri e cambio di luogo si comportano bene.');
