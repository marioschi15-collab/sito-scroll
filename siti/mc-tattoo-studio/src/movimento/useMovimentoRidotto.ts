// src/movimento/useMovimentoRidotto.ts — la preferenza "riduci il movimento" della persona.
// Serve dove MotionConfig reducedMotion="user" non arriva: pathLength, opacità, valori legati allo
// scorrimento, cicli infiniti e scelte tra componenti diversi.
import { useReducedMotion } from 'motion/react';

export function useMovimentoRidotto(): boolean {
  return useReducedMotion() ?? false;
}
