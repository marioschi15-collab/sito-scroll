/**
 * Prova senza grafica: tutte le costruzioni del mondo devono restare in piedi da sole.
 * Lasciato a se stesso per sei secondi, quasi nessun pezzo si deve spostare (niente crolli spontanei)
 * e quasi tutti devono essersi fermati (da fermi non costano più calcoli).
 */
import RAPIER from '@dimforge/rapier3d-compat';
import { Pezzi } from '../src/fisica/pezzi.js';
import { costruisciMondo } from '../src/mondo/costruzioni.js';
import { LUOGHI, quotaLuogo } from '../src/mondo/zone.js';


await RAPIER.init();
const fisica = new RAPIER.World({ x: 0, y: -16, z: 0 });
fisica.timestep = 1 / 60;
// Al posto del terreno vero, sotto ogni luogo c'è una piastra piana alla sua quota.
for (const l of LUOGHI) {
  fisica.createCollider(
    RAPIER.ColliderDesc.cuboid(l.raggio + 4, 1, l.raggio + 4).setTranslation(l.x, quotaLuogo(l.id) - 1, l.z).setFriction(0.9),
  );
}
const { mattoni, gruppi } = costruisciMondo();
const pezzi = new Pezzi(mattoni, gruppi, RAPIER, fisica, false);
pezzi.daiVitaATutto();
const inizio = performance.now();
for (let i = 0; i < 360; i++) fisica.step();
const millisecondiPerPasso = (performance.now() - inizio) / 360;
pezzi.sincronizza();
const spostamenti = pezzi.spostamenti();
const mossi = spostamenti.map((d, i) => ({ d, m: mattoni[i]! })).filter((x) => x.d > 0.25);
const perMateriale: Record<string, number> = {};
for (const x of mossi) {
  const nome = LUOGHI[x.m.gruppo]!.id;
  perMateriale[nome] = (perMateriale[nome] ?? 0) + 1;
}

console.log(`pezzi: ${pezzi.n}`);
console.log(`spostati di oltre 25 cm dopo 6 secondi: ${mossi.length}`, perMateriale);
console.log(`ancora svegli dopo 6 secondi: ${pezzi.svegli} · ${millisecondiPerPasso.toFixed(2)} ms per passo in media`);
if (process.env.DETTAGLI) {
  const mucchi = new Map<string, number>();
  for (const x of mossi) {
    const chiave = `${LUOGHI[x.m.gruppo]!.id} (${Math.round(x.m.x / 5) * 5}, ${Math.round(x.m.z / 5) * 5}) mat ${x.m.materiale} y${Math.round(x.m.y)}`;
    mucchi.set(chiave, (mucchi.get(chiave) ?? 0) + 1);
  }
  for (const [chiave, quanti] of [...mucchi].sort((a, b) => b[1] - a[1]).slice(0, 45)) console.log(`  ${quanti} × ${chiave}`);
}
if (process.env.TUTTI) {
  for (const x of mossi.slice(0, 40)) {
    console.log(`  ${LUOGHI[x.m.gruppo]!.id} mat ${x.m.materiale} a (${x.m.x.toFixed(1)}, ${x.m.y.toFixed(1)}, ${x.m.z.toFixed(1)}) mosso di ${x.d.toFixed(2)}`);
  }
}

const errori: string[] = [];
if (pezzi.n < 4000 || pezzi.n > 6500) errori.push(`i pezzi dovrebbero essere tra 4000 e 6500, sono ${pezzi.n}`);
if (pezzi.svegli > pezzi.n * 0.03) errori.push(`dopo 6 secondi ${pezzi.svegli} pezzi si muovono ancora: dovrebbero essersi fermati`);
if (mossi.length > pezzi.n * 0.02) errori.push(`${mossi.length} pezzi crollano da soli: le costruzioni non stanno in piedi`);
if (errori.length > 0) {
  console.error('\nPROVA FALLITA:\n- ' + errori.join('\n- '));
  process.exit(1);
}
console.log('\nProva superata: tutte le costruzioni stanno in piedi da sole.');
