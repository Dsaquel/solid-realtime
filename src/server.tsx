// lib/server.tsx
import { StartServer, createHandler } from "@solidjs/start/server";
import type { DocumentComponentProps } from "@solidjs/start/server";
import { JSX } from "solid-js";

type ServerProps = {
  document: (props: DocumentComponentProps) => JSX.Element;
};

export function createLibraryHandler({ document }: ServerProps) {
  return (baseHandler: ReturnType<typeof createHandler>) => {
    return createHandler(
      () => (
        <StartServer
          document={document}
        />
      ),
      { mode: "async" }
    );
  };
}