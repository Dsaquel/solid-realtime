import { produce } from "solid-js/store";
import { PrismaClient } from "@prisma/client";

import { ClientProvider, PrismaPayload } from "../../types";
import { addElement, deleteElement, editElement } from "../../utils/utils";

async function softDelete(
  prisma: PrismaClient,
  id: number,
  table: keyof PrismaClient
) {
  return (prisma[table] as any).update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

async function pollDatabaseChanges(
  client: PrismaClient,
  tables: string[] = ["Country"],
  intervalSeconds: number = 5,
  callback: (payload: PrismaPayload) => void = () => {}
) {
  // Keep track of the last check time
  let lastCheckTime = new Date();
  console.log("Starting database polling...");
  console.log("Initial checkpoint:", lastCheckTime);

  while (true) {
    try {
      const changes: PrismaPayload[] = [];
      const currentCheckTime = new Date();
      console.log("new checkpoint:", currentCheckTime);

      // Check each table for changes
      for (const table of tables) {
        // Type assertion for dynamic table access
        const model = client[table.toLowerCase() as keyof PrismaClient] as any;

        // Find created records
        const created = await model.findMany({
          where: {
            deletedAt: null,
            createdAt: {
              gte: lastCheckTime,
            },
          },
        });

        // Find updated records
        const updated = await model.findMany({
          where: {
            deletedAt: null,
            updatedAt: {
              gte: lastCheckTime,
            },
            createdAt: {
              lt: lastCheckTime,
            },
          },
        });

        // Find updated records
        const deleted = await model.findMany({
          where: {
            deletedAt: {
              gte: lastCheckTime,
            },
          },
        });

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
        console.log("\nDetected changes:", new Date());
        changes.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        for (const change of changes) {
          callback(change);
        }
      }

      // Update the checkpoint
      lastCheckTime = currentCheckTime;

      // Wait for the specified interval
      await new Promise((resolve) =>
        setTimeout(resolve, intervalSeconds * 1000)
      );
    } catch (error) {
      console.error("Error while polling:", error);
      // Wait a bit before retrying after an error
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

export const prismaConnector: ClientProvider<
  PrismaClient,
  () => Promise<any[]>
> = (client, tables, set) => {
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
          query = async () =>
            await (client[table as keyof typeof client] as any).findMany({});
        }

        tablesMap.get(table)?.push(name) || tablesMap.set(table, [name]);
        state[name] = ((await query?.()) ?? []).filter(filters[name]);
      }
    })
  );

  const prismaTables = tables.map((table) => {
    if (typeof table !== "string") {
      return table.table;
    } else {
      return table;
    }
  });
  pollDatabaseChanges(client, prismaTables, 5, (payload: PrismaPayload) => {
    set(
      produce((state) => {
        for (const name of tablesMap.get(payload.table) ?? []) {
          const filter = filters[name] ?? (() => true);
          if (payload.type === "INSERT") {
            if (filter(payload.record)) {
              addElement(state[name], payload.record);
            }
          } else if (payload.type === "UPDATE") {
            const idx = state[name].findIndex(
              (s) => s.id === payload.record.id
            );
            if (idx !== -1) {
              if (filter(payload.record)) {
                editElement(state[name], idx, payload.record);
              } else {
                deleteElement(state[name], idx);
              }
            } else if (filter(payload.record)) {
              addElement(state[name], payload.record);
            }
          } else {
            const idx = state[name].findIndex(
              (s) => s.id === payload.record.id
            );
            if (idx === -1) return;
            deleteElement(state[name], idx);
          }
        }
      })
    );
  });
};
