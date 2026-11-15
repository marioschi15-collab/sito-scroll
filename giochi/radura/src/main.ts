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
import { creaDaRicetta, leggiRicette, salvaRicette, type Ricetta } from './incantesimi/officina.js';
import { OfficinaUi } from './officinaUi.js';
import { creaBosco } from './mondo/alberi.js';
import { AlberiMagici } from './mondo/alberiMagici.js';
import { atmosfera } from './mondo/atmosfera.js';
import { Campo } from './mondo/campo.js';
import { creaCielo, DIREZIONE_SOLE } from './mondo/cielo.js';
import { costruisciLuogo } from './mondo/costruzioni.js';
import { creaPrato } from './mondo/erba.js';
import { altezza, creaTerreno } from './mondo/terreno.js';
import { luoghiVicini, pesiZone, ZONE, type Luogo } from './mondo/zone.js';
import type { Gruppo } from './fisica/pezzi.js';
import { Suoni } from './suoni.js';

const NEBBIE = ZONE.map((z) => new THREE.Color(z.nebbia));
const CIELI = ZONE.map((z) => new THREE.Color(z.cielo));
const PASSO_FISICA = 1 / 60;

async function avvia(): Promise<void> {
  const q = scegliQualita();
  let ricette: Ricetta[] = leggiRicette();
  let magie = [...INCANTESIMI, ...ricette.map(creaDaRicetta)];
  const ui = new Interfaccia(magie, q.telefono);
  const officina = new OfficinaUi();
  await RAPIER.init();

  // --- schermo ---
  const renderer = new THREE.WebGLRenderer({ canvas: ui.tela, antialias: false, powerPreference: 'high-performance' });
  // Toni "da pellicola": le luci forti non sbiancano di colpo e i colori restano pieni.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setPixelRatio(q.densitaPixel);
  renderer.shadowMap.enabled = q.ombre;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scena = new THREE.Scene();
  scena.fog = new THREE.FogExp2(ZONE[0]!.nebbia, atmosfera.nebbiaDensita.value);
  const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 900);
  scena.add(camera);

  const luceCielo = new THREE.HemisphereLight(0xd6e8ff, 0x70804e, 2.1);
  const sole = new THREE.DirectionalLight(0xfff1dc, 3.1);
  scena.add(luceCielo, sole, sole.target);
  if (q.ombre) {
    sole.castShadow = true;
    sole.shadow.mapSize.set(q.latoOmbre, q.latoOmbre);
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
  const prato = creaPrato(q, campo, terreno.altezze, terreno.biomi);
  const bosco = creaBosco(q.ombre);
  const pezzi = new Pezzi(RAPIER, fisica, q.ombre);
  // I luoghi costruiti compaiono quando entrano nel raggio di vista e spariscono quando restano lontani.
  const costruiti = new Map<string, Gruppo | null>();
  let luoghiInVista: Luogo[] = [];
  const curaLuoghi = (x: number, z: number): void => {
    luoghiInVista = luoghiVicini(x, z, 440);
    for (const l of luoghiInVista) {
      if (costruiti.has(l.chiave) || Math.hypot(l.x - x, l.z - z) - l.raggio > 345) continue;
      costruiti.set(l.chiave, pezzi.aggiungi(costruisciLuogo(l), l.x, l.z, l.raggio));
    }
    for (const [chiave, gruppo] of costruiti) {
      if (luoghiInVista.some((l) => l.chiave === chiave)) continue;
      if (gruppo) pezzi.togli(gruppo);
      costruiti.delete(chiave);
    }
    pezzi.avvicina(x, z);
  };
  terreno.segui(0, 41, Infinity);
  curaLuoghi(0, 41);
  const scintille = new Particelle(q.scintille, true);
  const fumo = new Particelle(q.fumo, false);
  const alberi = new AlberiMagici(scena, RAPIER, fisica, q.ombre);
  scena.add(creaCielo(), terreno.gruppo, terreno.acqua, ...prato.oggetti, ...bosco.oggetti, pezzi.mesh, fumo.punti, scintille.punti);

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
    premuto: () => comandi.lancia && comandi.attivi,
    impegnato: false,
  };

  // --- bagliore attorno alle cose luminose (solo al computer) ---
  // L'immagine passa sempre da qui: bordi lisci, bagliore (se il dispositivo lo regge) e toni finali.
  const compositore = new EffectComposer(
    renderer,
    new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 }),
  );
  compositore.addPass(new RenderPass(scena, camera));
  const bagliore = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.45, 1.05);
  bagliore.enabled = q.bagliore;
  compositore.addPass(bagliore);
  compositore.addPass(new OutputPass());
  let densitaPixel = q.densitaPixel;

  let stretto = false;
  const misura = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    stretto = w < h;
    camera.aspect = w / h;
    camera.fov = stretto ? 84 : 72;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(densitaPixel);
    compositore.setPixelRatio(densitaPixel);
    compositore.setSize(w, h);
    scalaPunti.value = (h * densitaPixel) / (2 * Math.tan((camera.fov * Math.PI) / 360));
  };
  misura();
  window.addEventListener('resize', misura);

  // --- incantesimi ---
  let scelto = 0;
  let attese = magie.map(() => 0);
  const scegli = (i: number): void => {
    if (i < 0 || i >= magie.length) return;
    scelto = i;
    ui.scegli(i);
    bastone.coloreMagia(magie[i]!.colore);
  };
  scegli(0);
  ui.onScelta = scegli;
  comandi.onScelta = scegli;
  comandi.onScorri = (verso) => scegli((scelto + verso + magie.length) % magie.length);

  // --- l'officina: mentre è aperta il gioco non riceve comandi ---
  const apriOfficina = (): void => {
    if (officina.aperta || !comandi.attivi) return;
    comandi.attivi = false;
    comandi.lancia = false;
    comandi.avanti = comandi.lato = 0;
    comandi.sgancia();
    officina.apri(ricette);
  };
  ui.onOfficina = apriOfficina;
  comandi.onOfficina = apriOfficina;
  officina.onCambio = (nuove, daUsare) => {
    ricette = nuove.map((r) => ({ ...r, effetti: [...r.effetti] }));
    salvaRicette(ricette);
    magie = [...INCANTESIMI, ...ricette.map(creaDaRicetta)];
    attese = magie.map(() => 0);
    ui.impostaMagie(magie);
    scegli(daUsare >= 0 ? INCANTESIMI.length + daUsare : Math.min(scelto, magie.length - 1));
  };
  officina.onChiudi = () => {
    comandi.attivi = true;
    if (!q.telefono) comandi.aggancia();
  };

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
    const magia = magie[indice]!;
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

  // --- il gioco ricorda dove si è arrivati; un pulsante riporta al villaggio di partenza ---
  const spostati = (x: number, z: number, imbardata: number): void => {
    giocatore.posizione.set(x, altezza(x, z) + 0.95, z);
    giocatore.imbardata = imbardata;
    terreno.segui(x, z, Infinity);
    campo.segui(x, z);
    curaLuoghi(x, z);
    bosco.aggiorna(campo, x, z);
  };
  try {
    const dove = JSON.parse(localStorage.getItem('radura-posizione') ?? 'null') as { x: number; z: number; a: number } | null;
    if (dove && Number.isFinite(dove.x) && Number.isFinite(dove.z) && Number.isFinite(dove.a)) spostati(dove.x, dove.z, dove.a);
  } catch {
    // Senza memoria del browser si riparte dal villaggio.
  }
  window.setInterval(() => {
    try {
      const p = giocatore.posizione;
      localStorage.setItem('radura-posizione', JSON.stringify({ x: Math.round(p.x), z: Math.round(p.z), a: +giocatore.imbardata.toFixed(2) }));
    } catch {
      // Pazienza.
    }
  }, 4000);
  const pulsanteCasa = document.getElementById('casa')!;
  pulsanteCasa.addEventListener('click', () => {
    spostati(0, 41, 0);
    pulsanteCasa.blur();
  });
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
  const pesi = new Float32Array(5);
  const nebbiaZona = new THREE.Color();
  const cieloZona = new THREE.Color();

  // --- esplorazione: in che zona si è, quali luoghi si sono trovati ---
  let zonaAttuale = 0;
  const scoperti = new Set<string>();
  try {
    for (const chiave of JSON.parse(localStorage.getItem('radura-scoperti') ?? '[]') as string[]) scoperti.add(chiave);
  } catch {
    // Senza memoria del browser le scoperte valgono solo per questa partita.
  }
  const esplora = (): void => {
    const p = giocatore.posizione;
    let zona = 0;
    for (let i = 1; i < ZONE.length; i++) if (pesi[i]! > pesi[zona]!) zona = i;
    if (zona !== zonaAttuale && pesi[zona]! > 0.6) {
      zonaAttuale = zona;
      ui.annuncia(ZONE[zona]!.nome, 'Sei entrato in una nuova zona');
    }
    for (const l of luoghiInVista) {
      if (scoperti.has(l.chiave) || Math.hypot(p.x - l.x, p.z - l.z) > l.raggio + 14) continue;
      scoperti.add(l.chiave);
      if (l.tipo !== 'villaggio') ui.annuncia(l.nome, `Luogo scoperto · sono ${scoperti.size}`);
      try {
        localStorage.setItem('radura-scoperti', JSON.stringify([...scoperti]));
      } catch {
        // Pazienza.
      }
    }
    ui.disegnaMappa(p.x, p.z, giocatore.imbardata, luoghiInVista, scoperti);
  };

  /** Quel che vola nell'aria di ogni zona: neve, faville, lucciole, sabbia. */
  const polvereDelPosto = (dt: number): void => {
    const p = giocatore.posizione;
    const a = Math.random() * Math.PI * 2;
    const r = 2 + Math.random() * 20;
    const x = p.x + Math.cos(a) * r;
    const z = p.z + Math.sin(a) * r;
    const quante = dt * 60;
    if (pesi[2]! > 0.5 && Math.random() < 2.5 * quante) {
      scintille.emetti({
        x, y: p.y + 2 + Math.random() * 9, z, vx: 1.2, vy: -1.6 - Math.random(), vz: 0.4,
        vita: 3.5, dim: 0.1, dimFine: 0.08, r: 0.95, g: 1, b: 1.1, alfa: 0.9,
      });
    }
    if (pesi[4]! > 0.5 && Math.random() < 0.8 * quante) {
      scintille.emetti({
        x, y: altezza(x, z) + 0.2, z, vx: (Math.random() - 0.5) * 1.5, vy: 1.5 + Math.random() * 3, vz: (Math.random() - 0.5) * 1.5,
        vita: 2 + Math.random() * 2, dim: 0.11, dimFine: 0.04, r: 2, g: 0.8, b: 0.2, alfa: 1, attrito: 0.3,
      });
    }
    if (pesi[3]! > 0.5 && Math.random() < 0.35 * quante) {
      scintille.emetti({
        x, y: altezza(x, z) + 0.6 + Math.random() * 2.5, z, vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.4, vz: (Math.random() - 0.5) * 0.8,
        vita: 3 + Math.random() * 2, dim: 0.16, dimFine: 0.12, r: 1.2, g: 1.7, b: 0.5, alfa: 1,
      });
    }
    if (pesi[1]! > 0.5 && Math.random() < 0.25 * quante) {
      fumo.emetti({
        x, y: altezza(x, z) + 0.4, z, vx: 5 + Math.random() * 3, vy: 0.3, vz: 2,
        vita: 2.5, dim: 1.5, dimFine: 4, r: 0.85, g: 0.74, b: 0.5, alfa: 0.12,
      });
    }
  };
  const formato = new Intl.NumberFormat('it-IT');

  /** Fa avanzare il mondo di un istante: tutto tranne il disegno sullo schermo. */
  const avanza = (dt: number): void => {
    atmosfera.tempo.value += dt;

    scossa = Math.max(0, scossa - dt * 2.2);
    giocatore.aggiorna(dt, comandi, camera, scossa);
    bastone.aggiorna(dt, giocatore.andatura, comandi.guardaX, comandi.guardaY, stretto);
    comandi.guardaX = comandi.guardaY = 0;

    for (let i = 0; i < attese.length; i++) attese[i] = Math.max(0, attese[i]! - dt);
    if ((comandi.lancia || comandi.colpoSingolo) && comandi.attivi && !g.impegnato && attese[scelto]! <= 0) lancia(scelto);
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
    // Due zolle di terreno nuove per fotogramma: abbastanza per stare davanti a chi corre, poche per non scattare.
    terreno.segui(giocatore.posizione.x, giocatore.posizione.z, 2);
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
      bosco.aggiorna(campo, giocatore.posizione.x, giocatore.posizione.z);
      campo.segui(giocatore.posizione.x, giocatore.posizione.z);
      curaLuoghi(giocatore.posizione.x, giocatore.posizione.z);
      esplora();
    }
    polvereDelPosto(dt);
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
    // Ogni zona ha la sua aria: nebbia, cielo e luce si mescolano secondo quanto si è dentro ciascuna.
    pesiZone(giocatore.posizione.x, giocatore.posizione.z, pesi);
    nebbiaZona.setScalar(0);
    cieloZona.setScalar(0);
    let densita = 0;
    let luceZona = 0;
    for (let i = 0; i < ZONE.length; i++) {
      const w = pesi[i]!;
      nebbiaZona.r += NEBBIE[i]!.r * w; nebbiaZona.g += NEBBIE[i]!.g * w; nebbiaZona.b += NEBBIE[i]!.b * w;
      cieloZona.r += CIELI[i]!.r * w; cieloZona.g += CIELI[i]!.g * w; cieloZona.b += CIELI[i]!.b * w;
      densita += ZONE[i]!.densitaNebbia * w;
      luceZona += ZONE[i]!.luce * w;
    }
    const chiaro = (1 - umoreVero.buio) * luceZona;
    atmosfera.luce.value = chiaro;
    atmosfera.tinta.value.copy(umoreVero.tinta);
    atmosfera.cieloAlto.value.copy(cieloZona);
    atmosfera.nebbiaDensita.value = densita;
    atmosfera.nebbiaColore.value.copy(nebbiaZona).multiply(umoreVero.tinta).multiplyScalar(0.25 + 0.75 * (1 - umoreVero.buio));
    const nebbia = scena.fog as THREE.FogExp2;
    nebbia.color.copy(atmosfera.nebbiaColore.value);
    nebbia.density = densita;
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
        `${ZONE[zonaAttuale]!.nome} · luoghi scoperti ${scoperti.size}` +
          (pezzi.svegli > 0 ? ` · ${formato.format(pezzi.svegli)} pezzi in movimento` : ''),
      );
      ui.ricariche(attese.map((a, i) => a / magie[i]!.ricarica));
    }

  };

  // Maniglia per le prove automatiche: lanciare incantesimi senza mouse, fermare il tempo o mandarlo avanti.
  const prova = {
    g, giocatore, comandi, scegli, lancia, ricostruisci, effetti, officina, costruiti,
    fermo: false,
    /** Sposta chi gioca in un punto del mondo, girato in una direzione. */
    vai(x: number, z: number, imbardata = 0, beccheggio = 0) {
      giocatore.posizione.set(x, altezza(x, z) + 0.95, z);
      giocatore.imbardata = imbardata;
      giocatore.beccheggio = beccheggio;
      terreno.segui(x, z, Infinity);
      campo.segui(x, z);
      curaLuoghi(x, z);
      bosco.aggiorna(campo, x, z);
    },
    scorri(secondi: number) {
      for (let i = 0; i < secondi * 60; i++) avanza(1 / 60);
    },
  };
  (window as unknown as { radura: unknown }).radura = prova;

  // --- se il dispositivo fatica, si toglie un po' di dettaglio alla volta (mai il contrario, per non ballare) ---
  const alleggerimenti: (() => void)[] = [
    () => (bagliore.enabled = false),
    () => {
      densitaPixel = Math.min(densitaPixel, 1.5);
      misura();
    },
    () => prato.densita(0.6),
    () => {
      renderer.shadowMap.enabled = false;
      sole.castShadow = false;
    },
    () => {
      densitaPixel = Math.min(densitaPixel, 1.15);
      misura();
    },
    () => prato.densita(0.35),
  ];
  let tempoMedio = 1 / 60;
  let daUltimaRegolata = 0;
  const regola = (dt: number): void => {
    if (!q.siAdatta || !comandi.attivi || dt > 0.5) return;
    tempoMedio += (dt - tempoMedio) * 0.05;
    daUltimaRegolata += dt;
    // Sotto i 34 fotogrammi al secondo per tre secondi di fila: si alleggerisce di un gradino.
    if (daUltimaRegolata < 3) return;
    if (tempoMedio > 1 / 34) alleggerimenti.shift()?.();
    daUltimaRegolata = 0;
  };

  const fotogramma = (): void => {
    const adesso = performance.now();
    const prima = ultimoIstante;
    if (!prova.fermo) avanza(Math.min(0.05, (adesso - ultimoIstante) / 1000));
    ultimoIstante = adesso;
    compositore.render();
    regola((adesso - prima) / 1000);
  };
  renderer.setAnimationLoop(fotogramma);
  ui.pronto();
}

avvia().catch((errore: unknown) => {
  const bottone = document.getElementById('entra');
  if (bottone) bottone.textContent = 'Questo dispositivo non riesce ad aprire il gioco';
  console.error(errore);
});
