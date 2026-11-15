import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { graficaScelta, gradiniRicordati, ricordaGradini, scegliQualita } from './base/qualita.js';
import { Bastone } from './bastone.js';
import { Comandi } from './comandi.js';
import { Lampi } from './effetti/lampi.js';
import { massimoPunti, Particelle, scalaPunti } from './effetti/particelle.js';
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
const ALTE = ZONE.map((z) => new THREE.Color(z.luceAlta));
const BASSE = ZONE.map((z) => new THREE.Color(z.luceBassa));
const SOLI = ZONE.map((z) => new THREE.Color(z.sole));

// Le ombre sfumano verso il bordo della zona che coprono, invece di finire con una linea netta che cammina con chi gioca.
THREE.ShaderChunk.shadowmap_pars_fragment = THREE.ShaderChunk.shadowmap_pars_fragment.replace(
  'return mix( 1.0, shadow, shadowIntensity );',
  'vec2 dalBordo = smoothstep( vec2( 0.5 ), vec2( 0.40 ), abs( shadowCoord.xy - 0.5 ) ); return mix( 1.0, shadow, shadowIntensity * dalBordo.x * dalBordo.y );',
);
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
  const terreno = creaTerreno(RAPIER, fisica, campo, q.ombre, q.latoErba);
  const prato = creaPrato(q, campo, terreno.altezze, terreno.biomi);
  const bosco = creaBosco(q.ombre);
  const pezzi = new Pezzi(RAPIER, fisica, q.ombre);
  // I luoghi costruiti compaiono quando entrano nel raggio di vista e spariscono quando restano lontani.
  const costruiti = new Map<string, Gruppo | null>();
  let luoghiInVista: Luogo[] = [];
  const curaLuoghi = (x: number, z: number): void => {
    luoghiInVista = luoghiVicini(x, z, 440);
    // Un luogo "vivo" non deve restare senza terreno sotto: le zolle coprono 364 metri attorno a chi gioca.
    // Prima che la sua zolla venga riusata lo si toglie; il giro qui sotto lo rimette subito, intero e solo
    // disegnato. Senza, allontanandosi di 400 metri il villaggio sprofondava nel vuoto.
    for (const l of luoghiInVista) {
      const gruppo = costruiti.get(l.chiave);
      if (gruppo?.vivo && Math.max(Math.abs(l.x - x), Math.abs(l.z - z)) + l.raggio > 320) {
        pezzi.togli(gruppo);
        costruiti.delete(l.chiave);
      }
    }
    for (const l of luoghiInVista) {
      if (costruiti.has(l.chiave) || Math.hypot(l.x - x, l.z - z) - l.raggio > 345) continue;
      costruiti.set(l.chiave, pezzi.aggiungi(costruisciLuogo(l), l.x, l.z, l.raggio));
    }
    for (const [chiave, gruppo] of costruiti) {
      if (luoghiInVista.some((l) => l.chiave === chiave)) continue;
      if (gruppo) pezzi.togli(gruppo);
      costruiti.delete(chiave);
    }
  };
  terreno.segui(0, 41, Infinity);
  curaLuoghi(0, 41);
  pezzi.avvicina(0, 41, Infinity);
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
    // La profondità serve solo mentre si disegna la scena: non la si ricopia a ogni passata.
    new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4, resolveDepthBuffer: false }),
  );
  compositore.addPass(new RenderPass(scena, camera));
  const bagliore = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.45, 1.05);
  bagliore.enabled = q.bagliore;
  compositore.addPass(bagliore);
  // L'ultima passata: ombre un filo più fredde e luci più calde, colori un po' più pieni, angoli più scuri che
  // raccolgono lo sguardo, i toni "da pellicola", e una grana finissima che cancella le righe nelle sfumature lunghe.
  compositore.addPass(
    new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: { tDiffuse: { value: null }, uTempo: atmosfera.tempo },
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: /* glsl */ `
          uniform sampler2D tDiffuse; uniform float uTempo; varying vec2 vUv;
          void main() {
            vec3 c = texture2D(tDiffuse, vUv).rgb;
            float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
            c *= mix(vec3(0.95, 0.99, 1.06), vec3(1.04, 1.0, 0.94), smoothstep(0.05, 0.9, l));
            c = mix(vec3(l), c, 1.1);
            vec2 q = vUv - 0.5;
            c *= 1.0 - 0.32 * smoothstep(0.25, 0.85, dot(q, q) * 2.0);
            gl_FragColor = vec4(max(c, 0.0), 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
            float g = fract(52.9829189 * fract(dot(gl_FragCoord.xy + uTempo * 60.0, vec2(0.06711056, 0.00583715))));
            gl_FragColor.rgb += (g - 0.5) * 1.5 / 255.0;
          }
        `,
      }),
    ),
  );
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
    massimoPunti.value = q.telefono ? 0.2 * h * densitaPixel : 600;
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
    comandi.rilascia();
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
    pezzi.avvicina(x, z, Infinity);
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
  let confermaCasa = 0;
  pulsanteCasa.addEventListener('click', () => {
    pulsanteCasa.blur();
    // Due tocchi: uno solo, per sbaglio, butterebbe via una lunga camminata.
    if (!confermaCasa) {
      pulsanteCasa.textContent = 'Tocca ancora per tornare';
      confermaCasa = window.setTimeout(() => {
        confermaCasa = 0;
        pulsanteCasa.textContent = '⌂ Al villaggio';
      }, 3000);
      return;
    }
    window.clearTimeout(confermaCasa);
    confermaCasa = 0;
    pulsanteCasa.textContent = '⌂ Al villaggio';
    spostati(0, 41, 0);
  });
  ui.pulsanteRicostruisci.addEventListener('click', () => {
    ricostruisci();
    ui.pulsanteRicostruisci.blur();
  });
  comandi.pulsante(ui.pulsanteLancia, (giu) => {
    comandi.lancia = giu;
    if (giu) comandi.colpoSingolo = true;
  });
  comandi.pulsante(ui.pulsanteSalta, (giu) => {
    comandi.salta = giu;
    if (giu) comandi.saltoSingolo = true;
  });
  // L'audio del telefono si addormenta dopo una chiamata o un cambio di app: ogni tocco lo riaccende.
  window.addEventListener('pointerup', () => suoni.sveglia(), { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) suoni.sveglia();
  });
  comandi.onTrascina = () =>
    ui.annuncia('Trascina per guardarti intorno', 'Tieni premuto il mouse e muovilo · un clic lancia · F per tenere premuto');

  ui.onEntra = () => {
    suoni.avvia();
    comandi.attivi = true;
    ui.mostraIngresso(false);
    if (!q.telefono) comandi.aggancia();
  };
  comandi.onPausa = () => {
    comandi.attivi = false;
    comandi.rilascia();
    ui.mostraIngresso(true);
  };

  // --- il giro che si ripete a ogni fotogramma ---
  let ultimoIstante = performance.now();
  let accumulo = 0;
  let costoPasso = 0;
  let fiammeDaFare = 0;
  let attesaStato = 0;
  let attesaLuce = 0;
  const v = new THREE.Vector3();
  const metaLuce = new THREE.Vector3();
  const metaTinta = new THREE.Color();
  const pesi = new Float32Array(5);
  const nebbiaZona = new THREE.Color();
  const cieloZona = new THREE.Color();
  const altaZona = new THREE.Color();
  const bassaZona = new THREE.Color();
  const soleZona = new THREE.Color();
  // La mappa delle ombre si sposta a scatti grandi quanto un suo punto, misurati nel piano del sole: così i bordi
  // delle ombre non "nuotano" mentre si cammina, e in altura la zona in ombra resta centrata su chi gioca.
  const ombraX = new THREE.Vector3(DIREZIONE_SOLE.z, 0, -DIREZIONE_SOLE.x).normalize();
  const ombraY = new THREE.Vector3().crossVectors(DIREZIONE_SOLE, ombraX);
  const centroOmbra = new THREE.Vector3();
  const puntoOmbra = 96 / q.latoOmbre;

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
    // Il secondo passo di recupero si fa solo se i passi costano poco: durante un grande crollo raddoppiarli
    // dimezzerebbe i fotogrammi proprio quando la fisica è già il collo di bottiglia (meglio un filo di rallentatore).
    const massimi = costoPasso > 6 ? 1 : 2;
    while (accumulo >= PASSO_FISICA && passi < massimi) {
      const t0 = performance.now();
      fisica.step();
      costoPasso += (performance.now() - t0 - costoPasso) * 0.3;
      accumulo -= PASSO_FISICA;
      passi++;
    }
    if (accumulo > PASSO_FISICA) accumulo = 0;
    pezzi.avvicina(giocatore.posizione.x, giocatore.posizione.z);
    pezzi.sincronizza();
    pezzi.aggiorna(dt, campo, scintille, fumo);
    campo.aggiorna(dt);
    // Due zolle di terreno nuove per fotogramma: abbastanza per stare davanti a chi corre, poche per non scattare.
    terreno.segui(giocatore.posizione.x, giocatore.posizione.z, 2);
    alberi.aggiorna(dt, campo);

    // Fiamme sul prato che brucia.
    const accese = campo.celleAccese;
    if (accese > 0) {
      // Tante fiamme al secondo, non per fotogramma: il fuoco è uguale su ogni dispositivo.
      fiammeDaFare += Math.min(q.telefono ? 8 : 14, accese * 0.2) * dt * 60;
      for (; fiammeDaFare >= 1; fiammeDaFare--) {
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
    altaZona.setScalar(0);
    bassaZona.setScalar(0);
    soleZona.setScalar(0);
    let densita = 0;
    let luceZona = 0;
    for (let i = 0; i < ZONE.length; i++) {
      const w = pesi[i]!;
      nebbiaZona.r += NEBBIE[i]!.r * w; nebbiaZona.g += NEBBIE[i]!.g * w; nebbiaZona.b += NEBBIE[i]!.b * w;
      cieloZona.r += CIELI[i]!.r * w; cieloZona.g += CIELI[i]!.g * w; cieloZona.b += CIELI[i]!.b * w;
      altaZona.r += ALTE[i]!.r * w; altaZona.g += ALTE[i]!.g * w; altaZona.b += ALTE[i]!.b * w;
      bassaZona.r += BASSE[i]!.r * w; bassaZona.g += BASSE[i]!.g * w; bassaZona.b += BASSE[i]!.b * w;
      soleZona.r += SOLI[i]!.r * w; soleZona.g += SOLI[i]!.g * w; soleZona.b += SOLI[i]!.b * w;
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
    // Ogni terra ha la sua luce: quella che scende dal cielo, quella che rimbalza dal suolo, quella del sole.
    luceCielo.color.copy(altaZona);
    luceCielo.groundColor.copy(bassaZona);
    sole.color.copy(soleZona).multiply(umoreVero.tinta);
    // L'erba non usa le luci vere: le si passa il colore della luce di qui rispetto a quello della Radura.
    atmosfera.ambiente.value.setRGB(
      (altaZona.r * 0.67 + soleZona.r * 0.61) / (ALTE[0]!.r * 0.67 + SOLI[0]!.r * 0.61),
      (altaZona.g * 0.67 + soleZona.g * 0.61) / (ALTE[0]!.g * 0.67 + SOLI[0]!.g * 0.61),
      (altaZona.b * 0.67 + soleZona.b * 0.61) / (ALTE[0]!.b * 0.67 + SOLI[0]!.b * 0.61),
    );

    // Il sole segue chi gioca, così le ombre restano nitide dove serve.
    const dove = giocatore.posizione;
    centroOmbra
      .copy(ombraX)
      .multiplyScalar(Math.round(dove.dot(ombraX) / puntoOmbra) * puntoOmbra)
      .addScaledVector(ombraY, Math.round(dove.dot(ombraY) / puntoOmbra) * puntoOmbra)
      .addScaledVector(DIREZIONE_SOLE, dove.dot(DIREZIONE_SOLE));
    sole.target.position.copy(centroOmbra);
    sole.position.copy(centroOmbra).addScaledVector(DIREZIONE_SOLE, 110);

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
      pezzi.avvicina(x, z, Infinity);
      bosco.aggiorna(campo, x, z);
    },
    scorri(secondi: number) {
      for (let i = 0; i < secondi * 60; i++) avanza(1 / 60);
    },
  };
  (window as unknown as { radura: unknown }).radura = prova;

  // --- quanto dettaglio mostrare: otto livelli, dal pieno (0) al più leggero (7) ---
  const LIVELLO_MASSIMO = 7;
  const LIVELLO_LEGGERO = 5;
  let livello = 0;
  const mostra = (nuovo: number): void => {
    livello = Math.max(0, Math.min(LIVELLO_MASSIMO, nuovo));
    bagliore.enabled = q.bagliore && livello < 1;
    densitaPixel = livello >= 6 ? Math.min(q.densitaPixel, 1.15) : livello >= 2 ? Math.min(q.densitaPixel, 1.5) : q.densitaPixel;
    prato.densita(livello >= 7 ? 0.35 : livello >= 3 ? 0.6 : 1);
    scintille.rado = fumo.rado = livello >= 4;
    const ombre = q.ombre && livello < 5;
    if (renderer.shadowMap.enabled !== ombre) {
      renderer.shadowMap.enabled = ombre;
      sole.castShadow = ombre;
      renderer.shadowMap.needsUpdate = true;
    }
    misura();
  };

  /**
   * Il regolatore: se il dispositivo fatica a disegnare, si scende di livello; se regge largo, si prova a risalire.
   * Guarda solo i fotogrammi lenti per colpa della grafica (non quelli in cui è la fisica di un crollo a pesare),
   * e si accorge quando scendere non serve: è il caso del risparmio energetico dell'iPhone, che ferma tutto a 30
   * fotogrammi al secondo qualunque cosa si tolga. Allora rimette ciò che aveva tolto e da lì scende solo sotto i 27.
   */
  let regolatoreAcceso = false;
  let somma = 0;
  let campioni = 0;
  let finestra = 1.5;
  let soglia = 1 / 34;
  let discesa: { da: number; medio: number } | null = null;
  let tempoBuono = 0;
  let inProva = false;
  let risalitaPermessa = true;
  const regola = (dt: number, lavoro: number): void => {
    if (!regolatoreAcceso || !q.siAdatta || !comandi.attivi || dt > 0.25) return;
    // Più di un terzo del fotogramma è andato in fisica e mondo: questo campione non dice nulla sulla grafica.
    if (lavoro > dt * 350) return;
    somma += dt;
    campioni++;
    if (somma < finestra) return;
    const medio = somma / campioni;
    somma = 0;
    campioni = 0;
    finestra = 3;
    if (inProva) {
      // Si era provato a risalire di un livello: se non regge si torna giù e non si riprova più.
      inProva = false;
      if (medio > 1 / 40) {
        risalitaPermessa = false;
        mostra(livello + 1);
      }
      ricordaGradini(livello);
      return;
    }
    if (medio <= soglia) {
      discesa = null;
      tempoBuono = medio < 1 / 55 ? tempoBuono + 3 : 0;
      if (tempoBuono >= 60 && livello > 0 && risalitaPermessa) {
        tempoBuono = 0;
        inProva = true;
        mostra(livello - 1);
      }
      return;
    }
    tempoBuono = 0;
    if (!discesa) discesa = { da: livello, medio };
    const scesi = livello - discesa.da;
    const fermoATrenta = medio < 1 / 27;
    if (scesi >= (fermoATrenta ? 2 : 3) && medio > discesa.medio * 0.9) {
      // Togliere dettaglio non ha cambiato niente: la lentezza non viene dalla grafica. Si rimette tutto.
      mostra(discesa.da);
      discesa = null;
      if (fermoATrenta) soglia = 1 / 27;
      else regolatoreAcceso = false;
      return;
    }
    if (livello >= LIVELLO_MASSIMO) return;
    mostra(livello + (medio > 1 / 20 ? 3 : medio > 1 / 27 ? 2 : 1));
    ricordaGradini(livello);
  };

  /** Applica la scelta di chi gioca: automatica (parte da dove si era arrivati l'ultima volta), massima o leggera. */
  const applicaGrafica = (): void => {
    const scelta = graficaScelta();
    regolatoreAcceso = scelta === 'automatica';
    somma = campioni = 0;
    discesa = null;
    inProva = false;
    finestra = 1.5;
    mostra(scelta === 'alta' || !q.siAdatta ? 0 : scelta === 'leggera' ? LIVELLO_LEGGERO : gradiniRicordati());
  };
  applicaGrafica();
  ui.onGrafica = applicaGrafica;

  const fotogramma = (): void => {
    const adesso = performance.now();
    const prima = ultimoIstante;
    if (!prova.fermo) avanza(Math.min(0.05, (adesso - ultimoIstante) / 1000));
    const lavoro = performance.now() - adesso;
    ultimoIstante = adesso;
    compositore.render();
    regola((adesso - prima) / 1000, lavoro);
  };
  renderer.setAnimationLoop(fotogramma);
  ui.pronto();
}

avvia().catch((errore: unknown) => {
  const bottone = document.getElementById('entra');
  if (bottone) bottone.textContent = 'Questo dispositivo non riesce ad aprire il gioco';
  console.error(errore);
});
