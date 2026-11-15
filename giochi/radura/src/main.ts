import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { scegliQualita } from './base/qualita.js';
import { Bastone } from './bastone.js';
import { Comandi } from './comandi.js';
import { Lampi } from './effetti/lampi.js';
import { Particelle, scalaPunti } from './effetti/particelle.js';
import { Pezzi } from './fisica/pezzi.js';
import { Giocatore } from './giocatore.js';
import type { Effetto, Gioco } from './gioco.js';
import { INCANTESIMI } from './incantesimi/elenco.js';
import { Interfaccia } from './interfaccia.js';
import { creaBosco } from './mondo/alberi.js';
import { AlberiMagici } from './mondo/alberiMagici.js';
import { atmosfera } from './mondo/atmosfera.js';
import { Campo } from './mondo/campo.js';
import { creaCielo, DIREZIONE_SOLE } from './mondo/cielo.js';
import { costruisciVillaggio } from './mondo/costruzioni.js';
import { creaPrato } from './mondo/erba.js';
import { altezza, creaTerreno } from './mondo/terreno.js';
import { Suoni } from './suoni.js';

const NEBBIA = new THREE.Color(0xbcd7ea);
const PASSO_FISICA = 1 / 60;

async function avvia(): Promise<void> {
  const q = scegliQualita();
  const ui = new Interfaccia(INCANTESIMI, q.telefono);
  await RAPIER.init();

  // --- schermo ---
  const renderer = new THREE.WebGLRenderer({ canvas: ui.tela, antialias: !q.bagliore, powerPreference: 'high-performance' });
  renderer.setPixelRatio(q.densitaPixel);
  renderer.shadowMap.enabled = q.ombre;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scena = new THREE.Scene();
  scena.fog = new THREE.FogExp2(NEBBIA.getHex(), atmosfera.nebbiaDensita.value);
  const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 900);
  scena.add(camera);

  const luceCielo = new THREE.HemisphereLight(0xd6e8ff, 0x70804e, 2.1);
  const sole = new THREE.DirectionalLight(0xfff1dc, 3.1);
  scena.add(luceCielo, sole, sole.target);
  if (q.ombre) {
    sole.castShadow = true;
    sole.shadow.mapSize.set(2048, 2048);
    const c = sole.shadow.camera;
    c.left = c.bottom = -48;
    c.right = c.top = 48;
    c.near = 1;
    c.far = 220;
    sole.shadow.bias = -0.0006;
    sole.shadow.normalBias = 0.06;
  }
  const luceFuoco = new THREE.PointLight(0xff7a2a, 0, 45, 1.3);
  scena.add(luceFuoco);

  // --- mondo ---
  const fisica = new RAPIER.World({ x: 0, y: -16, z: 0 });
  fisica.timestep = PASSO_FISICA;
  const campo = new Campo();
  const terreno = creaTerreno(RAPIER, fisica, campo, q.ombre);
  const prato = creaPrato(q, campo, terreno.altezze);
  const bosco = creaBosco(q.ombre);
  const pezzi = new Pezzi(costruisciVillaggio(), RAPIER, fisica, q.ombre);
  const scintille = new Particelle(q.scintille, true);
  const fumo = new Particelle(q.fumo, false);
  const alberi = new AlberiMagici(scena, RAPIER, fisica, q.ombre);
  scena.add(creaCielo(), terreno.mesh, ...prato.oggetti, ...bosco.oggetti, pezzi.mesh, fumo.punti, scintille.punti);

  const giocatore = new Giocatore(RAPIER, fisica);
  const bastone = new Bastone();
  camera.add(bastone.gruppo);
  const suoni = new Suoni();
  const lampi = new Lampi(scena, q.telefono ? 2 : 3);
  const comandi = new Comandi(ui.tela, ui.leva, ui.pomello);

  const effetti: Effetto[] = [];
  let scossa = 0;
  const umore = { buio: 0, r: 1, g: 1, b: 1 };
  const umoreVero = { buio: 0, tinta: new THREE.Color(1, 1, 1) };
  const g: Gioco = {
    R: RAPIER, fisica, scena, camera, corpoGiocatore: giocatore.corpo, pezzi, campo, scintille, fumo, lampi, suoni, alberi,
    scossa(forza, dove) {
      const d = dove.distanceTo(camera.position);
      scossa = Math.max(scossa, forza * Math.min(1, 14 / (d + 1)));
    },
    umore(buio, r, gg, b) {
      if (buio < umore.buio) return;
      umore.buio = buio;
      umore.r = r;
      umore.g = gg;
      umore.b = b;
    },
    aggiungi(e) {
      effetti.push(e);
    },
  };

  // --- bagliore attorno alle cose luminose (solo al computer) ---
  let compositore: EffectComposer | null = null;
  if (q.bagliore) {
    const bersaglio = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
    compositore = new EffectComposer(renderer, bersaglio);
    compositore.addPass(new RenderPass(scena, camera));
    compositore.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.28, 0.4, 1.0));
    compositore.addPass(new OutputPass());
  }

  let stretto = false;
  const misura = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    stretto = w < h;
    camera.aspect = w / h;
    camera.fov = stretto ? 84 : 72;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    compositore?.setPixelRatio(q.densitaPixel);
    compositore?.setSize(w, h);
    scalaPunti.value = (h * q.densitaPixel) / (2 * Math.tan((camera.fov * Math.PI) / 360));
  };
  misura();
  window.addEventListener('resize', misura);

  // --- incantesimi ---
  let scelto = 0;
  const attese = INCANTESIMI.map(() => 0);
  const scegli = (i: number): void => {
    if (i < 0 || i >= INCANTESIMI.length) return;
    scelto = i;
    ui.scegli(i);
    bastone.coloreMagia(INCANTESIMI[i]!.colore);
  };
  scegli(0);
  ui.onScelta = scegli;
  comandi.onScelta = scegli;
  comandi.onScorri = (verso) => scegli((scelto + verso + INCANTESIMI.length) % INCANTESIMI.length);

  const origine = new THREE.Vector3();
  const direzione = new THREE.Vector3();
  const bersaglio = new THREE.Vector3();
  const mira = (): boolean => {
    camera.getWorldDirection(direzione);
    const colpo = fisica.castRay(
      new RAPIER.Ray(camera.position, direzione), 95, true, undefined, undefined, undefined, giocatore.corpo,
    );
    if (colpo) {
      bersaglio.copy(camera.position).addScaledVector(direzione, colpo.timeOfImpact);
      return pezzi.indiceDi(colpo.collider) < 0;
    }
    // Mirino nel cielo: l'incantesimo cade sul prato, una quarantina di metri più avanti.
    bersaglio.copy(camera.position).addScaledVector(direzione, 38);
    bersaglio.y = altezza(bersaglio.x, bersaglio.z);
    return true;
  };
  const lancia = (indice: number): void => {
    const magia = INCANTESIMI[indice]!;
    camera.updateMatrixWorld();
    const aTerra = mira();
    bastone.punta(origine);
    magia.lancia(g, { origine: origine.clone(), bersaglio: bersaglio.clone(), direzione: direzione.clone(), aTerra });
    attese[indice] = magia.ricarica;
    bastone.colpo();
  };

  const ricostruisci = (): void => {
    pezzi.ricostruisci();
    campo.azzera();
    alberi.azzera();
    suoni.ricostruzione();
  };
  comandi.onRicostruisci = ricostruisci;
  ui.pulsanteRicostruisci.addEventListener('click', () => {
    ricostruisci();
    ui.pulsanteRicostruisci.blur();
  });
  comandi.pulsante(ui.pulsanteLancia, (giu) => (comandi.lancia = giu));
  comandi.pulsante(ui.pulsanteSalta, (giu) => (comandi.salta = giu));

  ui.onEntra = () => {
    suoni.avvia();
    comandi.attivi = true;
    ui.mostraIngresso(false);
    if (!q.telefono) comandi.aggancia();
  };
  comandi.onPausa = () => {
    comandi.attivi = false;
    comandi.lancia = false;
    comandi.avanti = comandi.lato = 0;
    ui.mostraIngresso(true);
  };

  // --- il giro che si ripete a ogni fotogramma ---
  let ultimoIstante = performance.now();
  let accumulo = 0;
  let attesaStato = 0;
  let attesaLuce = 0;
  const v = new THREE.Vector3();
  const metaLuce = new THREE.Vector3();
  const metaTinta = new THREE.Color();
  const formato = new Intl.NumberFormat('it-IT');

  /** Fa avanzare il mondo di un istante: tutto tranne il disegno sullo schermo. */
  const avanza = (dt: number): void => {
    atmosfera.tempo.value += dt;

    scossa = Math.max(0, scossa - dt * 2.2);
    giocatore.aggiorna(dt, comandi, camera, scossa);
    bastone.aggiorna(dt, giocatore.andatura, comandi.guardaX, comandi.guardaY, stretto);
    comandi.guardaX = comandi.guardaY = 0;

    for (let i = 0; i < attese.length; i++) attese[i] = Math.max(0, attese[i]! - dt);
    if ((comandi.lancia || comandi.colpoSingolo) && comandi.attivi && attese[scelto]! <= 0) lancia(scelto);
    comandi.colpoSingolo = false;

    umore.buio = 0;
    for (let i = effetti.length - 1; i >= 0; i--) {
      if (!effetti[i]!.aggiorna(dt, g)) effetti.splice(i, 1);
    }

    accumulo += dt;
    let passi = 0;
    while (accumulo >= PASSO_FISICA && passi < 2) {
      fisica.step();
      accumulo -= PASSO_FISICA;
      passi++;
    }
    if (accumulo > PASSO_FISICA) accumulo = 0;
    pezzi.sincronizza();
    pezzi.aggiorna(dt, campo, scintille, fumo);
    campo.aggiorna(dt);
    alberi.aggiorna(dt, campo);

    // Fiamme sul prato che brucia.
    const accese = campo.celleAccese;
    if (accese > 0) {
      const quante = Math.min(q.telefono ? 8 : 14, Math.ceil(accese * 0.2));
      for (let k = 0; k < quante; k++) {
        const cella = campo.accesaACaso();
        if (cella < 0) continue;
        campo.centro(cella, v);
        const x = v.x + (Math.random() - 0.5) * 1.6;
        const z = v.z + (Math.random() - 0.5) * 1.6;
        const y = altezza(x, z);
        scintille.emetti({
          x, y: y + 0.3, z, vx: (Math.random() - 0.5) * 0.8 + 0.5, vy: 1.6 + Math.random() * 2.6, vz: (Math.random() - 0.5) * 0.8,
          vita: 0.5 + Math.random() * 0.6, dim: 1.0 + Math.random() * 1.2, dimFine: 0.15,
          r: 1.15, g: 0.42, b: 0.08, r1: 0.7, g1: 0.06, b1: 0.01, alfa: 0.36,
        });
        if (Math.random() < 0.1) {
          scintille.emetti({
            x, y: y + 0.5, z, vx: (Math.random() - 0.5) * 2 + 1, vy: 3 + Math.random() * 4, vz: (Math.random() - 0.5) * 2,
            vita: 1.5 + Math.random() * 1.5, dim: 0.12, dimFine: 0.05, r: 2, g: 1, b: 0.3, alfa: 1, attrito: 0.4,
          });
        }
        if (Math.random() < 0.07) {
          fumo.emetti({
            x, y: y + 1.5, z, vx: 0.8, vy: 2 + Math.random() * 1.5, vz: 0.4, vita: 3 + Math.random() * 2,
            dim: 1.5, dimFine: 6, r: 0.13, g: 0.12, b: 0.12, alfa: 0.35, attrito: 0.25,
          });
        }
      }
    }
    scintille.aggiorna(dt);
    fumo.aggiorna(dt);
    lampi.aggiorna(dt);

    // La luce calda del fuoco più vicino.
    attesaLuce -= dt;
    if (attesaLuce <= 0) {
      attesaLuce = 0.3;
      let vicina = Infinity;
      for (let k = 0; k < 6; k++) {
        const cella = campo.accesaACaso();
        if (cella < 0) continue;
        campo.centro(cella, v);
        const d = v.distanceToSquared(giocatore.posizione);
        if (d < vicina) {
          vicina = d;
          metaLuce.set(v.x, altezza(v.x, v.z) + 1.5, v.z);
        }
      }
      bosco.aggiorna(campo);
    }
    luceFuoco.position.lerp(metaLuce, Math.min(1, dt * 4));
    const ardore = Math.min(1, accese / 25);
    luceFuoco.intensity += (ardore * (11 + Math.random() * 5) - luceFuoco.intensity) * Math.min(1, dt * 10);
    suoni.volumeFuoco((accese + pezzi.inFiamme * 2) / 300);

    // Umore del cielo: gli incantesimi grossi lo oscurano e lo tingono.
    const k = Math.min(1, dt * 5);
    umoreVero.buio += (umore.buio - umoreVero.buio) * k;
    if (umore.buio > 0) metaTinta.setRGB(umore.r, umore.g, umore.b);
    else metaTinta.setRGB(1, 1, 1);
    umoreVero.tinta.lerp(metaTinta, k);
    const chiaro = 1 - umoreVero.buio;
    atmosfera.luce.value = chiaro;
    atmosfera.tinta.value.copy(umoreVero.tinta);
    atmosfera.nebbiaColore.value.copy(NEBBIA).multiply(umoreVero.tinta).multiplyScalar(0.25 + 0.75 * chiaro);
    (scena.fog as THREE.FogExp2).color.copy(atmosfera.nebbiaColore.value);
    luceCielo.intensity = 2.1 * (0.3 + 0.7 * chiaro);
    sole.intensity = 3.1 * (0.25 + 0.75 * chiaro);
    sole.color.setRGB(1, 0.945, 0.86).multiply(umoreVero.tinta);

    // Il sole segue chi gioca, così le ombre restano nitide dove serve.
    const passoOmbra = 96 / 2048;
    const sx = Math.round(giocatore.posizione.x / passoOmbra) * passoOmbra;
    const sz = Math.round(giocatore.posizione.z / passoOmbra) * passoOmbra;
    sole.target.position.set(sx, 0, sz);
    sole.position.set(sx, 0, sz).addScaledVector(DIREZIONE_SOLE, 110);

    prato.aggiorna(camera.position);

    attesaStato -= dt;
    if (attesaStato <= 0) {
      attesaStato = 0.25;
      ui.scriviStato(
        `${formato.format(pezzi.n)} pezzi` + (pezzi.svegli > 0 ? ` · ${formato.format(pezzi.svegli)} in movimento` : ''),
      );
      ui.ricariche(attese.map((a, i) => a / INCANTESIMI[i]!.ricarica));
    }

  };

  // Maniglia per le prove automatiche: lanciare incantesimi senza mouse, fermare il tempo o mandarlo avanti.
  const prova = {
    g, giocatore, comandi, scegli, lancia, ricostruisci, effetti,
    fermo: false,
    scorri(secondi: number) {
      for (let i = 0; i < secondi * 60; i++) avanza(1 / 60);
    },
  };
  (window as unknown as { radura: unknown }).radura = prova;

  const fotogramma = (): void => {
    const adesso = performance.now();
    if (!prova.fermo) avanza(Math.min(0.05, (adesso - ultimoIstante) / 1000));
    ultimoIstante = adesso;
    if (compositore) compositore.render();
    else renderer.render(scena, camera);
  };
  renderer.setAnimationLoop(fotogramma);
  ui.pronto();
}

avvia().catch((errore: unknown) => {
  const bottone = document.getElementById('entra');
  if (bottone) bottone.textContent = 'Questo dispositivo non riesce ad aprire il gioco';
  console.error(errore);
});
