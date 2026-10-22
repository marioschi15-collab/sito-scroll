import { describe, expect, it } from 'vitest';
import { base64url, cifraPerApp, daBase64url, decifraBusta, generaCoppiaEffimera, importaPubblica } from './crypto.js';

describe('busta cifrata (ECDH P-256 + HKDF + AES-GCM)', () => {
  it('andata e ritorno: il gestore cifra, l\'app decifra', async () => {
    const app = await generaCoppiaEffimera();
    const nonce = 'k7m2xq9p4a';
    const contenuto = { token: '1234567890:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw1', id_proprietario: 987654321, username: 'spalla_k7m2xq9p4a_bot' };
    const busta = await cifraPerApp(contenuto, app.pubblicaBase64url, nonce);
    expect(busta.v).toBe(1);
    expect(busta.cifrato).not.toContain(contenuto.token);
    expect(JSON.stringify(busta)).not.toContain('AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw1');
    const letto = await decifraBusta(busta, app.coppia.privateKey, nonce);
    expect(letto).toEqual(contenuto);
  });

  it('un nonce diverso o un\'altra chiave non decifrano', async () => {
    const app = await generaCoppiaEffimera();
    const altra = await generaCoppiaEffimera();
    const busta = await cifraPerApp({ token: 't', id_proprietario: 1, username: 'u' }, app.pubblicaBase64url, 'nonce12345');
    await expect(decifraBusta(busta, app.coppia.privateKey, 'nonce54321')).rejects.toThrow();
    await expect(decifraBusta(busta, altra.coppia.privateKey, 'nonce12345')).rejects.toThrow();
  });

  it('base64url va e torna, e rifiuta chiavi non P-256', async () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255]);
    expect(daBase64url(base64url(bytes))).toEqual(bytes);
    expect(base64url(bytes)).not.toMatch(/[+/=]/);
    await expect(importaPubblica(base64url(new Uint8Array(10)))).rejects.toThrow(/non valida/);
  });
});
