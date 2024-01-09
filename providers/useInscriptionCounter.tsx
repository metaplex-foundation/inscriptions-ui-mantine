import { createContext, useContext } from 'react';

export type InscriptionCounterContext = {
  count: number
};

const DEFAULT_CONTEXT: InscriptionCounterContext = {
  count: 0,
};

export const InscriptionCounterContext = createContext<InscriptionCounterContext>(DEFAULT_CONTEXT);

export function useInscriptionCounter(): InscriptionCounterContext {
  return useContext(InscriptionCounterContext);
}
