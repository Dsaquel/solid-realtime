# Solid Realtime for Supabase

In this tutorial, we will use the following data schema:

```md
table countries {
    id: number PRIMARY KEY,
    name: string,
    gdp: number
};
```

If not already done, set up your Supabase project and **activate real-time updates in the Supabase application.**

To set up your Solid.js project with Supabase, you need two environment variables: `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

In your Solid.js project's `.env` file, assign these two variables with your Supabase credentials.

```md
SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Watching tables in real time

1. In a global scope of your project, initialize a supabase client and export it:

```jsx
// services/supabaseClient
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
```

2. In the component you want to render, include the following:

```jsx
import { supabase } from "@/services/supabaseClient";
const { store } = createDatabaseWatcher(supabase, ["countries"], supaConnector);
```

The `createDatabaseWatcher` function:

- Input:

  - `supabase` The supabase client initialized and exported in step 2
  - `["countries"]` List of names of tables to be watched.
  - `supaConnector` The Supabase connector function that performs real-time monitoring

- Output:
  - `store` A store where a key is a table name and a value is a list of table records.

In a .jsx component, the result looks like this:

```jsx
function ListSupabase() {
  const { store } = createDatabaseWatcher(
    supabase,
    ["countries"],
    supaConnector
  );

  return (
    <div>
      <h4 class="font-bold">All countries:</h4>
      <For each={store.countries}>
        {(country) => (
          <div>
            {country.name} : {country.gdp}
          </div>
        )}
      </For>
    </div>
  );
}
```

## Watching query results in real time

To apply filters to tables and watch their results in real time, the steps are the same as in the previous section, the only difference is that we are including **supabase queries after each table name** in the list inside `createDatabaseWatcher`

For example, we will apply two independent queries to the countries table and render all countries, then all countries starting with the letter 'C' and finally all countries with a GDP greater than 100.

Here is the result:

```jsx
import { supabase } from "@/services/supabaseClient";
export default function ListSupabase() {
const query1 = async () => {
    return (await supabase.from("countries").select().like("name", "C%")).data!;
  };

  const query2 = async () => {
    return (await supabase.from("countries").select().gte("GDP", "100")).data!;
  };

  const { store } = createDatabaseWatcher(
    supabase,
    [
      "countries",
      {
        name: "countries_start_C",
        table: "countries",
        query: query1,
        filter: (country: any) =>
          typeof country.name === "string" && country.name.charAt(0) === "C",
      },
      {
        name: "countries_gdp",
        table: "countries",
        query: query2,
        filter: (country: any) => country.GDP >= 100,
      },
    ],
    supaConnector
  );

  return (
    <div>
      <h4 class="font-bold">All countries:</h4>
      <For each={store.countries}>
        {(country) => (
          <div>
            {country.name} : {country.GDP}
          </div>
        )}
      </For>
      <br />
      <h4 class="font-bold">Countries with a C:</h4>
      <For each={store.countries_start_C}>
        {(country) => (
          <div>
            {country.name} : {country.GDP}{" "}
          </div>
        )}
      </For>
      <br />
      <h4 class="font-bold">Countries with GDP over 100:</h4>
      <For each={store.countries_gdp}>
        {(country) => (
          <div>
            {country.name} : {country.GDP}{" "}
          </div>
        )}
      </For>
    </div>
  )
}
```

Here, query1 is the list of countries starting with ther letter 'C', and query2 the list of countries with a GDP above 100.

If you want to see this example come to life, you can watch this short demo below:

<video controls="controls" src="/vid/solid-realtime-supabase-demo.mp4" />
