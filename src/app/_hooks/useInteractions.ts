/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { type Faction, useFactionsAtom } from "../_atoms/factions.atom";
import { type Log, useSetLogsAtomValue } from "../_atoms/logs.atom";
import {
  useLastPlayerInteractionAtom,
  useSetLastPlayerInteractionAtomValue,
} from "../_atoms/lastPlayerAction.atom";
import { useState } from "react";

type AttributesContainer = Record<
  string,
  {
    aggression: number;
    tech: number;
    endurance: number;
    wealth: number;
    influence: number;
    manpower: number;
    resources: number;
    trust: number;
  }
>;

interface FactionAttributes {
  aggression: number;
  tech: number;
  endurance: number;
  wealth: number;
  influence: number;
  resources: number;
  trust: number;
  manpower?: number;
  [key: string]: number | undefined;
}

export default function useInteractions() {
  const setLogs = useSetLogsAtomValue();
  const [factionsState, setFactionsState] = useFactionsAtom();
  const [lastPlayerInteraction] = useLastPlayerInteractionAtom();
  const setLastPlayerInteraction = useSetLastPlayerInteractionAtomValue();
  const [isStarted, setIsStarted] = useState(false);
  const [lastAIInitiator, setLastAIInitiator] = useState("");

  const updateLogs = (newLogs: Log[]) => {
    let index = 0;

    const addNextLog = () => {
      if (index < newLogs.length) {
        setLogs((prev) => [...prev, newLogs[index]!]);
        index++;
        setTimeout(addNextLog, 1000);
      }
    };

    addNextLog();
  };

  const onFactionAttackFactionHandler = (
    attackerFactionId: string,
    defenderFactionId: string,
    attackValue: number,
  ) => {
    const factions = factionsState.factions;
    const attacker = factions[attackerFactionId];
    const defender = factions[defenderFactionId];

    if (!attacker || !defender) {
      updateLogs([
        {
          message: `Attack denied: One or more factions not found`,
          type: "warning",
        },
      ]);
      return;
    }

    const newLogs: Log[] = [];

    if (attackValue > attacker.manpower) {
      newLogs.push({
        message: `Attack denied: ${attacker.name} does not have enough manpower`,
        type: "warning",
      });
      updateLogs(newLogs);
      return;
    }

    const attackerAttributes = {
      aggression: attacker.aggression,
      tech: attacker.tech,
      endurance: attacker.endurance,
      wealth: attacker.wealth,
      influence: attacker.influence,
      manpower: attacker.manpower,
      resources: attacker.resources,
      trust: attacker.trustTowards[defenderFactionId] || 0.5,
    };

    const defenderAttributes = {
      aggression: defender.aggression,
      tech: defender.tech,
      endurance: defender.endurance,
      wealth: defender.wealth,
      influence: defender.influence,
      manpower: defender.manpower,
      resources: defender.resources,
      trust: defender.trustTowards[attackerFactionId] || 0.5,
    };

    const weights = {
      aggression: 0.2,
      tech: 0.2,
      endurance: 0.15,
      wealth: 0.15,
      influence: 0.1,
      manpower: 0.1,
      trust: 0.1,
    };

    const attackerStrength =
      attackerAttributes.aggression * weights.aggression +
      attackerAttributes.tech * weights.tech +
      attackerAttributes.endurance * weights.endurance +
      attackerAttributes.wealth * weights.wealth +
      attackerAttributes.influence * weights.influence +
      attackerAttributes.manpower * weights.manpower;

    const trustImpact =
      (defenderAttributes.trust - attackerAttributes.trust) * weights.trust;

    const defenderStrength =
      defenderAttributes.aggression * weights.aggression +
      defenderAttributes.tech * weights.tech +
      defenderAttributes.endurance * weights.endurance +
      defenderAttributes.wealth * weights.wealth +
      defenderAttributes.influence * weights.influence +
      defenderAttributes.manpower * weights.manpower +
      trustImpact;

    const attackerAdvantage =
      attackerStrength / (attackerStrength + defenderStrength);
    const attackBoost = Math.pow(attackValue, 0.7) * 0.4;
    const WO =
      (attackerAdvantage +
        attackBoost / (attackerStrength + defenderStrength)) /
      (1 + attackBoost / (attackerStrength + defenderStrength));

    const attackerWon = WO > 0.5;

    newLogs.push({
      message: `War outcome: ${attacker.name} ${attackerWon ? "Won" : "Lost"} against ${defender.name}`,
      type: "warning",
    });

    const updatedAttackerManpower = Math.max(
      0,
      attackerAttributes.manpower - attackValue * 0.7,
    );
    const defenderLosses = attackerWon ? attackValue : attackValue * 0.5;
    const updatedDefenderManpower = Math.max(
      1,
      defenderAttributes.manpower - defenderLosses,
    );

    newLogs.push({
      message: `${attacker.name} manpower reduced to ${updatedAttackerManpower.toFixed(2)}`,
      type: "error",
    });
    newLogs.push({
      message: `${defender.name} manpower reduced to ${updatedDefenderManpower.toFixed(2)}`,
      type: "error",
    });

    const impactSeverity = Math.min(
      0.9,
      attackValue / defenderAttributes.manpower,
    );
    const baseImpactPercentage = impactSeverity * 40;

    const updatedAttributes: AttributesContainer = {
      [attackerFactionId]: { ...attackerAttributes },
      [defenderFactionId]: { ...defenderAttributes },
    };

    updatedAttributes[defenderFactionId]!.trust = Math.max(
      0,
      Math.min(1, defenderAttributes.trust - impactSeverity * 0.5),
    );
    updatedAttributes[attackerFactionId]!.trust = Math.max(
      0,
      Math.min(1, attackerAttributes.trust - impactSeverity * 0.2),
    );

    newLogs.push({
      message: `${defender.name}'s trust in ${attacker.name} decreased to ${updatedAttributes[defenderFactionId]!.trust.toFixed(2)}`,
      type: "error",
    });
    newLogs.push({
      message: `${attacker.name}'s trust in ${defender.name} decreased to ${updatedAttributes[attackerFactionId]!.trust.toFixed(2)}`,
      type: "error",
    });

    const changePercent = baseImpactPercentage / 100;

    if (attackerWon) {
      // Winner changes
      applyAttributeChange(
        attackerFactionId,
        "aggression",
        1.2,
        changePercent,
        newLogs,
        updatedAttributes,
        attacker.name,
      );
      applyAttributeChange(
        attackerFactionId,
        "tech",
        1.0,
        changePercent,
        newLogs,
        updatedAttributes,
        attacker.name,
      );
      applyAttributeChange(
        attackerFactionId,
        "endurance",
        -1.0,
        changePercent,
        newLogs,
        updatedAttributes,
        attacker.name,
      );
      applyAttributeChange(
        attackerFactionId,
        "wealth",
        -1.5,
        changePercent,
        newLogs,
        updatedAttributes,
        attacker.name,
      );
      applyAttributeChange(
        attackerFactionId,
        "influence",
        1.5,
        changePercent,
        newLogs,
        updatedAttributes,
        attacker.name,
      );

      // Resource changes for winner
      const resourceLoss = impactSeverity * attackValue * 0.4;
      const resourceGain = impactSeverity * defenderAttributes.resources * 0.25;
      updatedAttributes[attackerFactionId]!.resources = Math.max(
        0,
        attackerAttributes.resources - resourceLoss + resourceGain,
      );

      newLogs.push({
        message: `${attacker.name} resources changed to ${updatedAttributes[attackerFactionId]!.resources.toFixed(2)}`,
        type:
          updatedAttributes[attackerFactionId]!.resources >
          attackerAttributes.resources
            ? "success"
            : "error",
      });

      // Loser changes
      const defenderAggressionDir = defenderAttributes.aggression > 2 ? 1 : -1;
      applyAttributeChange(
        defenderFactionId,
        "aggression",
        2.0 * defenderAggressionDir,
        changePercent,
        newLogs,
        updatedAttributes,
        defender.name,
      );
      applyAttributeChange(
        defenderFactionId,
        "tech",
        1.2,
        changePercent,
        newLogs,
        updatedAttributes,
        defender.name,
      );
      applyAttributeChange(
        defenderFactionId,
        "endurance",
        -1.8,
        changePercent,
        newLogs,
        updatedAttributes,
        defender.name,
      );
      applyAttributeChange(
        defenderFactionId,
        "wealth",
        -2.5,
        changePercent,
        newLogs,
        updatedAttributes,
        defender.name,
      );
      applyAttributeChange(
        defenderFactionId,
        "influence",
        -2.0,
        changePercent,
        newLogs,
        updatedAttributes,
        defender.name,
      );

      // Resource changes for loser
      const defenderResourceChange =
        impactSeverity * attackValue * 0.6 + resourceGain;
      updatedAttributes[defenderFactionId]!.resources = Math.max(
        0,
        defenderAttributes.resources - defenderResourceChange,
      );

      newLogs.push({
        message: `${defender.name} resources decreased to ${updatedAttributes[defenderFactionId]!.resources.toFixed(2)}`,
        type: "error",
      });
    } else {
      // Attacker lost
      const attackerAggressionDir = attackerAttributes.aggression > 2 ? 1 : -1;
      applyAttributeChange(
        attackerFactionId,
        "aggression",
        1.5 * attackerAggressionDir,
        changePercent,
        newLogs,
        updatedAttributes,
        attacker.name,
      );
      applyAttributeChange(
        attackerFactionId,
        "tech",
        1.5,
        changePercent,
        newLogs,
        updatedAttributes,
        attacker.name,
      );
      applyAttributeChange(
        attackerFactionId,
        "endurance",
        -2.0,
        changePercent,
        newLogs,
        updatedAttributes,
        attacker.name,
      );
      applyAttributeChange(
        attackerFactionId,
        "wealth",
        -2.5,
        changePercent,
        newLogs,
        updatedAttributes,
        attacker.name,
      );
      applyAttributeChange(
        attackerFactionId,
        "influence",
        -2.0,
        changePercent,
        newLogs,
        updatedAttributes,
        attacker.name,
      );

      // Resource changes for failed attacker
      const attackerResourceChange = impactSeverity * attackValue * 0.7;
      updatedAttributes[attackerFactionId]!.resources = Math.max(
        0,
        attackerAttributes.resources - attackerResourceChange,
      );

      newLogs.push({
        message: `${attacker.name} resources decreased to ${updatedAttributes[attackerFactionId]!.resources.toFixed(2)}`,
        type: "error",
      });

      // Defender won
      applyAttributeChange(
        defenderFactionId,
        "aggression",
        1.0,
        changePercent,
        newLogs,
        updatedAttributes,
        defender.name,
      );
      applyAttributeChange(
        defenderFactionId,
        "tech",
        0.8,
        changePercent,
        newLogs,
        updatedAttributes,
        defender.name,
      );
      applyAttributeChange(
        defenderFactionId,
        "endurance",
        -0.7,
        changePercent,
        newLogs,
        updatedAttributes,
        defender.name,
      );
      applyAttributeChange(
        defenderFactionId,
        "wealth",
        -1.2,
        changePercent,
        newLogs,
        updatedAttributes,
        defender.name,
      );
      applyAttributeChange(
        defenderFactionId,
        "influence",
        1.5,
        changePercent,
        newLogs,
        updatedAttributes,
        defender.name,
      );

      // Resource changes for successful defender
      const defenderResourceChange = impactSeverity * attackValue * 0.4;
      updatedAttributes[defenderFactionId]!.resources = Math.max(
        0,
        defenderAttributes.resources - defenderResourceChange,
      );

      newLogs.push({
        message: `${defender.name} resources decreased to ${updatedAttributes[defenderFactionId]!.resources.toFixed(2)}`,
        type: "error",
      });
    }

    // Update factions with new values
    const updatedFactions = { ...factionsState.factions };

    // Update attacker
    updatedFactions[attackerFactionId] = {
      ...attacker,
      manpower: updatedAttackerManpower,
      aggression: updatedAttributes[attackerFactionId]!.aggression,
      tech: updatedAttributes[attackerFactionId]!.tech,
      endurance: updatedAttributes[attackerFactionId]!.endurance,
      wealth: updatedAttributes[attackerFactionId]!.wealth,
      influence: updatedAttributes[attackerFactionId]!.influence,
      resources: updatedAttributes[attackerFactionId]!.resources,
      trustTowards: {
        ...attacker.trustTowards,
        [defenderFactionId]: updatedAttributes[attackerFactionId]!.trust,
      },
    };

    // Update defender
    updatedFactions[defenderFactionId] = {
      ...defender,
      manpower: updatedDefenderManpower,
      aggression: updatedAttributes[defenderFactionId]!.aggression,
      tech: updatedAttributes[defenderFactionId]!.tech,
      endurance: updatedAttributes[defenderFactionId]!.endurance,
      wealth: updatedAttributes[defenderFactionId]!.wealth,
      influence: updatedAttributes[defenderFactionId]!.influence,
      resources: updatedAttributes[defenderFactionId]!.resources,
      trustTowards: {
        ...defender.trustTowards,
        [attackerFactionId]: updatedAttributes[defenderFactionId]!.trust,
      },
    };

    setFactionsState({
      ...factionsState,
      factions: updatedFactions,
    });

    updateLogs(newLogs);
  };

  const applyAttributeChange = (
    factionId: string,
    attribute: keyof Omit<FactionAttributes, "manpower" | "resources">,
    multiplier: number,
    changePercent: number,
    logs: Log[],
    attributesObj: AttributesContainer,
    factionName: string,
  ) => {
    if (!attributesObj[factionId]) return;

    const attributes: FactionAttributes = attributesObj[factionId];
    const current = attributes[attribute];

    if (current === undefined) return;

    const change = changePercent * current * multiplier;
    const updated = Math.max(1, Math.min(3, current + change));
    // @ts-expect-error: This is safe because we know the attribute exists
    attributesObj[factionId][attribute] = updated;

    logs.push({
      message: `${factionName} ${attribute} ${change > 0 ? "increased" : "decreased"} to ${updated.toFixed(2)}`,
      type: change > 0 ? "success" : "error",
    });
  };

  const onFactionAllianceFactionHandler = (
    initiatorFactionId: string,
    recipientFactionId: string,
  ) => {
    const factions = factionsState.factions;
    const initiator = factions[initiatorFactionId];
    const recipient = factions[recipientFactionId];

    if (!initiator || !recipient) {
      updateLogs([
        {
          message: `Alliance denied: One or more factions not found`,
          type: "warning",
        },
      ]);
      return;
    }

    const newLogs: Log[] = [];

    // Extract attributes
    const initiatorAttr = {
      aggression: initiator.aggression,
      tech: initiator.tech,
      endurance: initiator.endurance,
      wealth: initiator.wealth,
      influence: initiator.influence,
      resources: initiator.resources,
      trust: initiator.trustTowards[recipientFactionId] || 0.5,
    };

    const recipientAttr = {
      aggression: recipient.aggression,
      tech: recipient.tech,
      endurance: recipient.endurance,
      wealth: recipient.wealth,
      influence: recipient.influence,
      resources: recipient.resources,
      trust: recipient.trustTowards[initiatorFactionId] || 0.5,
    };

    // Calculate acceptance probability - simplified
    const weights = {
      aggression: -0.3,
      influence: 0.2,
      tech: 0.15,
      wealth: 0.15,
      endurance: 0.1,
      trust: 0.3,
    };

    // Power calculation
    const initiatorPower =
      (initiatorAttr.aggression +
        initiatorAttr.tech +
        initiatorAttr.endurance +
        initiatorAttr.wealth +
        initiatorAttr.influence) /
      5;
    const recipientPower =
      (recipientAttr.aggression +
        recipientAttr.tech +
        recipientAttr.endurance +
        recipientAttr.wealth +
        recipientAttr.influence) /
      5;

    const powerRatio = initiatorPower / recipientPower;
    const powerBalance = Math.max(0, 1 - Math.abs(powerRatio - 1.0));
    const powerBalanceWeight = 0.2;

    // Calculate compatibility factors
    const techCompatibility =
      1 - Math.abs(initiatorAttr.tech - recipientAttr.tech) / 2;
    const techCompatibilityWeight = 0.1;

    // Calculate recipient's willingness
    const allianceWillingness =
      ((recipientAttr.aggression - 1) / 2) * weights.aggression +
      ((recipientAttr.influence - 1) / 2) * weights.influence +
      ((recipientAttr.tech - 1) / 2) * weights.tech +
      ((recipientAttr.wealth - 1) / 2) * weights.wealth +
      ((recipientAttr.endurance - 1) / 2) * weights.endurance +
      powerBalance * powerBalanceWeight +
      techCompatibility * techCompatibilityWeight +
      recipientAttr.trust * weights.trust;

    // Recovery mechanic - make alliance more likely when recipient has low stats and needs help
    const recoveryFactor =
      recipientAttr.endurance < 1.5 || recipientAttr.wealth < 1.5 ? 0.2 : 0;

    // Calculate acceptance probability - added recovery factor
    const acceptanceProbability = 0.35 + allianceWillingness + recoveryFactor;
    const allianceAccepted = acceptanceProbability > 0.5;

    // Determine reason for decision
    const factors = [
      {
        name: "Aggression Level",
        value: ((recipientAttr.aggression - 1) / 2) * weights.aggression,
      },
      {
        name: "Influence Status",
        value: ((recipientAttr.influence - 1) / 2) * weights.influence,
      },
      {
        name: "Tech Compatibility",
        value: techCompatibility * techCompatibilityWeight,
      },
      { name: "Power Balance", value: powerBalance * powerBalanceWeight },
      { name: "Trust Level", value: recipientAttr.trust * weights.trust },
    ];

    factors.sort((a, b) => b.value - a.value);
    const topFactor = factors[0]!;
    const bottomFactor = factors[factors.length - 1]!;

    let reason = "";
    if (allianceAccepted) {
      reason =
        topFactor.name === "Trust Level"
          ? "high levels of trust between factions"
          : `favorable ${topFactor.name.toLowerCase()} was decisive`;
    } else {
      reason =
        bottomFactor.value < 0
          ? `unfavorable ${bottomFactor.name.toLowerCase()} prevented alliance`
          : recipientAttr.trust < 0.3
            ? "historical distrust impeded cooperation"
            : "insufficient mutual benefit perceived";
    }

    newLogs.push({
      message: `Alliance proposal from ${initiator.name} to ${recipient.name}: ${allianceAccepted ? "Accepted" : "Rejected"} (${reason})`,
      type: "warning",
    });

    if (allianceAccepted) {
      // Prepare attribute change containers
      const updatedAttributes = {
        [initiatorFactionId]: { ...initiatorAttr },
        [recipientFactionId]: { ...recipientAttr },
      };

      const baseImpactPercentage = 35;
      const changePercent = baseImpactPercentage / 100;

      // Trust recovery mechanic - both sides gain significant trust
      const initiatorTrustGain =
        Math.min(0.8, 1 - initiatorAttr.trust) * changePercent * 2.5;
      const recipientTrustGain =
        Math.min(0.8, 1 - recipientAttr.trust) * changePercent * 2.8;

      updatedAttributes[initiatorFactionId]!.trust = Math.min(
        1,
        initiatorAttr.trust + initiatorTrustGain,
      );
      updatedAttributes[recipientFactionId]!.trust = Math.min(
        1,
        recipientAttr.trust + recipientTrustGain,
      );

      newLogs.push({
        message: `${initiator.name}'s trust increased to ${updatedAttributes[initiatorFactionId]!.trust.toFixed(2)}`,
        type: "success",
      });
      newLogs.push({
        message: `${recipient.name}'s trust increased to ${updatedAttributes[recipientFactionId]!.trust.toFixed(2)}`,
        type: "success",
      });

      // Initiator changes
      applyAllianceChange(
        initiatorFactionId,
        "aggression",
        -1.0,
        changePercent,
        newLogs,
        updatedAttributes,
        initiator.name,
      );
      applyAllianceChange(
        initiatorFactionId,
        "influence",
        1.5,
        changePercent,
        newLogs,
        updatedAttributes,
        initiator.name,
      );
      applyAllianceChange(
        initiatorFactionId,
        "tech",
        1.0,
        changePercent,
        newLogs,
        updatedAttributes,
        initiator.name,
      );
      applyAllianceChange(
        initiatorFactionId,
        "endurance",
        0.8,
        changePercent,
        newLogs,
        updatedAttributes,
        initiator.name,
      );
      applyAllianceChange(
        initiatorFactionId,
        "wealth",
        0.7,
        changePercent,
        newLogs,
        updatedAttributes,
        initiator.name,
      );

      // Resource change for initiator
      const initiatorResourceChange = initiatorAttr.resources * 0.05;
      updatedAttributes[initiatorFactionId]!.resources =
        initiatorAttr.resources + initiatorResourceChange;
      newLogs.push({
        message: `${initiator.name} resources increased to ${updatedAttributes[initiatorFactionId]!.resources.toFixed(2)}`,
        type: "success",
      });

      // Recipient changes
      applyAllianceChange(
        recipientFactionId,
        "aggression",
        -1.1,
        changePercent,
        newLogs,
        updatedAttributes,
        recipient.name,
      );
      applyAllianceChange(
        recipientFactionId,
        "influence",
        1.4,
        changePercent,
        newLogs,
        updatedAttributes,
        recipient.name,
      );
      applyAllianceChange(
        recipientFactionId,
        "tech",
        1.1,
        changePercent,
        newLogs,
        updatedAttributes,
        recipient.name,
      );
      applyAllianceChange(
        recipientFactionId,
        "endurance",
        0.9,
        changePercent,
        newLogs,
        updatedAttributes,
        recipient.name,
      );
      applyAllianceChange(
        recipientFactionId,
        "wealth",
        0.6,
        changePercent,
        newLogs,
        updatedAttributes,
        recipient.name,
      );

      // Resource change for recipient
      const recipientResourceChange = recipientAttr.resources * 0.05;
      updatedAttributes[recipientFactionId]!.resources =
        recipientAttr.resources + recipientResourceChange;
      newLogs.push({
        message: `${recipient.name} resources increased to ${updatedAttributes[recipientFactionId]!.resources.toFixed(2)}`,
        type: "success",
      });

      // Update factions
      const updatedFactions = { ...factionsState.factions };

      // Update initiator
      updatedFactions[initiatorFactionId] = {
        ...initiator,
        aggression: updatedAttributes[initiatorFactionId]!.aggression,
        tech: updatedAttributes[initiatorFactionId]!.tech,
        endurance: updatedAttributes[initiatorFactionId]!.endurance,
        wealth: updatedAttributes[initiatorFactionId]!.wealth,
        influence: updatedAttributes[initiatorFactionId]!.influence,
        resources: updatedAttributes[initiatorFactionId]!.resources,
        trustTowards: {
          ...initiator.trustTowards,
          [recipientFactionId]: updatedAttributes[initiatorFactionId]!.trust,
        },
      };

      // Update recipient
      updatedFactions[recipientFactionId] = {
        ...recipient,
        aggression: updatedAttributes[recipientFactionId]!.aggression,
        tech: updatedAttributes[recipientFactionId]!.tech,
        endurance: updatedAttributes[recipientFactionId]!.endurance,
        wealth: updatedAttributes[recipientFactionId]!.wealth,
        influence: updatedAttributes[recipientFactionId]!.influence,
        resources: updatedAttributes[recipientFactionId]!.resources,
        trustTowards: {
          ...recipient.trustTowards,
          [initiatorFactionId]: updatedAttributes[recipientFactionId]!.trust,
        },
      };

      setFactionsState({
        ...factionsState,
        factions: updatedFactions,
      });
    } else {
      // Alliance rejected - less severe changes
      const impactPercentage = 10;
      const changePercent = impactPercentage / 100;

      // Trust changes - smaller than before
      const initiatorTrustChange = initiatorAttr.trust * changePercent * 0.4;
      const recipientTrustChange = recipientAttr.trust * changePercent * 0.35;

      const updatedInitiatorTrust = Math.max(
        0,
        initiatorAttr.trust - initiatorTrustChange,
      );
      const updatedRecipientTrust = Math.max(
        0,
        recipientAttr.trust - recipientTrustChange,
      );

      // Aggression changes
      const initiatorAggressionChange =
        initiatorAttr.aggression * changePercent * 0.5;
      const recipientAggressionChange =
        recipientAttr.aggression * changePercent * 0.3;

      const updatedInitiatorAggression = Math.min(
        3,
        initiatorAttr.aggression + initiatorAggressionChange,
      );
      const updatedRecipientAggression = Math.min(
        3,
        recipientAttr.aggression + recipientAggressionChange,
      );

      newLogs.push({
        message: `${initiator.name}'s trust decreased to ${updatedInitiatorTrust.toFixed(2)}`,
        type: "error",
      });
      newLogs.push({
        message: `${initiator.name} aggression increased to ${updatedInitiatorAggression.toFixed(2)}`,
        type: "success",
      });

      // Update factions
      const updatedFactions = { ...factionsState.factions };

      // Update initiator
      updatedFactions[initiatorFactionId] = {
        ...initiator,
        aggression: updatedInitiatorAggression,
        trustTowards: {
          ...initiator.trustTowards,
          [recipientFactionId]: updatedInitiatorTrust,
        },
      };

      // Update recipient
      updatedFactions[recipientFactionId] = {
        ...recipient,
        aggression: updatedRecipientAggression,
        trustTowards: {
          ...recipient.trustTowards,
          [initiatorFactionId]: updatedRecipientTrust,
        },
      };

      setFactionsState({
        ...factionsState,
        factions: updatedFactions,
      });
    }

    updateLogs(newLogs);
  };

  const applyAllianceChange = (
    factionId: string,
    attribute: keyof Omit<
      FactionAttributes,
      "manpower" | "resources" | "trust"
    >,
    multiplier: number,
    changePercent: number,
    logs: Log[],
    attributesObj: Record<string, FactionAttributes>,
    factionName: string,
  ) => {
    if (!attributesObj[factionId]) return;

    const current = attributesObj[factionId][attribute];

    if (current === undefined) return;

    const change = changePercent * current * multiplier;
    const updated = Math.max(1, Math.min(3, current + change));
    attributesObj[factionId][attribute] = updated;

    logs.push({
      message: `${factionName} ${attribute} ${change > 0 ? "increased" : "decreased"} to ${updated.toFixed(2)}`,
      type: change > 0 ? "success" : "error",
    });
  };

  const onFactionTradeFactionHandler = (
    initiatorFactionId: string,
    recipientFactionId: string,
    tradeAmount: number,
  ) => {
    const factions = factionsState.factions;
    const initiator = factions[initiatorFactionId];
    const recipient = factions[recipientFactionId];

    if (!initiator || !recipient) {
      updateLogs([
        {
          message: `Trade denied: One or more factions not found`,
          type: "warning",
        },
      ]);
      return;
    }

    const newLogs: Log[] = [];

    if (tradeAmount <= 0) {
      newLogs.push({
        message: `Trade denied: Trade amount must be greater than 0`,
        type: "warning",
      });
      updateLogs(newLogs);
      return;
    }

    if (tradeAmount > initiator.resources * 0.5) {
      newLogs.push({
        message: `Trade denied: Cannot trade more than 50% of available resources`,
        type: "warning",
      });
      updateLogs(newLogs);
      return;
    }

    // Extract attributes
    const initiatorAttr = {
      aggression: initiator.aggression,
      tech: initiator.tech,
      endurance: initiator.endurance,
      wealth: initiator.wealth,
      influence: initiator.influence,
      resources: initiator.resources,
      trust: initiator.trustTowards[recipientFactionId] || 0.5,
    };

    const recipientAttr = {
      aggression: recipient.aggression,
      tech: recipient.tech,
      endurance: recipient.endurance,
      wealth: recipient.wealth,
      influence: recipient.influence,
      resources: recipient.resources,
      trust: recipient.trustTowards[initiatorFactionId] || 0.5,
    };

    // Calculate trade acceptance probability
    const weights = {
      wealth: 0.2,
      influence: 0.15,
      aggression: -0.15,
      tech: 0.1,
      trust: 0.25,
    };

    // Trade willingness calculation
    const tradeWillingness =
      ((recipientAttr.wealth - 1) / 2) * weights.wealth +
      ((recipientAttr.influence - 1) / 2) * weights.influence +
      ((recipientAttr.aggression - 1) / 2) * weights.aggression +
      ((recipientAttr.tech - 1) / 2) * weights.tech +
      recipientAttr.trust * weights.trust;

    // Trade attractiveness - how valuable this trade is to the recipient
    const tradeSizeRatio = Math.min(
      1,
      tradeAmount / (recipientAttr.resources * 3),
    );
    const tradeAttractivenessForRecipient = tradeSizeRatio * 0.2;

    // Relationship factor considering history through trust
    const relationshipFactor =
      Math.min(1, Math.max(0, (3 - initiatorAttr.aggression) / 2)) * 0.1 +
      Math.min(1, Math.max(0, recipientAttr.trust)) * 0.15;

    // Technology exchange potential - higher when tech levels differ
    const techExchangePotential =
      Math.abs(initiatorAttr.tech - recipientAttr.tech) * 0.05;

    // Calculate acceptance probability
    const acceptanceProbability =
      tradeWillingness +
      tradeAttractivenessForRecipient +
      relationshipFactor +
      techExchangePotential;

    // Determine if trade is accepted
    const tradeAccepted = acceptanceProbability > 0.5;

    // Determine reason for decision
    const factors = [
      {
        name: "Wealth Status",
        value: ((recipientAttr.wealth - 1) / 2) * weights.wealth,
      },
      {
        name: "Influence",
        value: ((recipientAttr.influence - 1) / 2) * weights.influence,
      },
      {
        name: "Aggression",
        value: ((recipientAttr.aggression - 1) / 2) * weights.aggression,
      },
      { name: "Tech Exchange", value: techExchangePotential },
      { name: "Trade Value", value: tradeAttractivenessForRecipient },
      { name: "Relationship", value: relationshipFactor },
      { name: "Trust Level", value: recipientAttr.trust * weights.trust },
    ];

    factors.sort((a, b) => b.value - a.value);
    const topFactor = factors[0]!;

    const reason = tradeAccepted
      ? topFactor.name === "Trust Level"
        ? "high level of trust facilitated agreement"
        : `high ${topFactor.name.toLowerCase()} was the deciding factor`
      : recipientAttr.trust < 0.3
        ? "lack of trust impeded negotiations"
        : "insufficient trading incentives";

    newLogs.push({
      message: `Trade proposal from ${initiator.name} to ${recipient.name} with value ${tradeAmount}: ${tradeAccepted ? "Accepted" : "Rejected"} (${reason})`,
      type: "warning",
    });

    // Calculate impact severity based on trade amount
    const initiatorImpactSeverity = Math.min(
      0.7,
      tradeAmount / initiatorAttr.resources,
    );
    const recipientImpactSeverity = Math.min(
      0.7,
      tradeAmount / recipientAttr.resources,
    );

    // Calculate base percentage changes
    const initiatorBaseImpactPercentage = initiatorImpactSeverity * 25;
    const recipientBaseImpactPercentage = recipientImpactSeverity * 25;

    if (tradeAccepted) {
      // Prepare attribute change containers
      const updatedAttributes = {
        [initiatorFactionId]: { ...initiatorAttr },
        [recipientFactionId]: { ...recipientAttr },
      };

      const initiatorChangePercent = initiatorBaseImpactPercentage / 100;
      const recipientChangePercent = recipientBaseImpactPercentage / 100;

      // Trust changes - both sides gain trust from successful trade
      // More significant trust recovery
      const trustFactor = Math.max(
        0.5,
        Math.min(1.0, 1.0 - (initiatorAttr.trust + recipientAttr.trust) / 2),
      );
      const initiatorTrustGain = trustFactor * initiatorChangePercent * 1.5;
      const recipientTrustGain = trustFactor * recipientChangePercent * 1.3;

      updatedAttributes[initiatorFactionId]!.trust = Math.min(
        1,
        initiatorAttr.trust + initiatorTrustGain,
      );
      updatedAttributes[recipientFactionId]!.trust = Math.min(
        1,
        recipientAttr.trust + recipientTrustGain,
      );

      newLogs.push({
        message: `${initiator.name}'s trust increased to ${updatedAttributes[initiatorFactionId]!.trust.toFixed(2)}`,
        type: "success",
      });
      newLogs.push({
        message: `${recipient.name}'s trust increased to ${updatedAttributes[recipientFactionId]!.trust.toFixed(2)}`,
        type: "success",
      });

      // Initiator changes
      applyTradeChange(
        initiatorFactionId,
        "wealth",
        1.0,
        initiatorChangePercent,
        newLogs,
        updatedAttributes,
        initiator.name,
      );
      applyTradeChange(
        initiatorFactionId,
        "influence",
        0.7,
        initiatorChangePercent,
        newLogs,
        updatedAttributes,
        initiator.name,
      );
      applyTradeChange(
        initiatorFactionId,
        "aggression",
        -0.5,
        initiatorChangePercent,
        newLogs,
        updatedAttributes,
        initiator.name,
      );
      applyTradeChange(
        initiatorFactionId,
        "tech",
        0.6,
        initiatorChangePercent,
        newLogs,
        updatedAttributes,
        initiator.name,
      );

      // Resource changes for initiator
      updatedAttributes[initiatorFactionId]!.resources = Math.max(
        1,
        initiatorAttr.resources - tradeAmount,
      );
      newLogs.push({
        message: `${initiator.name} resources decreased to ${updatedAttributes[initiatorFactionId]!.resources.toFixed(2)}`,
        type: "error",
      });

      // Recipient changes
      applyTradeChange(
        recipientFactionId,
        "wealth",
        1.0,
        recipientChangePercent,
        newLogs,
        updatedAttributes,
        recipient.name,
      );
      applyTradeChange(
        recipientFactionId,
        "influence",
        0.6,
        recipientChangePercent,
        newLogs,
        updatedAttributes,
        recipient.name,
      );
      applyTradeChange(
        recipientFactionId,
        "aggression",
        -0.4,
        recipientChangePercent,
        newLogs,
        updatedAttributes,
        recipient.name,
      );
      applyTradeChange(
        recipientFactionId,
        "tech",
        0.5,
        recipientChangePercent,
        newLogs,
        updatedAttributes,
        recipient.name,
      );

      // Resource changes for recipient - added bonus to make trade more worthwhile
      const recipientGainMultiplier =
        1.2 +
        Math.min(0.3, Math.abs(initiatorAttr.tech - recipientAttr.tech) * 0.1);
      const recipientResourceGain = tradeAmount * recipientGainMultiplier;
      updatedAttributes[recipientFactionId]!.resources =
        recipientAttr.resources + recipientResourceGain;
      newLogs.push({
        message: `${recipient.name} resources increased to ${updatedAttributes[recipientFactionId]!.resources.toFixed(2)}`,
        type: "success",
      });

      // Update factions
      const updatedFactions = { ...factionsState.factions };

      // Update initiator
      updatedFactions[initiatorFactionId] = {
        ...initiator,
        aggression: updatedAttributes[initiatorFactionId]!.aggression,
        tech: updatedAttributes[initiatorFactionId]!.tech,
        endurance: updatedAttributes[initiatorFactionId]!.endurance,
        wealth: updatedAttributes[initiatorFactionId]!.wealth,
        influence: updatedAttributes[initiatorFactionId]!.influence,
        resources: updatedAttributes[initiatorFactionId]!.resources,
        trustTowards: {
          ...initiator.trustTowards,
          [recipientFactionId]: updatedAttributes[initiatorFactionId]!.trust,
        },
      };

      // Update recipient
      updatedFactions[recipientFactionId] = {
        ...recipient,
        aggression: updatedAttributes[recipientFactionId]!.aggression,
        tech: updatedAttributes[recipientFactionId]!.tech,
        endurance: updatedAttributes[recipientFactionId]!.endurance,
        wealth: updatedAttributes[recipientFactionId]!.wealth,
        influence: updatedAttributes[recipientFactionId]!.influence,
        resources: updatedAttributes[recipientFactionId]!.resources,
        trustTowards: {
          ...recipient.trustTowards,
          [initiatorFactionId]: updatedAttributes[recipientFactionId]!.trust,
        },
      };

      setFactionsState({
        ...factionsState,
        factions: updatedFactions,
      });
    } else {
      // Milder trust impacts for rejected trades
      const trustImpactPercentage = 8;
      const changePercent = trustImpactPercentage / 100;

      // Smaller trust impacts based on previous relationship
      // When trust is already low, rejection has less impact
      const trustFactor = Math.min(
        1,
        initiatorAttr.trust + recipientAttr.trust,
      );
      const initiatorTrustChange =
        initiatorAttr.trust * changePercent * 0.3 * trustFactor;
      const recipientTrustChange =
        recipientAttr.trust * changePercent * 0.15 * trustFactor;

      const updatedInitiatorTrust = Math.max(
        0,
        initiatorAttr.trust - initiatorTrustChange,
      );
      const updatedRecipientTrust = Math.max(
        0,
        recipientAttr.trust - recipientTrustChange,
      );

      newLogs.push({
        message: `${initiator.name}'s trust slightly decreased to ${updatedInitiatorTrust.toFixed(2)}`,
        type: "error",
      });

      // Update only trust values
      const updatedFactions = { ...factionsState.factions };

      // Update initiator
      updatedFactions[initiatorFactionId] = {
        ...initiator,
        trustTowards: {
          ...initiator.trustTowards,
          [recipientFactionId]: updatedInitiatorTrust,
        },
      };

      // Update recipient
      updatedFactions[recipientFactionId] = {
        ...recipient,
        trustTowards: {
          ...recipient.trustTowards,
          [initiatorFactionId]: updatedRecipientTrust,
        },
      };

      setFactionsState({
        ...factionsState,
        factions: updatedFactions,
      });
    }

    updateLogs(newLogs);
  };

  const applyTradeChange = (
    factionId: string,
    attribute: keyof Omit<
      FactionAttributes,
      "manpower" | "resources" | "trust"
    >,
    multiplier: number,
    changePercent: number,
    logs: Log[],
    attributesObj: Record<string, FactionAttributes>,
    factionName: string,
  ) => {
    if (!attributesObj[factionId]) return;

    const current = attributesObj[factionId][attribute];

    if (current === undefined) return;

    const change = changePercent * current * multiplier;
    const updated = Math.max(1, Math.min(3, current + change));
    attributesObj[factionId][attribute] = updated;

    logs.push({
      message: `${factionName} ${attribute} ${change > 0 ? "increased" : "decreased"} to ${updated.toFixed(2)}`,
      type: change > 0 ? "success" : "error",
    });
  };

  const triggerFactionInteraction = (): void => {
    const factions = factionsState.factions;

    if (Object.keys(factions).length < 2) {
      updateLogs([
        {
          message: "Faction interaction requires at least two factions",
          type: "warning",
        },
      ]);
      return;
    }

    // First, check if we should trigger recruitment (20% chance)
    if (Math.random() < 0.2) {
      // Determine which factions need/want to recruit
      const recruitmentCandidates: string[] = [];

      Object.entries(factions).forEach(([factionId, faction]) => {
        // Factors that encourage recruitment
        const needFactor =
          faction.manpower < 30 ? 0.7 : faction.manpower < 50 ? 0.3 : 0.1;

        const aggressionFactor =
          faction.aggression > 2 ? 0.4 : faction.aggression > 1.5 ? 0.2 : 0.1;

        const resourceFactor = faction.resources > 15 ? 0.3 : 0;

        const wealthFactor =
          faction.wealth > 2 ? 0.3 : faction.wealth > 1.5 ? 0.2 : 0.1;

        const randomFactor = Math.random() * 0.3;

        const recruitmentScore =
          needFactor +
          aggressionFactor +
          resourceFactor +
          wealthFactor +
          randomFactor;

        if (recruitmentScore > 0.7) {
          recruitmentCandidates.push(factionId);
        }
      });

      // If there are candidates, randomly select one to recruit
      if (recruitmentCandidates.length > 0) {
        const recruitingFaction =
          recruitmentCandidates[
            Math.floor(Math.random() * recruitmentCandidates.length)
          ];
        const faction = factions[recruitingFaction!];

        if (faction) {
          updateLogs([
            {
              message: `${faction.name} is seeking to expand their forces...`,
              type: "info",
            },
          ]);

          onFactionRecruitManpowerHandler(recruitingFaction!);
          return; // Skip other interactions this turn if recruitment happens
        }
      }
    }

    // Keep track of the last AI initiator for variety
    const lastInteractedFaction = lastPlayerInteraction.faction;

    // Calculate balanced faction scores using multiple attributes
    const factionScores: Record<string, number> = {};

    Object.entries(factions).forEach(([factionId, faction]) => {
      // Base score from multiple attributes (not just aggression)
      const baseScore =
        faction.aggression * 0.25 + // Reduced weight of aggression
        faction.influence * 0.2 + // Influential factions more likely to act
        faction.tech * 0.15 + // Tech-focused factions more active
        faction.endurance * 0.1 + // Endurance provides some initiative
        faction.wealth * 0.1; // Wealth can drive action

      // Resource-based motivation - factions with very low or very high resources are more motivated to act
      const resourceFactor =
        faction.resources < 10
          ? 0.3 // Desperate factions seek resources
          : faction.resources > 50
            ? 0.2
            : 0; // Wealthy factions use their advantage

      // Strong penalty for repeat initiators to force rotation
      const repeatInitiatorPenalty = lastAIInitiator === factionId ? -1.5 : 0;

      // Penalty if player just interacted with this faction
      const playerInteractionPenalty =
        lastInteractedFaction === factionId ? -0.5 : 0.1;

      // Add randomness to create more variety (0-0.4 random factor)
      const randomFactor = Math.random() * 0.4;

      // Calculate final score
      factionScores[factionId] =
        baseScore +
        resourceFactor +
        repeatInitiatorPenalty +
        playerInteractionPenalty +
        randomFactor;
    });

    // Find faction with highest score
    let initiatorId = Object.keys(factionScores)[0];
    let highestScore = factionScores[initiatorId!] || 0;

    Object.entries(factionScores).forEach(([factionId, score]) => {
      if (score > highestScore) {
        initiatorId = factionId;
        highestScore = score;
      }
    });

    // Add variety to target selection - not just random
    const potentialTargets = Object.keys(factions).filter(
      (id) => id !== initiatorId,
    );

    if (potentialTargets.length === 0) {
      updateLogs([
        {
          message: "No available target faction found",
          type: "warning",
        },
      ]);
      return;
    }

    // Target selection based on relationships, not just random
    const targetScores: Record<string, number> = {};
    const initiator = factions[initiatorId!];

    potentialTargets.forEach((targetId) => {
      const target = factions[targetId];
      if (!target) return;

      // Lower trust = higher score (more likely to interact)
      const trustFactor = 1 - (initiator!.trustTowards[targetId] || 0.5);

      // Power differences affect interaction likelihood
      const initiatorPower = calculateFactionPower(initiator!);
      const targetPower = calculateFactionPower(target);
      const powerRatio = initiatorPower / targetPower;

      // Both much stronger and much weaker factions are interesting targets
      const powerFactor = Math.abs(powerRatio - 1) * 0.3;

      // Resource disparity makes interaction more likely
      const resourceDisparity =
        Math.abs(initiator!.resources - target.resources) / 50;

      // Add randomness
      const randomFactor = Math.random() * 0.3;

      targetScores[targetId] =
        trustFactor * 0.4 +
        powerFactor +
        resourceDisparity * 0.2 +
        randomFactor;
    });

    // Select target with highest score
    let recipientId = potentialTargets[0];
    let highestTargetScore = targetScores[recipientId!] || 0;

    Object.entries(targetScores).forEach(([targetId, score]) => {
      if (score > highestTargetScore) {
        recipientId = targetId;
        highestTargetScore = score;
      }
    });

    const recipient = factions[recipientId!];

    if (!initiator || !recipient) {
      updateLogs([
        {
          message: "Error finding factions for interaction",
          type: "error",
        },
      ]);
      return;
    }

    // Extract attributes for cleaner code
    const init = {
      aggression: initiator.aggression,
      tech: initiator.tech,
      endurance: initiator.endurance,
      wealth: initiator.wealth,
      influence: initiator.influence,
      manpower: initiator.manpower,
      resources: initiator.resources,
      trust: initiator.trustTowards[recipientId!] || 0.5,
    };

    const recp = {
      aggression: recipient.aggression,
      tech: recipient.tech,
      endurance: recipient.endurance,
      wealth: recipient.wealth,
      influence: recipient.influence,
      manpower: recipient.manpower,
      resources: recipient.resources,
      trust: recipient.trustTowards[initiatorId!] || 0.5,
    };

    // Power metrics for decision making
    const initiatorPower = calculateFactionPower(initiator);
    const recipientPower = calculateFactionPower(recipient);
    const powerRatio = initiatorPower / recipientPower;

    // ATTACK SCORING - Rebalanced with more factors
    let attackScore = 0;

    // Base factors
    attackScore += init.aggression * 0.3; // Reduced from 0.35
    attackScore += (1 - init.trust) * 0.25; // Reduced from 0.3

    // Resource-driven attack motivation
    attackScore += init.resources < 10 ? 0.2 : 0; // Desperate for resources
    attackScore += init.resources > 50 ? -0.15 : 0; // Resource-rich less likely to attack

    // Power dynamics
    attackScore += powerRatio > 1.2 ? 0.2 : powerRatio < 0.8 ? -0.3 : 0; // More balanced power assessment

    // Target vulnerability assessment
    attackScore += recp.endurance < 1.5 ? 0.15 : 0; // Target weakness
    attackScore += recp.wealth > 2.5 ? 0.1 : 0; // Rich targets

    // Self-assessment
    attackScore += init.manpower < 20 ? -0.3 : 0; // Stronger manpower penalty
    attackScore += init.resources < recp.resources * 1.2 ? 0.15 : 0; // Resource envy

    // Historical factors - reduced impact
    if (
      lastPlayerInteraction.action === "attack" &&
      lastPlayerInteraction.faction === initiatorId
    ) {
      attackScore += 0.1; // Reduced from 0.2
    }

    // Personality traits influence
    attackScore += init.influence < 1.5 ? 0.1 : -0.1; // Low influence favors direct action
    attackScore += init.tech > 2.5 ? 0.1 : 0; // High tech enables military action

    // Calculate attack value - between 10% and 40% of available manpower based on aggression
    const attackValue = Math.round(
      init.manpower * (0.1 + (init.aggression - 1) * 0.15),
    );

    // TRADE SCORING - Rebalanced with more factors
    let tradeScore = 0;

    // Base factors - rebalanced weights
    tradeScore += init.wealth * 0.2; // Reduced from 0.25
    tradeScore += (4 - init.aggression) * 0.15; // Same weight
    tradeScore += init.trust * 0.25; // Reduced from 0.3

    // Resource factors
    tradeScore += init.resources > 25 ? 0.2 : 0; // Reduced from 0.25
    tradeScore += init.resources < 10 ? -0.2 : 0; // New: desperate factions less likely to trade

    // Technological exchange motivation
    tradeScore += init.tech < 2 && recp.tech > 2.5 ? 0.2 : 0; // Reduced from 0.25
    tradeScore += init.tech > 2.5 && recp.tech < 2 ? 0.15 : 0; // New: tech suppliers motivated

    // Economic factors
    tradeScore += Math.abs(init.wealth - recp.wealth) > 1 ? 0.15 : 0; // Same

    // Relationship factors
    tradeScore += init.trust > 0.6 && recp.trust > 0.6 ? 0.15 : 0; // Reduced from 0.2
    tradeScore += init.influence > 2 ? 0.15 : 0; // New: influential factions prefer trade

    // Need-based factors
    tradeScore += init.wealth < 1.5 && init.resources < 15 ? 0.2 : 0; // Reduced from 0.25

    // Historical context
    if (
      lastPlayerInteraction.action === "trade with" &&
      lastPlayerInteraction.faction === recipientId
    ) {
      tradeScore += 0.1; // New: observer effect - factions follow player's lead
    }

    // Calculate trade value - between 5% and 15% of resources based on wealth
    const tradeValue = Math.round(
      init.resources * (0.05 + (init.wealth - 1) * 0.05),
    );

    // ALLIANCE SCORING - Rebalanced with more factors
    let allianceScore = 0;

    // Base factors - rebalanced weights
    allianceScore += init.influence * 0.2; // Reduced from 0.25
    allianceScore += (4 - init.aggression) * 0.15; // Reduced from 0.2
    allianceScore += init.trust * 0.3; // Reduced from 0.35

    // Vulnerability factors
    allianceScore += init.endurance < 1.5 ? 0.25 : 0; // Reduced from 0.3
    allianceScore += init.manpower < 15 ? 0.2 : 0; // Reduced from 0.25

    // Compatibility factors
    allianceScore += Math.abs(init.tech - recp.tech) < 0.5 ? 0.1 : 0; // Reduced from 0.15

    // Power balance
    allianceScore += powerRatio > 0.8 && powerRatio < 1.2 ? 0.2 : 0; // Reduced from 0.25

    // Strategic factors
    allianceScore += init.endurance < 1.5 && init.manpower < 20 ? 0.3 : 0; // Reduced from 0.4

    // Trust threshold
    allianceScore += init.trust < 0.4 || recp.trust < 0.4 ? -0.5 : 0; // Reduced from -0.6

    // New factors
    allianceScore += recipientPower > initiatorPower * 1.5 ? 0.15 : 0; // Seeking stronger allies
    allianceScore += init.tech + recp.tech > 5 ? 0.1 : 0; // Tech synergy
    allianceScore += init.aggression + recp.aggression > 5 ? -0.2 : 0; // Aggressive factions clash

    // Historical context
    if (lastPlayerInteraction.action === "form an alliance with") {
      allianceScore += 0.15; // New: factions more likely to ally when alliances are forming
    }

    // Add balanced random factors to each score (0-0.2)
    const randomFactor = 0.2;
    const finalAttackScore = attackScore + Math.random() * randomFactor;
    const finalTradeScore = tradeScore + Math.random() * randomFactor;
    const finalAllianceScore = allianceScore + Math.random() * randomFactor;

    // Get highest score and determine action
    highestScore = Math.max(
      finalAttackScore,
      finalTradeScore,
      finalAllianceScore,
    );
    let action;
    let reason = "";

    // More nuanced reason determination
    if (highestScore === finalAttackScore) {
      action = "attack";

      // More detailed attack reasons
      if (init.trust < 0.4) {
        reason = "deep distrust and hostility";
      } else if (powerRatio > 1.2) {
        reason = "significant power advantage";
      } else if (init.resources < 10) {
        reason = "desperate need for resources";
      } else if (recp.wealth > 2.5 && init.wealth < 1.5) {
        reason = "economic jealousy";
      } else if (init.aggression > 2.5) {
        reason = "aggressive military doctrine";
      } else {
        reason = "opportunistic expansion";
      }
    } else if (highestScore === finalTradeScore) {
      action = "trade";

      // More detailed trade reasons
      if (init.trust > 0.6) {
        reason = "established trade relationship";
      } else if (Math.abs(init.tech - recp.tech) > 1) {
        reason = "beneficial technology exchange";
      } else if (init.resources > 25) {
        reason = "resource surplus";
      } else if (init.influence > 2) {
        reason = "economic diplomacy";
      } else if (init.wealth < 1.5) {
        reason = "economic necessity";
      } else {
        reason = "mutually beneficial commerce";
      }
    } else {
      action = "alliance";

      // More detailed alliance reasons
      if (init.trust > 0.6 && recp.trust > 0.6) {
        reason = "strong mutual trust";
      } else if (init.endurance < 1.5 || init.manpower < 15) {
        reason = "need for protection";
      } else if (powerRatio > 0.8 && powerRatio < 1.2) {
        reason = "balanced power relationship";
      } else if (init.tech + recp.tech > 5) {
        reason = "technological cooperation";
      } else if (init.influence > 2.5) {
        reason = "diplomatic initiative";
      } else {
        reason = "strategic security concerns";
      }
    }

    // Log the faction's decision with reasoning
    const newLogs: Log[] = [
      {
        message: `${initiator.name} decided to ${action} ${recipient.name} due to ${reason}.`,
        type: "info",
      },
      {
        message: `Decision factors - Attack: ${attackScore.toFixed(2)}, Trade: ${tradeScore.toFixed(2)}, Alliance: ${allianceScore.toFixed(2)}`,
        type: "info",
      },
    ];

    // Add trust-specific log for transparency
    if (
      (action === "attack" && init.trust < 0.4) ||
      (action === "trade" && init.trust > 0.6) ||
      (action === "alliance" && init.trust > 0.6)
    ) {
      newLogs.push({
        message: `Trust level (${init.trust.toFixed(2)}) was a decisive factor in this decision.`,
        type: "info",
      });
    }

    updateLogs(newLogs);

    // Execute the chosen action
    switch (action) {
      case "attack":
        onFactionAttackFactionHandler(initiatorId!, recipientId!, attackValue);
        break;
      case "trade":
        onFactionTradeFactionHandler(initiatorId!, recipientId!, tradeValue);
        break;
      case "alliance":
        onFactionAllianceFactionHandler(initiatorId!, recipientId!);
        break;
    }

    // Update the last AI initiator to prevent the same faction from acting next turn
    setLastAIInitiator(initiatorId!);
  };

  // Helper function to calculate overall faction power
  const calculateFactionPower = (faction: Faction) => {
    return (
      (faction.aggression * 1.0 +
        faction.tech * 1.2 +
        faction.endurance * 0.8 +
        faction.wealth * 0.9 +
        faction.influence * 1.0) /
      5
    );
  };

  const onPlayerAttackFactionHandler = (
    factionId: string,
    attackValue: string,
  ) => {
    const faction = factionsState.factions[factionId];

    if (!faction) {
      updateLogs([
        {
          message: `Attack denied: Faction not found`,
          type: "warning",
        },
      ]);
      return;
    }

    const newLogs: Log[] = [];

    const attackValueNum = Number(attackValue);
    if (isNaN(attackValueNum) || attackValueNum <= 0) {
      newLogs.push({
        message: `Attack denied: Invalid attack value`,
        type: "warning",
      });
      updateLogs(newLogs);
      return;
    }

    if (attackValueNum > faction.manpower) {
      newLogs.push({
        message: `Attack denied: Faction does not have enough manpower`,
        type: "warning",
      });
      updateLogs(newLogs);
      return;
    }

    // Extract attributes
    const factionAttr = {
      aggression: faction.aggression,
      tech: faction.tech,
      endurance: faction.endurance,
      wealth: faction.wealth,
      influence: faction.influence,
      manpower: faction.manpower,
      resources: faction.resources,
      trust: faction.trustTowards.player || 0.5,
    };

    // Calculate war outcome using weights
    const weights = {
      aggression: 0.25,
      tech: 0.2,
      endurance: 0.2,
      wealth: 0.15,
      influence: 0.1,
      manpower: 0.1,
    };

    const factionStrength =
      factionAttr.aggression * weights.aggression +
      factionAttr.tech * weights.tech +
      factionAttr.endurance * weights.endurance +
      factionAttr.wealth * weights.wealth +
      factionAttr.influence * weights.influence +
      factionAttr.manpower * weights.manpower;

    // Player attack strength with reduced scaling for balance
    const attackStrength = Math.pow(attackValueNum, 0.7) * 0.5;

    // War outcome probability
    const WO = factionStrength / (factionStrength + attackStrength);
    const warWon = WO > 0.5;

    newLogs.push({
      message: `War outcome: ${warWon ? "Faction Won" : "Faction Lost"}`,
      type: "warning",
    });

    const updatedManpower = Math.max(1, factionAttr.manpower - attackValueNum);
    newLogs.push({
      message: `${faction.name} manpower reduced to ${updatedManpower.toFixed(2)}`,
      type: "error",
    });

    // Calculate impact severity
    const impactSeverity = Math.min(
      0.85,
      attackValueNum / factionAttr.manpower,
    );
    const baseImpactPercentage = impactSeverity * 40;
    const changePercent = baseImpactPercentage / 100;

    // Trust always decreases when attacked - more severe for faction defeat
    const trustReductionMultiplier = warWon ? 0.9 : 2.0;
    const trustChange =
      changePercent * factionAttr.trust * trustReductionMultiplier;
    const updatedTrust = Math.max(
      0,
      Math.min(1, factionAttr.trust - trustChange),
    );

    newLogs.push({
      message: `Player Trust decreased to ${updatedTrust.toFixed(2)}`,
      type: "error",
    });

    const updatedAttributes = {
      ...factionAttr,
      manpower: updatedManpower,
      trust: updatedTrust,
    };

    if (warWon) {
      // Faction won
      applyPlayerAttackChange(
        "aggression",
        1.5,
        changePercent,
        newLogs,
        updatedAttributes,
        faction.name,
      );
      applyPlayerAttackChange(
        "tech",
        1.2,
        changePercent,
        newLogs,
        updatedAttributes,
        faction.name,
      );
      applyPlayerAttackChange(
        "endurance",
        -1.3,
        changePercent,
        newLogs,
        updatedAttributes,
        faction.name,
      );
      applyPlayerAttackChange(
        "wealth",
        -1.8,
        changePercent,
        newLogs,
        updatedAttributes,
        faction.name,
      );
      applyPlayerAttackChange(
        "influence",
        1.8,
        changePercent,
        newLogs,
        updatedAttributes,
        faction.name,
      );

      // Resource changes
      const resourceChange = impactSeverity * attackValueNum * 0.35;
      updatedAttributes.resources = Math.max(
        0,
        factionAttr.resources - resourceChange,
      );

      newLogs.push({
        message: `Resources decreased to ${updatedAttributes.resources.toFixed(2)}`,
        type: "error",
      });
    } else {
      // Faction lost - adaptive behavior
      const aggressionDirection = factionAttr.aggression > 2 ? 1 : -1;
      applyPlayerAttackChange(
        "aggression",
        1.8 * aggressionDirection,
        changePercent,
        newLogs,
        updatedAttributes,
        faction.name,
      );
      applyPlayerAttackChange(
        "tech",
        1.5,
        changePercent,
        newLogs,
        updatedAttributes,
        faction.name,
      );
      applyPlayerAttackChange(
        "endurance",
        -2.0,
        changePercent,
        newLogs,
        updatedAttributes,
        faction.name,
      );
      applyPlayerAttackChange(
        "wealth",
        -2.8,
        changePercent,
        newLogs,
        updatedAttributes,
        faction.name,
      );
      applyPlayerAttackChange(
        "influence",
        -2.2,
        changePercent,
        newLogs,
        updatedAttributes,
        faction.name,
      );

      // Resource changes - more significant for defeat
      const resourceChange = impactSeverity * attackValueNum * 0.7;
      updatedAttributes.resources = Math.max(
        0,
        factionAttr.resources - resourceChange,
      );

      newLogs.push({
        message: `Resources decreased to ${updatedAttributes.resources.toFixed(2)}`,
        type: "error",
      });
    }

    // Update faction
    const updatedFaction = {
      ...faction,
      manpower: updatedAttributes.manpower,
      aggression: updatedAttributes.aggression,
      tech: updatedAttributes.tech,
      endurance: updatedAttributes.endurance,
      wealth: updatedAttributes.wealth,
      influence: updatedAttributes.influence,
      resources: updatedAttributes.resources,
      trustTowards: {
        ...faction.trustTowards,
        player: updatedAttributes.trust,
      },
    };

    const updatedFactions = {
      ...factionsState.factions,
      [factionId]: updatedFaction,
    };

    setFactionsState({
      ...factionsState,
      factions: updatedFactions,
    });

    updateLogs(newLogs);
  };

  const applyPlayerAttackChange = (
    attribute: keyof Omit<
      FactionAttributes,
      "manpower" | "resources" | "trust"
    >,
    multiplier: number,
    changePercent: number,
    logs: Log[],
    attributes: FactionAttributes,
    factionName: string,
  ) => {
    const current = attributes[attribute];

    if (current === undefined) return;

    const change = changePercent * current * multiplier;
    const updated = Math.max(1, Math.min(3, current + change));
    attributes[attribute] = updated;

    logs.push({
      message: `${factionName} ${attribute} ${change > 0 ? "increased" : "decreased"} to ${updated.toFixed(2)}`,
      type: change > 0 ? "success" : "error",
    });
  };

  const onPlayerTradeFactionHandler = (
    factionId: string,
    tradeValue: string,
  ) => {
    const faction = factionsState.factions[factionId];

    if (!faction) {
      updateLogs([
        {
          message: `Trade denied: Faction not found`,
          type: "warning",
        },
      ]);
      return;
    }

    const newLogs: Log[] = [];

    const tradeAmount = Number(tradeValue);

    if (isNaN(tradeAmount) || tradeAmount <= 0) {
      newLogs.push({
        message: `Trade denied: Invalid trade value`,
        type: "warning",
      });
      updateLogs(newLogs);
      return;
    }

    // Extract attributes
    const factionAttr = {
      aggression: faction.aggression,
      tech: faction.tech,
      endurance: faction.endurance,
      wealth: faction.wealth,
      influence: faction.influence,
      resources: faction.resources,
      trust: faction.trustTowards.player || 0.5,
    };

    // Calculate trade acceptance
    const weights = {
      trust: 0.35,
      wealth: 0.2,
      influence: 0.15,
      aggression: -0.1,
      tech: 0.1,
    };

    const tradeWillingness =
      factionAttr.trust * weights.trust +
      ((factionAttr.wealth - 1) / 2) * weights.wealth +
      ((factionAttr.influence - 1) / 2) * weights.influence +
      ((factionAttr.aggression - 1) / 2) * weights.aggression +
      ((factionAttr.tech - 1) / 2) * weights.tech;

    // Resource factor - larger trades are harder to accept
    const resourceFactor =
      (1 - Math.min(1, tradeAmount / (factionAttr.resources * 4))) * 0.2;

    // Trust recovery mechanic - if trust is already high, trades are more likely
    const trustBonus = factionAttr.trust > 0.7 ? 0.15 : 0;

    // Calculate acceptance probability
    const acceptanceProbability =
      tradeWillingness + resourceFactor + trustBonus;
    const tradeAccepted = acceptanceProbability > 0.5;

    // Decision factors
    const factors = [
      { name: "Trust", value: factionAttr.trust * weights.trust },
      {
        name: "Wealth",
        value: ((factionAttr.wealth - 1) / 2) * weights.wealth,
      },
      {
        name: "Influence",
        value: ((factionAttr.influence - 1) / 2) * weights.influence,
      },
      { name: "Resources", value: resourceFactor },
    ];

    factors.sort((a, b) => b.value - a.value);
    const topFactor = factors[0]!;

    const reason = tradeAccepted
      ? `high ${topFactor.name.toLowerCase()} was the deciding factor`
      : factionAttr.trust < 0.3
        ? `low trust prevented agreement`
        : `insufficient trading desire`;

    newLogs.push({
      message: `Trade with value ${tradeAmount}: ${tradeAccepted ? "Accepted" : "Rejected"} (${reason})`,
      type: "warning",
    });

    // Calculate impact values
    const impactSeverity = Math.min(0.75, tradeAmount / factionAttr.resources);
    const baseImpactPercentage = impactSeverity * 25;
    const changePercent = baseImpactPercentage / 100;

    if (tradeAccepted) {
      // Create attributes container
      const updatedAttributes = { ...factionAttr };

      // Trust recovery mechanics - more significant recovery when trust is low
      const trustRecoveryMultiplier = Math.max(
        1.0,
        2.0 - factionAttr.trust * 2,
      );
      const trustChange =
        changePercent * (1 - factionAttr.trust) * trustRecoveryMultiplier;
      updatedAttributes.trust = Math.min(1, factionAttr.trust + trustChange);

      newLogs.push({
        message: `Player Trust increased to ${updatedAttributes.trust.toFixed(2)}`,
        type: "success",
      });

      // Attribute changes
      applyPlayerTradeChange(
        "wealth",
        1.0,
        changePercent,
        newLogs,
        updatedAttributes,
        faction.name,
      );
      applyPlayerTradeChange(
        "influence",
        0.8,
        changePercent,
        newLogs,
        updatedAttributes,
        faction.name,
      );
      applyPlayerTradeChange(
        "aggression",
        -0.5,
        changePercent,
        newLogs,
        updatedAttributes,
        faction.name,
      );
      applyPlayerTradeChange(
        "tech",
        0.7,
        changePercent,
        newLogs,
        updatedAttributes,
        faction.name,
      );

      // Resource changes - add bonus based on tech exchange potential
      const techExchangeFactor = Math.max(0, 1 + (3 - factionAttr.tech) * 0.1);
      const resourceChange = tradeAmount * 0.6 * techExchangeFactor;
      updatedAttributes.resources = factionAttr.resources + resourceChange;

      newLogs.push({
        message: `Resources increased to ${updatedAttributes.resources.toFixed(2)}`,
        type: "success",
      });

      // Update faction
      const updatedFaction = {
        ...faction,
        aggression: updatedAttributes.aggression,
        tech: updatedAttributes.tech,
        endurance: updatedAttributes.endurance,
        wealth: updatedAttributes.wealth,
        influence: updatedAttributes.influence,
        resources: updatedAttributes.resources,
        trustTowards: {
          ...faction.trustTowards,
          player: updatedAttributes.trust,
        },
      };

      const updatedFactions = {
        ...factionsState.factions,
        [factionId]: updatedFaction,
      };

      setFactionsState({
        ...factionsState,
        factions: updatedFactions,
      });
    } else {
      // Trust and aggression changes for rejected trade
      const trustChange = changePercent * factionAttr.trust * 0.3;
      const aggressionChange = changePercent * factionAttr.aggression * 0.25;

      const updatedTrust = Math.max(0, factionAttr.trust - trustChange);
      const updatedAggression = Math.min(
        3,
        factionAttr.aggression + aggressionChange,
      );

      newLogs.push({
        message: `Player Trust decreased to ${updatedTrust.toFixed(2)}`,
        type: "error",
      });
      newLogs.push({
        message: `Aggression increased to ${updatedAggression.toFixed(2)}`,
        type: "success",
      });

      // Update faction
      const updatedFaction = {
        ...faction,
        aggression: updatedAggression,
        trustTowards: {
          ...faction.trustTowards,
          player: updatedTrust,
        },
      };

      const updatedFactions = {
        ...factionsState.factions,
        [factionId]: updatedFaction,
      };

      setFactionsState({
        ...factionsState,
        factions: updatedFactions,
      });
    }

    updateLogs(newLogs);
  };

  const applyPlayerTradeChange = (
    attribute: keyof Omit<
      FactionAttributes,
      "manpower" | "resources" | "trust"
    >,
    multiplier: number,
    changePercent: number,
    logs: Log[],
    attributes: FactionAttributes,
    factionName: string,
  ) => {
    const current = attributes[attribute];

    if (current === undefined) return;

    const change = changePercent * current * multiplier;
    const updated = Math.max(1, Math.min(3, current + change));
    attributes[attribute] = updated;

    logs.push({
      message: `${factionName} ${attribute} ${change > 0 ? "increased" : "decreased"} to ${updated.toFixed(2)}`,
      type: change > 0 ? "success" : "error",
    });
  };

  const onPlayerAllianceFactionHandler = (factionId: string) => {
    const faction = factionsState.factions[factionId];

    if (!faction) {
      updateLogs([
        {
          message: `Alliance denied: Faction not found`,
          type: "warning",
        },
      ]);
      return;
    }

    const newLogs: Log[] = [];

    // Extract attributes
    const factionAttr = {
      aggression: faction.aggression,
      tech: faction.tech,
      endurance: faction.endurance,
      wealth: faction.wealth,
      influence: faction.influence,
      resources: faction.resources,
      trust: faction.trustTowards.player || 0.5,
      manpower: faction.manpower,
    };

    // Calculate alliance acceptance with weighted attributes
    const weights = {
      trust: 0.45,
      aggression: -0.15,
      influence: 0.15,
      tech: 0.05,
      endurance: 0.05,
    };

    // Calculate faction's willingness
    const allianceWillingness =
      factionAttr.trust * weights.trust +
      ((factionAttr.aggression - 1) / 2) * weights.aggression +
      ((factionAttr.influence - 1) / 2) * weights.influence +
      ((factionAttr.tech - 1) / 2) * weights.tech +
      ((factionAttr.endurance - 1) / 2) * weights.endurance;

    // Power dynamics factor - assumed player power is 2.0
    const playerPower = 2.0;
    const factionPower =
      (factionAttr.aggression +
        factionAttr.tech +
        factionAttr.endurance +
        factionAttr.wealth +
        factionAttr.influence) /
      5;

    // Balance factor - alliance more likely with moderate power difference
    const powerRatio = playerPower / factionPower;
    const powerFactor = powerRatio < 0.5 || powerRatio > 2.0 ? -0.15 : 0.15;

    // Desperation factor - more willing to ally when weak
    const desperation =
      factionAttr.endurance < 1.5 || factionAttr.manpower < 20 ? 0.2 : 0;

    // Previous hostility factor
    const hostilityFactor = factionAttr.aggression > 2.5 ? -0.1 : 0;

    // Calculate acceptance probability - added recovery mechanics
    const acceptanceProbability =
      allianceWillingness + powerFactor + desperation + hostilityFactor;
    const allianceAccepted = acceptanceProbability > 0.55;

    // Get factors for decision explanation
    const factors = [
      { name: "Trust", value: factionAttr.trust * weights.trust },
      {
        name: "Aggression",
        value: ((factionAttr.aggression - 1) / 2) * weights.aggression,
      },
      {
        name: "Influence",
        value: ((factionAttr.influence - 1) / 2) * weights.influence,
      },
      { name: "Power Balance", value: powerFactor },
      { name: "Need for Help", value: desperation },
    ];

    factors.sort((a, b) => b.value - a.value);
    const topFactor = factors[0]!;

    let reason = "";
    if (allianceAccepted) {
      reason =
        topFactor.name === "Trust"
          ? "high mutual trust"
          : topFactor.name === "Need for Help"
            ? "desperate need for protection"
            : `favorable ${topFactor.name.toLowerCase()}`;
    } else {
      reason =
        factionAttr.trust < 0.3
          ? "insufficient trust"
          : factionAttr.aggression > 2.5
            ? "aggressive stance"
            : "strategic considerations";
    }

    newLogs.push({
      message: `Alliance request: ${allianceAccepted ? "Accepted" : "Rejected"} (${reason})`,
      type: "warning",
    });

    // Impact severity
    const baseImpactPercentage = 35;
    const changePercent = baseImpactPercentage / 100;

    if (allianceAccepted) {
      // Create attributes container
      const updatedAttributes = { ...factionAttr };

      // Trust changes - significant trust boost from alliance
      // Implementation of trust recovery mechanics
      const trustRecoveryMultiplier = Math.max(
        1.0,
        2.0 - factionAttr.trust * 2,
      );
      const trustChange =
        changePercent * (1 - factionAttr.trust) * 2.0 * trustRecoveryMultiplier;
      updatedAttributes.trust = Math.min(1, factionAttr.trust + trustChange);

      newLogs.push({
        message: `Player Trust increased to ${updatedAttributes.trust.toFixed(2)}`,
        type: "success",
      });

      // Attribute changes
      applyPlayerAllianceChange(
        "aggression",
        -1.2,
        changePercent,
        newLogs,
        updatedAttributes,
        faction.name,
      );
      applyPlayerAllianceChange(
        "influence",
        1.5,
        changePercent,
        newLogs,
        updatedAttributes,
        faction.name,
      );
      applyPlayerAllianceChange(
        "tech",
        1.0,
        changePercent,
        newLogs,
        updatedAttributes,
        faction.name,
      );
      applyPlayerAllianceChange(
        "endurance",
        0.8,
        changePercent,
        newLogs,
        updatedAttributes,
        faction.name,
      );
      applyPlayerAllianceChange(
        "wealth",
        0.6,
        changePercent,
        newLogs,
        updatedAttributes,
        faction.name,
      );

      // Resources unchanged for alliance

      // Update faction
      const updatedFaction = {
        ...faction,
        aggression: updatedAttributes.aggression,
        tech: updatedAttributes.tech,
        endurance: updatedAttributes.endurance,
        wealth: updatedAttributes.wealth,
        influence: updatedAttributes.influence,
        trustTowards: {
          ...faction.trustTowards,
          player: updatedAttributes.trust,
        },
      };

      const updatedFactions = {
        ...factionsState.factions,
        [factionId]: updatedFaction,
      };

      setFactionsState({
        ...factionsState,
        factions: updatedFactions,
      });
    } else {
      // Alliance rejected - moderate negative impacts
      const trustChange = changePercent * factionAttr.trust * 0.7;
      const aggressionChange = changePercent * factionAttr.aggression * 0.6;
      const influenceChange = changePercent * factionAttr.influence * 0.4;

      const updatedTrust = Math.max(0, factionAttr.trust - trustChange);
      const updatedAggression = Math.min(
        3,
        factionAttr.aggression + aggressionChange,
      );
      const updatedInfluence = Math.max(
        1,
        factionAttr.influence - influenceChange,
      );

      newLogs.push({
        message: `Player Trust decreased to ${updatedTrust.toFixed(2)}`,
        type: "error",
      });
      newLogs.push({
        message: `Aggression increased to ${updatedAggression.toFixed(2)}`,
        type: "success",
      });
      newLogs.push({
        message: `Influence decreased to ${updatedInfluence.toFixed(2)}`,
        type: "error",
      });

      // Update faction
      const updatedFaction = {
        ...faction,
        aggression: updatedAggression,
        influence: updatedInfluence,
        trustTowards: {
          ...faction.trustTowards,
          player: updatedTrust,
        },
      };

      const updatedFactions = {
        ...factionsState.factions,
        [factionId]: updatedFaction,
      };

      setFactionsState({
        ...factionsState,
        factions: updatedFactions,
      });
    }

    updateLogs(newLogs);
  };

  const applyPlayerAllianceChange = (
    attribute: keyof Omit<
      FactionAttributes,
      "manpower" | "resources" | "trust"
    >,
    multiplier: number,
    changePercent: number,
    logs: Log[],
    attributes: FactionAttributes,
    factionName: string,
  ) => {
    const current = attributes[attribute];

    if (current === undefined) return;

    const change = changePercent * current * multiplier;
    const updated = Math.max(1, Math.min(3, current + change));
    attributes[attribute] = updated;

    logs.push({
      message: `${factionName} ${attribute} ${change > 0 ? "increased" : "decreased"} to ${updated.toFixed(2)}`,
      type: change > 0 ? "success" : "error",
    });
  };

  const onStartGameHandler = () => {
    const factions = factionsState.factions;
    const updatedFactions: Record<string, Faction> = {};

    // Process each faction
    Object.entries(factions).forEach(([factionId, faction]) => {
      // Extract base attributes
      const baseAttributes = {
        aggression: faction.aggression,
        tech: faction.tech,
        endurance: faction.endurance,
        wealth: faction.wealth,
        influence: faction.influence,
      };

      // Calculate derived attributes with better balance
      // Manpower based on aggression and endurance
      const manpower = Math.round(
        ((baseAttributes.aggression + baseAttributes.endurance) / 6) * 100,
      );

      // Resources based on wealth, tech, and influence
      const resources = Math.round(
        ((baseAttributes.wealth * 2 +
          baseAttributes.tech +
          baseAttributes.influence) /
          12) *
          100,
      );

      // Process trust relationships with all other factions
      const trustTowards: Record<string, number> = { player: 0 };
      const rivalryWith: Record<string, number> = { player: 0 };

      // Calculate player trust (0-1)
      const playerTrust = Math.min(
        1,
        Math.max(
          0,
          (baseAttributes.wealth / 3) * 0.3 +
            (baseAttributes.tech / 3) * 0.2 -
            (baseAttributes.aggression / 3) * 0.2 +
            0.2, // Base trust
        ),
      );

      trustTowards.player = playerTrust;
      rivalryWith.player = Math.min(1, Math.max(0, 1 - playerTrust)); // Rivalry inverse of trust

      // Calculate trust towards other factions
      Object.entries(factions).forEach(([otherId]) => {
        if (otherId !== factionId) {
          // Calculate faction trust (0-1)
          const factionTrust = Math.min(
            1,
            Math.max(
              0,
              (baseAttributes.endurance / 3) * 0.3 +
                (baseAttributes.influence / 3) * 0.3 -
                (baseAttributes.aggression / 3) * 0.3 +
                0.3, // Base trust
            ),
          );

          trustTowards[otherId] = factionTrust;
          rivalryWith[otherId] = Math.min(1, Math.max(0, 1 - factionTrust)); // Rivalry inverse of trust
        }
      });

      // Update the faction with calculated values
      updatedFactions[factionId] = {
        ...faction,
        manpower,
        resources,
        trustTowards,
        rivalryWith,
      };
    });

    setFactionsState({
      ...factionsState,
      factions: updatedFactions,
    });

    setIsStarted(true);
  };

  // Wrapper functions that track player interaction
  const onPlayerAttackFactionHandlerWithInteraction = (
    factionId: string,
    attackValue: string,
  ): void => {
    onPlayerAttackFactionHandler(factionId, attackValue);
    setLastPlayerInteraction({
      faction: factionId,
      action: "attack",
    });
  };

  const onPlayerTradeFactionHandlerWithInteraction = (
    factionId: string,
    tradeValue: string,
  ): void => {
    onPlayerTradeFactionHandler(factionId, tradeValue);
    setLastPlayerInteraction({
      faction: factionId,
      action: "trade with",
    });
  };

  const onPlayerAllianceFactionHandlerWithInteraction = (
    factionId: string,
  ): void => {
    onPlayerAllianceFactionHandler(factionId);
    setLastPlayerInteraction({
      faction: factionId,
      action: "form an alliance with",
    });
  };

  const onFactionRecruitManpowerHandler = (factionId: string) => {
    const factions = factionsState.factions;
    const faction = factions[factionId];

    if (!faction) {
      updateLogs([
        {
          message: `Recruitment failed: Faction not found`,
          type: "warning",
        },
      ]);
      return;
    }

    const newLogs: Log[] = [];

    // Extract attributes for cleaner code
    const factionAttr = {
      aggression: faction.aggression,
      tech: faction.tech,
      endurance: faction.endurance,
      wealth: faction.wealth,
      influence: faction.influence,
      manpower: faction.manpower,
      resources: faction.resources,
    };

    // Determine recruitment effectiveness based on faction attributes
    // Wealth is the primary factor, with influence and tech as secondary factors
    const baseRecruitmentRate = 5; // Base recruitment amount

    // Wealth bonus - higher wealth means better recruitment
    const wealthMultiplier = 1 + (factionAttr.wealth - 1) / 2;

    // Influence affects recruitment through reputation and reach
    const influenceBonus = Math.max(0, (factionAttr.influence - 1.5) * 2);

    // Tech provides some efficiency in recruitment and training
    const techBonus = Math.max(0, (factionAttr.tech - 1.5) * 1);

    // Resources required for recruitment - scales with current manpower
    const recruitmentCost = Math.ceil(
      baseRecruitmentRate * (0.8 + factionAttr.manpower / 100),
    );

    // Check if faction has enough resources
    if (factionAttr.resources < recruitmentCost) {
      newLogs.push({
        message: `${faction.name} lacks resources for recruitment (${recruitmentCost} needed)`,
        type: "warning",
      });
      updateLogs(newLogs);
      return;
    }

    // Calculate recruitment amount
    const recruitmentAmount = Math.round(
      baseRecruitmentRate * wealthMultiplier + influenceBonus + techBonus,
    );

    // Calculate recruitment quality based on tech and wealth
    // Quality affects how effective the new recruits are (a multiplier on raw numbers)
    const recruitQuality = Math.min(
      1.5,
      Math.max(0.8, 0.9 + factionAttr.tech / 6 + factionAttr.wealth / 8),
    );

    // Calculate effective recruitment (adjusted by quality)
    const effectiveRecruitment = Math.round(recruitmentAmount * recruitQuality);

    // Update manpower
    const updatedManpower = factionAttr.manpower + effectiveRecruitment;

    // Update resources
    const updatedResources = factionAttr.resources - recruitmentCost;

    // Calculate if recruitment was efficient or inefficient
    const efficiency = (effectiveRecruitment / recruitmentCost) * 5;
    const efficiencyRating =
      efficiency > 1.5
        ? "highly efficient"
        : efficiency > 1.0
          ? "efficient"
          : efficiency > 0.7
            ? "adequate"
            : "inefficient";

    newLogs.push({
      message: `${faction.name} recruited ${effectiveRecruitment} manpower (${efficiencyRating})`,
      type: "success",
    });

    newLogs.push({
      message: `${faction.name} manpower increased to ${updatedManpower.toFixed(1)}`,
      type: "success",
    });

    newLogs.push({
      message: `${faction.name} spent ${recruitmentCost} resources on recruitment`,
      type: "info",
    });

    newLogs.push({
      message: `${faction.name} resources decreased to ${updatedResources.toFixed(1)}`,
      type: "error",
    });

    // Update faction state
    const updatedFaction = {
      ...faction,
      manpower: updatedManpower,
      resources: updatedResources,
    };

    const updatedFactions = {
      ...factionsState.factions,
      [factionId]: updatedFaction,
    };

    setFactionsState({
      ...factionsState,
      factions: updatedFactions,
    });

    updateLogs(newLogs);
  };

  // Add this to the triggerFactionRecruitment function which could be called periodically
  // or as a specific event in the game
  const triggerFactionRecruitment = (): void => {
    const factions = factionsState.factions;

    if (Object.keys(factions).length === 0) {
      return;
    }

    // Determine which factions need/want to recruit
    const recruitmentCandidates: string[] = [];

    Object.entries(factions).forEach(([factionId, faction]) => {
      // Factors that encourage recruitment:
      // 1. Low manpower relative to other attributes
      // 2. High aggression (preparing for conflict)
      // 3. Sufficient resources

      const needFactor =
        faction.manpower < 30 ? 0.7 : faction.manpower < 50 ? 0.3 : 0.1;

      const aggressionFactor =
        faction.aggression > 2 ? 0.4 : faction.aggression > 1.5 ? 0.2 : 0.1;

      const resourceFactor = faction.resources > 15 ? 0.3 : 0;

      const wealthFactor =
        faction.wealth > 2 ? 0.3 : faction.wealth > 1.5 ? 0.2 : 0.1;

      // Random chance for unpredictability
      const randomFactor = Math.random() * 0.3;

      const recruitmentScore =
        needFactor +
        aggressionFactor +
        resourceFactor +
        wealthFactor +
        randomFactor;

      // Threshold for deciding to recruit
      if (recruitmentScore > 0.7) {
        recruitmentCandidates.push(factionId);
      }
    });

    // If there are candidates, randomly select one to recruit
    if (recruitmentCandidates.length > 0) {
      const recruitingFaction =
        recruitmentCandidates[
          Math.floor(Math.random() * recruitmentCandidates.length)
        ];
      const faction = factions[recruitingFaction!];

      if (faction) {
        updateLogs([
          {
            message: `${faction.name} is seeking to expand their forces...`,
            type: "info",
          },
        ]);

        onFactionRecruitManpowerHandler(recruitingFaction!);
      }
    }
  };

  // Return all the necessary functions
  return {
    triggerFactionInteraction,
    onFactionAttackFactionHandler,
    onFactionTradeFactionHandler,
    onFactionAllianceFactionHandler,
    onPlayerAttackFactionHandlerWithInteraction,
    onPlayerTradeFactionHandlerWithInteraction,
    onPlayerAllianceFactionHandlerWithInteraction,
    onStartGameHandler,
    isStarted,
    setIsStarted,
    triggerFactionRecruitment,
  };
}
