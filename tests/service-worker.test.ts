import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

test("an offline build asset is served from its precached shell cache", async () => {
  const handlers = new Map<string, (event: any) => void>();
  const cacheNames: string[] = [];
  const shellResponse = new Response("compiled application", { status: 200 });
  const context = vm.createContext({
    URL,
    Response,
    console,
    self: {
      registration: { scope: "https://example.test/Teyvat-Vocab/" },
      addEventListener: (name: string, handler: (event: any) => void) =>
        handlers.set(name, handler),
    },
    caches: {
      open: async (name: string) => {
        cacheNames.push(name);
        return {
          match: async () =>
            name.startsWith("teyvat-shell-") ? shellResponse : undefined,
        };
      },
    },
    fetch: async () => {
      throw new Error("offline");
    },
  });
  vm.runInContext(
    readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"),
    context,
  );
  for (const filename of ["index-abc.js", "index-abc.css", "radix-abc.js"]) {
    let response: Promise<Response> | undefined;
    handlers.get("fetch")!({
      request: {
        method: "GET",
        url: `https://example.test/Teyvat-Vocab/assets/${filename}`,
        mode: "cors",
      },
      respondWith: (result: Promise<Response>) => {
        response = result;
      },
    });
    assert.equal(await response, shellResponse);
    assert.match(cacheNames.at(-1)!, /^teyvat-shell-/);
  }
});
