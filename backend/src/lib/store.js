import { readFile, writeFile } from "node:fs/promises";

export async function loadProcessedVideoIds(path) {
  const raw = await readFile(path, "utf-8");
  return new Set(JSON.parse(raw));
}

export async function saveProcessedVideoIds(path, ids) {
  await writeFile(path, `${JSON.stringify([...ids].sort(), null, 2)}\n`);
}
