# Configuration Firebase

For Firebase configuration, you need to create a Firebase project and add the Firebase configuration to the `firebase` key.

In your Solid project, create a .ts file in src/services and write the following:

```ts
// src/services/firebase.ts
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

After configuring firebase:

1. Create a route or component and include the following in its jsx:

    ```tsx
    import { For } from "solid-js";
    import { query, collection } from "firebase/firestore";
    import { createDatabaseWatcher, firestoreConnector } from "solid-realtime";
    import { db } from "@/services/firebaseConfig";

    function ListFirebase() {

        const q = query(collection(db, "cities"));

        const { store } = createDatabaseWatcher(
            db,
            ["cities", { name: "citiesQuery", table: "cities", query: q }],
            firestoreConnector
        );

        return (
            <section>
                {/* Firebase */}
                <div class="flex h-screen items-center justify-center bg-white px-6 md:px-60">
                    <div class="space-y-6 border-l-2 border-dashed">
                        <For each={store.cities?.map((s) => s.data())}>
                            {(city) => (
                                <div class="relative w-full">
                                    <div class="ml-6">
                                        <h4 class="font-bold text-black">{city.name}</h4>
                                    </div>
                                </div>
                            )}
                        </For>
                    </div>
                </div>
            </section>
        );
    }

    export default ListFirebase;
    ```

    The createDatabaseWatcher function:

    Input:

    - prismaRealtimeClient A Solid Start server function that wraps the Prisma client.

    - ["countries"] The list of tables to be watched.

    - prismaConnectFromClient The connector function that performs database polling from the client that calls prismaLoadState

    Output:

    - store A store where a key is a table name and a value is a list of table records.

2. Add the following to your .env file:

    ```env
    VITE_FIREBASE_API_KEY=your-api-key
    VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
    VITE_FIREBASE_PROJECT_ID=your-project-id
    VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
    VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
    VITE_FIREBASE_APP_ID=your-app-id
    ```

3. Run your project with `npm run dev` and navigate to the route or component you created.

4. You should see the data from your Firebase database displayed on the page.

5. You can now use data from your Firebase database in your Solid project, which will be updated in real time like this:

    <video controls="controls" src="/vid/solid-realtime-firebase-demo.mp4" />

For more information on Firebase, visit the [Firebase documentation](https://firebase.google.com/docs).

For more information on Solid, visit the [Solid documentation](https://solidjs.com/docs).
