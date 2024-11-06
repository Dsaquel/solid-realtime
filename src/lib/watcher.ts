import { createStore } from "solid-js/store";
import { supaConnector } from "./connector/supabase";

import type { ClientProvider, TableSelector } from "../types";

export function createDatabaseWatcher<T, X>(
  client: T,
  tables: TableSelector<X>[],
  clientProvider: ClientProvider<T, X> = supaConnector as any
): { store: Record<string, any[]> } {
  const [store, setStore] = createStore<Record<string, any[]>>({});

  clientProvider(client, tables, setStore);

  return {
    store,
  };
}
