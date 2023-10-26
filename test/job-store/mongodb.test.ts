import { afterAll, afterEach, beforeAll, describe } from "bun:test";
import type { Connection, Model } from "mongoose";
import { createConnection } from "mongoose";
import type MongodbJobLock from "../../src/job-lock/mongodb";
import MongodbJobStore from "../../src/job-store/mongodb";
import { waitUntil } from "../helper";
import { testBehavesLikeJobStore } from "./shared";

describe("MongodbJobStore", () => {
  let conn: Connection;
  let jobStore: MongodbJobStore;
  let model: Model<MongodbJobLock>;

  beforeAll(async () => {
    conn = createConnection(Bun.env.MONGO_URI!);
    await waitUntil(() => conn.asPromise());

    jobStore = new MongodbJobStore(conn);
    model = conn.models.JobLock;
  });

  afterAll(async () => {
    await jobStore.close();
  });

  afterEach(async () => {
    await model.deleteMany({});
  });

  testBehavesLikeJobStore(() => jobStore);
});
