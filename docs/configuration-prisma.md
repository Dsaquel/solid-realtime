# Solid Realtime for Prisma

With Solid Realtime, fine-grained reactivity at the database level is possible. In a production application, it looks like this:

<video controls="controls"src="/vid/solid-realtime-prisma-demo.mp4" />

First, it is important to note that Solid-Realtime for Prisma is designed to work with Solid Start projects. So far, we can only guarantee results on Postgres and SQLite databases. However, you're free to try it on other databases and let us know about the outcome.

There are two different ways to integrate Solid Realtime with Prisma:

- The client-side pattern
- The SSE pattern (i.e. Server Sent Events)

For any table you want to track in your database, **regardless of the pattern you choose, adopt the following Prisma conventions:**

- Name your id columns `id`
- Add the following columns to your table in your Prisma schema:

```prisma
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?
```

## The client-side pattern

In the client-side pattern, the client polls the server which fetches the database's initial state and, at each client requests, retrieves a list of eventual changes.

The client-side pattern only supports simple Prisma clients which means that it only works with PrismaClient() constructed with **zero arguments**.

1. In your Solid Start project, create a .ts file in src/lib (conventionally realtime.ts), and write the following:

    ```jsx
    // src/lib/realtime
    import { PrismaClient } from "@prisma/client";
    import { prismaLoadState } from "solid-realtime";
    const prisma = new PrismaClient();
    const prismaRealtimeClient = async (lastCheckTime?: Date) => {
    "use server";
    return prismaLoadState(prisma, ["countries"], lastCheckTime, 5000);
    };

    export { prisma, prismaRealtimeClient };
    ```

    In the above file, we are initializing the Prisma client, and defining a PrismaClient wrapper as a Solid Start server function.
    The `prismaRealtimeClient` function:

    - Input:
    - `lastCheckTime` An optional argument that represents the last timestamp when database polling was performed.
    - Output:
    - `prismaLoadState` A function from solid-realtime that produces a Prisma client in a Solid Start context and loads the database's initial state and its possible changes. Takes as arguments:
        - `prisma` Prisma client
        - `["countries"]` list of tables to be watched.
        - `lastCheckTime`
        - `5000` time interval between checks in the polling (ms)

2. Create a route or component and include the following in its jsx:

    ```jsx
    const { store } = createDatabaseWatcher(
    prismaRealtimeClient,
    ["countries"],
    prismaConnectFromClient
    );
    ```

    The `createDatabaseWatcher` function:

    - Input:

    - `prismaRealtimeClient` A Solid Start server function that wraps the Prisma client.
    - `["countries"]` The list of tables to be watched.
    - `prismaConnectFromClient` The connector function that performs database polling from the client that calls `prismaLoadState`

    - Output:
    - `store` A store where a key is a table name and a value is a list of table records.

    In a .jsx component, the result looks like this:

    ```jsx
    //src/routes/prisma-client-side.tsx
    import { For, Suspense } from "solid-js";
    import { createDatabaseWatcher, prismaConnectFromClient } from "solid-realtime";
    import { prismaRealtimeClient } from "~/lib/realtime";

    export default function Home() {
    const { store } = createDatabaseWatcher(
        prismaRealtimeClient,
        ["countries"],
        prismaConnectFromClient
    );

    return (
        <div>
        <h1>Database Changes</h1>
        <Suspense fallback="Loading...">
            <For each={store.countries}>
            {(country) => {
                return (
                <h4>
                    {country.name} : {country.gdp}
                </h4>
                );
            }}
            </For>
        </Suspense>
        </div>
    );
    }
    ```

## The SSE pattern

In the SSE pattern, the server poll the database and, in the case of a change, sends an event to the client which rerenders a new store containing the changes.

The SSE pattern supports all kinds of PrismaClient() including those that are passed adapters or arguments.

1. In your Solid Start project, create a .ts file in src/lib (conventionally realtime.ts) and paste the following:

    ```jsx
    //src/lib/realtime
    import { PrismaClient } from "@prisma/client";
    import { prismaLoadState } from "solid-realtime";
    const prisma = new PrismaClient();
    export { prisma };
    ```

In the above file, we are initializing and exporting the Prisma client.

2. Create an API route and paste the following:

    ```jsx
    //src/routes/api/prismaSSE
    import { prismaLoadSSE } from "solid-realtime";
    import { prisma } from "~/lib/realtime";
    export async function GET() {
    return prismaLoadSSE(prisma, ["countries"], 5000);
    }
    ```

    In the above file, we are defining a Solid Start GET API route that subscribes the client to server-sent events and launches the database polling on the server.

    The `prismaLoadSSE` function:

    - Input:

    - `prisma` The Prisma client
    - `["countries"]` The list of tables to be watched
    - `5000` The time interval between each polling request (ms).

    - Output:
    - A Promise of a Response containing an eventual updated version of the store.

3. Create a client component containing the following in its .jsx:

   ```jsx
   const { store } = createDatabaseWatcher(
     "http://localhost:3000/api/prismaSSE",
     ["countries"],
     prismaConnectSSE
   );
   ```

   The `createDatabaseWatcher` function:

- Input:

  - `http://localhost:3000/api/prismaSSE` the url to the API route defined in step 2.
  - `["countries"]` the list of tables to watch.
  - `prismaConnectSSE` the connector function that subscribes the client to server-sent events related to database changes.

- Output:
  - `store` A store where a key is a table name and a value is a list of table records.

A complete client component integrating the Solid Realtime SSE pattern should look like this:

```jsx
// src/components/ClientLiveData
import { For, Suspense } from "solid-js";
import { createDatabaseWatcher, prismaConnectSSE } from "solid-realtime";

export default function ClientLiveData() {
  const { store } = createDatabaseWatcher(
    "http://localhost:3000/api/prismaSSE",
    ["countries"],
    prismaConnectSSE
  );

  return (
    <div>
      <h1>Countries</h1>
      <Suspense fallback="Loading...">
        <For each={store.countries}>
          {(country) => {
            return (
              <h4>
                {country.name} : {country.gdp}
              </h4>
            );
          }}
        </For>
      </Suspense>
    </div>
  );
}
```

4. Import your client component in your route:
   Your client component must run exclusively on the client, so the use of clientOnly is necessary. Following our example, the route should look like this:

   ```jsx
   // src/routes/liveData
   import { clientOnly } from "@solidjs/start";
   const ClientLiveData = clientOnly(() =>
     import("../components/ClientLiveData")
   );

   export default function Home() {
     return (
       <>
         <ClientLiveData />
       </>
     );
   }
   ```
