// src/dati/studio.ts — tutti i dati dello studio in un solo posto.
// ATTENZIONE: indirizzo, telefono, WhatsApp, email, Instagram, orari e partita IVA sono SEGNAPOSTO.
// Prima di pubblicare vanno sostituiti con quelli veri e `datiDiProva` va messo a false.

export interface Orario {
  giorno: string;
  orario: string;
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
} as const;

export const indirizzoCompleto = `${studio.indirizzo.via}, ${studio.indirizzo.cap} ${studio.indirizzo.citta} (${studio.indirizzo.provincia})`;

export const urlMappa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${studio.indirizzo.via}, ${studio.indirizzo.cap} ${studio.indirizzo.citta}`,
)}`;

const MESSAGGIO = `Ciao ${studio.nome}, vorrei prenotare una consulenza per un tatuaggio.`;
export const urlWhatsApp = `https://wa.me/${studio.whatsapp}?text=${encodeURIComponent(MESSAGGIO)}`;
export const urlEmail = `mailto:${studio.email}?subject=${encodeURIComponent('Consulenza per un tatuaggio')}`;
