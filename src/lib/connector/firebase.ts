import {
  onSnapshot,
  collection,
  query,
  Firestore,
  Query,
  DocumentData,
  DocumentChange,
} from "@firebase/firestore";
import { setItems } from "../../utils";

import type { ClientProvider, PayloadSettings } from "../../types";

export const firestoreConnector: ClientProvider<
  Firestore,
  Query<DocumentData, DocumentData>
> = (db, tables, set) => {
  const tablesMap = new Map<string, string[]>();
  const filters: Record<string, ((item: any) => boolean) | undefined> = {};
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

    tablesMap.set(name, [name]);
    filters[name] = filter;

    if (!q) return;

    set(name, []);
    const settings: PayloadSettings<
      DocumentChange<DocumentData, DocumentData>
    > = {
      getNewId: (item) => item.new?.id,
      getTable: (_) => name,
      getType: (item) => item.type,
      getNewItem: (item) => item.doc,
      getOldId: (item) => item.doc.id,
      checkInsert: "added",
      checkUpdate: "modified",
    };
    onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        setItems(set, settings, change, filters, tablesMap);
      });
    });
  }
};
