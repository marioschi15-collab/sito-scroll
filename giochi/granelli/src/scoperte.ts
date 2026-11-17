import { M, OMINO, VILLAGGIO } from './motore/materiali.js';

/** Una voce del libro delle scoperte. */
export interface Scoperta {
  id: number;
  nome: string;
  /** Mostrato finché la voce è ancora da scoprire. */
  indizio: string;
  /** Mostrato dopo la scoperta: come nasce. */
  ricetta: string;
  /** Colore del bottone nella tavolozza. */
  colore: string;
  /** Si può versare col dito una volta scoperta. */
  versabile: boolean;
}

export const INIZIALI: readonly number[] = [M.TERRA, M.ACQUA, M.FUOCO, M.ARIA];

export const SCOPERTE: readonly Scoperta[] = [
  { id: M.TERRA, nome: 'Terra', indizio: '', ricetta: 'Uno dei quattro elementi.', colore: '#8a5a3c', versabile: true },
  { id: M.ACQUA, nome: 'Acqua', indizio: '', ricetta: 'Uno dei quattro elementi.', colore: '#3f8fe0', versabile: true },
  { id: M.FUOCO, nome: 'Fuoco', indizio: '', ricetta: 'Uno dei quattro elementi.', colore: '#ff7a1a', versabile: true },
  { id: M.ARIA, nome: 'Aria', indizio: '', ricetta: 'Uno dei quattro elementi.', colore: '#cfe6f5', versabile: true },
  { id: M.VAPORE, nome: 'Vapore', indizio: 'Cosa succede se spegni un fuoco?', ricetta: 'Acqua + Fuoco', colore: '#dfe8ee', versabile: true },
  { id: M.FANGO, nome: 'Fango', indizio: 'La terra ha sete.', ricetta: 'Terra + Acqua', colore: '#5b4030', versabile: true },
  { id: M.SABBIA, nome: 'Sabbia', indizio: 'Il vento consuma la terra.', ricetta: 'Terra + Aria', colore: '#e3c98a', versabile: true },
  { id: M.LAVA, nome: 'Lava', indizio: 'Scalda la terra finché non cede.', ricetta: 'Terra + Fuoco, con insistenza', colore: '#ff4a12', versabile: true },
  { id: M.PIETRA, nome: 'Pietra', indizio: 'La lava si calma con l’acqua. O con la pazienza.', ricetta: 'Lava + Acqua (o lava che si raffredda)', colore: '#7d8590', versabile: true },
  { id: M.NUVOLA, nome: 'Nuvola', indizio: 'Il vapore sale, sale… lascialo arrivare in cielo.', ricetta: 'Vapore che arriva in alto', colore: '#f2f5f8', versabile: true },
  { id: M.FULMINE, nome: 'Fulmine', indizio: 'Fai crescere una nuvola bella grossa. E aspetta.', ricetta: 'Una nuvola grande e fitta', colore: '#fff7a8', versabile: true },
  { id: M.VETRO, nome: 'Vetro', indizio: 'Nasce dove il cielo colpisce la spiaggia.', ricetta: 'Sabbia + Fulmine (o Lava)', colore: '#a8e0e6', versabile: true },
  { id: M.ARGILLA, nome: 'Argilla', indizio: 'Il fango, asciugato dal vento.', ricetta: 'Fango + Aria', colore: '#b9745a', versabile: true },
  { id: M.MATTONE, nome: 'Mattone', indizio: 'L’argilla va cotta.', ricetta: 'Argilla + Fuoco', colore: '#b5412e', versabile: true },
  { id: M.PIANTA, nome: 'Pianta', indizio: 'Fango tranquillo, cielo aperto sopra, e un po’ di pazienza.', ricetta: 'Fango lasciato in pace sotto il cielo', colore: '#4caf50', versabile: true },
  { id: M.LEGNO, nome: 'Legno', indizio: 'Non tutte le piante si fermano all’erba.', ricetta: 'Il tronco di un albero cresciuto', colore: '#6b4a2b', versabile: true },
  { id: M.FUMO, nome: 'Fumo', indizio: 'Dove c’è fuoco…', ricetta: 'Quello che il fuoco lascia nell’aria', colore: '#6d6d75', versabile: true },
  { id: M.CENERE, nome: 'Cenere', indizio: 'Quello che resta di un bosco dopo l’incendio.', ricetta: 'Pianta o Legno + Fuoco', colore: '#a9a9a9', versabile: true },
  { id: M.HUMUS, nome: 'Terriccio', indizio: 'La cenere non è la fine: mescolala alla terra.', ricetta: 'Cenere + Terra', colore: '#3b2a1c', versabile: true },
  { id: M.NEVE, nome: 'Neve', indizio: 'Soffia aria dentro una nuvola.', ricetta: 'Nuvola + Aria', colore: '#ffffff', versabile: true },
  { id: M.GHIACCIO, nome: 'Ghiaccio', indizio: 'Neve e acqua, insieme.', ricetta: 'Neve + Acqua', colore: '#b8e4ff', versabile: true },
  { id: M.OSSIDIANA, nome: 'Ossidiana', indizio: 'La lava contro il gelo.', ricetta: 'Lava + Neve (o Ghiaccio)', colore: '#2a2238', versabile: true },
  { id: OMINO, nome: 'Omino', indizio: 'Arrivano dove c’è da bere, da mangiare e un riparo fatto da te: pietra o mattoni.', ricetta: 'Tanta acqua, tante piante e un riparo di pietra o mattoni', colore: '#f2c79b', versabile: true },
  { id: VILLAGGIO, nome: 'Villaggio', indizio: 'Sei omini vivi nello stesso momento.', ricetta: 'Sei omini vivi insieme', colore: '#ffd54a', versabile: false },
];

export const PER_ID = new Map(SCOPERTE.map((s) => [s.id, s]));
