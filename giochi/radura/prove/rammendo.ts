/**
 * Prova senza grafica dell'incantesimo Rammendo: si butta giù una casa del villaggio, la si rammenda,
 * e dopo qualche secondo deve essere di nuovo in piedi, pezzo per pezzo al suo posto.
 */
import RAPIER from '@dimforge/rapier3d-compat';
import { Particelle } from '../src/effetti/particelle.js';
import { Pezzi } from '../src/fisica/pezzi.js';
import { Campo } from '../src/mondo/campo.js';
import { costruisciLuogo } from '../src/mondo/costruzioni.js';

await RAPIER.init();
const fisica = new RAPIER.World({ x: 0, y: -16, z: 0 });
fisica.timestep = 1 / 60;
fisica.createCollider(RAPIER.ColliderDesc.cuboid(52, 1, 52).setTranslation(0, -1, 0).setFriction(0.9));
const mattoni = costruisciLuogo({ tipo: 'villaggio', x: 0, z: 0, quota: 0, seme: 11 });
const pezzi = new Pezzi(RAPIER, fisica, false);
pezzi.aggiungi(mattoni, 0, 0, 48);
pezzi.daiVitaATutto();
const campo = new Campo();
const scintille = new Particelle(10, true);
const fumo = new Particelle(10, false);
const scorri = (secondi: number): void => {
  for (let i = 0; i < secondi * 60; i++) {
    fisica.step();
    pezzi.sincronizza();
    pezzi.aggiorna(1 / 60, campo, scintille, fumo);
  }
};
// La casa dal tetto verde del villaggio sta in (-22, 7).
const dentro = mattoni.map((m, i) => (Math.hypot(m.x + 22, m.z - 7) < 8 ? i : -1)).filter((i) => i >= 0);
const fuoriPosto = (): number => {
  const d = pezzi.spostamenti();
  return dentro.filter((i) => d[i]! > 0.3).length;
};

scorri(4);
const allInizio = fuoriPosto();
pezzi.spinta(-22, 1, 7, 9, 20, 0.5);
scorri(6);
const dopoLoScoppio = fuoriPosto();
const rammendati = pezzi.rammenda(-22, 7, 11);
scorri(1.5);
const appenaRammendata = fuoriPosto();
scorri(6);
const allaFine = fuoriPosto();

console.log(`pezzi della casa: ${dentro.length}`);
console.log(`fuori posto: all'inizio ${allInizio}, dopo lo scoppio ${dopoLoScoppio}, appena rammendata ${appenaRammendata}, sei secondi dopo ${allaFine}`);
console.log(`pezzi richiamati dal rammendo: ${rammendati}`);

const errori: string[] = [];
if (dopoLoScoppio < dentro.length * 0.5) errori.push('lo scoppio non ha buttato giù la casa: la prova non prova niente');
if (appenaRammendata > 0) errori.push(`appena rammendata, ${appenaRammendata} pezzi non sono al loro posto`);
if (allaFine > dentro.length * 0.03) errori.push(`la casa rammendata non regge: ${allaFine} pezzi sono caduti di nuovo`);
if (errori.length > 0) {
  console.error('\nPROVA FALLITA:\n- ' + errori.join('\n- '));
  process.exit(1);
}
console.log('\nProva superata: la casa rammendata resta in piedi.');
