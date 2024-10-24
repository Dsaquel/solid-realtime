import { createStore, produce, SetStoreFunction } from "solid-js/store";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  onSnapshot,
  collection,
  query,
  Firestore,
  Query,
  DocumentData,
} from "@firebase/firestore";
import { PrismaClient } from "@prisma/client";

type QueryType<X> =
  | string
  | {
    name: string;
    table: string;
    query?: X;
    filter?: (item: any) => boolean;
  };

type TableSelector<X> = string | QueryType<X>;

type ClientProvider<T, X> = (
  client: T,
  tables: TableSelector<X>[],
  set: SetStoreFunction<Record<string, any[]>>
) => void;

const prisma = undefined

interface PrismaPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: any;
  timestamp: Date;
}

interface PostgrestPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: any;
  timestamp: Date;
}

function addElement(collection: any[], elem: any) {
  collection.push(elem);
}

function editElement(collection: any[], index: number, elem: any) {
  collection[index] = elem;
}

function deleteElement(collection: any[], index: number) {
  collection.splice(index, 1);
}

export const supaConnector: ClientProvider<
  SupabaseClient,
  () => Promise<any>[]
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

export const firestoreConnector: ClientProvider<
  Firestore,
  Query<DocumentData, DocumentData>
> = (db, tables, set) => {
  for (const selector of tables) {
    let q: Query<DocumentData, DocumentData> | undefined;
    let name, filter;

    if (typeof selector === "string") {
      name = selector;
      q = query(collection(db, selector));
      filter = () => true;
    } else {
      name = selector.name;
      q = selector.query;
      filter = selector.filter ?? (() => true);
    }
    if (!q) return;

    set(name, []);

    onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        const data = change.doc;
        const id = change.doc.id;
        set(
          produce((state) => {
            if (change.type === "added") {
              if (filter(change.doc.data())) {
                addElement(state[name], data);
              }
            } else if (change.type === "modified") {
              const idx = state[name].findIndex((s) => s.id === id);
              if (idx !== -1) {
                if (filter(data)) {
                  editElement(state[name], idx, data);
                } else {
                  deleteElement(state[name], idx);
                }
              } else if (filter(data)) {
                addElement(state[name], data);
              }
            } else {
              const idx = state[name].findIndex((s) => s.id === id);
              if (idx === -1) return;
              deleteElement(state[name], idx);
            }
          })
        );
      });
    });
  }
};

async function softDelete(id: number, table: keyof typeof prisma) {
  return (prisma[table] as any).update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

async function pollDatabaseChanges(
  tables: string[] = ["Country"],
  intervalSeconds: number = 5,
  callback: (payload: PrismaPayload) => void = () => { }
) {
  // Keep track of the last check time
  let lastCheckTime = new Date();
  console.log("Starting database polling...");
  console.log("Initial checkpoint:", lastCheckTime);

  while (true) {
    try {
      const changes: PrismaPayload[] = [];
      const currentCheckTime = new Date();

      // Check each table for changes
      for (const table of tables) {
        // Type assertion for dynamic table access
        const model = prisma[table.toLowerCase() as keyof typeof prisma] as any;

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

async function pollFromPostgrest(
  baseUrl: string,
  tables: string[] = ["countries"],
  intervalSeconds: number = 5,
  callback: (payload: PostgrestPayload) => void = () => { }
) {
  // Keep track of the last check time
  let lastCheckTime = new Date();
  console.log("Starting database polling...");
  console.log("Initial checkpoint:", lastCheckTime);

  while (true) {
    try {
      const changes: PostgrestPayload[] = [];
      const currentCheckTime = new Date();
      const timestampDate = currentCheckTime.toISOString()

      for (const table of tables) {
        const model = (route: string) =>
          fetch(`${baseUrl}/${route}`).then((s) => s.json()) as any;

      
        // maybe need to change date
        const created = await model(
          `${table}?created_at=gte.${timestampDate}&deleted_at=is.null`
        );

        const updated = await model(
          `${table}?created_at=lt.${timestampDate}&updated_at=gte.${timestampDate}&deleted_at=is.null`
        );

        const deleted = await model(
          `${table}?&deleted_at=gte.${timestampDate}`
        );

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
    } catch (error) {
      console.error("Error while polling:", error);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalSeconds * 1000));
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
        state[name] = (await query?.()) ?? [];
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
  pollDatabaseChanges(prismaTables, 5, (payload: PrismaPayload) => {
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

export const postgrestConnector: ClientProvider<string, () => any> = (
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
          query = async () => await fetch(`${client}/${table}`).then((s => s.json()));
        }

        tablesMap.get(table)?.push(name) || tablesMap.set(table, [name]);
        state[name] = (await query?.()) ?? [];
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
