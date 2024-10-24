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

function addElement(collection: any[], elem: any) {
  collection.push(elem);
}

function editElement(collection: any[], index: number, elem: any) {
  collection[index] = elem;
}

function deleteElement(collection: any[], index: number) {
  collection.splice(index, 1);
}

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

        tablesMap.get(table)?.push(name) ||
          tablesMap.set(table, [name]);
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
        const data = change.doc
        const id = change.doc.id;
        set(
          produce((state) => {
            if (change.type === "added") {
              if (filter(change.doc.data())) {
                addElement(state[name], data)
              }
            } else if (change.type === "modified") {
              const idx = state[name].findIndex((s) => s.id === id);
              if (idx !== -1) {
                if (filter(data)) {
                  editElement(state[name], idx, data)
                } else {
                  deleteElement(state[name], idx);
                }
              } else if (filter(data)) {
                addElement(state[name], data)
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
