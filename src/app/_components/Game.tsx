/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import React, { useState } from "react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { useFactionsAtomValue } from "../_atoms/factions.atom";
import Logs from "./Logs";
import Simulator from "./Simulator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import useInteractions from "../_hooks/useInteractions";
import { type Faction } from "../_atoms/factions.atom";

// FactionCard component to avoid code duplication
const FactionCard = ({ faction }: { faction: Faction }) => {
  return (
    <div className="flex flex-col gap-4 rounded-lg border-2 border-zinc-950 bg-zinc-600 p-4 text-white">
      <h1 className="text-center">{faction.name}</h1>
      <div className="flex flex-col items-center gap-2">
        <div className="flex w-full items-center justify-between gap-2">
          <p>Aggression</p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className="h-2 w-20 rounded-full border-2 border-zinc-950 bg-zinc-950">
                  <div
                    className="h-full bg-zinc-50"
                    style={{
                      width: `${(faction.aggression / 3) * 100}%`,
                    }}
                  ></div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{faction.aggression}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex w-full items-center justify-between gap-2">
          <p>Tech</p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className="h-2 w-20 rounded-full border-2 border-zinc-950 bg-zinc-950">
                  <div
                    className="h-full bg-zinc-50"
                    style={{
                      width: `${(faction.tech / 3) * 100}%`,
                    }}
                  ></div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{faction.tech}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex w-full items-center justify-between gap-2">
          <p>Endurance</p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className="h-2 w-20 rounded-full border-2 border-zinc-950 bg-zinc-950">
                  <div
                    className="h-full bg-zinc-50"
                    style={{
                      width: `${(faction.endurance / 3) * 100}%`,
                    }}
                  ></div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{faction.endurance}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex w-full items-center justify-between gap-2">
          <p>Wealth</p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className="h-2 w-20 rounded-full border-2 border-zinc-950 bg-zinc-950">
                  <div
                    className="h-full bg-zinc-50"
                    style={{
                      width: `${(faction.wealth / 3) * 100}%`,
                    }}
                  ></div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{faction.wealth}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex w-full items-center justify-between gap-2">
          <p>Influence</p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className="h-2 w-20 rounded-full border-2 border-zinc-950 bg-zinc-950">
                  <div
                    className="h-full bg-zinc-50"
                    style={{
                      width: `${(faction.influence / 3) * 100}%`,
                    }}
                  ></div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{faction.influence}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex w-full items-center justify-between gap-2">
          <p>Manpower</p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className="h-2 w-20 rounded-full border-2 border-zinc-950 bg-zinc-950">
                  <div
                    className="h-full bg-zinc-50"
                    style={{
                      width: `${(faction.manpower / 100) * 100}%`,
                    }}
                  ></div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{faction.manpower}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex w-full items-center justify-between gap-2">
          <p>Resources</p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className="h-2 w-20 rounded-full border-2 border-zinc-950 bg-zinc-950">
                  <div
                    className="h-full bg-zinc-50"
                    style={{
                      width: `${(faction.resources / 100) * 100}%`,
                    }}
                  ></div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{faction.resources}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex w-full items-center justify-between gap-2">
          <p>Player Trust</p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className="h-2 w-20 rounded-full border-2 border-zinc-950 bg-zinc-950">
                  <div
                    className="h-full bg-zinc-50"
                    style={{
                      width: `${((faction.trustTowards?.player || 0.5) / 1) * 100}%`,
                    }}
                  ></div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{faction.trustTowards?.player || 0.5}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Relationship with other factions */}
        {Object.entries(faction.trustTowards || {}).map(([id, trust]) => {
          if (id === "player") return null;
          return (
            <div
              key={id}
              className="flex w-full items-center justify-between gap-2"
            >
              <p>Trust with {id}</p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="h-2 w-20 rounded-full border-2 border-zinc-950 bg-zinc-950">
                      <div
                        className="h-full bg-zinc-50"
                        style={{
                          width: `${(trust / 1) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{trust}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Game = () => {
  const factionsState = useFactionsAtomValue();
  const factions = factionsState.factions;
  const [isDone] = useState(false);

  const [attackValue, setAttackValue] = useState("");
  const [tradeValue, setTradeValue] = useState("");

  const {
    onPlayerTradeFactionHandlerWithInteraction,
    onPlayerAttackFactionHandlerWithInteraction,
    onPlayerAllianceFactionHandlerWithInteraction,
  } = useInteractions();

  return (
    <div className="flex min-h-screen w-screen flex-col items-start justify-center gap-8 bg-zinc-500 px-10 py-10">
      <div className="flex w-full flex-row gap-4">
        <div className="grid flex-1 grid-cols-3 gap-4">
          {/* Render faction cards dynamically */}
          {Object.entries(factions).map(([factionId, faction]) => (
            <FactionCard key={factionId} faction={faction} />
          ))}
        </div>
        {/* Player actions panel */}
        <div className="flex w-1/3 flex-col gap-4 rounded-lg border-2 border-zinc-950 bg-zinc-600 p-4 text-white">
          <h1 className="text-center">Player</h1>
          <div className="flex flex-col gap-2">
            {/* Attack actions */}
            <div className="grid grid-cols-3 gap-2">
              <Input
                type="number"
                min={1}
                max={100}
                placeholder="Attack value"
                value={attackValue}
                onChange={(e) => setAttackValue(e.target.value)}
              />
              <div className="col-span-2 grid grid-cols-2 gap-2">
                {Object.entries(factions).map(([factionId, faction]) => (
                  <Button
                    key={`attack-${factionId}`}
                    disabled={isDone || !attackValue}
                    onClick={() =>
                      onPlayerAttackFactionHandlerWithInteraction(
                        factionId,
                        attackValue,
                      )
                    }
                  >
                    Attack {faction.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Trade actions */}
            <div className="grid grid-cols-3 gap-2">
              <Input
                type="number"
                min={1}
                max={100}
                placeholder="Trade value"
                value={tradeValue}
                onChange={(e) => setTradeValue(e.target.value)}
              />
              <div className="col-span-2 grid grid-cols-2 gap-2">
                {Object.entries(factions).map(([factionId, faction]) => (
                  <Button
                    key={`trade-${factionId}`}
                    disabled={isDone || !tradeValue}
                    onClick={() =>
                      onPlayerTradeFactionHandlerWithInteraction(
                        factionId,
                        tradeValue,
                      )
                    }
                  >
                    Trade with {faction.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Alliance actions */}
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(factions).map(([factionId, faction]) => (
                <Button
                  key={`alliance-${factionId}`}
                  disabled={isDone}
                  onClick={() =>
                    onPlayerAllianceFactionHandlerWithInteraction(factionId)
                  }
                >
                  Form alliance with {faction.name}
                </Button>
              ))}
            </div>

            <Simulator />
            <Logs />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;
