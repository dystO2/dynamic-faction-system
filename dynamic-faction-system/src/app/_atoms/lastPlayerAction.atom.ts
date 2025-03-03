import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { atomWithReset, useResetAtom } from "jotai/utils";

interface PlayerInteraction {
  faction: "one" | "two" | null;
  action: "attack" | "trade with" | "form an alliance with" | null;
}

const lastPlayerInteraction = atomWithReset<PlayerInteraction>({
  faction: null,
  action: null,
});

export const useLastPlayerInteractionAtomValue = () =>
  useAtomValue(lastPlayerInteraction);
export const useSetLastPlayerInteractionAtomValue = () =>
  useSetAtom(lastPlayerInteraction);
export const useLastPlayerInteractionAtom = () =>
  useAtom(lastPlayerInteraction);
export const useResetLastPlayerInteractionAtomValue = () =>
  useResetAtom(lastPlayerInteraction);
