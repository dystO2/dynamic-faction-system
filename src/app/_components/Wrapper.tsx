"use client";

import { Button } from "~/components/ui/button";
import {
  useFactionsAtom,
  createNewFaction,
  updateRelationshipsForNewFaction,
  type Faction,
} from "../_atoms/factions.atom";
import useInteractions from "../_hooks/useInteractions";
import Game from "./Game";
import Slider from "./Slider";
import { PlusCircle, MinusCircle } from "lucide-react";

interface FactionEditorProps {
  factionId: string;
  faction: Faction;
  updateFaction: (
    factionId: string,
    property: keyof Faction,
    value: number,
  ) => void;
}

// Component to display and edit a single faction's properties
const FactionEditor: React.FC<FactionEditorProps> = ({
  factionId,
  faction,
  updateFaction,
}) => {
  return (
    <div className="flex flex-col gap-4 rounded-lg border-2 border-zinc-700 bg-zinc-600 p-4 text-center text-white">
      <h1>{faction.name}</h1>
      <input
        type="text"
        value={faction.name}
        onChange={(e) =>
          updateFaction(factionId, "name", Number(e.target.value))
        }
        className="rounded-md border bg-zinc-700 px-3 py-2 text-white"
        placeholder="Faction Name"
      />
      <Slider
        label="Aggression"
        value={faction.aggression}
        setValue={(value) => updateFaction(factionId, "aggression", value)}
      />
      <Slider
        label="Influence"
        value={faction.influence}
        setValue={(value) => updateFaction(factionId, "influence", value)}
      />
      <Slider
        label="Wealth"
        value={faction.wealth}
        setValue={(value) => updateFaction(factionId, "wealth", value)}
      />
      <Slider
        label="Tech"
        value={faction.tech}
        setValue={(value) => updateFaction(factionId, "tech", value)}
      />
      <Slider
        label="Endurance"
        value={faction.endurance}
        setValue={(value) => updateFaction(factionId, "endurance", value)}
      />
    </div>
  );
};

const Wrapper: React.FC = () => {
  const [factionsState, setFactionsState] = useFactionsAtom();
  const { onStartGameHandler, isStarted } = useInteractions();

  // Function to add a new faction
  const addFaction = (): void => {
    // Create a new faction with default values
    const newFaction = createNewFaction(
      `Faction ${Object.keys(factionsState.factions).length + 1}`,
      factionsState.factions,
    );

    // Add the new faction and update relationships
    const updatedFactions = {
      ...factionsState.factions,
      [newFaction.id]: newFaction,
    };

    // Update relationships for all factions
    const factionsWithUpdatedRelationships = updateRelationshipsForNewFaction(
      updatedFactions,
      newFaction.id,
    );

    setFactionsState({
      ...factionsState,
      factions: factionsWithUpdatedRelationships,
    });
  };

  // Function to remove a faction
  const removeFaction = (): void => {
    const factionIds = Object.keys(factionsState.factions);

    // Don't allow fewer than 2 factions
    if (factionIds.length <= 2) return;

    // Remove the last faction
    const lastFactionId = factionIds[factionIds.length - 1];
    const updatedFactions = { ...factionsState.factions };
    delete updatedFactions[lastFactionId!];

    // Update relationships for all remaining factions
    // Remove the deleted faction from all trustTowards and rivalryWith maps
    Object.values(updatedFactions).forEach((faction) => {
      if (faction.trustTowards[lastFactionId!]) {
        const newTrustTowards = { ...faction.trustTowards };
        delete newTrustTowards[lastFactionId!];
        faction.trustTowards = newTrustTowards;
      }
      if (faction.rivalryWith[lastFactionId!]) {
        const newRivalryWith = { ...faction.rivalryWith };
        delete newRivalryWith[lastFactionId!];
        faction.rivalryWith = newRivalryWith;
      }
    });

    setFactionsState({
      ...factionsState,
      factions: updatedFactions,
    });
  };

  // Function to update a faction property
  const updateFaction = <K extends keyof Faction>(
    factionId: string,
    property: K,
    value: Faction[K],
  ): void => {
    setFactionsState({
      ...factionsState,
      factions: {
        ...factionsState.factions,
        [factionId]: {
          ...factionsState.factions[factionId]!,
          [property]: value,
        },
      },
    });
  };

  if (!isStarted) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-8 bg-zinc-500">
        <div className="flex flex-col items-center gap-4">
          <div className="mb-4 flex items-center gap-4">
            <h1 className="text-xl font-bold text-white">
              Number of Factions: {Object.keys(factionsState.factions).length}
            </h1>
            <Button
              variant="outline"
              size="icon"
              onClick={addFaction}
              className="bg-green-600 text-white hover:bg-green-700 disabled:bg-green-400"
            >
              <PlusCircle className="h-6 w-6" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={removeFaction}
              disabled={Object.keys(factionsState.factions).length <= 2}
              className="bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400"
            >
              <MinusCircle className="h-6 w-6" />
            </Button>
          </div>

          <div className="grid max-h-[70vh] grid-cols-1 gap-4 overflow-y-auto p-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(factionsState.factions).map(
              ([factionId, faction]) => (
                <FactionEditor
                  key={factionId}
                  factionId={factionId}
                  faction={faction}
                  updateFaction={updateFaction}
                />
              ),
            )}
          </div>
        </div>

        <Button
          className="mt-4 bg-blue-600 px-8 py-2 text-lg text-white hover:bg-blue-700"
          onClick={onStartGameHandler}
        >
          Start Game
        </Button>
      </div>
    );
  }

  return <Game />;
};

export default Wrapper;
