import { afterAll, afterEach, beforeAll, beforeEach, describe } from "bun:test";
import { createClient } from "redis";
import RedisJobStore from "../../src/job-store/redis";
import { waitUntil } from "../helper";
import { testBehavesLikeJobStore } from "./shared";

type RedisClientType = ReturnType<typeof createClient>;

describe("RedisJobStore", () => {
  let client: RedisClientType;
  let jobStore: RedisJobStore;

  beforeAll(async () => {
    client = createClient({ url: Bun.env.REDIS_URI });
    await waitUntil(() => client.connect());
  });

  afterAll(async () => {
    await jobStore.close();
  });

  beforeEach(() => {
    jobStore = new RedisJobStore(client);
  });

  afterEach(async () => {
    await client.flushAll();
  });

  testBehavesLikeJobStore(() => jobStore);
});
