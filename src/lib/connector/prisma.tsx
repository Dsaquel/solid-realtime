import { reconcile } from "solid-js/store";
import { PrismaClient } from "@prisma/client";
import { computeFilters, setItems } from "../../utils";
import type {
  ClientProvider,
  PayloadSettings,
  PrismaPayload,
  QueryType,
} from "../../types";
import { onCleanup } from "solid-js";
import { action, useAction, useSubmission } from "@solidjs/router";

export async function softDelete(
  prisma: PrismaClient,
  id: number,
  table: keyof PrismaClient
) {
  return (prisma[table] as any).update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function getDatabaseChanges(
  client: PrismaClient,
  tables: string[],
  lastCheckTime: Date
) {
  const changes: PrismaPayload[] = [];
  // Check each table for changes
  for (const table of tables) {
    // console.log("TABLE LOWERCASE", table.toLowerCase(), "CLIENT:: ", client);
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
  }
  return changes;
}

type ActionData = {
  tables: string[];
  lastCheckTime: Date;
};

async function pollDatabaseChanges(
  client: PrismaClient,
  tables: string[],
  intervalSeconds: number = 5,
  sendUpdate: (data: any) => void
) {
  // Keep track of the last check time
  let lastCheckTime = new Date();
  console.log("Starting database polling...");
  console.log("Initial checkpoint:", lastCheckTime);
  while (true) {
    try {
      const currentCheckTime = new Date();
      console.log("new checkpoint:", currentCheckTime);

      const changes = await getDatabaseChanges(client, tables, lastCheckTime);

      if (changes.length > 0) {
        sendUpdate({ changes });
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

const pollDatabaseInit = async (
  client: PrismaClient,
  tables: QueryType<() => Promise<any[]>>[]
) => {
  const state: Record<string, any[]> = {};
  for (const tableSelector of tables) {
    let name, query, table: string;
    if (typeof tableSelector !== "string") {
      name = tableSelector.name;
      table = tableSelector.table;
      query = tableSelector.query;
    } else {
      name = tableSelector;
      table = tableSelector;
      query = async () =>
        await (client[table as keyof typeof client] as any).findMany({
          where: {
            deletedAt: null,
          },
        });
    }
    const queryResult = (await query?.()) ?? [];
    state[name] = queryResult;

    // Notify clients about initial data
    console.log("INITIAL DATA: ", name, state[name]);
  }
  return state;
};

type SolidStartRoute = string;

const settings: PayloadSettings<PrismaPayload> = {
  getNewId: (item) => item.record?.id,
  getTable: (item) => item.table,
  getType: (item) => item.type,
  getNewItem: (item) => item.record,
  getOldId: (item) => item.record?.id,
  checkInsert: "INSERT",
  checkUpdate: "UPDATE",
};

export const prismaConnector: ClientProvider<
  SolidStartRoute,
  () => Promise<any[]>
> = async (client, tables, set) => {
  const eventSource = new EventSource(client);
  const { tablesMap, filters } = computeFilters(tables);
  const callback = (payload: PrismaPayload) => {
    setItems(set, settings, payload, filters, tablesMap);
  };
  eventSource.onmessage = (event) => {
    console.log("EVENT", JSON.parse(event.data));
    const { state, changes } = JSON.parse(event.data);
    if (changes) {
      for (const change of changes) {
        callback(change);
      }
      console.log("COUCOU");
    } else if (state) {
      set(reconcile(state));
    }
  };

  onCleanup(() => eventSource.close());
};

export const prismaInitSSE = async (
  client: PrismaClient,
  tables: QueryType<() => Promise<any[]>>[]
) => {
  const { sendUpdate, response } = createSSE();
  const state = await pollDatabaseInit(client, tables);
  sendUpdate({ state });

  const prismaTables = tables.map((table) => {
    if (typeof table !== "string") {
      return table.table;
    } else {
      return table;
    }
  });

  pollDatabaseChanges(client, prismaTables, 5, sendUpdate);
  return response;
};

function createSSE() {
  const { writable, readable } = new TransformStream();
  const writer = writable.getWriter();

  // Function to push data updates to the client
  const sendUpdate = (data: any) => {
    writer.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const response = new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });

  return {
    response,
    sendUpdate,
  };
}

/**
 * Setup function to produce a prisma client in a solid start context. You have to wrap it in a server function
 *
 * ## Example
 * ```
 * const prismaRealtimeClient = async (lastCheckTime?: Date) => {
 * "use server";
 * return prismaInitAction(prisma, ["countries"], lastCheckTime);
 *};
 * ```
 */
export const prismaInitAction = async (
  client: PrismaClient,
  tables: QueryType<() => Promise<any[]>>[],
  lastCheckTime?: Date
) => {
  if (!lastCheckTime) return pollDatabaseInit(client, tables);

  const prismaTables = tables.map((table) => {
    if (typeof table !== "string") {
      return table.table;
    } else {
      return table;
    }
  });

  return getDatabaseChanges(client, prismaTables, lastCheckTime);
};

export const prismaConnector2: ClientProvider<
  (lastCheckTime?: Date) => Promise<any | PrismaPayload[]>,
  () => Promise<any[]>
> = async (client, tables, set) => {
  const { tablesMap, filters } = computeFilters(tables);
  const callback = (payload: PrismaPayload) => {
    setItems(set, settings, payload, filters, tablesMap);
  };

  const state = await client();
  set(state);

  let lastCheckTime = new Date();
  setInterval(async () => {
    for (const change of await client(lastCheckTime)) {
      callback(change);
    }
    lastCheckTime = new Date();
    console.log("new checkpoint: ", lastCheckTime);
  }, 5000);
};
