import { produce } from "solid-js/store";

import {
  onSnapshot,
  collection,
  query,
  Firestore,
  Query,
  DocumentData,
} from "@firebase/firestore";

import { ClientProvider } from "../../types";
import { addElement, deleteElement, editElement } from "../../utils/utils";

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
