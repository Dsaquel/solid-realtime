import { SetStoreFunction } from "solid-js/store";

export type QueryType<X> =
  | string
  | {
    name: string;
    table: string;
    query?: X;
    filter?: (item: any) => boolean;
  };

export type TableSelector<X> = string | QueryType<X>;

export type ClientProvider<T, X> = (
  client: T,
  tables: TableSelector<X>[],
  set: SetStoreFunction<Record<string, any[]>>,
  interval?: number
) => void;

export interface PrismaPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: any;
  timestamp: Date;
}

export interface PostgrestPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: any;
  timestamp: Date;
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

 
export type PrismaConnectClientPromise = Promise<
  | {
      loadedClient: any;
      interval: number;
    }
  | {
      loadedClient: PrismaPayload[];
      interval: number;
    }
>;
