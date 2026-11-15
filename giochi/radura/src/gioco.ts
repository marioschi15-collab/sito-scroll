import type * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { Lampi } from './effetti/lampi.js';
import type { Particelle } from './effetti/particelle.js';
import type { Pezzi } from './fisica/pezzi.js';
import type { AlberiMagici } from './mondo/alberiMagici.js';
import type { Campo } from './mondo/campo.js';
import type { Suoni } from './suoni.js';

/** Tutto ciò che un incantesimo può toccare. */
export interface Gioco {
  readonly R: typeof RAPIER;
  readonly fisica: RAPIER.World;
  readonly scena: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly corpoGiocatore: RAPIER.RigidBody;
  readonly pezzi: Pezzi;
  readonly campo: Campo;
  readonly scintille: Particelle;
  readonly fumo: Particelle;
  readonly lampi: Lampi;
  readonly suoni: Suoni;
  readonly alberi: AlberiMagici;
  /** Fa tremare la visuale; si attenua da sola con la distanza dal punto indicato. */
  scossa(forza: number, dove: THREE.Vector3): void;
  /** Chiede di oscurare e tingere il cielo per questo fotogramma (vince la richiesta più forte). */
  umore(buio: number, r: number, g: number, b: number): void;
  aggiungi(effetto: Effetto): void;
  /** Vero finché chi gioca tiene premuto il lancio. */
  premuto(): boolean;
  /** Un incantesimo "a presa" lo mette a vero mentre è in corso: finché lo è, non se ne lanciano altri. */
  impegnato: boolean;
}

/** Qualcosa che dura nel tempo (una palla di fuoco in volo, un tornado...). Restituisce false quando ha finito. */
export interface Effetto {
  aggiorna(dt: number, g: Gioco): boolean;
}

export interface Lancio {
  /** La punta del bastone. */
  readonly origine: THREE.Vector3;
  /** Il punto del mondo sotto il mirino. */
  readonly bersaglio: THREE.Vector3;
  /** La direzione dello sguardo. */
  readonly direzione: THREE.Vector3;
  /** Vero se il mirino è sul prato (e non su un muro o in cielo). */
  readonly aTerra: boolean;
}

export interface Incantesimo {
  readonly nome: string;
  readonly cosaFa: string;
  readonly simbolo: string;
  readonly colore: number;
  /** Secondi di attesa tra un lancio e il successivo. */
  readonly ricarica: number;
  lancia(g: Gioco, l: Lancio): void;
}
