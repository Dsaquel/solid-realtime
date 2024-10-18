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
- Firebase:
- DynamoDB:
- PostgreSQL:

## Installation

Steps to install the project locally.

### Installation Steps

1. Clone the repository:

    ```bash
    git clone https://github.com/Dsaquel/solid-realtime.git
    ```

2. Navigate into the project directory:

    ```bash
    cd solid-realtime
    ```

3. Install the dependencies:

    ```bash
    npm install # or pnpm install or yarn install
    ```

4. Set up the environment (see the [Configuration](#configuration) section below).

5. Try to use library:

   **Examlpe for supabase:**

    Prerequisites: follow this [tutorial](https://supabase.com/docs/guides/getting-started/quickstarts/solidjs) on supabase website.

    And now in your solid.js project:

    ```jsx
    import { createClient } from "@supabase/supabase-js";
    import { For } from "solid-js";
    
    import { useWatcher, supaConnector } from "solid-realtime";

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
    ```

#### Learn more on the [Solid Website](https://solidjs.com) and come chat with us on our [Discord](https://discord.com/invite/solidjs)

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
    VITE_SUPABASE_URL=https://<project>.supabase.co
    VITE_SUPABASE_ANON=*****************************
    ```

## Contributing

Contributions are welcome! Here's how to contribute:

1. Fork the project
2. Create a feature branch (`git checkout -b feature-branch`)
3. Commit your changes (`git commit -am 'Added new feature'`)
4. Push to the branch (`git push origin feature-branch`)
5. Create a Pull Request

## License

This project is licensed under the [License Name] - see the LICENSE file for details.

## Contact

- Name - [@TwitterHandle](https://twitter.com/twitterhandle) - <email@example.com>
- Name - [@TwitterHandle](https://twitter.com/twitterhandle) - <email@example.com>
- Name - [@TwitterHandle](https://twitter.com/twitterhandle) - <email@example.com>

Project Link: [Solid RealTime](https://github.com/Dsaquel/solid-realtime)
