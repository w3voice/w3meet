declare module "y-websocket/bin/utils" {
  import * as Y from "yjs";

  export const docs: Map<string, Y.Doc>;
  export function setupWSConnection(
    conn: any,
    req: any,
    options?: { docName?: string; gc?: boolean }
  ): void;
}
