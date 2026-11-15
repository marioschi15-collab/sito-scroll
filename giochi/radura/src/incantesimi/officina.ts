import * as THREE from 'three';
import { anello, bolla, creaCerchioMagico, rendi, Saetta, scia } from '../effetti/forme.js';
import type { Effetto, Gioco, Incantesimo, Lancio } from '../gioco.js';
import { altezza } from '../mondo/terreno.js';
import { Cristalli } from './cristalli.js';
import { Levitazione } from './levitazione.js';

/**
 * L'officina degli incantesimi: chi gioca ne inventa di suoi mettendo insieme pochi mattoni.
 * Una "ricetta" dice come parte l'incantesimo (la forma), che cosa fa dove arriva (fino a tre effetti),
 * quanto è forte e quanto è ampio. Ogni ricetta si può trasformare in un codice da passare a un amico.
 */
export interface Ricetta {
  nome: string;
  simbolo: string;
  colore: number;
  forma: string;
  effetti: string[];
  /** 1 lieve, 2 forte, 3 devastante. */
  potenza: number;
  /** 1 stretta, 2 media, 3 vasta. */
  ampiezza: number;
}

export interface Scelta {
  readonly id: string;
  readonly nome: string;
  readonly simbolo: string;
  readonly cosaFa: string;
}

export const FORME: readonly Scelta[] = [
  { id: 'palla', nome: 'Palla', simbolo: '🔮', cosaFa: 'vola dal bastone fin dove miri' },
  { id: 'tocco', nome: 'Tocco', simbolo: '👉', cosaFa: 'succede all’istante dove miri' },
  { id: 'cielo', nome: 'Dal cielo', simbolo: '🌠', cosaFa: 'cala dall’alto dopo un attimo' },
  { id: 'pioggia', nome: 'Pioggia', simbolo: '🌧️', cosaFa: 'sei colpi sparsi tutt’intorno' },
  { id: 'onda', nome: 'Onda', simbolo: '🌊', cosaFa: 'una fila di colpi da te al bersaglio' },
];

export const EFFETTI: readonly Scelta[] = [
  { id: 'scoppio', nome: 'Scoppio', simbolo: '💥', cosaFa: 'scaglia via i pezzi' },
  { id: 'risucchio', nome: 'Risucchio', simbolo: '🕳️', cosaFa: 'tira i pezzi verso il centro' },
  { id: 'solleva', nome: 'Solleva', simbolo: '⬆️', cosaFa: 'lancia tutto verso l’alto' },
  { id: 'vortice', nome: 'Vortice', simbolo: '🌀', cosaFa: 'fa girare i pezzi in tondo' },
  { id: 'brucia', nome: 'Brucia', simbolo: '🔥', cosaFa: 'incendia erba e legno' },
  { id: 'gela', nome: 'Gela', simbolo: '❄️', cosaFa: 'ghiaccia e spegne il fuoco' },
  { id: 'folgora', nome: 'Folgora', simbolo: '⚡', cosaFa: 'una saetta dal cielo' },
  { id: 'fiorisce', nome: 'Fiorisce', simbolo: '🌸', cosaFa: 'fa crescere erba e fiori' },
  { id: 'cristalli', nome: 'Cristalli', simbolo: '💎', cosaFa: 'spuntoni che eruttano in cerchio' },
  { id: 'bolla', nome: 'Bolla', simbolo: '🎈', cosaFa: 'per un po’ lì il peso sparisce' },
  { id: 'rammenda', nome: 'Rammenda', simbolo: '⏳', cosaFa: 'rimette a posto ciò che è rotto' },
];

export const SIMBOLI = ['✨', '🌙', '☀️', '⭐', '👁️', '🐉', '🦋', '🍄', '🌊', '🪄', '💀', '👑', '🌈', '🕯️', '🦅', '🐺'];
export const COLORI = [0xff5a3a, 0xffb02e, 0xffe14a, 0x6dff6a, 0x4fe0c8, 0x6fb8ff, 0xa56bff, 0xff7ad0];
export const MASSIMO_EFFETTI = 3;
export const MASSIMO_RICETTE = 8;

