import { SupabaseClient } from "@supabase/supabase-js";
import { produce } from "solid-js/store";

import { ClientProvider } from "../../types";
import { addElement, deleteElement, editElement } from "../../utils/utils";

export const supaConnector: ClientProvider<SupabaseClient, () => any[]> = (
  client,
  tables,
  set
) => {
  const tablesMap = new Map<string, string[]>();
  const filters: Record<string, ((item: any) => boolean) | undefined> = {};

  set(
    produce(async (state) => {
      for (const tableSelector of tables) {
        let name, query, table: string;
        if (typeof tableSelector !== "string") {
          name = tableSelector.name;
          table = tableSelector.table;
          query = tableSelector.query;
          filters[name] = tableSelector.filter;
        } else {
          name = tableSelector;
          table = tableSelector;
          query = async () => (await client.from(table).select()).data!;
        }

        tablesMap.get(table)?.push(name) || tablesMap.set(table, [name]);
        state[name] = (await query?.()) ?? [];
      }
    })
  );

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
            for (const name of tablesMap.get(payload.table) ?? []) {
              const filter = filters[name] ?? (() => true);
              if (payload.eventType === "INSERT") {
                if (filter(payload.new)) {
                  addElement(state[name], payload.new);
                }
              } else if (payload.eventType === "UPDATE") {
                const idx = state[name].findIndex(
                  (s) => s.id === payload.new.id
                );
                if (idx !== -1) {
                  if (filter(payload.new)) {
                    editElement(state[name], idx, payload.new);
                  } else {
                    deleteElement(state[name], idx);
                  }
                } else if (filter(payload.new)) {
                  addElement(state[name], payload.new);
                }
              } else {
                const idx = state[name].findIndex(
                  (s) => s.id === payload.old.id
                );
                if (idx === -1) return;
                deleteElement(state[name], idx);
              }
            }
          })
        );
      }
    )
    .subscribe();
};
