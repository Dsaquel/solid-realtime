import { createStore, produce, SetStoreFunction } from "solid-js/store";
import { SupabaseClient } from "@supabase/supabase-js";

type GenericClient = {
  getAll(table: string): Promise<any[]>;
};

export const supaConnector = (
  client: SupabaseClient,
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
        set(
          produce((state) => {
            console.log(payload);
            if (payload.eventType === "INSERT") {
              state[payload.table].push(payload.new);
            } else if (payload.eventType === "UPDATE") {
              const idx = state[payload.table].findIndex(
                (s) => s.id === payload.new.id
              );
              if (idx === -1) return;
              state[payload.table][idx] = payload.new;
            } else {
              const idx = state[payload.table].findIndex(
                (s) => s.id === payload.old.id
              );
              if (idx === -1) return;
              state[payload.table].splice(idx, 1);
            }
          })
        );
      }
    )
    .subscribe();

  return {
    async getAll(table: string) {
      return (await client.from(table).select()).data!;
    },
  };
};

export function useWatcher<T>(
  client: T,
  tables: string[],
  clientProvider: (
    client: T,
    set: SetStoreFunction<Record<string, any[]>>
  ) => GenericClient
) {
  const [store, setStore] = createStore<Record<string, any[]>>({});

  const initializedClient = clientProvider(client, setStore);

  setStore(
    produce(async (state) => {
      for (const table of tables)
        state[table] = await initializedClient.getAll(table);
    })
  );

  return {
    store,
  };
}