/** Rimette in riga una ricetta arrivata da fuori (un codice incollato, la memoria del browser): solo valori che esistono. */
export function ripulisci(dato: unknown): Ricetta | null {
  if (typeof dato !== 'object' || dato === null) return null;
  const d = dato as Record<string, unknown>;
  const effetti = Array.isArray(d.effetti)
    ? [...new Set(d.effetti.filter((e): e is string => EFFETTI.some((x) => x.id === e)))].slice(0, MASSIMO_EFFETTI)
    : [];
  if (effetti.length === 0) return null;
  const intero = (v: unknown, min: number, max: number, base: number): number =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : base;
  const nome = typeof d.nome === 'string' ? d.nome.replace(/[<>&"']/g, '').trim().slice(0, 18) : '';
  return {
    nome: nome || 'Senza nome',
    simbolo: typeof d.simbolo === 'string' && SIMBOLI.includes(d.simbolo) ? d.simbolo : SIMBOLI[0]!,
    colore: intero(d.colore, 0, 0xffffff, COLORI[0]!),
    forma: FORME.some((f) => f.id === d.forma) ? (d.forma as string) : 'tocco',
    effetti,
    potenza: intero(d.potenza, 1, 3, 2),
    ampiezza: intero(d.ampiezza, 1, 3, 2),
  };
}

const PREFISSO = 'RAD1.';

/** Il codice da passare a un amico: la ricetta scritta in poche lettere. */
export function codifica(r: Ricetta): string {
  const testo = JSON.stringify([r.nome, r.simbolo, r.colore, r.forma, r.effetti, r.potenza, r.ampiezza]);
  const bytes = new TextEncoder().encode(testo);
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return PREFISSO + btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodifica(codice: string): Ricetta | null {
  try {
    const pulito = codice.trim();
    if (!pulito.startsWith(PREFISSO)) return null;
    const binario = atob(pulito.slice(PREFISSO.length).replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
    const a = JSON.parse(new TextDecoder().decode(bytes)) as unknown[];
    if (!Array.isArray(a)) return null;
    return ripulisci({ nome: a[0], simbolo: a[1], colore: a[2], forma: a[3], effetti: a[4], potenza: a[5], ampiezza: a[6] });
  } catch {
    return null;
  }
}

const CHIAVE = 'radura-incantesimi';

export function leggiRicette(): Ricetta[] {
  try {
    const dati = JSON.parse(localStorage.getItem(CHIAVE) ?? '[]') as unknown[];
    return dati.map(ripulisci).filter((r): r is Ricetta => r !== null).slice(0, MASSIMO_RICETTE);
  } catch {
    return [];
  }
}

export function salvaRicette(ricette: readonly Ricetta[]): void {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(ricette));
  } catch {
    // Senza memoria del browser gli incantesimi valgono solo per questa partita.
  }
}

// ---------------------------------------------------------------------------------------------------------------

// Il quarto livello non si può scegliere nell'officina né arrivare da un codice: è solo degli incantesimi perduti.
const FORZE = [0, 0.7, 1.1, 1.6, 2.1];
const RAGGI = [0, 4.2, 7, 10.5, 13.5];

/** Quello che succede in un punto: i bagliori del colore scelto e, uno dopo l'altro, gli effetti della ricetta. */
function impatto(g: Gioco, r: Ricetta, p: THREE.Vector3, scala: number): void {
  const forza = FORZE[r.potenza]! * scala;
  const raggio = RAGGI[r.ampiezza]! * (0.6 + 0.4 * scala);
  const suolo = new THREE.Vector3(p.x, altezza(p.x, p.z), p.z);
  const c = new THREE.Color(r.colore);
  bolla(g, p, r.colore, raggio * 0.55, 0.35, 0.7);
  anello(g, suolo, r.colore, raggio, 0.6, 1.1);
  for (let i = 0; i < 26 * scala + 10; i++) {
    const a = Math.random() * Math.PI * 2;
    const su = Math.random();
    const v = 3 + Math.random() * raggio * 1.4;
    g.scintille.emetti({
      x: p.x, y: p.y + 0.3, z: p.z, vx: Math.cos(a) * v * (1 - su * 0.5), vy: su * v, vz: Math.sin(a) * v * (1 - su * 0.5),
      vita: 0.5 + Math.random() * 0.7, dim: 0.5 + Math.random() * 0.6, dimFine: 0.05,
      r: c.r * 1.6 + 0.2, g: c.g * 1.6 + 0.2, b: c.b * 1.6 + 0.2, alfa: 0.8, gravita: 5, attrito: 1.2,
    });
  }
  g.lampi.lampo(new THREE.Vector3(p.x, p.y + 2, p.z), r.colore, 22 * forza, 0.6);
  let botto = 0;
  for (const effetto of r.effetti) {
    switch (effetto) {
      case 'scoppio':
        g.pezzi.spinta(p.x, p.y - 0.5, p.z, raggio, 11 * forza, 0.45);
        botto = Math.max(botto, 0.35 * forza);
        break;
      case 'risucchio':
        g.pezzi.spinta(p.x, p.y + 3, p.z, raggio * 1.4, -9 * forza, -0.6);
        break;
      case 'solleva':
        for (const i of g.pezzi.vicini(p.x, p.y, p.z, raggio, 500)) g.pezzi.accelera(i, 0, 10 * forza + Math.random() * 3, 0, 1);
        break;
      case 'vortice':
        for (const i of g.pezzi.vicini(p.x, p.y, p.z, raggio, 500)) {
          const dx = g.pezzi.pos[i * 3]! - p.x;
          const dz = g.pezzi.pos[i * 3 + 2]! - p.z;
          const d = Math.hypot(dx, dz) + 0.1;
          g.pezzi.accelera(i, (-dz / d) * 12 * forza, 3.5 * forza, (dx / d) * 12 * forza, 1);
        }
        break;
      case 'brucia':
        g.campo.accendi(p.x, p.z, raggio * 0.6, 7 + r.potenza * 3);
        g.pezzi.accendiVicini(p.x, p.y, p.z, raggio * 0.6);
        break;
      case 'gela':
        g.campo.gela(p.x, p.z, raggio);
        g.pezzi.gela(p.x, p.y, p.z, raggio);
        g.suoni.gelo();
        break;
      case 'folgora':
        g.aggiungi(new Saetta(g, new THREE.Vector3(p.x + (Math.random() - 0.5) * 12, p.y + 70, p.z + (Math.random() - 0.5) * 12), p.clone(), 0xdfe8ff));
        g.pezzi.spinta(p.x, p.y + 0.5, p.z, Math.min(raggio, 6), 13 * forza, 0.25);
        g.suoni.saetta();
        break;
      case 'fiorisce':
        g.campo.fiorisci(p.x, p.z, raggio, 1);
        break;
      case 'cristalli': {
        const quanti = 3 + r.ampiezza * 2;
        const punti = Array.from({ length: quanti }, (_, k) => {
          const a = (k / quanti) * Math.PI * 2;
          return { x: p.x + Math.cos(a) * raggio * 0.45, z: p.z + Math.sin(a) * raggio * 0.45 };
        });
        g.aggiungi(new Cristalli(g, punti));
        break;
      }
      case 'bolla':
        g.aggiungi(new Levitazione(g, p, 2.5 + r.potenza * 1.5, raggio));
        break;
      case 'rammenda':
        g.pezzi.rammenda(p.x, p.z, raggio);
        g.campo.risana(p.x, p.z, raggio);
        g.suoni.ricostruzione();
        break;
    }
  }
  if (botto > 0) {
    g.suoni.botto(botto);
    g.scossa(botto * 1.6, p);
  } else {
    g.suoni.soffio();
  }
}

/** Qualcosa che succede dopo un'attesa. */
class Dopo implements Effetto {
  constructor(private attesa: number, private readonly fai: (g: Gioco) => void) {}
  aggiorna(dt: number, g: Gioco): boolean {
    this.attesa -= dt;
    if (this.attesa > 0) return true;
    this.fai(g);
    return false;
  }
}

const SFERA = new THREE.IcosahedronGeometry(0.24, 1);

class Palla implements Effetto {
  private readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private readonly vel: THREE.Vector3;
  private eta = 0;
  private readonly c: THREE.Color;

  constructor(g: Gioco, private readonly r: Ricetta, l: Lancio) {
    this.c = new THREE.Color(r.colore);
    this.mesh = new THREE.Mesh(SFERA, new THREE.MeshBasicMaterial({ color: this.c.clone().multiplyScalar(1.8), fog: false }));
    this.mesh.position.copy(l.origine);
    const dir = l.bersaglio.clone().sub(l.origine);
    const distanza = dir.length();
    dir.normalize();
    dir.y += distanza * 0.0013;
    this.vel = dir.normalize().multiplyScalar(50);
    g.scena.add(this.mesh);
  }

  aggiorna(dt: number, g: Gioco): boolean {
    this.eta += dt;
    this.vel.y -= 7 * dt;
    const p = this.mesh.position;
    const passo = this.vel.length() * dt;
    const dir = this.vel.clone().normalize();
    const colpo = g.fisica.castRay(new g.R.Ray(p, dir), passo, true, undefined, undefined, undefined, g.corpoGiocatore);
    p.addScaledVector(dir, colpo ? colpo.timeOfImpact : passo);
    for (let i = 0; i < 2; i++) {
      g.scintille.emetti({
        x: p.x, y: p.y, z: p.z, vx: (Math.random() - 0.5) * 1.5, vy: Math.random() * 1.5, vz: (Math.random() - 0.5) * 1.5,
        vita: 0.35, dim: 0.7, dimFine: 0.08, r: this.c.r * 1.6, g: this.c.g * 1.6, b: this.c.b * 1.6, alfa: 0.7,
      });
    }
    if (!colpo && p.y > altezza(p.x, p.z) && this.eta < 5) return true;
    this.mesh.removeFromParent();
    this.mesh.material.dispose();
    impatto(g, this.r, p.clone(), 1);
    return false;
  }
}

/** Trasforma una ricetta in un incantesimo vero, da mettere nella barra. */
export function creaDaRicetta(r: Ricetta): Incantesimo {
  const forma = FORME.find((f) => f.id === r.forma)!;
  const nomi = r.effetti.map((e) => EFFETTI.find((x) => x.id === e)!.nome.toLowerCase());
  return {
    nome: r.nome,
    cosaFa: `${forma.nome}: ${nomi.join(', ')}`,
    simbolo: r.simbolo,
    colore: r.colore,
    ricarica: 0.4 + 0.35 * r.effetti.length + 0.4 * (r.potenza - 1) + 0.3 * (r.ampiezza - 1) + (r.forma === 'pioggia' ? 1 : 0),
    lancia(g, l) {
      const p = l.bersaglio.clone();
      const c = new THREE.Color(r.colore);
      const raggio = RAGGI[r.ampiezza]!;
      if (r.forma === 'palla') {
        g.aggiungi(new Palla(g, r, l));
        g.suoni.soffio();
      } else if (r.forma === 'tocco') {
        scia(g, l.origine, p, c.r * 1.6, c.g * 1.6, c.b * 1.6);
        impatto(g, r, p, 1);
      } else if (r.forma === 'cielo') {
        const cerchio = creaCerchioMagico(r.colore, 1.6);
        cerchio.position.set(p.x, altezza(p.x, p.z) + 14, p.z);
        cerchio.scale.setScalar(raggio * 0.7);
        g.scena.add(cerchio);
        g.suoni.carica(0.7);
        let eta = 0;
        g.aggiungi({
          aggiorna(dt) {
            eta += dt;
            cerchio.rotation.y += dt * 4;
            cerchio.position.y -= dt * 14;
            cerchio.scale.setScalar(Math.max(0.1, raggio * 0.7 * (1 - eta / 0.9)));
            if (eta < 0.75) return true;
            cerchio.removeFromParent();
            rendi(cerchio.material);
            impatto(g, r, p, 1.15);
            return false;
          },
        });
      } else if (r.forma === 'pioggia') {
        for (let i = 0; i < 6; i++) {
          const a = Math.random() * Math.PI * 2;
          const d = i === 0 ? 0 : (0.4 + Math.random() * 0.8) * raggio * 1.3;
          const x = p.x + Math.cos(a) * d;
          const z = p.z + Math.sin(a) * d;
          const q = new THREE.Vector3(x, i === 0 ? p.y : altezza(x, z), z);
          g.aggiungi(new Dopo(0.15 + i * 0.3, (gg) => {
            scia(gg, new THREE.Vector3(q.x - 4, q.y + 30, q.z + 2), q, c.r * 1.6, c.g * 1.6, c.b * 1.6, 18);
            impatto(gg, r, q, 0.6);
          }));
        }
      } else {
        // Onda: una fila di colpi che corre da chi lancia al bersaglio.
        const da = g.camera.position;
        const dir = new THREE.Vector3(p.x - da.x, 0, p.z - da.z);
        const distanza = dir.length();
        dir.normalize();
        const colpi = Math.min(7, Math.max(3, Math.round(distanza / 4)));
        for (let i = 0; i < colpi; i++) {
          const x = da.x + dir.x * (5 + i * 4);
          const z = da.z + dir.z * (5 + i * 4);
          const q = new THREE.Vector3(x, altezza(x, z) + 0.3, z);
          g.aggiungi(new Dopo(i * 0.11, (gg) => impatto(gg, r, q, 0.55)));
        }
      }
    },
  };
}
