// src/dati/studio.ts — tutti i dati dello studio in un solo posto.
// ATTENZIONE: indirizzo, telefono, WhatsApp, email, Instagram, orari e partita IVA sono SEGNAPOSTO.
// Prima di pubblicare vanno sostituiti con quelli veri e `datiDiProva` va messo a false.

export interface Orario {
  giorno: string;
  orario: string;
}

export interface Recensione {
  testo: string;
  nome: string;
}

export const studio = {
  /** true finché i dati non sono confermati: nel piè di pagina compare un avviso discreto. */
  datiDiProva: true,
  nome: 'M.C. Tattoo Studio',
  marchio: 'M.C.',
  sottomarchio: 'Tattoo Studio',
  indirizzo: { via: 'Via Esempio 1', cap: '00000', citta: 'Città di prova', provincia: 'XX' },
  telefono: { leggibile: '+39 000 000 0000', tel: '+390000000000' },
  /** Solo cifre, con il prefisso internazionale senza +: è il formato di wa.me. */
  whatsapp: '390000000000',
  email: 'studio@example.com',
  instagram: { utente: 'profilo_di_prova', url: 'https://www.instagram.com/' },
  orari: [
    { giorno: 'Martedì – Venerdì', orario: '10:00 – 19:00' },
    { giorno: 'Sabato', orario: '10:00 – 18:00' },
    { giorno: 'Domenica e lunedì', orario: 'Chiuso' },
  ] as readonly Orario[],
  partitaIva: '00000000000',

  /**
   * Le promesse che il sito ripete vicino ai pulsanti. DA FAR CONFERMARE AL TITOLARE: devono essere
   * vere. Se una non vale, va tolta da qui (e va corretta la risposta ai dubbi in scene/Dubbi.tsx).
   */
  promesse: ['Consulenza senza impegno', 'Preventivo prima di iniziare', 'Materiale monouso', 'Solo su appuntamento'] as readonly string[],

  /**
   * Prima data libera in agenda, scritta come la si direbbe a voce (es. 'metà dicembre').
   * null = non mostrata. Va tenuta aggiornata: una data falsa fa perdere fiducia.
   */
  primaDataLibera: null as string | null,

  /**
   * Recensioni VERE di clienti (con il loro permesso). Finché la lista è vuota la sezione non compare.
   * Esempio: { testo: 'Mi hanno ascoltata e il disegno è venuto meglio di come lo immaginavo.', nome: 'Giulia' }
   */
  recensioni: [] as readonly Recensione[],
} as const;

export const indirizzoCompleto = `${studio.indirizzo.via}, ${studio.indirizzo.cap} ${studio.indirizzo.citta} (${studio.indirizzo.provincia})`;

export const urlMappa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${studio.indirizzo.via}, ${studio.indirizzo.cap} ${studio.indirizzo.citta}`,
)}`;

/** Collegamento che apre WhatsApp con un messaggio già scritto. */
export const urlWhatsAppCon = (messaggio: string): string => `https://wa.me/${studio.whatsapp}?text=${encodeURIComponent(messaggio)}`;

export const urlWhatsApp = urlWhatsAppCon(`Ciao ${studio.nome}, vorrei prenotare una consulenza per un tatuaggio.`);
export const urlEmail = `mailto:${studio.email}?subject=${encodeURIComponent('Consulenza per un tatuaggio')}`;
