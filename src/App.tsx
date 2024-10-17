import { createClient } from "@supabase/supabase-js";
import { For } from "solid-js";
import { useWatcher, supaConnector } from "./watcher";

const client = createClient(
  import.meta.env.VITE_SUPA_PROJECT,
  import.meta.env.VITE_SUPA_ANON
);
const query = async () => {
  return (await client.from("countries").select().like("name", "C%")).data!;
};

function App() {
  const { store } = useWatcher(
    client,
    [
      "countries",
      ["countries_start_C", "countries", query],
    ],
    supaConnector
  );
  return (
    <ul>
      All countries:
      <For each={store.countries}>{(country) => <li>{country.name}</li>}</For>
      Countries with a C:
      <For each={store.countries_start_C}>
        {(country) => <li>{country.name}</li>}
      </For>
    </ul>
  );
}

export default App;
