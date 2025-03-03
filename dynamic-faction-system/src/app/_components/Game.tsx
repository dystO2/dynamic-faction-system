import React, { useState } from "react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { useFactionsAtom } from "../_atoms/factions.atom";
import Logs from "./Logs";
import { useSetLogsAtomValue } from "../_atoms/logs.atom";
import { type Log } from "../_atoms/logs.atom";
import { useSetLastPlayerInteractionAtomValue } from "../_atoms/lastPlayerAction.atom";
import Simulator from "./Simulator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

const Game = () => {
  const [factions, setFactions] = useFactionsAtom();
  const setLogs = useSetLogsAtomValue();
  const setLastPlayerInteraction = useSetLastPlayerInteractionAtomValue();
  const [isDone] = useState(false);

  const [attackValue, setAttackValue] = useState("");
  const [tradeValue, setTradeValue] = useState("");

  const updateLogs = (newLogs: Log[]) => {
    let index = 0;

    const addNextLog = () => {
      if (index < newLogs.length) {
        setLogs((prev) => [...prev, newLogs[index]!]);
        index++;
        setTimeout(addNextLog, 1000); // 1 second delay
      }
    };

    // Start the process
    addNextLog();
  };

  const onPlayerAttackFactionHandler = (fxn: "one" | "two") => {
    const faction = fxn === "one" ? factions.factionOne : factions.factionTwo;
    const newLogs: Log[] = [];

    if (Number(attackValue) > faction.manpower) {
      newLogs.push({
        message: `Attack denied: Faction does not have enough manpower to carry out the attack`,
        type: "warning",
      });
    } else {
      const killCount = Number(attackValue);

      // Extract initial attributes
      const {
        aggression,
        tech,
        endurance,
        wealth,
        influence,
        manpower,
        resources,
        playerTrust,
      } = faction;

      // Calculate war outcome probability with weighted attributes
      const aggressionWeight = 0.25;
      const techWeight = 0.2;
      const enduranceWeight = 0.2;
      const wealthWeight = 0.15;
      const influenceWeight = 0.1;
      const manpowerWeight = 0.1;

      // Calculate faction's effective combat strength
      const factionStrength =
        aggression * aggressionWeight +
        tech * techWeight +
        endurance * enduranceWeight +
        wealth * wealthWeight +
        influence * influenceWeight +
        manpower * manpowerWeight;

      // Player attack strength is based on killCount and diminishing returns
      const attackStrength = Math.pow(killCount, 0.8) * 0.5;

      // Calculate war outcome probability
      const WO = factionStrength / (factionStrength + attackStrength);

      // Determine if war is won or lost
      const warWon = WO > 0.5;

      // Add detailed explanation for war outcome
      newLogs.push({
        message: `War outcome: ${warWon ? "Faction Won" : "Faction Lost"} (${
          warWon
            ? `faction strength overcame attack strength`
            : `attack strength overcame faction strength`
        })`,
        type: "warning",
      });

      const updatedManpower = Math.max(0, manpower - killCount);

      // Calculate impact severity based on killCount as a percentage of manpower
      const impactSeverity = Math.min(1, killCount / manpower);

      // Calculate base percentage changes
      const baseImpactPercentage = impactSeverity * 50; // Up to 50% change

      // WINNING SCENARIO CHANGES
      if (warWon) {
        // Aggression increases - victory emboldens the faction
        const aggressionChange =
          (baseImpactPercentage / 100) * aggression * 2.0;
        const updatedAggression = Math.max(
          1,
          Math.min(3, aggression + aggressionChange),
        );
        newLogs.push({
          message: `Aggression increased from ${aggression.toFixed(2)} to ${updatedAggression.toFixed(2)} (victory emboldens)`,
          type: "success",
        });

        // Tech increases - learning from battle experience
        const techChange = (baseImpactPercentage / 100) * tech * 1.5;
        const updatedTech = Math.max(1, Math.min(3, tech + techChange));
        newLogs.push({
          message: `Tech increased from ${tech.toFixed(2)} to ${updatedTech.toFixed(2)} (battle innovations)`,
          type: "success",
        });

        // Endurance decreases - even winners suffer fatigue
        const enduranceChange = (baseImpactPercentage / 100) * endurance * 1.5;
        const updatedEndurance = Math.max(
          1,
          Math.min(3, endurance - enduranceChange),
        );
        newLogs.push({
          message: `Endurance decreased from ${endurance.toFixed(2)} to ${updatedEndurance.toFixed(2)} (victory fatigue)`,
          type: "error",
        });

        // Wealth decreases - war costs money even when you win
        const wealthChange = (baseImpactPercentage / 100) * wealth * 2.0;
        const updatedWealth = Math.max(1, Math.min(3, wealth - wealthChange));
        newLogs.push({
          message: `Wealth decreased from ${wealth.toFixed(2)} to ${updatedWealth.toFixed(2)} (war expenses)`,
          type: "error",
        });

        // Influence increases - victory brings prestige
        const influenceChange = (baseImpactPercentage / 100) * influence * 2.5;
        const updatedInfluence = Math.max(
          1,
          Math.min(3, influence + influenceChange),
        );
        newLogs.push({
          message: `Influence increased from ${influence.toFixed(2)} to ${updatedInfluence.toFixed(2)} (victory prestige)`,
          type: "success",
        });

        // PlayerTrust decreases - even when victorious, being attacked reduces trust
        const playerTrustChange =
          (baseImpactPercentage / 100) * playerTrust * 1.0;
        const updatedPlayerTrust = Math.max(
          0,
          Math.min(1, playerTrust - playerTrustChange),
        );
        newLogs.push({
          message: `Player Trust decreased from ${playerTrust.toFixed(2)} to ${updatedPlayerTrust.toFixed(2)} (damaged relationship)`,
          type: "error",
        });

        // Resources decrease significantly - even winners use resources
        const resourceChange = impactSeverity * killCount * 0.4;
        const updatedResources = Math.max(0, resources - resourceChange);
        newLogs.push({
          message: `Resources decreased from ${resources.toFixed(2)} to ${updatedResources.toFixed(2)} (battle consumption)`,
          type: "error",
        });

        if (fxn === "one") {
          setFactions({
            ...factions,
            factionOne: {
              ...factions.factionOne,
              manpower: updatedManpower,
              aggression: updatedAggression,
              tech: updatedTech,
              endurance: updatedEndurance,
              wealth: updatedWealth,
              influence: updatedInfluence,
              resources: updatedResources,
              playerTrust: updatedPlayerTrust,
            },
          });
        } else {
          setFactions({
            ...factions,
            factionTwo: {
              ...factions.factionTwo,
              manpower: updatedManpower,
              aggression: updatedAggression,
              tech: updatedTech,
              endurance: updatedEndurance,
              wealth: updatedWealth,
              influence: updatedInfluence,
              resources: updatedResources,
              playerTrust: updatedPlayerTrust,
            },
          });
        }
      }
      // LOSING SCENARIO CHANGES
      else {
        // Aggression changes - can go either way depending on current level
        // High aggression factions become more aggressive after loss, low aggression factions become less
        const aggressionPivot = 2; // Midpoint of 1-3 scale
        const aggressionDirection = aggression > aggressionPivot ? 1 : -1;
        const aggressionChange =
          (baseImpactPercentage / 100) * aggression * 3.0 * aggressionDirection;
        const updatedAggression = Math.max(
          1,
          Math.min(3, aggression + aggressionChange),
        );
        newLogs.push({
          message: `Aggression ${aggressionDirection > 0 ? "increased" : "decreased"} from ${aggression.toFixed(2)} to ${updatedAggression.toFixed(2)} (${aggressionDirection > 0 ? "revenge seeking" : "demoralization"})`,
          type: aggressionDirection > 0 ? "success" : "error",
        });

        // Tech increases - learning from defeat
        const techChange = (baseImpactPercentage / 100) * tech * 2.0;
        const updatedTech = Math.max(1, Math.min(3, tech + techChange));
        newLogs.push({
          message: `Tech increased from ${tech.toFixed(2)} to ${updatedTech.toFixed(2)} (learning from defeat)`,
          type: "success",
        });

        // Endurance decreases significantly - defeat is demoralizing
        const enduranceChange = (baseImpactPercentage / 100) * endurance * 2.5;
        const updatedEndurance = Math.max(
          1,
          Math.min(3, endurance - enduranceChange),
        );
        newLogs.push({
          message: `Endurance decreased from ${endurance.toFixed(2)} to ${updatedEndurance.toFixed(2)} (battle trauma)`,
          type: "error",
        });

        // Wealth decreases significantly - defeat is expensive
        const wealthChange = (baseImpactPercentage / 100) * wealth * 3.5;
        const updatedWealth = Math.max(1, Math.min(3, wealth - wealthChange));
        newLogs.push({
          message: `Wealth decreased from ${wealth.toFixed(2)} to ${updatedWealth.toFixed(2)} (defeat costs)`,
          type: "error",
        });

        // Influence decreases - defeat brings shame
        const influenceChange = (baseImpactPercentage / 100) * influence * 3.0;
        const updatedInfluence = Math.max(
          1,
          Math.min(3, influence - influenceChange),
        );
        newLogs.push({
          message: `Influence decreased from ${influence.toFixed(2)} to ${updatedInfluence.toFixed(2)} (lost standing)`,
          type: "error",
        });

        // PlayerTrust decreases dramatically - being defeated by player significantly reduces trust
        const playerTrustChange =
          (baseImpactPercentage / 100) * playerTrust * 2.5;
        const updatedPlayerTrust = Math.max(
          0,
          Math.min(1, playerTrust - playerTrustChange),
        );
        newLogs.push({
          message: `Player Trust decreased from ${playerTrust.toFixed(2)} to ${updatedPlayerTrust.toFixed(2)} (betrayal and defeat)`,
          type: "error",
        });

        // Resources decrease significantly - losers lose more resources
        const resourceChange = impactSeverity * killCount * 0.8;
        const updatedResources = Math.max(0, resources - resourceChange);
        newLogs.push({
          message: `Resources decreased from ${resources.toFixed(2)} to ${updatedResources.toFixed(2)} (resources seized)`,
          type: "error",
        });

        if (fxn === "one") {
          setFactions({
            ...factions,
            factionOne: {
              ...factions.factionOne,
              manpower: updatedManpower,
              aggression: updatedAggression,
              tech: updatedTech,
              endurance: updatedEndurance,
              wealth: updatedWealth,
              influence: updatedInfluence,
              resources: updatedResources,
              playerTrust: updatedPlayerTrust,
            },
          });
        } else {
          setFactions({
            ...factions,
            factionTwo: {
              ...factions.factionTwo,
              manpower: updatedManpower,
              aggression: updatedAggression,
              tech: updatedTech,
              endurance: updatedEndurance,
              wealth: updatedWealth,
              influence: updatedInfluence,
              resources: updatedResources,
              playerTrust: updatedPlayerTrust,
            },
          });
        }
      }
    }

    updateLogs(newLogs);
    setAttackValue("");
  };

  // Trade handler with trade outcome explanation
  const onPlayerTradeFactionHandler = (fxn: "one" | "two") => {
    const faction = fxn === "one" ? factions.factionOne : factions.factionTwo;
    const newLogs: Log[] = [];

    const tradeAmount = Number(tradeValue);

    if (tradeAmount <= 0) {
      newLogs.push({
        message: `Trade denied: Trade amount must be greater than 0`,
        type: "warning",
      });
      setLogs((prev) => {
        return [...prev, ...newLogs];
      });
      return;
    }

    // Extract initial attributes
    const {
      aggression,
      tech,
      endurance,
      wealth,
      influence,
      resources,
      playerTrust,
    } = faction;

    // Calculate trade acceptance probability with weighted attributes
    const playerTrustWeight = 0.4;
    const wealthWeight = 0.2;
    const influenceWeight = 0.15;
    const aggressionWeight = -0.1;
    const techWeight = 0.1;
    const enduranceWeight = 0.05;

    // Calculate faction's willingness to trade
    const tradeWillingness =
      (playerTrust / 10) * playerTrustWeight +
      ((wealth - 1) / 2) * wealthWeight +
      ((influence - 1) / 2) * influenceWeight +
      ((aggression - 1) / 2) * aggressionWeight +
      ((tech - 1) / 2) * techWeight +
      ((endurance - 1) / 2) * enduranceWeight;

    // Adjust based on trade amount relative to faction's resources
    const tradeImpact = Math.min(1, tradeAmount / (resources * 5));
    const resourceFactor = (1 - tradeImpact) * 0.2; // Larger trades harder to accept

    // Calculate acceptance probability
    const acceptanceProbability = tradeWillingness + resourceFactor;

    // Determine if trade is accepted
    const tradeAccepted = acceptanceProbability > 0.5;

    // Get the highest and lowest contributing factors to explain decision
    const factors = [
      { name: "Trust", value: (playerTrust / 10) * playerTrustWeight },
      { name: "Wealth", value: ((wealth - 1) / 2) * wealthWeight },
      { name: "Influence", value: ((influence - 1) / 2) * influenceWeight },
      { name: "Aggression", value: ((aggression - 1) / 2) * aggressionWeight },
      { name: "Tech", value: ((tech - 1) / 2) * techWeight },
      { name: "Resources", value: resourceFactor },
    ];

    factors.sort((a, b) => b.value - a.value);
    const topFactor = factors[0]!;
    const bottomFactor = factors[factors.length - 1]!;

    let reason = "";
    if (tradeAccepted) {
      reason = `high ${topFactor.name.toLowerCase()} was the deciding factor`;
    } else {
      if (bottomFactor.value < 0) {
        reason = `low ${bottomFactor.name.toLowerCase()} prevented agreement`;
      } else {
        reason = `overall insufficient trading desire`;
      }
    }

    // Add detailed explanation for trade outcome
    newLogs.push({
      message: `Trade with value ${tradeAmount}: ${tradeAccepted ? "Accepted" : "Rejected"} (${reason})`,
      type: "warning",
    });

    // Calculate impact severity based on trade amount relative to resources
    const impactSeverity = Math.min(1, tradeAmount / resources);

    // Calculate base percentage changes
    const baseImpactPercentage = impactSeverity * 30; // Up to 30% change

    if (tradeAccepted) {
      // TRADE ACCEPTED SCENARIO

      // PlayerTrust increases - successful trade builds trust
      const playerTrustChange =
        (baseImpactPercentage / 100) * (10 - playerTrust) * 1.5;
      const updatedPlayerTrust = Math.max(
        0,
        Math.min(1, playerTrust + playerTrustChange),
      );
      newLogs.push({
        message: `Player Trust increased from ${playerTrust.toFixed(2)} to ${updatedPlayerTrust.toFixed(2)} (successful trade)`,
        type: "success",
      });

      // Wealth increases - trade is profitable
      const wealthChange = (baseImpactPercentage / 100) * wealth * 1.2;
      const updatedWealth = Math.max(1, Math.min(3, wealth + wealthChange));
      newLogs.push({
        message: `Wealth increased from ${wealth.toFixed(2)} to ${updatedWealth.toFixed(2)} (trade profit)`,
        type: "success",
      });

      // Influence increases slightly - trade connections build influence
      const influenceChange = (baseImpactPercentage / 100) * influence * 0.8;
      const updatedInfluence = Math.max(
        1,
        Math.min(3, influence + influenceChange),
      );
      newLogs.push({
        message: `Influence increased from ${influence.toFixed(2)} to ${updatedInfluence.toFixed(2)} (trade connections)`,
        type: "success",
      });

      // Aggression decreases slightly - trade fosters cooperation
      const aggressionChange = (baseImpactPercentage / 100) * aggression * 0.5;
      const updatedAggression = Math.max(
        1,
        Math.min(3, aggression - aggressionChange),
      );
      newLogs.push({
        message: `Aggression decreased from ${aggression.toFixed(2)} to ${updatedAggression.toFixed(2)} (trade cooperation)`,
        type: "error",
      });

      // Tech increases slightly - trade facilitates knowledge exchange
      const techChange = (baseImpactPercentage / 100) * tech * 0.7;
      const updatedTech = Math.max(1, Math.min(3, tech + techChange));
      newLogs.push({
        message: `Tech increased from ${tech.toFixed(2)} to ${updatedTech.toFixed(2)} (knowledge exchange)`,
        type: "success",
      });

      // Endurance unchanged for trade
      const updatedEndurance = endurance;

      // Resources increase - trade brings in resources
      const resourceChange = tradeAmount * 0.5;
      const updatedResources = resources + resourceChange;
      newLogs.push({
        message: `Resources increased from ${resources.toFixed(2)} to ${updatedResources.toFixed(2)} (trade gains)`,
        type: "success",
      });

      if (fxn === "one") {
        setFactions({
          ...factions,
          factionOne: {
            ...factions.factionOne,
            aggression: updatedAggression,
            tech: updatedTech,
            endurance: updatedEndurance,
            wealth: updatedWealth,
            influence: updatedInfluence,
            resources: updatedResources,
            playerTrust: updatedPlayerTrust,
          },
        });
      } else {
        setFactions({
          ...factions,
          factionTwo: {
            ...factions.factionTwo,
            aggression: updatedAggression,
            tech: updatedTech,
            endurance: updatedEndurance,
            wealth: updatedWealth,
            influence: updatedInfluence,
            resources: updatedResources,
            playerTrust: updatedPlayerTrust,
          },
        });
      }
    } else {
      // TRADE REJECTED SCENARIO

      // PlayerTrust decreases slightly - rejection strains relationship
      const playerTrustChange =
        (baseImpactPercentage / 100) * playerTrust * 0.4;
      const updatedPlayerTrust = Math.max(
        0,
        Math.min(1, playerTrust - playerTrustChange),
      );
      newLogs.push({
        message: `Player Trust decreased from ${playerTrust.toFixed(2)} to ${updatedPlayerTrust.toFixed(2)} (rejected offer)`,
        type: "error",
      });

      // Aggression increases slightly - rejection can cause tension
      const aggressionChange = (baseImpactPercentage / 100) * aggression * 0.3;
      const updatedAggression = Math.max(
        1,
        Math.min(3, aggression + aggressionChange),
      );
      newLogs.push({
        message: `Aggression increased from ${aggression.toFixed(2)} to ${updatedAggression.toFixed(2)} (trade tension)`,
        type: "success",
      });

      // Other attributes unchanged
      const updatedWealth = wealth;
      const updatedInfluence = influence;
      const updatedTech = tech;
      const updatedEndurance = endurance;
      const updatedResources = resources;

      if (fxn === "one") {
        setFactions({
          ...factions,
          factionOne: {
            ...factions.factionOne,
            aggression: updatedAggression,
            tech: updatedTech,
            endurance: updatedEndurance,
            wealth: updatedWealth,
            influence: updatedInfluence,
            resources: updatedResources,
            playerTrust: updatedPlayerTrust,
          },
        });
      } else {
        setFactions({
          ...factions,
          factionTwo: {
            ...factions.factionTwo,
            aggression: updatedAggression,
            tech: updatedTech,
            endurance: updatedEndurance,
            wealth: updatedWealth,
            influence: updatedInfluence,
            resources: updatedResources,
            playerTrust: updatedPlayerTrust,
          },
        });
      }
    }

    updateLogs(newLogs);
    setTradeValue("");
  };

  // Alliance handler with alliance outcome explanation
  const onPlayerAllianceFactionHandler = (fxn: "one" | "two") => {
    const faction = fxn == "one" ? factions.factionOne : factions.factionTwo;
    const newLogs: Log[] = [];

    // Extract initial attributes
    const {
      aggression,
      tech,
      endurance,
      wealth,
      influence,
      resources,
      playerTrust,
    } = faction;

    // Calculate alliance acceptance probability with weighted attributes
    const playerTrustWeight = 0.45;
    const aggressionWeight = -0.15;
    const influenceWeight = 0.15;
    const wealthWeight = 0.05;
    const techWeight = 0.05;
    const enduranceWeight = 0.05;

    // Calculate faction's willingness to form alliance
    // FIX: Removed division by 10 for playerTrust since it's already on a 0-1 scale
    const allianceWillingness =
      playerTrust * playerTrustWeight +
      ((aggression - 1) / 2) * aggressionWeight +
      ((influence - 1) / 2) * influenceWeight +
      ((wealth - 1) / 2) * wealthWeight +
      ((tech - 1) / 2) * techWeight +
      ((endurance - 1) / 2) * enduranceWeight;

    // Player power vs faction power
    const playerPower = 2.0; // Placeholder value
    const factionPower =
      (aggression + tech + endurance + wealth + influence) / 5;
    const powerRatio = Math.min(
      1,
      Math.max(0, playerPower / factionPower - 0.5),
    );

    // Factions prefer alliances with stronger entities, but not overwhelmingly stronger
    const powerFactor =
      powerRatio < 0.5 ? powerRatio * 0.2 : (1 - powerRatio) * 0.2;

    // Calculate acceptance probability
    const acceptanceProbability = allianceWillingness + powerFactor;

    // Determine if alliance is accepted (removed randomness factor)
    const allianceAccepted = acceptanceProbability > 0.6;

    // Get the highest and lowest contributing factors to explain decision
    const factors = [
      // FIX: Removed division by 10 for playerTrust
      { name: "Trust", value: playerTrust * playerTrustWeight },
      { name: "Aggression", value: ((aggression - 1) / 2) * aggressionWeight },
      { name: "Influence", value: ((influence - 1) / 2) * influenceWeight },
      { name: "Power", value: powerFactor },
    ];

    factors.sort((a, b) => b.value - a.value);
    const topFactor = factors[0]!;
    const bottomFactor = factors[factors.length - 1]!;

    let reason = "";
    if (allianceAccepted) {
      reason = `high ${topFactor.name.toLowerCase()} was the decisive factor`;
      if (powerFactor > 0.05) {
        reason += ` with favorable power dynamics`;
      }
    } else {
      if (bottomFactor.value < 0) {
        reason = `${bottomFactor.name.toLowerCase()} concerns prevented alliance`;
      } else if (playerTrust * playerTrustWeight < 0.2) {
        // FIX: Removed division by 10 for playerTrust and adjusted threshold to match 0-1 scale
        reason = `insufficient trust`;
      } else {
        reason = `strategic considerations`;
      }
    }

    // Add detailed explanation for alliance outcome
    newLogs.push({
      message: `Alliance request: ${allianceAccepted ? "Accepted" : "Rejected"} (${reason})`,
      type: "warning",
    });

    // Calculate impact severity for attribute changes
    const baseImpactPercentage = 40; // 40% base change for alliances

    if (allianceAccepted) {
      // ALLIANCE ACCEPTED SCENARIO

      // PlayerTrust increases significantly - alliance is a major commitment
      // FIX: Adjusted to work with 0-1 scale
      const playerTrustChange =
        (baseImpactPercentage / 100) * (1 - playerTrust) * 2.0;
      const updatedPlayerTrust = Math.max(
        0,
        Math.min(1, playerTrust + playerTrustChange),
      );
      newLogs.push({
        message: `Player Trust increased from ${playerTrust.toFixed(2)} to ${updatedPlayerTrust.toFixed(2)} (alliance bond)`,
        type: "success",
      });

      // Aggression decreases - alliance promotes peace with player
      const aggressionChange = (baseImpactPercentage / 100) * aggression * 1.2;
      const updatedAggression = Math.max(
        1,
        Math.min(3, aggression - aggressionChange),
      );
      newLogs.push({
        message: `Aggression decreased from ${aggression.toFixed(2)} to ${updatedAggression.toFixed(2)} (diplomatic ties)`,
        type: "error",
      });

      // Influence increases - alliance extends diplomatic reach
      const influenceChange = (baseImpactPercentage / 100) * influence * 1.5;
      const updatedInfluence = Math.max(
        1,
        Math.min(3, influence + influenceChange),
      );
      newLogs.push({
        message: `Influence increased from ${influence.toFixed(2)} to ${updatedInfluence.toFixed(2)} (extended reach)`,
        type: "success",
      });

      // Tech increases - alliance enables technology sharing
      const techChange = (baseImpactPercentage / 100) * tech * 1.0;
      const updatedTech = Math.max(1, Math.min(3, tech + techChange));
      newLogs.push({
        message: `Tech increased from ${tech.toFixed(2)} to ${updatedTech.toFixed(2)} (technology sharing)`,
        type: "success",
      });

      // Endurance increases - alliance provides security
      const enduranceChange = (baseImpactPercentage / 100) * endurance * 0.8;
      const updatedEndurance = Math.max(
        1,
        Math.min(3, endurance + enduranceChange),
      );
      newLogs.push({
        message: `Endurance increased from ${endurance.toFixed(2)} to ${updatedEndurance.toFixed(2)} (mutual security)`,
        type: "success",
      });

      // Wealth slightly increases - alliance opens trade routes
      const wealthChange = (baseImpactPercentage / 100) * wealth * 0.6;
      const updatedWealth = Math.max(1, Math.min(3, wealth + wealthChange));
      newLogs.push({
        message: `Wealth increased from ${wealth.toFixed(2)} to ${updatedWealth.toFixed(2)} (trade routes)`,
        type: "success",
      });

      // Resources unchanged
      const updatedResources = resources;

      if (fxn === "one") {
        setFactions({
          ...factions,
          factionOne: {
            ...factions.factionOne,
            aggression: updatedAggression,
            tech: updatedTech,
            endurance: updatedEndurance,
            wealth: updatedWealth,
            influence: updatedInfluence,
            resources: updatedResources,
            playerTrust: updatedPlayerTrust,
          },
        });
      } else {
        setFactions({
          ...factions,
          factionTwo: {
            ...factions.factionTwo,
            aggression: updatedAggression,
            tech: updatedTech,
            endurance: updatedEndurance,
            wealth: updatedWealth,
            influence: updatedInfluence,
            resources: updatedResources,
            playerTrust: updatedPlayerTrust,
          },
        });
      }
    } else {
      // ALLIANCE REJECTED SCENARIO

      // PlayerTrust decreases - rejection is a significant diplomatic event
      const playerTrustChange =
        (baseImpactPercentage / 100) * playerTrust * 0.8;
      const updatedPlayerTrust = Math.max(
        0,
        Math.min(1, playerTrust - playerTrustChange),
      );
      newLogs.push({
        message: `Player Trust decreased from ${playerTrust.toFixed(2)} to ${updatedPlayerTrust.toFixed(2)} (diplomatic slight)`,
        type: "error",
      });

      // Aggression increases - rejection creates tension
      const aggressionChange = (baseImpactPercentage / 100) * aggression * 0.7;
      const updatedAggression = Math.max(
        1,
        Math.min(3, aggression + aggressionChange),
      );
      newLogs.push({
        message: `Aggression increased from ${aggression.toFixed(2)} to ${updatedAggression.toFixed(2)} (political tension)`,
        type: "success",
      });

      // Influence decreases slightly - failed diplomacy
      const influenceChange = (baseImpactPercentage / 100) * influence * 0.4;
      const updatedInfluence = Math.max(
        1,
        Math.min(3, influence - influenceChange),
      );
      newLogs.push({
        message: `Influence decreased from ${influence.toFixed(2)} to ${updatedInfluence.toFixed(2)} (failed diplomacy)`,
        type: "error",
      });

      // Other attributes unchanged
      const updatedTech = tech;
      const updatedEndurance = endurance;
      const updatedWealth = wealth;
      const updatedResources = resources;

      if (fxn === "one") {
        setFactions({
          ...factions,
          factionOne: {
            ...factions.factionOne,
            aggression: updatedAggression,
            tech: updatedTech,
            endurance: updatedEndurance,
            wealth: updatedWealth,
            influence: updatedInfluence,
            resources: updatedResources,
            playerTrust: updatedPlayerTrust,
          },
        });
      } else {
        setFactions({
          ...factions,
          factionTwo: {
            ...factions.factionTwo,
            aggression: updatedAggression,
            tech: updatedTech,
            endurance: updatedEndurance,
            wealth: updatedWealth,
            influence: updatedInfluence,
            resources: updatedResources,
            playerTrust: updatedPlayerTrust,
          },
        });
      }
    }

    updateLogs(newLogs);
  };

  // Modify player action handlers to trigger faction interaction afterwards
  const onPlayerAttackFactionHandlerWithInteraction = (
    fxn: "one" | "two",
  ): void => {
    // Call original handler
    onPlayerAttackFactionHandler(fxn);

    // Update interaction tracking in state
    setLastPlayerInteraction({
      faction: fxn,
      action: "attack",
    });
  };

  const onPlayerTradeFactionHandlerWithInteraction = (
    fxn: "one" | "two",
  ): void => {
    // Call original handler
    onPlayerTradeFactionHandler(fxn);

    // Update interaction tracking in state
    setLastPlayerInteraction({
      faction: fxn,
      action: "trade with",
    });
  };

  const onPlayerAllianceFactionHandlerWithInteraction = (
    fxn: "one" | "two",
  ): void => {
    // Call original handler
    onPlayerAllianceFactionHandler(fxn);

    // Update interaction tracking in state
    setLastPlayerInteraction({
      faction: fxn,
      action: "form an alliance with",
    });
  };

  return (
    <>
      <Logs />
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-8 bg-zinc-500 px-10">
        <div className="mx-auto grid grid-flow-col gap-4">
          <div className="flex flex-col gap-4 rounded-lg border-2 border-zinc-950 bg-zinc-600 p-4 text-white">
            <h1 className="text-center">Faction 1</h1>
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
                            width: `${(factions.factionOne.aggression / 3) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{factions.factionOne.aggression}</p>
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
                            width: `${(factions.factionOne.tech / 3) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{factions.factionOne.tech}</p>
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
                            width: `${(factions.factionOne.endurance / 3) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{factions.factionOne.endurance}</p>
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
                            width: `${(factions.factionOne.wealth / 3) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{factions.factionOne.wealth}</p>
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
                            width: `${(factions.factionOne.influence / 3) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{factions.factionOne.influence}</p>
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
                            width: `${(factions.factionOne.manpower / 100) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{factions.factionOne.manpower}</p>
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
                            width: `${(factions.factionOne.resources / 100) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{factions.factionOne.resources}</p>
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
                            width: `${(factions.factionOne.playerTrust / 1) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{factions.factionOne.playerTrust}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {/* <div className="flex w-full items-center justify-between gap-2">
                <p>Player Rivalry</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="h-2 w-20 rounded-full border-2 border-zinc-950 bg-zinc-950">
                        <div
                          className="h-full bg-zinc-50"
                          style={{
                            width: `${(factions.factionOne.playerRivalry / 1) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{factions.factionOne.playerRivalry}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div> */}
              <div className="flex w-full items-center justify-between gap-2">
                <p>Faction Two Trust</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="h-2 w-20 rounded-full border-2 border-zinc-950 bg-zinc-950">
                        <div
                          className="h-full bg-zinc-50"
                          style={{
                            width: `${(factions.factionOne.factionTrust / 1) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{factions.factionOne.factionTrust}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {/* <div className="flex w-full items-center justify-between gap-2">
                <p>Faction Two Rivalry</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="h-2 w-20 rounded-full border-2 border-zinc-950 bg-zinc-950">
                        <div
                          className="h-full bg-zinc-50"
                          style={{
                            width: `${(factions.factionOne.factionRivalry / 1) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{factions.factionOne.factionRivalry}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div> */}
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-lg border-2 border-zinc-950 bg-zinc-600 p-4 text-white">
            <h1 className="text-center">Faction 2</h1>
            <div className="flex flex-col gap-2">
              <div className="flex w-full items-center justify-between gap-2">
                <p>Aggression</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="h-2 w-20 rounded-full border-2 border-zinc-950 bg-zinc-950">
                        <div
                          className="h-full bg-zinc-50"
                          style={{
                            width: `${(factions.factionTwo.aggression / 3) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{factions.factionTwo.aggression}</p>
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
                            width: `${(factions.factionTwo.tech / 3) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{factions.factionTwo.tech}</p>
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
                            width: `${(factions.factionTwo.endurance / 3) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{factions.factionTwo.endurance}</p>
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
                            width: `${(factions.factionTwo.wealth / 3) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{factions.factionTwo.wealth}</p>
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
                            width: `${(factions.factionTwo.influence / 3) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{factions.factionTwo.influence}</p>
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
                            width: `${(factions.factionTwo.manpower / 100) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{factions.factionTwo.manpower}</p>
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
                            width: `${(factions.factionTwo.resources / 100) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{factions.factionTwo.resources}</p>
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
                            width: `${(factions.factionTwo.playerTrust / 1) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{factions.factionTwo.playerTrust}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {/* <div className="flex w-full items-center justify-between gap-2">
                <p>Player Rivalry</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="h-2 w-20 rounded-full border-2 border-zinc-950 bg-zinc-950">
                        <div
                          className="h-full bg-zinc-50"
                          style={{
                            width: `${(factions.factionTwo.playerRivalry / 1) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{factions.factionTwo.playerRivalry}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div> */}
              <div className="flex w-full items-center justify-between gap-2">
                <p>Faction One Trust</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="h-2 w-20 rounded-full border-2 border-zinc-950 bg-zinc-950">
                        <div
                          className="h-full bg-zinc-50"
                          style={{
                            width: `${(factions.factionTwo.factionTrust / 1) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{factions.factionTwo.factionTrust}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {/* <div className="flex w-full items-center justify-between gap-2">
                <p>Faction One Rivalry</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="h-2 w-20 rounded-full border-2 border-zinc-950 bg-zinc-950">
                        <div
                          className="h-full bg-zinc-50"
                          style={{
                            width: `${(factions.factionTwo.factionRivalry / 1) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{factions.factionTwo.factionRivalry}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div> */}
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-lg border-2 border-zinc-950 bg-zinc-600 p-4 text-white">
            <h1 className="text-center">Player</h1>
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  placeholder="Kill count"
                  value={attackValue}
                  onChange={(e) => setAttackValue(e.target.value)}
                />
                <Button
                  disabled={isDone || !attackValue}
                  onClick={() =>
                    onPlayerAttackFactionHandlerWithInteraction("one")
                  }
                >
                  Attack Faction 1
                </Button>
                <Button
                  disabled={isDone || !attackValue}
                  onClick={() =>
                    onPlayerAttackFactionHandlerWithInteraction("two")
                  }
                >
                  Attack Faction 2
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  placeholder="Trade count"
                  value={tradeValue}
                  onChange={(e) => setTradeValue(e.target.value)}
                />
                <Button
                  disabled={isDone || !tradeValue}
                  onClick={() =>
                    onPlayerTradeFactionHandlerWithInteraction("one")
                  }
                >
                  Trade with Faction 1
                </Button>
                <Button
                  disabled={isDone || !tradeValue}
                  onClick={() =>
                    onPlayerTradeFactionHandlerWithInteraction("two")
                  }
                >
                  Trade with Faction 2
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  disabled={isDone}
                  onClick={() =>
                    onPlayerAllianceFactionHandlerWithInteraction("one")
                  }
                >
                  Form alliance with Faction 1
                </Button>
                <Button
                  disabled={isDone}
                  onClick={() =>
                    onPlayerAllianceFactionHandlerWithInteraction("two")
                  }
                >
                  Form alliance with Faction 2
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Simulator />
      </div>
    </>
  );
};

export default Game;
