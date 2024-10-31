import {
  onSnapshot,
  collection,
  query,
  Firestore,
  Query,
  DocumentData,
} from "@firebase/firestore";
import { filters, setItems, tablesMap } from "../../utils";

import type { ClientProvider, PayloadSettings } from "../../types";

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

    tablesMap.set(name, [name])
    filters[name] = filter

    if (!q) return;

    set(name, []);

    onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        const settings: PayloadSettings<typeof change> = {
          getNewId: (item) => item.new?.id,
          getTable: (_) => name,
          getType: (item) => item.type,
          getNewItem: (item) => item.doc,
          getOldId: (item) => item.doc.id,
          checkInsert: 'added',
          checkUpdate: 'modified',
        }
        setItems(set, settings, change)
      });
    });
  }
};
