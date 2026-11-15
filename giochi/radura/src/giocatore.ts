import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { limita } from './base/matematica.js';
import type { Comandi } from './comandi.js';
import { altezza } from './mondo/terreno.js';

const OCCHI = 0.72;

/** Chi gioca: una capsula che cammina, salta e urta contro i muri, con la telecamera al posto degli occhi. */
export class Giocatore {
  readonly corpo: RAPIER.RigidBody;
  private readonly collisore: RAPIER.Collider;
  private readonly controllo: RAPIER.KinematicCharacterController;
  readonly posizione = new THREE.Vector3(0, 0, 41);
  imbardata = 0;
  beccheggio = 0.04;
  private velY = 0;
  private aTerra = false;
  /** Quanto sta camminando (0 fermo, 1 al passo, di più in corsa): muove il bastone. */
  andatura = 0;

  constructor(R: typeof RAPIER, fisica: RAPIER.World) {
    this.posizione.y = altezza(0, 41) + 1;
    this.corpo = fisica.createRigidBody(
      R.RigidBodyDesc.kinematicPositionBased().setTranslation(this.posizione.x, this.posizione.y, this.posizione.z),
    );
    this.collisore = fisica.createCollider(R.ColliderDesc.capsule(0.5, 0.35), this.corpo);
    this.controllo = fisica.createCharacterController(0.03);
    this.controllo.enableAutostep(0.65, 0.15, true);
    this.controllo.enableSnapToGround(0.4);
    this.controllo.setMaxSlopeClimbAngle((55 * Math.PI) / 180);
    this.controllo.setApplyImpulsesToDynamicBodies(true);
    this.controllo.setCharacterMass(70);
  }

  aggiorna(dt: number, comandi: Comandi, camera: THREE.PerspectiveCamera, scossa: number): void {
    const sensibilita = 0.0023;
    this.imbardata -= comandi.guardaX * sensibilita;
    this.beccheggio = limita(this.beccheggio - comandi.guardaY * sensibilita, -1.45, 1.45);

    let avanti = comandi.avanti;
    let lato = comandi.lato;
    const lung = Math.hypot(avanti, lato);
    if (lung > 1) {
      avanti /= lung;
      lato /= lung;
    }
    const passo = (comandi.corri ? 11 : 6.5) * dt;
    const sn = Math.sin(this.imbardata);
    const cs = Math.cos(this.imbardata);
    if (this.aTerra && this.velY < 0) this.velY = -2;
    if (this.aTerra && comandi.salta) this.velY = 8.5;
    this.velY = Math.max(-40, this.velY - 24 * dt);

    this.controllo.computeColliderMovement(this.collisore, {
      x: (-sn * avanti + cs * lato) * passo,
      y: this.velY * dt,
      z: (-cs * avanti - sn * lato) * passo,
    });
    const m = this.controllo.computedMovement();
    this.aTerra = this.controllo.computedGrounded();
    this.posizione.x += m.x;
    this.posizione.y += m.y;
    this.posizione.z += m.z;

    // Rete di sicurezza: se per qualche motivo si finisce sotto terra, si torna su.
    const suolo = altezza(this.posizione.x, this.posizione.z);
    if (this.posizione.y < suolo + 0.4) {
      this.posizione.y = suolo + 0.9;
      this.velY = 0;
    }
    this.corpo.setNextKinematicTranslation(this.posizione);

    const mosso = Math.hypot(m.x, m.z) / Math.max(dt, 0.001);
    this.andatura += ((this.aTerra ? mosso / 6.5 : 0) - this.andatura) * Math.min(1, dt * 10);

    camera.position.set(
      this.posizione.x + (Math.random() - 0.5) * scossa * 0.25,
      this.posizione.y + OCCHI + (Math.random() - 0.5) * scossa * 0.25,
      this.posizione.z + (Math.random() - 0.5) * scossa * 0.25,
    );
    camera.rotation.set(this.beccheggio, this.imbardata, (Math.random() - 0.5) * scossa * 0.03, 'YXZ');
  }
}
