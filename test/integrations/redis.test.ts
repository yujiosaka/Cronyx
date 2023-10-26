import { afterAll, afterEach, beforeAll, describe } from "bun:test";
import { createClient } from "redis";
import RedisJobStore from "../../src/job-store/redis";
import { waitUntil } from "../helper";
import { testBehavesLikeCronyx } from "./shared";

type RedisClientType = ReturnType<typeof createClient>;

describe("integration tests", () => {
  describe("RedisJobStore", () => {
    let client: RedisClientType;
    let jobStore: RedisJobStore;

    beforeAll(async () => {
      client = createClient({ url: Bun.env.REDIS_URI });
      await waitUntil(() => client.connect());

      jobStore = new RedisJobStore(client);
    });

    afterAll(async () => {
      await jobStore.close();
    });

    afterEach(async () => {
      await client.flushAll();
    });

    testBehavesLikeCronyx(() => jobStore);
  });
});
