import { createClient } from "@supabase/supabase-js";
import { For } from "solid-js";
import { useWatcher, supaConnector } from "./watcher";

const client = createClient(import.meta.env.VITE_SUPA_PROJECT, import.meta.env.VITE_SUPA_ANON);

function App() {
  const { store } = useWatcher(client, ["countries"], supaConnector)
  return (
    <ul>
      <For each={store.countries}>{(country) => <li>{country.name}</li>}</For>
    </ul>
  );
}

export default App;
