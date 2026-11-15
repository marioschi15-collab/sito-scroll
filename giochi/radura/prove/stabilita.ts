/**
 * Prova senza grafica: il villaggio deve restare in piedi da solo.
 * Lasciato a se stesso per sei secondi, quasi nessun pezzo si deve spostare (niente crolli spontanei)
 * e quasi tutti devono essersi fermati (da fermi non costano più calcoli).
 */
import RAPIER from '@dimforge/rapier3d-compat';
import { Pezzi } from '../src/fisica/pezzi.js';
import { costruisciVillaggio, INTONACO, LEGNO, PIETRA, TEGOLA } from '../src/mondo/costruzioni.js';

const NOMI: Record<number, string> = { [PIETRA]: 'pietra', [LEGNO]: 'legno', [INTONACO]: 'intonaco', [TEGOLA]: 'tegola' };

await RAPIER.init();
const fisica = new RAPIER.World({ x: 0, y: -16, z: 0 });
fisica.timestep = 1 / 60;
fisica.createCollider(RAPIER.ColliderDesc.cuboid(200, 1, 200).setTranslation(0, -1, 0).setFriction(0.9));
const mattoni = costruisciVillaggio();
const pezzi = new Pezzi(mattoni, RAPIER, fisica, false);
const inizio = performance.now();
for (let i = 0; i < 360; i++) fisica.step();
const millisecondiPerPasso = (performance.now() - inizio) / 360;
pezzi.sincronizza();
const spostamenti = pezzi.spostamenti();
const mossi = spostamenti.map((d, i) => ({ d, m: mattoni[i]! })).filter((x) => x.d > 0.25);
const perMateriale: Record<string, number> = {};
for (const x of mossi) perMateriale[NOMI[x.m.materiale]!] = (perMateriale[NOMI[x.m.materiale]!] ?? 0) + 1;

console.log(`pezzi: ${pezzi.n}`);
console.log(`spostati di oltre 25 cm dopo 6 secondi: ${mossi.length}`, perMateriale);
console.log(`ancora svegli dopo 6 secondi: ${pezzi.svegli} · ${millisecondiPerPasso.toFixed(2)} ms per passo in media`);
if (process.env.DETTAGLI) {
  for (const x of mossi.slice(0, 40)) {
    console.log(`  ${NOMI[x.m.materiale]} a (${x.m.x.toFixed(1)}, ${x.m.y.toFixed(1)}, ${x.m.z.toFixed(1)}) mosso di ${x.d.toFixed(2)}`);
  }
}

const errori: string[] = [];
if (pezzi.n < 1700 || pezzi.n > 2200) errori.push(`i pezzi dovrebbero essere circa 2000, sono ${pezzi.n}`);
if (pezzi.svegli > pezzi.n * 0.03) errori.push(`dopo 6 secondi ${pezzi.svegli} pezzi si muovono ancora: dovrebbero essersi fermati`);
if (mossi.length > pezzi.n * 0.02) errori.push(`${mossi.length} pezzi crollano da soli: il villaggio non sta in piedi`);
if (errori.length > 0) {
  console.error('\nPROVA FALLITA:\n- ' + errori.join('\n- '));
  process.exit(1);
}
console.log('\nProva superata: il villaggio sta in piedi da solo.');
