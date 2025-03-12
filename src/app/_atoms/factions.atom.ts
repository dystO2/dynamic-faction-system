import { useAtom, useAtomValue, useSetAtom } from "jotai/react";
import { atomWithReset, useResetAtom } from "jotai/utils";

export interface Faction {
  id: string;
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

  // relations - maps of relationship values with other factions and player
  // Using a Record with faction IDs as keys
  trustTowards: Record<string, number>; // includes a special "player" key for player trust
  rivalryWith: Record<string, number>; // includes a special "player" key for player rivalry
}

// Store factions in a Record/map with faction IDs as keys
export interface FactionsState {
  factions: Record<string, Faction>;
  // Optional additional state
  activeFactionId?: string;
}

// Default starting factions - we'll provide two, but the system can handle any number
const defaultFactionsState: FactionsState = {
  factions: {
    "faction-1": {
      id: "faction-1",
      name: "Faction 1",
      aggression: 1,
      influence: 1,
      wealth: 1,
      tech: 1,
      endurance: 1,
      manpower: 1,
      resources: 1,
      trustTowards: { "faction-2": 0.5, player: 0.5 },
      rivalryWith: { "faction-2": 0.5, player: 0.5 },
    },
    "faction-2": {
      id: "faction-2",
      name: "Faction 2",
      aggression: 1,
      influence: 1,
      wealth: 1,
      tech: 1,
      endurance: 1,
      manpower: 1,
      resources: 1,
      trustTowards: { "faction-1": 0.5, player: 0.5 },
      rivalryWith: { "faction-1": 0.5, player: 0.5 },
    },
  },
};

// Create the atom
const factionsAtom = atomWithReset<FactionsState>(defaultFactionsState);

// Hooks for accessing and manipulating the factions
export const useFactionsAtom = () => useAtom(factionsAtom);
export const useFactionsAtomValue = () => useAtomValue(factionsAtom);
export const useFactionsSetAtom = () => useSetAtom(factionsAtom);
export const useFactionsResetAtom = () => useResetAtom(factionsAtom);

// Utility function to add a new faction
export const createNewFaction = (
  name: string,
  existingFactions: Record<string, Faction>,
): Faction => {
  const newId = `faction-${Object.keys(existingFactions).length + 1}`;

  // Initialize trust and rivalry towards all existing factions
  const trustTowards: Record<string, number> = { player: 0.5 };
  const rivalryWith: Record<string, number> = { player: 0.5 };

  Object.keys(existingFactions).forEach((factionId) => {
    trustTowards[factionId] = 0.5;
    rivalryWith[factionId] = 0.5;
  });

  return {
    id: newId,
    name,
    aggression: 1,
    influence: 1,
    wealth: 1,
    tech: 1,
    endurance: 1,
    manpower: 1,
    resources: 1,
    trustTowards,
    rivalryWith,
  };
};

// Helper function to update relationships when adding a new faction
export const updateRelationshipsForNewFaction = (
  factions: Record<string, Faction>,
  newFactionId: string,
): Record<string, Faction> => {
  const updatedFactions = { ...factions };

  // Add the new faction to all existing factions' relationship maps
  Object.keys(updatedFactions).forEach((factionId) => {
    if (factionId !== newFactionId) {
      updatedFactions[factionId] = {
        ...updatedFactions[factionId]!,
        trustTowards: {
          ...updatedFactions[factionId]!.trustTowards,
          [newFactionId]: 0.5,
        },
        rivalryWith: {
          ...updatedFactions[factionId]!.rivalryWith,
          [newFactionId]: 0.5,
        },
      };
    }
  });

  return updatedFactions;
};
