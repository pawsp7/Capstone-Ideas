import { useSyncExternalStore } from "react";
import { getBrowserStore, type Snapshot } from "./store";

export function useGarden(): Snapshot {
  const store = getBrowserStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

export function gardenStore() {
  return getBrowserStore();
}
