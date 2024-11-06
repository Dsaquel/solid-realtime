import { produce } from "solid-js/store";
import { computeFilters, setItems } from "../../utils";

import type {
  ClientProvider,
  PayloadSettings,
  PostgrestPayload,
} from "../../types";

async function pollFromPostgrest(
  baseUrl: string,
  tables: string[] = ["countries"],
  intervalSeconds: number = 5,
  callback: (payload: PostgrestPayload) => void = () => {}
) {
  // Keep track of the last check time
  let lastCheckTime = new Date();

  while (true) {
    try {
      const changes: PostgrestPayload[] = [];
      const currentCheckTime = new Date();
      const timestampDate = lastCheckTime.toISOString();

      for (const table of tables) {
        const model = (route: string) =>
          fetch(`${baseUrl}/${route}`).then((s) => s.json() as Promise<any[]>);

        const createdPromise = await model(
          `${table}?created_at=gte.${timestampDate}&deleted_at=is.null`
        );

        const updatedPromise = await model(
          `${table}?created_at=lt.${timestampDate}&updated_at=gte.${timestampDate}&deleted_at=is.null`
        );

        const deletedPromise = await model(
          `${table}?&deleted_at=gte.${timestampDate}`
        );

        const [created, updated, deleted] = await Promise.all([
          createdPromise,
          updatedPromise,
          deletedPromise,
        ]);

        // Add changes to our collection
        created.forEach((record: any) => {
          changes.push({
            type: "INSERT",
            table,
            record,
            timestamp: record.createdAt,
          });
        });

        updated.forEach((record: any) => {
          changes.push({
            type: "UPDATE",
            table,
            record,
            timestamp: record.updatedAt,
          });
        });

        deleted.forEach((record: any) => {
          changes.push({
            type: "DELETE",
            table,
            record,
            timestamp: record.deletedAt,
          });
        });
      }

      // If there are any changes, process them
      if (changes.length > 0) {
        changes.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        for (const change of changes) {
          callback(change);
        }
      }

      // Update the checkpoint
      lastCheckTime = currentCheckTime;
    } catch (error) {
      console.error("Error while polling:", error);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalSeconds * 1000));
  }
}

export const postgrestConnector: ClientProvider<string, () => any> = (
  client,
  tables,
  set
) => {
  const { filters, tablesMap } = computeFilters(tables)
  set(
    produce(async (state) => {
      for (const tableSelector of tables) {
        let name, query, table: string;
        if (typeof tableSelector !== "string") {
          name = tableSelector.name;
          table = tableSelector.table;
          query =
            tableSelector.query ??
            (async () =>
              await fetch(`${client}/${table}`).then((s) => s.json()));
          filters[name] = tableSelector.filter;
        } else {
          name = tableSelector;
          table = tableSelector;
          filters[name] = () => true;
          query = async () =>
            await fetch(`${client}/${table}`).then((s) => s.json());
        }

        tablesMap.get(table)?.push(name) || tablesMap.set(table, [name]);
        state[name] = ((await query?.()) ?? [])
          .filter((item: any) => !item.deleted_at)
          .filter(filters[name]);
      }
    })
  );

  const postgrestTables = tables.map((table) => {
    if (typeof table !== "string") {
      return table.table;
    } else {
      return table;
    }
  });
  pollFromPostgrest(client, postgrestTables, 5, (payload: PostgrestPayload) => {
    const settings: PayloadSettings<typeof payload> = {
      getNewId: (item) => item.record?.id,
      getTable: (item) => item.table,
      getType: (item) => item.type,
      getNewItem: (item) => item.record,
      getOldId: (item) => item.record?.id,
      checkInsert: "INSERT",
      checkUpdate: "UPDATE",
    };
    setItems(set, settings, payload, filters, tablesMap);
  });
};
