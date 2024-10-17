import { createStore, produce, SetStoreFunction } from "solid-js/store";
import { SupabaseClient } from "@supabase/supabase-js";

type GenericClient = {
  get(table: string, query?: () => Promise<any[]>): Promise<any[]>;
};

type QueryType = [string, string, (() => Promise<any[]>) | undefined];

type TableSelector = string | QueryType;

export const supaConnector = (
  client: SupabaseClient,
  tablesMap: Map<string, string[]>,
  set: SetStoreFunction<Record<string, any[]>>
): GenericClient => {
  client
    .channel("schema-db-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
      },
      (payload) => {
        console.log(payload);
        set(
          produce((state) => {
            console.log(payload);

            for (const customTable of tablesMap.get(payload.table) ?? []) {
              if (payload.eventType === "INSERT") {
                state[customTable].push(payload.new);
              } else if (payload.eventType === "UPDATE") {
                const idx = state[customTable].findIndex(
                  (s) => s.id === payload.new.id
                );
                if (idx === -1) return;
                state[customTable][idx] = payload.new;
              } else {
                const idx = state[customTable].findIndex(
                  (s) => s.id === payload.old.id
                );
                if (idx === -1) return;
                state[customTable].splice(idx, 1);
              }
            }
          })
        );
      }
    )
    .subscribe();

  return {
    async get(table: string, query?: () => Promise<any[]>): Promise<any[]> {
      const init =
        query || (async () => (await client.from(table).select()).data!);
      return await init();
    },
  };
};

export function useWatcher<T>(
  client: T,
  tables: TableSelector[],
  clientProvider: (
    client: T,
    tablesMap: Map<string, string[]>,
    set: SetStoreFunction<Record<string, any[]>>
  ) => GenericClient
) {
  const [store, setStore] = createStore<Record<string, any[]>>({});

  let tablesMap = new Map<string, string[]>();
  for (const tableSelector of tables) {
    let customTable, table;
    if (typeof tableSelector !== "string") {
      customTable = tableSelector[0];
      table = tableSelector[1];
    } else {
      customTable = tableSelector;
      table = tableSelector;
    }

    tablesMap.get(table)?.push(customTable) ||
      tablesMap.set(table, [customTable]);
  }

  const initializedClient = clientProvider(client, tablesMap, setStore);

  setStore(
    produce(async (state) => {
      for (const tableSelector of tables) {
        let customTable, table, query;
        if (typeof tableSelector === "string") {
          customTable = tableSelector;
          table = customTable;
        } else {
          customTable = tableSelector[0];
          table = tableSelector[1];
          query = tableSelector[2];
        }
        state[customTable] = await initializedClient.get(table, query);
      }
    })
  );

  return {
    store,
  };
}
