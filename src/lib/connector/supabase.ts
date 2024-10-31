import { SupabaseClient } from "@supabase/supabase-js";
import { produce } from "solid-js/store";
import { filters, setItems, tablesMap } from "../../utils";

import type { ClientProvider, PayloadSettings } from "../../types";

export const supaConnector: ClientProvider<SupabaseClient, () => any[]> = (
  client,
  tables,
  set
) => {
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
        const settings: PayloadSettings<typeof payload> = {
          getNewId: (item) => item.new?.id,
          getTable: (item) => item.table,
          getType: (item) => item.eventType,
          getNewItem: (item) => item.new,
          getOldId: (item) => item.old?.id,
          checkInsert: 'INSERT',
          checkUpdate: 'UPDATE',
        }
        setItems(set, settings, payload)
      }
    )
    .subscribe();
};

