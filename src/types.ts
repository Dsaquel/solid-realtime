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
  set: SetStoreFunction<Record<string, any[]>>
) => void;
