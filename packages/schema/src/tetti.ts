/** Tetti della memoria imposti dall'hook PostToolUse (docs/03 §6). */
export const TETTI_MEMORIA = {
  UTENTE_CARATTERI: 4000,
  ANIMA_CARATTERI: 2500,
  MEMORIA_RIGHE: 200,
  MEMORIA_BYTE: 25 * 1024,
  SCHEDA_RIGHE: 300,
  AGENDA_RIGHE: 100,
  CLAUDE_MD_RIGHE: 150,
  SQUADRA_RIGHE: 40,
  IDENTITA_RIGHE: 20,
} as const;

/**
 * Cambio dollari → euro per mostrare le spese (l'SDK conta in dollari). Unico valore per Nucleo e finestra.
 * Indicativo: la fattura vera la fa Anthropic sulla chiave dell'utente.
 */
export const CAMBIO_USD_EUR = 0.92;
