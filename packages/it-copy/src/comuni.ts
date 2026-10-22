/** Parole e pulsanti usati ovunque. Niente gergo tecnico: mai "agente", "prompt", "token", "MCP", "API" (salvo la schermata della chiave). */
const FEMMINILI = new Set(['Segretaria']);

function iniziaPerVocale(parola: string): boolean {
  return /^[aeiouàèéìòù]/i.test(parola);
}

export const comuni = {
  nomeProdotto: 'Spalla',
  poweredBy: 'Spalla funziona con Claude Code di Anthropic, con il tuo account.',
  pulsanti: {
    si: 'Sì',
    no: 'No',
    siFallo: 'Sì, fallo',
    continua: 'Continua',
    indietro: 'Indietro',
    annulla: 'Annulla',
    dopo: 'Dopo',
    riprova: 'Riprova',
    fatto: 'Fatto',
    cambia: 'Cambia',
    salva: 'Salva',
    chiudi: 'Chiudi',
    copia: 'Copia',
    copiato: 'Copiato.',
    apriImpostazioni: 'Apri le impostazioni',
  },
  /** Etichette dei ruoli come le vede l'utente (chiave = nome del file del ruolo). */
  ruoli: {
    segretaria: 'Segretaria',
    copywriter: 'Copywriter',
    contabile: 'Contabile',
    'cercatore-clienti': 'Cercatore clienti',
    analista: 'Analista',
    critico: 'Critico',
    preventivista: 'Preventivista',
    archivista: 'Archivista',
  } as Record<string, string>,
  /** Come chiamiamo chi agisce nelle conferme: "L'assistente", "La Segretaria", "L'Analista", "Il ruolo «fornitori»". */
  chiAgisce: {
    assistente: "L'assistente",
    ruolo: (etichetta: string): string => {
      if (iniziaPerVocale(etichetta)) return `L'${etichetta}`;
      return `${FEMMINILI.has(etichetta) ? 'La' : 'Il'} ${etichetta}`;
    },
    /** Un ruolo creato dall'utente, fuori dal catalogo. */
    ruoloGenerico: (nome: string): string => `Il ruolo «${nome}»`,
    /** Complemento: "alla Segretaria", "al Copywriter", "all'Analista". */
    a: (etichetta: string): string => {
      if (iniziaPerVocale(etichetta)) return `all'${etichetta}`;
      return `${FEMMINILI.has(etichetta) ? 'alla' : 'al'} ${etichetta}`;
    },
  },
  canali: { desktop: 'computer', telegram: 'Telegram', voce: 'voce', sistema: 'sistema' },
  livelliCervello: {
    economico: { etichetta: 'Economico', nota: 'più veloce e meno costoso, meno accurato' },
    equilibrato: { etichetta: 'Equilibrato', nota: 'consigliato' },
    massima: { etichetta: 'Massima', nota: 'costa circa il doppio' },
  },
  tempo: {
    adesso: 'adesso',
    minuti: (n: number): string => (n === 1 ? '1 minuto' : `${n} minuti`),
    secondi: (n: number): string => (n === 1 ? '1 secondo' : `${n} secondi`),
    giorni: (n: number): string => (n === 1 ? '1 giorno' : `${n} giorni`),
  },
} as const;
