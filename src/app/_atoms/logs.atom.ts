import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { atomWithReset, useResetAtom } from "jotai/utils";

export interface Log {
  message: string;
  type: "info" | "warning" | "error" | "success";
}

const logs = atomWithReset<Log[]>([]);

export const useLogsAtomValue = () => useAtomValue(logs);
export const useSetLogsAtomValue = () => useSetAtom(logs);
export const useLogsAtom = () => useAtom(logs);
export const useResetLogsAtomValue = () => useResetAtom(logs);
