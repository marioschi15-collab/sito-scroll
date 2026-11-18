/**
 * Il posto dove la partita resta quando si chiude la pagina. Oggi è lo spazio del browser (localStorage); domani
 * potrà essere anche un altro (un codice da portare via, l'aggancio di chi ospita la pagina): chi salva parla solo
 * con questa interfaccia e non sa dove finiscono i dati.
 *
 * Il browser può vietare di salvare (un riquadro chiuso dentro un'altra pagina, la navigazione privata di certi
 * telefoni) oppure finire lo spazio. Allora nessuno si rompe: il deposito lo dice (`salvabile` falso) e tiene i
 * dati in memoria finché la pagina resta aperta.
 */
export interface Deposito {
  /** Vero se quello che si scrive resta anche dopo aver chiuso la pagina: falso dopo una scrittura fallita. */
  readonly salvabile: boolean;
  /** Il testo scritto con quella chiave; null se non c'è o non si riesce a leggerlo. */
  leggi(chiave: string): string | null;
  /** Scrive il testo; falso se non ci è riuscito (spazio finito, salvataggio vietato). */
  scrivi(chiave: string, testo: string): boolean;
}

/** Il pezzo di localStorage che serve al deposito: così le prove possono passargliene uno finto. */
export interface Spazio {
  getItem(chiave: string): string | null;
  setItem(chiave: string, testo: string): void;
  removeItem(chiave: string): void;
}

/** La chiave con cui il deposito controlla, all'avvio, di poter scrivere e rileggere. */
const PROVA = 'granelli-prova';

/** Un deposito che ricorda solo finché la pagina è aperta. */
export function depositoInMemoria(): Deposito {
  const dati = new Map<string, string>();
  return {
    salvabile: false,
    leggi: (chiave) => dati.get(chiave) ?? null,
    scrivi: (chiave, testo) => {
      dati.set(chiave, testo);
      return true;
    },
  };
}

/**
 * Apre il deposito del browser. `spazio` dà lo spazio dove scrivere: può anche lanciare un errore (in un riquadro
 * chiuso basta chiedere `localStorage` per averne uno). All'avvio prova a scrivere e a rileggere una chiave di
 * prova: se non torna uguale, il deposito non è salvabile e da lì lavora in memoria.
 */
export function apriDeposito(spazio: () => Spazio = () => localStorage): Deposito {
  let posto: Spazio;
  try {
    posto = spazio();
    const segno = String(Date.now());
    posto.setItem(PROVA, segno);
    const riletto = posto.getItem(PROVA);
    posto.removeItem(PROVA);
    if (riletto !== segno) return depositoInMemoria();
  } catch {
    return depositoInMemoria();
  }
  // Se più avanti una scrittura fallisce (lo spazio è finito), quello che non è stato scritto resta in memoria:
  // chi rilegge nella stessa pagina trova l'ultima versione, e il gioco può dire che la partita non resta salvata.
  const nonScritti = new Map<string, string>();
  let salvabile = true;
  return {
    get salvabile() {
      return salvabile;
    },
    leggi(chiave) {
      const inMemoria = nonScritti.get(chiave);
      if (inMemoria !== undefined) return inMemoria;
      try {
        return posto.getItem(chiave);
      } catch {
        return null;
      }
    },
    scrivi(chiave, testo) {
      try {
        posto.setItem(chiave, testo);
        nonScritti.delete(chiave);
        salvabile = true;
        return true;
      } catch {
        salvabile = false;
        nonScritti.set(chiave, testo);
        return false;
      }
    },
  };
}
