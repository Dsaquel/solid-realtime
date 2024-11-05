import { produce, SetStoreFunction } from "solid-js/store";

import type { PayloadSettings, QueryType } from "./types";

export const computeFilters = (tables: QueryType<() => Promise<any[]>>[]) => {
  const tablesMap = new Map<string, string[]>();
  const filters: Record<string, ((item: any) => boolean) | undefined> = {};
  const state: Record<string, any[]> = {};
  for (const tableSelector of tables) {
    let name, table: string;
    if (typeof tableSelector !== "string") {
      name = tableSelector.name;
      table = tableSelector.table;
      filters[name] = tableSelector.filter;
    } else {
      name = tableSelector;
      table = tableSelector;
    }

    tablesMap.get(table)?.push(name) || tablesMap.set(table, [name]);

    // Notify clients about initial data
    // sendUpdate({ store: { [name]: state[name] } });
    console.log("INITIAL DATA: ", name, state[name]);
  }
  return {
    tablesMap,
    filters,
  };
};

function addElement(collection: any[], elem: any) {
  collection.push(elem);
}

function editElement(collection: any[], index: number, elem: any) {
  collection[index] = elem;
}

function deleteElement(collection: any[], index: number) {
  collection.splice(index, 1);
}

export const setItems = <T>(
  set: SetStoreFunction<Record<string, any[]>>,
  settings: PayloadSettings<T>,
  payload: T,
  filters: Record<string, ((item: any) => boolean) | undefined>,
  tablesMap: Map<string, string[]>
) => {
  const {
    getNewId,
    getOldId,
    checkInsert,
    checkUpdate,
    getNewItem,
    getType,
    getTable,
  } = settings;
  const table: string = getTable(payload);
  const newItem: any = getNewItem(payload);
  const type: string = getType(payload);
  const newId: string = getNewId(payload);
  const oldId: string = getOldId(payload);

  set(
    produce((state) => {
      for (const name of tablesMap.get(table) ?? []) {
        const filter = filters[name] ?? (() => true);
        if (type === checkInsert) {
          if (filter(newItem)) {
            addElement(state[name], newItem);
          }
        } else if (type === checkUpdate) {
          const idx = state[name].findIndex((s) => s.id === newId);
          if (idx !== -1) {
            if (filter(newItem)) {
              editElement(state[name], idx, newItem);
            } else {
              deleteElement(state[name], idx);
            }
          } else if (filter(newItem)) {
            addElement(state[name], newItem);
          }
        } else {
          const idx = state[name].findIndex((s) => s.id === oldId);
          if (idx === -1) return;
          deleteElement(state[name], idx);
        }
      }
    })
  );
};
