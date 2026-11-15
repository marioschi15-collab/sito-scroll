/**
 * Prova senza grafica: ogni tipo di costruzione del mondo deve restare in piedi da solo.
 * Se ne costruisce una per tipo, ognuna su una piastra piana; lasciate a se stesse per nove secondi,
 * quasi nessun pezzo si deve spostare (niente crolli spontanei) e quasi tutti devono essersi fermati
 * (da fermi non costano più calcoli).
 */
import RAPIER from '@dimforge/rapier3d-compat';
import { Pezzi } from '../src/fisica/pezzi.js';
import { costruisciLuogo } from '../src/mondo/costruzioni.js';
import { TIPI } from '../src/mondo/zone.js';

await RAPIER.init();
const fisica = new RAPIER.World({ x: 0, y: -16, z: 0 });
fisica.timestep = 1 / 60;
const pezzi = new Pezzi(RAPIER, fisica, false);
const tipi = Object.keys(TIPI);
const diChi: string[] = [];
tipi.forEach((tipo, k) => {
  // Ogni costruzione a una quota diversa, come nel mondo vero dove il terreno non è mai a zero.
  const luogo = { tipo, x: k * 150, z: 0, quota: k * 1.5, seme: 100 + k };
  fisica.createCollider(
    RAPIER.ColliderDesc.cuboid(TIPI[tipo]!.raggio + 4, 1, TIPI[tipo]!.raggio + 4).setTranslation(luogo.x, luogo.quota - 1, 0).setFriction(0.9),
  );
  const mattoni = costruisciLuogo(luogo);
  if (!pezzi.aggiungi(mattoni, luogo.x, 0, TIPI[tipo]!.raggio)) throw new Error(`non c'è posto per ${tipo}`);
  for (let i = 0; i < mattoni.length; i++) diChi.push(tipo);
});
pezzi.daiVitaATutto();
const inizio = performance.now();
for (let i = 0; i < 540; i++) fisica.step();
const millisecondiPerPasso = (performance.now() - inizio) / 540;
pezzi.sincronizza();
const spostamenti = pezzi.spostamenti();
const perTipo: Record<string, number> = {};
let mossi = 0;
spostamenti.forEach((d, i) => {
  if (d <= 0.25) return;
  mossi++;
  perTipo[diChi[i]!] = (perTipo[diChi[i]!] ?? 0) + 1;
});

console.log(`tipi di costruzione: ${tipi.length} · pezzi in tutto: ${pezzi.n}`);
console.log(`spostati di oltre 25 cm dopo 9 secondi: ${mossi}`, perTipo);
const svegliPerTipo: Record<string, number> = {};
diChi.forEach((tipo, i) => {
  if (pezzi.sveglio(i)) svegliPerTipo[tipo] = (svegliPerTipo[tipo] ?? 0) + 1;
});
if (pezzi.svegli > 0) console.log('ancora svegli, per tipo:', svegliPerTipo);
console.log(`ancora svegli dopo 9 secondi: ${pezzi.svegli} · ${millisecondiPerPasso.toFixed(2)} ms per passo in media`);

const errori: string[] = [];
if (mossi > pezzi.n * 0.005) errori.push(`${mossi} pezzi crollano da soli: le costruzioni non stanno in piedi`);
if (pezzi.svegli > pezzi.n * 0.03) errori.push(`dopo 9 secondi ${pezzi.svegli} pezzi si muovono ancora: dovrebbero essersi fermati`);
if (errori.length > 0) {
  console.error('\nPROVA FALLITA:\n- ' + errori.join('\n- '));
  process.exit(1);
}
console.log('\nProva superata: tutte le costruzioni stanno in piedi da sole.');
