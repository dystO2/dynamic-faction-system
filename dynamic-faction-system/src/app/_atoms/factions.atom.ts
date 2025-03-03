import { useAtom, useAtomValue, useSetAtom } from "jotai/react";
import { atomWithReset, useResetAtom } from "jotai/utils";

export interface Faction {
  name: string;

  // set by user
  aggression: number;
  influence: number;
  wealth: number;
  tech: number;
  endurance: number;

  // fixed by game
  manpower: number;
  resources: number;

  // relations
  playerTrust: number;
  playerRivalry: number;
  factionTrust: number;
  factionRivalry: number;
}

type FactionsAtom = {
  factionOne: Faction;
  factionTwo: Faction;
};

const defaultFactionsAtom: FactionsAtom = {
  factionOne: {
    name: "",
    aggression: 1,
    influence: 1,
    wealth: 1,
    tech: 1,
    endurance: 1,
    manpower: 1,
    resources: 1,
    playerTrust: 0.5,
    playerRivalry: 0.5,
    factionTrust: 0.5,
    factionRivalry: 0.5,
  },
  factionTwo: {
    name: "",
    aggression: 1,
    influence: 1,
    wealth: 1,
    tech: 1,
    endurance: 1,
    manpower: 1,
    resources: 1,
    playerTrust: 0.5,
    playerRivalry: 0.5,
    factionTrust: 0.5,
    factionRivalry: 0.5,
  },
};

const factionsAtom = atomWithReset<FactionsAtom>(defaultFactionsAtom);

export const useFactionsAtom = () => useAtom(factionsAtom);
export const useFactionsAtomValue = () => useAtomValue(factionsAtom);
export const useFactionsSetAtom = () => useSetAtom(factionsAtom);
export const useFactionsResetAtom = () => useResetAtom(factionsAtom);
