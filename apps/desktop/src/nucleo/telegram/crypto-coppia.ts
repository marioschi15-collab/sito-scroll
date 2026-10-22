/**
 * Schema di consegna del token (docs/02 §8.2, lato app): chiave effimera ECDH P-256 dell'app, chiave effimera
 * del bot gestore, segreto condiviso → HKDF-SHA256 (sale = nonce) → AES-256-GCM. Solo Web Crypto: lo stesso
 * codice gira in Node e nel Worker; il gestore dimentica il testo in chiaro dopo aver cifrato.
 */
import type { webcrypto } from 'node:crypto';

type Crypto = webcrypto.Crypto;
type SubtleCrypto = webcrypto.SubtleCrypto;
type CryptoKey = webcrypto.CryptoKey;
type CryptoKeyPair = webcrypto.CryptoKeyPair;

export const VERSIONE_BUSTA = 1;
export const INFO_HKDF = 'spalla-managed-bot-v1';

export interface BustaCifrata {
  v: number;
  /** Chiave pubblica effimera del gestore (P-256 raw, base64url). */
  chiave_pubblica_gestore: string;
  iv: string;
  cifrato: string;
}

export interface ContenutoConsegna {
  token: string;
  id_proprietario: number;
  username: string;
}

export function base64url(dati: ArrayBuffer | Uint8Array): string {
  const bytes = dati instanceof Uint8Array ? dati : new Uint8Array(dati);
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function daBase64url(testo: string): Uint8Array<ArrayBuffer> {
  const base64 = testo.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (testo.length % 4)) % 4);
  const binario = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binario.length));
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

function subtle(c?: Crypto): SubtleCrypto {
  const impl = c ?? (globalThis.crypto as unknown as Crypto);
  if (!impl?.subtle) throw new Error('Web Crypto non disponibile');
  return impl.subtle;
}

export async function generaCoppiaEffimera(c?: Crypto): Promise<{ coppia: CryptoKeyPair; pubblicaBase64url: string }> {
  const coppia = await subtle(c).generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  const raw = await subtle(c).exportKey('raw', coppia.publicKey);
  return { coppia, pubblicaBase64url: base64url(raw) };
}

export async function importaPubblica(base64: string, c?: Crypto): Promise<CryptoKey> {
  const raw = daBase64url(base64);
  if (raw.length !== 65 || raw[0] !== 0x04) throw new Error('chiave pubblica P-256 non valida');
  return subtle(c).importKey('raw', raw, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
}

/** Chiave AES-GCM derivata dal segreto ECDH con HKDF-SHA256 (sale = nonce, info fissa). */
export async function derivaChiaveAes(privata: CryptoKey, pubblicaAltrui: CryptoKey, nonce: string, c?: Crypto): Promise<CryptoKey> {
  const segreto = await subtle(c).deriveBits({ name: 'ECDH', public: pubblicaAltrui }, privata, 256);
  const materiale = await subtle(c).importKey('raw', segreto, 'HKDF', false, ['deriveKey']);
  const codificatore = new TextEncoder();
  return subtle(c).deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: codificatore.encode(nonce), info: codificatore.encode(INFO_HKDF) },
    materiale,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Lato gestore: cifra il contenuto per la chiave pubblica dell'app. */
export async function cifraPerApp(contenuto: ContenutoConsegna, chiavePubblicaApp: string, nonce: string, c?: Crypto): Promise<BustaCifrata> {
  const impl = c ?? (globalThis.crypto as unknown as Crypto);
  const pubblicaApp = await importaPubblica(chiavePubblicaApp, impl);
  const { coppia, pubblicaBase64url } = await generaCoppiaEffimera(impl);
  const chiave = await derivaChiaveAes(coppia.privateKey, pubblicaApp, nonce, impl);
  const iv = impl.getRandomValues(new Uint8Array(12));
  const cifrato = await impl.subtle.encrypt({ name: 'AES-GCM', iv }, chiave, new TextEncoder().encode(JSON.stringify(contenuto)));
  return { v: VERSIONE_BUSTA, chiave_pubblica_gestore: pubblicaBase64url, iv: base64url(iv), cifrato: base64url(cifrato) };
}

/** Lato app: decifra la busta con la propria chiave privata effimera. */
export async function decifraBusta(busta: BustaCifrata, privataApp: CryptoKey, nonce: string, c?: Crypto): Promise<ContenutoConsegna> {
  if (busta.v !== VERSIONE_BUSTA) throw new Error(`versione busta non supportata: ${busta.v}`);
  const pubblicaGestore = await importaPubblica(busta.chiave_pubblica_gestore, c);
  const chiave = await derivaChiaveAes(privataApp, pubblicaGestore, nonce, c);
  const chiaro = await subtle(c).decrypt({ name: 'AES-GCM', iv: daBase64url(busta.iv) }, chiave, daBase64url(busta.cifrato));
  const dati = JSON.parse(new TextDecoder().decode(chiaro)) as Partial<ContenutoConsegna>;
  if (typeof dati.token !== 'string' || typeof dati.id_proprietario !== 'number' || typeof dati.username !== 'string') {
    throw new Error('contenuto della busta non valido');
  }
  return { token: dati.token, id_proprietario: dati.id_proprietario, username: dati.username };
}
