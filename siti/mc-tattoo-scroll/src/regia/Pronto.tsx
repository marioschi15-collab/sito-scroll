// src/regia/Pronto.tsx — dice alle scene quando il sipario d'apertura si è alzato.
import { createContext, useContext } from 'react';

export const ContestoPronto = createContext(true);
export const usePronto = (): boolean => useContext(ContestoPronto);
