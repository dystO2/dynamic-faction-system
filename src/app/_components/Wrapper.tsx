"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { useFactionsAtom } from "../_atoms/factions.atom";
import Slider from "./Slider";
import Game from "./Game";

const Wrapper = () => {
  const [factions, setFactions] = useFactionsAtom();

  const [isStarted, setIsStarted] = useState(false);

  const onStartGameHandler = () => {
    const factionOne = factions.factionOne;
    const factionTwo = factions.factionTwo;

    const { aggression, tech, endurance, wealth, influence } = factionOne;

    const {
      aggression: aggressionTwo,
      tech: techTwo,
      endurance: enduranceTwo,
      wealth: wealthTwo,
      influence: influenceTwo,
    } = factionTwo;

    // Calculate manpower and resources as before
    const manpower = Math.round(((aggression + endurance) / 6) * 100);
    const resources = Math.round(((2 * wealth + tech + influence) / 12) * 100);

    const manpowerTwo = Math.round(((aggressionTwo + enduranceTwo) / 6) * 100);
    const resourcesTwo = Math.round(
      ((2 * wealthTwo + techTwo + influenceTwo) / 12) * 100,
    );

    // Calculate faction rivalry (0-1)
    // Higher aggression and influence increase rivalry between factions
    // Similar tech levels increase rivalry (competition)
    const techDifference = Math.abs(tech - techTwo);
    const factionRivalry = Math.min(
      1,
      Math.max(
        0,
        (aggression / 3) * 0.4 +
          (influence / 3) * 0.3 +
          (1 - techDifference / 2) * 0.3,
      ),
    );

    const factionRivalryTwo = factionRivalry; // Same value for both factions

    // Calculate player rivalry (0-1)
    // Higher aggression and lower wealth increase player rivalry
    // Wealth represents trade potential which reduces rivalry
    const playerRivalry = Math.min(
      1,
      Math.max(
        0,
        (aggression / 3) * 0.6 - (wealth / 3) * 0.2 + 0.2, // Base rivalry
      ),
    );

    const playerRivalryTwo = Math.min(
      1,
      Math.max(
        0,
        (aggressionTwo / 3) * 0.6 - (wealthTwo / 3) * 0.2 + 0.2, // Base rivalry
      ),
    );

    // Calculate faction trust (0-1)
    // Higher endurance and lower aggression increase trust between factions
    // Influence also increases trust potential
    const factionTrust = Math.min(
      1,
      Math.max(
        0,
        (endurance / 3) * 0.3 +
          (influence / 3) * 0.3 -
          (aggression / 3) * 0.3 +
          0.3, // Base trust value
      ),
    );

    const factionTrustTwo = Math.min(
      1,
      Math.max(
        0,
        (enduranceTwo / 3) * 0.3 +
          (influenceTwo / 3) * 0.3 -
          (aggressionTwo / 3) * 0.3 +
          0.3, // Base trust value
      ),
    );

    // Calculate player trust (0-1)
    // Higher wealth and tech increase initial player trust
    // Higher aggression decreases initial player trust
    const playerTrust = Math.min(
      1,
      Math.max(
        0,
        (wealth / 3) * 0.3 + (tech / 3) * 0.2 - (aggression / 3) * 0.2 + 0.2, // Base trust value
      ),
    );

    const playerTrustTwo = Math.min(
      1,
      Math.max(
        0,
        (wealthTwo / 3) * 0.3 +
          (techTwo / 3) * 0.2 -
          (aggressionTwo / 3) * 0.2 +
          0.2, // Base trust value
      ),
    );

    setFactions({
      ...factions,
      factionOne: {
        ...factions.factionOne,
        manpower,
        resources,
        factionRivalry,
        playerRivalry,
        factionTrust,
        playerTrust,
      },
      factionTwo: {
        ...factions.factionTwo,
        manpower: manpowerTwo,
        resources: resourcesTwo,
        factionRivalry: factionRivalryTwo,
        playerRivalry: playerRivalryTwo,
        factionTrust: factionTrustTwo,
        playerTrust: playerTrustTwo,
      },
    });

    setIsStarted(true);
  };

  if (!isStarted) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-8 bg-zinc-500">
        <div className="flex flex-row justify-between gap-8">
          <div className="flex flex-col gap-4 text-center">
            <h1>Faction 1</h1>
            <Slider
              label="Aggression"
              value={factions.factionOne.aggression}
              setValue={(value) =>
                setFactions({
                  ...factions,
                  factionOne: { ...factions.factionOne, aggression: value },
                })
              }
            />

            <Slider
              label="Influence"
              value={factions.factionOne.influence}
              setValue={(value) =>
                setFactions({
                  ...factions,
                  factionOne: { ...factions.factionOne, influence: value },
                })
              }
            />

            <Slider
              label="Wealth"
              value={factions.factionOne.wealth}
              setValue={(value) =>
                setFactions({
                  ...factions,
                  factionOne: { ...factions.factionOne, wealth: value },
                })
              }
            />

            <Slider
              label="Tech"
              value={factions.factionOne.tech}
              setValue={(value) =>
                setFactions({
                  ...factions,
                  factionOne: { ...factions.factionOne, tech: value },
                })
              }
            />

            <Slider
              label="Endurance"
              value={factions.factionOne.endurance}
              setValue={(value) =>
                setFactions({
                  ...factions,
                  factionOne: { ...factions.factionOne, endurance: value },
                })
              }
            />
          </div>
          <div className="flex flex-col gap-4 text-center">
            <h1>Faction 2</h1>
            <Slider
              label="Aggression"
              value={factions.factionTwo.aggression}
              setValue={(value) =>
                setFactions({
                  ...factions,
                  factionTwo: { ...factions.factionTwo, aggression: value },
                })
              }
            />

            <Slider
              label="Influence"
              value={factions.factionTwo.influence}
              setValue={(value) =>
                setFactions({
                  ...factions,
                  factionTwo: { ...factions.factionTwo, influence: value },
                })
              }
            />

            <Slider
              label="Wealth"
              value={factions.factionTwo.wealth}
              setValue={(value) =>
                setFactions({
                  ...factions,
                  factionTwo: { ...factions.factionTwo, wealth: value },
                })
              }
            />

            <Slider
              label="Tech"
              value={factions.factionTwo.tech}
              setValue={(value) =>
                setFactions({
                  ...factions,
                  factionTwo: { ...factions.factionTwo, tech: value },
                })
              }
            />

            <Slider
              label="Endurance"
              value={factions.factionTwo.endurance}
              setValue={(value) =>
                setFactions({
                  ...factions,
                  factionTwo: { ...factions.factionTwo, endurance: value },
                })
              }
            />
          </div>
        </div>
        <Button className="mt-4" onClick={onStartGameHandler}>
          Start
        </Button>
      </div>
    );
  }

  return <Game />;
};

export default Wrapper;
