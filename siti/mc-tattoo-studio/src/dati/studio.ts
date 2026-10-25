export interface Orario {
  giorno: string;
  orario: string;
}

export interface DatiStudio {
  /** true finché il titolare non ha confermato TUTTI i valori. Blocca la build di produzione e mostra la fascia "Dati di prova". */
  datiDiProva: boolean;
  nome: string;
  marchio: string;
  sottomarchio: string;
  slogan: string;
  citta: string;
  indirizzo: { via: string; cap: string; citta: string; provincia: string };
  telefono: { leggibile: string; tel: string };
  /** Solo cifre, prefisso internazionale senza +: è il formato di wa.me. */
  whatsapp: string;
  email: string;
  instagram: { utente: string; url: string };
  orari: readonly Orario[];
  partitaIva: string;
  /** Si legge dopo "Ti rispondiamo di persona, …". */
  tempoRisposta: string;
  /** Si legge dopo "avvisaci almeno …". */
  preavvisoSpostamento: string;
  /** null = non mostrato. Esempio di valore vero: '60 €'. */
  prezzoMinimo: string | null;
  urlSito: string;
}

export const studio: DatiStudio = {
  datiDiProva: true,
  nome: 'M.C. Tattoo Studio',
  marchio: 'M.C.',
  sottomarchio: 'Tattoo Studio',
  slogan: 'Tatuaggi disegnati su misura, con calma e cura.',
  citta: 'Città di prova',
  indirizzo: { via: 'Via Esempio 1', cap: '00000', citta: 'Città di prova', provincia: 'XX' },
  telefono: { leggibile: '+39 000 000 0000', tel: '+390000000000' },
  whatsapp: '390000000000',
  email: 'studio@example.com',
  instagram: { utente: 'profilo_di_prova', url: 'https://www.instagram.com/' },
  orari: [
    { giorno: 'Lunedì', orario: 'Chiuso' },
    { giorno: 'Martedì – Venerdì', orario: '10:00 – 19:00' },
    { giorno: 'Sabato', orario: '10:00 – 18:00' },
    { giorno: 'Domenica', orario: 'Chiuso' },
  ],
  partitaIva: '00000000000',
  tempoRisposta: 'entro 2 giorni lavorativi',
  preavvisoSpostamento: '48 ore',
  prezzoMinimo: null,
  urlSito: 'https://example.com',
};

export const indirizzoCompleto = `${studio.indirizzo.via}, ${studio.indirizzo.cap} ${studio.indirizzo.citta} (${studio.indirizzo.provincia})`;

export const urlMappa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${studio.indirizzo.via}, ${studio.indirizzo.cap} ${studio.indirizzo.citta}`,
)}`;

export const MESSAGGIO_RAPIDO = `Ciao ${studio.nome}, vorrei qualche informazione per un tatuaggio.`;

export const urlWhatsAppRapido = `https://wa.me/${studio.whatsapp}?text=${encodeURIComponent(MESSAGGIO_RAPIDO)}`;
