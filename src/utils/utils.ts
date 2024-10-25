import { produce, SetStoreFunction } from "solid-js/store";

export const tablesMap = new Map<string, string[]>();
export const filters: Record<string, ((item: any) => boolean) | undefined> = {};

function addElement(collection: any[], elem: any) {
  collection.push(elem);
}

function editElement(collection: any[], index: number, elem: any) {
  collection[index] = elem;
}

function deleteElement(collection: any[], index: number) {
  collection.splice(index, 1);
}

export interface PayloadSettings<T extends any> {
  getTable: (item: T) => any
  getType: (item: T) => any
  getNewItem: (item: T) => any
  getOldId: (item: T) => any
  getNewId: (item: T) => any
  checkInsert: string
  checkUpdate: string
}


//TODO: setItems in all connectors
export const setItems = <T>(set: SetStoreFunction<Record<string, any[]>>, settings: PayloadSettings<T>, payload: T) => {
  console.log('settings', settings)
  console.log('payload', payload)
  const { getNewId, getOldId, checkInsert, checkUpdate, getNewItem, getType, getTable } = settings
  const table: string = getTable(payload)
  const newItem: any = getNewItem(payload)
  const type: string = getType(payload)
  const newId: string = getNewId(payload)
  const oldId: string = getOldId(payload)

  set(
    produce((state) => {
      for (const name of tablesMap.get(table) ?? []) {
        const filter = filters[name] ?? (() => true);
        if (type === checkInsert) {
          if (filter(newItem)) {
            addElement(state[name], newItem);
          }
        } else if (type === checkUpdate) {
          const idx = state[name].findIndex(
            (s) => s.id === newId
          );
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
          const idx = state[name].findIndex(
            (s) => s.id === oldId
          );
          if (idx === -1) return;
          deleteElement(state[name], idx);
        }
      }
    })
  );

}

