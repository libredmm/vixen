import { readdir } from "node:fs/promises";
import { join } from "node:path";

export async function discoverSites(dir: string): Promise<string[]> {
  const entries = await readdir(dir);
  return entries
    .filter((f) => f.endsWith(".json") && !f.endsWith(".min.json"))
    .map((f) => f.replace(/\.json$/, ""));
}
