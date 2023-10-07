import { sleep } from "bun";

export async function waitUntil<T>(predicate: () => Promise<T>, interval: number = 1000): Promise<T> {
  try {
    return await predicate();
  } catch {
    await sleep(interval);
    return await waitUntil(predicate, interval);
  }
}
