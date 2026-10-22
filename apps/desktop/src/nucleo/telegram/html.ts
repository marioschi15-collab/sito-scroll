/** Limite di Telegram per il testo di un messaggio. */
export const MAX_MESSAGGIO = 4096;

/** In modalità HTML di Telegram vanno scappati solo questi tre caratteri. */
export function escapaHtml(testo: string): string {
  return testo.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Spezza un testo in pezzi ≤ `max` preferendo i confini di paragrafo (riga vuota), poi di riga, poi di parola;
 * l'ultimo ricorso è un taglio secco che però non cade dentro un tag o un'entità HTML.
 */
export function spezzaTesto(testo: string, max = MAX_MESSAGGIO): string[] {
  const pulito = testo.trim();
  if (pulito.length === 0) return [];
  if (pulito.length <= max) return [pulito];

  const pezzi: string[] = [];
  let resto = pulito;
  while (resto.length > max) {
    const taglio = puntoDiTaglio(resto, max);
    pezzi.push(resto.slice(0, taglio).trimEnd());
    resto = resto.slice(taglio).trimStart();
  }
  if (resto.length > 0) pezzi.push(resto);
  return pezzi;
}

function puntoDiTaglio(testo: string, max: number): number {
  const finestra = testo.slice(0, max + 1);
  // Preferenze in ordine: riga vuota, a capo, spazio. Il taglio deve lasciare almeno un terzo del pezzo.
  const minimo = Math.floor(max / 3);
  for (const separatore of ['\n\n', '\n', ' ']) {
    const posizione = finestra.lastIndexOf(separatore, max);
    if (posizione >= minimo) return posizione + (separatore === ' ' ? 0 : separatore.length);
  }
  return tagliaFuoriDaiTag(testo, max);
}

/** Arretra finché il taglio non è dentro `<...>` o `&...;`. */
function tagliaFuoriDaiTag(testo: string, posizione: number): number {
  let p = posizione;
  while (p > 0) {
    const apertura = testo.lastIndexOf('<', p - 1);
    const chiusura = testo.lastIndexOf('>', p - 1);
    const dentroTag = apertura > chiusura;
    const eCommerciale = testo.lastIndexOf('&', p - 1);
    const puntoEVirgola = testo.lastIndexOf(';', p - 1);
    const dentroEntita = eCommerciale > puntoEVirgola && p - eCommerciale <= 8;
    if (!dentroTag && !dentroEntita) return p;
    p = Math.min(dentroTag ? apertura : p, dentroEntita ? eCommerciale : p);
  }
  return posizione;
}

interface Blocco {
  tipo: 'testo' | 'codice';
  contenuto: string;
  linguaggio?: string;
}

/** Separa i blocchi di codice recintati (```): dentro non si formatta nulla. */
function aBlocchi(markdown: string): Blocco[] {
  const blocchi: Blocco[] = [];
  const righe = markdown.replace(/\r\n/g, '\n').split('\n');
  let testo: string[] = [];
  let codice: string[] | undefined;
  let linguaggio = '';
  for (const riga of righe) {
    const recinto = /^\s*```\s*([\w+-]*)\s*$/.exec(riga);
    if (recinto) {
      if (codice === undefined) {
        if (testo.length) blocchi.push({ tipo: 'testo', contenuto: testo.join('\n') });
        testo = [];
        codice = [];
        linguaggio = recinto[1] ?? '';
      } else {
        blocchi.push({ tipo: 'codice', contenuto: codice.join('\n'), linguaggio });
        codice = undefined;
      }
      continue;
    }
    if (codice !== undefined) codice.push(riga);
    else testo.push(riga);
  }
  if (codice !== undefined) blocchi.push({ tipo: 'codice', contenuto: codice.join('\n'), linguaggio });
  if (testo.length) blocchi.push({ tipo: 'testo', contenuto: testo.join('\n') });
  return blocchi;
}

function formattaRigaInline(riga: string): string {
  // 1) codice inline messo al sicuro con segnaposto
  const codici: string[] = [];
  let s = riga.replace(/`([^`\n]+)`/g, (_, c: string) => {
    codici.push(`<code>${c}</code>`);
    return `\u0000${codici.length - 1}\u0000`;
  });
  // 2) link, grassetto, corsivo, barrato
  s = s.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, t: string, u: string) => `<a href="${u.replace(/"/g, '&quot;')}">${t}</a>`);
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
  s = s.replace(/__([^_\n]+)__/g, '<b>$1</b>');
  s = s.replace(/(^|[^\w*])\*([^*\n]+)\*(?=[^\w*]|$)/g, '$1<i>$2</i>');
  s = s.replace(/(^|[^\w_])_([^_\n]+)_(?=[^\w_]|$)/g, '$1<i>$2</i>');
  s = s.replace(/~~([^~\n]+)~~/g, '<s>$1</s>');
  // 3) ripristino del codice inline
  return s.replace(/\u0000(\d+)\u0000/g, (_, i: string) => codici[Number(i)] ?? '');
}

function formattaBloccoTesto(contenuto: string): string {
  return escapaHtml(contenuto)
    .split('\n')
    .map((riga) => {
      const titolo = /^\s*#{1,6}\s+(.*)$/.exec(riga);
      if (titolo) return `<b>${formattaRigaInline(titolo[1] ?? '')}</b>`;
      const elenco = /^(\s*)[-*]\s+(.*)$/.exec(riga);
      if (elenco) return `${elenco[1] ?? ''}• ${formattaRigaInline(elenco[2] ?? '')}`;
      const citazione = /^\s*&gt;\s?(.*)$/.exec(riga);
      if (citazione) return `<i>${formattaRigaInline(citazione[1] ?? '')}</i>`;
      return formattaRigaInline(riga);
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Markdown leggero (quello che scrive l'assistente) → HTML di Telegram: grassetto, corsivo, codice, link, elenchi
 * con il punto, titoli in grassetto. Niente tabelle (le regole per canale già le vietano).
 */
export function markdownAHtmlTelegram(markdown: string): string {
  return aBlocchi(markdown)
    .map((b) => {
      if (b.tipo === 'codice') {
        const classe = b.linguaggio ? ` class="language-${b.linguaggio}"` : '';
        return `<pre><code${classe}>${escapaHtml(b.contenuto)}</code></pre>`;
      }
      return formattaBloccoTesto(b.contenuto);
    })
    .filter((s) => s.length > 0)
    .join('\n\n');
}

/**
 * Testo dell'assistente → messaggi Telegram in HTML, ciascuno ≤ 4096 caratteri. I blocchi `<pre>` troppo lunghi
 * vengono richiusi e riaperti a ogni taglio, così ogni pezzo è HTML valido.
 */
export function preparaMessaggi(markdown: string, max = MAX_MESSAGGIO): string[] {
  const html = markdownAHtmlTelegram(markdown);
  if (html.length <= max) return html.length > 0 ? [html] : [];
  const pezzi: string[] = [];
  for (const pezzo of spezzaTesto(html, max)) pezzi.push(...bilanciaPre(pezzo));
  return pezzi;
}

/** Se un pezzo apre `<pre>` senza chiuderlo (o viceversa), completa i tag. */
function bilanciaPre(pezzo: string): string[] {
  const aperture = (pezzo.match(/<pre>/g) ?? []).length;
  const chiusure = (pezzo.match(/<\/pre>/g) ?? []).length;
  let s = pezzo;
  if (chiusure > aperture) s = `<pre>${s}`;
  if (aperture > chiusure) s = `${s}</pre>`;
  // `<code ...>` dentro `<pre>`: lo stesso bilanciamento
  const apCode = (s.match(/<code[^>]*>/g) ?? []).length;
  const chCode = (s.match(/<\/code>/g) ?? []).length;
  if (chCode > apCode) s = s.replace(/^<pre>/, '<pre><code>');
  if (apCode > chCode) s = s.replace(/<\/pre>$/, '</code></pre>');
  return [s];
}

/** Numero di pezzi oltre il quale la risposta si manda anche come documento .md (docs/02 §8.4). */
export const PEZZI_PER_DOCUMENTO = 3;
