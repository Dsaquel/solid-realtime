# Solid RealTime

Solid Realtime is a library that allows you to connect and manage real-time data from different services like Supabase, Firebase, etc.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Features

- Supabase: Supabase allows you to subscribe to real-time changes on your database from your client application. You can listen to database changes.
- Firebase: Firebase provides a suite of cloud-based services to help you build and run applications. With Firebase Realtime Database, you can store and sync data between your users in real-time. It allows you to listen to data changes and update your application instantly.
- RowSQL: In commin.
- Prisma: Prisma is an open-source ORM (Object-Relational Mapping) tool that simplifies database access. It provides a type-safe query builder and supports various databases, including PostgreSQL, MySQL, and SQLite. Prisma helps you write clean and maintainable database queries, making it easier to interact with your database in a type-safe manner.

Solid-Realtime: Allows you to create a reactive store from the database.

## Installation

Steps to install the project locally.

### Installation Steps

1. Install the dependencies:

    ```bash
    npm install solid-realtime # or pnpm install or yarn install
    ```

2. Set up the environment (see the [Configuration](#configuration) section below).

3. Try to use library:

   **Example for supabase:**

    Prerequisites: follow this [tutorial](https://supabase.com/docs/guides/getting-started/quickstarts/solidjs) on supabase website.

    And now in your solid.js project:

    ```jsx
    import { For } from "solid-js";
    import { createClient } from "@supabase/supabase-js";
    import { useWatcher, supaConnector } from "solid-realtime";

    const client = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON);

    function Home() {
        const { store } = useWatcher(client, ["countries"], supaConnector)
        return (
            <ul>
                All countries:
                <For each={store.countries}>{(country) => <li>{country.name}</li>}</For>
            </ul>
        );
    }

    export default Home;
    ```

#### Learn more on the [Solid Website](https://solidjs.com) and come chat with us on our [Discord](https://discord.com/invite/solidjs)

See more in the documentation [(here)](https://dsaquel.github.io/solid-realtime/)

## Usage

```bash
# Example command to start the application
npm run dev or npm start
```

Runs the app in the development mode.<br>
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br>

```bash
npm run build
```

Builds the app for production to the `dist` folder.<br>
It correctly bundles Solid in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br>
Your app is ready to be deployed!

### Deployment

You can deploy the `dist` folder to any static host provider (netlify, surge, now, etc.)

## Configuration

Explain how to configure any settings or environment variables, for example:

1. Create a `.env` file in the root directory.

2. Add the following environment variables:

    ```bash
    # Supabase
    VITE_SUPABASE_URL=https://<project>.supabase.co
    VITE_SUPABASE_ANON=*****************************

    or 

    # SLQlite
    DATABASE_URL="file:./dev.db"

    or

    # Postgres
    POSTGRES_USR="someuser"
    POSTGRES_PWD="somepwd"
    POSTGRES_DB="somedb"
    POSTGRES_URL="postgres://${POSTGRES_USR}:${POSTGRES_PWD}@postgres:5432/${POSTGRES_DB}
    ```

## Contributing

Contributions are welcome! Here's how to contribute:

1. Fork the project
2. Create a feature branch (`git checkout -b feature-branch`)
3. Commit your changes (`git commit -am 'Added new feature'`)
4. Push to the branch (`git push origin feature-branch`)
5. Create a Pull Request

## License

This project is licensed under the MIT - see the LICENSE file for details.

## Contact

- Ouways - [@GitHub Profile](https://github.com/Dsaquel) - <noblet.ouwaysgta5@gmail.com>
- Dimitri - [@GitHub Profile](https://github.com/dimitri-donatien) - <donatien.dim@protonmail.com>
- Jean François - [@GitHub Profile](https://github.com/jleon9) - <j-f.leon@outlook.com>

Project Link: [Solid RealTime](https://github.com/Dsaquel/solid-realtime)
