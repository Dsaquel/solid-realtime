import { createClient } from "@supabase/supabase-js";
import { For } from "solid-js";
import { useWatcher, supaConnector } from "./watcher";

const client = createClient(
  import.meta.env.VITE_SUPA_PROJECT,
  import.meta.env.VITE_SUPA_ANON
);

const query1 = async () => {
  return (await client.from("countries").select().like("name", "C%")).data!;
};

const query2 = async () => {
  return (await client.from("countries").select().gte("GDP", "100")).data!;
};

function App() {
  const { store } = useWatcher(
    client,
    [
      "countries",
      {
        customTable: "countries_start_C",
        table: "countries",
        filter: (country: any) =>
          typeof country.name === "string" && country.name.charAt(0) === "C",
      },
      {
        customTable: "countries_gdp",
        table: "countries",
        filter: (country: any) => country.GDP >= 100,
      },
    ],
    supaConnector
  );
  return (
    <ul>
      All countries:
      <For each={store.countries}>
        {(country) => (
          <li>
            {country.name} : {country.GDP}
          </li>
        )}
      </For>
      <br />
      Countries with a C:
      <For each={store.countries_start_C}>
        {(country) => (
          <li>
            {country.name} : {country.GDP}{" "}
          </li>
        )}
      </For>
      <br />
      Countries with GDP over 100:
      <For each={store.countries_gdp}>
        {(country) => (
          <li>
            {country.name} : {country.GDP}{" "}
          </li>
        )}
      </For>
    </ul>
  );
}

export default App;
