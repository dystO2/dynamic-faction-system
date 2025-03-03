import { useFactionsAtom } from "../_atoms/factions.atom";
import { type Log, useSetLogsAtomValue } from "../_atoms/logs.atom";
import { useLastPlayerInteractionAtom } from "../_atoms/lastPlayerAction.atom";
import { Button } from "~/components/ui/button";

const Simulator = () => {
  const setLogs = useSetLogsAtomValue();
  const [factions, setFactions] = useFactionsAtom();
  const [lastPlayerInteraction] = useLastPlayerInteractionAtom();

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

  // Faction vs Faction Attack Handler
  const onFactionAttackFactionHandler = (
    attackerFaction: "one" | "two",
    attackValue: number,
  ) => {
    const attacker =
      attackerFaction === "one" ? factions.factionOne : factions.factionTwo;
    const defender =
      attackerFaction === "one" ? factions.factionTwo : factions.factionOne;
    const newLogs: Log[] = [];

    if (attackValue > attacker.manpower) {
      newLogs.push({
        message: `Attack denied: Faction ${attackerFaction === "one" ? "1" : "2"} does not have enough manpower to carry out the attack`,
        type: "warning",
      });
    } else {
      const killCount = attackValue;

      // Extract attacker attributes
      const {
        aggression: attackerAggression,
        tech: attackerTech,
        endurance: attackerEndurance,
        wealth: attackerWealth,
        influence: attackerInfluence,
        manpower: attackerManpower,
        resources: attackerResources,
        factionTrust: attackerTrust,
      } = attacker;

      // Extract defender attributes
      const {
        aggression: defenderAggression,
        tech: defenderTech,
        endurance: defenderEndurance,
        wealth: defenderWealth,
        influence: defenderInfluence,
        manpower: defenderManpower,
        resources: defenderResources,
        factionTrust: defenderTrust,
      } = defender;

      // Calculate war outcome probability with weighted attributes
      const aggressionWeight = 0.2;
      const techWeight = 0.2;
      const enduranceWeight = 0.15;
      const wealthWeight = 0.15;
      const influenceWeight = 0.1;
      const manpowerWeight = 0.1;
      const trustWeight = 0.1; // New weight for trust factor

      // Calculate attacker's effective combat strength
      const attackerStrength =
        attackerAggression * aggressionWeight +
        attackerTech * techWeight +
        attackerEndurance * enduranceWeight +
        attackerWealth * wealthWeight +
        attackerInfluence * influenceWeight +
        attackerManpower * manpowerWeight;

      // Trust impacts combat through morale and intelligence sharing
      // Low trust in attacker can indicate more surprise attacks (bonus)
      // High trust in defender can indicate better intelligence (defense bonus)
      const trustImpact = (defenderTrust - attackerTrust) * trustWeight;

      // Calculate defender's effective combat strength
      const defenderStrength =
        defenderAggression * aggressionWeight +
        defenderTech * techWeight +
        defenderEndurance * enduranceWeight +
        defenderWealth * wealthWeight +
        defenderInfluence * influenceWeight +
        defenderManpower * manpowerWeight +
        trustImpact; // Trust impacts defense strength

      // Calculate war outcome probability (who is more likely to win)
      const attackerAdvantage =
        attackerStrength / (attackerStrength + defenderStrength);

      // Incorporate attack strength based on killCount with diminishing returns
      const attackBoost = Math.pow(killCount, 0.8) * 0.5;

      // Final war outcome probability
      const WO =
        (attackerAdvantage +
          attackBoost / (attackerStrength + defenderStrength)) /
        (1 + attackBoost / (attackerStrength + defenderStrength));

      // Determine if attacker won
      const attackerWon = WO > 0.5;

      // Add detailed explanation for war outcome
      newLogs.push({
        message: `War outcome: Faction ${attackerFaction === "one" ? "1" : "2"} ${attackerWon ? "Won" : "Lost"} against Faction ${attackerFaction === "one" ? "2" : "1"} (${
          attackerWon
            ? `superior military strength prevailed`
            : `defender successfully repelled the attack`
        })`,
        type: "warning",
      });

      // Update manpower for both factions
      const updatedAttackerManpower = Math.max(
        0,
        attackerManpower - killCount * 0.7,
      ); // Attacker loses some troops
      const defenderLosses = attackerWon ? killCount : killCount * 0.5; // Defender loses more if they lost
      const updatedDefenderManpower = Math.max(
        0,
        defenderManpower - defenderLosses,
      );

      newLogs.push({
        message: `Faction ${attackerFaction === "one" ? "1" : "2"} manpower reduced from ${attackerManpower.toFixed(2)} to ${updatedAttackerManpower.toFixed(2)}`,
        type: "error",
      });

      newLogs.push({
        message: `Faction ${attackerFaction === "one" ? "2" : "1"} manpower reduced from ${defenderManpower.toFixed(2)} to ${updatedDefenderManpower.toFixed(2)}`,
        type: "error",
      });

      // Calculate impact severity based on killCount as a percentage of defending manpower
      const impactSeverity = Math.min(1, killCount / defenderManpower);

      // Calculate base percentage changes
      const baseImpactPercentage = impactSeverity * 50; // Up to 50% change

      // ATTACKER CHANGES
      let updatedAttackerAggression = attackerAggression;
      let updatedAttackerTech = attackerTech;
      let updatedAttackerEndurance = attackerEndurance;
      let updatedAttackerWealth = attackerWealth;
      let updatedAttackerInfluence = attackerInfluence;
      let updatedAttackerResources = attackerResources;
      let updatedAttackerTrust = attackerTrust;

      // DEFENDER CHANGES
      let updatedDefenderAggression = defenderAggression;
      let updatedDefenderTech = defenderTech;
      let updatedDefenderEndurance = defenderEndurance;
      let updatedDefenderWealth = defenderWealth;
      let updatedDefenderInfluence = defenderInfluence;
      let updatedDefenderResources = defenderResources;
      let updatedDefenderTrust = defenderTrust;

      // Trust changes based on attack (regardless of outcome)
      // Attacking severely reduces trust between factions
      const baseTrustLoss = impactSeverity * 0.6; // Up to 60% trust reduction

      // Update defender's trust toward attacker (significant drop)
      updatedDefenderTrust = Math.max(
        0,
        Math.min(3, defenderTrust - baseTrustLoss * 1.5),
      );
      newLogs.push({
        message: `Faction ${attackerFaction === "one" ? "2" : "1"}'s trust in Faction ${attackerFaction === "one" ? "1" : "2"} decreased from ${defenderTrust.toFixed(2)} to ${updatedDefenderTrust.toFixed(2)} (betrayal)`,
        type: "error",
      });

      if (attackerWon) {
        // ATTACKER WON SCENARIO

        // Attacker changes
        // Aggression increases - victory emboldens
        const aggressionChange =
          (baseImpactPercentage / 100) * attackerAggression * 1.5;
        updatedAttackerAggression = Math.max(
          1,
          Math.min(3, attackerAggression + aggressionChange),
        );
        newLogs.push({
          message: `Faction ${attackerFaction === "one" ? "1" : "2"} aggression increased from ${attackerAggression.toFixed(2)} to ${updatedAttackerAggression.toFixed(2)} (victory emboldens)`,
          type: "success",
        });

        // Tech increases - learning from battle
        const techChange = (baseImpactPercentage / 100) * attackerTech * 1.2;
        updatedAttackerTech = Math.max(
          1,
          Math.min(3, attackerTech + techChange),
        );
        newLogs.push({
          message: `Faction ${attackerFaction === "one" ? "1" : "2"} tech increased from ${attackerTech.toFixed(2)} to ${updatedAttackerTech.toFixed(2)} (battle innovations)`,
          type: "success",
        });

        // Endurance decreases - war fatigue
        const enduranceChange =
          (baseImpactPercentage / 100) * attackerEndurance * 1.0;
        updatedAttackerEndurance = Math.max(
          1,
          Math.min(3, attackerEndurance - enduranceChange),
        );
        newLogs.push({
          message: `Faction ${attackerFaction === "one" ? "1" : "2"} endurance decreased from ${attackerEndurance.toFixed(2)} to ${updatedAttackerEndurance.toFixed(2)} (war fatigue)`,
          type: "error",
        });

        // Wealth decreases - war costs
        const wealthChange =
          (baseImpactPercentage / 100) * attackerWealth * 1.5;
        updatedAttackerWealth = Math.max(
          1,
          Math.min(3, attackerWealth - wealthChange),
        );
        newLogs.push({
          message: `Faction ${attackerFaction === "one" ? "1" : "2"} wealth decreased from ${attackerWealth.toFixed(2)} to ${updatedAttackerWealth.toFixed(2)} (war expenses)`,
          type: "error",
        });

        // Influence increases - victory prestige
        const influenceChange =
          (baseImpactPercentage / 100) * attackerInfluence * 2.0;
        updatedAttackerInfluence = Math.max(
          1,
          Math.min(3, attackerInfluence + influenceChange),
        );
        newLogs.push({
          message: `Faction ${attackerFaction === "one" ? "1" : "2"} influence increased from ${attackerInfluence.toFixed(2)} to ${updatedAttackerInfluence.toFixed(2)} (victory prestige)`,
          type: "success",
        });

        // Resources decreases - war consumption but gains from looting
        const resourceLoss = impactSeverity * killCount * 0.4;
        const resourceGain = impactSeverity * defenderResources * 0.3; // Loot from defender
        updatedAttackerResources = Math.max(
          0,
          attackerResources - resourceLoss + resourceGain,
        );
        newLogs.push({
          message: `Faction ${attackerFaction === "one" ? "1" : "2"} resources changed from ${attackerResources.toFixed(2)} to ${updatedAttackerResources.toFixed(2)} (war consumption offset by looting)`,
          type:
            updatedAttackerResources > attackerResources ? "success" : "error",
        });

        // Trust update - attacker gains slight trust in their own strength
        // but still experiences slight trust decay due to the violence
        updatedAttackerTrust = Math.max(
          0,
          Math.min(3, attackerTrust - baseTrustLoss * 0.3),
        );
        newLogs.push({
          message: `Faction ${attackerFaction === "one" ? "1" : "2"}'s trust in Faction ${attackerFaction === "one" ? "2" : "1"} decreased from ${attackerTrust.toFixed(2)} to ${updatedAttackerTrust.toFixed(2)} (maintaining caution)`,
          type: "error",
        });

        // Defender changes when they lose
        // Aggression changes based on current level
        const defenderAggressionPivot = 2; // Midpoint of 1-3 scale
        const defenderAggressionDirection =
          defenderAggression > defenderAggressionPivot ? 1 : -1;
        const defenderAggressionChange =
          (baseImpactPercentage / 100) *
          defenderAggression *
          2.5 *
          defenderAggressionDirection;
        updatedDefenderAggression = Math.max(
          1,
          Math.min(3, defenderAggression + defenderAggressionChange),
        );
        newLogs.push({
          message: `Faction ${attackerFaction === "one" ? "2" : "1"} aggression ${defenderAggressionDirection > 0 ? "increased" : "decreased"} from ${defenderAggression.toFixed(2)} to ${updatedDefenderAggression.toFixed(2)} (${defenderAggressionDirection > 0 ? "revenge seeking" : "demoralization"})`,
          type: defenderAggressionDirection > 0 ? "success" : "error",
        });

        // Tech increases - learning from defeat
        const defenderTechChange =
          (baseImpactPercentage / 100) * defenderTech * 1.5;
        updatedDefenderTech = Math.max(
          1,
          Math.min(3, defenderTech + defenderTechChange),
        );
        newLogs.push({
          message: `Faction ${attackerFaction === "one" ? "2" : "1"} tech increased from ${defenderTech.toFixed(2)} to ${updatedDefenderTech.toFixed(2)} (learning from defeat)`,
          type: "success",
        });

        // Endurance decreases - defeat is demoralizing
        const defenderEnduranceChange =
          (baseImpactPercentage / 100) * defenderEndurance * 2.0;
        updatedDefenderEndurance = Math.max(
          1,
          Math.min(3, defenderEndurance - defenderEnduranceChange),
        );
        newLogs.push({
          message: `Faction ${attackerFaction === "one" ? "2" : "1"} endurance decreased from ${defenderEndurance.toFixed(2)} to ${updatedDefenderEndurance.toFixed(2)} (battle trauma)`,
          type: "error",
        });

        // Wealth decreases - defeat is expensive
        const defenderWealthChange =
          (baseImpactPercentage / 100) * defenderWealth * 3.0;
        updatedDefenderWealth = Math.max(
          1,
          Math.min(3, defenderWealth - defenderWealthChange),
        );
        newLogs.push({
          message: `Faction ${attackerFaction === "one" ? "2" : "1"} wealth decreased from ${defenderWealth.toFixed(2)} to ${updatedDefenderWealth.toFixed(2)} (defeat costs)`,
          type: "error",
        });

        // Influence decreases - defeat brings shame
        const defenderInfluenceChange =
          (baseImpactPercentage / 100) * defenderInfluence * 2.5;
        updatedDefenderInfluence = Math.max(
          1,
          Math.min(3, defenderInfluence - defenderInfluenceChange),
        );
        newLogs.push({
          message: `Faction ${attackerFaction === "one" ? "2" : "1"} influence decreased from ${defenderInfluence.toFixed(2)} to ${updatedDefenderInfluence.toFixed(2)} (lost standing)`,
          type: "error",
        });

        // Resources decreases - lost in battle and looted
        const defenderResourceChange =
          impactSeverity * killCount * 0.6 + resourceGain;
        updatedDefenderResources = Math.max(
          0,
          defenderResources - defenderResourceChange,
        );
        newLogs.push({
          message: `Faction ${attackerFaction === "one" ? "2" : "1"} resources decreased from ${defenderResources.toFixed(2)} to ${updatedDefenderResources.toFixed(2)} (resources lost and seized)`,
          type: "error",
        });
      } else {
        // DEFENDER WON SCENARIO

        // Attacker changes when they lose
        // Aggression may increase or decrease based on current level
        const attackerAggressionPivot = 2;
        const attackerAggressionDirection =
          attackerAggression > attackerAggressionPivot ? 1 : -1;
        const attackerAggressionChange =
          (baseImpactPercentage / 100) *
          attackerAggression *
          2.0 *
          attackerAggressionDirection;
        updatedAttackerAggression = Math.max(
          1,
          Math.min(3, attackerAggression + attackerAggressionChange),
        );
        newLogs.push({
          message: `Faction ${attackerFaction === "one" ? "1" : "2"} aggression ${attackerAggressionDirection > 0 ? "increased" : "decreased"} from ${attackerAggression.toFixed(2)} to ${updatedAttackerAggression.toFixed(2)} (${attackerAggressionDirection > 0 ? "frustration" : "cautious retreat"})`,
          type: attackerAggressionDirection > 0 ? "success" : "error",
        });

        // Tech increases - learning from failure
        const attackerTechChange =
          (baseImpactPercentage / 100) * attackerTech * 1.8;
        updatedAttackerTech = Math.max(
          1,
          Math.min(3, attackerTech + attackerTechChange),
        );
        newLogs.push({
          message: `Faction ${attackerFaction === "one" ? "1" : "2"} tech increased from ${attackerTech.toFixed(2)} to ${updatedAttackerTech.toFixed(2)} (learning from failure)`,
          type: "success",
        });

        // Endurance decreases significantly - defeat is demoralizing for attacker
        const attackerEnduranceChange =
          (baseImpactPercentage / 100) * attackerEndurance * 2.5;
        updatedAttackerEndurance = Math.max(
          1,
          Math.min(3, attackerEndurance - attackerEnduranceChange),
        );
        newLogs.push({
          message: `Faction ${attackerFaction === "one" ? "1" : "2"} endurance decreased from ${attackerEndurance.toFixed(2)} to ${updatedAttackerEndurance.toFixed(2)} (defeat trauma)`,
          type: "error",
        });

        // Wealth decreases significantly - failed attack is expensive
        const attackerWealthChange =
          (baseImpactPercentage / 100) * attackerWealth * 3.0;
        updatedAttackerWealth = Math.max(
          1,
          Math.min(3, attackerWealth - attackerWealthChange),
        );
        newLogs.push({
          message: `Faction ${attackerFaction === "one" ? "1" : "2"} wealth decreased from ${attackerWealth.toFixed(2)} to ${updatedAttackerWealth.toFixed(2)} (failed invasion costs)`,
          type: "error",
        });

        // Influence decreases - failed attack brings shame
        const attackerInfluenceChange =
          (baseImpactPercentage / 100) * attackerInfluence * 2.5;
        updatedAttackerInfluence = Math.max(
          1,
          Math.min(3, attackerInfluence - attackerInfluenceChange),
        );
        newLogs.push({
          message: `Faction ${attackerFaction === "one" ? "1" : "2"} influence decreased from ${attackerInfluence.toFixed(2)} to ${updatedAttackerInfluence.toFixed(2)} (reputation damage)`,
          type: "error",
        });

        // Resources decrease substantially - wasted in failed attack
        const attackerResourceChange = impactSeverity * killCount * 0.8;
        updatedAttackerResources = Math.max(
          0,
          attackerResources - attackerResourceChange,
        );
        newLogs.push({
          message: `Faction ${attackerFaction === "one" ? "1" : "2"} resources decreased from ${attackerResources.toFixed(2)} to ${updatedAttackerResources.toFixed(2)} (wasted resources)`,
          type: "error",
        });

        // Trust update - attacker trust decreases more when they lose
        updatedAttackerTrust = Math.max(
          0,
          Math.min(3, attackerTrust - baseTrustLoss * 0.7),
        );
        newLogs.push({
          message: `Faction ${attackerFaction === "one" ? "1" : "2"}'s trust in Faction ${attackerFaction === "one" ? "2" : "1"} decreased from ${attackerTrust.toFixed(2)} to ${updatedAttackerTrust.toFixed(2)} (resentment from defeat)`,
          type: "error",
        });

        // Defender changes when they win
        // Aggression increases - successful defense emboldens
        const defenderAggressionChange =
          (baseImpactPercentage / 100) * defenderAggression * 1.2;
        updatedDefenderAggression = Math.max(
          1,
          Math.min(3, defenderAggression + defenderAggressionChange),
        );
        newLogs.push({
          message: `Faction ${attackerFaction === "one" ? "2" : "1"} aggression increased from ${defenderAggression.toFixed(2)} to ${updatedDefenderAggression.toFixed(2)} (emboldened by defense)`,
          type: "success",
        });

        // Tech increases - learning from successful defense
        const defenderTechChange =
          (baseImpactPercentage / 100) * defenderTech * 1.0;
        updatedDefenderTech = Math.max(
          1,
          Math.min(1, defenderTech + defenderTechChange),
        );
        newLogs.push({
          message: `Faction ${attackerFaction === "one" ? "2" : "1"} tech increased from ${defenderTech.toFixed(2)} to ${updatedDefenderTech.toFixed(2)} (defensive innovations)`,
          type: "success",
        });

        // Endurance decreases - defending is still tiring
        const defenderEnduranceChange =
          (baseImpactPercentage / 100) * defenderEndurance * 0.8;
        updatedDefenderEndurance = Math.max(
          1,
          Math.min(3, defenderEndurance - defenderEnduranceChange),
        );
        newLogs.push({
          message: `Faction ${attackerFaction === "one" ? "2" : "1"} endurance decreased from ${defenderEndurance.toFixed(2)} to ${updatedDefenderEndurance.toFixed(2)} (defense fatigue)`,
          type: "error",
        });

        // Wealth decreases - defense costs money
        const defenderWealthChange =
          (baseImpactPercentage / 100) * defenderWealth * 1.5;
        updatedDefenderWealth = Math.max(
          1,
          Math.min(3, defenderWealth - defenderWealthChange),
        );
        newLogs.push({
          message: `Faction ${attackerFaction === "one" ? "2" : "1"} wealth decreased from ${defenderWealth.toFixed(2)} to ${updatedDefenderWealth.toFixed(2)} (defense expenses)`,
          type: "error",
        });

        // Influence increases - successful defense brings respect
        const defenderInfluenceChange =
          (baseImpactPercentage / 100) * defenderInfluence * 1.8;
        updatedDefenderInfluence = Math.max(
          1,
          Math.min(3, defenderInfluence + defenderInfluenceChange),
        );
        newLogs.push({
          message: `Faction ${attackerFaction === "one" ? "2" : "1"} influence increased from ${defenderInfluence.toFixed(2)} to ${updatedDefenderInfluence.toFixed(2)} (defensive prestige)`,
          type: "success",
        });

        // Resources decrease - used in defense
        const defenderResourceChange = impactSeverity * killCount * 0.5;
        updatedDefenderResources = Math.max(
          0,
          defenderResources - defenderResourceChange,
        );
        newLogs.push({
          message: `Faction ${attackerFaction === "one" ? "2" : "1"} resources decreased from ${defenderResources.toFixed(2)} to ${updatedDefenderResources.toFixed(2)} (defense consumption)`,
          type: "error",
        });
      }

      // Update both factions
      if (attackerFaction === "one") {
        setFactions({
          ...factions,
          factionOne: {
            ...factions.factionOne,
            manpower: updatedAttackerManpower,
            aggression: updatedAttackerAggression,
            tech: updatedAttackerTech,
            endurance: updatedAttackerEndurance,
            wealth: updatedAttackerWealth,
            influence: updatedAttackerInfluence,
            resources: updatedAttackerResources,
            factionTrust: updatedAttackerTrust, // Update trust value
          },
          factionTwo: {
            ...factions.factionTwo,
            manpower: updatedDefenderManpower,
            aggression: updatedDefenderAggression,
            tech: updatedDefenderTech,
            endurance: updatedDefenderEndurance,
            wealth: updatedDefenderWealth,
            influence: updatedDefenderInfluence,
            resources: updatedDefenderResources,
            factionTrust: updatedDefenderTrust, // Update trust value
          },
        });
      } else {
        setFactions({
          ...factions,
          factionTwo: {
            ...factions.factionTwo,
            manpower: updatedAttackerManpower,
            aggression: updatedAttackerAggression,
            tech: updatedAttackerTech,
            endurance: updatedAttackerEndurance,
            wealth: updatedAttackerWealth,
            influence: updatedAttackerInfluence,
            resources: updatedAttackerResources,
            factionTrust: updatedAttackerTrust, // Update trust value
          },
          factionOne: {
            ...factions.factionOne,
            manpower: updatedDefenderManpower,
            aggression: updatedDefenderAggression,
            tech: updatedDefenderTech,
            endurance: updatedDefenderEndurance,
            wealth: updatedDefenderWealth,
            influence: updatedDefenderInfluence,
            resources: updatedDefenderResources,
            factionTrust: updatedDefenderTrust, // Update trust value
          },
        });
      }
    }

    updateLogs(newLogs);
  };

  // Faction vs Faction Alliance Handler
  const onFactionAllianceFactionHandler = (initiatorFaction: "one" | "two") => {
    const initiator =
      initiatorFaction === "one" ? factions.factionOne : factions.factionTwo;
    const recipient =
      initiatorFaction === "one" ? factions.factionTwo : factions.factionOne;
    const newLogs: Log[] = [];

    // Extract initiator attributes
    const {
      aggression: initiatorAggression,
      tech: initiatorTech,
      endurance: initiatorEndurance,
      wealth: initiatorWealth,
      influence: initiatorInfluence,
      resources: initiatorResources,
      factionTrust: initiatorTrust,
    } = initiator;

    // Extract recipient attributes
    const {
      aggression: recipientAggression,
      tech: recipientTech,
      endurance: recipientEndurance,
      wealth: recipientWealth,
      influence: recipientInfluence,
      resources: recipientResources,
      factionTrust: recipientTrust,
    } = recipient;

    // Calculate alliance acceptance probability with weighted attributes
    const aggressionWeight = -0.3; // Highly aggressive factions less likely to ally
    const influenceWeight = 0.2;
    const techWeight = 0.15;
    const wealthWeight = 0.15;
    const enduranceWeight = 0.1;
    const trustWeight = 0.25; // Trust is a significant factor in alliance decisions

    // Relative power dynamics factor
    const initiatorPower =
      (initiatorAggression +
        initiatorTech +
        initiatorEndurance +
        initiatorWealth +
        initiatorInfluence) /
      5;
    const recipientPower =
      (recipientAggression +
        recipientTech +
        recipientEndurance +
        recipientWealth +
        recipientInfluence) /
      5;

    // Too much power difference makes alliance less likely (bell curve - middle is best)
    const powerRatio = initiatorPower / recipientPower;
    const optimalRatio = 1.0; // Equal power is optimal for alliance
    const powerBalance = Math.max(0, 1 - Math.abs(powerRatio - optimalRatio));
    const powerBalanceWeight = 0.2;

    // Calculate cultural/technological compatibility
    const techDifference = Math.abs(initiatorTech - recipientTech) / 2; // 0 to 1 scale
    const techCompatibility = 1 - techDifference;
    const techCompatibilityWeight = 0.1;

    // Trust factor - higher trust means higher alliance probability
    const trustFactor = (recipientTrust - 1) / 2; // Scale from 0 to 1

    // Calculate recipient's willingness for alliance
    const allianceWillingness =
      ((recipientAggression - 1) / 2) * aggressionWeight + // Low aggression is better for alliance
      ((recipientInfluence - 1) / 2) * influenceWeight +
      ((recipientTech - 1) / 2) * techWeight +
      ((recipientWealth - 1) / 2) * wealthWeight +
      ((recipientEndurance - 1) / 2) * enduranceWeight +
      powerBalance * powerBalanceWeight +
      techCompatibility * techCompatibilityWeight +
      trustFactor * trustWeight; // Trust is now a major factor

    // Calculate acceptance probability
    const acceptanceProbability = 0.3 + allianceWillingness; // Base 0.3 chance

    // Determine if alliance is accepted
    const allianceAccepted = acceptanceProbability > 0.5;

    // Get the highest and lowest contributing factors to explain decision
    const factors = [
      {
        name: "Aggression Level",
        value: ((recipientAggression - 1) / 2) * aggressionWeight,
      },
      {
        name: "Influence Status",
        value: ((recipientInfluence - 1) / 2) * influenceWeight,
      },
      {
        name: "Technological Level",
        value: ((recipientTech - 1) / 2) * techWeight,
      },
      {
        name: "Economic Status",
        value: ((recipientWealth - 1) / 2) * wealthWeight,
      },
      { name: "Power Balance", value: powerBalance * powerBalanceWeight },
      {
        name: "Tech Compatibility",
        value: techCompatibility * techCompatibilityWeight,
      },
      {
        name: "Trust Level",
        value: trustFactor * trustWeight,
      },
    ];

    factors.sort((a, b) => b.value - a.value);
    const topFactor = factors[0]!;
    const bottomFactor = factors[factors.length - 1]!;

    let reason = "";
    if (allianceAccepted) {
      if (topFactor.name === "Trust Level") {
        reason = `high levels of trust between factions`;
      } else {
        reason = `favorable ${topFactor.name.toLowerCase()} was decisive`;
        if (trustFactor * trustWeight > 0.05) {
          reason += ` with good trust foundation`;
        }
      }
      if (powerBalance * powerBalanceWeight > 0.05) {
        reason += ` and balanced power dynamics`;
      }
    } else {
      if (bottomFactor.name === "Trust Level" && bottomFactor.value < 0.05) {
        reason = `insufficient trust between factions`;
      } else if (recipientTrust < 1.5) {
        reason = `historical distrust impeded cooperation`;
      } else if (bottomFactor.value < 0) {
        reason = `unfavorable ${bottomFactor.name.toLowerCase()} prevented alliance`;
      } else if (recipientAggression > 2.5) {
        reason = `high aggression stance`;
      } else {
        reason = `insufficient mutual benefit perceived`;
      }
    }

    // Add detailed explanation for alliance outcome
    newLogs.push({
      message: `Alliance proposal from Faction ${initiatorFaction === "one" ? "1" : "2"} to Faction ${initiatorFaction === "one" ? "2" : "1"}: ${allianceAccepted ? "Accepted" : "Rejected"} (${reason})`,
      type: "warning",
    });

    // Calculate impact severity for attribute changes
    const baseImpactPercentage = 40; // 40% base change for alliances

    if (allianceAccepted) {
      // ALLIANCE ACCEPTED SCENARIO

      // INITIATOR CHANGES
      // Aggression decreases - alliance promotes peace
      const initiatorAggressionChange =
        (baseImpactPercentage / 100) * initiatorAggression * 1.0;
      const updatedInitiatorAggression = Math.max(
        1,
        Math.min(3, initiatorAggression - initiatorAggressionChange),
      );
      newLogs.push({
        message: `Faction ${initiatorFaction === "one" ? "1" : "2"} aggression decreased from ${initiatorAggression.toFixed(2)} to ${updatedInitiatorAggression.toFixed(2)} (peaceful relations)`,
        type: "error",
      });

      // Influence increases - alliance extends diplomatic reach
      const initiatorInfluenceChange =
        (baseImpactPercentage / 100) * initiatorInfluence * 1.5;
      const updatedInitiatorInfluence = Math.max(
        1,
        Math.min(3, initiatorInfluence + initiatorInfluenceChange),
      );
      newLogs.push({
        message: `Faction ${initiatorFaction === "one" ? "1" : "2"} influence increased from ${initiatorInfluence.toFixed(2)} to ${updatedInitiatorInfluence.toFixed(2)} (diplomatic expansion)`,
        type: "success",
      });

      // Tech increases - alliance enables technology sharing
      const initiatorTechChange =
        (baseImpactPercentage / 100) * initiatorTech * 1.0;
      const updatedInitiatorTech = Math.max(
        1,
        Math.min(3, initiatorTech + initiatorTechChange),
      );
      newLogs.push({
        message: `Faction ${initiatorFaction === "one" ? "1" : "2"} tech increased from ${initiatorTech.toFixed(2)} to ${updatedInitiatorTech.toFixed(2)} (technology sharing)`,
        type: "success",
      });

      // Endurance increases - alliance provides security
      const initiatorEnduranceChange =
        (baseImpactPercentage / 100) * initiatorEndurance * 0.8;
      const updatedInitiatorEndurance = Math.max(
        1,
        Math.min(3, initiatorEndurance + initiatorEnduranceChange),
      );
      newLogs.push({
        message: `Faction ${initiatorFaction === "one" ? "1" : "2"} endurance increased from ${initiatorEndurance.toFixed(2)} to ${updatedInitiatorEndurance.toFixed(2)} (mutual security)`,
        type: "success",
      });

      // Wealth slightly increases - alliance opens trade routes
      const initiatorWealthChange =
        (baseImpactPercentage / 100) * initiatorWealth * 0.7;
      const updatedInitiatorWealth = Math.max(
        1,
        Math.min(3, initiatorWealth + initiatorWealthChange),
      );
      newLogs.push({
        message: `Faction ${initiatorFaction === "one" ? "1" : "2"} wealth increased from ${initiatorWealth.toFixed(2)} to ${updatedInitiatorWealth.toFixed(2)} (expanded markets)`,
        type: "success",
      });

      // Resources unchanged or slightly increased through cooperation
      const initiatorResourceChange = initiatorResources * 0.05; // 5% increase
      const updatedInitiatorResources =
        initiatorResources + initiatorResourceChange;
      newLogs.push({
        message: `Faction ${initiatorFaction === "one" ? "1" : "2"} resources increased from ${initiatorResources.toFixed(2)} to ${updatedInitiatorResources.toFixed(2)} (cooperation bonus)`,
        type: "success",
      });

      // Trust significantly increases - successful alliance builds trust
      const initiatorTrustChange = (baseImpactPercentage / 100) * 2.0; // Alliance has big impact on trust
      const updatedInitiatorTrust = Math.max(
        1,
        Math.min(1, initiatorTrust + initiatorTrustChange),
      );
      newLogs.push({
        message: `Faction ${initiatorFaction === "one" ? "1" : "2"}'s trust in Faction ${initiatorFaction === "one" ? "2" : "1"} increased from ${initiatorTrust.toFixed(2)} to ${updatedInitiatorTrust.toFixed(2)} (alliance bond)`,
        type: "success",
      });

      // RECIPIENT CHANGES (similar benefits)
      // Aggression decreases - alliance promotes peace
      const recipientAggressionChange =
        (baseImpactPercentage / 100) * recipientAggression * 1.1;
      const updatedRecipientAggression = Math.max(
        1,
        Math.min(3, recipientAggression - recipientAggressionChange),
      );
      newLogs.push({
        message: `Faction ${initiatorFaction === "one" ? "2" : "1"} aggression decreased from ${recipientAggression.toFixed(2)} to ${updatedRecipientAggression.toFixed(2)} (diplomatic ties)`,
        type: "error",
      });

      // Influence increases - alliance extends diplomatic reach
      const recipientInfluenceChange =
        (baseImpactPercentage / 100) * recipientInfluence * 1.4;
      const updatedRecipientInfluence = Math.max(
        1,
        Math.min(3, recipientInfluence + recipientInfluenceChange),
      );
      newLogs.push({
        message: `Faction ${initiatorFaction === "one" ? "2" : "1"} influence increased from ${recipientInfluence.toFixed(2)} to ${updatedRecipientInfluence.toFixed(2)} (extended reach)`,
        type: "success",
      });

      // Tech increases - alliance enables technology sharing
      const recipientTechChange =
        (baseImpactPercentage / 100) * recipientTech * 1.1;
      const updatedRecipientTech = Math.max(
        1,
        Math.min(3, recipientTech + recipientTechChange),
      );
      newLogs.push({
        message: `Faction ${initiatorFaction === "one" ? "2" : "1"} tech increased from ${recipientTech.toFixed(2)} to ${updatedRecipientTech.toFixed(2)} (knowledge transfer)`,
        type: "success",
      });

      // Endurance increases - alliance provides security
      const recipientEnduranceChange =
        (baseImpactPercentage / 100) * recipientEndurance * 0.9;
      const updatedRecipientEndurance = Math.max(
        1,
        Math.min(3, recipientEndurance + recipientEnduranceChange),
      );
      newLogs.push({
        message: `Faction ${initiatorFaction === "one" ? "2" : "1"} endurance increased from ${recipientEndurance.toFixed(2)} to ${updatedRecipientEndurance.toFixed(2)} (shared defense)`,
        type: "success",
      });

      // Wealth slightly increases - alliance opens trade routes
      const recipientWealthChange =
        (baseImpactPercentage / 100) * recipientWealth * 0.6;
      const updatedRecipientWealth = Math.max(
        1,
        Math.min(3, recipientWealth + recipientWealthChange),
      );
      newLogs.push({
        message: `Faction ${initiatorFaction === "one" ? "2" : "1"} wealth increased from ${recipientWealth.toFixed(2)} to ${updatedRecipientWealth.toFixed(2)} (trade routes)`,
        type: "success",
      });

      // Resources unchanged or slightly increased through cooperation
      const recipientResourceChange = recipientResources * 0.05; // 5% increase
      const updatedRecipientResources =
        recipientResources + recipientResourceChange;
      newLogs.push({
        message: `Faction ${initiatorFaction === "one" ? "2" : "1"} resources increased from ${recipientResources.toFixed(2)} to ${updatedRecipientResources.toFixed(2)} (alliance dividend)`,
        type: "success",
      });

      // Trust significantly increases - successful alliance builds trust
      const recipientTrustChange = (baseImpactPercentage / 100) * 2.2; // Recipient gains more trust since they accepted
      const updatedRecipientTrust = Math.max(
        1,
        Math.min(3, recipientTrust + recipientTrustChange),
      );
      newLogs.push({
        message: `Faction ${initiatorFaction === "one" ? "2" : "1"}'s trust in Faction ${initiatorFaction === "one" ? "1" : "2"} increased from ${recipientTrust.toFixed(2)} to ${updatedRecipientTrust.toFixed(2)} (mutual cooperation)`,
        type: "success",
      });

      // Update both factions
      if (initiatorFaction === "one") {
        setFactions({
          ...factions,
          factionOne: {
            ...factions.factionOne,
            aggression: updatedInitiatorAggression,
            tech: updatedInitiatorTech,
            endurance: updatedInitiatorEndurance,
            wealth: updatedInitiatorWealth,
            influence: updatedInitiatorInfluence,
            resources: updatedInitiatorResources,
            factionTrust: updatedInitiatorTrust,
          },
          factionTwo: {
            ...factions.factionTwo,
            aggression: updatedRecipientAggression,
            tech: updatedRecipientTech,
            endurance: updatedRecipientEndurance,
            wealth: updatedRecipientWealth,
            influence: updatedRecipientInfluence,
            resources: updatedRecipientResources,
            factionTrust: updatedRecipientTrust,
          },
        });
      } else {
        setFactions({
          ...factions,
          factionTwo: {
            ...factions.factionTwo,
            aggression: updatedInitiatorAggression,
            tech: updatedInitiatorTech,
            endurance: updatedInitiatorEndurance,
            wealth: updatedInitiatorWealth,
            influence: updatedInitiatorInfluence,
            resources: updatedInitiatorResources,
            factionTrust: updatedInitiatorTrust,
          },
          factionOne: {
            ...factions.factionOne,
            aggression: updatedRecipientAggression,
            tech: updatedRecipientTech,
            endurance: updatedRecipientEndurance,
            wealth: updatedRecipientWealth,
            influence: updatedRecipientInfluence,
            resources: updatedRecipientResources,
            factionTrust: updatedRecipientTrust,
          },
        });
      }
    } else {
      // ALLIANCE REJECTED SCENARIO

      // INITIATOR CHANGES
      // Aggression increases - rejection creates tension
      const initiatorAggressionChange =
        (baseImpactPercentage / 100) * initiatorAggression * 0.6;
      const updatedInitiatorAggression = Math.max(
        1,
        Math.min(3, initiatorAggression + initiatorAggressionChange),
      );
      newLogs.push({
        message: `Faction ${initiatorFaction === "one" ? "1" : "2"} aggression increased from ${initiatorAggression.toFixed(2)} to ${updatedInitiatorAggression.toFixed(2)} (diplomatic frustration)`,
        type: "success",
      });

      // Influence decreases slightly - failed diplomacy
      const initiatorInfluenceChange =
        (baseImpactPercentage / 100) * initiatorInfluence * 0.4;
      const updatedInitiatorInfluence = Math.max(
        1,
        Math.min(3, initiatorInfluence - initiatorInfluenceChange),
      );
      newLogs.push({
        message: `Faction ${initiatorFaction === "one" ? "1" : "2"} influence decreased from ${initiatorInfluence.toFixed(2)} to ${updatedInitiatorInfluence.toFixed(2)} (diplomatic setback)`,
        type: "error",
      });

      // Trust decreases - rejected alliance damages trust
      const initiatorTrustChange = (baseImpactPercentage / 100) * 1.2;
      const updatedInitiatorTrust = Math.max(
        1,
        Math.min(1, initiatorTrust - initiatorTrustChange),
      );
      newLogs.push({
        message: `Faction ${initiatorFaction === "one" ? "1" : "2"}'s trust in Faction ${initiatorFaction === "one" ? "2" : "1"} decreased from ${initiatorTrust.toFixed(2)} to ${updatedInitiatorTrust.toFixed(2)} (alliance rejection)`,
        type: "error",
      });

      // Other attributes unchanged
      const updatedInitiatorTech = initiatorTech;
      const updatedInitiatorEndurance = initiatorEndurance;
      const updatedInitiatorWealth = initiatorWealth;
      const updatedInitiatorResources = initiatorResources;

      // RECIPIENT CHANGES
      // Aggression increases slightly - rejection creates tension
      const recipientAggressionChange =
        (baseImpactPercentage / 100) * recipientAggression * 0.3;
      const updatedRecipientAggression = Math.max(
        1,
        Math.min(3, recipientAggression + recipientAggressionChange),
      );
      newLogs.push({
        message: `Faction ${initiatorFaction === "one" ? "2" : "1"} aggression increased from ${recipientAggression.toFixed(2)} to ${updatedRecipientAggression.toFixed(2)} (increased wariness)`,
        type: "success",
      });

      // Trust might change slightly - they rejected but relations are still strained
      const recipientTrustChange = (baseImpactPercentage / 100) * 0.5;
      const updatedRecipientTrust = Math.max(
        1,
        Math.min(3, recipientTrust - recipientTrustChange),
      );
      newLogs.push({
        message: `Faction ${initiatorFaction === "one" ? "2" : "1"}'s trust in Faction ${initiatorFaction === "one" ? "1" : "2"} decreased from ${recipientTrust.toFixed(2)} to ${updatedRecipientTrust.toFixed(2)} (diplomatic tension)`,
        type: "error",
      });

      // Other attributes unchanged
      const updatedRecipientInfluence = recipientInfluence;
      const updatedRecipientTech = recipientTech;
      const updatedRecipientEndurance = recipientEndurance;
      const updatedRecipientWealth = recipientWealth;
      const updatedRecipientResources = recipientResources;

      // Update both factions
      if (initiatorFaction === "one") {
        setFactions({
          ...factions,
          factionOne: {
            ...factions.factionOne,
            aggression: updatedInitiatorAggression,
            tech: updatedInitiatorTech,
            endurance: updatedInitiatorEndurance,
            wealth: updatedInitiatorWealth,
            influence: updatedInitiatorInfluence,
            resources: updatedInitiatorResources,
            factionTrust: updatedInitiatorTrust,
          },
          factionTwo: {
            ...factions.factionTwo,
            aggression: updatedRecipientAggression,
            tech: updatedRecipientTech,
            endurance: updatedRecipientEndurance,
            wealth: updatedRecipientWealth,
            influence: updatedRecipientInfluence,
            resources: updatedRecipientResources,
            factionTrust: updatedRecipientTrust,
          },
        });
      } else {
        setFactions({
          ...factions,
          factionTwo: {
            ...factions.factionTwo,
            aggression: updatedInitiatorAggression,
            tech: updatedInitiatorTech,
            endurance: updatedInitiatorEndurance,
            wealth: updatedInitiatorWealth,
            influence: updatedInitiatorInfluence,
            resources: updatedInitiatorResources,
            factionTrust: updatedInitiatorTrust,
          },
          factionOne: {
            ...factions.factionOne,
            aggression: updatedRecipientAggression,
            tech: updatedRecipientTech,
            endurance: updatedRecipientEndurance,
            wealth: updatedRecipientWealth,
            influence: updatedRecipientInfluence,
            resources: updatedRecipientResources,
            factionTrust: updatedRecipientTrust,
          },
        });
      }
    }

    updateLogs(newLogs);
  };

  // Faction vs Faction Trade Handler
  const onFactionTradeFactionHandler = (
    initiatorFaction: "one" | "two",
    tradeAmount: number,
  ) => {
    const initiator =
      initiatorFaction === "one" ? factions.factionOne : factions.factionTwo;
    const recipient =
      initiatorFaction === "one" ? factions.factionTwo : factions.factionOne;
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
        message: `Trade denied: Faction ${initiatorFaction === "one" ? "1" : "2"} cannot offer more than 50% of their resources`,
        type: "warning",
      });
      updateLogs(newLogs);
      return;
    }

    // Extract initiator attributes
    const {
      aggression: initiatorAggression,
      tech: initiatorTech,
      endurance: initiatorEndurance,
      wealth: initiatorWealth,
      influence: initiatorInfluence,
      resources: initiatorResources,
      factionTrust: initiatorTrust,
    } = initiator;

    // Extract recipient attributes
    const {
      aggression: recipientAggression,
      tech: recipientTech,
      endurance: recipientEndurance,
      wealth: recipientWealth,
      influence: recipientInfluence,
      resources: recipientResources,
      factionTrust: recipientTrust,
    } = recipient;

    // Calculate trade acceptance probability with weighted attributes
    const wealthWeight = 0.2;
    const influenceWeight = 0.15;
    const aggressionWeight = -0.15;
    const techWeight = 0.1;
    const resourceWeight = 0.15;
    const enduranceWeight = 0.05;
    const trustWeight = 0.2; // Trust is an important factor in trade decisions

    // Calculate recipient's willingness to trade
    const tradeWillingness =
      ((recipientWealth - 1) / 2) * wealthWeight +
      ((recipientInfluence - 1) / 2) * influenceWeight +
      ((recipientAggression - 1) / 2) * aggressionWeight +
      ((recipientTech - 1) / 2) * techWeight +
      ((recipientEndurance - 1) / 2) * enduranceWeight +
      ((recipientTrust - 1) / 2) * trustWeight; // Trust factor added

    // Adjust based on the attractiveness of the trade for the recipient
    const tradeAttractivenessForRecipient =
      Math.min(1, tradeAmount / (recipientResources * 5)) * resourceWeight;

    // Trust influences relationship - higher trust means better deals and more willingness
    const relationshipFactor =
      Math.min(1, Math.max(0, (3 - initiatorAggression) / 2)) * 0.15 + // Less aggressive initiator
      Math.min(1, Math.max(0, (recipientTrust - 1) / 2)) * 0.15; // Higher trust improves relationship

    // Calculate acceptance probability
    const acceptanceProbability =
      tradeWillingness + tradeAttractivenessForRecipient + relationshipFactor;

    // Determine if trade is accepted
    const tradeAccepted = acceptanceProbability > 0.5;

    // Get the highest and lowest contributing factors to explain decision
    const factors = [
      {
        name: "Wealth Status",
        value: ((recipientWealth - 1) / 2) * wealthWeight,
      },
      {
        name: "Influence",
        value: ((recipientInfluence - 1) / 2) * influenceWeight,
      },
      {
        name: "Aggression",
        value: ((recipientAggression - 1) / 2) * aggressionWeight,
      },
      { name: "Tech Level", value: ((recipientTech - 1) / 2) * techWeight },
      { name: "Trade Value", value: tradeAttractivenessForRecipient },
      { name: "Relationship", value: relationshipFactor },
      { name: "Trust Level", value: ((recipientTrust - 1) / 2) * trustWeight },
    ];

    factors.sort((a, b) => b.value - a.value);
    const topFactor = factors[0]!;
    const bottomFactor = factors[factors.length - 1]!;

    let reason = "";
    if (tradeAccepted) {
      if (topFactor.name === "Trust Level") {
        reason = `high level of trust facilitated agreement`;
      } else if (topFactor.name === "Relationship") {
        reason = `positive diplomatic relations`;
      } else {
        reason = `high ${topFactor.name.toLowerCase()} was the deciding factor`;
        if (((recipientTrust - 1) / 2) * trustWeight > 0.05) {
          reason += ` with trust reinforcing the deal`;
        }
      }
    } else {
      if (bottomFactor.name === "Trust Level" && bottomFactor.value < 0.05) {
        reason = `insufficient trust between factions`;
      } else if (recipientTrust < 1.5) {
        reason = `lack of trust impeded negotiations`;
      } else if (bottomFactor.value < 0) {
        reason = `${bottomFactor.name.toLowerCase()} prevented agreement`;
      } else {
        reason = `overall insufficient trading desire`;
      }
    }

    // Add detailed explanation for trade outcome
    newLogs.push({
      message: `Trade proposal from Faction ${initiatorFaction === "one" ? "1" : "2"} to Faction ${initiatorFaction === "one" ? "2" : "1"} with value ${tradeAmount}: ${tradeAccepted ? "Accepted" : "Rejected"} (${reason})`,
      type: "warning",
    });

    // Calculate impact severity based on trade amount relative to resources
    const initiatorImpactSeverity = Math.min(
      0.8,
      tradeAmount / initiatorResources,
    );
    const recipientImpactSeverity = Math.min(
      0.8,
      tradeAmount / recipientResources,
    );

    // Calculate base percentage changes
    const initiatorBaseImpactPercentage = initiatorImpactSeverity * 30; // Up to 30% change
    const recipientBaseImpactPercentage = recipientImpactSeverity * 30; // Up to 30% change

    if (tradeAccepted) {
      // TRADE ACCEPTED SCENARIO

      // INITIATOR CHANGES
      // Wealth increases - trade is profitable for initiator
      const initiatorWealthChange =
        (initiatorBaseImpactPercentage / 100) * initiatorWealth * 1.0;
      const updatedInitiatorWealth = Math.max(
        1,
        Math.min(3, initiatorWealth + initiatorWealthChange),
      );
      newLogs.push({
        message: `Faction ${initiatorFaction === "one" ? "1" : "2"} wealth increased from ${initiatorWealth.toFixed(2)} to ${updatedInitiatorWealth.toFixed(2)} (trade profit)`,
        type: "success",
      });

      // Influence increases slightly - trade connections build influence
      const initiatorInfluenceChange =
        (initiatorBaseImpactPercentage / 100) * initiatorInfluence * 0.7;
      const updatedInitiatorInfluence = Math.max(
        1,
        Math.min(3, initiatorInfluence + initiatorInfluenceChange),
      );
      newLogs.push({
        message: `Faction ${initiatorFaction === "one" ? "1" : "2"} influence increased from ${initiatorInfluence.toFixed(2)} to ${updatedInitiatorInfluence.toFixed(2)} (trade connections)`,
        type: "success",
      });

      // Aggression decreases slightly - trade fosters cooperation
      const initiatorAggressionChange =
        (initiatorBaseImpactPercentage / 100) * initiatorAggression * 0.5;
      const updatedInitiatorAggression = Math.max(
        1,
        Math.min(3, initiatorAggression - initiatorAggressionChange),
      );
      newLogs.push({
        message: `Faction ${initiatorFaction === "one" ? "1" : "2"} aggression decreased from ${initiatorAggression.toFixed(2)} to ${updatedInitiatorAggression.toFixed(2)} (trade cooperation)`,
        type: "error",
      });

      // Tech increases slightly - trade facilitates knowledge exchange
      const initiatorTechChange =
        (initiatorBaseImpactPercentage / 100) * initiatorTech * 0.6;
      const updatedInitiatorTech = Math.max(
        1,
        Math.min(3, initiatorTech + initiatorTechChange),
      );
      newLogs.push({
        message: `Faction ${initiatorFaction === "one" ? "1" : "2"} tech increased from ${initiatorTech.toFixed(2)} to ${updatedInitiatorTech.toFixed(2)} (knowledge exchange)`,
        type: "success",
      });

      // Trust increases - successful trade builds trust
      const initiatorTrustChange = (initiatorBaseImpactPercentage / 100) * 1.2;
      const updatedInitiatorTrust = Math.max(
        1,
        Math.min(3, initiatorTrust + initiatorTrustChange),
      );
      newLogs.push({
        message: `Faction ${initiatorFaction === "one" ? "1" : "2"}'s trust in Faction ${initiatorFaction === "one" ? "2" : "1"} increased from ${initiatorTrust.toFixed(2)} to ${updatedInitiatorTrust.toFixed(2)} (successful exchange)`,
        type: "success",
      });

      // Endurance unchanged
      const updatedInitiatorEndurance = initiatorEndurance;

      // Resources decrease for initiator - they're giving resources in trade
      const initiatorResourceChange = tradeAmount;
      const updatedInitiatorResources = Math.max(
        0,
        initiatorResources - initiatorResourceChange,
      );
      newLogs.push({
        message: `Faction ${initiatorFaction === "one" ? "1" : "2"} resources decreased from ${initiatorResources.toFixed(2)} to ${updatedInitiatorResources.toFixed(2)} (trade expenditure)`,
        type: "error",
      });

      // RECIPIENT CHANGES
      // Wealth increases - trade benefits recipient too
      const recipientWealthChange =
        (recipientBaseImpactPercentage / 100) * recipientWealth * 1.0;
      const updatedRecipientWealth = Math.max(
        1,
        Math.min(3, recipientWealth + recipientWealthChange),
      );
      newLogs.push({
        message: `Faction ${initiatorFaction === "one" ? "2" : "1"} wealth increased from ${recipientWealth.toFixed(2)} to ${updatedRecipientWealth.toFixed(2)} (trade benefit)`,
        type: "success",
      });

      // Influence increases slightly - trade connections build influence for recipient too
      const recipientInfluenceChange =
        (recipientBaseImpactPercentage / 100) * recipientInfluence * 0.6;
      const updatedRecipientInfluence = Math.max(
        1,
        Math.min(3, recipientInfluence + recipientInfluenceChange),
      );
      newLogs.push({
        message: `Faction ${initiatorFaction === "one" ? "2" : "1"} influence increased from ${recipientInfluence.toFixed(2)} to ${updatedRecipientInfluence.toFixed(2)} (expanded network)`,
        type: "success",
      });

      // Aggression decreases slightly - trade fosters cooperation
      const recipientAggressionChange =
        (recipientBaseImpactPercentage / 100) * recipientAggression * 0.4;
      const updatedRecipientAggression = Math.max(
        1,
        Math.min(3, recipientAggression - recipientAggressionChange),
      );
      newLogs.push({
        message: `Faction ${initiatorFaction === "one" ? "2" : "1"} aggression decreased from ${recipientAggression.toFixed(2)} to ${updatedRecipientAggression.toFixed(2)} (mutual benefit)`,
        type: "error",
      });

      // Tech increases slightly - trade facilitates knowledge exchange
      const recipientTechChange =
        (recipientBaseImpactPercentage / 100) * recipientTech * 0.5;
      const updatedRecipientTech = Math.max(
        1,
        Math.min(3, recipientTech + recipientTechChange),
      );
      newLogs.push({
        message: `Faction ${initiatorFaction === "one" ? "2" : "1"} tech increased from ${recipientTech.toFixed(2)} to ${updatedRecipientTech.toFixed(2)} (knowledge exchange)`,
        type: "success",
      });

      // Trust increases - successful trade builds trust
      const recipientTrustChange = (recipientBaseImpactPercentage / 100) * 1.0;
      const updatedRecipientTrust = Math.max(
        1,
        Math.min(3, recipientTrust + recipientTrustChange),
      );
      newLogs.push({
        message: `Faction ${initiatorFaction === "one" ? "2" : "1"}'s trust in Faction ${initiatorFaction === "one" ? "1" : "2"} increased from ${recipientTrust.toFixed(2)} to ${updatedRecipientTrust.toFixed(2)} (fair trading practices)`,
        type: "success",
      });

      // Endurance unchanged
      const updatedRecipientEndurance = recipientEndurance;

      // Resources increase for recipient - they're receiving resources in trade
      const recipientResourceChange = tradeAmount * 1.2; // 20% bonus to represent value of trade
      const updatedRecipientResources =
        recipientResources + recipientResourceChange;
      newLogs.push({
        message: `Faction ${initiatorFaction === "one" ? "2" : "1"} resources increased from ${recipientResources.toFixed(2)} to ${updatedRecipientResources.toFixed(2)} (trade acquisition)`,
        type: "success",
      });

      // Update both factions
      if (initiatorFaction === "one") {
        setFactions({
          ...factions,
          factionOne: {
            ...factions.factionOne,
            aggression: updatedInitiatorAggression,
            tech: updatedInitiatorTech,
            endurance: updatedInitiatorEndurance,
            wealth: updatedInitiatorWealth,
            influence: updatedInitiatorInfluence,
            resources: updatedInitiatorResources,
            factionTrust: updatedInitiatorTrust,
          },
          factionTwo: {
            ...factions.factionTwo,
            aggression: updatedRecipientAggression,
            tech: updatedRecipientTech,
            endurance: updatedRecipientEndurance,
            wealth: updatedRecipientWealth,
            influence: updatedRecipientInfluence,
            resources: updatedRecipientResources,
            factionTrust: updatedRecipientTrust,
          },
        });
      } else {
        setFactions({
          ...factions,
          factionTwo: {
            ...factions.factionTwo,
            aggression: updatedInitiatorAggression,
            tech: updatedInitiatorTech,
            endurance: updatedInitiatorEndurance,
            wealth: updatedInitiatorWealth,
            influence: updatedInitiatorInfluence,
            resources: updatedInitiatorResources,
            factionTrust: updatedInitiatorTrust,
          },
          factionOne: {
            ...factions.factionOne,
            aggression: updatedRecipientAggression,
            tech: updatedRecipientTech,
            endurance: updatedRecipientEndurance,
            wealth: updatedRecipientWealth,
            influence: updatedRecipientInfluence,
            resources: updatedRecipientResources,
            factionTrust: updatedRecipientTrust,
          },
        });
      }
    } else {
      // If trade is rejected, there might be slight negative trust impact
      // This creates consequences for rejected trades

      // Calculate small trust changes
      const trustImpactPercentage = 10; // Smaller impact for rejection than acceptance

      // Initiator trust decreases slightly - rejection creates minor frustration
      const initiatorTrustChange = (trustImpactPercentage / 100) * 0.5;
      const updatedInitiatorTrust = Math.max(
        1,
        Math.min(3, initiatorTrust - initiatorTrustChange),
      );

      // Recipient trust is largely unchanged but might decrease slightly
      const recipientTrustChange = (trustImpactPercentage / 100) * 0.2;
      const updatedRecipientTrust = Math.max(
        1,
        Math.min(3, recipientTrust - recipientTrustChange),
      );

      newLogs.push({
        message: `Faction ${initiatorFaction === "one" ? "1" : "2"}'s trust in Faction ${initiatorFaction === "one" ? "2" : "1"} slightly decreased from ${initiatorTrust.toFixed(2)} to ${updatedInitiatorTrust.toFixed(2)} (rejected proposal)`,
        type: "error",
      });

      // Update only trust values to reflect rejection
      if (initiatorFaction === "one") {
        setFactions({
          ...factions,
          factionOne: {
            ...factions.factionOne,
            factionTrust: updatedInitiatorTrust,
          },
          factionTwo: {
            ...factions.factionTwo,
            factionTrust: updatedRecipientTrust,
          },
        });
      } else {
        setFactions({
          ...factions,
          factionTwo: {
            ...factions.factionTwo,
            factionTrust: updatedInitiatorTrust,
          },
          factionOne: {
            ...factions.factionOne,
            factionTrust: updatedRecipientTrust,
          },
        });
      }
    }

    updateLogs(newLogs);
  };

  const triggerFactionInteraction = (): void => {
    const { factionOne, factionTwo } = factions;

    // Decide which faction will be the initiator - prioritize the faction with higher aggression
    // Also give slight preference to faction that wasn't interacted with by player (for variety)
    const lastInteractedFaction = lastPlayerInteraction.faction;
    const f1InitiatorScore =
      factionOne.aggression * 1.2 + (lastInteractedFaction === "one" ? 0 : 0.3);
    const f2InitiatorScore =
      factionTwo.aggression * 1.2 + (lastInteractedFaction === "two" ? 0 : 0.3);

    const initiator = f1InitiatorScore > f2InitiatorScore ? "one" : "two";
    const initiatorFaction = initiator === "one" ? factionOne : factionTwo;
    const recipientFaction = initiator === "one" ? factionTwo : factionOne;

    // Extract attributes
    const {
      aggression: initAggression,
      tech: initTech,
      endurance: initEndurance,
      wealth: initWealth,
      influence: initInfluence,
      manpower: initManpower,
      resources: initResources,
      factionTrust: initTrust,
    } = initiatorFaction;

    const {
      aggression: recpAggression,
      tech: recpTech,
      endurance: recpEndurance,
      wealth: recpWealth,
      influence: recpInfluence,
      manpower: recpManpower,
      resources: recpResources,
      factionTrust: recpTrust,
    } = recipientFaction;

    // Calculate power metrics
    const initiatorPower =
      (initAggression + initTech + initEndurance + initWealth + initInfluence) /
      5;
    const recipientPower =
      (recpAggression + recpTech + recpEndurance + recpWealth + recpInfluence) /
      5;
    const powerRatio = initiatorPower / recipientPower;

    // ATTACK SCORING
    let attackScore = 0;
    attackScore += initAggression * 0.4; // Base aggression influence

    // Trust inversely affects attack likelihood
    // Lower trust means higher attack probability
    attackScore += (3 - initTrust) * 0.35; // Trust factor (max +0.7 for minimum trust)

    if (initResources < 10) attackScore += 0.3; // Desperate for resources
    if (powerRatio > 1.2)
      attackScore += 0.3; // Much stronger
    else if (powerRatio < 0.8) attackScore -= 0.4; // Much weaker
    if (recpEndurance < 1.5) attackScore += 0.2; // Low endurance target
    if (recpWealth > 2.5) attackScore += 0.2; // High wealth target
    if (initManpower < 20) attackScore -= 0.3; // Low on manpower

    // High recipient trust makes them look vulnerable (poor intel sharing)
    if (recpTrust > 2.5) attackScore += 0.15; // Trusting target might be unprepared

    // Calculate attack value - between 10% and 50% of available manpower based on aggression
    const attackValue = Math.round(
      initManpower * (0.1 + (initAggression - 1) * 0.2),
    );

    // TRADE SCORING
    let tradeScore = 0;
    tradeScore += initWealth * 0.3; // Base wealth influence
    tradeScore += (4 - initAggression) * 0.2; // Higher for lower aggression

    // Trust directly affects trade likelihood
    // Higher trust means higher trade probability
    tradeScore += initTrust * 0.3; // Trust is important for trade relations

    if (initResources > 30) tradeScore += 0.3; // High resources favor trade
    if (initTech < 2 && recpTech > 2.5) tradeScore += 0.3; // Tech disparity encourages trade
    if (Math.abs(initWealth - recpWealth) > 1) tradeScore += 0.2; // Wealth disparity

    // Established trade relations (via trust) increase likelihood
    if (initTrust > 2 && recpTrust > 2) tradeScore += 0.25; // Established trade relationship

    // Calculate trade value - between 5% and 20% of resources based on wealth
    const tradeValue = Math.round(
      initResources * (0.05 + (initWealth - 1) * 0.075),
    );

    // ALLIANCE SCORING
    let allianceScore = 0;
    allianceScore += initInfluence * 0.3; // Base influence factor
    allianceScore += (4 - initAggression) * 0.25; // Lower aggression favors alliance

    // Trust significantly affects alliance likelihood
    // Very high trust increases alliance probability substantially
    allianceScore += initTrust * 0.4; // Trust is critical for alliance

    if (initEndurance < 1.5) allianceScore += 0.4; // Low endurance seeks protection
    if (initManpower < 15) allianceScore += 0.3; // Low manpower seeks allies
    if (Math.abs(initTech - recpTech) < 0.5) allianceScore += 0.2; // Similar tech levels
    if (powerRatio > 0.8 && powerRatio < 1.2) allianceScore += 0.3; // Balanced power

    // Mutual high trust is necessary for alliance
    if (initTrust > 2.2 && recpTrust > 2.2) {
      allianceScore += 0.5; // Strong foundation of mutual trust
    } else if (initTrust < 1.5 || recpTrust < 1.5) {
      allianceScore -= 0.6; // Distrust makes alliance very unlikely
    }

    // Add small random factor to each score (0-0.2)
    const randomFactor = 0.2;
    const finalAttackScore = attackScore + Math.random() * randomFactor;
    const finalTradeScore = tradeScore + Math.random() * randomFactor;
    const finalAllianceScore = allianceScore + Math.random() * randomFactor;

    // Get highest score and determine action
    const highestScore = Math.max(
      finalAttackScore,
      finalTradeScore,
      finalAllianceScore,
    );
    let action;
    let reason = "";

    if (highestScore === finalAttackScore) {
      action = "attack";
      if (initTrust < 1.5) {
        reason = "deep distrust and hostility";
      } else if (powerRatio > 1.2) {
        reason = "significant power advantage";
      } else if (initResources < 10) {
        reason = "desperate need for resources";
      } else {
        reason = "aggressive tendencies";
      }
    } else if (highestScore === finalTradeScore) {
      action = "trade";
      if (initTrust > 2) {
        reason = "established trade relationship";
      } else if (Math.abs(initTech - recpTech) > 1) {
        reason = "beneficial technology exchange";
      } else if (initResources > 30) {
        reason = "resource surplus";
      } else {
        reason = "economic opportunity";
      }
    } else {
      action = "alliance";
      if (initTrust > 2.2 && recpTrust > 2.2) {
        reason = "strong mutual trust";
      } else if (initEndurance < 1.5 || initManpower < 15) {
        reason = "need for protection";
      } else if (powerRatio > 0.8 && powerRatio < 1.2) {
        reason = "balanced power relationship";
      } else {
        reason = "diplomatic opportunity";
      }
    }

    // Log the faction's decision with more specific reasoning
    const newLogs: Log[] = [
      {
        message: `Faction ${initiator === "one" ? "1" : "2"} decided to ${action} Faction ${initiator === "one" ? "2" : "1"} due to ${reason}.`,
        type: "info",
      },
      {
        message: `Decision factors - Attack: ${attackScore.toFixed(2)}, Trade: ${tradeScore.toFixed(2)}, Alliance: ${allianceScore.toFixed(2)}`,
        type: "info",
      },
    ];

    // Add trust-specific log if it was a significant factor
    if (
      (action === "attack" && initTrust < 1.5) ||
      (action === "trade" && initTrust > 2) ||
      (action === "alliance" && initTrust > 2.2)
    ) {
      newLogs.push({
        message: `Trust level (${initTrust.toFixed(2)}) was a decisive factor in this decision.`,
        type: "info",
      });
    }

    updateLogs(newLogs);

    // Execute the chosen action
    switch (action) {
      case "attack":
        onFactionAttackFactionHandler(initiator, attackValue);
        break;
      case "trade":
        onFactionTradeFactionHandler(initiator, tradeValue);
        break;
      case "alliance":
        onFactionAllianceFactionHandler(initiator);
        break;
    }
  };

  return (
    <Button
      onClick={() => {
        triggerFactionInteraction();
      }}
    >
      Simulate Consequences
    </Button>
  );
};

export default Simulator;
