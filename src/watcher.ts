import { Accessor, createEffect, createResource, createUniqueId } from 'solid-js';
import { createStore, produce } from 'solid-js/store'
import { SupabaseClient } from "@supabase/supabase-js";

export function useWatcher(client: SupabaseClient, tables: string[], options = {}) {
  //const [countries] = createResource(() => getCountries(client), { initialValue: [] });

  const [store, setStore] = createStore<Record<string, any[]>>({})

  setStore(produce(async state => {
    for (const table of tables)
      state[table] = (await client.from(table).select()).data!;
  }))

  client
    .channel('schema-db-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
      },
      (payload) => {
        setStore(produce(state => {
          console.log(payload)
          if (payload.eventType === 'INSERT') {
            state[payload.table].push(payload.new)
          }
          else if (payload.eventType === 'UPDATE') {
            const idx = state[payload.table].findIndex(s => s.id === payload.new.id)
            if (idx === -1) return
            state[payload.table][idx] = payload.new
          } else {
            const idx = state[payload.table].findIndex(s => s.id === payload.old.id)
            if (idx === -1) return
            state[payload.table].splice(idx, 1)
          }
        }))
      }
    )
    .subscribe()


  const _client = client
  const _options = options

  //listen(table_name: string) {
  //  const [, setStore] = store
  //  setStore(produce(fn))
  //}

  return {
    store,
  }
}
