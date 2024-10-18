import { createStore, produce, SetStoreFunction } from "solid-js/store";
import { SupabaseClient } from "@supabase/supabase-js";

type GenericClient = {
  get(
    table: string,
    customTable?: string,
    query?: () => Promise<any[]>
  ): Promise<any[]>;
};

type QueryType =
  | string
  | {
      customTable: string;
      table: string;
      query?: () => Promise<any[]>;
      filter?: (item: any) => boolean;
    };

type TableSelector = string | QueryType;

export const supaConnector = (
  client: SupabaseClient,
  tablesMap: Map<string, string[]>,
  set: SetStoreFunction<Record<string, any[]>>,
  filters: Record<string, ((item: any) => boolean) | undefined>
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
          produce(async (state) => {
            console.log(payload);
            for (const customTable of tablesMap.get(payload.table) ?? []) {
              const filter = filters[customTable] ?? (() => true);
              console.log(filters);
              if (payload.eventType === "INSERT") {
                if (filter(payload.new)) {
                  state[customTable].push(payload.new);
                }
              } else if (payload.eventType === "UPDATE") {
                const idx = state[customTable].findIndex(
                  (s) => s.id === payload.new.id
                );
                if (idx !== -1) {
                  if (filter(payload.new)) {
                    state[customTable][idx] = payload.new;
                  } else {
                    state[customTable].splice(idx, 1);
                  }
                } else if (filter(payload.new)) {
                  state[customTable].push(payload.new);
                }
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
    async get(
      customTable: string,
      table: string,
      query?: () => Promise<any[]>
    ): Promise<any[]> {
      const init =
        query ?? (async () => (await client.from(table).select()).data!);
      const data = await init();
      console.log("DATA: ", data);
      console.log("FILTERS: ", filters);
      const filter = filters[customTable];
      console.log("CUSTOM TABLE", customTable);
      return filter ? data.filter(filter) : data;
    },
  };
};

export function useWatcher<T>(
  client: T,
  tables: TableSelector[],
  clientProvider: (
    client: T,
    tablesMap: Map<string, string[]>,
    set: SetStoreFunction<Record<string, any[]>>,
    filters: Record<string, ((item: any) => boolean) | undefined>
  ) => GenericClient
) {
  console.log("HELLO WATCHER");
  const [store, setStore] = createStore<Record<string, any[]>>({});

  let tablesMap = new Map<string, string[]>();
  let filters: Record<string, ((item: any) => boolean) | undefined> = {};
  for (const tableSelector of tables) {
    let customTable: string, table: string;
    if (typeof tableSelector !== "string") {
      customTable = tableSelector.customTable;
      table = tableSelector.table;
      filters[customTable] = tableSelector.filter;
    } else {
      customTable = tableSelector;
      table = tableSelector;
    }

    tablesMap.get(table)?.push(customTable) ||
      tablesMap.set(table, [customTable]);
  }

  const initializedClient = clientProvider(
    client,
    tablesMap,
    setStore,
    filters
  );

  setStore(
    produce(async (state) => {
      for (const tableSelector of tables) {
        let customTable, table, query;
        if (typeof tableSelector === "string") {
          customTable = tableSelector;
          table = customTable;
        } else {
          customTable = tableSelector.customTable;
          table = tableSelector.table;
          query = tableSelector.query;
        }
        state[customTable] = await initializedClient.get(
          customTable,
          table,
          query
        );
      }
    })
  );

  return {
    store,
  };
}
