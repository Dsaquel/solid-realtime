import { createStore } from "solid-js/store";
import { ClientProvider, TableSelector } from "../types";

import { supaConnector } from "./connector/supabase";

export function useWatcher<T, X>(
  client: T,
  tables: TableSelector<X>[],
  clientProvider: ClientProvider<T, X> = supaConnector as any
) {
  const [store, setStore] = createStore<Record<string, any[]>>({});

  clientProvider(client, tables, setStore);

  return {
    store,
  };
}
