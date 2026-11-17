import { M, OMINO, VILLAGGIO } from './motore/materiali.js';

/** Una voce del libro delle scoperte. */
export interface Scoperta {
  id: number;
  nome: string;
  /** Mostrato finché la voce è ancora da scoprire. */
  indizio: string;
  /** Mostrato dopo la scoperta: come nasce. */
  ricetta: string;
  /** Si può versare col dito una volta scoperta. */
  versabile: boolean;
}

export const INIZIALI: readonly number[] = [M.TERRA, M.ACQUA, M.FUOCO, M.ARIA];

export const SCOPERTE: readonly Scoperta[] = [
  { id: M.TERRA, nome: 'Terra', indizio: '', ricetta: 'Uno dei quattro elementi.', versabile: true },
  { id: M.ACQUA, nome: 'Acqua', indizio: '', ricetta: 'Uno dei quattro elementi.', versabile: true },
  { id: M.FUOCO, nome: 'Fuoco', indizio: '', ricetta: 'Uno dei quattro elementi.', versabile: true },
  { id: M.ARIA, nome: 'Aria', indizio: '', ricetta: 'Uno dei quattro elementi.', versabile: true },
  { id: M.VAPORE, nome: 'Vapore', indizio: 'Cosa succede se spegni un fuoco?', ricetta: 'Acqua + Fuoco', versabile: true },
  { id: M.FANGO, nome: 'Fango', indizio: 'La terra ha sete.', ricetta: 'Terra + Acqua', versabile: true },
  { id: M.SABBIA, nome: 'Sabbia', indizio: 'Il vento consuma la terra.', ricetta: 'Terra + Aria', versabile: true },
  { id: M.LAVA, nome: 'Lava', indizio: 'Scalda la terra finché non cede.', ricetta: 'Terra + Fuoco, con insistenza', versabile: true },
  { id: M.PIETRA, nome: 'Pietra', indizio: 'La lava si calma con l’acqua. O con la pazienza.', ricetta: 'Lava + Acqua (o lava che si raffredda)', versabile: true },
  { id: M.NUVOLA, nome: 'Nuvola', indizio: 'Il vapore sale, sale… lascialo arrivare in cielo.', ricetta: 'Vapore che arriva in alto', versabile: true },
  { id: M.FULMINE, nome: 'Fulmine', indizio: 'Fai crescere una nuvola bella grossa. E aspetta.', ricetta: 'Una nuvola grande e fitta', versabile: true },
  { id: M.VETRO, nome: 'Vetro', indizio: 'Nasce dove il cielo colpisce la spiaggia.', ricetta: 'Sabbia + Fulmine (o Lava)', versabile: true },
  { id: M.ARGILLA, nome: 'Argilla', indizio: 'Il fango, asciugato dal vento.', ricetta: 'Fango + Aria', versabile: true },
  { id: M.MATTONE, nome: 'Mattone', indizio: 'L’argilla va cotta.', ricetta: 'Argilla + Fuoco', versabile: true },
  { id: M.PIANTA, nome: 'Pianta', indizio: 'Fango tranquillo, cielo aperto sopra, e un po’ di pazienza.', ricetta: 'Fango lasciato in pace sotto il cielo', versabile: true },
  { id: M.LEGNO, nome: 'Legno', indizio: 'Non tutte le piante si fermano all’erba.', ricetta: 'Il tronco di un albero cresciuto', versabile: true },
  { id: M.FUMO, nome: 'Fumo', indizio: 'Dove c’è fuoco…', ricetta: 'Quello che il fuoco lascia nell’aria', versabile: true },
  { id: M.CENERE, nome: 'Cenere', indizio: 'Quello che resta di un bosco dopo l’incendio.', ricetta: 'Pianta o Legno + Fuoco', versabile: true },
  { id: M.HUMUS, nome: 'Terriccio', indizio: 'La cenere non è la fine: mescolala alla terra.', ricetta: 'Cenere + Terra', versabile: true },
  { id: M.NEVE, nome: 'Neve', indizio: 'Soffia aria dentro una nuvola.', ricetta: 'Nuvola + Aria', versabile: true },
  { id: M.GHIACCIO, nome: 'Ghiaccio', indizio: 'Neve e acqua, insieme.', ricetta: 'Neve + Acqua', versabile: true },
  { id: M.OSSIDIANA, nome: 'Ossidiana', indizio: 'La lava contro il gelo.', ricetta: 'Lava + Neve (o Ghiaccio)', versabile: true },
  { id: OMINO, nome: 'Omino', indizio: 'Arrivano dove c’è da bere, da mangiare e un riparo fatto da te: pietra o mattoni.', ricetta: 'Tanta acqua, tante piante e un riparo di pietra o mattoni', versabile: true },
  { id: VILLAGGIO, nome: 'Villaggio', indizio: 'Sei omini vivi nello stesso momento.', ricetta: 'Sei omini vivi insieme', versabile: false },
];

export const PER_ID = new Map(SCOPERTE.map((s) => [s.id, s]));
