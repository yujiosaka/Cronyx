import { afterAll, afterEach, beforeAll, describe } from "bun:test";
import { DataSource } from "typeorm";
import type { Repository } from "typeorm";
import type TypeormJobLock from "../../src/job-lock/typeorm";
import { TypeormJobLockEntity } from "../../src/job-lock/typeorm";
import TypeormJobStore from "../../src/job-store/typeorm";
import MysqlJobStore from "../../src/job-store/typeorm/mysql";
import PostgresJobStore from "../../src/job-store/typeorm/postgres";
import { waitUntil } from "../helper";
import { testBehavesLikeJobStore } from "./shared";

describe.each([
  {
    JobStore: PostgresJobStore,
    dataSource: new DataSource({
      type: "postgres",
      url: Bun.env.POSTGRES_URI,
      entities: [TypeormJobLockEntity],
      synchronize: true,
    }),
  },
  {
    JobStore: MysqlJobStore,
    dataSource: new DataSource({
      type: "mysql",
      url: Bun.env.MYSQL_URI,
      entities: [TypeormJobLockEntity],
      synchronize: true,
    }),
  },
])("TypeormJobStore", ({ JobStore, dataSource }) => {
  describe(JobStore.name, () => {
    let jobStore: TypeormJobStore;
    let repository: Repository<TypeormJobLockEntity>;

    beforeAll(async () => {
      await waitUntil(() => dataSource.initialize());

      jobStore = new JobStore(dataSource);
      repository = dataSource.getRepository<TypeormJobLock>(TypeormJobLockEntity);
    });

    afterAll(async () => {
      await jobStore.close();
    });

    afterEach(async () => {
      await repository.delete({});
    });

    testBehavesLikeJobStore(() => jobStore);
  });
});
