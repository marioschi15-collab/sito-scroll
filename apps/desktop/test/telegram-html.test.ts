import { describe, expect, it } from 'vitest';
import { escapaHtml, markdownAHtmlTelegram, MAX_MESSAGGIO, preparaMessaggi, spezzaTesto } from '../src/nucleo/telegram/html.js';

describe('escapaHtml', () => {
  it('scappa solo & < >', () => {
    expect(escapaHtml('a & b < c > d "e" \'f\'')).toBe('a &amp; b &lt; c &gt; d "e" \'f\'');
  });
});

describe('spezzaTesto a 4096', () => {
  const paragrafo = (lettera: string, n: number) => lettera.repeat(n);

  it('non tocca un testo corto', () => {
    expect(spezzaTesto('ciao')).toEqual(['ciao']);
    expect(spezzaTesto('   ')).toEqual([]);
  });

  it('taglia sui paragrafi, mai dentro', () => {
    const paragrafi = [paragrafo('a', 1500), paragrafo('b', 1500), paragrafo('c', 1500), paragrafo('d', 1500)];
    const pezzi = spezzaTesto(paragrafi.join('\n\n'));
    expect(pezzi.length).toBe(2);
    for (const p of pezzi) expect(p.length).toBeLessThanOrEqual(MAX_MESSAGGIO);
    expect(pezzi[0]).toBe(`${paragrafi[0]}\n\n${paragrafi[1]}`);
    expect(pezzi[1]).toBe(`${paragrafi[2]}\n\n${paragrafi[3]}`);
  });

  it('se un paragrafo è troppo lungo, taglia sulle righe e poi sugli spazi', () => {
    const righe = Array.from({ length: 60 }, (_, i) => `riga ${i} ${'x'.repeat(90)}`);
    const pezzi = spezzaTesto(righe.join('\n'), 1000);
    expect(pezzi.length).toBeGreaterThan(5);
    for (const p of pezzi) {
      expect(p.length).toBeLessThanOrEqual(1000);
      expect(p.startsWith('riga ')).toBe(true);
    }
    expect(pezzi.join('\n')).toBe(righe.join('\n'));
  });

  it('un testo senza separatori viene tagliato secco ma mai dentro un\'entità HTML', () => {
    const testo = `${'a'.repeat(4094)}&amp;${'b'.repeat(100)}`;
    const pezzi = spezzaTesto(testo);
    expect(pezzi.length).toBe(2);
    expect(pezzi[0]?.endsWith('&amp;') || pezzi[0]?.endsWith('a')).toBe(true);
    expect(pezzi[0]).not.toMatch(/&a?m?p?$/);
    expect(pezzi.join('')).toBe(testo);
  });

  it('non taglia dentro un tag', () => {
    const testo = `${'a'.repeat(4090)}<b>grassetto</b>${'c'.repeat(50)}`;
    const pezzi = spezzaTesto(testo);
    expect(pezzi[0]).not.toMatch(/<[^>]*$/);
  });
});

describe('markdownAHtmlTelegram', () => {
  it('converte grassetto, corsivo, codice, link, elenchi e titoli', () => {
    const html = markdownAHtmlTelegram('# Titolo\n\nCiao **Marco** & <tutti>, ecco `a<b` e *corsivo* e _altro_ [sito](https://esempio.it/x?a=1&b=2).\n\n- uno\n- due\n1. tre');
    expect(html).toContain('<b>Titolo</b>');
    expect(html).toContain('<b>Marco</b> &amp; &lt;tutti&gt;');
    expect(html).toContain('<code>a&lt;b</code>');
    expect(html).toContain('<i>corsivo</i>');
    expect(html).toContain('<i>altro</i>');
    expect(html).toContain('<a href="https://esempio.it/x?a=1&amp;b=2">sito</a>');
    expect(html).toContain('• uno\n• due\n1. tre');
  });

  it('lascia in pace underscore e asterischi dentro le parole', () => {
    expect(markdownAHtmlTelegram('file_nome_lungo.md e 2*3*4')).toBe('file_nome_lungo.md e 2*3*4');
  });

  it('i blocchi di codice non vengono formattati e sono scappati', () => {
    const html = markdownAHtmlTelegram('Ecco:\n```js\nconst a = **b** < 3 && x\n```\nfine');
    expect(html).toBe('Ecco:\n\n<pre><code class="language-js">const a = **b** &lt; 3 &amp;&amp; x</code></pre>\n\nfine');
  });
});

describe('preparaMessaggi', () => {
  it('un testo lungo con blocchi di codice produce pezzi ≤ 4096 con i tag bilanciati', () => {
    const codice = Array.from({ length: 300 }, (_, i) => `riga di codice numero ${i} con un po' di testo`).join('\n');
    const pezzi = preparaMessaggi(`Intro\n\n\`\`\`\n${codice}\n\`\`\`\n\nFine`);
    expect(pezzi.length).toBeGreaterThan(2);
    for (const p of pezzi) {
      expect(p.length).toBeLessThanOrEqual(MAX_MESSAGGIO);
      expect((p.match(/<pre>/g) ?? []).length).toBe((p.match(/<\/pre>/g) ?? []).length);
      expect((p.match(/<code[^>]*>/g) ?? []).length).toBe((p.match(/<\/code>/g) ?? []).length);
    }
  });

  it('un testo vuoto non produce messaggi', () => {
    expect(preparaMessaggi('')).toEqual([]);
  });
});
