import * as THREE from 'three';
import { COSE, SCOPERTE, GETTONI_BASE, GETTONI_NUOVI, IDEE, svg } from './dati.js';
import { Suoni } from './suoni.js';

// ───────────────────────── utilità
const $ = (s) => document.querySelector(s);
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeOutBack = (t) => { const c1 = 2.2, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const easeOutElastic = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -9 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t) => t * t * t;
function hash(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return lerp(lerp(hash(xi, zi), hash(xi + 1, zi), u), lerp(hash(xi, zi + 1), hash(xi + 1, zi + 1), u), v);
}
const raw = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255]; // per i nostri shader

// piccole animazioni
const tweens = [];
function tween(dur, fn, fine, ritardo = 0) { tweens.push({ t: -ritardo, dur, fn, fine }); }
function dopo(sec, fn) { tween(0.0001, () => {}, fn, sec); }
function aggiornaTweens(dt) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const w = tweens[i]; w.t += dt;
    if (w.t < 0) continue;
    const k = Math.min(1, w.t / w.dur);
    w.fn(k);
    if (k >= 1) { tweens.splice(i, 1); w.fine && w.fine(); }
  }
}

// ───────────────────────── motore 3D
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xffe6c4, 30, 60);
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 400);
const uTempo = { value: 0 };

// ───────────────────────── cielo (gradiente + sole) e stelle
const cieloMat = new THREE.ShaderMaterial({
  uniforms: { uTop: { value: new THREE.Vector3() }, uMid: { value: new THREE.Vector3() }, uBot: { value: new THREE.Vector3() }, uAlt: { value: 800 }, uSole: { value: new THREE.Vector3() }, uSoleDir: { value: new THREE.Vector3(0, 1, 0) }, uSoleA: { value: 1 } },
  vertexShader: `varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform vec3 uTop,uMid,uBot,uSole,uSoleDir; uniform float uSoleA,uAlt; varying vec3 vD;
    void main(){ vec3 d=normalize(vD); float y=gl_FragCoord.y/uAlt;
      vec3 c=mix(uBot,uMid,smoothstep(0.0,0.55,y)); c=mix(c,uTop,smoothstep(0.5,1.0,y));
      float s=max(dot(d,normalize(uSoleDir)),0.); c+=uSole*(pow(s,350.)*1.2+pow(s,24.)*0.22+pow(s,4.)*0.08)*uSoleA;
      gl_FragColor=vec4(c,1.); }`,
  side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
});
const cielo = new THREE.Mesh(new THREE.SphereGeometry(150, 24, 16), cieloMat);
cielo.renderOrder = -10; cielo.frustumCulled = false;
scene.add(cielo);

const stelle = (() => {
  const n = 650, p = new Float32Array(n * 3), f = new Float32Array(n), s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2), y = rand(-0.75, 1), r = Math.sqrt(1 - y * y);
    p[i * 3] = Math.cos(a) * r * 140; p[i * 3 + 1] = y * 140; p[i * 3 + 2] = Math.sin(a) * r * 140;
    f[i] = rand(0, 6.28); s[i] = rand(1.2, 3.2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  g.setAttribute('aF', new THREE.BufferAttribute(f, 1));
  g.setAttribute('aS', new THREE.BufferAttribute(s, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uA: { value: 0 }, uT: uTempo, uPR: { value: 1 } },
    vertexShader: `attribute float aF; attribute float aS; uniform float uT,uPR,uA; varying float vA;
      void main(){ vA=uA*(0.55+0.45*sin(uT*2.0+aF*3.)); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_PointSize=aS*uPR; }`,
    fragmentShader: `varying float vA; void main(){ float r=length(gl_PointCoord-.5); gl_FragColor=vec4(1.,.97,.9, vA*smoothstep(.5,.0,r)); }`,
    transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(g, m); pts.renderOrder = -9; pts.frustumCulled = false;
  scene.add(pts);
  return pts;
})();

// ───────────────────────── luci
const emisfero = new THREE.HemisphereLight(0xd6ecff, 0xf2d3a8, 1.0);
scene.add(emisfero);
const sole = new THREE.DirectionalLight(0xfff0d8, 2.6);
sole.castShadow = true;
sole.shadow.mapSize.set(1024, 1024);
Object.assign(sole.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 50 });
sole.shadow.bias = -0.0008; sole.shadow.normalBias = 0.03; sole.shadow.radius = 3;
scene.add(sole); scene.add(sole.target);

// ───────────────────────── terreno (griglia)
const G = 6, N = 56, PASSO = (2 * G) / N, V = N + 1, NV = V * V;
const ERBA = 0, TERRA = 1, SABBIA = 2, FANGO = 3, ARGILLA = 4, LAVA = 5, PIETRA = 6, CENERE = 7, VETRO = 8, FONDO = 9;
const NOMI_T = ['erba', 'terra', 'sabbia', 'fango', 'argilla', 'lava', 'pietra', 'cenere', 'vetro', 'mare'];
const ASC = new Float32Array(NV);
const H = new Float32Array(NV), T = new Uint8Array(NV), VAR = new Float32Array(NV), LAV = new Float32Array(NV), ETA = new Float32Array(NV);
const PX = new Float32Array(NV), PZ = new Float32Array(NV);
let ciuffiSporchi = true;
const idx = (ix, iz) => iz * V + ix;

function raggioIsola(a) { return 4.05 + 0.32 * Math.sin(3 * a + 0.6) + 0.22 * Math.sin(5 * a + 2.1) + 0.12 * Math.sin(8 * a + 0.3); }
function altezzaBase(x, z) {
  const r = Math.hypot(x, z), a = Math.atan2(z, x), R = raggioIsola(a), rn = r / R;
  const n = vnoise(x * 0.7 + 3, z * 0.7 + 7) * 0.6 + vnoise(x * 1.7, z * 1.7) * 0.25;
  let terra = 0.24 + 0.5 * Math.pow(clamp(1 - rn, 0, 1), 0.8) * (0.55 + 0.6 * n);
  terra += 0.85 * Math.exp(-((x + 1.35) ** 2 + (z + 1.0) ** 2) / 1.5);
  terra += 0.3 * Math.exp(-((x - 1.7) ** 2 + (z - 1.2) ** 2) / 1.0);
  const spiaggia = smooth(0.8, 0.97, rn);
  let h = lerp(terra, 0.06, spiaggia);
  if (rn > 0.97) h = 0.06 - (rn - 0.97) * R * 0.8;
  return Math.max(h, -1.0);
}
function tipoNaturale(i) { const h = H[i]; return h <= 0.025 ? FONDO : h < 0.16 ? SABBIA : ERBA; }

for (let iz = 0; iz < V; iz++) for (let ix = 0; ix < V; ix++) {
  const i = idx(ix, iz), x = -G + ix * PASSO, z = -G + iz * PASSO;
  PX[i] = x; PZ[i] = z; H[i] = altezzaBase(x, z); T[i] = tipoNaturale(i);
  VAR[i] = vnoise(x * 1.3 + 10, z * 1.3) * 0.7 + Math.random() * 0.3;
}

const terrGeo = new THREE.BufferGeometry();
const tPos = new Float32Array(NV * 3), tCol = new Float32Array(NV * 3), tGlow = new Float32Array(NV), tWet = new Float32Array(NV);
for (let i = 0; i < NV; i++) { tPos[i * 3] = PX[i]; tPos[i * 3 + 1] = H[i]; tPos[i * 3 + 2] = PZ[i]; }
const indici = [];
for (let iz = 0; iz < N; iz++) for (let ix = 0; ix < N; ix++) {
  const a = idx(ix, iz), b = idx(ix + 1, iz), c = idx(ix, iz + 1), d = idx(ix + 1, iz + 1);
  if ((ix + iz) % 2) indici.push(a, c, b, b, c, d); else indici.push(a, c, d, a, d, b);
}
terrGeo.setIndex(indici);
terrGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3));
terrGeo.setAttribute('color', new THREE.BufferAttribute(tCol, 3));
terrGeo.setAttribute('aGlow', new THREE.BufferAttribute(tGlow, 1));
terrGeo.setAttribute('aWet', new THREE.BufferAttribute(tWet, 1));
terrGeo.computeVertexNormals();

const terrMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92, metalness: 0 });
terrMat.onBeforeCompile = (sh) => {
  sh.uniforms.uTempo = uTempo;
  sh.vertexShader = 'attribute float aGlow; attribute float aWet; varying float vGlow; varying float vWet; varying vec3 vWP;\n' +
    sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow=aGlow; vWet=aWet; vWP=(modelMatrix*vec4(position,1.)).xyz;');
  sh.fragmentShader = 'uniform float uTempo; varying float vGlow; varying float vWet; varying vec3 vWP;\n' +
    sh.fragmentShader
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif(length(vWP.xz)>7.45) discard;')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness*(1.0-0.78*vWet);')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float pul = 0.8+0.2*sin(uTempo*2.2 + vWP.x*3.1 + vWP.z*2.3);
        float n1 = sin(vWP.x*7.0 + sin(vWP.z*5.0+uTempo*0.6)*1.6);
        float n2 = sin(vWP.z*6.5 + sin(vWP.x*4.0-uTempo*0.45)*1.6);
        float crepa = 1.0 - smoothstep(0.0, 0.32, abs(n1*n2));
        vec3 lavaCol = mix(vec3(0.9,0.16,0.02), vec3(1.0,0.62,0.12), crepa);
        totalEmissiveRadiance += lavaCol * vGlow * (0.35 + 1.1*crepa) * pul;`);
};
const terreno = new THREE.Mesh(terrGeo, terrMat);
terreno.receiveShadow = true; terreno.castShadow = true;
scene.add(terreno);

// colori dei terreni (spazio lineare)
const K = (h) => new THREE.Color(h);
const COL = {
  erba1: K('#8fcb5c'), erba2: K('#b5dc6c'), erba3: K('#6db552'), terra: K('#b37a4b'), sabbia: K('#f3dca4'), sabbia2: K('#e8c98c'),
  fango: K('#6e4a30'), fango2: K('#86603f'), argilla: K('#dd8350'), argilla2: K('#c96b3e'), lava: K('#4a1508'), lava2: K('#8a2a0c'),
  pietra: K('#736d69'), pietra2: K('#968f88'), cenere: K('#86807a'), cenere2: K('#9c958d'), vetro: K('#bff1f4'), vetro2: K('#8fdbe6'),
  fondo: K('#f0d9a2'), fondo2: K('#9fc7b8'),
};
const tmpC = new THREE.Color(), tmpC2 = new THREE.Color();
function coloreBersaglio(i, out) {
  const v = VAR[i], h = H[i];
  let glow = 0, wet = 0;
  switch (T[i]) {
    case ERBA: {
      out.copy(COL.erba1).lerp(COL.erba2, smooth(0.45, 0.95, v));
      out.lerp(COL.erba3, smooth(0.42, 0.1, v) * 0.85);
      out.lerp(COL.erba2, smooth(0.9, 1.6, h) * 0.5);
      out.lerp(COL.sabbia, smooth(0.24, 0.15, h));
      break;
    }
    case TERRA: out.copy(COL.terra).lerp(COL.fango2, v * 0.3); break;
    case SABBIA: out.copy(COL.sabbia).lerp(COL.sabbia2, v * 0.6); break;
    case FANGO: out.copy(COL.fango).lerp(COL.fango2, v); wet = 1; break;
    case ARGILLA: out.copy(COL.argilla).lerp(COL.argilla2, v); break;
    case LAVA: { const a = clamp(LAV[i], 0, 1.5); out.copy(COL.lava).lerp(COL.lava2, clamp(a - 0.2, 0, 1) * 0.8); glow = 0.55 + clamp(a, 0, 1) * 0.6; wet = 0.5; break; }
    case PIETRA: out.copy(COL.pietra).lerp(COL.pietra2, v); break;
    case CENERE: out.copy(COL.cenere).lerp(COL.cenere2, v); break;
    case VETRO: out.copy(COL.vetro).lerp(COL.vetro2, v); wet = 1; break;
    default: out.copy(COL.fondo).lerp(COL.fondo2, smooth(-0.05, -0.8, h)); break;
  }
  return [glow, wet];
}
// colori correnti: si avvicinano al bersaglio (le trasformazioni sono animate)
let terrAttivo = 3;
function inizializzaColori() {
  for (let i = 0; i < NV; i++) { const [g, w] = coloreBersaglio(i, tmpC); tCol[i * 3] = tmpC.r; tCol[i * 3 + 1] = tmpC.g; tCol[i * 3 + 2] = tmpC.b; tGlow[i] = g; tWet[i] = w; }
}
inizializzaColori();
function aggiornaColori(dt) {
  if (terrAttivo <= 0) return;
  terrAttivo -= dt;
  const k = 1 - Math.exp(-dt * 5);
  for (let i = 0; i < NV; i++) {
    const [g, w] = coloreBersaglio(i, tmpC);
    tCol[i * 3] += (tmpC.r - tCol[i * 3]) * k; tCol[i * 3 + 1] += (tmpC.g - tCol[i * 3 + 1]) * k; tCol[i * 3 + 2] += (tmpC.b - tCol[i * 3 + 2]) * k;
    tGlow[i] += (g - tGlow[i]) * k; tWet[i] += (w - tWet[i]) * k;
  }
  terrGeo.attributes.color.needsUpdate = true; terrGeo.attributes.aGlow.needsUpdate = true; terrGeo.attributes.aWet.needsUpdate = true;
}
function sveglia() { terrAttivo = 2.5; }

// cambi di terreno in arrivo con un piccolo ritardo (l'onda che si allarga)
const inArrivo = [];
function cambia(i, tipo, ritardo = 0) {
  if (ritardo <= 0) { applicaTipo(i, tipo); return; }
  inArrivo.push({ i, tipo, t: ritardo });
}
function applicaTipo(i, tipo) {
  if (T[i] === LAVA && tipo !== LAVA) { LAV[i] = 0; lavaAttiva.delete(i); }
  T[i] = tipo; ASC[i] = 0; sveglia(); ciuffiSporchi = true;
}
function aggiornaInArrivo(dt) {
  for (let k = inArrivo.length - 1; k >= 0; k--) {
    const p = inArrivo[k]; p.t -= dt;
    if (p.t <= 0) { applicaTipo(p.i, p.tipo); inArrivo.splice(k, 1); }
  }
}
// pennellata: cambia il terreno attorno a un punto, con bordo irregolare
function pennella(x, z, r, tipo, filtro, onda = 0.5) {
  let n = 0;
  forCelle(x, z, r * 1.25, (i, d) => {
    if (H[i] <= 0.025 && tipo !== PIETRA) return;
    const lim = r * (0.75 + 0.45 * hash(PX[i] * 3.1, PZ[i] * 2.7));
    if (d > lim) return;
    if (filtro && !filtro(T[i], i)) return;
    if (T[i] === tipo) return;
    cambia(i, tipo, (d / r) * onda + rand(0, 0.08)); n++;
  });
  return n;
}
function forCelle(x, z, r, fn) {
  const i0 = Math.max(0, Math.floor((x - r + G) / PASSO)), i1 = Math.min(N, Math.ceil((x + r + G) / PASSO));
  const j0 = Math.max(0, Math.floor((z - r + G) / PASSO)), j1 = Math.min(N, Math.ceil((z + r + G) / PASSO));
  for (let iz = j0; iz <= j1; iz++) for (let ix = i0; ix <= i1; ix++) {
    const i = idx(ix, iz), d = Math.hypot(PX[i] - x, PZ[i] - z);
    if (d <= r) fn(i, d);
  }
}
function cellaDi(x, z) { const ix = clamp(Math.round((x + G) / PASSO), 0, N), iz = clamp(Math.round((z + G) / PASSO), 0, N); return idx(ix, iz); }
function altezza(x, z) {
  const fx = clamp((x + G) / PASSO, 0, N - 0.001), fz = clamp((z + G) / PASSO, 0, N - 0.001);
  const ix = Math.floor(fx), iz = Math.floor(fz), u = fx - ix, v = fz - iz;
  return lerp(lerp(H[idx(ix, iz)], H[idx(ix + 1, iz)], u), lerp(H[idx(ix, iz + 1)], H[idx(ix + 1, iz + 1)], u), v);
}
function suolo(x, z) { return Math.max(altezza(x, z), 0); }

// mappa delle altezze per il mare (schiuma vicino alla riva)
const hData = new Uint8Array(NV);
const hTex = new THREE.DataTexture(hData, V, V, THREE.RedFormat, THREE.UnsignedByteType);
hTex.magFilter = THREE.LinearFilter; hTex.minFilter = THREE.LinearFilter;
function aggiornaAltezze() {
  for (let i = 0; i < NV; i++) { hData[i] = clamp(Math.round(((H[i] + 1.5) / 3.5) * 255), 0, 255); tPos[i * 3 + 1] = H[i]; }
  hTex.needsUpdate = true;
  terrGeo.attributes.position.needsUpdate = true;
  terrGeo.computeVertexNormals();
  terrGeo.computeBoundingSphere(); terrGeo.computeBoundingBox();
  ciuffiSporchi = true;
}
aggiornaAltezze();

// ───────────────────────── mare, plastico e base
const mareUni = { uTempo, uH: { value: hTex }, uOnda: { value: 1 }, uBasso: { value: K('#62e3d6') }, uFondo: { value: K('#2fa8cf') }, uNotte: { value: 0 } };
const mareMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 0.18, metalness: 0.05, transparent: true });
mareMat.onBeforeCompile = (sh) => {
  Object.assign(sh.uniforms, mareUni);
  sh.vertexShader = 'uniform float uTempo; uniform float uOnda; varying vec3 vMP;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
    float rr = length(transformed.xz);
    float w = sin(transformed.x*1.25+uTempo*1.05)*0.55 + sin(transformed.z*1.6-uTempo*1.3)*0.45 + sin((transformed.x+transformed.z)*2.6+uTempo*1.9)*0.25;
    transformed.y += w*0.05*uOnda*(1.0-smoothstep(6.6,7.45,rr));
    vMP = transformed;`);
  sh.fragmentShader = 'uniform float uTempo; uniform sampler2D uH; uniform vec3 uBasso; uniform vec3 uFondo; uniform float uNotte; varying vec3 vMP;\n' +
    sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      if(length(vMP.xz)>7.5) discard;
      float h = texture2D(uH, (vMP.xz+6.0)/12.0*(${N}.0/${V}.0) + vec2(0.5/${V}.0)).r*3.5-1.5;
      float prof = clamp(-h, 0.0, 2.0);
      vec3 col = mix(uBasso, uFondo, smoothstep(0.02, 0.85, prof));
      float bordo = 1.0 - smoothstep(0.0, 0.16, prof + 0.035*sin(uTempo*2.3 + vMP.x*5.0 + vMP.z*4.0));
      float righe = (1.0-smoothstep(0.12, 0.42, prof)) * step(0.72, fract(prof*7.0 - uTempo*0.45)) * 0.55;
      float schiuma = clamp(bordo + righe, 0.0, 1.0);
      col = mix(col, vec3(1.0), schiuma*0.9);
      diffuseColor.rgb = col;
      totalEmissiveRadiance += col*(0.32 - 0.22*uNotte);
      diffuseColor.a = max(mix(0.5, 0.94, smoothstep(0.0, 0.75, prof)), schiuma*0.95);`);
};
const mareGeo = new THREE.PlaneGeometry(15.2, 15.2, 64, 64).rotateX(-Math.PI / 2);
const mare = new THREE.Mesh(mareGeo, mareMat);
mare.receiveShadow = true; mare.renderOrder = 2;
scene.add(mare);

const fondale = new THREE.Mesh(new THREE.CircleGeometry(7.5, 72).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x8fc7b4, roughness: 1 }));
fondale.position.y = -1.04; scene.add(fondale);

function cilindroSfumato(r1, r2, h, y, cTop, cBot, segH = 6) {
  const g = new THREE.CylinderGeometry(r1, r2, h, 96, segH, true);
  const p = g.attributes.position, col = new Float32Array(p.count * 3), a = K(cTop), b = K(cBot);
  for (let i = 0; i < p.count; i++) {
    const t = (p.getY(i) + h / 2) / h; tmpC.copy(b).lerp(a, t);
    col[i * 3] = tmpC.r; col[i * 3 + 1] = tmpC.g; col[i * 3 + 2] = tmpC.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide }));
  m.position.y = y; scene.add(m); return m;
}
cilindroSfumato(7.5, 7.5, 1.1, -0.55, '#5fd6d6', '#1f74a3', 4);           // acqua vista di lato
cilindroSfumato(7.5, 7.5, 0.3, -1.25, '#f0d29a', '#d9ae72', 1);           // sabbia del fondo
cilindroSfumato(7.5, 7.0, 0.6, -1.7, '#b98656', '#7a5236', 1);            // terra sotto
const tappo = new THREE.Mesh(new THREE.CircleGeometry(7.0, 72).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x6b4630 }));
tappo.position.y = -2.0; scene.add(tappo);
// ombra morbida sotto il plastico
(() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const x = cv.getContext('2d'), gr = x.createRadialGradient(64, 64, 10, 64, 64, 64);
  gr.addColorStop(0, 'rgba(30,20,50,0.55)'); gr.addColorStop(0.6, 'rgba(30,20,50,0.25)'); gr.addColorStop(1, 'rgba(30,20,50,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(cv);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(22, 22).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
  m.position.y = -3.2; scene.add(m);
})();

// ───────────────────────── particelle
class Particelle {
  constructor(max, additivo) {
    this.max = max; this.cur = 0;
    const A = (n) => new Float32Array(max * n);
    Object.assign(this, { pos: A(3), col: A(3), dim: A(1), alfa: A(1), vel: A(3), vita: A(1), vmax: A(1), s0: A(1), s1: A(1), a0: A(1), gr: A(1), at: A(1), c0: A(3), c1: A(3) });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aC', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aS', new THREE.BufferAttribute(this.dim, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aA', new THREE.BufferAttribute(this.alfa, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uScala: { value: 400 } },
      vertexShader: `attribute vec3 aC; attribute float aS; attribute float aA; uniform float uScala; varying vec3 vC; varying float vA;
        void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*mv; gl_PointSize = aS*uScala/max(-mv.z,0.1); vC=aC; vA=aA; }`,
      fragmentShader: additivo
        ? `varying vec3 vC; varying float vA; void main(){ float r=length(gl_PointCoord-.5); float a=smoothstep(.5,.0,r); gl_FragColor=vec4(vC*vA*a*1.4, 1.0); }`
        : `varying vec3 vC; varying float vA; void main(){ float r=length(gl_PointCoord-.5); float a=smoothstep(.5,.12,r); gl_FragColor=vec4(vC, vA*a); }`,
      transparent: true, depthWrite: false,
      blending: additivo ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.punti = new THREE.Points(g, this.mat);
    this.punti.frustumCulled = false; this.punti.renderOrder = additivo ? 6 : 5;
    scene.add(this.punti);
  }
  emetti(x, y, z, vx, vy, vz, vita, s0, s1, c0, c1, a0 = 1, gr = 0, at = 0) {
    const i = this.cur; this.cur = (this.cur + 1) % this.max;
    const i3 = i * 3;
    this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z;
    this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
    this.vita[i] = vita; this.vmax[i] = vita; this.s0[i] = s0; this.s1[i] = s1; this.a0[i] = a0; this.gr[i] = gr; this.at[i] = at;
    this.c0[i3] = c0[0]; this.c0[i3 + 1] = c0[1]; this.c0[i3 + 2] = c0[2];
    this.c1[i3] = c1[0]; this.c1[i3 + 1] = c1[1]; this.c1[i3 + 2] = c1[2];
  }
  aggiorna(dt) {
    for (let i = 0; i < this.max; i++) {
      if (this.vita[i] <= 0) { if (this.alfa[i] !== 0) { this.alfa[i] = 0; this.dim[i] = 0; } continue; }
      this.vita[i] -= dt;
      const i3 = i * 3, k = 1 - Math.max(this.vita[i], 0) / this.vmax[i];
      const att = Math.max(0, 1 - this.at[i] * dt);
      this.vel[i3] *= att; this.vel[i3 + 1] = this.vel[i3 + 1] * att + this.gr[i] * dt; this.vel[i3 + 2] *= att;
      this.pos[i3] += this.vel[i3] * dt; this.pos[i3 + 1] += this.vel[i3 + 1] * dt; this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      this.dim[i] = lerp(this.s0[i], this.s1[i], k);
      this.alfa[i] = this.a0[i] * Math.min(1, k * 7) * (1 - k * k);
      this.col[i3] = lerp(this.c0[i3], this.c1[i3], k); this.col[i3 + 1] = lerp(this.c0[i3 + 1], this.c1[i3 + 1], k); this.col[i3 + 2] = lerp(this.c0[i3 + 2], this.c1[i3 + 2], k);
    }
    const a = this.punti.geometry.attributes;
    a.position.needsUpdate = a.aC.needsUpdate = a.aS.needsUpdate = a.aA.needsUpdate = true;
  }
}
const luce = new Particelle(1400, true);   // fuoco, scintille, lucciole
const fumo = new Particelle(900, false);   // vapore, fumo, schizzi, polvere

const CF = { fiamma: raw(0xffb347), giallo: raw(0xffe27a), arancio: raw(0xff8a2b), rosso: raw(0xd8331a), bianco: raw(0xffffff), azz: raw(0xbfe8ff), acqua: raw(0x5cc8f2), grigio: raw(0x8a8580), scuro: raw(0x3e3a38), oro: raw(0xffd36a), verde: raw(0x9be15d), marrone: raw(0x8a603e), vapore: raw(0xf4f7fa) };

function fiammata(x, y, z, n = 26, forza = 1) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, 6.28), v = rand(0.3, 1.6) * forza;
    luce.emetti(x, y + 0.05, z, Math.cos(a) * v, rand(1.2, 3.2) * forza, Math.sin(a) * v, rand(0.4, 0.9), rand(0.25, 0.45), 0.02, CF.giallo, CF.rosso, 1, -1.5, 2.5);
  }
  for (let i = 0; i < n / 3; i++) fumo.emetti(x + rand(-0.2, 0.2), y + 0.3, z + rand(-0.2, 0.2), rand(-0.2, 0.2), rand(0.6, 1.2), rand(-0.2, 0.2), rand(1.2, 2), 0.25, 0.9, CF.grigio, CF.scuro, 0.35, 0, 0.5);
}
function schizzo(x, y, z, n = 26, colore = CF.acqua) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, 6.28), v = rand(0.6, 2.2);
    fumo.emetti(x, y + 0.05, z, Math.cos(a) * v, rand(2, 4.2), Math.sin(a) * v, rand(0.5, 0.9), rand(0.09, 0.16), 0.04, colore, CF.bianco, 0.95, -11, 0.5);
  }
  anello(x, y + 0.03, z, 0xffffff, 0.15, 1.2, 0.9, false, 0.7);
}
function polvere(x, y, z, n = 14, colore = CF.marrone) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, 6.28), v = rand(0.4, 1.4);
    fumo.emetti(x, y + 0.05, z, Math.cos(a) * v, rand(0.3, 1), Math.sin(a) * v, rand(0.6, 1.1), 0.15, 0.45, colore, CF.bianco, 0.6, -1, 2.5);
  }
}
function scintille(x, y, z, n = 40, colore = CF.oro, forza = 1) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, 6.28), e = rand(0.2, 1.3), v = rand(1.2, 3.4) * forza;
    luce.emetti(x, y, z, Math.cos(a) * v * Math.cos(e), Math.sin(e) * v + 1.2, Math.sin(a) * v * Math.cos(e), rand(0.7, 1.4), rand(0.12, 0.22), 0.02, CF.bianco, colore, 1, -3.5, 1.4);
  }
}
function foglie(x, y, z, n = 12) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, 6.28), v = rand(0.4, 1.2);
    fumo.emetti(x, y, z, Math.cos(a) * v, rand(1, 2.2), Math.sin(a) * v, rand(0.7, 1.1), 0.1, 0.06, CF.verde, raw(0x5fae4a), 1, -5, 1.2);
  }
}

// anelli e colonne di luce
const anelloGeo = new THREE.RingGeometry(0.9, 1, 56).rotateX(-Math.PI / 2);
function anello(x, y, z, colore, r0, r1, dur, additivo = true, op = 0.9) {
  const m = new THREE.Mesh(anelloGeo, new THREE.MeshBasicMaterial({ color: colore, transparent: true, depthWrite: false, opacity: op, blending: additivo ? THREE.AdditiveBlending : THREE.NormalBlending, fog: false }));
  m.position.set(x, y, z); m.renderOrder = 7; scene.add(m);
  tween(dur, (k) => { const e = easeOutCubic(k); m.scale.setScalar(lerp(r0, r1, e)); m.material.opacity = op * (1 - k); }, () => { scene.remove(m); m.material.dispose(); });
}
const colonnaGeo = new THREE.CylinderGeometry(1, 1, 1, 24, 1, true).translate(0, 0.5, 0);
const colonnaMat = (c) => new THREE.ShaderMaterial({
  uniforms: { uC: { value: new THREE.Vector3(...raw(c)) }, uA: { value: 1 } },
  vertexShader: 'varying vec2 vU; varying vec3 vN; varying vec3 vV; void main(){ vU=uv; vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
  fragmentShader: 'uniform vec3 uC; uniform float uA; varying vec2 vU; varying vec3 vN; varying vec3 vV; void main(){ float f=abs(dot(normalize(vN),normalize(vV))); float a=(1.0-vU.y)*(1.0-vU.y)*smoothstep(0.0,0.08,vU.y)*uA*pow(f,2.5)*0.85; gl_FragColor=vec4(uC*a,1.0); }',
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
});
function colonna(x, y, z, c, alta = 5) {
  const m = new THREE.Mesh(colonnaGeo, colonnaMat(c));
  m.position.set(x, y, z); m.renderOrder = 8; scene.add(m);
  tween(1.4, (k) => { const r = lerp(0.12, 0.42, easeOutCubic(k)) * (1 - k * 0.5); m.scale.set(r, alta * easeOutCubic(Math.min(1, k * 3)), r); m.material.uniforms.uA.value = 1 - k; }, () => { scene.remove(m); m.material.dispose(); });
}

// pioggia: segmenti che cadono
const PIOGGIA_MAX = 260;
const pioggiaPos = new Float32Array(PIOGGIA_MAX * 6), pioggiaV = new Float32Array(PIOGGIA_MAX), pioggiaVivi = new Uint8Array(PIOGGIA_MAX);
const pioggiaGeo = new THREE.BufferGeometry();
pioggiaGeo.setAttribute('position', new THREE.BufferAttribute(pioggiaPos, 3).setUsage(THREE.DynamicDrawUsage));
const pioggiaLinee = new THREE.LineSegments(pioggiaGeo, new THREE.LineBasicMaterial({ color: 0xd4ecff, transparent: true, opacity: 0.65, fog: false }));
pioggiaLinee.frustumCulled = false; scene.add(pioggiaLinee);
let pioggiaCur = 0;
function goccia(x, y, z) {
  const i = pioggiaCur; pioggiaCur = (pioggiaCur + 1) % PIOGGIA_MAX;
  pioggiaVivi[i] = 1; pioggiaV[i] = rand(7, 9);
  pioggiaPos.set([x, y, z, x - 0.02, y + 0.28, z], i * 6);
}
function aggiornaPioggia(dt) {
  for (let i = 0; i < PIOGGIA_MAX; i++) {
    if (!pioggiaVivi[i]) continue;
    const o = i * 6, dy = pioggiaV[i] * dt;
    pioggiaPos[o + 1] -= dy; pioggiaPos[o + 4] -= dy; pioggiaPos[o] += dt * 0.15; pioggiaPos[o + 3] += dt * 0.15;
    const x = pioggiaPos[o], z = pioggiaPos[o + 2], g = suolo(x, z);
    if (pioggiaPos[o + 1] <= g) {
      pioggiaVivi[i] = 0; pioggiaPos.fill(0, o, o + 6);
      if (Math.random() < 0.25) fumo.emetti(x, g + 0.02, z, rand(-0.3, 0.3), rand(0.4, 0.8), rand(-0.3, 0.3), 0.3, 0.06, 0.02, CF.azz, CF.bianco, 0.8, -6, 0);
    }
  }
  pioggiaGeo.attributes.position.needsUpdate = true;
}

// ───────────────────────── decorazioni: ciuffi d'erba, fiori, sassi
const ciuffi = (() => {
  const geoC = new THREE.ConeGeometry(0.04, 0.12, 3).translate(0, 0.05, 0);
  const geoF = new THREE.IcosahedronGeometry(0.045, 0).translate(0, 0.04, 0);
  const n = 140;
  const erba = new THREE.InstancedMesh(geoC, new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9 }), n);
  const fiori = new THREE.InstancedMesh(geoF, new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.6 }), n);
  const dati = [];
  let kc = 0, kf = 0, tent = 0;
  while (kc + kf < n && tent < 6000) {
    tent++;
    const x = rand(-4.6, 4.6), z = rand(-4.6, 4.6), i = cellaDi(x, z);
    if (T[i] !== ERBA || H[i] < 0.24) continue;
    const fiore = Math.random() < 0.35;
    if (fiore) {
      // i fiori stanno a mazzetti
      const col = K(['#ffffff', '#ffe066', '#ff9fb8', '#c7a6ff', '#ff8a5c'][(Math.random() * 5) | 0]);
      for (let q = 0; q < 3 && kf < n; q++) { dati.push({ x: x + rand(-0.12, 0.12), z: z + rand(-0.12, 0.12), i, s: rand(0.7, 1.2), r: rand(0, 6.28), m: fiori, k: kf }); fiori.setColorAt(kf++, col); }
    } else {
      dati.push({ x, z, i, s: rand(0.8, 1.4), r: rand(0, 6.28), m: erba, k: kc });
      erba.setColorAt(kc++, K('#7fc452').lerp(K('#b4de6c'), Math.random()));
    }
  }
  erba.count = kc; fiori.count = kf;
  erba.receiveShadow = fiori.receiveShadow = true;
  scene.add(erba, fiori);
  return { erba, fiori, dati };
})();
const mtmp = new THREE.Matrix4(), qtmp = new THREE.Quaternion(), vtmp = new THREE.Vector3(), stmp = new THREE.Vector3();
function aggiornaCiuffi() {
  if (!ciuffiSporchi) return;
  ciuffiSporchi = false;
  ciuffi.dati.forEach((d) => {
    const vivo = T[d.i] === ERBA && H[d.i] > 0.2;
    qtmp.setFromAxisAngle(vtmp.set(0, 1, 0), d.r);
    stmp.setScalar(vivo ? d.s : 0.0001);
    mtmp.compose(vtmp.set(d.x, altezza(d.x, d.z) - 0.01, d.z), qtmp, stmp);
    d.m.setMatrixAt(d.k, mtmp);
  });
  [ciuffi.erba, ciuffi.fiori].forEach((m) => { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; });
}
const sassoGeo = new THREE.DodecahedronGeometry(0.2, 0);
const sassi = [];
[[2.9, 1.9, 1.1], [-3.1, 1.7, 0.8], [0.6, -3.3, 1.3], [-0.6, -1.4, 0.7], [3.2, -1.2, 0.9], [-1.9, 2.9, 0.6]].forEach(([x, z, s]) => {
  const m = new THREE.Mesh(sassoGeo, new THREE.MeshStandardMaterial({ color: 0x9a968f, flatShading: true, roughness: 0.85 }));
  m.scale.set(s, s * 0.7, s * 0.9); m.rotation.set(rand(0, 1), rand(0, 6), rand(0, 1));
  m.position.set(x, altezza(x, z) + 0.04 * s, z); m.castShadow = true; m.receiveShadow = true;
  scene.add(m); sassi.push(m);
});

// gabbiani
const gabbiani = [];
for (let i = 0; i < 0; i++) {
  const g = new THREE.Group();
  const ala = new THREE.BoxGeometry(0.22, 0.012, 0.06);
  const m = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const a1 = new THREE.Mesh(ala, m), a2 = new THREE.Mesh(ala, m);
  a1.position.x = 0.1; a2.position.x = -0.1;
  const p1 = new THREE.Group(), p2 = new THREE.Group(); p1.add(a1); p2.add(a2);
  g.add(p1, p2); g.userData = { p1, p2, r: rand(3.5, 6), h: rand(2.6, 3.6), v: rand(0.25, 0.4) * (i % 2 ? 1 : -1), f: rand(0, 6) };
  scene.add(g); gabbiani.push(g);
}

// ───────────────────────── geometrie condivise per le cose del mondo
const GEO = {
  tronco: new THREE.CylinderGeometry(0.05, 0.085, 0.5, 5).translate(0, 0.25, 0),
  chioma: new THREE.IcosahedronGeometry(0.34, 0),
  chiomaP: new THREE.IcosahedronGeometry(0.22, 0),
  cono: new THREE.ConeGeometry(0.34, 0.5, 6),
  cespo: new THREE.IcosahedronGeometry(0.16, 0),
  foglia: new THREE.SphereGeometry(0.07, 5, 3).scale(1, 0.3, 0.55),
  stelo: new THREE.CylinderGeometry(0.012, 0.016, 0.16, 4).translate(0, 0.08, 0),
  mattone: new THREE.BoxGeometry(0.2, 0.075, 0.1),
  tronchetto: new THREE.CylinderGeometry(0.05, 0.05, 0.44, 7).rotateZ(Math.PI / 2),
  corpo: new THREE.CapsuleGeometry(0.055, 0.09, 2, 7).translate(0, 0.105, 0),
  testa: new THREE.SphereGeometry(0.052, 10, 8),
  capelli: new THREE.SphereGeometry(0.056, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
  puff: new THREE.IcosahedronGeometry(1, 1),
};
const mat = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.82, ...extra });
const ombre = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };

// ───────────────────────── le cose che vivono nel mondo
const cose = [];
const SC = 1.45; // grandezza delle cose nel mondo
function aggiungi(c) { cose.push(c); scene.add(c.radice); return c; }
function togli(c) { const i = cose.indexOf(c); if (i >= 0) cose.splice(i, 1); scene.remove(c.radice); c.morto = true; }
const contaCose = (tipo) => cose.filter((c) => !c.morto && c.genere === tipo).length;

class Pianta {
  constructor(x, z, stadio = 0) {
    this.genere = 'pianta'; this.x = x; this.z = z; this.stadio = stadio; this.cresci = 0; this.bagnata = 0;
    this.brucia = false; this.tBrucia = 0; this.propagato = false; this.fase = rand(0, 6.28); this.scala = SC;
    this.radice = new THREE.Group(); this.corpo = new THREE.Group(); this.radice.add(this.corpo);
    const verdi = ['#5fae4a', '#6dbb4f', '#4f9e45', '#7cc456', '#58a858'];
    this.mFoglie = mat(verdi[(Math.random() * verdi.length) | 0]);
    this.mTronco = mat('#8a5a3b');
    // germoglio
    this.s0 = new THREE.Group();
    const st = new THREE.Mesh(GEO.stelo, mat('#7bc35a')); this.s0.add(st);
    const f1 = new THREE.Mesh(GEO.foglia, this.mFoglie); f1.position.set(0.05, 0.15, 0); f1.rotation.z = 0.5;
    const f2 = new THREE.Mesh(GEO.foglia, this.mFoglie); f2.position.set(-0.05, 0.13, 0); f2.rotation.z = -0.5;
    this.s0.add(f1, f2);
    // pianta (cespuglio)
    this.s1 = new THREE.Group();
    const c1 = new THREE.Mesh(GEO.cespo, this.mFoglie); c1.position.y = 0.14;
    const c2 = new THREE.Mesh(GEO.cespo, this.mFoglie); c2.position.set(0.1, 0.1, 0.05); c2.scale.setScalar(0.7);
    const c3 = new THREE.Mesh(GEO.cespo, this.mFoglie); c3.position.set(-0.09, 0.09, -0.04); c3.scale.setScalar(0.65);
    this.s1.add(c1, c2, c3);
    // albero (tondo o a punta)
    this.s2 = new THREE.Group();
    const tr = new THREE.Mesh(GEO.tronco, this.mTronco); this.s2.add(tr);
    if (Math.random() < 0.35) {
      const a = new THREE.Mesh(GEO.cono, this.mFoglie); a.position.y = 0.55;
      const b = new THREE.Mesh(GEO.cono, this.mFoglie); b.position.y = 0.82; b.scale.setScalar(0.72);
      this.s2.add(a, b);
    } else {
      const a = new THREE.Mesh(GEO.chioma, this.mFoglie); a.position.y = 0.66; a.rotation.set(rand(0, 1), rand(0, 3), 0);
      const b = new THREE.Mesh(GEO.chiomaP, this.mFoglie); b.position.set(0.17, 0.82, 0.06);
      const c = new THREE.Mesh(GEO.chiomaP, this.mFoglie); c.position.set(-0.14, 0.58, -0.1); c.scale.setScalar(0.85);
      this.s2.add(a, b, c);
    }
    this.corpo.add(ombre(this.s0), ombre(this.s1), ombre(this.s2));
    this.corpo.rotation.y = rand(0, 6.28);
    this.dim = rand(0.85, 1.15);
    [this.s0, this.s1, this.s2].forEach((s, k) => s.scale.setScalar(k === stadio ? this.dim : 0.0001));
    this.radice.position.set(x, suolo(x, z), z);
  }
  tipo() { return this.brucia ? 'incendio' : ['germoglio', 'pianta', 'albero'][this.stadio]; }
  cambiaStadio(nuovo, auto = true) {
    if (this.brucia || nuovo > 2) return;
    const vecchio = [this.s0, this.s1, this.s2][this.stadio], neo = [this.s0, this.s1, this.s2][nuovo];
    this.stadio = nuovo; this.cresci = 0;
    tween(0.25, (k) => vecchio.scale.setScalar(Math.max(0.0001, this.dim * (1 - k))));
    tween(1.1, (k) => neo.scale.setScalar(Math.max(0.0001, this.dim * easeOutElastic(k))));
    const y = this.radice.position.y;
    foglie(this.x, y + 0.3 + nuovo * 0.2, this.z, 10 + nuovo * 6);
    scintille(this.x, y + 0.2, this.z, 12, CF.verde, 0.6);
    Suoni.cresce();
    if (nuovo >= 1) pennella(this.x, this.z, 0.35 + nuovo * 0.1, ERBA, (t) => t === FANGO || t === CENERE || t === TERRA, 0.3);
    scopri(nuovo === 1 ? 'pianta' : 'albero', this.x, y + 0.6, this.z, auto);
  }
  accendi(auto = true) {
    if (this.brucia || this.morto) return;
    this.brucia = true; this.tBrucia = 0; this.propagato = false;
    if (!this.alone) {
      this.alone = new THREE.Sprite(new THREE.SpriteMaterial({ map: alonoTex, color: 0xff9a4a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false }));
      this.alone.position.y = 0.3 + this.stadio * 0.25; this.radice.add(this.alone);
    }
    Suoni.fiamma();
    fiammata(this.x, this.radice.position.y + 0.3, this.z, 20);
    scopri('incendio', this.x, this.radice.position.y + 0.9, this.z, auto);
  }
  spegni() {
    if (!this.brucia) return;
    this.brucia = false; this.tBrucia = 0;
    if (this.alone) { this.radice.remove(this.alone); this.alone = null; }
    this.mFoglie.emissive.setRGB(0, 0, 0);
    this.mFoglie.color.set('#4c7a3c');
  }
  annaffia() { this.bagnata = 4; this.cresci += 1.5; }
  abbatti() {
    if (this.stadio < 2 || this.cadendo) return;
    this.cadendo = true;
    const dir = rand(0, 6.28);
    this.corpo.rotation.y = dir;
    Suoni.crollo();
    tween(0.7, (k) => { this.s2.rotation.x = easeInCubic(k) * 1.45; }, () => {
      polvere(this.x, this.radice.position.y, this.z, 18);
      dopo(0.25, () => {
        togli(this);
        aggiungi(new Pila(this.x, this.z, 'legna'));
        scopri('legno', this.x, suolo(this.x, this.z) + 0.4, this.z, false);
      });
    });
  }
  aggiorna(dt, t) {
    const y = suolo(this.x, this.z);
    this.radice.position.y = y;
    const vento = 1 + ventoForza * 3;
    this.corpo.rotation.z = Math.sin(t * 1.6 + this.fase) * 0.025 * vento * (this.stadio + 1) / 2;
    this.radice.scale.setScalar(this.scala * (this.evidenza ? 1 + 0.07 * Math.sin(t * 12) : 1));
    if (this.cadendo) return;
    if (this.brucia) {
      this.tBrucia += dt;
      const k = clamp(this.tBrucia / 5, 0, 1);
      const fl = 0.5 + 0.5 * Math.sin(t * 20 + this.fase) * Math.sin(t * 7.7);
      this.mFoglie.color.set('#5fae4a').lerp(tmpC2.set('#4a2c1c'), Math.min(1, k * 1.5));
      this.mTronco.color.set('#8a5a3b').lerp(tmpC2.set('#3a2418'), k);
      this.mFoglie.emissive.setRGB(1, 0.38, 0.06).multiplyScalar((0.3 + 0.45 * fl) * (1 - k * 0.6));
      if (this.alone) { this.alone.material.opacity = (0.3 + 0.2 * fl) * (1 - k * 0.7); this.alone.scale.setScalar(1.5 + fl * 0.3); }
      const alto = 0.25 + this.stadio * 0.3;
      fuocoAttivo.push(this);
      const n = this.stadio === 2 ? 6 : 2, w = 0.4 * SC;
      for (let i = 0; i < n; i++) luce.emetti(this.x + rand(-w, w), y + rand(0.35, alto * SC + 0.7), this.z + rand(-w, w), rand(-0.1, 0.1), rand(1.0, 2.2), rand(-0.1, 0.1), rand(0.4, 0.8), rand(0.3, 0.55) * (1 - k * 0.5), 0.03, CF.fiamma, CF.rosso, 0.55, 0.5, 0.5);
      if (Math.random() < 0.25) fumo.emetti(this.x + rand(-0.1, 0.1), y + alto + 0.4, this.z, rand(-0.1, 0.1) + ventoForza, rand(0.5, 0.9), rand(-0.1, 0.1), rand(1.6, 2.6), 0.3, 1.1, CF.grigio, CF.scuro, 0.32, 0, 0.3);
      if (!this.propagato && this.tBrucia > 1.6) {
        this.propagato = true;
        cose.forEach((c) => {
          if (c !== this && c.genere === 'pianta' && !c.brucia && !c.morto && Math.hypot(c.x - this.x, c.z - this.z) < 1.3 + ventoForza)
            dopo(rand(0.2, 1.4), () => { if (!c.morto && !c.brucia) { c.accendi(true); catena(c.x, c.radice.position.y + 0.8, c.z, 'Il fuoco salta!'); } });
        });
      }
      if (this.tBrucia > 5.5) {
        togli(this);
        pennella(this.x, this.z, 0.55, CENERE, (t) => t !== LAVA, 0.4);
        polvere(this.x, y, this.z, 16, CF.grigio);
        scopri('cenere', this.x, y + 0.4, this.z, true);
      }
      return;
    }
    // crescita
    if (this.bagnata > 0) this.bagnata -= dt;
    this.cresci += dt * (this.bagnata > 0 ? 2.2 : 1);
    const soglia = this.stadio === 0 ? 4.5 : 6;
    if (this.stadio < 2 && this.cresci > soglia) this.cambiaStadio(this.stadio + 1, true);
  }
}

class Pila {
  constructor(x, z, tipo) {
    this.genere = tipo; this.x = x; this.z = z;
    this.radice = new THREE.Group(); this.corpo = new THREE.Group(); this.radice.add(this.corpo);
    if (tipo === 'legna') {
      const m = mat('#9a6238');
      [[0, 0.05, -0.055], [0, 0.05, 0.055], [0.02, 0.135, 0]].forEach(([a, b, c]) => { const t = new THREE.Mesh(GEO.tronchetto, m); t.position.set(a, b, c); this.corpo.add(t); });
    } else {
      const cols = ['#c45a3c', '#d4704c', '#b54d33', '#cf6646'];
      let k = 0;
      [[3, 0], [2, 1], [1, 2]].forEach(([n, liv]) => {
        for (let i = 0; i < n; i++) {
          const b = new THREE.Mesh(GEO.mattone, mat(cols[k++ % 4]));
          b.position.set((i - (n - 1) / 2) * 0.21, 0.04 + liv * 0.078, 0); b.rotation.y = rand(-0.06, 0.06);
          this.corpo.add(b);
        }
      });
    }
    ombre(this.corpo);
    this.corpo.rotation.y = rand(0, 6.28);
    this.radice.position.set(x, suolo(x, z), z);
    this.corpo.scale.setScalar(0.0001);
    tween(0.6, (k) => this.corpo.scale.setScalar(Math.max(0.0001, easeOutBack(k))));
  }
  tipo() { return this.genere; }
  aggiorna(dt, t) {
    this.radice.position.y = suolo(this.x, this.z);
    this.radice.scale.setScalar(SC * (this.evidenza ? 1 + 0.08 * Math.sin(t * 12) : 1));
  }
}

class Utensile {
  constructor(x, z) {
    this.genere = 'utensile'; this.x = x; this.z = z; this.t = 0;
    this.radice = new THREE.Group(); this.corpo = new THREE.Group(); this.radice.add(this.corpo);
    const manico = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.42, 5), mat('#a0703f'));
    const testa = new THREE.Mesh(new THREE.DodecahedronGeometry(0.075, 0), mat('#8d8a86'));
    testa.scale.set(1.5, 0.75, 0.55); testa.position.set(0.06, 0.17, 0);
    const lega = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.01, 4, 8), mat('#d8c39a')); lega.position.y = 0.17; lega.rotation.x = Math.PI / 2;
    this.corpo.add(manico, testa, lega); ombre(this.corpo); this.radice.scale.setScalar(SC);
    this.radice.position.set(x, suolo(x, z), z);
  }
  tipo() { return 'utensile'; }
  aggiorna(dt, t) {
    this.t += dt;
    const y = suolo(this.x, this.z);
    const vola = Math.max(0, 1 - this.t / 2.2);
    this.radice.position.y = y + 0.06 + vola * (0.55 + 0.08 * Math.sin(t * 4));
    this.corpo.rotation.set(lerp(1.35, 0.3 * Math.sin(t * 3), vola), this.t * 4 * vola + 0.6, 0);
    if (vola > 0 && Math.random() < 0.5) luce.emetti(this.x + rand(-0.15, 0.15), this.radice.position.y + rand(0, 0.3), this.z + rand(-0.15, 0.15), 0, 0.4, 0, 0.6, 0.14, 0.02, CF.bianco, CF.oro, 1);
  }
}

const finestraMat = new THREE.MeshStandardMaterial({ color: 0x51627a, emissive: 0xffc35c, emissiveIntensity: 0, roughness: 0.3, flatShading: true });
const alonoTex = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const x = cv.getContext('2d'), g = x.createRadialGradient(32, 32, 2, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,214,130,1)'); g.addColorStop(0.35, 'rgba(255,170,70,.45)'); g.addColorStop(1, 'rgba(255,150,60,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv);
})();
const aloniCase = [];
class Casa {
  constructor(x, z) {
    this.genere = 'casa'; this.x = x; this.z = z; this.dentro = 0; this.abitata = false; this.tFumo = 0;
    this.radice = new THREE.Group(); this.corpo = new THREE.Group(); this.radice.add(this.corpo);
    const muri = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.5), mat('#f4dfc0'));
    muri.position.y = 0.21;
    const zoccolo = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.08, 0.54), mat('#c76a48')); zoccolo.position.y = 0.04;
    const tetto = new THREE.Mesh(new THREE.ConeGeometry(0.56, 0.36, 4), mat('#c4513a'));
    tetto.rotation.y = Math.PI / 4; tetto.scale.set(1.0, 1, 0.84); tetto.position.y = 0.6;
    const porta = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.22, 0.03), mat('#7a4a2e')); porta.position.set(0, 0.11, 0.255);
    const f1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.11, 0.03), finestraMat); f1.position.set(0.19, 0.25, 0.255);
    const f2 = f1.clone(); f2.position.x = -0.19;
    const f3 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.11, 0.12), finestraMat); f3.position.set(0.315, 0.25, 0);
    const camino = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.22, 0.09), mat('#a8553f')); camino.position.set(0.16, 0.68, -0.08);
    this.corpo.add(muri, zoccolo, tetto, porta, f1, f2, f3, camino);
    ombre(this.corpo);
    const alone = new THREE.Sprite(new THREE.SpriteMaterial({ map: alonoTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false }));
    alone.scale.setScalar(1.3); alone.position.set(0, 0.28, 0.3); this.corpo.add(alone); aloniCase.push(alone);
    this.corpo.rotation.y = Math.atan2(camera.position.x - x, camera.position.z - z) + rand(-0.5, 0.5);
    this.radice.position.set(x, suolo(x, z), z);
    // costruzione: i muri salgono, il tetto cade dall'alto
    muri.scale.y = 0.001; zoccolo.scale.y = 0.001; tetto.position.y = 2.2; camino.scale.y = 0.001;
    [porta, f1, f2, f3].forEach((o) => o.scale.setScalar(0.001));
    tween(0.5, (k) => { zoccolo.scale.y = Math.max(0.001, easeOutBack(k)); });
    tween(0.7, (k) => { muri.scale.y = Math.max(0.001, easeOutBack(k)); muri.position.y = 0.21 * muri.scale.y; }, null, 0.2);
    tween(0.5, (k) => { tetto.position.y = lerp(2.2, 0.6, easeInCubic(k)); }, () => { polvere(x, suolo(x, z), z, 20, CF.oro); Suoni.tonfo(); tween(0.3, (k) => { tetto.scale.y = 1 - Math.sin(k * Math.PI) * 0.25; }); }, 0.75);
    tween(0.4, (k) => { [porta, f1, f2, f3].forEach((o) => o.scale.setScalar(Math.max(0.001, easeOutBack(k)))); camino.scale.y = Math.max(0.001, easeOutBack(k)); }, null, 1.25);
    this.porta = new THREE.Vector3();
  }
  tipo() { return 'casa'; }
  puntoPorta() {
    const a = this.corpo.rotation.y;
    return this.porta.set(this.x + Math.sin(a) * 0.42 * SC, 0, this.z + Math.cos(a) * 0.42 * SC);
  }
  aggiorna(dt, t) {
    this.radice.position.y = suolo(this.x, this.z);
    this.radice.scale.setScalar(SC * (this.evidenza ? 1 + 0.05 * Math.sin(t * 12) : 1));
    if (this.abitata || this.dentro > 0) {
      this.tFumo -= dt;
      if (this.tFumo <= 0) {
        this.tFumo = 0.16;
        const a = this.corpo.rotation.y, cx = this.x + (Math.cos(a) * 0.16 - Math.sin(a) * 0.08) * SC, cz = this.z + (-Math.sin(a) * 0.16 - Math.cos(a) * 0.08) * SC;
        fumo.emetti(cx, this.radice.position.y + 0.82 * SC, cz, rand(-0.05, 0.05) + 0.12 + ventoForza, rand(0.35, 0.55), rand(-0.05, 0.05), rand(2.2, 3.2), 0.1, 0.55, CF.bianco, raw(0xb9b4ae), 0.55, 0, 0.2);
      }
    }
  }
}

const MAGLIE = ['#e8604a', '#3f8fd8', '#f2b632', '#7b5cd6', '#2bb59a', '#ff7fae'];
class Omino {
  constructor(x, z, k) {
    this.genere = 'omino'; this.x = x; this.z = z; this.vx = 0; this.vz = 0; this.stato = 'salta'; this.t = 0; this.fase = rand(0, 6);
    this.radice = new THREE.Group(); this.corpo = new THREE.Group(); this.radice.add(this.corpo);
    const c = new THREE.Mesh(GEO.corpo, mat(MAGLIE[k % MAGLIE.length]));
    const te = new THREE.Mesh(GEO.testa, mat('#f6c9a0')); te.position.y = 0.245;
    const ca = new THREE.Mesh(GEO.capelli, mat(['#4a2f22', '#2b2420', '#c98b3c', '#7a3f22'][k % 4])); ca.position.y = 0.255; ca.rotation.x = -0.25;
    this.corpo.add(c, te, ca); ombre(this.corpo); this.corpo.scale.setScalar(SC * 1.1);
    this.meta = null; this.pausa = 0; this.casa = null;
    this.radice.position.set(x, suolo(x, z), z);
  }
  tipo() { return 'omino'; }
  nuovaMeta() {
    for (let i = 0; i < 20; i++) {
      const a = rand(0, 6.28), r = rand(0.6, 2.2), x = clamp(this.x + Math.cos(a) * r, -4.5, 4.5), z = clamp(this.z + Math.sin(a) * r, -4.5, 4.5);
      const c = cellaDi(x, z);
      if (H[c] > 0.12 && T[c] !== LAVA) { this.meta = { x, z }; return; }
    }
    this.meta = null; this.pausa = 1;
  }
  aggiorna(dt, t) {
    this.t += dt;
    const y = suolo(this.x, this.z);
    if (this.stato === 'salta') {
      // esce saltellando
      const k = clamp(this.t / 0.7, 0, 1);
      this.x += this.vx * dt; this.z += this.vz * dt;
      this.radice.position.set(this.x, suolo(this.x, this.z) + Math.sin(k * Math.PI) * 0.6, this.z);
      this.corpo.rotation.y += dt * 9;
      if (k >= 1) { this.stato = 'gira'; this.pausa = 0.6; polvere(this.x, y, this.z, 6, CF.oro); }
      return;
    }
    if (this.stato === 'dentro') {
      if (notte < 0.3 && Math.random() < dt * 0.6) {
        this.stato = 'gira'; this.casa.dentro--; const p = this.casa.puntoPorta(); this.x = p.x; this.z = p.z;
        this.radice.visible = true; this.radice.scale.setScalar(0.0001);
        tween(0.4, (k) => this.radice.scale.setScalar(Math.max(0.0001, easeOutBack(k))));
        this.nuovaMeta();
      }
      return;
    }
    if (this.stato === 'entra') return;
    // la sera si va a casa
    if (notte > 0.5 && this.stato === 'gira') {
      const casa = cose.filter((c) => c.genere === 'casa' && !c.morto).sort((a, b) => Math.hypot(a.x - this.x, a.z - this.z) - Math.hypot(b.x - this.x, b.z - this.z))[0];
      if (casa) { this.casa = casa; this.stato = 'casa'; const p = casa.puntoPorta(); this.meta = { x: p.x, z: p.z }; }
    }
    // scappa dalla lava e dal fuoco
    const qui = cellaDi(this.x, this.z);
    if (T[qui] === LAVA && this.stato === 'gira') { this.meta = null; this.pausa = 0; }
    if (this.pausa > 0) { this.pausa -= dt; this.corpo.position.y = 0; this.radice.position.set(this.x, y, this.z); return; }
    if (!this.meta) { if (this.stato === 'casa') this.stato = 'gira'; this.nuovaMeta(); if (!this.meta) return; }
    const dx = this.meta.x - this.x, dz = this.meta.z - this.z, d = Math.hypot(dx, dz);
    const vel = this.stato === 'casa' ? 0.75 : 0.5;
    if (d < 0.06) {
      if (this.stato === 'casa' && this.casa && !this.casa.morto) {
        this.stato = 'entra'; const casa = this.casa;
        tween(0.35, (k) => this.radice.scale.setScalar(Math.max(0.0001, 1 - k)), () => { this.radice.visible = false; this.stato = 'dentro'; casa.dentro++; casa.abitata = true; Suoni.pop(); });
      } else { this.meta = null; this.pausa = rand(0.5, 2.2); }
      return;
    }
    if (this.stato === 'entra') return;
    this.x += (dx / d) * vel * dt; this.z += (dz / d) * vel * dt;
    const yy = suolo(this.x, this.z);
    this.radice.position.set(this.x, yy + Math.abs(Math.sin(this.t * 11 + this.fase)) * 0.035, this.z);
    const rot = Math.atan2(dx, dz);
    this.corpo.rotation.y = rot;
    this.corpo.rotation.z = Math.sin(this.t * 11 + this.fase) * 0.12;
  }
}

class Nuvola {
  constructor(x, z, daVapore = false) {
    this.genere = 'nuvola'; this.x = x; this.z = z; this.t = 0; this.stato = 'nasce'; this.tPioggia = 0; this.germogli = 0;
    this.radice = new THREE.Group(); this.corpo = new THREE.Group(); this.radice.add(this.corpo);
    this.m = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.12, transparent: true, opacity: 1 });
    const pezzi = [[0, 0, 0, 0.5], [0.5, -0.05, 0.1, 0.38], [-0.48, -0.06, -0.05, 0.36], [0.2, 0.22, -0.1, 0.36], [-0.2, 0.16, 0.15, 0.32], [0.05, -0.08, 0.32, 0.3]];
    pezzi.forEach(([a, b, c, r]) => { const p = new THREE.Mesh(GEO.puff, this.m); p.position.set(a, b, c); p.scale.set(r, r * 0.8, r); this.corpo.add(p); });
    const t = Math.hypot(x, z) > 2.5 ? 0.45 : 1;
    this.meta = daVapore ? { x: x * t + rand(-0.6, 0.6), z: z * t + rand(-0.6, 0.6) } : { x, z };
    if (Math.hypot(this.meta.x, this.meta.z) > 3.3) { const k = 3.3 / Math.hypot(this.meta.x, this.meta.z); this.meta.x *= k; this.meta.z *= k; }
    this.y = 3.5; this.radice.position.set(x, daVapore ? 1.4 : this.y, z); this.radice.scale.setScalar(0.72);
    this.corpo.scale.setScalar(0.0001); this.daVapore = daVapore;
  }
  tipo() { return 'nuvola'; }
  aggiorna(dt, t) {
    this.t += dt;
    const p = this.radice.position;
    if (this.stato === 'nasce') {
      const k = clamp(this.t / 2, 0, 1);
      this.corpo.scale.setScalar(Math.max(0.0001, easeOutBack(k)));
      p.y = lerp(this.daVapore ? 1.4 : this.y, this.y, easeOutCubic(k));
      if (k >= 1) { this.stato = 'va'; this.t = 0; }
    } else if (this.stato === 'va') {
      this.x = lerp(this.x, this.meta.x, 1 - Math.exp(-dt * 0.7)); this.z = lerp(this.z, this.meta.z, 1 - Math.exp(-dt * 0.7));
      if (Math.hypot(this.x - this.meta.x, this.z - this.meta.z) < 0.25 || this.t > 4) {
        this.stato = 'piove'; this.t = 0;
        scopri('pioggia', this.x, p.y + 0.6, this.z, true);
      }
    } else if (this.stato === 'piove') {
      this.m.color.lerp(tmpC2.set('#d3dae6'), 1 - Math.exp(-dt * 2));
      this.x += Math.sin(t * 0.4) * dt * 0.15 + ventoForza * dt; this.z += Math.cos(t * 0.3) * dt * 0.12;
      for (let i = 0; i < 4; i++) { const a = rand(0, 6.28), r = Math.sqrt(Math.random()) * 0.6; goccia(this.x + Math.cos(a) * r, p.y - 0.2, this.z + Math.sin(a) * r); }
      if (Math.random() < 0.3) Suoni.goccia();
      this.tPioggia -= dt;
      if (this.tPioggia <= 0) { this.tPioggia = 0.35; pioveSu(this, rand(0, 6.28), Math.sqrt(Math.random()) * 0.7); }
      if (this.t > 9) { this.stato = 'va_via'; this.t = 0; }
    } else {
      const k = clamp(this.t / 2.5, 0, 1);
      this.m.opacity = 1 - k; p.y = this.y + k * 0.8; this.corpo.scale.setScalar(Math.max(0.0001, 1 + k * 0.3));
      if (k >= 1) togli(this);
    }
    p.x = this.x; p.z = this.z;
    this.corpo.rotation.y += dt * 0.05;
  }
}

function pioveSu(nuv, a, r) {
  const x = nuv.x + Math.cos(a) * r, z = nuv.z + Math.sin(a) * r, i = cellaDi(x, z), tt = T[i];
  // spegne gli incendi
  cose.forEach((c) => { if (c.genere === 'pianta' && c.brucia && Math.hypot(c.x - nuv.x, c.z - nuv.z) < 1) { c.spegni(); vapore(c.x, c.z, 0.2, true, 0.5); catena(c.x, c.radice.position.y + 0.8, c.z, 'Spento!'); } });
  cose.forEach((c) => { if (c.genere === 'pianta' && !c.brucia && Math.hypot(c.x - nuv.x, c.z - nuv.z) < 1) c.annaffia(); });
  if (tt === LAVA) { solidifica(i, true); return; }
  if ((tt === ERBA || tt === TERRA) && H[i] > 0.15 && Math.random() < 0.3) {
    pennella(x, z, 0.26, FANGO, (t) => t === ERBA || t === TERRA, 0.2);
    if (!scoperte.has('fango')) scopri('fango', x, H[i] + 0.3, z, true);
    return;
  }
  if ((tt === FANGO || tt === CENERE) && nuv.germogli < 4 && contaCose('pianta') < 36) {
    const vicino = cose.some((c) => c.genere === 'pianta' && Math.hypot(c.x - x, c.z - z) < 0.72);
    if (!vicino && Math.random() < (tt === CENERE ? 0.8 : 0.55)) {
      nuv.germogli++;
      const p = aggiungi(new Pianta(x, z, 0));
      p.s0.scale.setScalar(0.0001);
      tween(0.9, (k) => p.s0.scale.setScalar(Math.max(0.0001, p.dim * easeOutElastic(k))));
      foglie(x, suolo(x, z) + 0.1, z, 8); Suoni.cresce();
      scopri('germoglio', x, suolo(x, z) + 0.4, z, true);
    }
  }
}

// ───────────────────────── processi: lava, vapore, vento
const lavaAttiva = new Set();
let fuocoAttivo = [];
const luceFuoco = new THREE.PointLight(0xff8a3a, 0, 7, 1.5);
scene.add(luceFuoco);
let luceFuocoI = 0;
const fontane = [];
let vento = 0, ventoForza = 0, ondaExtra = 0;
function versaLava(x, z, quanta = 1) {
  forCelle(x, z, 0.6, (i, d) => {
    if (H[i] <= 0.03) return;
    LAV[i] += quanta * (1.2 - d * 1.2) + 0.3; ETA[i] = 0;
    if (T[i] !== LAVA) { T[i] = LAVA; lavaAttiva.add(i); }
  });
  fontane.push({ x, z, t: 3.2 * quanta });
  sveglia(); ciuffiSporchi = true;
}
function solidifica(i, conVapore) {
  if (T[i] !== LAVA) return;
  lavaAttiva.delete(i); LAV[i] = 0; T[i] = PIETRA; sveglia();
  if (conVapore) vapore(PX[i], PZ[i], 0.12, true, 0.6);
}
const VICINI = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
let lavaAcc = 0, lavaMareNotato = 0;
function tickLava(dt) {
  for (const f of fontane) {
    f.t -= dt;
    const i = cellaDi(f.x, f.z);
    if (H[i] > 0.03) { LAV[i] += 0.45; ETA[i] = 0; if (T[i] !== LAVA) { T[i] = LAVA; lavaAttiva.add(i); } }
    if (Math.random() < 0.5) luce.emetti(f.x + rand(-0.1, 0.1), H[i] + 0.05, f.z + rand(-0.1, 0.1), rand(-0.6, 0.6), rand(1.5, 3), rand(-0.6, 0.6), rand(0.5, 0.9), rand(0.1, 0.2), 0.02, CF.giallo, CF.rosso, 1, -6, 0.3);
  }
  for (let k = fontane.length - 1; k >= 0; k--) if (fontane[k].t <= 0) fontane.splice(k, 1);
  if (lavaAttiva.size === 0) return;
  sveglia();
  const lista = [...lavaAttiva];
  for (const i of lista) {
    if (T[i] !== LAVA) { lavaAttiva.delete(i); continue; }
    ETA[i] += dt;
    const ix = i % V, iz = (i / V) | 0;
    if (LAV[i] > 0.3) {
      let best = -1, bh = H[i] + LAV[i] * 0.1;
      for (const [dx, dz] of VICINI) {
        const jx = ix + dx, jz = iz + dz;
        if (jx < 0 || jz < 0 || jx > N || jz > N) continue;
        const j = idx(jx, jz), hj = H[j] + (T[j] === LAVA ? LAV[j] * 0.1 : 0) + rand(0, 0.015);
        if (hj < bh - 0.004) { bh = hj; best = j; }
      }
      if (best >= 0) {
        const m = Math.min(LAV[i] - 0.25, 0.14);
        LAV[i] -= m;
        if (H[best] <= 0.03) lavaNelMare(best, m);
        else if (T[best] === FANGO) { T[best] = PIETRA; vapore(PX[best], PZ[best], 0.2, true, 0.6); catena(PX[best], H[best] + 0.4, PZ[best], 'Ssss!'); scopri('pietra', PX[best], H[best] + 0.5, PZ[best], true); }
        else { LAV[best] += m; ETA[best] = 0; if (T[best] !== LAVA) { T[best] = LAVA; lavaAttiva.add(best); ciuffiSporchi = true; } }
      }
    }
    // tocca un albero: si accende
    if (Math.random() < 0.3) {
      cose.forEach((c) => { if (c.genere === 'pianta' && !c.brucia && !c.morto && Math.hypot(c.x - PX[i], c.z - PZ[i]) < 0.42) { c.accendi(true); catena(c.x, c.radice.position.y + 0.8, c.z, 'La lava accende!'); } });
    }
    if (Math.random() < 0.04) luce.emetti(PX[i] + rand(-0.1, 0.1), H[i] + 0.03, PZ[i] + rand(-0.1, 0.1), 0, rand(0.5, 1.2), 0, rand(0.4, 0.7), rand(0.08, 0.16), 0.02, CF.giallo, CF.rosso, 1, -2, 0);
    if (ETA[i] > 7 + (i % 9) * 0.6 && LAV[i] < 0.9 && Math.random() < 0.06) {
      solidifica(i, Math.random() < 0.2);
      if (!scoperte.has('pietra') && Math.random() < 0.3) scopri('pietra', PX[i], H[i] + 0.4, PZ[i], true);
    }
  }
}
function tickTerreno(dt) {
  for (let i = 0; i < NV; i++) {
    const t = T[i];
    if (t !== FANGO && t !== CENERE) continue;
    ASC[i] += dt;
    if (t === FANGO && Math.random() < 0.006) luce.emetti(PX[i] + rand(-0.1, 0.1), H[i] + 0.03, PZ[i] + rand(-0.1, 0.1), 0, 0.05, 0, rand(0.5, 0.9), 0.16, 0.02, CF.bianco, CF.azz, 0.9);
    const lim = (t === FANGO ? 40 : 55) + hash(PX[i], PZ[i]) * 25;
    if (ASC[i] > lim) cambia(i, H[i] > 0.16 ? ERBA : SABBIA, 0);
  }
}
function lavaNelMare(j, m) {
  // la lava incontra il mare: vapore e nuova roccia (l'isola cresce!)
  H[j] = Math.min(0.08, H[j] + 0.1 + m * 0.4);
  if (H[j] > 0.03) { T[j] = PIETRA; }
  aggiornaAltezzeDopo = true;
  vapore(PX[j], PZ[j], 0.22, true, 1.0);
  Suoni.sfrigola();
  const ora = tempo;
  if (ora - lavaMareNotato > 2.5) { lavaMareNotato = ora; catena(PX[j], 0.6, PZ[j], 'Lava nel mare!'); }
}
let aggiornaAltezzeDopo = false;

// vapore: nuvolette che salgono; quando ce n'è abbastanza nasce una nuvola
const emettitori = [];
const pozzeVapore = [];
function vapore(x, z, quanto, auto, durata = 2) {
  const y = suolo(x, z);
  const vicino = emettitori.find((e) => Math.hypot(e.x - x, e.z - z) < 0.7);
  if (vicino) vicino.t = Math.max(vicino.t, durata); else emettitori.push({ x, z, y, t: durata });
  if (!auto || !scoperte.has('vapore')) scopri('vapore', x, y + 0.7, z, auto);
  let p = pozzeVapore.find((q) => Math.hypot(q.x - x, q.z - z) < 3.5);
  if (!p) { p = { x, z, q: 0, nasce: false }; pozzeVapore.push(p); }
  p.q += quanto;
  if (p.q >= 1 && !p.nasce && contaCose('nuvola') < 2) {
    p.nasce = true;
    dopo(1.4, () => {
      const nuv = aggiungi(new Nuvola(p.x, p.z, true));
      scopri('nuvola', p.x, 2.4, p.z, true);
      pozzeVapore.splice(pozzeVapore.indexOf(p), 1);
      return nuv;
    });
  }
}
function aggiornaEmettitori(dt) {
  for (let k = emettitori.length - 1; k >= 0; k--) {
    const e = emettitori[k]; e.t -= dt;
    for (let n = 0; n < 2; n++) fumo.emetti(e.x + rand(-0.25, 0.25), e.y + 0.05, e.z + rand(-0.25, 0.25), rand(-0.1, 0.1) + ventoForza, rand(0.8, 1.5), rand(-0.1, 0.1), rand(1.4, 2.2), 0.2, 0.9, CF.vapore, CF.bianco, 0.55, 0.15, 0.4);
    if (e.t <= 0) emettitori.splice(k, 1);
  }
  for (const p of pozzeVapore) if (!p.nasce) p.q = Math.max(0, p.q - dt * 0.02);
}

// ───────────────────────── scoperte, feste e reazioni a catena
const scoperte = new Set();
const codaFeste = [];
let prossimaFesta = 0;
function scopri(nome, x, y, z, auto = false) {
  if (scoperte.has(nome)) return false;
  scoperte.add(nome);
  codaFeste.push({ nome, x, y, z, auto });
  return true;
}
function aggiornaFeste(dt) {
  prossimaFesta -= dt;
  if (prossimaFesta > 0 || !codaFeste.length) return;
  const f = codaFeste.shift();
  festa(f);
  prossimaFesta = 1.15;
}
function festa({ nome, x, y, z }) {
  const c = COSE[nome];
  const col = parseInt(c.c[0].slice(1), 16), col2 = parseInt(c.c[1].slice(1), 16);
  const yb = suolo(x, z);
  colonna(x, yb, z, col2, 4.5);
  anello(x, yb + 0.05, z, col, 0.2, 2.4, 1.1, true, 1);
  anello(x, yb + 0.05, z, 0xffffff, 0.1, 1.5, 0.8, true, 0.8);
  scintille(x, y, z, 50, raw(col2));
  scintille(x, y, z, 24, CF.oro, 1.3);
  Suoni.scoperta();
  // lampo morbido sullo schermo
  const l = $('#lampo'); l.classList.remove('via'); void l.offsetWidth; l.classList.add('via');
  // piccolo colpo di camera
  camState.colpo = 1;
  // etichetta che sale
  const s = schermo(x, y, z);
  const el = document.createElement('div');
  el.className = 'scoperta';
  el.style.left = clamp(s.x, 110, innerWidth - 110) + 'px'; el.style.top = clamp(s.y, 190, innerHeight - 160) + 'px';
  el.innerHTML = `<div class="nuova">Nuova scoperta!</div>
    <div class="medaglia" style="background:radial-gradient(circle at 35% 30%, ${c.c[0]}, ${c.c[1]})">${svg(nome, c.ic)}</div>
    <div class="nome">${c.nome}</div><div class="frase">${c.frase || ''}</div>`;
  $('#etichette').appendChild(el);
  setTimeout(() => el.remove(), 3900);
  aggiornaContatore(true);
  if (GETTONI_NUOVI.includes(nome)) aggiungiGettone(nome, true);
  ultimaAzione = tempoReale;
  $('#idea').classList.remove('su');
}
// reazioni che partono da sole: contatore della catena
let catenaN = 0, catenaT = 0;
function catena(x, y, z, testo) {
  catenaN++; catenaT = 7;
  bolla(testo, x, y, z);
  if (catenaN >= 2) {
    const b = $('#catena');
    b.innerHTML = `<span>Reazione a catena</span><b>×${catenaN}</b>`;
    b.classList.remove('pulsa'); void b.offsetWidth; b.classList.add('su', 'pulsa');
    Suoni.catena(catenaN);
  }
}
function aggiornaCatena(dt) {
  if (catenaT > 0) { catenaT -= dt; if (catenaT <= 0) { catenaN = 0; $('#catena').classList.remove('su'); } }
}
function bolla(testo, x, y, z) {
  const s = schermo(x, y, z);
  if (s.x < 0 || s.x > innerWidth || s.y < 0 || s.y > innerHeight) return;
  const el = document.createElement('div');
  el.className = 'bolla'; el.textContent = testo;
  el.style.left = s.x + 'px'; el.style.top = s.y + 'px';
  $('#etichette').appendChild(el);
  setTimeout(() => el.remove(), 1800);
}
const vproj = new THREE.Vector3();
function schermo(x, y, z) {
  vproj.set(x, y, z).project(camera);
  return { x: (vproj.x + 1) / 2 * innerWidth, y: (1 - vproj.y) / 2 * innerHeight };
}

// ───────────────────────── le regole: cosa succede quando una cosa cade su un'altra
const registro = [];
const TERRE = (t) => t === ERBA || t === TERRA || t === SABBIA || t === CENERE || t === ARGILLA || t === FANGO;
function reagisci(el, p) {
  const { x, z } = p;
  const y = suolo(x, z);
  const bersaglio = p.cosa && !p.cosa.morto ? p.cosa : null;
  const bt = bersaglio ? bersaglio.tipo() : null;
  const tt = p.mare ? -1 : T[cellaDi(x, z)];
  const pianta = bersaglio && bersaglio.genere === 'pianta' ? bersaglio : null;
  ultimaAzione = tempoReale;
  registro.push(`${el} su ${bt || (p.mare ? 'mare' : NOMI_T[tt])} @${x.toFixed(2)},${z.toFixed(2)}`);

  switch (el) {
    case 'acqua':
      schizzo(x, y, z, 30); Suoni.splash();
      if (bt === 'incendio') { pianta.spegni(); vapore(x, z, 0.4, false); return; }
      if (pianta) { pianta.annaffia(); bolla('Che sete!', x, y + 0.6, z); return; }
      if (p.mare) { ondaExtra = 1.5; bolla('Splash!', x, 0.5, z); return; }
      if (tt === LAVA) { raffredda(x, z, 1.2); vapore(x, z, 0.6, false); scopri('pietra', x, y + 0.5, z); return; }
      if (tt === PIETRA || tt === VETRO) { bolla('Scivola via…', x, y + 0.4, z); return; }
      pennella(x, z, 0.75, FANGO, (t) => TERRE(t) && t !== FANGO);
      scopri('fango', x, y + 0.5, z);
      return;
    case 'fuoco':
      fiammata(x, y, z, 34); Suoni.fiamma();
      if (pianta) { pianta.accendi(false); return; }
      if (bt === 'legna') { const b = bersaglio; togli(b); fiammata(x, y, z, 40, 1.2); pennella(x, z, 0.4, CENERE, null, 0.3); scopri('incendio', x, y + 0.6, z); dopo(1.2, () => scopri('cenere', x, y + 0.4, z, true)); return; }
      if (bt === 'casa') { bersaglio.abitata = true; bolla('Il camino si accende', x, y + 0.9, z); return; }
      if (bt === 'mattoni') { bolla('Già cotti!', x, y + 0.5, z); return; }
      if (p.mare) { vapore(x, z, 1.0, false, 3); Suoni.sfrigola(); return; }
      if (tt === FANGO) { pennella(x, z, 0.7, TERRA, (t) => t === FANGO); vapore(x, z, 0.5, false); return; }
      if (tt === ARGILLA) { pennella(x, z, 0.7, TERRA, (t) => t === ARGILLA, 0.2); aggiungi(new Pila(x, z, 'mattoni')); scintille(x, y + 0.2, z, 20, CF.arancio); scopri('mattone', x, y + 0.5, z); return; }
      if (tt === SABBIA) { pennella(x, z, 0.65, VETRO, (t) => t === SABBIA); scopri('vetro', x, y + 0.4, z); return; }
      if (tt === LAVA) { versaLava(x, z, 0.6); return; }
      if (tt === PIETRA || tt === VETRO) { bolla('La pietra non brucia', x, y + 0.4, z); return; }
      versaLava(x, z, 1); scopri('lava', x, y + 0.5, z);
      return;
    case 'aria': {
      soffio(x, y, z); Suoni.vento();
      if (bt === 'incendio') { ventoForza = 0.6; ventoT = 4; bolla('Il vento aizza le fiamme!', x, y + 0.9, z); pianta.tBrucia = Math.max(0, pianta.tBrucia - 1); pianta.propagato = false; return; }
      if (p.mare) { ondaExtra = 2.5; bolla('Onde!', x, 0.5, z); spingiNuvole(x, z); return; }
      if (tt === FANGO) { pennella(x, z, 0.75, ARGILLA, (t) => t === FANGO); scopri('argilla', x, y + 0.5, z); return; }
      if (tt === PIETRA) { pennella(x, z, 0.7, SABBIA, (t) => t === PIETRA); polvere(x, y, z, 16, raw(0xf3dca4)); scopri('sabbia', x, y + 0.4, z); return; }
      if (tt === LAVA) { raffredda(x, z, 0.9); scopri('pietra', x, y + 0.5, z); return; }
      if (spingiNuvole(x, z)) { bolla('Il vento sposta le nuvole', x, y + 0.6, z); return; }
      ventoForza = 0.35; ventoT = 3; foglie(x, y + 0.2, z, 10);
      bolla('Che bella brezza', x, y + 0.6, z);
      return;
    }
    case 'terra':
      polvere(x, y, z, 18); Suoni.tonfo();
      if (p.mare) {
        const r = 0.75; let n = 0;
        forCelle(x, z, r, (i, d) => { if (H[i] > -0.7 && H[i] <= 0.06) { H[i] = Math.max(H[i], lerp(0.12, -0.2, d / r)); if (H[i] > 0.025) { T[i] = SABBIA; n++; } } });
        aggiornaAltezze(); sveglia(); schizzo(x, 0, z, 20, raw(0xc9a46a));
        if (n > 0) { bolla('Nuova spiaggia!', x, 0.5, z); scopri('sabbia', x, 0.5, z); } else bolla('Affonda…', x, 0.5, z);
        return;
      }
      if (tt === LAVA) { raffredda(x, z, 0.8, TERRA); bolla('Lava coperta', x, y + 0.4, z); return; }
      alzaCollina(x, z);
      scopri('collina', x, suolo(x, z) + 0.6, z);
      return;
    case 'fango':
      schizzo(x, y, z, 14, raw(0x6e4a31)); Suoni.splash();
      if (bt === 'albero') { nascitaOmini(bersaglio); return; }
      if (pianta) { pianta.annaffia(); return; }
      if (p.mare) return;
      pennella(x, z, 0.7, FANGO, (t) => TERRE(t));
      return;
    case 'argilla':
      polvere(x, y, z, 10, raw(0xdd8350)); Suoni.tonfo();
      if (bt === 'incendio') { aggiungi(new Pila(x + 0.4, z, 'mattoni')); scopri('mattone', x, y + 0.5, z); return; }
      if (p.mare) return;
      pennella(x, z, 0.65, ARGILLA, (t) => TERRE(t));
      return;
    case 'lava':
      fiammata(x, y, z, 20); Suoni.fiamma();
      if (pianta) { pianta.accendi(false); return; }
      if (p.mare) { vapore(x, z, 1.0, false, 3); Suoni.sfrigola(); return; }
      versaLava(x, z, 1.1);
      return;
    case 'pietra':
      polvere(x, y, z, 14, CF.grigio); Suoni.tonfo();
      if (bt === 'albero') { pianta.abbatti(); return; }
      if (bt === 'legna') { togli(bersaglio); aggiungi(new Utensile(x, z)); scintille(x, y + 0.3, z, 20); scopri('utensile', x, y + 0.6, z); return; }
      if (p.mare) { schizzo(x, 0, z, 22); return; }
      pennella(x, z, 0.55, PIETRA, (t) => TERRE(t));
      return;
    case 'nuvola':
      aggiungi(new Nuvola(x, z, false)); Suoni.vento();
      return;
    case 'germoglio':
      if (p.mare) { schizzo(x, 0, z, 12); bolla('Nel mare non cresce', x, 0.5, z); return; }
      if (tt === PIETRA || tt === VETRO || tt === LAVA) { bolla('Qui non cresce', x, y + 0.4, z); return; }
      { const pp = aggiungi(new Pianta(x, z, 0)); pp.s0.scale.setScalar(0.0001); tween(0.9, (k) => pp.s0.scale.setScalar(Math.max(0.0001, pp.dim * easeOutElastic(k)))); foglie(x, y + 0.1, z, 10); Suoni.cresce(); }
      return;
    case 'legno':
      polvere(x, y, z, 12); Suoni.tonfo();
      if (bt === 'mattoni') { const b = bersaglio; togli(b); costruisciCasa(b.x, b.z); return; }
      if (bt === 'incendio') { pianta.tBrucia = Math.max(0, pianta.tBrucia - 2); bolla('Più legna, più fuoco', x, y + 0.8, z); return; }
      if (p.mare) { schizzo(x, 0, z, 12); bolla('Galleggia!', x, 0.5, z); return; }
      if (tt === PIETRA) { aggiungi(new Utensile(x, z)); scopri('utensile', x, y + 0.6, z); return; }
      aggiungi(new Pila(x, z, 'legna'));
      return;
    case 'mattone':
      polvere(x, y, z, 12, raw(0xc45a3c)); Suoni.tonfo();
      if (bt === 'legna') { const b = bersaglio; togli(b); costruisciCasa(b.x, b.z); return; }
      if (p.mare) { schizzo(x, 0, z, 16); return; }
      aggiungi(new Pila(x, z, 'mattoni'));
      return;
    case 'sabbia':
      polvere(x, y, z, 14, raw(0xf3dca4)); Suoni.tonfo();
      if (p.mare) { forCelle(x, z, 0.6, (i) => { if (H[i] > -0.6 && H[i] <= 0.06) { H[i] = 0.09; T[i] = SABBIA; } }); aggiornaAltezze(); sveglia(); bolla('Nuova spiaggia!', x, 0.5, z); return; }
      pennella(x, z, 0.7, SABBIA, (t) => TERRE(t));
      return;
  }
}
function raffredda(x, z, r, tipo = PIETRA) {
  forCelle(x, z, r, (i) => { if (T[i] === LAVA) { lavaAttiva.delete(i); LAV[i] = 0; cambia(i, tipo, rand(0, 0.3)); } });
  for (const f of fontane) if (Math.hypot(f.x - x, f.z - z) < r + 0.3) f.t = 0;
}
function alzaCollina(x, z) {
  const r = 1.1;
  const da = new Float32Array(NV); da.set(H);
  tween(0.8, (k) => {
    const e = easeOutBack(k);
    forCelle(x, z, r, (i, d) => { if (da[i] > 0.05) { const b = Math.exp(-(d * d) / (0.28 * r)) * 0.55; H[i] = Math.min(2.4, da[i] + b * e); if (H[i] > 0.2 && T[i] === SABBIA) T[i] = ERBA; } });
    aggiornaAltezze(); sveglia();
  });
}
function spingiNuvole(x, z) {
  let n = 0;
  cose.forEach((c) => { if (c.genere === 'nuvola' && !c.morto) { c.meta = { x, z }; c.x = lerp(c.x, x, 0.15); if (c.stato === 'piove') c.t = Math.min(c.t, 3); n++; } });
  return n > 0;
}
let ventoT = 0;
function soffio(x, y, z) {
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * 6.28 * 2, r = 0.2 + i * 0.02;
    fumo.emetti(x + Math.cos(a) * r, y + 0.1 + i * 0.012, z + Math.sin(a) * r, -Math.sin(a) * 2.2, rand(0.2, 0.6), Math.cos(a) * 2.2, rand(0.6, 1), 0.12, 0.04, CF.bianco, CF.azz, 0.85, 0, 1.5);
  }
  anello(x, y + 0.08, z, 0xe8f6ff, 0.2, 1.8, 0.8, false, 0.55);
}
function nascitaOmini(albero) {
  if (contaCose('omino') >= 8) { bolla('L’isola è già piena di gente', albero.x, 1, albero.z); return; }
  const y = suolo(albero.x, albero.z);
  scintille(albero.x, y + 0.6, albero.z, 30, raw(0xffb37a));
  for (let k = 0; k < 2; k++) {
    const o = aggiungi(new Omino(albero.x, albero.z, contaCose('omino')));
    const a = rand(0, 6.28) + k * Math.PI;
    o.vx = Math.cos(a) * 0.75; o.vz = Math.sin(a) * 0.75;
  }
  Suoni.pop(); dopo(0.15, () => Suoni.pop());
  scopri('omini', albero.x, y + 0.9, albero.z);
}
function costruisciCasa(x, z) {
  cose.filter((c) => c.genere === 'pianta' && !c.morto && Math.hypot(c.x - x, c.z - z) < 0.75).forEach((c) => { foglie(c.x, c.radice.position.y + 0.4, c.z, 12); togli(c); });
  pennella(x, z, 0.6, ERBA, (t) => t === FANGO || t === CENERE || t === ARGILLA, 0.2);
  aggiungi(new Casa(x, z));
  scopri('casa', x, suolo(x, z) + 0.8, z);
  dopo(1.6, () => { cose.forEach((o) => { if (o.genere === 'omino' && o.stato === 'gira') o.meta = { x: x + rand(-0.6, 0.6), z: z + rand(-0.6, 0.6) }; }); });
}

// ───────────────────────── oggetti che cadono dal cielo quando si lascia il gettone
const cadenti = [];
function oggettoCadente(el) {
  const g = new THREE.Group();
  const add = (m) => { m.castShadow = true; g.add(m); return m; };
  switch (el) {
    case 'terra': { const m = add(new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), mat('#a36d43'))); const t = add(new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.12, 5), mat('#7cc456'))); t.position.y = 0.17; m.scale.y = 0.8; break; }
    case 'acqua': add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8).scale(1, 1.35, 1), new THREE.MeshStandardMaterial({ color: 0x4cc3ff, roughness: 0.1, transparent: true, opacity: 0.85, emissive: 0x1c6fa8, emissiveIntensity: 0.3 }))); break;
    case 'fuoco': add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 1), new THREE.MeshBasicMaterial({ color: 0xffd36b }))); break;
    case 'aria': break;
    case 'fango': add(new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 7).scale(1, 0.75, 1), mat('#5c3d29', { roughness: 0.2 }))); break;
    case 'argilla': add(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.26), mat('#dd8350'))); break;
    case 'lava': add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 0), new THREE.MeshBasicMaterial({ color: 0xff6a1f }))); break;
    case 'pietra': add(new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 0), mat('#9a968f'))); break;
    case 'germoglio': add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6).scale(1, 1.4, 1), mat('#9b7a4a'))); break;
    case 'legno': add(new THREE.Mesh(GEO.tronchetto, mat('#9a6238'))); break;
    case 'mattone': add(new THREE.Mesh(GEO.mattone, mat('#c45a3c'))).scale.setScalar(1.6); break;
    case 'sabbia': add(new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.18, 7), mat('#f3dca4'))); break;
    default: break;
  }
  return g;
}
function lascia(el, p) {
  if (el === 'nuvola') { reagisci(el, p); return; }
  const g = oggettoCadente(el);
  const yTerra = p.mare ? 0 : suolo(p.x, p.z);
  g.position.set(p.x, yTerra + 3.2, p.z);
  scene.add(g);
  const solido = ['terra', 'pietra', 'legno', 'mattone', 'argilla', 'germoglio', 'sabbia'].includes(el);
  cadenti.push({ el, p, g, vy: -2, yTerra, rimbalzi: solido && !p.mare ? 1 : 0, rot: rand(-6, 6) });
  Suoni.prendi();
}
function aggiornaCadenti(dt) {
  for (let k = cadenti.length - 1; k >= 0; k--) {
    const c = cadenti[k];
    c.vy -= 22 * dt;
    c.g.position.y += c.vy * dt;
    c.g.rotation.x += c.rot * dt; c.g.rotation.z += c.rot * 0.7 * dt;
    const pos = c.g.position;
    if (c.el === 'fuoco' || c.el === 'lava') for (let i = 0; i < 3; i++) luce.emetti(pos.x + rand(-0.08, 0.08), pos.y, pos.z + rand(-0.08, 0.08), rand(-0.2, 0.2), rand(0.5, 1.5), rand(-0.2, 0.2), rand(0.25, 0.45), rand(0.25, 0.4), 0.03, CF.giallo, CF.rosso, 1);
    if (c.el === 'aria') for (let i = 0; i < 3; i++) { const a = tempo * 18 + i * 2.1; fumo.emetti(pos.x + Math.cos(a) * 0.25, pos.y, pos.z + Math.sin(a) * 0.25, 0, 0.5, 0, 0.5, 0.1, 0.03, CF.bianco, CF.azz, 0.8); }
    if (c.el === 'acqua' && Math.random() < 0.5) fumo.emetti(pos.x, pos.y + 0.15, pos.z, 0, 0.5, 0, 0.3, 0.07, 0.02, CF.acqua, CF.bianco, 0.8);
    if (pos.y <= c.yTerra + 0.12) {
      if (c.rimbalzi > 0) {
        c.rimbalzi--; c.vy = Math.abs(c.vy) * 0.32; pos.y = c.yTerra + 0.12;
        Suoni.tonfo(); polvere(pos.x, c.yTerra, pos.z, 6);
        reagisci(c.el, c.p);
        c.reagito = true;
        continue;
      }
      if (!c.reagito) reagisci(c.el, c.p);
      scene.remove(c.g); cadenti.splice(k, 1);
    }
  }
}

// ───────────────────────── luce del giorno e della notte
const TAPPE = [
  { t: 0.0, top: 0x0b1736, mid: 0x1d3166, bot: 0x2a427a, sole: 0xa6bbff, si: 0.95, hs: 0x5a78c4, hg: 0x2a3152, hi: 0.9, sc: 0x000000 },
  { t: 0.2, top: 0x16244e, mid: 0x2c3c72, bot: 0x3b4a82, sole: 0xa6bbff, si: 0.8, hs: 0x5a78c4, hg: 0x2a3152, hi: 0.85, sc: 0x000000 },
  { t: 0.26, top: 0x5a86c4, mid: 0xf0a6a6, bot: 0xffb68e, sole: 0xffa070, si: 1.2, hs: 0xb4c8ff, hg: 0xd09a7a, hi: 0.75, sc: 0xffb070 },
  { t: 0.34, top: 0x6fbdf0, mid: 0xbfe5f6, bot: 0xffe4c2, sole: 0xffeccc, si: 3.0, hs: 0xd6ecff, hg: 0xf2d0a2, hi: 0.78, sc: 0xffe7b8 },
  { t: 0.5, top: 0x62b6ee, mid: 0xc4e8f8, bot: 0xe6f5ff, sole: 0xfff6e6, si: 3.3, hs: 0xdff0ff, hg: 0xf0d8b0, hi: 0.82, sc: 0xfff3d6 },
  { t: 0.64, top: 0x6cb2e6, mid: 0xc9e2f2, bot: 0xffdfb6, sole: 0xffe2bc, si: 3.0, hs: 0xd8e8ff, hg: 0xf2cc9a, hi: 0.78, sc: 0xffe0b0 },
  { t: 0.72, top: 0x5a76bd, mid: 0xe9a3a8, bot: 0xffa77a, sole: 0xff9a5c, si: 1.6, hs: 0xc0b8f0, hg: 0xe09a78, hi: 0.8, sc: 0xffa060 },
  { t: 0.78, top: 0x26346e, mid: 0x7c5a8e, bot: 0xd47a7c, sole: 0xff7a5a, si: 0.7, hs: 0x6a6aa8, hg: 0x4a3a58, hi: 0.75, sc: 0xff7050 },
  { t: 0.85, top: 0x0d1a3c, mid: 0x1f3468, bot: 0x2c4580, sole: 0xa6bbff, si: 0.95, hs: 0x5a78c4, hg: 0x2a3152, hi: 0.9, sc: 0x000000 },
  { t: 1.0, top: 0x0b1736, mid: 0x1d3166, bot: 0x2a427a, sole: 0xa6bbff, si: 0.95, hs: 0x5a78c4, hg: 0x2a3152, hi: 0.9, sc: 0x000000 },
];
const cA = new THREE.Color(), cB = new THREE.Color();
function mix(h1, h2, k, out) { cA.setHex(h1); cB.setHex(h2); return out.copy(cA).lerp(cB, k); }
function mixRaw(h1, h2, k) { const a = raw(h1), b = raw(h2); return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
let ora = 0.36, notte = 0, salto = null;
const btnTempo = $('#btnTempo');
const DURATA_GIORNO = 150;
function aggiornaLuce(dt) {
  if (salto !== null) {
    let d = salto - ora; if (d < 0) d += 1;
    const passo = Math.min(d, dt * 0.32);
    ora = (ora + passo) % 1;
    if (d <= 0.002) salto = null;
  } else ora = (ora + dt / DURATA_GIORNO) % 1;
  let a = TAPPE[0], b = TAPPE[1];
  for (let i = 0; i < TAPPE.length - 1; i++) if (ora >= TAPPE[i].t && ora <= TAPPE[i + 1].t) { a = TAPPE[i]; b = TAPPE[i + 1]; break; }
  const k = smooth(0, 1, (ora - a.t) / (b.t - a.t));
  const top = mixRaw(a.top, b.top, k), bot = mixRaw(a.bot, b.bot, k), sc = mixRaw(a.sc, b.sc, k), mid = mixRaw(a.mid, b.mid, k);
  cieloMat.uniforms.uTop.value.set(...top); cieloMat.uniforms.uMid.value.set(...mid); cieloMat.uniforms.uBot.value.set(...bot); cieloMat.uniforms.uSole.value.set(...sc);
  scene.fog.color.setRGB(mid[0], mid[1], mid[2], THREE.SRGBColorSpace);
  mix(a.sole, b.sole, k, sole.color); sole.intensity = lerp(a.si, b.si, k);
  mix(a.hs, b.hs, k, emisfero.color); mix(a.hg, b.hg, k, emisfero.groundColor); emisfero.intensity = lerp(a.hi, b.hi, k);
  const ang = (ora - 0.25) * Math.PI * 2, el = Math.sin(ang);
  const dir = el > -0.05 ? vtmp.set(Math.cos(ang) * 0.9, Math.max(el, 0.2), 0.55) : vtmp.set(-Math.cos(ang) * 0.6, Math.max(-el, 0.35), 0.5);
  dir.normalize();
  sole.position.copy(dir).multiplyScalar(22); sole.target.position.set(0, 0, 0);
  cieloMat.uniforms.uSoleDir.value.set(Math.cos(ang) * 0.9, el, 0.55);
  cieloMat.uniforms.uSoleA.value = smooth(-0.15, 0.1, el);
  notte = 1 - smooth(-0.14, 0.1, el);
  stelle.material.uniforms.uA.value = notte;
  finestraMat.emissiveIntensity = notte * 2.4;
  aloniCase.forEach((s) => (s.material.opacity = notte * 0.85));
  mareUni.uNotte.value = notte;
  mareUni.uBasso.value.set('#62e3d6').lerp(tmpC2.set('#2f7fa8'), notte * 0.75);
  mareUni.uFondo.value.set('#2fa8cf').lerp(tmpC2.set('#15386e'), notte * 0.75);
  renderer.toneMappingExposure = lerp(1.0, 1.35, notte);
  const ic = btnTempo;
  const vuoleLuna = notte < 0.5;
  if (ic.dataset.n !== String(vuoleLuna)) { ic.dataset.n = String(vuoleLuna); ic.innerHTML = svg(vuoleLuna ? 'luna' : 'sole'); ic.setAttribute('aria-label', vuoleLuna ? 'Fai venire la notte' : 'Fai venire il giorno'); }
  if (document.body.classList.contains('notte') !== notte > 0.5) document.body.classList.toggle('notte', notte > 0.5);
}
// lucciole di notte
function lucciole(dt) {
  if (notte < 0.4) return;
  const alberi = cose.filter((c) => c.genere === 'pianta' && c.stadio >= 1 && !c.brucia);
  const n = alberi.length ? 2 : 0.5;
  if (Math.random() < dt * n * 3 * notte) {
    const c = alberi.length ? alberi[(Math.random() * alberi.length) | 0] : null;
    const x = c ? c.x + rand(-0.6, 0.6) : rand(-3, 3), z = c ? c.z + rand(-0.6, 0.6) : rand(-3, 3);
    luce.emetti(x, suolo(x, z) + rand(0.2, 0.8), z, rand(-0.15, 0.15), rand(-0.05, 0.12), rand(-0.15, 0.15), rand(2, 3.5), 0.13, 0.1, raw(0xeaff8a), raw(0xb6ff5a), 1, 0, 0);
  }
}

// ───────────────────────── telecamera: si gira col dito, si avvicina con due dita o la rotella
const camState = { az: -0.5, pol: 0.86, dist: 20, taz: -0.5, tpol: 0.86, tdist: 20, base: 20, colpo: 0, az0: -0.5 };
function adatta() {
  const w = innerWidth, h = innerHeight, asp = w / h;
  renderer.setSize(w, h, false);
  camera.aspect = asp;
  camera.fov = asp < 0.8 ? 44 : 34;
  const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const dW = (asp < 0.8 ? 4.75 : 8.0) / (tv * asp), dH = (asp < 0.8 ? 5.0 : 6.3) / tv;
  const base = Math.max(dW, dH);
  const rapporto = camState.tdist / camState.base;
  camState.base = base; camState.tdist = base * (isFinite(rapporto) ? rapporto : 1);
  if (!camState.pronta) { camState.dist = camState.tdist; camState.pronta = true; }
  camera.updateProjectionMatrix();
  const pr = renderer.getPixelRatio();
  const scala = (h * pr) / (2 * tv);
  luce.mat.uniforms.uScala.value = scala; cieloMat.uniforms.uAlt.value = h * pr; fumo.mat.uniforms.uScala.value = scala;
  stelle.material.uniforms.uPR.value = pr;
}
window.addEventListener('resize', adatta);
const bersaglioCam = new THREE.Vector3();
function aggiornaCamera(dt) {
  const s = camState, k = 1 - Math.exp(-dt * 6);
  s.az += (s.taz - s.az) * k; s.pol += (s.tpol - s.pol) * k; s.dist += (s.tdist - s.dist) * k;
  s.colpo = Math.max(0, s.colpo - dt * 2.5);
  const d = s.dist * (1 - Math.sin(s.colpo * Math.PI) * 0.025);
  const asp = innerWidth / innerHeight;
  // nei telefoni l'isola sta un po' più in alto, sopra i gettoni
  bersaglioCam.set(0, asp < 0.8 ? -0.35 : -0.5, asp < 0.8 ? 0.9 : 0.4);
  camera.position.set(bersaglioCam.x + d * Math.sin(s.pol) * Math.sin(s.az), bersaglioCam.y + d * Math.cos(s.pol), bersaglioCam.z + d * Math.sin(s.pol) * Math.cos(s.az));
  camera.lookAt(bersaglioCam);
  cielo.position.copy(camera.position);
  stelle.position.copy(camera.position);
  scene.fog.near = d * 0.95; scene.fog.far = d + 28;
}
const dita = new Map();
let pizzico = null;
canvas.addEventListener('pointerdown', (e) => {
  Suoni.avvia();
  dita.set(e.pointerId, { x: e.clientX, y: e.clientY });
  canvas.setPointerCapture(e.pointerId);
  if (dita.size === 2) { const [a, b] = [...dita.values()]; pizzico = { d: Math.hypot(a.x - b.x, a.y - b.y), dist: camState.tdist }; }
});
canvas.addEventListener('pointermove', (e) => {
  const p = dita.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  if (dita.size === 1) {
    camState.taz = clamp(camState.taz - dx * 0.0055, camState.az0 - 1.5, camState.az0 + 1.5);
    camState.tpol = clamp(camState.tpol - dy * 0.004, 0.55, 1.12);
  } else if (dita.size === 2 && pizzico) {
    const [a, b] = [...dita.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    camState.tdist = clamp(pizzico.dist * pizzico.d / Math.max(d, 1), camState.base * 0.5, camState.base * 1.3);
  }
});
const fineDito = (e) => { dita.delete(e.pointerId); if (dita.size < 2) pizzico = null; };
canvas.addEventListener('pointerup', fineDito); canvas.addEventListener('pointercancel', fineDito);
canvas.addEventListener('wheel', (e) => { e.preventDefault(); camState.tdist = clamp(camState.tdist * (1 + e.deltaY * 0.0012), camState.base * 0.5, camState.base * 1.3); }, { passive: false });

// ───────────────────────── gettoni, trascinamento, mirino
const gettoniEl = $('#gettoni');
const disponibili = [];
function aggiungiGettone(nome, nuovo = false) {
  if (disponibili.includes(nome)) return;
  disponibili.push(nome);
  const c = COSE[nome];
  const b = document.createElement('button');
  b.className = 'gettone' + (nuovo ? ' appena' : '');
  b.dataset.el = nome;
  b.setAttribute('aria-label', c.nome);
  b.innerHTML = `<div class="disco" style="background:radial-gradient(circle at 34% 28%, ${c.c[0]}, ${c.c[1]} 78%)">${svg(nome, c.ic)}</div><span>${c.nome}</span>`;
  gettoniEl.appendChild(b);
  if (nuovo) {
    setTimeout(() => { if (presa) return; const v = $('#vassoio'); const r = b.getBoundingClientRect(), rv = v.getBoundingClientRect(); if (r.left >= rv.left && r.right <= rv.right) return; v.scrollTo({ left: b.offsetLeft - v.clientWidth / 2 + b.clientWidth / 2, behavior: 'smooth' }); }, 300);
    setTimeout(() => b.classList.remove('appena'), 4000);
  }
}
GETTONI_BASE.forEach((n) => aggiungiGettone(n));

const mirino = new THREE.Group();
const mirAnello = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.6, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
const mirDisco = new THREE.Mesh(new THREE.CircleGeometry(0.5, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
const mirRaggio = new THREE.Mesh(colonnaGeo, colonnaMat(0xffffff));
mirRaggio.scale.set(0.12, 2.6, 0.12);
mirino.add(mirAnello, mirDisco, mirRaggio);
mirino.renderOrder = 9; mirino.visible = false;
[mirAnello, mirDisco, mirRaggio].forEach((m) => (m.renderOrder = 9));
scene.add(mirino);

const raggio = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const pianoMare = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const pTmp = new THREE.Vector3();
function puntaA(cx, cy) {
  ndc.set((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
  raggio.setFromCamera(ndc, camera);
  const hit = raggio.intersectObject(terreno, false)[0];
  if (hit && hit.point.y > 0.03 && Math.hypot(hit.point.x, hit.point.z) < 7.3) {
    const x = hit.point.x, z = hit.point.z;
    return { x, z, mare: false, cosa: cosaVicina(x, z) };
  }
  if (raggio.ray.intersectPlane(pianoMare, pTmp) && Math.hypot(pTmp.x, pTmp.z) < 7.3) {
    return { x: pTmp.x, z: pTmp.z, mare: true, cosa: cosaVicina(pTmp.x, pTmp.z) };
  }
  return null;
}
function cosaVicina(x, z) {
  let best = null, bd = 1e9;
  for (const c of cose) {
    if (c.morto || c.genere === 'omino' || c.genere === 'nuvola' || c.cadendo) continue;
    const r = c.genere === 'casa' ? 0.95 : c.genere === 'pianta' ? (c.stadio === 2 ? 0.75 : 0.55) : 0.65;
    const d = Math.hypot(c.x - x, c.z - z);
    if (d < r && d < bd) { bd = d; best = c; }
  }
  return best;
}
const NOMI_SU = { erba: 'sull’erba', terra: 'sulla terra', sabbia: 'sulla sabbia', fango: 'sul fango', argilla: 'sull’argilla', lava: 'sulla lava', pietra: 'sulla pietra', cenere: 'sulla cenere', vetro: 'sul vetro', mare: 'nel mare',
  germoglio: 'sul germoglio', pianta: 'sulla pianta', albero: 'sull’albero', incendio: 'sul fuoco', legna: 'sul legno', mattoni: 'sui mattoni', casa: 'sulla casa', utensile: 'sull’utensile' };

let presa = null, evidenziata = null;
const fantasma = $('#fantasma');
gettoniEl.addEventListener('pointerdown', (e) => {
  const b = e.target.closest('.gettone'); if (!b || presa) return;
  e.preventDefault();
  Suoni.avvia();
  presa = { el: b.dataset.el, id: e.pointerId, sx: e.clientX, sy: e.clientY, lx: e.clientX, modo: '?', btn: b, tocco: e.pointerType !== 'mouse', p: null };
});
window.addEventListener('pointermove', (e) => {
  if (!presa || e.pointerId !== presa.id) return;
  const dx = e.clientX - presa.sx, dy = e.clientY - presa.sy;
  if (presa.modo === '?') {
    if (dy < -10 || (!presa.tocco && Math.hypot(dx, dy) > 8)) iniziaTrascina();
    else if (Math.abs(dx) > 10) presa.modo = 'scorri';
  }
  if (presa.modo === 'scorri') {
    $('#vassoio').scrollLeft -= e.clientX - presa.lx;
    presa.lx = e.clientX;
    if (dy < -36) iniziaTrascina();
    return;
  }
  if (presa.modo === 'trascina') muoviTrascina(e.clientX, e.clientY);
});
function iniziaTrascina() {
  presa.modo = 'trascina';
  const c = COSE[presa.el];
  fantasma.querySelector('.disco').style.background = `radial-gradient(circle at 34% 28%, ${c.c[0]}, ${c.c[1]} 78%)`;
  fantasma.querySelector('.disco').innerHTML = svg(presa.el, c.ic);
  fantasma.classList.add('su');
  presa.btn.classList.add('preso');
  $('#mano').classList.remove('su');
  Suoni.prendi();
  const col = parseInt(c.c[1].slice(1), 16);
  mirAnello.material.color.setHex(col); mirDisco.material.color.setHex(col);
  mirRaggio.material.uniforms.uC.value.set(...raw(col));
}
function muoviTrascina(cx, cy) {
  const off = presa.tocco ? 46 : 0;
  const px = cx, py = cy - off;
  fantasma.style.transform = `translate(${px}px, ${py}px)`;
  const p = puntaA(px, py);
  presa.p = p;
  if (evidenziata) { evidenziata.evidenza = false; evidenziata = null; }
  const tag = fantasma.querySelector('.tag');
  if (p) {
    const y = p.mare ? 0.04 : suolo(p.x, p.z) + 0.04;
    mirino.visible = true; mirino.position.set(p.x, y, p.z);
    if (p.cosa) { p.cosa.evidenza = true; evidenziata = p.cosa; }
    const nome = p.cosa ? p.cosa.tipo() : p.mare ? 'mare' : NOMI_T[T[cellaDi(p.x, p.z)]];
    tag.textContent = `${COSE[presa.el].nome} ${NOMI_SU[nome] || ''}`;
    fantasma.classList.remove('no');
  } else {
    mirino.visible = false;
    tag.textContent = 'Portalo sull’isola';
    fantasma.classList.add('no');
  }
}
function finisciPresa(e) {
  if (!presa || e.pointerId !== presa.id) return;
  const pr = presa; presa = null;
  if (pr.modo !== 'trascina' || !pr.p || e.type !== 'pointerup') registro.push(`presa ${pr.el} ${pr.modo} ${pr.p ? 'ok' : 'fuori'} ${e.type}`);
  pr.btn.classList.remove('preso');
  mirino.visible = false;
  if (evidenziata) { evidenziata.evidenza = false; evidenziata = null; }
  fantasma.classList.remove('su');
  if (pr.modo === '?') {
    // tocco semplice: un piccolo aiuto
    pr.btn.classList.remove('balla'); void pr.btn.offsetWidth; pr.btn.classList.add('balla');
    mostraIdea('Tieni premuto e trascinalo sull’isola');
    return;
  }
  if (pr.modo === 'trascina' && pr.p && e.type === 'pointerup') { lascia(pr.el, pr.p); primaMossa = true; }
}
window.addEventListener('pointerup', finisciPresa);
window.addEventListener('pointercancel', finisciPresa);

// ───────────────────────── contatore, libro, idee, mano guida
function aggiornaContatore(salta = false) {
  const n = scoperte.size;
  $('#num').textContent = `${n}/${SCOPERTE.length}`;
  $('#barra').style.width = `${(n / SCOPERTE.length) * 100}%`;
  if (salta) { const c = $('#contatore'); c.classList.remove('salta'); void c.offsetWidth; c.classList.add('salta'); }
}
aggiornaContatore();
$('#contatore').addEventListener('click', () => {
  const g = $('#libro .griglia');
  g.innerHTML = SCOPERTE.map((n) => {
    const c = COSE[n], ok = scoperte.has(n);
    return ok ? `<div class="voce"><div class="disco" style="background:radial-gradient(circle at 34% 28%, ${c.c[0]}, ${c.c[1]} 78%)">${svg(n, c.ic)}</div><span>${c.nome}</span></div>`
      : `<div class="voce ignota"><div class="disco">?</div><span>…</span></div>`;
  }).join('');
  $('#libro h2').textContent = `Le tue scoperte: ${scoperte.size} su ${SCOPERTE.length}`;
  $('#libro').classList.add('su');
});
$('#libro .chiudi').addEventListener('click', () => $('#libro').classList.remove('su'));
$('#btnTempo').addEventListener('click', () => { Suoni.avvia(); salto = notte > 0.5 ? 0.33 : 0.9; });
$('#btnSuono').innerHTML = svg('suono');
$('#btnSuono').addEventListener('click', () => { Suoni.avvia(); Suoni.attivo = !Suoni.attivo; $('#btnSuono').innerHTML = svg(Suoni.attivo ? 'suono' : 'muto'); });

let ultimaAzione = 0, tempoReale = 0, primaMossa = false;
function mostraIdea(testo) {
  const el = $('#idea');
  el.innerHTML = `<b>Idea</b> ${testo}`;
  el.classList.remove('su'); void el.offsetWidth; el.classList.add('su');
  clearTimeout(mostraIdea.t); mostraIdea.t = setTimeout(() => el.classList.remove('su'), 5000);
}
function controllaIdee() {
  if (presa || codaFeste.length || tempoReale - ultimaAzione < 9) return;
  ultimaAzione = tempoReale;
  const idea = IDEE.find(([n]) => !scoperte.has(n));
  if (idea) mostraIdea(idea[1]);
}
function mostraMano() {
  if (primaMossa) return;
  const g = gettoniEl.querySelector('[data-el="acqua"]');
  if (!g) return;
  const r = g.getBoundingClientRect(), m = $('#mano');
  const s = schermo(0.6, 0.5, 0.8);
  m.style.setProperty('--x0', `${r.left + r.width / 2}px`); m.style.setProperty('--y0', `${r.top + r.height / 2}px`);
  m.style.setProperty('--x1', `${s.x}px`); m.style.setProperty('--y1', `${s.y}px`);
  m.innerHTML = `<div class="g" style="background:radial-gradient(circle at 34% 28%, ${COSE.acqua.c[0]}, ${COSE.acqua.c[1]} 78%)">${svg('acqua', '#fff')}</div>${svg('mano', '#fff')}`;
  m.classList.add('su');
}
setTimeout(() => { mostraMano(); if (!primaMossa) mostraIdea('Trascina un elemento sull’isola'); }, 1600);

// ───────────────────────── ciclo principale
let tempo = 0, ultimo = performance.now(), velocita = 1, accLava = 0, fpsMedia = 60;
function ciclo(ora_) {
  const dtR = Math.min(0.05, (ora_ - ultimo) / 1000); fpsMedia = lerp(fpsMedia, 1000 / Math.max(1, ora_ - ultimo), 0.05); ultimo = ora_;
  const dt = dtR * velocita;
  tempo += dt; tempoReale += dtR; uTempo.value = tempo;
  aggiornaCamera(dtR);
  aggiornaLuce(dt);
  aggiornaTweens(dt);
  aggiornaCadenti(dt);
  fuocoAttivo.length = 0;
  for (let i = cose.length - 1; i >= 0; i--) { const c = cose[i]; if (!c.morto) c.aggiorna(dt, tempo); }
  {
    let voglia = 0;
    if (fuocoAttivo.length) { const f = fuocoAttivo[0]; luceFuoco.position.set(f.x, f.radice.position.y + 0.9, f.z); voglia = 7; }
    else if (lavaAttiva.size) { const i = fontane.length ? cellaDi(fontane[0].x, fontane[0].z) : lavaAttiva.values().next().value; luceFuoco.position.set(PX[i], H[i] + 0.7, PZ[i]); voglia = 4; }
    luceFuocoI = lerp(luceFuocoI, voglia, 1 - Math.exp(-dt * 3));
    luceFuoco.intensity = luceFuocoI * (0.85 + 0.15 * Math.sin(tempo * 23) * Math.sin(tempo * 7.3)) * (1 + notte * 0.6);
  }
  accLava += dt;
  while (accLava > 0.1) { accLava -= 0.1; tickLava(0.1); tickTerreno(0.1); }
  if (aggiornaAltezzeDopo) { aggiornaAltezzeDopo = false; aggiornaAltezze(); }
  aggiornaInArrivo(dt);
  aggiornaColori(dt);
  aggiornaCiuffi();
  aggiornaEmettitori(dt);
  aggiornaPioggia(dt);
  lucciole(dt);
  luce.aggiorna(dt); fumo.aggiorna(dt);
  aggiornaFeste(dtR);
  aggiornaCatena(dt);
  controllaIdee();
  if (ventoT > 0) { ventoT -= dt; if (ventoT <= 0) ventoForza = 0; }
  ondaExtra = Math.max(0, ondaExtra - dt * 0.6);
  mareUni.uOnda.value = 1 + ondaExtra;
  vento += dt;
  gabbiani.forEach((g) => {
    const u = g.userData, a = tempo * u.v + u.f;
    g.position.set(Math.cos(a) * u.r, u.h + Math.sin(tempo * 0.7 + u.f) * 0.2, Math.sin(a) * u.r);
    g.rotation.y = -a + (u.v > 0 ? 0 : Math.PI);
    const b = Math.sin(tempo * 7 + u.f) * 0.5;
    u.p1.rotation.z = b; u.p2.rotation.z = -b;
    g.visible = notte < 0.6;
  });
  if (mirino.visible) { const s = 1 + Math.sin(tempoReale * 8) * 0.08; mirAnello.scale.setScalar(s); mirDisco.material.opacity = 0.18 + Math.sin(tempoReale * 8) * 0.08; }
  renderer.render(scene, camera);
  requestAnimationFrame(ciclo);
}
adatta();
aggiornaLuce(0);
requestAnimationFrame(ciclo);

// ───────────────────────── appigli per le prove automatiche
window.__isola = {
  schermo, scoperte, cose,
  get ora() { return ora; }, set ora(v) { ora = v; },
  get velocita() { return velocita; }, set velocita(v) { velocita = v; },
  trova: (tipo) => cose.filter((c) => !c.morto && (c.tipo() === tipo || c.genere === tipo)).map((c) => ({ x: c.x, z: c.z, y: suolo(c.x, c.z), tipo: c.tipo() })),
  cella: (x, z) => NOMI_T[T[cellaDi(x, z)]],
  suolo, camState,
  lava: () => lavaAttiva.size, registro,
  sblocca: (n) => aggiungiGettone(n),
  get tempo() { return tempo; }, get fps() { return fpsMedia; },
  pianta: (x, z, st) => { aggiungi(new Pianta(x, z, st)); },
  casa: (x, z) => costruisciCasa(x, z),
  omini: (x, z) => nascitaOmini({ x, z }),
};
