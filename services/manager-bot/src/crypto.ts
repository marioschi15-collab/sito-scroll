/**
 * Consegna cifrata del token (docs/02 §8.2): ECDH P-256 effimero su entrambi i lati, HKDF-SHA256 con sale = nonce,
 * AES-256-GCM. Solo Web Crypto, nessuna dipendenza. Copia speculare: apps/desktop/src/nucleo/telegram/crypto-coppia.ts.
 */
export const VERSIONE_BUSTA = 1;
export const INFO_HKDF = 'spalla-managed-bot-v1';

export interface BustaCifrata {
  v: number;
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

export async function generaCoppiaEffimera(): Promise<{ coppia: CryptoKeyPair; pubblicaBase64url: string }> {
  const coppia = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  const raw = await crypto.subtle.exportKey('raw', coppia.publicKey);
  return { coppia, pubblicaBase64url: base64url(raw) };
}

export async function importaPubblica(base64: string): Promise<CryptoKey> {
  const raw = daBase64url(base64);
  if (raw.length !== 65 || raw[0] !== 0x04) throw new Error('chiave pubblica P-256 non valida');
  return crypto.subtle.importKey('raw', raw, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
}

/** True se la stringa è una chiave pubblica P-256 importabile (controllo all'accettazione della richiesta). */
export async function chiavePubblicaValida(base64: string): Promise<boolean> {
  try {
    await importaPubblica(base64);
    return true;
  } catch {
    return false;
  }
}

export async function derivaChiaveAes(privata: CryptoKey, pubblicaAltrui: CryptoKey, nonce: string): Promise<CryptoKey> {
  const segreto = await crypto.subtle.deriveBits({ name: 'ECDH', public: pubblicaAltrui }, privata, 256);
  const materiale = await crypto.subtle.importKey('raw', segreto, 'HKDF', false, ['deriveKey']);
  const codificatore = new TextEncoder();
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: codificatore.encode(nonce), info: codificatore.encode(INFO_HKDF) },
    materiale,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Lato gestore: cifra per la chiave pubblica effimera dell'app; il testo in chiaro non viene conservato. */
export async function cifraPerApp(contenuto: ContenutoConsegna, chiavePubblicaApp: string, nonce: string): Promise<BustaCifrata> {
  const pubblicaApp = await importaPubblica(chiavePubblicaApp);
  const { coppia, pubblicaBase64url } = await generaCoppiaEffimera();
  const chiave = await derivaChiaveAes(coppia.privateKey, pubblicaApp, nonce);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cifrato = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, chiave, new TextEncoder().encode(JSON.stringify(contenuto)));
  return { v: VERSIONE_BUSTA, chiave_pubblica_gestore: pubblicaBase64url, iv: base64url(iv), cifrato: base64url(cifrato) };
}

/** Lato app (usato qui solo nei test di andata e ritorno). */
export async function decifraBusta(busta: BustaCifrata, privataApp: CryptoKey, nonce: string): Promise<ContenutoConsegna> {
  if (busta.v !== VERSIONE_BUSTA) throw new Error(`versione busta non supportata: ${busta.v}`);
  const pubblicaGestore = await importaPubblica(busta.chiave_pubblica_gestore);
  const chiave = await derivaChiaveAes(privataApp, pubblicaGestore, nonce);
  const chiaro = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: daBase64url(busta.iv) }, chiave, daBase64url(busta.cifrato));
  const dati = JSON.parse(new TextDecoder().decode(chiaro)) as Partial<ContenutoConsegna>;
  if (typeof dati.token !== 'string' || typeof dati.id_proprietario !== 'number' || typeof dati.username !== 'string') {
    throw new Error('contenuto della busta non valido');
  }
  return { token: dati.token, id_proprietario: dati.id_proprietario, username: dati.username };
}
