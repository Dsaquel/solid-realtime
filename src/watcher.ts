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
import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { EventEmitter } from 'events';

export class Store extends EventEmitter {
  private _value: number = 0;

  get value() {
      return this._value;
  }

  set value(newValue: number) {
      this._value = newValue;
      this.emit('change', newValue);
  }
}
export const globalStore = new Store();


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

interface PrismaPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: any;
  timestamp: Date;
}

// type PrismaClientProvider = {
//   client: PrismaClient,
// }

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

export async function getDatabaseChanges(
  client: PrismaClient,
  tables: string[] = ["Country"],
  lastCheckTime: Date,
  callback: (payload: PrismaPayload) => void = () => {}
) {
  const changes: PrismaPayload[] = [];
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
  return changes;
}

async function* pollDatabaseChanges(
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
      const currentCheckTime = new Date();
      console.log("new checkpoint:", currentCheckTime);

      const changes = await getDatabaseChanges(
        client,
        tables,
        lastCheckTime,
        callback
      );
      yield changes;
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
  callback: (payload: PostgrestPayload) => void = () => {}
) {
  // Keep track of the last check time
  let lastCheckTime = new Date();
  console.log("Starting database polling...");
  console.log("Initial checkpoint:", lastCheckTime);

  while (true) {
    try {
      const changes: PostgrestPayload[] = [];
      const currentCheckTime = new Date();
      const timestampDate = currentCheckTime.toISOString();

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

// Create a global event bus for client notifications

export const createChangeEmitter = () => {
  const listeners = new Set<(table: string, data: any[]) => void>();

  return {
    emit: (table: string, data: any[]) => {
      // console.log(`[ChangeEmitter] Emitting update for table "${table}"`, {
      //   dataLength: data.length,
      //   firstItem: data[0],
      //   lastItem: data[data.length - 1]
      // });
      listeners.forEach((listener) => listener(table, data));
    },
    subscribe: (callback: (table: string, data: any[]) => void) => {
      // console.log('[ChangeEmitter] New subscriber added');
      listeners.add(callback);
      // console.log('[ChangeEmitter] Current subscriber count:', listeners.size);
      return () => {
        // console.log('[ChangeEmitter] Subscriber removed');
        listeners.delete(callback);
        // console.log('[ChangeEmitter] Remaining subscribers:', listeners.size);
      };
    },
  };
};

export const createReadyEmitter = () => {
  const listeners = new Set<(isReady: boolean) => void>();
  return {
    emit: (isReady: boolean) => {
      listeners.forEach((listener) => listener(isReady));
    },
    subscribe: (callback: (isReady: boolean) => void) => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
  };
};

export const readyEmitter = createReadyEmitter();
export const changeEmitter = createChangeEmitter();



export const [prismaData, setPrismaData] = createSignal<PrismaPayload[]>([])
let dbChanges: AsyncGenerator<PrismaPayload[], void, unknown>;

export const prismaConnector: ClientProvider<
  PrismaClient,
  () => Promise<any[]>
> = async (client, tables, set) => {
  // console.log('[PrismaConnector] Initializing with tables:', tables);
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

        // console.log(`[PrismaConnector] Setting up table "${name}"`);
        const queryResult = (await query?.()) ?? [];
        // console.log(`[PrismaConnector] Initial query for "${name}"`, {
        //   resultLength: queryResult.length,
        //   firstItem: queryResult[0],
        //   lastItem: queryResult[queryResult.length - 1]
        // });
        tablesMap.get(table)?.push(name) || tablesMap.set(table, [name]);
        state[name] = queryResult;

        // Notify clients about initial data
        // console.log(`[PrismaConnector] Emitting initial data for "${name}"`);
        changeEmitter.emit(name, state[name]);
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

  // console.log('[PrismaConnector] Starting database polling for tables:', prismaTables);
  dbChanges = pollDatabaseChanges(
    client,
    prismaTables,
    5,
    (payload: PrismaPayload) => {
      set(
        produce((state) => {
          for (const name of tablesMap.get(payload.table) ?? []) {
            const filter = filters[name] ?? (() => true);
            if (payload.type === "INSERT") {
              if (filter(payload.record)) {
                addElement(state[name], payload.record);
                // Notify clients about the update
                changeEmitter.emit(name, state[name]);
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
                // Notify clients about the update
                changeEmitter.emit(name, state[name]);
              } else if (filter(payload.record)) {
                addElement(state[name], payload.record);
                // Notify clients about the update
                changeEmitter.emit(name, state[name]);
              }
            } else {
              const idx = state[name].findIndex(
                (s) => s.id === payload.record.id
              );
              if (idx === -1) return;
              deleteElement(state[name], idx);
              // Notify clients about the update
              changeEmitter.emit(name, state[name]);
            }
          }
          changeEmitter.emit("ready", []);
        })
      );
    }
  );

  for await (const changes of dbChanges) {
    // console.log("CHANGE IN DB: ", changes);
    setPrismaData(changes)
  }
};

// Hook for client components to subscribe to changes
export function useTableUpdates<T>(tableName: string) {
  
}

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
          query = async () =>
            await fetch(`${client}/${table}`).then((s) => s.json());
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

export function createSSE(request: any, onSendUpdate: any) {
  const { writable, readable } = new TransformStream();
  const writer = writable.getWriter();

  request.headers.set('Content-Type', 'text/event-stream');
  request.headers.set('Cache-Control', 'no-cache');
  request.headers.set('Connection', 'keep-alive');

  // Function to send updates
  const sendUpdate = (data: any) => {
    writer.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Start an interval or attach a listener to get data updates
  const interval = setInterval(() => {
    const data = onSendUpdate();
    if (data) sendUpdate(data);
  }, 5000);

  // Cleanup on connection close
  request.signal.addEventListener('abort', () => {
    clearInterval(interval);
    writer.close();
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

export function useWatcher<T, X>(
  client: T,
  tables: TableSelector<X>[],
  clientProvider: ClientProvider<T, X> = supaConnector as any
) {
  const [store, setStore] = createStore<Record<string, any[]>>({});

  clientProvider(client, tables, setStore);

  return {
    store,
    setStore,
  };
}
