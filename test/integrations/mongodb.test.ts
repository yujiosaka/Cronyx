import { afterAll, afterEach, beforeAll, beforeEach, describe } from "bun:test";
import type { Connection, Model } from "mongoose";
import { createConnection } from "mongoose";
import type MongodbJobLock from "../../src/job-lock/mongodb";
import MongodbJobStore from "../../src/job-store/mongodb";
import { waitUntil } from "../helper";
import { testBehavesLikeCronyx } from "./shared";

describe("integration tests", () => {
  describe("MongodbJobStore", () => {
    let conn: Connection;
    let jobStore: MongodbJobStore;
    let model: Model<MongodbJobLock>;

    beforeAll(async () => {
      conn = createConnection(Bun.env.MONGO_URI!);
      await waitUntil(() => conn.asPromise());
    });

    afterAll(async () => {
      await jobStore.close();
    });

    beforeEach(() => {
      jobStore = new MongodbJobStore(conn);
      model = conn.models.JobLock;
    });

    afterEach(async () => {
      await model.deleteMany({});
    });

    testBehavesLikeCronyx(() => jobStore);
  });
});
