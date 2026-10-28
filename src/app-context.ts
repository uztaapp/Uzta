import { createContext, useContext } from "react";
import type { Command, LocalStore } from "./lib/local-model";
export type AppContextValue = {
  data: LocalStore;
  run: (command: Command) => Promise<boolean>;
  show: (text: string) => void;
  storageError: string;
  mode: "demo" | "cloud";
  busy: boolean;
  managedFarmId: string | null;
  userId: string | null;
  switchMode: (mode: "demo" | "cloud") => void;
  refresh: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<string>;
  signOut: () => Promise<void>;
  requestPasswordReset?: (email: string) => Promise<void>;
};
export const AppContext = createContext<AppContextValue | null>(null);
export function useUzta() {
  const value = useContext(AppContext);
  if (!value) throw Error("UZTA provider missing");
  return value;
}
